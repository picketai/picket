import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { stopAnswer, stopSettings } from "../lib/tester-stop-hook.mjs";
import { hookAnswer } from "../lib/tester-stop-hook.mjs";

const HOOK = resolve("bench", "lib", "tester-stop-hook.mjs");
const send = (tool, subagent) => ({ hook_event_name: "PreToolUse", tool_name: tool, tool_input: { subagent_type: subagent, prompt: "work: x" } });
const DENIAL = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "the benchmark ends after the tester's verdict; end your turn" } };

test("a send to the developer is denied with the reason of D-004, through Agent or Task (T-2.6)", () => {
  assert.deepEqual(stopAnswer(send("Agent", "picket:developer")), DENIAL);
  assert.deepEqual(stopAnswer(send("Task", "picket:reviewer")), DENIAL);
});

test("a send to the tester and a Bash call get no answer (T-2.6)", () => {
  assert.equal(stopAnswer(send("Agent", "picket:tester")), null);
  assert.equal(stopAnswer({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "picket next x" } }), null);
});

test("the settings hold one PreToolUse hook on Agent|Task that runs the hook file (T-2.6)", () => {
  assert.deepEqual(stopSettings("/b/hook.mjs"), { hooks: { PreToolUse: [{ matcher: "Agent|Task", hooks: [{ type: "command", command: 'node "/b/hook.mjs"' }] }] } });
});

test("run as a hook it prints the denial for a developer send and nothing for the tester", () => {
  const run = (input) => spawnSync(process.execPath, [HOOK], { input: JSON.stringify(input), encoding: "utf8" });
  const denied = run(send("Agent", "picket:developer"));
  assert.deepEqual([denied.status, JSON.parse(denied.stdout)], [0, DENIAL]);
  const allowed = run(send("Agent", "picket:tester"));
  assert.deepEqual([allowed.status, allowed.stdout], [0, ""]);
});

test("input the hook cannot read is denied (T-2.2)", () => {
  for (const raw of ["", "not json", "null", "[]", '{"tool_name":"Agent"}']) assert.deepEqual(hookAnswer(raw), DENIAL, JSON.stringify(raw));
});

test("readable input answers as stopAnswer does: a developer send is denied, a tester send is not (T-2.3)", () => {
  assert.deepEqual(hookAnswer(JSON.stringify(send("Agent", "picket:developer"))), DENIAL);
  assert.equal(hookAnswer(JSON.stringify(send("Agent", "picket:tester"))), null);
});

test("run as a hook on input that is not JSON it prints the denial (T-2.4)", () => {
  const run = spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" });
  assert.deepEqual([run.status, JSON.parse(run.stdout)], [0, DENIAL]);
});
