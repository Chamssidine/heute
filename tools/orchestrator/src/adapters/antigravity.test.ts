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

// Shape of a real run that ended on a refused command (agy 1.0.12, shortened).
const refusedRun = [
  '{"event":"init","conversation_id":"conv-1","init":{"model":"m"}}',
  '{"event":"step_update","step_update":{"state":"ERROR","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"node -v"},"error":{"type":"TOOL_ERROR","message":"permission check failed for command"}}}}',
  '{"event":"step_update","step_update":{"state":"ERROR","step_type":"tool","tool_name":"view_file","tool_info":{"name":"view_file","parameters":{},"error":{"type":"TOOL_ERROR","message":"failed to read file"}}}}',
  '{"event":"result","result":{"status":"SUCCESS","response":"","denied_actions":[{"action":"command"}]}}',
].join("\n");

test("antigravity: finds refused commands, not ordinary tool errors", () => {
  assert.deepEqual(antigravity.resume?.refusedCommands(refusedRun), ["node -v"]);
  assert.equal(antigravity.resume?.conversationId(refusedRun), "conv-1");
});

test("antigravity: a resume continues the same conversation", () => {
  const settings = { adapter: "antigravity", command: "agy.exe" };
  const spec = antigravity.resume?.launch(settings, "m", "agent", "conv-1", "continue");
  assert.ok(spec);
  const args = spec.args;
  assert.equal(args[args.indexOf("--conversation") + 1], "conv-1");
  assert.equal(args[args.indexOf("-p") + 1], "continue");
  assert.ok(args.includes("accept-edits"));
});

test("antigravity: passes the effort but no budget flag (agy has none)", () => {
  assert.deepEqual(antigravity.limitArgs?.("medium", 1.5), ["--effort", "medium"]);
});
