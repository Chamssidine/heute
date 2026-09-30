import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ErrorCode, IssueSummary, ReviewOutcome } from "./decisions.ts";
import type { PullRequest } from "./github.ts";
import type { UsageMetrics } from "./adapters/types.ts";

export type AgentId = string;

export type RunKind = "task" | "fix";

export interface RunRecord {
  id: string;
  agent: AgentId;
  kind: RunKind;
  issue: number;
  pr?: number;
  branch: string;
  startedAt: string;
  endedAt?: string;
  exitCode?: number;
  result?: string;
  logFile: string;
  // Manual runs (IDE agents): the prompt to paste, the folder to open, and for a
  // correction the PR head commit at start, to notice when the agent has pushed.
  manual?: boolean;
  prompt?: string;
  worktree?: string;
  startSha?: string;
  // Local correction round after the orchestrator's own checks failed (0 = the first run).
  localRound?: number;
  // Usage metrics (tokens, cost) from the LLM run.
  m?: UsageMetrics;
  // Cumul USD dépensés sur cette tâche (toutes les runs + réparations).
  cumulCostUsd?: number;
  // JSON de fin de run demandé à l'agent, quand il est lisible.
  final?: AgentFinalMessage;
}

export interface ReviewRecord {
  pr: number;
  issue?: number;
  outcome: ReviewOutcome | "error";
  reviewer: string;
  reasons: string[];
  reviewerComments: string[];
  at: string;
  fixRounds: number;
  m?: UsageMetrics;
}

export interface AgentFinalMessage {
  v: 1;
  s: "ok" | "fail" | "blocked";
  id?: number;
  pr?: number;
  val?: { tc?: boolean; li?: boolean; lint?: boolean; te?: boolean; test?: boolean };
  e?: ErrorCode[];
}

export interface EventRecord {
  at: string;
  level: "info" | "warn" | "error";
  text: string;
}

export interface PersistedState {
  runs: RunRecord[];
  reviews: Record<string, ReviewRecord>;
  events: EventRecord[];
  // Per agent: when the LLM provider's quota resets (ISO date). Kept across restarts.
  quotaUntil?: Record<AgentId, string>;
  // Per branch: the commit the orchestrator already validated (typecheck, lint, tests) and the
  // log. The review reuses it instead of running everything a second time.
  validated?: Record<string, { sha: string; log: string }>;
  // Autopilot on/off (the human's switch) and why it stopped itself, if it did.
  autopilot?: { enabled: boolean; pausedReason?: string; resumedAt?: string };
}

// Volatile data (GitHub snapshot, live log lines) is kept in memory only.
export interface LiveState {
  issues: IssueSummary[];
  prs: PullRequest[];
  lastTick?: string;
  activity?: string;
  liveLines: Partial<Record<AgentId, string[]>>;
}

const MAX_EVENTS = 200;
const MAX_RUNS = 100;
const MAX_LIVE_LINES = 40;

export class Store extends EventEmitter {
  readonly dir: string;
  readonly logsDir: string;
  private readonly file: string;
  data: PersistedState;
  live: LiveState = { issues: [], prs: [], liveLines: {} };

  constructor(dir: string) {
    super();
    this.dir = dir;
    this.logsDir = join(dir, "logs");
    this.file = join(dir, "state.json");
    mkdirSync(this.logsDir, { recursive: true });
    this.data = existsSync(this.file)
      ? (JSON.parse(readFileSync(this.file, "utf8")) as PersistedState)
      : { runs: [], reviews: {}, events: [] };
  }

  save(): void {
    this.data.runs = this.data.runs.slice(-MAX_RUNS);
    this.data.events = this.data.events.slice(-MAX_EVENTS);
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    this.emit("change");
  }

  log(level: EventRecord["level"], text: string): void {
    this.data.events.push({ at: new Date().toISOString(), level, text });
    console.log(`[${level}] ${text}`);
    this.save();
  }

  pushLine(agent: AgentId, line: string): void {
    const lines = (this.live.liveLines[agent] ??= []);
    lines.push(line);
    if (lines.length > MAX_LIVE_LINES) lines.splice(0, lines.length - MAX_LIVE_LINES);
    this.emit("change");
  }

  setActivity(text: string | undefined): void {
    this.live.activity = text;
    this.emit("change");
  }
}
