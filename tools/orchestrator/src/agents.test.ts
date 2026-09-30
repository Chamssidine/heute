import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgent, type AgentSpec } from "./agents.ts";
import type { AgentConfig } from "./config.ts";

const existing: Record<string, AgentConfig> = {
  U: {
    name: "Mobile UI",
    cli: "claude",
    model: "m",
    worktree: "C:/dev/heute-u",
    label: "agent:U",
    branchPrefix: "u",
    brief: "docs/agents/mobile-ui.md",
    allowedPaths: ["apps/mobile/src/app/**"],
  },
};
const ctx = {
  existing,
  clis: { claude: {} },
  repoDir: "C:/dev/Heute",
  briefExists: (p: string) => p === "docs/agents/mobile-ui.md",
};
const spec: AgentSpec = {
  id: "U2",
  name: "Mobile UI 2",
  cli: "claude",
  model: "claude-sonnet-5-5",
  brief: "docs/agents/mobile-ui.md",
  allowedPaths: ["apps/mobile/src/app/**", "apps/mobile/src/strings/**"],
};

test("agent creation: defaults are derived from the id and the result is a normal agent", () => {
  const built = buildAgent(spec, ctx);
  assert.ok("agent" in built);
  assert.equal(built.id, "U2");
  assert.equal(built.agent.label, "agent:U2");
  assert.equal(built.agent.branchPrefix, "u2");
  assert.match(built.agent.worktree, /heute-u2$/);
  assert.equal(built.agent.created, true);
});

test("agent creation: every wrong field is reported, nothing is half-created", () => {
  const built = buildAgent(
    {
      ...spec,
      id: "U",
      cli: "inconnue",
      brief: "../secret.md",
      allowedPaths: ["../hors-depot", "C:/windows"],
      budgetUsd: 99,
    },
    ctx,
  );
  assert.ok("errors" in built);
  const text = built.errors.join("\n");
  for (const expected of ["déjà pris", "CLI inconnue", "Brief", "Chemin refusé", "Budget"]) {
    assert.match(text, new RegExp(expected));
  }
});

test("agent creation: label, branch prefix and folder cannot collide with another agent", () => {
  const built = buildAgent(
    { ...spec, label: "agent:U", branchPrefix: "u", worktree: "C:/DEV/heute-u" },
    ctx,
  );
  assert.ok("errors" in built);
  assert.equal(built.errors.length, 3);
});

test("agent creation: the model must be one the CLI offers", () => {
  const listed = { ...ctx, models: ["claude-sonnet-5-5", "claude-opus-5-5"] };
  assert.ok("agent" in buildAgent({ ...spec, model: "claude-opus-5-5" }, listed));
  const refused = buildAgent({ ...spec, model: "gemini" }, listed);
  assert.ok("errors" in refused);
  assert.match(refused.errors.join(), /non proposé/);
  assert.ok(
    "agent" in buildAgent({ ...spec, model: "tout" }, ctx),
    "no list known: nothing to check against",
  );
});

test("agent edit: an agent keeps its own label, prefix and folder (it is not compared with itself)", () => {
  const others = {};
  const built = buildAgent(
    {
      ...spec,
      id: "U",
      label: "agent:U",
      branchPrefix: "u",
      worktree: "C:/dev/heute-u",
      model: "claude-opus-5-5",
    },
    { ...ctx, existing: others },
  );
  assert.ok("agent" in built);
  assert.equal(built.agent.model, "claude-opus-5-5");
  assert.equal(built.agent.label, "agent:U");
});
