import { exec } from "./exec.ts";
import { STATUS_LABELS, type IssueSummary } from "./decisions.ts";

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  labels: string[];
}

interface RawLabelled {
  labels: { name: string }[];
}

export class GitHub {
  private readonly gh: string;
  private readonly repo: string;

  constructor(gh: string, repo: string) {
    this.gh = gh;
    this.repo = repo;
  }

  private async run(args: string[], input?: string): Promise<string> {
    const result = await exec(this.gh, [...args, "--repo", this.repo], {
      input,
      timeoutMs: 60_000,
    });
    if (result.code !== 0) {
      throw new Error(`gh ${args.slice(0, 2).join(" ")} : ${result.stderr.trim()}`);
    }
    return result.stdout;
  }

  async issues(): Promise<IssueSummary[]> {
    const out = await this.run([
      "issue",
      "list",
      "--state",
      "all",
      "--limit",
      "300",
      "--json",
      "number,title,labels,body,state",
    ]);
    const raw = JSON.parse(out) as (Omit<IssueSummary, "labels"> & RawLabelled)[];
    return raw.map((i) => ({ ...i, labels: i.labels.map((l) => l.name) }));
  }

  async openPullRequests(): Promise<PullRequest[]> {
    const out = await this.run([
      "pr",
      "list",
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "number,title,url,headRefName,headRefOid,baseRefName,labels",
    ]);
    const raw = JSON.parse(out) as (Omit<PullRequest, "labels"> & RawLabelled)[];
    return raw.map((p) => ({ ...p, labels: p.labels.map((l) => l.name) }));
  }

  async pullRequestFiles(pr: number): Promise<string[]> {
    const out = await this.run(["pr", "view", String(pr), "--json", "files"]);
    return (JSON.parse(out) as { files: { path: string }[] }).files.map((f) => f.path);
  }

  async pullRequestDiff(pr: number): Promise<string> {
    return this.run(["pr", "diff", String(pr)]);
  }

  async issueText(issue: number): Promise<string> {
    const out = await this.run(["issue", "view", String(issue), "--json", "title,body"]);
    const { title, body } = JSON.parse(out) as { title: string; body: string };
    return `# #${issue} ${title}\n\n${body}\n`;
  }

  async findPullRequest(branch: string): Promise<PullRequest | undefined> {
    return (await this.openPullRequests()).find((p) => p.headRefName === branch);
  }

  // Works for issues and pull requests alike (same number space).
  async setLabels(number: number, add: string[], remove: string[] = []): Promise<void> {
    const args = ["issue", "edit", String(number)];
    for (const l of add) args.push("--add-label", l);
    for (const l of remove) args.push("--remove-label", l);
    if (add.length + remove.length > 0) await this.run(args);
  }

  async comment(number: number, body: string): Promise<void> {
    await this.run(["issue", "comment", String(number), "--body-file", "-"], body);
  }

  async merge(pr: number): Promise<void> {
    await this.run(["pr", "merge", String(pr), "--squash", "--delete-branch"]);
  }

  // Squash into the PR's base branch. The branch is deleted separately (see deleteBranch):
  // `--delete-branch` also removes the local worktree branches and broke them.
  async mergeIntoBase(pr: number): Promise<void> {
    await this.run(["pr", "merge", String(pr), "--squash"]);
  }

  // Merge commit, not squash: keeps the base branch an ancestor of production.
  async mergeRelease(pr: number): Promise<void> {
    await this.run(["pr", "merge", String(pr), "--merge"]);
  }

  // « Closes #N » only closes issues when a PR reaches the default branch, not the base branch.
  async closeIssue(issue: number, comment: string): Promise<void> {
    await this.run([
      "issue",
      "close",
      String(issue),
      "--reason",
      "completed",
      "--comment",
      comment,
    ]);
  }

  async setBase(pr: number, base: string): Promise<void> {
    await this.run(["pr", "edit", String(pr), "--base", base]);
  }

  async deleteBranch(branch: string): Promise<void> {
    // `gh api` takes no --repo flag: the repository is part of the path.
    const result = await exec(
      this.gh,
      ["api", "-X", "DELETE", `repos/${this.repo}/git/refs/heads/${branch}`],
      { timeoutMs: 60_000 },
    );
    if (result.code !== 0 && !/Reference does not exist/i.test(result.stderr)) {
      throw new Error(`gh api (suppression de ${branch}) : ${result.stderr.trim()}`);
    }
  }

  async createPullRequest(base: string, head: string, title: string, body: string): Promise<void> {
    await this.run([
      "pr",
      "create",
      "--base",
      base,
      "--head",
      head,
      "--title",
      title,
      "--body",
      body,
    ]);
  }

  async ensureStatusLabels(): Promise<void> {
    const colors: Record<string, string> = {
      [STATUS_LABELS.running]: "FBBF24",
      [STATUS_LABELS.review]: "8AB4FF",
      [STATUS_LABELS.ready]: "15803D",
      [STATUS_LABELS.human]: "B91C1C",
      [STATUS_LABELS.changes]: "F97316",
      [STATUS_LABELS.blocked]: "374151",
      [STATUS_LABELS.humanTask]: "7C3AED",
    };
    for (const [name, color] of Object.entries(colors)) {
      await this.run(["label", "create", name, "--color", color, "--force"]);
    }
  }
}
