import { parseJson, withExtra, type CliAdapter } from "./types.ts";

// Written from the Codex CLI documentation (`codex exec`), not yet tried on this machine.
// `-` makes codex read the prompt from stdin; --json streams JSONL events.
export const codex: CliAdapter = {
  id: "codex",
  verified: false,
  mode: "process",
  launch(settings, model, role, prompt) {
    const sandbox = role === "reviewer" ? "read-only" : "workspace-write";
    const args = ["exec", "--json", "-m", model, "--sandbox", sandbox, "-"];
    return {
      command: settings.command,
      args: withExtra(settings, role, args),
      stdinPrompt: prompt,
    };
  },
  summarize(line) {
    const e = parseJson(line);
    if (!e) return line.trim() ? line.trim().slice(0, 300) : undefined;
    const item = (e["item"] ?? e["msg"] ?? e) as Record<string, unknown>;
    const text = item["text"] ?? item["message"] ?? item["command"];
    if (typeof text === "string" && text.trim()) return text.slice(0, 300);
    return typeof e["type"] === "string" ? `[${e["type"]}]` : undefined;
  },
  finalText(stdout) {
    const texts = stdout
      .split(/\r?\n/)
      .map(parseJson)
      .map((e) => (e?.["item"] as Record<string, unknown> | undefined)?.["text"] ?? e?.["text"])
      .filter((t): t is string => typeof t === "string");
    return texts.at(-1);
  },
  usage: () => undefined,
};
