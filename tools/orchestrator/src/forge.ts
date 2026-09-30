import type { IssueSummary } from "./decisions.ts";

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  labels: string[];
}

// Where tasks, their state and the hand-over of finished work live. Two implementations:
// GitHub (issues, labels, pull requests) and the local one (JSON files + git branches of this
// repository). The orchestrator only knows this interface.
export interface Forge {
  issues(): Promise<IssueSummary[]>;
  openPullRequests(): Promise<PullRequest[]>;
  pullRequestFiles(pr: number): Promise<string[]>;
  pullRequestDiff(pr: number): Promise<string>;
  issueText(issue: number): Promise<string>;
  findPullRequest(branch: string): Promise<PullRequest | undefined>;
  // Works for issues and pull requests alike (same number space).
  setLabels(number: number, add: string[], remove?: string[]): Promise<void>;
  comment(number: number, body: string): Promise<void>;
  mergeIntoBase(pr: number): Promise<void>;
  // The « publish » PR from the base branch to production.
  mergeRelease(pr: number): Promise<void>;
  closeIssue(issue: number, comment: string): Promise<void>;
  setBase(pr: number, base: string): Promise<void>;
  deleteBranch(branch: string): Promise<void>;
  createPullRequest(base: string, head: string, title: string, body: string): Promise<void>;
  mergedBranches(): Promise<string[]>;
  ensureStatusLabels(): Promise<void>;
  // Would merging this PR into its base conflict right now? (local forge only)
  wouldConflict?(pr: number): Promise<boolean>;
}
