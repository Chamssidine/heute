// Automatic review is read-only: it validates and comments, it never merges.
import { join } from "node:path";
import { adapterFor } from "./adapters/index.ts";
import type { Config } from "./config.ts";
import { decideReview, type ReviewDecision } from "./decisions.ts";
import { exec } from "./exec.ts";
import { reviewPrompt } from "./prompts.ts";
import { startRun } from "./runner.ts";
import { prepareWorktree } from "./worktree.ts";

export interface ReviewResult extends ReviewDecision {
  reviewerComments: string[];
  validationLog: string;
}

export interface ReviewRequest {
  config: Config;
  agentId: string;
  reviewerId: string;
  pr: { number: number; headRefName: string };
  files: string[];
  issue: number | undefined;
  fixRoundsDone: number;
  logsDir: string;
  onLine: (line: string) => void;
}

const MAX_FIX_ROUNDS = 2;

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
    const parsed = JSON.parse(json) as { approve?: unknown; comments?: unknown };
    if (typeof parsed.approve !== "boolean") return undefined;
    return {
      approve: parsed.approve,
      comments: Array.isArray(parsed.comments) ? parsed.comments.map(String) : [],
    };
  } catch {
    return undefined;
  }
}

export async function reviewPullRequest(req: ReviewRequest): Promise<ReviewResult> {
  const { config } = req;
  const base = {
    files: req.files,
    allowedPaths: config.agents[req.agentId]?.allowedPaths ?? [],
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
  req.onLine(`Relecture par ${req.reviewerId} (${reviewer.model})…`);
  const run = startRun(
    adapter,
    adapter.launch(settings, reviewer.model, "reviewer", reviewPrompt(req.pr.number, req.issue)),
    config.reviewWorktree,
    join(req.logsDir, `review-pr${req.pr.number}-${Date.now()}.log`),
    config.runTimeoutMinutes * 60_000,
    req.onLine,
  );
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
