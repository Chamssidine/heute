import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import type { CliAdapter, CliSettings, LaunchSpec, Role } from "./adapters/index.ts";
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

export interface RunRequest {
  adapter: CliAdapter;
  settings: CliSettings;
  model: string;
  role: Role;
  prompt: string;
  cwd: string;
  logFile: string;
  timeoutMs: number;
  onLine: (line: string) => void;
  effort?: "low" | "medium" | "high" | "max";
  budgetUsd?: number;
}

const MAX_RESUMES = 3;

function injectBudgetFlags(spec: LaunchSpec, effort?: string, budgetUsd?: number): LaunchSpec {
  if (!effort && !budgetUsd) return spec;
  const args = [...spec.args];
  if (effort) {
    args.push("--effort", effort);
  }
  if (budgetUsd) {
    args.push("--max-budget-usd", String(budgetUsd));
  }
  return { ...spec, args };
}

function resumeMessage(refused: string[]): string {
  return `Ces commandes ont été refusées, car elles ne sont pas autorisées dans ce projet :
${refused.map((c) => `- ${c}`).join("\n")}
Ce n'est pas bloquant. Ne les relance pas et ne les contourne pas.
Continue la tâche là où tu t'es arrêté, uniquement avec les commandes autorisées :
git, npm run typecheck|lint|test|format, npm test, npm install, npm ci,
npx prettier|eslint|tsc|expo, gh issue view|comment, gh pr create|view|diff|comment|list.`;
}

// Starts a run and, for CLIs that stop at the first refused command, continues the same
// conversation (at most MAX_RESUMES times, within the same overall time budget).
export function startResumableRun(req: RunRequest): RunHandle {
  const deadline = Date.now() + req.timeoutMs;
  const remaining = () => Math.max(60_000, deadline - Date.now());
  const run = (spec: LaunchSpec) =>
    startRun(req.adapter, spec, req.cwd, req.logFile, remaining(), req.onLine);

  let current = run(
    injectBudgetFlags(
      req.adapter.launch(req.settings, req.model, req.role, req.prompt),
      req.effort,
      req.budgetUsd,
    ),
  );
  let stopped = false;
  const done = (async () => {
    let result = await current.done;
    let stdout = result.stdout;
    const resume = req.adapter.resume;
    for (let attempt = 1; resume && attempt <= MAX_RESUMES && !stopped; attempt++) {
      const refused = resume.refusedCommands(result.stdout);
      const conversation = resume.conversationId(result.stdout) ?? resume.conversationId(stdout);
      if (refused.length === 0 || !conversation || Date.now() >= deadline) break;
      req.onLine(`Commande refusée (${refused.join(", ")}) : reprise ${attempt}/${MAX_RESUMES}`);
      current = run(
        injectBudgetFlags(
          resume.launch(req.settings, req.model, req.role, conversation, resumeMessage(refused)),
          req.effort,
          req.budgetUsd,
        ),
      );
      result = await current.done;
      stdout += result.stdout;
    }
    return { code: result.code, stdout };
  })();
  return {
    done,
    stop: () => {
      stopped = true;
      current.stop();
    },
  };
}
