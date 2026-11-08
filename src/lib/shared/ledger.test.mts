import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { appendLedger, isTurn, readLedger, turnTokens, type LedgerRow, type NewRow, type TurnRow } from "./ledger.mts";
import { statePath, STATE_FILES } from "./paths.mts";
import { withProject } from "#test/project.mts";

const ACCEPT = { event: "accept", session: null, agent: null, work_id: "w1", phase: 1, commit: "abc1234", lines_added: 3 } as const;
const TURN = {
  event: "stop",
  session: "s1",
  agent: "developer",
  work_id: "w1",
  lane: "design",
  phase: 1,
  model: null,
  duration_ms: 1000,
  verdict: null,
  gate_kind: null,
  tool_calls: 0,
  reads: 0,
  rereads: 0,
  first_reviewable_ms: null,
  usage: { input_tokens: 1, cache_read_input_tokens: 10, cache_creation_input_tokens: 100, output_tokens: 1000 },
} as const satisfies NewRow;
const NOW = new Date("2026-10-23T10:00:00.000Z");

function ledgerProject(t: TestContext, text: string | null): { root: string; path: string } {
  const root = withProject(t, { picket: false });
  const path = statePath(root, STATE_FILES.ledger);
  mkdirSync(dirname(path), { recursive: true });
  if (text !== null) writeFileSync(path, text);
  return { root, path };
}

test("appendLedger stamps v and ts first and starts its own line after a file that ends mid-line", (t) => {
  const { root, path } = ledgerProject(t, '{"v":2,"event":"stop"');
  appendLedger(root, ACCEPT, NOW);
  const lines = readFileSync(path, "utf8").split("\n");
  assert.equal(lines[1], '{"v":2,"ts":"2026-10-23T10:00:00.000Z","event":"accept","session":null,"agent":null,"work_id":"w1","phase":1,"commit":"abc1234","lines_added":3}');
  assert.equal(lines[2], "");
});

test("readLedger returns the v2 rows, counts a bad line as skipped and leaves out a v1 row uncounted", (t) => {
  const good = { v: 2, ts: NOW.toISOString(), ...ACCEPT };
  const text = [JSON.stringify(good), "{not json", JSON.stringify({ v: 1, event: "stop" }), JSON.stringify({ ...good, work_id: "w2" })].join("\n") + "\n";
  const { root } = ledgerProject(t, text);
  assert.deepEqual(readLedger(root), { rows: [good, { ...good, work_id: "w2" }], skipped: 1 });
});

test("a turn row appended and read back keeps v 2 and its usage and carries no session_cost_usd (T-1.2)", (t) => {
  const { root } = ledgerProject(t, null);
  appendLedger(root, TURN, NOW);
  const [row] = readLedger(root).rows;
  assert.equal(row.v, 2);
  assert.deepEqual((row as TurnRow).usage, TURN.usage);
  assert.equal("session_cost_usd" in row, false);
});

test("turnTokens sums the four usage fields and is 0 without usage", () => {
  assert.equal(turnTokens({ v: 2, ts: NOW.toISOString(), ...TURN }), 1111);
  assert.equal(turnTokens({ v: 2, ts: NOW.toISOString(), ...TURN, usage: null }), 0);
});

test("isTurn holds for stop, subagent_stop and gate rows and for no other event", () => {
  const stamp = { v: 2, ts: NOW.toISOString() } as const;
  const common = { ...stamp, session: "s1", agent: "developer", work_id: "w1" } as const;
  const rows: LedgerRow[] = [
    { ...stamp, ...TURN, event: "stop" },
    { ...stamp, ...TURN, event: "subagent_stop" },
    { ...stamp, ...TURN, event: "gate" },
    { ...stamp, ...ACCEPT },
    { ...common, event: "block", hook: "guard.scope", reason: "r" },
    { ...common, event: "bounce", hook: "route", reason: "r" },
    { ...common, event: "escalation", outcome: "ask", why: null, key: "k", command: "git push", reason: null },
    { ...common, event: "repeat", class: "reread", items: ["a"] },
  ];
  assert.deepEqual(
    rows.map((row) => [row.event, isTurn(row)]),
    [
      ["stop", true],
      ["subagent_stop", true],
      ["gate", true],
      ["accept", false],
      ["block", false],
      ["bounce", false],
      ["escalation", false],
      ["repeat", false],
    ],
  );
});

test("readLedger of a project without a ledger is empty", (t) => {
  const { root } = ledgerProject(t, null);
  assert.deepEqual(readLedger(root), { rows: [], skipped: 0 });
});
