import { parseJson, withExtra, type CliAdapter, type CliSettings, type Role } from "./types.ts";

function baseArgs(model: string, role: Role): string[] {
  return [
    "--model",
    model,
    "--output-format",
    "stream-json",
    "--mode",
    role === "agent" ? "accept-edits" : "plan",
  ];
}

function events(stdout: string): Record<string, unknown>[] {
  return stdout
    .split(/\r?\n/)
    .map(parseJson)
    .filter((e): e is Record<string, unknown> => e !== undefined);
}

function withArgs(settings: CliSettings, role: Role, args: string[]) {
  return { command: settings.command, args: withExtra(settings, role, args), stdinPrompt: "" };
}

// Antigravity CLI (`agy`). In print mode it cannot ask for permission: file edits are
// allowed by `--mode accept-edits`, and every shell command must match an allow-rule
// (`command(<regex>)`) in the Antigravity settings.json. Anything else is auto-denied.
// Reviewers run in `plan` mode (read-only). Do not add --disable-slash-commands: it turns plan mode off.
export const antigravity: CliAdapter = {
  id: "antigravity",
  verified: true,
  mode: "process",
  launch(settings, model, role, prompt) {
    return withArgs(settings, role, ["-p", prompt, ...baseArgs(model, role)]);
  },
  // In print mode agy ends the turn at the first refused command; `--conversation`
  // continues the same conversation, with all its context (verified on agy 1.0.12).
  resume: {
    refusedCommands(stdout) {
      return events(stdout).flatMap((e) => {
        const step = e["step_update"] as Record<string, unknown> | undefined;
        const info = (step?.["tool_info"] ?? {}) as Record<string, unknown>;
        const error = (info["error"] ?? {}) as Record<string, unknown>;
        const params = (info["parameters"] ?? {}) as Record<string, unknown>;
        const refused =
          step?.["state"] === "ERROR" && String(error["message"] ?? "").includes("permission");
        return refused ? [String(params["CommandLine"] ?? step?.["tool_name"])] : [];
      });
    },
    conversationId(stdout) {
      const init = events(stdout).find((e) => e["event"] === "init");
      const id = init?.["conversation_id"];
      return typeof id === "string" ? id : undefined;
    },
    launch(settings, model, role, conversationId, message) {
      return withArgs(settings, role, [
        "-p",
        message,
        "--conversation",
        conversationId,
        ...baseArgs(model, role),
      ]);
    },
  },
  limitArgs: (effort) => (effort ? ["--effort", effort] : []),
  summarize(line) {
    const e = parseJson(line);
    if (!e) return line.trim() ? line.trim().slice(0, 300) : undefined;
    if (e["event"] === "result") {
      const r = (e["result"] ?? {}) as Record<string, unknown>;
      const denied = Array.isArray(r["denied_actions"])
        ? (r["denied_actions"] as Record<string, unknown>[]).map((d) => String(d["action"]))
        : [];
      const refusals = denied.length ? ` · refusé : ${denied.join(", ")}` : "";
      return `Fin (${String(r["status"])})${refusals} : ${String(r["response"] ?? "").slice(0, 250)}`;
    }
    const step = e["step_update"] as Record<string, unknown> | undefined;
    if (step?.["step_type"] !== "tool") return undefined;
    const info = (step["tool_info"] ?? {}) as Record<string, unknown>;
    const params = (info["parameters"] ?? {}) as Record<string, unknown>;
    const target = params["CommandLine"] ?? params["TargetFile"] ?? params["AbsolutePath"] ?? "";
    const name = String(step["tool_name"]);
    if (step["state"] === "ERROR") {
      const error = (info["error"] ?? {}) as Record<string, unknown>;
      return `✗ [${name}] ${String(target)} : ${String(error["message"] ?? "").slice(0, 200)}`;
    }
    return step["state"] === "ACTIVE" ? `[${name}] ${String(target).slice(0, 200)}` : undefined;
  },
  finalText(stdout) {
    const result = stdout
      .split(/\r?\n/)
      .map(parseJson)
      .reverse()
      .find((e) => e?.["event"] === "result");
    const response = (result?.["result"] as Record<string, unknown> | undefined)?.["response"];
    return typeof response === "string" ? response : undefined;
  },
  usage: () => undefined,
};
