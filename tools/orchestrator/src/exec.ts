import { spawn } from "node:child_process";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  cwd?: string;
  input?: string;
  // Needed on Windows for npm (.cmd). Only ever used with constant commands.
  shell?: boolean;
  timeoutMs?: number;
}

export function exec(
  command: string,
  args: readonly string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: options.shell ?? false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    const timer = options.timeoutMs
      ? setTimeout(() => killTree(child.pid), options.timeoutMs)
      : undefined;
    child.on("error", (error) => resolve({ code: -1, stdout, stderr: stderr + error.message }));
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
    if (options.input !== undefined) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

// Kills the whole process tree: agents spawn npm, node, git… children.
export function killTree(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
  } else {
    process.kill(-pid, "SIGTERM");
  }
}
