// Local implementation of the Forge: tasks and « pull requests » are records in one JSON file,
// task branches are ordinary git branches of this repository (agent worktrees share them, so
// nothing is pushed). Work is squash-merged into the local base branch; GitHub only ever
// receives that branch, in one push, and the publish PR opened from it.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { IssueSummary } from "./decisions.ts";
import { exec } from "./exec.ts";
import type { Forge, PullRequest } from "./forge.ts";
import type { GitHub } from "./github.ts";

interface Note {
  at: string;
  body: string;
}

export interface LocalTask {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: "OPEN" | "CLOSED";
  notes: Note[];
}

export interface LocalPr {
  number: number;
  title: string;
  body: string;
  head: string;
  base: string;
  labels: string[];
  state: "open" | "merged" | "closed";
  openedAt: string;
  mergedAt?: string;
  notes: Note[];
}

interface LocalData {
  v: 1;
  nextPr: number;
  tasks: LocalTask[];
  prs: LocalPr[];
}

// Local PR numbers start high so that they never collide with the task numbers.
const FIRST_PR_NUMBER = 1000;

export interface LocalForgeOptions {
  file: string;
  repoDir: string;
  mergeDir: string;
  base: string;
  production: string;
  // Only used for what really lives on GitHub: importing tasks and the publish PR.
  github: GitHub;
}

export class LocalForge implements Forge {
  private readonly o: LocalForgeOptions;
  data: LocalData;
  private lock: Promise<unknown> = Promise.resolve();

  constructor(options: LocalForgeOptions) {
    this.o = options;
    this.data = existsSync(options.file)
      ? (JSON.parse(readFileSync(options.file, "utf8")) as LocalData)
      : { v: 1, nextPr: FIRST_PR_NUMBER, tasks: [], prs: [] };
  }

  // The merge worktree is shared: merges and the publish step never overlap.
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const run = this.lock.then(work, work);
    this.lock = run.catch(() => undefined);
    return run;
  }

  private save(): void {
    mkdirSync(dirname(this.o.file), { recursive: true });
    const tmp = `${this.o.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.o.file);
  }

  private async git(cwd: string, args: string[]): Promise<{ code: number; out: string }> {
    const r = await exec("git", args, { cwd, timeoutMs: 120_000 });
    return { code: r.code, out: (r.stdout + r.stderr).trim() };
  }

  private async mustGit(cwd: string, args: string[]): Promise<string> {
    const r = await this.git(cwd, args);
    if (r.code !== 0) throw new Error(`git ${args.join(" ")} : ${r.out}`);
    return r.out;
  }

  private openPr(number: number): LocalPr | undefined {
    return this.data.prs.find((p) => p.number === number && p.state === "open");
  }

  // ---- Setup ---------------------------------------------------------------------------------

  // Tasks come from the GitHub issues, once; later ones are added the same way (or by hand in
  // the JSON file). Existing tasks are never overwritten: local state wins.
  async importIssues(): Promise<number> {
    const known = new Set(this.data.tasks.map((t) => t.number));
    let added = 0;
    for (const issue of await this.o.github.issues()) {
      if (known.has(issue.number)) continue;
      this.data.tasks.push({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
        state: issue.state,
        notes: [],
      });
      added += 1;
    }
    this.save();
    return added;
  }

  // Agent PRs that are still open on GitHub become local PRs: their branch is copied from
  // origin, so that their work is reviewed and merged, not redone. Statuses restart empty.
  async importOpenPullRequests(): Promise<number> {
    let added = 0;
    for (const pr of await this.o.github.openPullRequests()) {
      if (!/\/i\d+$/.test(pr.headRefName)) continue;
      if (this.data.prs.some((p) => p.head === pr.headRefName && p.state === "open")) continue;
      const exists = await this.git(this.o.repoDir, [
        "rev-parse",
        "--verify",
        "--quiet",
        `refs/heads/${pr.headRefName}`,
      ]);
      if (exists.code !== 0) {
        await this.mustGit(this.o.repoDir, ["branch", pr.headRefName, `origin/${pr.headRefName}`]);
      }
      this.data.prs.push({
        number: this.data.nextPr++,
        title: pr.title,
        body: "",
        head: pr.headRefName,
        base: this.o.base,
        labels: [],
        state: "open",
        openedAt: new Date().toISOString(),
        notes: [],
      });
      added += 1;
    }
    this.save();
    return added;
  }

  // The base branch exists locally (from origin when it is there) and is checked out in the
  // merge worktree, which nothing else uses.
  async ensureBase(): Promise<void> {
    const { repoDir, mergeDir, base, production } = this.o;
    if (
      (await this.git(repoDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${base}`])).code !==
      0
    ) {
      const from =
        (await this.git(repoDir, ["rev-parse", "--verify", "--quiet", `origin/${base}`])).code === 0
          ? `origin/${base}`
          : `origin/${production}`;
      await this.mustGit(repoDir, ["branch", base, from]);
    }
    if (!existsSync(mergeDir)) {
      await this.mustGit(repoDir, ["worktree", "add", mergeDir, base]);
    } else {
      await this.mustGit(mergeDir, ["checkout", base]);
    }
  }

  // ---- Forge ---------------------------------------------------------------------------------

  async issues(): Promise<IssueSummary[]> {
    return this.data.tasks.map((t) => ({
      number: t.number,
      title: t.title,
      labels: [...t.labels],
      body: t.body,
      state: t.state,
    }));
  }

  async openPullRequests(): Promise<PullRequest[]> {
    const out: PullRequest[] = [];
    for (const p of this.data.prs.filter((x) => x.state === "open")) {
      const oid = await this.git(this.o.repoDir, ["rev-parse", "--verify", "--quiet", p.head]);
      if (oid.code !== 0) continue; // branch deleted by hand: the record is kept, not listed
      out.push({
        number: p.number,
        title: p.title,
        // The dashboard opens `${url}/files` for the diff: the server answers that route.
        url: `/api/pr/${p.number}`,
        headRefName: p.head,
        headRefOid: oid.out,
        baseRefName: p.base,
        labels: [...p.labels],
      });
    }
    return out;
  }

  async pullRequestFiles(pr: number): Promise<string[]> {
    const p = this.openPr(pr);
    if (!p) throw new Error(`PR locale #${pr} introuvable`);
    const out = await this.mustGit(this.o.repoDir, [
      "diff",
      "--name-only",
      `${p.base}...${p.head}`,
    ]);
    return out === "" ? [] : out.split(/\r?\n/);
  }

  async pullRequestDiff(pr: number): Promise<string> {
    const p = this.openPr(pr);
    if (!p) throw new Error(`PR locale #${pr} introuvable`);
    return this.mustGit(this.o.repoDir, ["diff", `${p.base}...${p.head}`]);
  }

  async issueText(issue: number): Promise<string> {
    const t = this.data.tasks.find((x) => x.number === issue);
    if (!t) throw new Error(`Tâche #${issue} introuvable`);
    return `# #${issue} ${t.title}\n\n${t.body}\n`;
  }

  async findPullRequest(branch: string): Promise<PullRequest | undefined> {
    return (await this.openPullRequests()).find((p) => p.headRefName === branch);
  }

  async setLabels(number: number, add: string[], remove: string[] = []): Promise<void> {
    const target = this.openPr(number) ?? this.data.tasks.find((t) => t.number === number);
    if (!target) throw new Error(`#${number} introuvable`);
    const labels = new Set(target.labels);
    for (const l of remove) labels.delete(l);
    for (const l of add) labels.add(l);
    target.labels = [...labels];
    this.save();
  }

  async comment(number: number, body: string): Promise<void> {
    const target = this.openPr(number) ?? this.data.tasks.find((t) => t.number === number);
    if (!target) throw new Error(`#${number} introuvable`);
    target.notes.push({ at: new Date().toISOString(), body });
    this.save();
  }

  mergeIntoBase(pr: number): Promise<void> {
    return this.exclusive(() => this.mergeNow(pr));
  }

  private async mergeNow(pr: number): Promise<void> {
    const p = this.openPr(pr);
    if (!p) throw new Error(`PR locale #${pr} introuvable`);
    const { mergeDir } = this.o;
    await this.mustGit(mergeDir, ["reset", "--hard"]);
    await this.mustGit(mergeDir, ["checkout", p.base]);
    const merge = await this.git(mergeDir, ["merge", "--squash", p.head]);
    if (merge.code !== 0) {
      await this.git(mergeDir, ["reset", "--hard"]);
      throw new Error(`merge conflicts avec ${p.base} : ${merge.out.slice(0, 300)}`);
    }
    const commit = await this.git(mergeDir, ["commit", "-m", `${p.title} (PR locale #${pr})`]);
    if (commit.code !== 0 && !/nothing to commit/i.test(commit.out)) {
      throw new Error(`git commit : ${commit.out}`);
    }
    p.state = "merged";
    p.mergedAt = new Date().toISOString();
    this.save();
  }

  async mergeRelease(pr: number): Promise<void> {
    await this.o.github.mergeRelease(pr);
  }

  async closeIssue(issue: number, comment: string): Promise<void> {
    const t = this.data.tasks.find((x) => x.number === issue);
    if (!t) return;
    t.state = "CLOSED";
    t.notes.push({ at: new Date().toISOString(), body: comment });
    this.save();
  }

  async setBase(pr: number, base: string): Promise<void> {
    const p = this.openPr(pr);
    if (p) p.base = base;
    this.save();
  }

  // Best effort: an agent worktree may still have the branch checked out.
  async deleteBranch(branch: string): Promise<void> {
    await this.git(this.o.repoDir, ["branch", "-D", branch]);
  }

  // The base branch -> production PR is a real GitHub PR; every other PR stays local.
  async createPullRequest(base: string, head: string, title: string, body: string): Promise<void> {
    if (head === this.o.base) {
      await this.o.github.createPullRequest(base, head, title, body);
      return;
    }
    this.data.prs.push({
      number: this.data.nextPr++,
      title,
      body,
      head,
      base,
      labels: [],
      state: "open",
      openedAt: new Date().toISOString(),
      notes: [],
    });
    this.save();
  }

  async mergedBranches(): Promise<string[]> {
    return this.data.prs.filter((p) => p.state === "merged").map((p) => p.head);
  }

  async ensureStatusLabels(): Promise<void> {}

  // ---- Publishing -----------------------------------------------------------------------------

  // The only network use: bring production in (it may have got the publish merge or a hotfix),
  // then push the base branch once, when it is ahead.
  publishBase(): Promise<{ ahead: number; pushed: boolean; conflict: boolean }> {
    return this.exclusive(() => this.publishNow());
  }

  private async publishNow(): Promise<{ ahead: number; pushed: boolean; conflict: boolean }> {
    const { mergeDir, base, production } = this.o;
    await this.mustGit(mergeDir, ["fetch", "--prune", "origin"]);
    await this.mustGit(mergeDir, ["reset", "--hard"]);
    await this.mustGit(mergeDir, ["checkout", base]);
    const behind = Number(
      await this.mustGit(mergeDir, ["rev-list", "--count", `${base}..origin/${production}`]),
    );
    if (behind > 0) {
      const merge = await this.git(mergeDir, ["merge", `origin/${production}`, "--no-edit"]);
      if (merge.code !== 0) {
        await this.git(mergeDir, ["merge", "--abort"]);
        return { ahead: 0, pushed: false, conflict: true };
      }
    }
    const ahead = Number(
      await this.mustGit(mergeDir, ["rev-list", "--count", `origin/${production}..${base}`]),
    );
    if (ahead === 0) return { ahead, pushed: false, conflict: false };
    const remote = await this.git(mergeDir, ["rev-parse", "--verify", "--quiet", `origin/${base}`]);
    const local = await this.mustGit(mergeDir, ["rev-parse", base]);
    if (remote.code === 0 && remote.out === local) return { ahead, pushed: false, conflict: false };
    await this.mustGit(mergeDir, ["push", "origin", `${base}:${base}`]);
    return { ahead, pushed: true, conflict: false };
  }

  async releasePullRequest(): Promise<number | undefined> {
    return this.o.github.findRelease(this.o.base, this.o.production);
  }
}
