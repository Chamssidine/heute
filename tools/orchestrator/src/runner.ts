import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import type { CliAdapter, LaunchSpec } from "./adapters/index.ts";
import { killTree } from "./exec.ts";

export interface RunHandle {
  // Resolves with the exit code and the full stdout once the CLI stops.
  done: Promise<{ code: number; stdout: string }>;
  stop: () => void;
}

// Starts one CLI run, streams a readable summary to `onLine` and the raw output to `logFile`.
export function startRun(
  adapter: CliAdapter,
  spec: LaunchSpec,
  cwd: string,
  logFile: string,
  timeoutMs: number,
  onLine: (line: string) => void,
): RunHandle {
  const log = createWriteStream(logFile, { flags: "a" });
  log.write(
    `# COMMAND\n${spec.command} ${spec.args.join(" ")}\n# PROMPT\n${spec.stdinPrompt}\n# OUTPUT\n`,
  );
  const child = spawn(spec.command, spec.args, { cwd, windowsHide: true });
  let stdout = "";
  let pending = "";

  const onData = (chunk: Buffer, isStdout: boolean): void => {
    const text = chunk.toString();
    log.write(text);
    if (isStdout) stdout += text;
    pending += text;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      const summary = adapter.summarize(line);
      if (summary) onLine(summary);
    }
  };
  child.stdout.on("data", (c: Buffer) => onData(c, true));
  child.stderr.on("data", (c: Buffer) => onData(c, false));
  child.stdin.end(spec.stdinPrompt);

  const timer = setTimeout(() => {
    onLine("Durée maximale dépassée : arrêt de l'agent.");
    killTree(child.pid);
  }, timeoutMs);

  const done = new Promise<{ code: number; stdout: string }>((resolve) => {
    child.on("error", (error) => {
      onLine(`Impossible de lancer la CLI : ${error.message}`);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      log.end();
      resolve({ code: code ?? -1, stdout });
    });
  });
  return { done, stop: () => killTree(child.pid) };
}
