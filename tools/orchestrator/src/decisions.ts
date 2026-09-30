// Pure scheduling and review rules. No I/O here, so every rule is unit-tested.
import { matchesAny } from "./paths.ts";

export const STATUS_LABELS = {
  running: "en-cours",
  review: "en-revue",
  ready: "prête",
  human: "attente-humain",
  changes: "changements",
  blocked: "bloquée",
  humanTask: "humain",
} as const;

const NOT_ASSIGNABLE = new Set<string>(Object.values(STATUS_LABELS));

export interface IssueSummary {
  number: number;
  title: string;
  labels: string[];
  body: string;
  state: "OPEN" | "CLOSED";
}

// Dependencies are declared in the issue body as « Dépend de #12, #14 ».
export function parseDependencies(body: string): number[] {
  const line = body.match(/Dépend de\s*:?\s*([#\d,\s et]+)/i);
  if (!line?.[1]) return [];
  return [...line[1].matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

export interface QueueEntry {
  issue: IssueSummary;
  ready: boolean;
  waitingFor: number[];
}

// `withOpenPr`: issues that already have an open PR are done from the agent's side; they
// wait for review or merge and must never be offered again.
export function queueFor(
  agentLabel: string,
  issues: readonly IssueSummary[],
  withOpenPr: ReadonlySet<number> = new Set(),
): QueueEntry[] {
  const open = new Set(issues.filter((i) => i.state === "OPEN").map((i) => i.number));
  return issues
    .filter(
      (i) =>
        i.state === "OPEN" &&
        i.labels.includes(agentLabel) &&
        !i.labels.some((l) => NOT_ASSIGNABLE.has(l)) &&
        !withOpenPr.has(i.number),
    )
    .sort((a, b) => a.number - b.number)
    .map((issue) => {
      const waitingFor = parseDependencies(issue.body).filter((n) => open.has(n));
      return { issue, ready: waitingFor.length === 0, waitingFor };
    });
}

export function nextIssue(
  agentLabel: string,
  issues: readonly IssueSummary[],
  withOpenPr: ReadonlySet<number> = new Set(),
): IssueSummary | undefined {
  return queueFor(agentLabel, issues, withOpenPr).find((entry) => entry.ready)?.issue;
}

export type ReviewOutcome = "ready" | "human" | "changes";

export type ErrorCode =
  | "SCOPE_VIOLATION"
  | "CONTRACT_CHANGE"
  | "TYPECHECK_FAIL"
  | "LINT_FAIL"
  | "TEST_FAIL"
  | "REVIEW_REJECT"
  | "NO_VERDICT"
  | "CMD_REFUSED"
  | "QUOTA"
  | "BUDGET_EXCEEDED"
  | "TIMEOUT"
  | "SECURITY_CONCERN";

// Limites de réparation automatique par type d'erreur.
// Au-delà : attente humaine, pas de relecture ni correction auto.
export const ERROR_FIX_LIMITS: Record<ErrorCode, number> = {
  SCOPE_VIOLATION: 1,
  CONTRACT_CHANGE: 0,
  TYPECHECK_FAIL: 3,
  LINT_FAIL: 3,
  TEST_FAIL: 3,
  REVIEW_REJECT: 2,
  NO_VERDICT: 1,
  CMD_REFUSED: 3,
  QUOTA: 0,
  BUDGET_EXCEEDED: 0,
  TIMEOUT: 0,
  SECURITY_CONCERN: 0,
};

export interface ReviewInput {
  files: readonly string[];
  allowedPaths: readonly string[];
  contractPaths: readonly string[];
  validationsPassed: boolean;
  reviewerApproved: boolean;
  fixRoundsDone: number;
  maxFixRounds: number;
  errorCode?: ErrorCode;
}

export interface ReviewDecision {
  outcome: ReviewOutcome;
  reasons: string[];
  errorCode?: ErrorCode;
}

export function decideReview(input: ReviewInput): ReviewDecision {
  const reasons: string[] = [];
  const outside = input.files.filter((f) => !matchesAny(f, input.allowedPaths));
  if (outside.length > 0) {
    reasons.push(`Fichiers hors périmètre : ${outside.join(", ")}`);
  }
  if (!input.validationsPassed) {
    reasons.push("typecheck, lint ou tests en échec");
  }
  if (!input.reviewerApproved) {
    reasons.push("La relecture demande des changements");
  }

  if (reasons.length > 0) {
    // Vérifier la limite de réparation si un code d'erreur est défini
    if (input.errorCode) {
      const limit = ERROR_FIX_LIMITS[input.errorCode];
      if (input.fixRoundsDone >= limit) {
        return {
          outcome: "human",
          reasons: [...reasons, `Limite de réparation pour ${input.errorCode} atteinte`],
          errorCode: input.errorCode,
        };
      }
    } else if (input.fixRoundsDone >= input.maxFixRounds) {
      return {
        outcome: "human",
        reasons: [...reasons, "Nombre maximal de corrections atteint"],
      };
    }
    return { outcome: "changes", reasons, errorCode: input.errorCode };
  }

  const contract = input.files.filter((f) => matchesAny(f, input.contractPaths));
  if (contract.length > 0) {
    return {
      outcome: "human",
      reasons: [`Contrat modifié : ${contract.join(", ")}`],
      errorCode: "CONTRACT_CHANGE",
    };
  }
  return { outcome: "ready", reasons: ["Toutes les vérifications passent : prête à merger"] };
}

// A manual run (IDE agent) is over when its PR exists (task) or when the PR received
// a new commit since the correction was requested (fix).
export function isManualRunDone(
  run: { kind: "task" | "fix"; branch: string; startSha?: string },
  prs: readonly { headRefName: string; headRefOid: string }[],
): boolean {
  const pr = prs.find((p) => p.headRefName === run.branch);
  if (!pr) return false;
  return run.kind === "task" || pr.headRefOid !== run.startSha;
}

const QUOTA_ERROR = /RESOURCE_EXHAUSTED|quota (?:reached|exceeded)|usage limit reached/i;
const DEFAULT_QUOTA_WAIT_MS = 60 * 60_000;

// End of a run's log → how long until the provider's quota resets, or undefined when the
// run did not stop on a quota. Reads « Resets in 2h18m58s » when the provider gives it.
export function quotaResetDelayMs(logTail: string): number | undefined {
  if (!QUOTA_ERROR.test(logTail)) return undefined;
  const reset = logTail.match(/Resets? in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i);
  const [hours, minutes, seconds] = [reset?.[1], reset?.[2], reset?.[3]].map((v) => Number(v ?? 0));
  const delay = ((hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0)) * 1000;
  return delay > 0 ? delay : DEFAULT_QUOTA_WAIT_MS;
}

// Pick the best reviewer based on diff complexity and PR type.
// - Small diffs (<80 lines) → haiku (fast, cheap)
// - Contract changes or security concerns → opus (most careful)
// - Fix round >= 2 → opus (harder problems)
// - Default → sonnet (good balance)
export interface ReviewerPickInput {
  files: readonly string[];
  diffLines: number;
  contractPaths: readonly string[];
  fixRounds: number;
}

export function pickReviewerId(input: ReviewerPickInput): "claude" | "codex" | "gemini" {
  const hasContract = input.files.some((f) => matchesAny(f, input.contractPaths));
  if (hasContract || input.fixRounds >= 2) return "claude"; // opus
  if (input.diffLines < 80) return "codex"; // haiku (or similar small model if available)
  return "claude"; // sonnet (default)
}

// Autopilot circuit breaker: how many runs in a row ended without a PR (most recent first).
// A PR resets the count; quota stops, restarts and cancellations are not the agent's failure.
export function failureStreak(results: readonly (string | undefined)[]): number {
  let streak = 0;
  for (const result of [...results].reverse()) {
    if (!result) continue;
    if (result.startsWith("PR #")) break;
    if (result.startsWith("aucune PR")) streak += 1;
  }
  return streak;
}

// A PR is waiting for its first (or a new) review when it carries no status label at all.
export function needsReview(labels: readonly string[]): boolean {
  return !labels.some((l) => (Object.values(STATUS_LABELS) as string[]).includes(l));
}
