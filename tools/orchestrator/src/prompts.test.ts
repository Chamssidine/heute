import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentConfig } from "./config.ts";
import { fixPrompt, localFixPrompt, taskPrompt } from "./prompts.ts";

const agent: AgentConfig = {
  name: "Test",
  cli: "claude",
  model: "m",
  worktree: "C:/dev/heute-x",
  label: "agent:X",
  branchPrefix: "x",
  brief: "docs/agents/x.md",
  allowedPaths: [],
};
const common = { agentId: "X", agent, issue: 12, branch: "x/i12", base: "dev", baseRef: "dev" };
const errors = [{ src: "checks", msg: "typecheck : erreur" }];

// The variable part of every prompt is one JSON object on the last line.
function message(prompt: string): Record<string, unknown> {
  const line = prompt.split("\n").at(-1) ?? "";
  assert.match(line, /^Message : \{/);
  return JSON.parse(line.slice("Message : ".length)) as Record<string, unknown>;
}

test("agent prompts give no GitHub access and never ask for a push or a PR", () => {
  const prompts = [
    taskPrompt({ ...common, resume: false, spec: "# #12 Titre\n\nCritères" }),
    fixPrompt({ ...common, pr: 40, errors }),
    localFixPrompt({ ...common, errors, round: 1 }),
  ];
  for (const prompt of prompts) {
    assert.doesNotMatch(prompt, /gh (issue|pr)/);
    assert.match(prompt, /ni `git push`/);
  }
});

test("the message to the agent is JSON: type, task, refs and the spec, with the rules first", () => {
  const prompt = taskPrompt({ ...common, resume: false, spec: "# #12 Titre\n\nCritères" });
  const m = message(prompt);
  assert.deepEqual(
    {
      v: m["v"],
      t: m["t"],
      id: m["id"],
      branch: m["branch"],
      baseRef: m["baseRef"],
      resume: m["resume"],
    },
    { v: 1, t: "task", id: 12, branch: "x/i12", baseRef: "dev", resume: false },
  );
  assert.match(String(m["spec"]), /Critères/);
  assert.ok(prompt.indexOf("Le message de l'orchestrateur") < prompt.indexOf("Message : "));
});

test("corrections are a list of {src, msg}, never free text", () => {
  const fix = message(fixPrompt({ ...common, pr: 40, errors }));
  assert.equal(fix["t"], "fix");
  assert.equal(fix["pr"], 40);
  assert.deepEqual(fix["errors"], errors);
  const check = message(localFixPrompt({ ...common, errors, round: 2 }));
  assert.equal(check["t"], "check");
  assert.equal(check["round"], 2);
});
