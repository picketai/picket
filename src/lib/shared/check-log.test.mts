import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { appendCheckRow, latestCheck, type CheckRow } from "./check-log.mts";
import { stateDir, statePath, STATE_FILES } from "./paths.mts";
import { withProject } from "#test/project.mts";

const row = (fields: Partial<CheckRow>): CheckRow => ({
  ts: "2026-11-09T10:00:00.000Z",
  session: "s1",
  work_id: "20261109-a",
  phase: 2,
  checkout: "",
  ok: true,
  steps: [{ name: "test", status: "passed" }],
  ...fields,
});

test("latestCheck returns the newest row of the asked item and phase and ignores other items and phases (T-4.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const newest = row({ ts: "2026-11-09T10:02:00.000Z", ok: false, steps: [{ name: "test", status: "failed" }] });
  appendCheckRow(root, row({ ts: "2026-11-09T10:01:00.000Z" }));
  appendCheckRow(root, newest);
  appendCheckRow(root, row({ ts: "2026-11-09T10:03:00.000Z", phase: 3 }));
  appendCheckRow(root, row({ ts: "2026-11-09T10:04:00.000Z", work_id: "20261109-b" }));
  assert.deepEqual(latestCheck(root, "20261109-a", 2), newest);
  assert.equal(latestCheck(root, "20261109-a", 1), null);
});

test("latestCheck is null for a missing log and skips malformed lines (T-4.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  assert.equal(latestCheck(root, "20261109-a", 2), null);
  mkdirSync(stateDir(root), { recursive: true });
  const path = statePath(root, STATE_FILES.checkLog);
  writeFileSync(path, "{not json\n[1,2]\n\"text\"\n");
  assert.equal(latestCheck(root, "20261109-a", 2), null);
  const good = row({});
  appendFileSync(path, `${JSON.stringify(good)}\n{broken\n`);
  assert.deepEqual(latestCheck(root, "20261109-a", 2), good);
});
