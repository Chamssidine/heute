import { readFileSync } from "node:fs";
import { adapterFor, type CliSettings } from "./adapters/index.ts";

// Agents are declared in config.json: adding one (or switching its LLM) needs no code change.
export interface AgentConfig {
  name: string;
  cli: string;
  model: string;
  worktree: string;
  label: string;
  branchPrefix: string;
  brief: string;
  allowedPaths: string[];
  effort?: "low" | "medium" | "high" | "max";
  budgetUsd?: number;
}

export interface ReviewerConfig {
  cli: string;
  model: string;
  effort?: "low" | "medium" | "high" | "max";
  budgetUsd?: number;
}

export interface Config {
  repo: string;
  port: number;
  refreshSeconds: number;
  runTimeoutMinutes: number;
  gh: string;
  clis: Record<string, CliSettings>;
  reviewers: Record<string, ReviewerConfig>;
  defaultReviewer: string;
  reviewWorktree: string;
  agents: Record<string, AgentConfig>;
  contractPaths: string[];
}

export function loadConfig(path: URL): Config {
  const config = JSON.parse(readFileSync(path, "utf8")) as Config;
  const problems: string[] = [];
  for (const [id, agent] of Object.entries(config.agents)) {
    if (!config.clis[agent.cli])
      problems.push(`agent ${id} : CLI « ${agent.cli} » absente de clis`);
  }
  for (const [id, reviewer] of Object.entries(config.reviewers)) {
    const cli = config.clis[reviewer.cli];
    if (!cli) problems.push(`relecteur ${id} : CLI « ${reviewer.cli} » absente de clis`);
    // The review must produce a verdict on its own, so it cannot use an IDE-only agent.
    else if (adapterFor(cli.adapter).mode === "manual")
      problems.push(`relecteur ${id} : une CLI manuelle ne peut pas relire`);
  }
  if (!config.reviewers[config.defaultReviewer]) problems.push("defaultReviewer inconnu");
  if (problems.length > 0) throw new Error(`config.json invalide :\n- ${problems.join("\n- ")}`);
  return config;
}

export function agentOfBranch(config: Config, branch: string): string | undefined {
  return Object.entries(config.agents).find(([, a]) =>
    branch.startsWith(`${a.branchPrefix}/`),
  )?.[0];
}
