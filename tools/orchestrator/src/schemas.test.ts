import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAgentFinalMessage, validateReviewerResponse } from "./schemas.ts";

test("agent final message: accepts the current normalized envelope", () => {
  const result = validateAgentFinalMessage({
    v: 1,
    id: 42,
    s: "ok",
    pr: 74,
    val: { tc: true, li: true, te: true },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.message, {
    v: 1,
    id: 42,
    s: "ok",
    pr: 74,
    val: { tc: true, li: true, te: true },
  });
});

test("agent final message: keeps compatibility with the previous ok envelope", () => {
  const result = validateAgentFinalMessage({
    v: 1,
    ok: false,
    e: ["TEST_FAIL"],
    val: { tc: true, lint: true, test: false },
  });

  assert.equal(result.valid, true);
  assert.equal(result.message?.s, "fail");
  assert.deepEqual(result.message?.e, ["TEST_FAIL"]);
  assert.deepEqual(result.message?.val, { tc: true, li: true, te: false });
});

test("reviewer response: rejects prose or extra fields", () => {
  assert.equal(validateReviewerResponse("approve").valid, false);
  assert.equal(validateReviewerResponse({ approve: true, comments: [], note: "ok" }).valid, false);
});
