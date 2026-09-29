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
