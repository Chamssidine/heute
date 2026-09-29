import { claude } from "./claude.ts";
import { codex } from "./codex.ts";
import { gemini } from "./gemini.ts";
import type { CliAdapter } from "./types.ts";

// Registry: to support a new LLM CLI, add its adapter here.
const ADAPTERS: Record<string, CliAdapter> = { claude, gemini, codex };

export function adapterFor(id: string): CliAdapter {
  const adapter = ADAPTERS[id];
  if (!adapter)
    throw new Error(`Adaptateur inconnu : ${id} (connus : ${Object.keys(ADAPTERS).join(", ")})`);
  return adapter;
}

export type { CliAdapter, CliSettings, LaunchSpec, Role } from "./types.ts";
