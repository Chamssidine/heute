import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideReview,
  failureStreak,
  needsReview,
  isManualRunDone,
  nextIssue,
  parseDependencies,
  queueFor,
  quotaResetDelayMs,
  type IssueSummary,
  type ReviewInput,
} from "./decisions.ts";
import { matchesAny } from "./paths.ts";

const issue = (
  number: number,
  labels: string[],
  body = "",
  state: "OPEN" | "CLOSED" = "OPEN",
): IssueSummary => ({ number, title: `#${number}`, labels, body, state });

test("globs match the agent perimeters", () => {
  const ui = ["apps/mobile/src/features/*/components/**"];
  assert.ok(matchesAny("apps/mobile/src/features/kitchen/components/Row.tsx", ui));
  assert.ok(!matchesAny("apps/mobile/src/features/kitchen/model.ts", ui));
  const domain = ["packages/domain/src/{time,format}/**"];
  assert.ok(matchesAny("packages/domain/src/time/worked.ts", domain));
  assert.ok(!matchesAny("packages/domain/src/errors/codes.ts", domain));
  assert.ok(matchesAny("apps/admin/package.json", ["**/package.json"]));
  assert.ok(matchesAny("package.json", ["**/package.json"]));
});

test("dependencies are read from « Dépend de »", () => {
  assert.deepEqual(parseDependencies("x\nDépend de #14, #15\ny"), [14, 15]);
  assert.deepEqual(parseDependencies("aucune"), []);
});

test("next issue: lowest ready issue of the agent, skipping blocked and busy ones", () => {
  const issues = [
    issue(15, ["agent:A"], "Dépend de #14"),
    issue(14, ["agent:A", "en-cours"]),
    issue(16, ["agent:A"]),
    issue(13, ["agent:L"]),
    issue(12, ["agent:A"], "", "CLOSED"),
  ];
  assert.equal(nextIssue("agent:A", issues)?.number, 16);
  assert.deepEqual(
    queueFor("agent:A", issues).map((e) => [e.issue.number, e.ready]),
    [
      [15, false],
      [16, true],
    ],
  );
});

test("a dependency on a closed issue does not block", () => {
  const issues = [issue(15, ["agent:A"], "Dépend de #14"), issue(14, ["agent:A"], "", "CLOSED")];
  assert.equal(nextIssue("agent:A", issues)?.number, 15);
});

test("tasks reserved to the human are never assigned", () => {
  assert.equal(nextIssue("agent:L", [issue(20, ["agent:L", "humain"])]), undefined);
});

test("an issue that already has an open PR is not offered again", () => {
  const issues = [issue(13, ["agent:L"]), issue(26, ["agent:L"])];
  assert.equal(nextIssue("agent:L", issues, new Set([13]))?.number, 26);
  assert.equal(nextIssue("agent:L", [issue(13, ["agent:L"])], new Set([13])), undefined);
});

const base: ReviewInput = {
  files: ["apps/mobile/src/app/index.tsx"],
  allowedPaths: ["apps/mobile/src/app/**"],
  contractPaths: ["packages/domain/**"],
  validationsPassed: true,
  reviewerApproved: true,
  fixRoundsDone: 0,
  maxFixRounds: 2,
};

test("review: clean PR is ready for the human to merge", () => {
  assert.equal(decideReview(base).outcome, "ready");
});

test("review: files outside the perimeter ask for changes", () => {
  const d = decideReview({ ...base, files: [...base.files, "AGENTS.md"] });
  assert.equal(d.outcome, "changes");
  assert.match(d.reasons[0] ?? "", /AGENTS\.md/);
});

test("review: contract changes wait for the human", () => {
  const d = decideReview({
    ...base,
    files: ["packages/domain/src/time/a.ts"],
    allowedPaths: ["packages/domain/**"],
  });
  assert.equal(d.outcome, "human");
});

test("review: failed validations after the last fix round go to the human", () => {
  assert.equal(decideReview({ ...base, validationsPassed: false }).outcome, "changes");
  assert.equal(
    decideReview({ ...base, validationsPassed: false, fixRoundsDone: 2 }).outcome,
    "human",
  );
});

test("manual task run ends when its PR appears", () => {
  const run = { kind: "task" as const, branch: "l/i13" };
  assert.equal(isManualRunDone(run, []), false);
  assert.equal(isManualRunDone(run, [{ headRefName: "l/i13", headRefOid: "abc" }]), true);
});

test("manual fix run ends only after a new commit on the PR", () => {
  const run = { kind: "fix" as const, branch: "u/i20", startSha: "abc" };
  assert.equal(isManualRunDone(run, [{ headRefName: "u/i20", headRefOid: "abc" }]), false);
  assert.equal(isManualRunDone(run, [{ headRefName: "u/i20", headRefOid: "def" }]), true);
});

test("quota: reads the reset delay given by the provider (real agy message)", () => {
  const tail =
    'AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 2h18m58s."}';
  assert.equal(quotaResetDelayMs(tail), (2 * 3600 + 18 * 60 + 58) * 1000);
});

test("quota: without a reset time, waits one hour; a normal run is not a quota stop", () => {
  assert.equal(quotaResetDelayMs("Error: usage limit reached"), 60 * 60_000);
  assert.equal(quotaResetDelayMs('{"event":"result","result":{"status":"SUCCESS"}}'), undefined);
});

test("autopilot: failures are counted since the last PR, quota stops are ignored", () => {
  assert.equal(failureStreak(["PR #1", "aucune PR", "aucune PR (BLOCKED)"]), 2);
  assert.equal(failureStreak(["aucune PR", "PR #2", "aucune PR"]), 1);
  assert.equal(failureStreak(["aucune PR", "quota épuisé", "interrompu (x)", "aucune PR"]), 2);
  assert.equal(failureStreak([]), 0);
});

test("autopilot: a PR without status label waits for its review", () => {
  assert.equal(needsReview([]), true);
  assert.equal(needsReview(["agent:A"]), true);
  assert.equal(needsReview(["changements"]), false);
  assert.equal(needsReview(["en-revue"]), false);
});

test("quota: Claude's session limit message is recognised, with its reset hour", () => {
  const delay = quotaResetDelayMs("You've hit your session limit · resets 4pm (Asia/Baghdad)");
  assert.ok(delay !== undefined && delay > 0 && delay <= 24 * 3600_000);
  assert.equal(quotaResetDelayMs("tout va bien"), undefined);
});
