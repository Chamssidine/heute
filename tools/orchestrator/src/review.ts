// Automatic review is read-only: it validates and comments, it never merges.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { adapterFor } from "./adapters/index.ts";
import type { Config } from "./config.ts";
import { decideReview, type ReviewDecision } from "./decisions.ts";
import { exec } from "./exec.ts";
import { reviewPrompt } from "./prompts.ts";
import { startResumableRun } from "./runner.ts";
import { validateReviewerResponse } from "./schemas.ts";
import { prepareWorktree } from "./worktree.ts";

export interface ReviewResult extends ReviewDecision {
  reviewerComments: string[];
  validationLog: string;
}

export interface ReviewRequest {
  config: Config;
  // Undefined for a PR that does not come from an agent: no perimeter check then.
  agentId: string | undefined;
  reviewerId: string;
  pr: { number: number; headRefName: string };
  files: string[];
  issue: number | undefined;
  // Given to the reviewer as files: it then needs no shell command at all
  // (some CLIs, like agy, stop the whole run at the first refused command).
  diff: string;
  issueText: string | undefined;
  fixRoundsDone: number;
  logsDir: string;
  onLine: (line: string) => void;
}

const MAX_FIX_ROUNDS = 2;
const REVIEW_INPUT_DIR = ".orchestrator-review";

async function runValidations(dir: string): Promise<{ ok: boolean; log: string }> {
  let log = "";
  for (const script of ["typecheck", "lint", "test"]) {
    const r = await exec(`npm run ${script}`, [], { cwd: dir, shell: true, timeoutMs: 600_000 });
    log += `$ npm run ${script} → ${r.code === 0 ? "OK" : "ÉCHEC"}\n`;
    if (r.code !== 0) {
      log += (r.stdout + r.stderr).slice(-1500) + "\n";
      return { ok: false, log };
    }
  }
  return { ok: true, log };
}

function parseVerdict(
  text: string | undefined,
): { approve: boolean; comments: string[] } | undefined {
  const json = text?.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json);
    const result = validateReviewerResponse(parsed);
    if (!result.valid) return undefined;
    return { approve: result.approve!, comments: result.comments! };
  } catch {
    return undefined;
  }
}

export async function reviewPullRequest(req: ReviewRequest): Promise<ReviewResult> {
  const { config } = req;
  const base = {
    files: req.files,
    allowedPaths: req.agentId ? (config.agents[req.agentId]?.allowedPaths ?? []) : ["**"],
    contractPaths: config.contractPaths,
    fixRoundsDone: req.fixRoundsDone,
    maxFixRounds: MAX_FIX_ROUNDS,
  };

  // Cheap deterministic checks first: no LLM call for a PR that is already rejected.
  const perimeter = decideReview({ ...base, validationsPassed: true, reviewerApproved: true });
  if (perimeter.outcome === "changes")
    return { ...perimeter, reviewerComments: [], validationLog: "" };

  req.onLine("Relecture : préparation du worktree et validations…");
  await prepareWorktree(config.reviewWorktree, { detach: req.pr.headRefName });
  const validations = await runValidations(config.reviewWorktree);
  if (!validations.ok) {
    const decision = decideReview({ ...base, validationsPassed: false, reviewerApproved: true });
    return { ...decision, reviewerComments: [], validationLog: validations.log };
  }

  const reviewer = config.reviewers[req.reviewerId];
  const settings = reviewer ? config.clis[reviewer.cli] : undefined;
  if (!reviewer || !settings) throw new Error(`Relecteur inconnu : ${req.reviewerId}`);
  const adapter = adapterFor(settings.adapter);

  // Written after the validations so that lint never sees them; `git clean` removes them later.
  mkdirSync(join(config.reviewWorktree, REVIEW_INPUT_DIR), { recursive: true });
  const diffFile = `${REVIEW_INPUT_DIR}/pr-${req.pr.number}.diff`;
  writeFileSync(join(config.reviewWorktree, diffFile), req.diff);
  let issueFile: string | undefined;
  if (req.issue !== undefined && req.issueText) {
    issueFile = `${REVIEW_INPUT_DIR}/issue-${req.issue}.md`;
    writeFileSync(join(config.reviewWorktree, issueFile), req.issueText);
  }

  req.onLine(`Relecture par ${req.reviewerId} (${reviewer.model})…`);
  const run = startResumableRun({
    adapter,
    settings,
    model: reviewer.model,
    role: "reviewer",
    prompt: reviewPrompt(req.pr.number, diffFile, issueFile),
    cwd: config.reviewWorktree,
    logFile: join(req.logsDir, `review-pr${req.pr.number}-${Date.now()}.log`),
    timeoutMs: config.runTimeoutMinutes * 60_000,
    onLine: req.onLine,
    effort: reviewer.effort ?? "medium",
    budgetUsd: reviewer.budgetUsd ?? 0.5,
  });
  const { code, stdout } = await run.done;
  const verdict = code === 0 ? parseVerdict(adapter.finalText(stdout)) : undefined;
  if (!verdict) {
    return {
      outcome: "human",
      reasons: ["La relecture automatique n'a pas produit de verdict lisible"],
      reviewerComments: [],
      validationLog: validations.log,
    };
  }
  const decision = decideReview({
    ...base,
    validationsPassed: true,
    reviewerApproved: verdict.approve,
  });
  return { ...decision, reviewerComments: verdict.comments, validationLog: validations.log };
}

export function reviewComment(reviewerId: string, result: ReviewResult): string {
  const title = {
    ready: "Relecture automatique : prête à merger",
    human: "Relecture automatique : attention humaine requise",
    changes: "Relecture automatique : corrections demandées",
  }[result.outcome];
  const lines = [`### ${title} (${reviewerId})`, "", ...result.reasons.map((r) => `- ${r}`)];
  if (result.reviewerComments.length > 0) {
    lines.push("", "**Relecteur :**", ...result.reviewerComments.map((c) => `- ${c}`));
  }
  if (result.validationLog) {
    lines.push(
      "",
      "<details><summary>Validations</summary>",
      "",
      "```",
      result.validationLog.trim(),
      "```",
      "</details>",
    );
  }
  return lines.join("\n");
}
