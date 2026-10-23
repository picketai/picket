import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { appendLedger, readLedger } from "./ledger.mts";
import { statePath, STATE_FILES } from "./paths.mts";
import { withProject } from "#test/project.mts";

const ACCEPT = { event: "accept", session: null, agent: null, work_id: "w1", phase: 1, commit: "abc1234", lines_added: 3 } as const;
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

test("readLedger of a project without a ledger is empty", (t) => {
  const { root } = ledgerProject(t, null);
  assert.deepEqual(readLedger(root), { rows: [], skipped: 0 });
});
