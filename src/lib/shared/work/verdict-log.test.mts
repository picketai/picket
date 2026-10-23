import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendVerdict, readVerdicts } from "./verdict-log.mts";
import type { WorkId } from "./files.mts";
import { openItem, withProject } from "#test/project.mts";

const READABLE_ROW = '{"ts":"2026-10-23T10:00:00Z","agent":"architect","verdict":"ARTIFACT WRITTEN","phase":null}';

function itemWithLog(t: TestContext, log: string): { root: string; id: WorkId } {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Truncated" });
  writeFileSync(join(root, "work", id, "verdicts.jsonl"), log);
  return { root, id };
}

test("readVerdicts keeps the readable lines and counts a truncated last line as skipped", (t) => {
  const rows = ['{"ts":"2026-10-23T10:00:00Z","agent":"developer","verdict":"PHASE DONE","phase":1}', '{"ts":"2026-10-23T10:05:00Z","agent":"user","verdict":"approved","phase":1}', '{"ts":"2026'];
  const { root, id } = itemWithLog(t, rows.join("\n") + "\n");
  const read = readVerdicts(root, id);
  assert.deepEqual(read.rows.map((r) => r.verdict), ["PHASE DONE", "approved"]);
  assert.equal(read.skipped, 1);
});

test("a verdict appended after a truncated last line starts on its own line and stays readable", (t) => {
  const { root, id } = itemWithLog(t, `${READABLE_ROW}\n{"ts":"2026`);
  appendVerdict(root, id, { agent: "developer", verdict: "PHASE DONE", phase: 1, scope: null, through: null }, new Date());
  const read = readVerdicts(root, id);
  assert.deepEqual(read.rows.map((r) => r.verdict), ["ARTIFACT WRITTEN", "PHASE DONE"]);
  assert.equal(read.skipped, 1);
});
