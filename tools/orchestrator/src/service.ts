// Every action that launches an agent or merges code is triggered by the human from the
// dashboard. The service only prepares, runs what was asked, and reviews read-only.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adapterFor } from "./adapters/index.ts";
import {
  agentOfBranch,
  autopilotSettings,
  baseBranch,
  productionBranch,
  type Config,
} from "./config.ts";

const GENERATED_FILE_PATTERNS = [
  "package-lock.json",
  "packages/domain/src/database.types.ts",
  "pnpm-lock.yaml",
];

function filterDiff(rawDiff: string): string {
  const lines = rawDiff.split("\n");
  const result: string[] = [];
  let inExcludedFile = false;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/a\/(.+?)\s+b\/(.+?)$/);
      const filepath = match?.[1] ?? match?.[2];
      inExcludedFile = !!filepath && GENERATED_FILE_PATTERNS.some((p) => filepath.includes(p));

      if (inExcludedFile) {
        const path = filepath || "file";
        result.push(`--- ${path}: (fichier généré, exclu du diff)`);
      } else {
        result.push(line);
      }
    } else if (!inExcludedFile) {
      result.push(line);
    }
  }

  return result.join("\n");
}
import {
  decideReview,
  failureStreak,
  parseDependencies,
  taskFit,
  taskPaths,
  isManualRunDone,
  needsReview,
  nextIssue,
  pickReviewerId,
  queueFor,
  quotaResetDelayMs,
  STATUS_LABELS,
  type ErrorCode,
} from "./decisions.ts";
import { buildAgent, type AgentSpec } from "./agents.ts";
import type { Forge } from "./forge.ts";
import type { PullRequest } from "./github.ts";
import { LocalForge } from "./localForge.ts";
import { exec } from "./exec.ts";
import { fixPrompt, localFixPrompt, taskPrompt } from "./prompts.ts";
import { reviewComment, reviewPullRequest, runValidations } from "./review.ts";
import { startResumableRun, type RunHandle } from "./runner.ts";
import type { RunKind, RunRecord, Store } from "./store.ts";
import { validateAgentFinalMessage } from "./schemas.ts";
import {
  aheadCount,
  changedFiles,
  checkoutLocalBranch,
  commitsAhead,
  deleteLocalBranch,
  ensureWorktree,
  fastForwardInto,
  fetchOrigin,
  headSha,
  localBranchExists,
  prepareWorktree,
  pushBranch,
  remoteBranchExists,
  syncWithBase,
} from "./worktree.ts";

const ALL_STATUS = Object.values(STATUS_LABELS);
// Marker of the review reason written when a merge into the base branch hit a conflict.
const CONFLICT_REASON = "Conflit de fusion avec la branche de base";
// Automatic corrections stop here whatever the reviews say: a human looks at it.
const MAX_AUTO_FIX_ROUNDS = 4;
const MAX_REVIEW_ATTEMPTS = 3;
// Corrections done locally, on the agent's own commits, before anything is pushed.
const MAX_LOCAL_FIX_ROUNDS = 2;
const RELEASE_CHECK_MS = 5 * 60_000;
const DEFAULT_TASK_BUDGET_USD = 1.5;
const BUDGET_ERROR = /budget (?:exceeded|reached)|max(?:imum)? budget|BUDGET_EXCEEDED/i;

// End of a run's log: provider errors (quota, rate limit) are printed last.
function logTail(file: string): string {
  try {
    return readFileSync(file, "utf8").slice(-6000);
  } catch {
    return "";
  }
}

function activeQuota(until: string | undefined): string | undefined {
  return until && Date.parse(until) > Date.now() ? until : undefined;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function parseJsonObject(text: string | undefined): unknown {
  const json = text?.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function runErrorCode(code: number, tail: string): ErrorCode | undefined {
  if (BUDGET_ERROR.test(tail)) return "BUDGET_EXCEEDED";
  if (code !== 0 && /Durée maximale dépassée|timed? out|timeout/i.test(tail)) return "TIMEOUT";
  return undefined;
}
const TOOL_NAMES: Record<string, string> = {
  claude: "Claude Code",
  antigravity: "Antigravity CLI",
  gemini: "Gemini CLI",
  codex: "Codex",
};

export class Orchestrator {
  private readonly config: Config;
  private readonly github: Forge;
  private readonly store: Store;
  private readonly repoDir: string;
  // `handle` is absent for manual runs: nothing runs on this machine.
  private readonly running = new Map<string, { run: RunRecord; handle?: RunHandle }>();
  private reviewing: number | undefined;
  private readonly reviewQueue: { pr: number; reviewer: string }[] = [];
  private readonly interrupted: RunRecord[] = [];
  private ticking = false;
  // Models each CLI offers: asked to the CLI when it can tell, else declared in config.json.
  private readonly models = new Map<string, { id: string; label: string }[]>();
  // Live proof of life of a running agent: tool steps so far, files changed, commits made.
  private readonly steps = new Map<string, number>();
  private readonly work = new Map<string, { changed: number; commits: number }>();
  // Called every few seconds: what each running agent has really produced in its folder.
  async refreshWork(): Promise<void> {
    for (const [id, { run }] of this.running) {
      if (run.manual) continue;
      const agent = this.config.agents[id];
      if (!agent) continue;
      try {
        const status = await exec("git", ["status", "--porcelain"], {
          cwd: agent.worktree,
          timeoutMs: 20_000,
        });
        const changed = status.stdout.split(/\r?\n/).filter(Boolean).length;
        const commits = await commitsAhead(
          agent.worktree,
          run.kind === "fix" ? (run.startSha ?? this.headRef(run.branch)) : this.baseRef(),
        );
        this.work.set(id, { changed, commits });
      } catch {
        // The folder is being prepared or reset: try again next time.
      }
    }
    this.store.emit("change");
  }

  // What the orchestrator itself is doing right now (not the agents): shown in the status bar.
  private readonly activities = new Map<string, { text: string; since: string }>();
  nextTickAt: string | undefined;

  private begin(key: string, text: string): void {
    this.activities.set(key, { text, since: new Date().toISOString() });
    this.store.emit("change");
  }

  private end(key: string): void {
    this.activities.delete(key);
    this.store.emit("change");
  }

  // Local mode: tasks and PRs are JSON records, branches never leave this machine.
  private isLocal(): boolean {
    return this.github instanceof LocalForge;
  }

  // Full git refs: the remote-tracking branch on GitHub, the plain branch in local mode.
  private baseRef(): string {
    const base = baseBranch(this.config);
    return this.isLocal() ? base : `origin/${base}`;
  }

  private headRef(branch: string): string {
    return this.isLocal() ? branch : `origin/${branch}`;
  }

  private readonly launching = new Set<string>();
  private readonly reviewAttempts = new Map<number, number>();
  private readonly loggedOnce = new Set<string>();
  private lastReleaseCheck = 0;
  private lastDeliveredCheck = 0;
  private release: { ahead: number; pr?: number; error?: string } = { ahead: 0 };

  constructor(config: Config, github: Forge, store: Store, repoDir: string) {
    this.config = config;
    this.github = github;
    this.store = store;
    this.repoDir = repoDir;
    // After a restart, manual runs are still waiting for the IDE agent; process runs are lost.
    for (const run of store.data.runs.filter((r) => !r.endedAt)) {
      if (run.manual) {
        this.running.set(run.agent, { run });
      } else {
        run.endedAt = new Date().toISOString();
        run.result = "interrompu (orchestrateur redémarré)";
        this.interrupted.push(run);
      }
    }
    store.save();
  }

  // Runs cut by a restart left « en-cours » on their issue or PR: the task would then look
  // taken forever and never be offered again. Their pushed work is resumed on the next launch.
  async releaseInterruptedRuns(): Promise<void> {
    for (const run of this.interrupted.splice(0)) {
      const target = run.kind === "fix" && run.pr !== undefined ? run.pr : run.issue;
      // A run recorded before a change of mode may point to a number this forge does not know.
      await this.github
        .setLabels(target, [], [STATUS_LABELS.running])
        .catch((e: Error) => this.store.log("warn", `Libération de #${target} : ${e.message}`));
      this.store.log(
        "warn",
        `Run de ${run.agent} sur #${target} coupé par le redémarrage : tâche libérée, le travail poussé sera repris`,
      );
    }
  }

  async refresh(): Promise<void> {
    const [issues, prs] = await Promise.all([this.github.issues(), this.github.openPullRequests()]);
    this.store.live.issues = issues;
    this.store.live.prs = prs;
    this.store.live.lastTick = new Date().toISOString();
    this.store.emit("change");
    this.detectFinishedManualRuns();
  }

  // ---- Human actions ------------------------------------------------------------------

  async launch(agentId: string): Promise<void> {
    const agent = this.requireAgent(agentId);
    if (this.running.has(agentId) || this.launching.has(agentId))
      throw new Error(`L'agent ${agentId} travaille déjà`);
    this.assertQuotaAvailable(agentId);
    this.launching.add(agentId);
    this.begin(`prep:${agentId}`, `Préparation du dossier de l'agent ${agentId}`);
    try {
      await this.refresh();
      const issue = nextIssue(agent.label, this.store.live.issues, this.issuesWithOpenPr());
      if (!issue) throw new Error(`Aucune tâche prête pour l'agent ${agentId}`);
      const branch = `${agent.branchPrefix}/i${issue.number}`;
      const base = baseBranch(this.config);
      await ensureWorktree(this.repoDir, agent.worktree);
      // Resume an interrupted run instead of starting over: from its pushed branch, or from
      // its local one (agents no longer push, so that is the usual case).
      const pushed = !this.isLocal() && (await remoteBranchExists(agent.worktree, branch));
      const local = !pushed && (await localBranchExists(agent.worktree, branch));
      const resume = pushed || local;
      if (pushed) {
        await prepareWorktree(agent.worktree, { branch });
      } else if (local) {
        await checkoutLocalBranch(agent.worktree, branch);
      } else {
        await prepareWorktree(
          agent.worktree,
          { detach: this.baseRef() },
          { fetch: !this.isLocal() },
        );
        await deleteLocalBranch(agent.worktree, branch);
      }
      const issueText = await this.github.issueText(issue.number);
      await this.github.setLabels(issue.number, [STATUS_LABELS.running]);
      this.start(
        agentId,
        "task",
        issue.number,
        undefined,
        branch,
        taskPrompt({
          agentId,
          agent,
          issue: issue.number,
          branch,
          base,
          baseRef: this.baseRef(),
          resume,
          spec: issueText,
        }),
      );
    } finally {
      this.launching.delete(agentId);
      this.end(`prep:${agentId}`);
    }
  }

  async sendBack(prNumber: number, humanNote: string): Promise<void> {
    const pr = this.requirePr(prNumber);
    const agentId = this.requireAgentOf(pr);
    if (this.running.has(agentId) || this.launching.has(agentId))
      throw new Error(`L'agent ${agentId} travaille déjà`);
    this.assertQuotaAvailable(agentId);
    this.launching.add(agentId);
    this.begin(
      `prep:${agentId}`,
      `Préparation de la correction de la PR #${pr.number} (agent ${agentId})`,
    );
    try {
      await this.sendBackNow(pr, agentId, humanNote);
    } finally {
      this.launching.delete(agentId);
      this.end(`prep:${agentId}`);
    }
  }

  private async sendBackNow(pr: PullRequest, agentId: string, humanNote: string): Promise<void> {
    const agent = this.requireAgent(agentId);
    const prNumber = pr.number;
    const review = this.store.data.reviews[String(prNumber)];
    const issue = this.issueOfBranch(pr.headRefName);
    this.assertTaskBudgetAvailable(issue);
    const base = baseBranch(this.config);
    await ensureWorktree(this.repoDir, agent.worktree);
    await prepareWorktree(
      agent.worktree,
      this.isLocal() ? { local: pr.headRefName } : { branch: pr.headRefName },
      { fetch: !this.isLocal() },
    );
    // The base branch moves while a PR waits: bring it in first. A clean merge costs no agent
    // run at all; only real conflicts are handed to the agent.
    const sync =
      base === productionBranch(this.config)
        ? "up-to-date"
        : await syncWithBase(agent.worktree, this.baseRef(), !this.isLocal());
    const reasons = review?.reasons ?? [];
    const conflictOnly = reasons.length > 0 && reasons.every((r) => r.startsWith(CONFLICT_REASON));
    if (sync !== "conflict" && conflictOnly) {
      this.store.log("info", `PR #${prNumber} : ${base} fusionné sans conflit, nouvelle relecture`);
      await this.github.setLabels(prNumber, [], this.labelsOn(pr));
      await this.refresh();
      await this.review(prNumber, this.config.defaultReviewer);
      return;
    }
    const errors = [
      ...reasons.map((msg) => ({ src: "review", msg })),
      ...(review?.reviewerComments ?? []).map((msg) => ({ src: "reviewer", msg })),
      ...(review?.validationLog ? [{ src: "checks", msg: review.validationLog }] : []),
      ...(sync === "conflict"
        ? [
            {
              src: "merge",
              msg: `${CONFLICT_REASON} ${base} : marqueurs de conflit dans les fichiers`,
            },
          ]
        : []),
      ...(humanNote.trim() ? [{ src: "human", msg: humanNote.trim() }] : []),
    ];
    if (errors.length === 0) {
      errors.push({ src: "review", msg: "Relire la PR et corriger les défauts signalés." });
    }
    await this.github.setLabels(prNumber, [STATUS_LABELS.running], this.labelsOn(pr));
    this.start(
      agentId,
      "fix",
      issue ?? 0,
      prNumber,
      pr.headRefName,
      fixPrompt({
        agentId,
        agent,
        issue: issue ?? 0,
        pr: prNumber,
        branch: pr.headRefName,
        base,
        baseRef: this.baseRef(),
        errors,
      }),
      await headSha(agent.worktree),
    );
  }

  // Manual runs: the human says the IDE agent is done (useful when it stopped without a PR).
  async markDone(agentId: string): Promise<void> {
    const current = this.running.get(agentId);
    if (!current?.run.manual)
      throw new Error(`L'agent ${agentId} n'a pas de tâche manuelle en cours`);
    await this.refresh();
    const still = this.running.get(agentId);
    if (still) {
      this.running.delete(agentId);
      await this.finish(still.run, 0);
    }
  }

  // Called from the dashboard: errors that can be known up front go back to the click,
  // the review itself then runs in the background.
  startReview(prNumber: number, reviewerId: string): void {
    this.requirePr(prNumber);
    if (!this.config.reviewers[reviewerId]) throw new Error(`Relecteur inconnu : ${reviewerId}`);
    this.review(prNumber, reviewerId).catch((error: Error) =>
      this.store.log("error", `Relecture PR #${prNumber} : ${error.message}`),
    );
  }

  // One review at a time (they share the review worktree): the others wait their turn.
  // Dropping them made a fixed PR keep its old « à corriger » verdict.
  async review(prNumber: number, reviewerId: string): Promise<void> {
    if (this.reviewing !== undefined) {
      const queued = this.reviewQueue.some((q) => q.pr === prNumber);
      if (this.reviewing !== prNumber && !queued) {
        this.reviewQueue.push({ pr: prNumber, reviewer: reviewerId });
        this.store.log("info", `Relecture de la PR #${prNumber} mise en file`);
      }
      return;
    }
    const pr = this.requirePr(prNumber);
    if (this.isReleasePr(pr))
      throw new Error("La PR de publication n'est pas relue : elle regroupe des PR déjà relues");
    // PRs opened outside an agent branch (orchestrator, human) are reviewed without a perimeter.
    const agentId = agentOfBranch(this.config, pr.headRefName);
    const previous = this.store.data.reviews[String(prNumber)];
    const fixRounds = previous?.fixRounds ?? 0;
    this.reviewing = prNumber;
    this.store.setActivity(`Relecture de la PR #${prNumber}`);
    this.begin("review", `Relecture de la PR #${prNumber} par le relecteur`);
    try {
      await ensureWorktree(this.repoDir, this.config.reviewWorktree);
      await this.github.setLabels(prNumber, [STATUS_LABELS.review], this.labelsOn(pr));
      const issue = this.issueOfBranch(pr.headRefName);
      if (this.taskBudgetExceeded(issue)) {
        const cost = this.taskCostUsd(issue);
        const reason = `Budget tâche dépassé (${cost.toFixed(2)} $ / ${this.taskBudget(issue).toFixed(2)} $)`;
        await this.github.comment(
          prNumber,
          `### Relecture automatique : attention humaine requise\n\n- ${reason}`,
        );
        await this.github.setLabels(prNumber, [STATUS_LABELS.human], [STATUS_LABELS.review]);
        this.store.data.reviews[String(prNumber)] = {
          pr: prNumber,
          issue,
          outcome: "human",
          reviewer: "budget",
          reasons: [reason],
          reviewerComments: [],
          at: new Date().toISOString(),
          fixRounds,
        };
        this.store.log("warn", `PR #${prNumber} non relue : ${reason}`);
        return;
      }
      const files = await this.github.pullRequestFiles(prNumber);
      const rawDiff = await this.github.pullRequestDiff(prNumber);

      // Dynamically pick the best reviewer if this is a default review.
      let effectiveReviewerId = reviewerId;
      if (reviewerId === this.config.defaultReviewer) {
        const diffLines = (rawDiff.match(/\n/g) ?? []).length;
        effectiveReviewerId = pickReviewerId({
          files,
          diffLines,
          contractPaths: this.config.contractPaths,
          fixRounds,
        });
      }

      const result = await reviewPullRequest({
        config: this.config,
        agentId,
        reviewerId: effectiveReviewerId,
        pr,
        headRef: this.headRef(pr.headRefName),
        baseRef: this.baseRef(),
        fetch: !this.isLocal(),
        validated:
          this.store.data.validated?.[pr.headRefName]?.sha === pr.headRefOid
            ? { log: this.store.data.validated[pr.headRefName]?.log ?? "" }
            : undefined,
        files,
        issue,
        diff: filterDiff(rawDiff),
        issueText: issue === undefined ? undefined : await this.github.issueText(issue),
        fixRoundsDone: fixRounds,
        logsDir: this.store.logsDir,
        onLine: (l) => this.store.pushLine("review", l),
      });
      const label = {
        ready: STATUS_LABELS.ready,
        human: STATUS_LABELS.human,
        changes: STATUS_LABELS.changes,
      }[result.outcome];
      await this.github.comment(prNumber, reviewComment(effectiveReviewerId, result));
      await this.github.setLabels(prNumber, [label], [STATUS_LABELS.review]);
      this.store.data.reviews[String(prNumber)] = {
        pr: prNumber,
        issue,
        outcome: result.outcome,
        reviewer: effectiveReviewerId,
        reasons: result.reasons,
        reviewerComments: result.reviewerComments,
        validationLog: result.outcome === "ready" ? undefined : result.validationLog.slice(-1800),
        at: new Date().toISOString(),
        fixRounds,
        m: result.m,
      };
      this.refreshCumulCost(issue);
      this.reviewAttempts.delete(prNumber);
      this.store.log(
        "info",
        `PR #${prNumber} relue par ${effectiveReviewerId} : ${result.outcome}`,
      );
    } catch (error) {
      this.store.log("error", `Relecture PR #${prNumber} : ${(error as Error).message}`);
      const broken = /BASE_BROKEN:([\s\S]*)/.exec((error as Error).message);
      if (broken?.[1]) {
        // Not the PR's fault: pause everything with the evidence, and let the review be redone.
        const reason = `${baseBranch(this.config)} échoue déjà aux vérifications, aucun agent ne peut le corriger : ${broken[1].replace(/\s+/g, " ").trim().slice(0, 300)}`;
        this.store.data.autopilot = { enabled: true, pausedReason: reason };
        this.store.log("error", `Autopilote arrêté : ${reason}`);
        await this.github.setLabels(prNumber, [], [STATUS_LABELS.review]).catch(() => undefined);
        return;
      }
      const quota = /QUOTA_REVIEW:(\d+)/.exec((error as Error).message);
      if (quota?.[1]) {
        // No verdict was given: wait for the reset instead of sending everything to the human.
        (this.store.data.quotaUntil ??= {})["review"] = new Date(
          Date.now() + Number(quota[1]),
        ).toISOString();
        await this.github.setLabels(prNumber, [], [STATUS_LABELS.review]).catch(() => undefined);
      } else {
        await this.giveUpOrRetryReview(prNumber, pr).catch(() => undefined);
      }
    } finally {
      this.reviewing = undefined;
      this.store.setActivity(undefined);
      this.end("review");
      await this.refresh().catch(() => undefined);
      this.startNextQueuedReview();
      void this.autopilotTick();
    }
  }

  // A failed review leaves the PR without verdict: the autopilot retries it, three times at most,
  // then hands it to the human instead of looping.
  private async giveUpOrRetryReview(prNumber: number, pr: PullRequest): Promise<void> {
    const attempts = (this.reviewAttempts.get(prNumber) ?? 0) + 1;
    this.reviewAttempts.set(prNumber, attempts);
    if (attempts >= MAX_REVIEW_ATTEMPTS) {
      await this.github.setLabels(
        prNumber,
        [STATUS_LABELS.human],
        [...this.labelsOn(pr), STATUS_LABELS.review],
      );
      this.store.log("warn", `PR #${prNumber} : ${attempts} relectures en échec, attente humaine`);
    } else {
      await this.github.setLabels(prNumber, [], [STATUS_LABELS.review]);
    }
  }

  // « Closes #N » closes an issue only when the PR reaches the default branch: close it here
  // once the human has merged into the base branch.
  private async afterMerge(pr: PullRequest, issue: number | undefined): Promise<void> {
    if (pr.baseRefName !== productionBranch(this.config) && issue !== undefined) {
      await this.github
        .closeIssue(issue, `Livrée par la PR #${pr.number}, mergée dans ${pr.baseRefName}.`)
        .catch((e: Error) => this.store.log("warn", `Fermeture de #${issue} : ${e.message}`));
    }
    // A stale remote branch would be « resumed » by mistake if the issue is ever reopened.
    await this.github
      .deleteBranch(pr.headRefName)
      .catch((e: Error) =>
        this.store.log("warn", `Suppression de ${pr.headRefName} : ${e.message}`),
      );
  }

  private startNextQueuedReview(): void {
    const next = this.reviewQueue.shift();
    if (!next) return;
    if (!this.store.live.prs.some((p) => p.number === next.pr)) {
      this.startNextQueuedReview(); // merged or closed meanwhile
      return;
    }
    this.review(next.pr, next.reviewer).catch((error: Error) =>
      this.store.log("error", `Relecture PR #${next.pr} : ${error.message}`),
    );
  }

  async merge(prNumber: number): Promise<void> {
    this.begin("merge", `Fusion de la PR #${prNumber}`);
    try {
      await this.mergeNow(prNumber);
    } finally {
      this.end("merge");
    }
  }

  private async mergeNow(prNumber: number): Promise<void> {
    if (this.isLocal() && this.release.pr === prNumber) {
      await this.github.mergeRelease(prNumber);
      this.store.log("info", `Publication #${prNumber} mergée par l'humain`);
      // The card goes away now, not at the next check: a second click would do nothing.
      this.release = { ahead: 0 };
      this.lastReleaseCheck = 0;
      this.store.emit("change");
      return;
    }
    const pr = this.requirePr(prNumber);
    if (this.isReleasePr(pr)) {
      await this.github.mergeRelease(prNumber);
    } else {
      try {
        await this.github.mergeIntoBase(prNumber);
      } catch (error) {
        // A conflict is not an error of the orchestrator: the PR goes back to its agent.
        if (/conflict/i.test((error as Error).message)) {
          await this.markConflict(pr);
          await this.refresh();
          throw new Error(
            `Conflit avec ${baseBranch(this.config)} : la PR #${prNumber} est renvoyée à son agent`,
            { cause: error },
          );
        }
        throw error;
      }
      await this.afterMerge(pr, this.issueOfBranch(pr.headRefName));
      // Another PR of the queue may now conflict with what was just merged: know it right away.
      await this.markConflicts();
    }
    this.store.log("info", `PR #${prNumber} mergée par l'humain (${pr.title})`);
    await this.refresh();
  }

  private async markConflict(pr: PullRequest): Promise<void> {
    const base = baseBranch(this.config);
    const review = this.store.data.reviews[String(pr.number)];
    const reasons = [`${CONFLICT_REASON} ${base}`];
    if (review) {
      review.outcome = "changes";
      review.reasons = reasons;
      review.reviewerComments = [];
      review.validationLog = undefined;
    } else {
      this.store.data.reviews[String(pr.number)] = {
        pr: pr.number,
        issue: this.issueOfBranch(pr.headRefName),
        outcome: "changes",
        reviewer: "orchestrateur",
        reasons,
        reviewerComments: [],
        at: new Date().toISOString(),
        fixRounds: 0,
      };
    }
    await this.github.setLabels(pr.number, [STATUS_LABELS.changes], this.labelsOn(pr));
    this.store.log("warn", `PR #${pr.number} en conflit avec ${base} : renvoyée à son agent`);
  }

  // Ready PRs are re-checked whenever the base branch moves: a conflict found now costs nothing,
  // found at the human's click it costs a round trip.
  private async markConflicts(): Promise<void> {
    const check = this.github.wouldConflict;
    if (!check) return;
    for (const pr of this.store.live.prs) {
      if (!pr.labels.includes(STATUS_LABELS.ready)) continue;
      if (await check.call(this.github, pr.number)) await this.markConflict(pr);
    }
  }

  // Local PRs have no web page: the dashboard's « voir le diff » opens this text.
  async diffOf(prNumber: number): Promise<string> {
    return this.github.pullRequestDiff(prNumber);
  }

  async importTasks(): Promise<number> {
    if (!(this.github instanceof LocalForge)) throw new Error("Import inutile : mode GitHub");
    const added = await this.github.importIssues();
    this.store.log("info", `${added} tâche(s) importée(s) depuis GitHub`);
    await this.refresh();
    return added;
  }

  // ---- Agents created from the dashboard ---------------------------------------------------

  async createAgent(spec: AgentSpec, assign: number[] = []): Promise<string> {
    const built = buildAgent(spec, {
      existing: this.config.agents,
      clis: this.config.clis,
      repoDir: this.repoDir,
      briefExists: (path) => existsSync(join(this.repoDir, path)),
      models: this.models.get(spec.cli)?.map((m) => m.id),
    });
    if ("errors" in built) throw new Error(built.errors.join(" · "));
    this.config.agents[built.id] = built.agent;
    (this.store.data.customAgents ??= {})[built.id] = built.agent;
    await this.github.ensureLabel?.(built.agent.label);
    this.store.log("info", `Agent ${built.id} créé (${built.agent.name}, ${built.agent.model})`);
    this.store.save();
    if (assign.length > 0) await this.assignTasks(assign, built.id);
    else await this.refresh();
    return built.id;
  }

  // Gives tasks to an agent: it becomes their only agent (the other agent labels are removed).
  async assignTasks(numbers: number[], agentId: string): Promise<void> {
    const agent = this.requireAgent(agentId);
    const agentLabels = Object.values(this.config.agents).map((a) => a.label);
    for (const n of numbers) {
      const issue = this.store.live.issues.find((i) => i.number === n);
      if (!issue || issue.state !== "OPEN") throw new Error(`Tâche #${n} introuvable ou terminée`);
      if (issue.labels.includes(STATUS_LABELS.running))
        throw new Error(`Tâche #${n} en cours : attends la fin du run`);
      const old = issue.labels.filter((l) => agentLabels.includes(l) && l !== agent.label);
      await this.github.setLabels(n, [agent.label], old);
    }
    this.store.log("info", `${numbers.length} tâche(s) assignée(s) à l'agent ${agentId}`);
    await this.refresh();
  }

  // Which open tasks fit an agent that may write to these paths? Used by « Create an agent »
  // when the human does not know what to give it: best fits first, ready ones before waiting ones.
  suggestTasks(allowedPaths: string[]): unknown[] {
    const withPr = this.issuesWithOpenPr();
    const agentLabels = new Map(Object.entries(this.config.agents).map(([id, a]) => [a.label, id]));
    const open = new Set(
      this.store.live.issues.filter((i) => i.state === "OPEN").map((i) => i.number),
    );
    const order = { inside: 0, partial: 1, unknown: 2, outside: 3 } as const;
    return this.store.live.issues
      .filter(
        (i) =>
          i.state === "OPEN" &&
          !withPr.has(i.number) &&
          !i.labels.includes(STATUS_LABELS.running) &&
          !i.labels.includes(STATUS_LABELS.humanTask),
      )
      .map((i) => {
        const owner = i.labels.map((l) => agentLabels.get(l)).find(Boolean);
        const waitingFor = parseDependencies(i.body).filter((n) => open.has(n));
        return {
          number: i.number,
          title: i.title,
          fit: taskFit(taskPaths(i.body), allowedPaths),
          paths: taskPaths(i.body),
          agent: owner,
          ready: waitingFor.length === 0,
          waitingFor,
        };
      })
      .sort(
        (a, b) =>
          order[a.fit] - order[b.fit] || Number(b.ready) - Number(a.ready) || a.number - b.number,
      );
  }

  async deleteAgent(id: string): Promise<void> {
    const agent = this.requireAgent(id);
    if (!agent.created)
      throw new Error(
        "Seuls les agents créés depuis le dashboard se suppriment (les autres : config.json)",
      );
    if (this.running.has(id) || this.launching.has(id))
      throw new Error(`L'agent ${id} travaille : arrête-le d'abord`);
    const { [id]: _removed, ...remaining } = this.config.agents;
    void _removed;
    this.config.agents = remaining;
    const { [id]: _custom, ...custom } = this.store.data.customAgents ?? {};
    void _custom;
    this.store.data.customAgents = custom;
    this.store.log("warn", `Agent ${id} supprimé : ses tâches restent à réassigner`);
    this.store.save();
    await this.refresh();
  }

  async loadModels(): Promise<void> {
    for (const [id, settings] of Object.entries(this.config.clis)) {
      const adapter = adapterFor(settings.adapter);
      let list = (settings.models ?? []).map((m) => ({ id: m.id, label: m.label ?? m.id }));
      try {
        if (adapter.listModels) list = await adapter.listModels(settings);
      } catch (error) {
        this.store.log(
          "warn",
          `Modèles de ${id} : ${(error as Error).message} (liste déclarée utilisée)`,
        );
      }
      this.models.set(id, list);
    }
    this.store.emit("change");
  }

  private listBriefs(): string[] {
    try {
      return readdirSync(join(this.repoDir, "docs", "agents"))
        .filter((f) => f.endsWith(".md"))
        .map((f) => `docs/agents/${f}`);
    } catch {
      return [];
    }
  }

  setAutopilot(enabled: boolean): void {
    this.store.data.autopilot = enabled
      ? { enabled: true, resumedAt: new Date().toISOString() }
      : { enabled: false };
    this.store.log("info", enabled ? "Autopilote activé" : "Autopilote désactivé par l'humain");
    this.store.save();
    if (enabled) void this.autopilotTick();
  }

  // ---- Autopilot ------------------------------------------------------------------------------
  // Everything the human used to click except merging: reviews, corrections, the next launch,
  // and keeping the « publish » PR up to date. Merging stays a human click. Guard rails stop it
  // (never silently): failures in a row, daily budget, per-task budget, correction rounds, quota.

  async autopilotTick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.closeDeliveredIssues();
      await this.retargetPullRequests();
      await this.maintainRelease();
      const ap = autopilotSettings(this.config);
      const state = this.store.data.autopilot;
      if (state?.enabled === false || state?.pausedReason) return;
      const reason = this.circuitReason(ap);
      if (reason) {
        this.store.data.autopilot = { enabled: true, pausedReason: reason };
        this.store.log("error", `Autopilote arrêté : ${reason}`);
        this.store.save();
        return;
      }
      await this.markConflicts();
      const agentPrs = this.store.live.prs.filter((p) => agentOfBranch(this.config, p.headRefName));

      const reviewPaused = activeQuota(this.store.data.quotaUntil?.["review"]);
      for (const pr of reviewPaused ? [] : agentPrs.filter((p) => needsReview(p.labels))) {
        this.review(pr.number, this.config.defaultReviewer).catch((e: Error) =>
          this.store.log("error", `Relecture PR #${pr.number} : ${e.message}`),
        );
      }

      if (ap.autoFix) {
        for (const pr of agentPrs.filter((p) => p.labels.includes(STATUS_LABELS.changes))) {
          const agentId = agentOfBranch(this.config, pr.headRefName);
          if (!agentId || this.running.has(agentId) || this.launching.has(agentId)) continue;
          const rounds = this.store.data.reviews[String(pr.number)]?.fixRounds ?? 0;
          if (rounds >= MAX_AUTO_FIX_ROUNDS) {
            await this.github.setLabels(pr.number, [STATUS_LABELS.human], [STATUS_LABELS.changes]);
            this.store.log("warn", `PR #${pr.number} : ${rounds} corrections, attente humaine`);
            continue;
          }
          await this.sendBack(pr.number, "").catch((e: Error) =>
            this.autoError(`fix${pr.number}`, e.message, () =>
              this.github.setLabels(pr.number, [STATUS_LABELS.human], [STATUS_LABELS.changes]),
            ),
          );
        }
      }

      if (ap.launchAgents) {
        for (const [agentId, agent] of Object.entries(this.config.agents)) {
          if (this.running.has(agentId) || this.launching.has(agentId)) continue;
          if (!nextIssue(agent.label, this.store.live.issues, this.issuesWithOpenPr())) continue;
          await this.launch(agentId).catch((e: Error) =>
            this.autoError(`launch${agentId}`, e.message),
          );
        }
      }
    } catch (error) {
      this.store.log("error", `Autopilote : ${(error as Error).message}`);
    } finally {
      this.ticking = false;
    }
  }

  // Quota waits and busy agents are normal; anything else is logged once, not every minute.
  private autoError(key: string, message: string, onBudget?: () => Promise<void>): void {
    if (/Quota de l'agent|travaille déjà|Aucune tâche prête/.test(message)) return;
    if (/Budget tâche dépassé/.test(message) && onBudget) {
      void onBudget().catch(() => undefined);
      this.store.log("warn", message);
      return;
    }
    if (this.loggedOnce.has(`${key}:${message}`)) return;
    this.loggedOnce.add(`${key}:${message}`);
    this.store.log("error", `Autopilote (${key}) : ${message}`);
  }

  private circuitReason(ap: ReturnType<typeof autopilotSettings>): string | undefined {
    const since = Date.parse(this.store.data.autopilot?.resumedAt ?? "") || 0;
    const ended = this.store.data.runs.filter((r) => r.endedAt && Date.parse(r.startedAt) > since);
    const streak = failureStreak(ended.map((r) => r.result));
    if (streak >= ap.failureLimit) {
      return `${streak} runs de suite sans PR : quelque chose bloque, regarde le Journal`;
    }
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const from = Math.max(since, midnight.getTime());
    const cost =
      this.store.data.runs
        .filter((r) => Date.parse(r.startedAt) >= from)
        .reduce((sum, r) => sum + (r.m?.totalCostUsd ?? 0), 0) +
      Object.values(this.store.data.reviews)
        .filter((r) => Date.parse(r.at) >= from)
        .reduce((sum, r) => sum + (r.m?.totalCostUsd ?? 0), 0);
    if (cost >= ap.dailyBudgetUsd) {
      return `Budget du jour atteint (${cost.toFixed(2)} $ sur ${ap.dailyBudgetUsd} $)`;
    }
    return undefined;
  }

  // An issue whose branch was merged is delivered, whoever merged it and into which branch
  // (« Closes #N » does not close it when the PR targets the base branch). Left open, the
  // autopilot would offer it again and an agent would spend tokens redoing finished work.
  private async closeDeliveredIssues(): Promise<void> {
    if (Date.now() - this.lastDeliveredCheck < RELEASE_CHECK_MS) return;
    this.lastDeliveredCheck = Date.now();
    const merged = new Set(
      (await this.github.mergedBranches())
        .map((b) => this.issueOfBranch(b))
        .filter((n): n is number => n !== undefined),
    );
    const withOpenPr = this.issuesWithOpenPr();
    for (const issue of this.store.live.issues) {
      if (issue.state !== "OPEN" || !merged.has(issue.number) || withOpenPr.has(issue.number))
        continue;
      if (issue.labels.includes(STATUS_LABELS.running)) continue;
      await this.github
        .closeIssue(issue.number, "Livrée : sa PR est mergée.")
        .then(() => this.store.log("info", `Issue #${issue.number} fermée (PR mergée)`))
        .catch((e: Error) => this.autoError(`close${issue.number}`, e.message));
    }
    await this.refresh();
  }

  // Agent PRs opened against production (old ones, or an agent that ignored --base) are moved
  // to the base branch so that they follow the same flow.
  private async retargetPullRequests(): Promise<void> {
    const base = baseBranch(this.config);
    if (this.isLocal() || base === productionBranch(this.config)) return;
    for (const pr of this.store.live.prs) {
      if (!agentOfBranch(this.config, pr.headRefName) || pr.baseRefName === base) continue;
      await this.github
        .setBase(pr.number, base)
        .then(() => this.store.log("info", `PR #${pr.number} redirigée vers ${base}`))
        .catch((e: Error) => this.autoError(`base${pr.number}`, e.message));
    }
  }

  // Keeps the base branch in step with production (hotfixes) and keeps one « publish » PR
  // open while the base branch is ahead. The human merges that one, with a merge commit.
  private async maintainRelease(): Promise<void> {
    const base = baseBranch(this.config);
    const prod = productionBranch(this.config);
    if (base === prod) return;
    if (this.github instanceof LocalForge) return this.maintainReleaseLocal(this.github);
    if (this.reviewing !== undefined) return;
    if (Date.now() - this.lastReleaseCheck < RELEASE_CHECK_MS) return;
    this.lastReleaseCheck = Date.now();
    this.reviewing = 0; // the review worktree is used here: reviews wait
    try {
      const dir = this.config.reviewWorktree;
      await ensureWorktree(this.repoDir, dir);
      await fetchOrigin(dir);
      if ((await aheadCount(dir, `origin/${base}`, `origin/${prod}`)) > 0) {
        const merged = await fastForwardInto(dir, base, prod);
        if (!merged) {
          const error = `${base} et ${prod} sont en conflit : à résoudre à la main`;
          this.release = { ahead: this.release.ahead, error };
          this.autoError("release-sync", error);
          return;
        }
        this.store.log("info", `${prod} fusionné dans ${base}`);
      }
      const ahead = await aheadCount(dir, `origin/${prod}`, `origin/${base}`);
      let pr = this.store.live.prs.find((p) => p.headRefName === base && p.baseRefName === prod);
      if (ahead > 0 && !pr) {
        await this.github.createPullRequest(
          prod,
          base,
          `Publier ${base} → ${prod}`,
          `Regroupe les PR mergées dans \`${base}\` (${ahead} commits).\n\n` +
            `Merger avec **Create a merge commit** (pas « squash »), pour que \`${base}\` reste à jour.`,
        );
        await this.refresh();
        pr = this.store.live.prs.find((p) => p.headRefName === base && p.baseRefName === prod);
      }
      this.release = { ahead, pr: pr?.number };
    } catch (error) {
      this.autoError("release", (error as Error).message);
    } finally {
      this.reviewing = undefined;
      this.startNextQueuedReview();
    }
  }

  // Local mode: production comes in, the base branch is pushed once when it is ahead, and the
  // publish PR is opened on GitHub. Nothing else in the loop touches the network.
  private async maintainReleaseLocal(local: LocalForge): Promise<void> {
    const base = baseBranch(this.config);
    const prod = productionBranch(this.config);
    if (Date.now() - this.lastReleaseCheck < RELEASE_CHECK_MS) return;
    this.lastReleaseCheck = Date.now();
    this.begin("release", `Synchronisation avec GitHub (${base} ↔ ${prod})`);
    try {
      const result = await local.publishBase();
      if (result.conflict) {
        const error = `${base} et ${prod} sont en conflit : à résoudre à la main`;
        this.release = { ahead: this.release.ahead, error };
        this.autoError("release-sync", error);
        return;
      }
      let pr = await local.releasePullRequest();
      if (result.ahead > 0 && !pr) {
        await local.createPullRequest(
          prod,
          base,
          `Publier ${base} → ${prod}`,
          `Regroupe le travail mergé dans \`${base}\` (${result.ahead} commits).\n\n` +
            `Merger avec **Create a merge commit** (pas « squash »), pour que \`${base}\` reste à jour.`,
        );
        pr = await local.releasePullRequest();
      }
      if (result.pushed)
        this.store.log("info", `${base} poussé sur GitHub (${result.ahead} commits d'avance)`);
      this.release = { ahead: result.ahead, pr };
    } catch (error) {
      this.autoError("release", (error as Error).message);
    } finally {
      this.end("release");
    }
  }

  private isReleasePr(pr: PullRequest): boolean {
    const base = baseBranch(this.config);
    return (
      base !== productionBranch(this.config) &&
      pr.headRefName === base &&
      pr.baseRefName === productionBranch(this.config)
    );
  }

  async stop(agentId: string): Promise<void> {
    const current = this.running.get(agentId);
    if (!current) throw new Error(`L'agent ${agentId} ne travaille pas`);
    if (current.handle) {
      current.handle.stop();
      this.store.log("warn", `Agent ${agentId} arrêté par l'humain`);
      return;
    }
    // Manual run: nothing to kill, just release the task.
    const { run } = current;
    this.running.delete(agentId);
    run.endedAt = new Date().toISOString();
    run.result = "annulé";
    await this.github.setLabels(run.pr ?? run.issue, [], [STATUS_LABELS.running]);
    this.store.log("warn", `Tâche manuelle de l'agent ${agentId} annulée par l'humain`);
    await this.refresh();
  }

  async unblock(issueNumber: number): Promise<void> {
    await this.github.setLabels(issueNumber, [], [STATUS_LABELS.blocked]);
    await this.refresh();
  }

  // ---- Internals ------------------------------------------------------------------------

  private start(
    agentId: string,
    kind: RunKind,
    issue: number,
    pr: number | undefined,
    branch: string,
    prompt: string,
    startSha?: string,
    localRound = 0,
  ): void {
    const agent = this.requireAgent(agentId);
    const settings = this.config.clis[agent.cli];
    if (!settings) throw new Error(`CLI inconnue : ${agent.cli}`);
    const adapter = adapterFor(settings.adapter);
    const id = `${agentId}-${Date.now()}`;
    const run: RunRecord = {
      id,
      agent: agentId,
      kind,
      issue,
      pr,
      branch,
      startedAt: new Date().toISOString(),
      logFile: join(this.store.logsDir, `${id}.log`),
      localRound,
    };
    run.startSha = startSha;
    this.store.live.liveLines[agentId] = [];
    this.steps.set(agentId, 0);
    this.work.delete(agentId);

    if (adapter.mode === "manual") {
      Object.assign(run, { manual: true, prompt, worktree: agent.worktree, startSha });
      this.running.set(agentId, { run });
      this.store.data.runs.push(run);
      this.store.pushLine(
        agentId,
        `En attente : ouvre ${agent.worktree} dans ${settings.command}, colle le prompt, lance l'agent.`,
      );
      this.store.log(
        "info",
        `Tâche préparée pour l'agent ${agentId} (${kind}, #${pr ?? issue}) : prompt à coller dans ${settings.command}`,
      );
      return;
    }

    const handle = startResumableRun({
      adapter,
      settings,
      model: agent.model,
      role: "agent",
      prompt,
      cwd: agent.worktree,
      logFile: run.logFile,
      timeoutMs: this.config.runTimeoutMinutes * 60_000,
      onLine: (line) => {
        this.steps.set(agentId, (this.steps.get(agentId) ?? 0) + 1);
        this.store.pushLine(agentId, line);
      },
      effort: agent.effort ?? "medium",
      budgetUsd: agent.budgetUsd ?? this.taskBudget(),
    });
    this.running.set(agentId, { run, handle });
    this.store.data.runs.push(run);
    this.store.log(
      "info",
      `Agent ${agentId} lancé (${kind}) sur #${pr ?? issue}, branche ${branch}`,
    );
    void handle.done.then(({ code, stdout }) => this.finish(run, code, stdout));
  }

  private async finish(run: RunRecord, code: number, stdout = ""): Promise<void> {
    // The agent stays busy until its work is checked (and a correction, if any, has started):
    // otherwise the autopilot hands it another task in the same folder while it is validated.
    this.launching.add(run.agent);
    this.running.delete(run.agent);
    this.begin(
      `check:${run.agent}`,
      `Vérification du travail de l'agent ${run.agent} (#${run.issue}) : typecheck, lint, tests`,
    );
    run.endedAt = new Date().toISOString();
    run.exitCode = code;
    try {
      const agent = this.requireAgent(run.agent);
      const settings = this.config.clis[agent.cli];
      const adapter = adapterFor(settings?.adapter ?? "");
      run.m = adapter.usage(stdout);
      const parsedFinal = validateAgentFinalMessage(parseJsonObject(adapter.finalText(stdout)));
      if (parsedFinal.valid) {
        run.final = parsedFinal.message;
      } else if (stdout.trim()) {
        this.store.log("warn", `Agent ${run.agent} sans JSON final lisible : ${parsedFinal.error}`);
      }

      const tail = logTail(run.logFile);
      const quotaDelay = quotaResetDelayMs(tail);
      if (quotaDelay !== undefined) {
        run.final ??= { v: 1, s: "blocked", e: ["QUOTA"] };
        await this.pauseForQuota(run, quotaDelay);
        return;
      }
      const providerError = runErrorCode(code, tail);
      if (providerError) {
        run.final ??= { v: 1, s: "blocked", e: [providerError] };
      }
      if (!run.manual) {
        await this.finishLocal(run, code, adapter.finalText(stdout));
        return;
      }
      const pr = await this.github.findPullRequest(run.branch);
      if (run.kind === "task") await this.github.setLabels(run.issue, [], [STATUS_LABELS.running]);
      if (!pr) {
        run.result = run.final?.e?.length ? `aucune PR (${run.final.e.join(", ")})` : "aucune PR";
        if (run.kind === "task") await this.github.setLabels(run.issue, [STATUS_LABELS.blocked]);
        this.store.log(
          "warn",
          `Agent ${run.agent} terminé (code ${code}) sans PR pour #${run.issue}`,
        );
        this.refreshCumulCost(run.issue);
        return;
      }
      run.result = `PR #${pr.number}`;
      if (run.kind === "fix") {
        const review = this.store.data.reviews[String(pr.number)];
        if (review) review.fixRounds += 1;
        await this.github.setLabels(pr.number, [], [STATUS_LABELS.running]);
      }
      this.refreshCumulCost(run.issue);
      this.store.log("info", `Agent ${run.agent} terminé : PR #${pr.number}`);
      await this.refresh();
      // Read-only review starts on its own: it only validates and comments.
      await this.review(pr.number, this.config.defaultReviewer);
    } catch (error) {
      this.store.log("error", `Fin de l'agent ${run.agent} : ${(error as Error).message}`);
    } finally {
      this.launching.delete(run.agent);
      this.end(`check:${run.agent}`);
      this.store.save();
    }
  }

  // Agents deliver locally: the orchestrator re-runs the checks on their commits and only then
  // pushes and opens the PR. A failing check is fixed in the same folder, before GitHub is
  // involved, so a failure never costs a PR round trip.
  private async finishLocal(
    run: RunRecord,
    code: number,
    answer: string | undefined,
  ): Promise<void> {
    const agent = this.requireAgent(run.agent);
    const base = baseBranch(this.config);
    const dir = agent.worktree;
    const isFix = run.kind === "fix";
    // A correction is judged on what it added to the branch, a task on what it added to base.
    const ahead = await commitsAhead(
      dir,
      isFix ? (run.startSha ?? this.headRef(run.branch)) : this.baseRef(),
    );
    if (ahead === 0) {
      await this.giveUp(
        run,
        isFix ? "aucun changement" : "aucune PR",
        answer ?? "L'agent n'a rien produit.",
      );
      this.store.log(
        "warn",
        `Agent ${run.agent} terminé (code ${code}) sans commit pour #${run.issue}`,
      );
      return;
    }
    const files = await changedFiles(dir, this.baseRef());
    const perimeter = decideReview({
      files,
      allowedPaths: agent.allowedPaths,
      contractPaths: this.config.contractPaths,
      validationsPassed: true,
      reviewerApproved: true,
      fixRoundsDone: 0,
      maxFixRounds: 99,
    });
    const problems: { src: string; msg: string }[] =
      perimeter.outcome === "changes"
        ? perimeter.reasons.map((msg) => ({ src: "perimetre", msg }))
        : [];
    const validations = await runValidations(dir);
    if (!validations.ok) problems.push({ src: "checks", msg: validations.log.slice(-1800) });

    if (problems.length > 0) {
      const round = (run.localRound ?? 0) + 1;
      const hardStop = run.final?.e?.some((e) => e === "TIMEOUT" || e === "BUDGET_EXCEEDED");
      if (round <= MAX_LOCAL_FIX_ROUNDS && !hardStop && !this.taskBudgetExceeded(run.issue)) {
        this.store.log(
          "info",
          `Agent ${run.agent} : vérifications en échec sur #${run.issue}, correction locale ${round}/${MAX_LOCAL_FIX_ROUNDS}`,
        );
        this.start(
          run.agent,
          run.kind,
          run.issue,
          run.pr,
          run.branch,
          localFixPrompt({
            agentId: run.agent,
            agent,
            issue: run.issue,
            branch: run.branch,
            base,
            baseRef: this.baseRef(),
            errors: problems,
            round,
          }),
          run.startSha,
          round,
        );
        return;
      }
      await this.giveUp(
        run,
        "aucune PR (vérifications en échec)",
        problems.map((p) => `${p.src} : ${p.msg}`).join("\n"),
      );
      return;
    }

    if (!this.isLocal()) await pushBranch(dir, run.branch);
    (this.store.data.validated ??= {})[run.branch] = {
      sha: await headSha(dir),
      log: validations.log.trim(),
    };
    let pr = await this.github.findPullRequest(run.branch);
    if (!pr) {
      const title = this.store.live.issues.find((i) => i.number === run.issue)?.title ?? run.branch;
      await this.github.createPullRequest(
        base,
        run.branch,
        title,
        `Closes #${run.issue}\n\nFichiers modifiés (${files.length}) :\n${files.map((f) => `- ${f}`).join("\n")}\n\n` +
          `Vérifications de l'orchestrateur, avant envoi :\n\`\`\`\n${validations.log.trim()}\n\`\`\`\n\n` +
          `Réponse de l'agent : ${(answer ?? "").slice(0, 1500)}`,
      );
      await this.refresh();
      pr = await this.github.findPullRequest(run.branch);
    }
    if (!pr) throw new Error(`PR introuvable après l'envoi de ${run.branch}`);
    run.result = `PR #${pr.number}`;
    if (run.kind === "task") await this.github.setLabels(run.issue, [], [STATUS_LABELS.running]);
    if (isFix) {
      const review = this.store.data.reviews[String(pr.number)];
      if (review) review.fixRounds += 1;
      await this.github.setLabels(pr.number, [], [STATUS_LABELS.running]);
    }
    this.refreshCumulCost(run.issue);
    this.store.log("info", `Agent ${run.agent} terminé : PR #${pr.number} (vérifiée avant envoi)`);
    await this.refresh();
    // Checked and handed over: the agent is free again while the review (a queue) runs.
    this.launching.delete(run.agent);
    await this.review(pr.number, this.config.defaultReviewer);
  }

  // Nothing is pushed: the reason goes on the issue (or the PR) and the task waits for a human.
  private async giveUp(run: RunRecord, result: string, why: string): Promise<void> {
    run.result = run.final?.e?.length ? `${result} (${run.final.e.join(", ")})` : result;
    const text = `### L'agent ${run.agent} n'a pas pu livrer\n\n${why.slice(0, 1800)}`;
    if (run.kind === "fix" && run.pr !== undefined) {
      await this.github.comment(run.pr, text);
      await this.github.setLabels(run.pr, [STATUS_LABELS.human], [STATUS_LABELS.running]);
    } else {
      await this.github.comment(run.issue, text);
      await this.github.setLabels(run.issue, [STATUS_LABELS.blocked], [STATUS_LABELS.running]);
    }
    this.refreshCumulCost(run.issue);
  }

  // A run stopped by the LLM provider's quota is not a failed task: release it (no « bloquée »,
  // a correction goes back to « à corriger ») and refuse new runs for this agent until the reset.
  private async pauseForQuota(run: RunRecord, delayMs: number): Promise<void> {
    const until = new Date(Date.now() + delayMs).toISOString();
    (this.store.data.quotaUntil ??= {})[run.agent] = until;
    run.result = "quota épuisé";
    if (run.kind === "task") {
      await this.github.setLabels(run.issue, [], [STATUS_LABELS.running]);
    } else if (run.pr !== undefined) {
      await this.github.setLabels(run.pr, [STATUS_LABELS.changes], [STATUS_LABELS.running]);
    }
    this.store.log(
      "warn",
      `Quota épuisé pour l'agent ${run.agent} : #${run.pr ?? run.issue} libérée, relance possible vers ${clock(until)}`,
    );
  }

  private assertQuotaAvailable(agentId: string): void {
    const until = this.store.data.quotaUntil?.[agentId];
    if (until && Date.parse(until) > Date.now()) {
      throw new Error(`Quota de l'agent ${agentId} épuisé : relance possible vers ${clock(until)}`);
    }
  }

  // Spend allowed per task (runs, corrections and reviews together), from config.json.
  private taskBudget(issue?: number): number {
    const base = this.config.taskBudgetUsd ?? DEFAULT_TASK_BUDGET_USD;
    return base + (issue === undefined ? 0 : (this.store.data.budgetExtra?.[String(issue)] ?? 0));
  }

  // The human grants more money to one task from the dashboard: no file to edit, no restart.
  // The task, held back by the budget, goes back into the flow right away.
  async extendBudget(issue: number, add: number): Promise<void> {
    if (!Number.isFinite(add) || add <= 0 || add > 10)
      throw new Error("Rallonge : entre 0 et 10 $");
    const extra = (this.store.data.budgetExtra ??= {});
    extra[String(issue)] = (extra[String(issue)] ?? 0) + add;
    this.store.log(
      "info",
      `Budget de la tâche #${issue} étendu de ${add.toFixed(2)} $ (${this.taskBudget(issue).toFixed(2)} $ au total)`,
    );
    for (const pr of this.store.live.prs.filter(
      (p) => this.issueOfBranch(p.headRefName) === issue,
    )) {
      const review = this.store.data.reviews[String(pr.number)];
      // A verdict given only because of the budget is void: the PR is reviewed again.
      if (review?.reviewer === "budget") {
        const { [String(pr.number)]: _voided, ...others } = this.store.data.reviews;
        void _voided;
        this.store.data.reviews = others;
      }
      await this.github.setLabels(pr.number, [], [STATUS_LABELS.human]);
    }
    this.store.save();
    await this.refresh();
    void this.autopilotTick();
  }

  private assertTaskBudgetAvailable(issue: number | undefined): void {
    if (!this.taskBudgetExceeded(issue)) return;
    const cost = this.taskCostUsd(issue);
    throw new Error(
      `Budget tâche dépassé (${cost.toFixed(2)} $ / ${this.taskBudget(issue).toFixed(2)} $) : étends le budget de la tâche depuis sa carte`,
    );
  }

  private taskBudgetExceeded(issue: number | undefined): boolean {
    return issue !== undefined && this.taskCostUsd(issue) >= this.taskBudget(issue);
  }

  private taskCostUsd(issue: number | undefined): number {
    if (issue === undefined) return 0;
    const runCost = this.store.data.runs
      .filter((r) => r.issue === issue)
      .reduce((sum, r) => sum + (r.m?.totalCostUsd ?? 0), 0);
    const reviewCost = Object.values(this.store.data.reviews)
      .filter((r) => r.issue === issue)
      .reduce((sum, r) => sum + (r.m?.totalCostUsd ?? 0), 0);
    return runCost + reviewCost;
  }

  private refreshCumulCost(issue: number | undefined): void {
    if (issue === undefined) return;
    const cost = this.taskCostUsd(issue);
    for (const run of this.store.data.runs) {
      if (run.issue === issue) run.cumulCostUsd = cost;
    }
  }

  private detectFinishedManualRuns(): void {
    for (const { run, handle } of [...this.running.values()]) {
      if (handle || !isManualRunDone(run, this.store.live.prs)) continue;
      // Removed before finishing so that a concurrent refresh cannot finish it twice.
      this.running.delete(run.agent);
      void this.finish(run, 0);
    }
  }

  private labelsOn(pr: PullRequest): string[] {
    return pr.labels.filter((l) => (ALL_STATUS as string[]).includes(l));
  }

  private issueOfBranch(branch: string): number | undefined {
    const match = branch.match(/\/i(\d+)$/);
    return match ? Number(match[1]) : undefined;
  }

  private issuesWithOpenPr(): Set<number> {
    const numbers = this.store.live.prs.map((p) => this.issueOfBranch(p.headRefName));
    return new Set(numbers.filter((n): n is number => n !== undefined));
  }

  private requireAgent(id: string) {
    const agent = this.config.agents[id];
    if (!agent) throw new Error(`Agent inconnu : ${id}`);
    return agent;
  }

  private requirePr(number: number): PullRequest {
    const pr = this.store.live.prs.find((p) => p.number === number);
    if (!pr) throw new Error(`PR #${number} introuvable ou fermée`);
    return pr;
  }

  private requireAgentOf(pr: PullRequest): string {
    const id = agentOfBranch(this.config, pr.headRefName);
    if (!id) throw new Error(`La branche ${pr.headRefName} n'appartient à aucun agent`);
    return id;
  }

  // What the orchestrator is doing, or why it is idle: the answer to « what is it up to? ».
  private statusView(): unknown {
    const { data, live } = this.store;
    const autopilot = data.autopilot;
    const waitingOnHuman = live.prs.filter(
      (p) => p.labels.includes(STATUS_LABELS.ready) || p.labels.includes(STATUS_LABELS.human),
    ).length;
    let idle: string | undefined;
    if (this.activities.size === 0 && this.running.size === 0) {
      if (autopilot?.enabled === false) idle = "Autopilote arrêté : rien ne se lance tout seul";
      else if (autopilot?.pausedReason) idle = `En pause : ${autopilot.pausedReason}`;
      else if (Object.values(data.quotaUntil ?? {}).some((u) => activeQuota(u)))
        idle = "En attente de la fin d'un quota";
      else if (waitingOnHuman > 0) idle = `Au repos : ${waitingOnHuman} PR attendent ta décision`;
      else idle = "Au repos : aucune tâche prête pour les agents";
    }
    return {
      items: [...this.activities.entries()].map(([key, a]) => ({ key, ...a })),
      agents: [...this.running.entries()].map(([id, r]) => ({
        id,
        kind: r.run.kind,
        issue: r.run.issue,
        since: r.run.startedAt,
      })),
      idle,
      nextTickAt: this.nextTickAt,
      tickSeconds: this.config.refreshSeconds,
    };
  }

  // ---- View for the dashboard -------------------------------------------------------------

  view(): unknown {
    const { live, data } = this.store;
    const agents = Object.entries(this.config.agents).map(([id, a]) => {
      const current = this.running.get(id);
      const settings = this.config.clis[a.cli];
      const adapter = adapterFor(settings?.adapter ?? "");
      return {
        id,
        name: a.name,
        cli: a.cli,
        // Manual adapters store the IDE name in `command`; process adapters store a path.
        tool: adapter.mode === "manual" ? settings?.command : (TOOL_NAMES[adapter.id] ?? a.cli),
        manual: adapter.mode === "manual",
        model: a.model,
        label: a.label,
        brief: a.brief,
        allowedPaths: a.allowedPaths,
        created: a.created === true,
        verified: adapter.verified,
        quotaUntil: activeQuota(this.store.data.quotaUntil?.[id]),
        run: current?.run,
        lines: live.liveLines[id] ?? [],
        work: current
          ? { steps: this.steps.get(id) ?? 0, ...(this.work.get(id) ?? { changed: 0, commits: 0 }) }
          : undefined,
        queue: queueFor(a.label, live.issues, this.issuesWithOpenPr()).map((q) => ({
          number: q.issue.number,
          title: q.issue.title,
          ready: q.ready,
          waitingFor: q.waitingFor,
        })),
      };
    });
    const agentLabels = new Map(Object.entries(this.config.agents).map(([id, a]) => [a.label, id]));
    return {
      repo: this.config.repo,
      mode: this.isLocal() ? "local" : "github",
      lastRefresh: live.lastTick,
      activity: live.activity,
      reviewing: this.reviewing && this.reviewing > 0 ? this.reviewing : undefined,
      // Agent issues only, without their body: enough for the progress board.
      issues: live.issues.flatMap((i) => {
        const agent = i.labels.map((l) => agentLabels.get(l)).find(Boolean);
        return agent
          ? [{ number: i.number, title: i.title, state: i.state, labels: i.labels, agent }]
          : [];
      }),
      reviewers: Object.entries(this.config.reviewers).map(([id, r]) => ({
        id,
        model: r.model,
        verified: adapterFor(this.config.clis[r.cli]?.adapter ?? "").verified,
      })),
      defaultReviewer: this.config.defaultReviewer,
      metrics: {
        totalCostUsd:
          data.runs.reduce((sum, r) => sum + (r.m?.totalCostUsd ?? 0), 0) +
          Object.values(data.reviews).reduce((sum, r) => sum + (r.m?.totalCostUsd ?? 0), 0),
        taskBudgetUsd: this.taskBudget(),
      },
      reviewLines: live.liveLines["review"] ?? [],
      agents,
      status: this.statusView(),
      briefs: this.listBriefs(),
      models: Object.fromEntries(this.models),
      clis: Object.entries(this.config.clis).map(([id, c]) => ({ id, adapter: c.adapter })),
      autopilot: {
        enabled: data.autopilot?.enabled ?? true,
        pausedReason: data.autopilot?.pausedReason,
        base: baseBranch(this.config),
        production: productionBranch(this.config),
      },
      release: this.release,
      prs: live.prs
        .filter((p) => !this.isReleasePr(p))
        .map((p) => ({
          ...p,
          agent: agentOfBranch(this.config, p.headRefName),
          issue: this.issueOfBranch(p.headRefName),
          cost: this.taskCostUsd(this.issueOfBranch(p.headRefName)),
          budget: this.taskBudget(this.issueOfBranch(p.headRefName)),
          review: data.reviews[String(p.number)],
        })),
      attention: live.issues
        .filter(
          (i) =>
            i.state === "OPEN" &&
            i.labels.some((l) => l === STATUS_LABELS.blocked || l === STATUS_LABELS.humanTask),
        )
        .map((i) => ({ number: i.number, title: i.title, labels: i.labels })),
      runs: data.runs
        .slice(-15)
        .reverse()
        .map((r) => ({ ...r, prompt: undefined })),
      events: data.events.slice(-40).reverse(),
    };
  }
}
