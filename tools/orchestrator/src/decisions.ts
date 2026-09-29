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

export interface ReviewInput {
  files: readonly string[];
  allowedPaths: readonly string[];
  contractPaths: readonly string[];
  validationsPassed: boolean;
  reviewerApproved: boolean;
  fixRoundsDone: number;
  maxFixRounds: number;
}

export interface ReviewDecision {
  outcome: ReviewOutcome;
  reasons: string[];
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
    if (input.fixRoundsDone >= input.maxFixRounds) {
      return {
        outcome: "human",
        reasons: [...reasons, "Nombre maximal de corrections atteint"],
      };
    }
    return { outcome: "changes", reasons };
  }

  const contract = input.files.filter((f) => matchesAny(f, input.contractPaths));
  if (contract.length > 0) {
    return {
      outcome: "human",
      reasons: [`Contrat modifié : ${contract.join(", ")}`],
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
