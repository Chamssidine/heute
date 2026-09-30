import { brief, parseJson, withExtra, type CliAdapter } from "./types.ts";

// Agents may edit files and run the project's own tools; merging stays with the human.
// Agents work locally: no GitHub, no push, no network git. The orchestrator pushes and opens the PR.
const GIT_LOCAL = [
  "status",
  "diff",
  "log",
  "show",
  "add",
  "rm",
  "mv",
  "commit",
  "switch",
  "checkout",
  "restore",
  "rev-parse",
  "branch",
  "stash",
].map((c) => `Bash(git ${c}:*)`);
const AGENT_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  ...GIT_LOCAL,
  "Bash(npm:*)",
  "Bash(npx:*)",
  "Bash(node:*)",
  "Bash(supabase:*)",
];
const AGENT_DENIED = [
  "Bash(gh:*)",
  "Bash(git push:*)",
  "Bash(git fetch:*)",
  "Bash(git pull:*)",
  "Bash(git remote:*)",
  "Bash(git reset:*)",
];
// The reviewer is given the diff and the issue as files: it needs no shell command.
const REVIEWER_TOOLS = ["Read", "Glob", "Grep"];

export const claude: CliAdapter = {
  id: "claude",
  verified: true,
  mode: "process",
  launch(settings, model, role, prompt) {
    const args =
      role === "agent"
        ? [
            "-p",
            "--model",
            model,
            "--output-format",
            "stream-json",
            "--verbose",
            "--permission-mode",
            "acceptEdits",
            "--allowedTools",
            AGENT_TOOLS.join(","),
            "--disallowedTools",
            AGENT_DENIED.join(","),
          ]
        : [
            "-p",
            "--model",
            model,
            "--output-format",
            "stream-json",
            "--verbose",
            "--allowedTools",
            REVIEWER_TOOLS.join(","),
          ];
    return {
      command: settings.command,
      args: withExtra(settings, role, args),
      stdinPrompt: prompt,
    };
  },
  limitArgs: (effort, budgetUsd) => [
    ...(effort ? ["--effort", effort] : []),
    ...(budgetUsd ? ["--max-budget-usd", String(budgetUsd)] : []),
  ],
  summarize(line) {
    const e = parseJson(line);
    if (!e) return line.trim() ? line.trim().slice(0, 300) : undefined;
    if (e["type"] === "result")
      return `Fin : ${String(e["result"] ?? e["subtype"] ?? "").slice(0, 300)}`;
    const content = (e["message"] as { content?: unknown } | undefined)?.content;
    if (!Array.isArray(content)) return undefined;
    const text = (content as Record<string, unknown>[])
      .map((c) =>
        c["type"] === "text"
          ? String(c["text"] ?? "")
          : c["type"] === "tool_use"
            ? `[${String(c["name"])}] ${brief(c["input"])}`
            : "",
      )
      .filter(Boolean)
      .join(" · ");
    return text ? text.slice(0, 300) : undefined;
  },
  finalText(stdout) {
    const lines = stdout.split(/\r?\n/).map(parseJson);
    const result = lines.reverse().find((e) => e?.["type"] === "result");
    return typeof result?.["result"] === "string" ? result["result"] : undefined;
  },
  usage(stdout) {
    const lines = stdout.split(/\r?\n/).map(parseJson);
    const result = lines.reverse().find((e) => e?.["type"] === "result");
    if (!result) return undefined;
    const usage = result["usage"] as Record<string, unknown> | undefined;
    if (!usage) return undefined;
    const turns = (result["iterations"] as unknown[])?.length ?? undefined;
    return {
      inputTokens: Number(usage["input_tokens"] ?? 0),
      outputTokens: Number(usage["output_tokens"] ?? 0),
      cacheReadInputTokens: Number(usage["cache_read_input_tokens"] ?? 0),
      cacheCreationInputTokens: Number(usage["cache_creation_input_tokens"] ?? 0),
      totalCostUsd: Number(result["total_cost_usd"] ?? 0),
      turns,
    };
  },
};
