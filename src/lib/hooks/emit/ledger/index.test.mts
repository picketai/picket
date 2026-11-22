import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emitLedger as ledgerHandler } from "./index.mts";
import { statePath, STATE_FILES } from "../../../shared/paths.mts";
import { hookContext } from "#test/context.mts";
import { assistantEntry, assistantText as assistant, looseHandler, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const emitLedger = looseHandler(ledgerHandler);

const use = (id: string, name: string) => ({ type: "tool_use", id, name, input: {} });
const result = (id: string, extra: object = {}) => ({ type: "tool_result", tool_use_id: id, content: "out", ...extra });
const results = (...items: object[]) => ({ type: "user", message: { role: "user", content: items } });

function subagentRow(root: string, entries: object[]): any {
  const tp = transcript(root, entries as Record<string, unknown>[]);
  emitLedger({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, agent_transcript_path: tp, agent_type: "picket:developer", cwd: root }, hookContext(root));
  return ledger(root).at(-1);
}

function ledger(root: string): any[] {
  return readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("emitLedger called directly appends one v2 row to the ledger (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const tp = transcript(root, [user("hello"), assistant("Done.")]);
  assert.equal(emitLedger({ hook_event_name: "Stop", session_id: "s1", transcript_path: tp, cwd: root }, hookContext(root)), null);
  const rows = ledger(root);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].v, 2);
  assert.equal(rows[0].session, "s1");
});

test("emitLedger writes a turn row with no cost field of any kind", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const tp = transcript(root, [user("hello"), assistant("Done.")]);
  emitLedger({ hook_event_name: "Stop", session_id: "s1", transcript_path: tp, cwd: root }, hookContext(root));
  const [row] = ledger(root);
  assert.equal(row.event, "stop");
  for (const key of ["session_cost_usd", "cost_usd", "lines_added", "bounces", "blocks"]) assert.equal(key in row, false, key);
});


test("emitLedger counts the failed tool calls of the last turn by tool name (T-1.1)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [
    user("work: w1\nphase: 1"),
    assistantEntry([use("b1", "Bash"), use("e1", "Edit"), use("r1", "Read")]),
    results(result("b1", { is_error: true }), result("e1", { is_error: true }), result("r1")),
    assistant("Done."),
  ]);
  assert.equal(row.failed_tool_calls, 2);
  assert.deepEqual(row.failed_tools, { Bash: 1, Edit: 1 });
});

test("emitLedger leaves a failure of an earlier turn out of the row (T-1.2)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [
    user("work: w1\nphase: 1"),
    assistantEntry([use("r1", "Read")]),
    results(result("r1", { is_error: true })),
    assistant("First turn."),
    user("go on"),
    assistantEntry([use("r2", "Read")]),
    results(result("r2")),
    assistant("Second turn."),
  ]);
  assert.equal(row.failed_tool_calls, 0);
  assert.deepEqual(row.failed_tools, {});
});

test("emitLedger counts no result whose is_error is false or missing (T-1.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [
    user("work: w1\nphase: 1"),
    assistantEntry([use("b1", "Bash"), use("b2", "Bash")]),
    results(result("b1", { is_error: false }), result("b2")),
    assistant("Done."),
  ]);
  assert.equal(row.failed_tool_calls, 0);
  assert.deepEqual(row.failed_tools, {});
});

test("emitLedger counts a failed result whose tool use is outside the turn under unknown", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [user("work: w1\nphase: 1"), results(result("gone", { is_error: true })), assistant("Done.")]);
  assert.equal(row.failed_tool_calls, 1);
  assert.deepEqual(row.failed_tools, { unknown: 1 });
});

const bounce = { type: "user", isMeta: true, message: { role: "user", content: "Stop hook feedback:\nre-emit the block" } };
const request = (uuid: string, text: string) => ({ ...user(text), uuid });
const TWO_ENTRIES = { input_tokens: 20, output_tokens: 40, cache_read_input_tokens: 2000, cache_creation_input_tokens: 200 };

test("a turn bounced by a stop hook spans from its request across the feedback entry (T-2.1)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [request("r1", "work: w1\nphase: 1"), assistant("First block."), bounce, assistant("Second block.")]);
  assert.equal(row.turn_id, "r1");
  assert.deepEqual(row.usage, TWO_ENTRIES);
  assert.equal(row.duration_ms, 3000);
});

test("a failed tool call before the feedback entry counts in the bounced turn (T-2.2)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [
    request("r1", "work: w1\nphase: 1"),
    assistantEntry([use("b1", "Bash")]),
    results(result("b1", { is_error: true })),
    bounce,
    assistant("Second block."),
  ]);
  assert.equal(row.failed_tool_calls, 1);
  assert.deepEqual(row.failed_tools, { Bash: 1 });
});

test("stops of one turn share its turn_id and a new request starts another (T-2.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const turn = [request("r1", "work: w1\nphase: 1"), assistant("First block.")];
  const first = subagentRow(root, turn);
  const continued = [...turn, bounce, assistant("Second block."), assistant("Continued.")];
  const second = subagentRow(root, continued);
  const third = subagentRow(root, [...continued, request("r2", "go on"), assistant("Next turn.")]);
  assert.deepEqual([first.turn_id, second.turn_id, third.turn_id], ["r1", "r1", "r2"]);
});

test("a request more than 512 KiB back still names the turn and starts its span (T-2.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [request("r1", "work: w1\nphase: 1"), assistant("x".repeat(600 * 1024)), bounce, assistant("Done.")]);
  assert.equal(row.turn_id, "r1");
  assert.equal(row.duration_ms, 3000);
});

test("a transcript with no request writes a null turn_id (T-2.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = subagentRow(root, [assistant("Done.")]);
  assert.equal(row.turn_id, null);
});
