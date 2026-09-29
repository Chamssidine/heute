import { brief, parseJson, withExtra, type CliAdapter } from "./types.ts";

// `command` points to the Gemini CLI JS bundle, started with the current Node binary
// (the npm .ps1/.cmd shims cannot be spawned safely without a shell on Windows).
// Permissions are NOT set here: they come from `extraArgs` in config.json
// (e.g. --approval-mode, or a Policy Engine file), so the user decides explicitly.
export const gemini: CliAdapter = {
  id: "gemini",
  verified: false,
  launch(settings, model, role, prompt) {
    const args = [settings.command, "-p", " ", "-m", model, "--output-format", "stream-json"];
    if (role === "reviewer") args.push("--approval-mode", "plan");
    return {
      command: process.execPath,
      args: withExtra(settings, role, args),
      stdinPrompt: prompt,
    };
  },
  summarize(line) {
    const e = parseJson(line);
    if (!e) return line.trim() ? line.trim().slice(0, 300) : undefined;
    const tool = e["tool_name"] ?? e["name"];
    if (typeof tool === "string") return `[${tool}] ${brief(e["parameters"] ?? e["args"])}`;
    const text = e["content"] ?? e["text"] ?? e["response"];
    return typeof text === "string" && text.trim() ? text.slice(0, 300) : undefined;
  },
  finalText(stdout) {
    const texts = stdout
      .split(/\r?\n/)
      .map(parseJson)
      .map((e) => e?.["content"] ?? e?.["text"] ?? e?.["response"])
      .filter((t): t is string => typeof t === "string");
    return texts.length > 0 ? texts.join("") : undefined;
  },
};
