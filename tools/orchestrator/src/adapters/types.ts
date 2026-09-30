// A CLI adapter hides how one LLM tool is started and how its output is read.
// Adding a new LLM = one small file implementing this interface + an entry in config.json.
export type Role = "agent" | "reviewer";

export interface CliSettings {
  adapter: string;
  command: string;
  // Extra arguments per role, appended after the adapter's own arguments.
  // They let the user tighten or loosen permissions without touching code.
  extraArgs?: Partial<Record<Role, string[]>>;
}

export interface LaunchSpec {
  command: string;
  args: string[];
  // Sent on stdin when the CLI reads it there (no quoting issues); empty when the adapter passes the prompt as an argument.
  stdinPrompt: string;
}

export interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  totalCostUsd: number;
  turns?: number;
  durationMs?: number;
}

export interface CliAdapter {
  readonly id: string;
  // True once the adapter has been tried against the real CLI on this machine.
  readonly verified: boolean;
  // "process": the orchestrator starts the CLI itself.
  // "manual": the human pastes the prompt into an IDE agent (e.g. Antigravity);
  // the end of the run is detected from GitHub.
  readonly mode: "process" | "manual";
  launch(settings: CliSettings, model: string, role: Role, prompt: string): LaunchSpec;
  // One output line → one short readable line for the live log (or nothing).
  summarize(line: string): string | undefined;
  // Whole stdout of a finished run → the final text answer.
  finalText(stdout: string): string | undefined;
  // Whole stdout of a finished run → usage metrics.
  usage(stdout: string): UsageMetrics | undefined;
  // For CLIs that end the whole run at the first refused command (agy in print mode):
  // how to find the refusals and continue the same conversation afterwards.
  readonly resume?: {
    refusedCommands(stdout: string): string[];
    conversationId(stdout: string): string | undefined;
    launch(
      settings: CliSettings,
      model: string,
      role: Role,
      conversationId: string,
      message: string,
    ): LaunchSpec;
  };
}

export function parseJson(line: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function brief(input: unknown): string {
  if (typeof input !== "object" || input === null) return "";
  const i = input as Record<string, unknown>;
  const value = i["command"] ?? i["file_path"] ?? i["pattern"] ?? i["path"] ?? i["url"];
  return typeof value === "string" ? value.slice(0, 160) : "";
}

export function withExtra(settings: CliSettings, role: Role, args: string[]): string[] {
  return [...args, ...(settings.extraArgs?.[role] ?? [])];
}
