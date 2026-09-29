import { test } from "node:test";
import assert from "node:assert/strict";
import { antigravity } from "./antigravity.ts";

// Lines captured from a real `agy -p … --output-format stream-json` run (shortened).
const tool = (state: string, extra = ""): string =>
  `{"event":"step_update","step_update":{"step_index":4,"state":"${state}","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"node --version"}${extra}}}}`;
const result =
  '{"event":"result","result":{"status":"SUCCESS","response":"{\\"approve\\": true}","denied_actions":[{"action":"command","display_name":"RunCommand"}]}}';

test("antigravity: a started tool call becomes a readable line", () => {
  assert.equal(antigravity.summarize(tool("ACTIVE")), "[run_command] node --version");
});

test("antigravity: a refused command shows the reason", () => {
  const line = antigravity.summarize(
    tool("ERROR", ',"error":{"type":"TOOL_ERROR","message":"permission check failed"}'),
  );
  assert.match(line ?? "", /^✗ \[run_command\] node --version : permission check failed/);
});

test("antigravity: the result line lists refused actions and the final text is extracted", () => {
  assert.match(antigravity.summarize(result) ?? "", /refusé : command/);
  assert.equal(antigravity.finalText(`${tool("ACTIVE")}\n${result}\n`), '{"approve": true}');
});

test("antigravity: agents edit files, reviewers stay read-only", () => {
  const settings = { adapter: "antigravity", command: "agy.exe" };
  assert.ok(antigravity.launch(settings, "m", "agent", "p").args.includes("accept-edits"));
  assert.ok(antigravity.launch(settings, "m", "reviewer", "p").args.includes("plan"));
});
