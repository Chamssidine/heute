// Every action that launches an agent or merges code is triggered by the human from the
// dashboard. The service only prepares, runs what was asked, and reviews read-only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adapterFor, type CliAdapter } from "./adapters/index.ts";
import { agentOfBranch, type Config } from "./config.ts";

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
        // Add a summary line instead
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
  isManualRunDone,
  nextIssue,
  queueFor,
  quotaResetDelayMs,
  STATUS_LABELS,
} from "./decisions.ts";
import type { GitHub, PullRequest } from "./github.ts";
import { fixPrompt, taskPrompt } from "./prompts.ts";
import { reviewComment, reviewPullRequest } from "./review.ts";
import { startResumableRun, type RunHandle } from "./runner.ts";
import type { RunKind, RunRecord, Store } from "./store.ts";
import {
  deleteLocalBranch,
  ensureWorktree,
  prepareWorktree,
  remoteBranchExists,
} from "./worktree.ts";

const ALL_STATUS = Object.values(STATUS_LABELS);

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
const TOOL_NAMES: Record<string, string> = {
  claude: "Claude Code",
  antigravity: "Antigravity CLI",
  gemini: "Gemini CLI",
  codex: "Codex",
};

export class Orchestrator {
  private readonly config: Config;
  private readonly github: GitHub;
  private readonly store: Store;
  private readonly repoDir: string;
  // `handle` is absent for manual runs: nothing runs on this machine.
  private readonly running = new Map<string, { run: RunRecord; handle?: RunHandle }>();
  private reviewing: number | undefined;
  private readonly reviewQueue: { pr: number; reviewer: string }[] = [];
  private readonly interrupted: RunRecord[] = [];

  constructor(config: Config, github: GitHub, store: Store, repoDir: string) {
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
      await this.github.setLabels(target, [], [STATUS_LABELS.running]);
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
    if (this.running.has(agentId)) throw new Error(`L'agent ${agentId} travaille déjà`);
    this.assertQuotaAvailable(agentId);
    await this.refresh();
    const issue = nextIssue(agent.label, this.store.live.issues, this.issuesWithOpenPr());
    if (!issue) throw new Error(`Aucune tâche prête pour l'agent ${agentId}`);
    const branch = `${agent.branchPrefix}/i${issue.number}`;
    await ensureWorktree(this.repoDir, agent.worktree);
    // Resume the pushed work of an interrupted run instead of starting over.
    const resume = await remoteBranchExists(agent.worktree, branch);
    if (resume) {
      await prepareWorktree(agent.worktree, { branch });
    } else {
      await prepareWorktree(agent.worktree, { detach: "main" });
      await deleteLocalBranch(agent.worktree, branch);
    }
    await this.github.setLabels(issue.number, [STATUS_LABELS.running]);
    this.start(
      agentId,
      "task",
      issue.number,
      undefined,
      branch,
      taskPrompt(agentId, agent, issue.number, branch, resume),
    );
  }

  async sendBack(prNumber: number, humanNote: string): Promise<void> {
    const pr = this.requirePr(prNumber);
    const agentId = this.requireAgentOf(pr);
    const agent = this.requireAgent(agentId);
    if (this.running.has(agentId)) throw new Error(`L'agent ${agentId} travaille déjà`);
    this.assertQuotaAvailable(agentId);
    const review = this.store.data.reviews[String(prNumber)];
    const feedback =
      [
        ...(review?.reasons ?? []),
        ...(review?.reviewerComments ?? []),
        ...(humanNote.trim() ? [`Note de l'orchestrateur humain : ${humanNote.trim()}`] : []),
      ]
        .map((l) => `- ${l}`)
        .join("\n") || "- Relire la PR et corriger les défauts signalés en commentaire.";
    const issue = this.issueOfBranch(pr.headRefName);
    await ensureWorktree(this.repoDir, agent.worktree);
    await prepareWorktree(agent.worktree, { branch: pr.headRefName });
    await this.github.setLabels(prNumber, [STATUS_LABELS.running], this.labelsOn(pr));
    this.start(
      agentId,
      "fix",
      issue ?? 0,
      prNumber,
      pr.headRefName,
      fixPrompt(agentId, agent, issue ?? 0, prNumber, pr.headRefName, feedback),
      pr.headRefOid,
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
    // PRs opened outside an agent branch (orchestrator, human) are reviewed without a perimeter.
    const agentId = agentOfBranch(this.config, pr.headRefName);
    const previous = this.store.data.reviews[String(prNumber)];
    const fixRounds = previous?.fixRounds ?? 0;
    this.reviewing = prNumber;
    this.store.setActivity(`Relecture de la PR #${prNumber}`);
    try {
      await ensureWorktree(this.repoDir, this.config.reviewWorktree);
      await this.github.setLabels(prNumber, [STATUS_LABELS.review], this.labelsOn(pr));
      const issue = this.issueOfBranch(pr.headRefName);
      const rawDiff = await this.github.pullRequestDiff(prNumber);
      const result = await reviewPullRequest({
        config: this.config,
        agentId,
        reviewerId,
        pr,
        files: await this.github.pullRequestFiles(prNumber),
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
      await this.github.comment(prNumber, reviewComment(reviewerId, result));
      await this.github.setLabels(prNumber, [label], [STATUS_LABELS.review]);
      this.store.data.reviews[String(prNumber)] = {
        pr: prNumber,
        outcome: result.outcome,
        reviewer: reviewerId,
        reasons: result.reasons,
        reviewerComments: result.reviewerComments,
        at: new Date().toISOString(),
        fixRounds,
      };
      this.store.log("info", `PR #${prNumber} relue par ${reviewerId} : ${result.outcome}`);
    } catch (error) {
      this.store.log("error", `Relecture PR #${prNumber} : ${(error as Error).message}`);
    } finally {
      this.reviewing = undefined;
      this.store.setActivity(undefined);
      await this.refresh().catch(() => undefined);
      this.startNextQueuedReview();
    }
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
    const pr = this.requirePr(prNumber);
    await this.github.merge(prNumber);
    this.store.log("info", `PR #${prNumber} mergée par l'humain (${pr.title})`);
    await this.refresh();
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
    };
    this.store.live.liveLines[agentId] = [];

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
      onLine: (line) => this.store.pushLine(agentId, line),
      effort: agent.effort ?? "medium",
      budgetUsd: agent.budgetUsd ?? 1.5,
    });
    this.running.set(agentId, { run, handle });
    this.store.data.runs.push(run);
    this.store.log(
      "info",
      `Agent ${agentId} lancé (${kind}) sur #${pr ?? issue}, branche ${branch}`,
    );
    void handle.done.then(({ code, stdout }) => this.finish(run, code, stdout, adapter));
  }

  private async finish(
    run: RunRecord,
    code: number,
    stdout?: string,
    adapter?: CliAdapter,
  ): Promise<void> {
    this.running.delete(run.agent);
    run.endedAt = new Date().toISOString();
    run.exitCode = code;
    if (stdout && adapter) {
      run.m = adapter.usage(stdout);
    }
    try {
      const quotaDelay = quotaResetDelayMs(logTail(run.logFile));
      if (quotaDelay !== undefined) {
        await this.pauseForQuota(run, quotaDelay);
        return;
      }
      const pr = await this.github.findPullRequest(run.branch);
      if (run.kind === "task") await this.github.setLabels(run.issue, [], [STATUS_LABELS.running]);
      if (!pr) {
        run.result = "aucune PR";
        if (run.kind === "task") await this.github.setLabels(run.issue, [STATUS_LABELS.blocked]);
        this.store.log(
          "warn",
          `Agent ${run.agent} terminé (code ${code}) sans PR pour #${run.issue}`,
        );
        return;
      }
      run.result = `PR #${pr.number}`;
      if (run.kind === "fix") {
        const review = this.store.data.reviews[String(pr.number)];
        if (review) review.fixRounds += 1;
        await this.github.setLabels(pr.number, [], [STATUS_LABELS.running]);
      }
      const metricsStr = run.m
        ? ` · ${run.m.turns ?? "?"} tours, ${(run.m.inputTokens ?? 0) + (run.m.cacheReadInputTokens ?? 0)} tokens, $${run.m.totalCostUsd.toFixed(2)}`
        : "";
      this.store.log("info", `Agent ${run.agent} terminé : PR #${pr.number}${metricsStr}`);
      await this.refresh();
      // Read-only review starts on its own: it only validates and comments.
      await this.review(pr.number, this.config.defaultReviewer);
    } catch (error) {
      this.store.log("error", `Fin de l'agent ${run.agent} : ${(error as Error).message}`);
    } finally {
      this.store.save();
    }
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
        verified: adapter.verified,
        quotaUntil: activeQuota(this.store.data.quotaUntil?.[id]),
        run: current?.run,
        lines: live.liveLines[id] ?? [],
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
      lastRefresh: live.lastTick,
      activity: live.activity,
      reviewing: this.reviewing,
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
      reviewLines: live.liveLines["review"] ?? [],
      agents,
      prs: live.prs.map((p) => ({
        ...p,
        agent: agentOfBranch(this.config, p.headRefName),
        issue: this.issueOfBranch(p.headRefName),
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
