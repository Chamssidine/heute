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
  // The prompt is always sent on stdin: no quoting issues on Windows.
  stdinPrompt: string;
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
