import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentConfig } from "./config.ts";
import { fixPrompt, localFixPrompt, taskPrompt } from "./prompts.ts";

const agent: AgentConfig = {
  name: "Test",
  cli: "claude",
  model: "m",
  worktree: "C:\dev\heute-x",
  label: "agent:X",
  branchPrefix: "x",
  brief: "docs/agents/x.md",
  allowedPaths: [],
};

test("agent prompts give no GitHub access and never ask for a push or a PR", () => {
  const prompts = [
    taskPrompt("X", agent, 12, "x/i12", false, "dev", "# #12 Titre\n\nCritères"),
    fixPrompt("X", agent, 12, 40, "x/i12", "- corrige", "dev"),
    localFixPrompt("X", agent, 12, "x/i12", "typecheck : erreur", 1),
  ];
  for (const prompt of prompts) {
    assert.doesNotMatch(prompt, /gh (issue|pr)/);
    assert.match(prompt, /ni `git push`/);
  }
});

test("the task prompt carries the issue text, so the agent does not fetch it", () => {
  const prompt = taskPrompt("X", agent, 12, "x/i12", false, "dev", "# #12 Titre\n\nCritères");
  assert.match(prompt, /Critères/);
  assert.match(prompt, /origin\/dev/);
});
