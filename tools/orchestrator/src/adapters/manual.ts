import type { CliAdapter } from "./types.ts";

// For agents that only run inside an IDE (Antigravity, Cursor…): nothing is started here.
// The dashboard shows the prompt to paste, and the run ends when its PR (or a new commit
// on the PR for a correction) shows up on GitHub. `settings.command` is the tool name shown.
export const manual: CliAdapter = {
  id: "manual",
  verified: true,
  mode: "manual",
  launch(settings, _model, _role, prompt) {
    return { command: settings.command, args: [], stdinPrompt: prompt };
  },
  summarize: () => undefined,
  finalText: () => undefined,
};
