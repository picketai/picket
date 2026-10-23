import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { appendLedger, readLedger } from "../../dist/lib/shared/ledger.mjs";
import { statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";

const ACCEPT = { event: "accept", session: null, agent: null, work_id: "w1", phase: 1, commit: "abc1234", lines_added: 3 };
const NOW = new Date("2026-10-23T10:00:00.000Z");

function withLedger(text, fn) {
  const root = mkdtempSync(join(tmpdir(), "picket-ledger-"));
  const path = statePath(root, STATE_FILES.ledger);
  mkdirSync(dirname(path), { recursive: true });
  if (text !== null) writeFileSync(path, text);
  try {
    fn(root, path);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("appendLedger stamps v and ts first and starts its own line after a file that ends mid-line", () => {
  withLedger('{"v":2,"event":"stop"', (root, path) => {
    appendLedger(root, ACCEPT, NOW);
    const lines = readFileSync(path, "utf8").split("\n");
    assert.equal(lines[1], '{"v":2,"ts":"2026-10-23T10:00:00.000Z","event":"accept","session":null,"agent":null,"work_id":"w1","phase":1,"commit":"abc1234","lines_added":3}');
    assert.equal(lines[2], "");
  });
});

test("readLedger returns the v2 rows, counts a bad line as skipped and leaves out a v1 row uncounted", () => {
  const good = { v: 2, ts: NOW.toISOString(), ...ACCEPT };
  const text = [JSON.stringify(good), "{not json", JSON.stringify({ v: 1, event: "stop" }), JSON.stringify({ ...good, work_id: "w2" })].join("\n") + "\n";
  withLedger(text, (root) => {
    assert.deepEqual(readLedger(root), { rows: [good, { ...good, work_id: "w2" }], skipped: 1 });
  });
});

test("readLedger of a project without a ledger is empty", () => {
  withLedger(null, (root) => {
    assert.deepEqual(readLedger(root), { rows: [], skipped: 0 });
  });
});
