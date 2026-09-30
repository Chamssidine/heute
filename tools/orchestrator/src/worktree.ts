import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { exec } from "./exec.ts";

async function git(cwd: string, args: string[]): Promise<void> {
  const result = await exec("git", args, { cwd, timeoutMs: 120_000 });
  if (result.code !== 0) {
    throw new Error(`git ${args.join(" ")} (${cwd}) : ${result.stderr.trim()}`);
  }
}

function lockHash(dir: string): string {
  const lock = join(dir, "package-lock.json");
  return existsSync(lock) ? createHash("sha256").update(readFileSync(lock)).digest("hex") : "";
}

// Puts a worktree on a clean copy of `ref` and reinstalls dependencies only when
// the lockfile changed. Untracked build output is removed, node_modules is kept.
export async function prepareWorktree(
  dir: string,
  ref: { detach: string } | { branch: string },
): Promise<void> {
  // Without this check a missing folder surfaces as a misleading « spawn git ENOENT ».
  if (!existsSync(dir)) throw new Error(`Worktree introuvable : ${dir}`);
  const before = lockHash(dir);
  await git(dir, ["fetch", "--prune", "origin"]);
  await git(dir, ["reset", "--hard"]);
  await git(dir, ["clean", "-fd"]);
  if ("detach" in ref) {
    await git(dir, ["checkout", "--detach", `origin/${ref.detach}`]);
  } else {
    await git(dir, ["checkout", "-B", ref.branch, `origin/${ref.branch}`]);
  }
  if (lockHash(dir) !== before || !existsSync(join(dir, "node_modules"))) {
    const install = await exec("npm ci --no-audit --no-fund", [], {
      cwd: dir,
      shell: true,
      timeoutMs: 600_000,
    });
    if (install.code !== 0) throw new Error(`npm ci (${dir}) : ${install.stderr.slice(-500)}`);
  }
}

// True when an earlier, interrupted run already pushed work on this branch.
export async function remoteBranchExists(dir: string, branch: string): Promise<boolean> {
  const result = await exec("git", ["ls-remote", "--heads", "origin", branch], {
    cwd: dir,
    timeoutMs: 60_000,
  });
  if (result.code !== 0) throw new Error(`git ls-remote (${dir}) : ${result.stderr.trim()}`);
  return result.stdout.trim() !== "";
}

// A local branch left by an interrupted run that pushed nothing: remove it so the agent
// can create it again from main (otherwise `git switch -c` fails and the agent improvises).
// Errors are ignored on purpose: most of the time the branch simply does not exist.
export async function deleteLocalBranch(dir: string, branch: string): Promise<void> {
  await exec("git", ["branch", "-D", branch], { cwd: dir, timeoutMs: 60_000 });
}

export async function ensureWorktree(repoDir: string, dir: string): Promise<void> {
  if (existsSync(dir)) return;
  await git(repoDir, ["worktree", "add", "--detach", dir, "origin/main"]);
}

async function gitOutput(cwd: string, args: string[]): Promise<{ code: number; out: string }> {
  const result = await exec("git", args, { cwd, timeoutMs: 120_000 });
  return { code: result.code, out: (result.stdout + result.stderr).trim() };
}

// Brings `base` into the branch checked out in `dir`. A clean merge is pushed; on conflicts the
// markers are left in the files for the agent to resolve (it may run git add / commit / push).
export async function syncWithBase(
  dir: string,
  base: string,
): Promise<"up-to-date" | "merged" | "conflict"> {
  await git(dir, ["fetch", "--prune", "origin"]);
  const merge = await gitOutput(dir, ["merge", `origin/${base}`, "--no-edit"]);
  if (merge.code === 0) {
    if (/Already up to date/i.test(merge.out)) return "up-to-date";
    await git(dir, ["push", "origin", "HEAD"]);
    return "merged";
  }
  const unmerged = await gitOutput(dir, ["diff", "--name-only", "--diff-filter=U"]);
  if (unmerged.out === "") throw new Error(`git merge origin/${base} (${dir}) : ${merge.out}`);
  return "conflict";
}

// Keeps `target` up to date with `source` (e.g. dev with main after a hotfix), from a detached
// checkout in `dir`. Returns false when there are conflicts: a human must resolve those.
export async function fastForwardInto(
  dir: string,
  target: string,
  source: string,
): Promise<boolean> {
  await git(dir, ["fetch", "--prune", "origin"]);
  await git(dir, ["reset", "--hard"]);
  await git(dir, ["checkout", "--detach", `origin/${target}`]);
  const merge = await gitOutput(dir, ["merge", `origin/${source}`, "--no-edit"]);
  if (merge.code !== 0) {
    await gitOutput(dir, ["merge", "--abort"]);
    return false;
  }
  await git(dir, ["push", "origin", `HEAD:${target}`]);
  return true;
}

// Commits on `head` that `base` does not have yet.
export async function aheadCount(dir: string, base: string, head: string): Promise<number> {
  const r = await gitOutput(dir, ["rev-list", "--count", `origin/${base}..origin/${head}`]);
  if (r.code !== 0) throw new Error(`git rev-list (${dir}) : ${r.out}`);
  return Number(r.out);
}

export async function fetchOrigin(dir: string): Promise<void> {
  await git(dir, ["fetch", "--prune", "origin"]);
}

export async function localBranchExists(dir: string, branch: string): Promise<boolean> {
  const r = await gitOutput(dir, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
  return r.code === 0;
}

// Resumes an interrupted run's local branch as it is: commits and uncommitted work are kept.
export async function checkoutLocalBranch(dir: string, branch: string): Promise<void> {
  await git(dir, ["checkout", branch]);
}

// Commits on HEAD that `ref` does not have (what the agent produced and nobody has pushed).
export async function commitsAhead(dir: string, ref: string): Promise<number> {
  const r = await gitOutput(dir, ["rev-list", "--count", `${ref}..HEAD`]);
  if (r.code !== 0) throw new Error(`git rev-list (${dir}) : ${r.out}`);
  return Number(r.out);
}

export async function changedFiles(dir: string, base: string): Promise<string[]> {
  const r = await gitOutput(dir, ["diff", "--name-only", `origin/${base}...HEAD`]);
  if (r.code !== 0) throw new Error(`git diff (${dir}) : ${r.out}`);
  return r.out === "" ? [] : r.out.split(/\r?\n/);
}

export async function pushBranch(dir: string, branch: string): Promise<void> {
  await git(dir, ["push", "-u", "origin", branch]);
}
