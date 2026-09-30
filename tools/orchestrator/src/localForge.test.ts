import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { GitHub } from "./github.ts";
import { LocalForge } from "./localForge.ts";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

// A throw-away repository: main, a dev branch, and a worktree where dev gets merged.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "heute-local-"));
  const repo = join(root, "repo");
  git(root, "init", "-q", "-b", "main", repo);
  git(repo, "config", "user.email", "t@example.test");
  git(repo, "config", "user.name", "Test");
  writeFileSync(join(repo, "a.txt"), "un\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "init");
  git(repo, "branch", "dev");
  const github = {
    issues: async () => [
      {
        number: 5,
        title: "Tâche 5",
        labels: ["agent:A"],
        body: "Critères",
        state: "OPEN" as const,
      },
    ],
  } as unknown as GitHub;
  const forge = new LocalForge({
    file: join(root, "local.json"),
    repoDir: repo,
    mergeDir: join(root, "merge"),
    base: "dev",
    production: "main",
    github,
  });
  return { root, repo, forge };
}

function branchWith(repo: string, name: string, file: string, content: string): void {
  git(repo, "switch", "-q", "-c", name, "dev");
  writeFileSync(join(repo, file), content);
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", `work on ${name}`);
  git(repo, "switch", "-q", "main");
}

test("local forge: tasks are imported once and keep their local state", async () => {
  const { forge } = fixture();
  assert.equal(await forge.importIssues(), 1);
  await forge.setLabels(5, ["en-cours"]);
  assert.equal(await forge.importIssues(), 0);
  const [task] = await forge.issues();
  assert.deepEqual(task?.labels, ["agent:A", "en-cours"]);
  assert.match(await forge.issueText(5), /Critères/);
});

test("local forge: a PR is a branch; diff, files, labels and merge into dev work", async () => {
  const { forge, repo } = fixture();
  await forge.importIssues();
  await forge.ensureBase();
  branchWith(repo, "a/i5", "b.txt", "nouveau\n");

  await forge.createPullRequest("dev", "a/i5", "P-5: essai", "corps");
  const [pr] = await forge.openPullRequests();
  assert.equal(pr?.headRefName, "a/i5");
  assert.equal(pr?.baseRefName, "dev");
  assert.match(pr?.headRefOid ?? "", /^[0-9a-f]{40}$/);
  assert.deepEqual(await forge.pullRequestFiles(pr?.number ?? 0), ["b.txt"]);
  assert.match(await forge.pullRequestDiff(pr?.number ?? 0), /\+nouveau/);

  await forge.setLabels(pr?.number ?? 0, ["prête"]);
  assert.deepEqual((await forge.findPullRequest("a/i5"))?.labels, ["prête"]);

  await forge.mergeIntoBase(pr?.number ?? 0);
  assert.equal(git(repo, "show", "dev:b.txt"), "nouveau");
  assert.equal(git(repo, "log", "--oneline", "main").split("\n").length, 1, "main is untouched");
  assert.deepEqual(await forge.openPullRequests(), []);
  assert.deepEqual(await forge.mergedBranches(), ["a/i5"]);

  await forge.closeIssue(5, "livrée");
  assert.equal((await forge.issues())[0]?.state, "CLOSED");
});

test("local forge: a conflicting merge fails and leaves dev untouched", async () => {
  const { forge, repo } = fixture();
  await forge.ensureBase();
  branchWith(repo, "a/i1", "a.txt", "version A\n");
  branchWith(repo, "a/i2", "a.txt", "version B\n");
  await forge.createPullRequest("dev", "a/i1", "un", "");
  await forge.createPullRequest("dev", "a/i2", "deux", "");
  const [first, second] = await forge.openPullRequests();

  await forge.mergeIntoBase(first?.number ?? 0);
  await assert.rejects(forge.mergeIntoBase(second?.number ?? 0), /conflict/);
  assert.equal(git(repo, "show", "dev:a.txt"), "version A");
  assert.equal((await forge.openPullRequests()).length, 1, "the conflicting PR stays open");
});

test("local forge: state is one JSON file that survives a restart", async () => {
  const { forge, root } = fixture();
  await forge.importIssues();
  await forge.comment(5, "note");
  const saved = JSON.parse(readFileSync(join(root, "local.json"), "utf8")) as {
    v: number;
    tasks: { number: number; notes: { body: string }[] }[];
  };
  assert.equal(saved.v, 1);
  assert.equal(saved.tasks[0]?.notes[0]?.body, "note");
});

test("review merges the base into the head before validating: behind is fine, conflicts are reported", async () => {
  const { repo } = fixture();
  const { mergeBaseInto } = await import("./worktree.ts");
  branchWith(repo, "a/i7", "b.txt", "feature\n");
  git(repo, "switch", "-q", "dev");
  writeFileSync(join(repo, "c.txt"), "base avancée\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "dev avance");
  git(repo, "checkout", "-q", "--detach", "a/i7");
  assert.equal(await mergeBaseInto(repo, "dev"), "merged");
  assert.equal(git(repo, "show", "HEAD:c.txt"), "base avancée");

  git(repo, "checkout", "-q", "--detach", "a/i7");
  git(repo, "switch", "-q", "dev");
  writeFileSync(join(repo, "b.txt"), "autre version\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "conflit");
  git(repo, "checkout", "-q", "--detach", "a/i7");
  assert.equal(await mergeBaseInto(repo, "dev"), "conflict");
  assert.equal(git(repo, "status", "--porcelain"), "", "the failed merge is undone");
});

test("local forge: a queued PR is known to conflict as soon as another one is merged", async () => {
  const { forge, repo } = fixture();
  await forge.ensureBase();
  branchWith(repo, "a/i1", "a.txt", "version A\n");
  branchWith(repo, "a/i2", "a.txt", "version B\n");
  branchWith(repo, "a/i3", "c.txt", "sans rapport\n");
  await forge.createPullRequest("dev", "a/i1", "un", "");
  await forge.createPullRequest("dev", "a/i2", "deux", "");
  await forge.createPullRequest("dev", "a/i3", "trois", "");
  const [one, two, three] = await forge.openPullRequests();
  assert.equal(await forge.wouldConflict(two?.number ?? 0), false, "no conflict before the merge");
  await forge.mergeIntoBase(one?.number ?? 0);
  assert.equal(await forge.wouldConflict(two?.number ?? 0), true);
  assert.equal(await forge.wouldConflict(three?.number ?? 0), false);
});

test("a correction is judged on the commits added since its start commit, never on its own branch", async () => {
  const { repo } = fixture();
  const { commitsAhead, headSha } = await import("./worktree.ts");
  git(repo, "switch", "-q", "-c", "a/i9", "dev");
  const start = await headSha(repo);
  assert.equal(await commitsAhead(repo, start), 0, "nothing done yet");
  writeFileSync(join(repo, "fix.txt"), "correction\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "correction");
  assert.equal(await commitsAhead(repo, start), 1);
  assert.equal(await commitsAhead(repo, "a/i9"), 0, "comparing a branch with itself always says 0");
});
