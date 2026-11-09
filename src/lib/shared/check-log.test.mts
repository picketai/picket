import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendCheckRow, dropItemChecks, latestCheck, redBeforeChange, type CheckRow } from "./check-log.mts";
import { stateDir, statePath, STATE_FILES } from "./paths.mts";
import { withProject } from "#test/project.mts";

const row = (fields: Partial<CheckRow>): CheckRow => ({
  ts: "2026-11-09T10:00:00.000Z",
  session: "s1",
  work_id: "20261109-a",
  phase: 2,
  checkout: "",
  ok: true,
  product_changed: false,
  steps: [{ name: "test", status: "passed" }],
  ...fields,
});

const RED = [{ name: "test" as const, status: "failed" as const }];

function compactedLog(root: string) {
  const redBefore = row({ ts: "2026-11-09T10:01:00.000Z", ok: false, steps: RED });
  const otherPhase = row({ ts: "2026-11-09T10:02:00.000Z", phase: 3 });
  const redAfter = row({ ts: "2026-11-09T10:03:00.000Z", ok: false, product_changed: true, steps: RED });
  const otherItem = row({ ts: "2026-11-09T10:04:00.000Z", work_id: "20261109-b" });
  const green = row({ ts: "2026-11-09T10:05:00.000Z", product_changed: true });
  const newest = row({ ts: "2026-11-09T10:06:00.000Z", product_changed: true });
  for (const r of [redBefore, otherPhase, redAfter, otherItem, green, newest]) appendCheckRow(root, r);
  return { redBefore, otherPhase, otherItem, newest };
}

const loggedRows = (root: string) => readFileSync(statePath(root, STATE_FILES.checkLog), "utf8").trim().split("\n").map((line) => JSON.parse(line));

test("appendCheckRow keeps per item phase the newest row and the newest red before a product change (T-6.1)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { redBefore, otherPhase, otherItem, newest } = compactedLog(root);
  assert.deepEqual(loggedRows(root), [redBefore, otherPhase, otherItem, newest]);
});

test("latestCheck reads the newest row and redBeforeChange the kept red (T-6.2)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { redBefore, newest } = compactedLog(root);
  assert.deepEqual(latestCheck(root, "20261109-a", 2), newest);
  assert.deepEqual(redBeforeChange(root, "20261109-a", 2), redBefore);
});

test("redBeforeChange is null when every red came after a product change, and for a row without the field (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  appendCheckRow(root, row({ ok: false, product_changed: true, steps: RED }));
  assert.equal(redBeforeChange(root, "20261109-a", 2), null);
  const legacy: Record<string, unknown> = { ...row({ ok: false, steps: RED }), phase: 4 };
  delete legacy.product_changed;
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.checkLog), `${JSON.stringify(legacy)}\n`);
  assert.equal(redBeforeChange(root, "20261109-a", 4), null);
});

test("an append leaves no temporary file in the state folder (T-6.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  compactedLog(root);
  assert.deepEqual(readdirSync(stateDir(root)).filter((name) => name.endsWith(".tmp")), []);
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

test("dropItemChecks removes every row of the closed item and keeps other items' rows", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { otherItem } = compactedLog(root);
  dropItemChecks(root, "20261109-a");
  assert.deepEqual(loggedRows(root), [otherItem]);
  assert.equal(latestCheck(root, "20261109-a", 2), null);
  assert.equal(redBeforeChange(root, "20261109-a", 2), null);
});

test("dropItemChecks creates no log when there is none", (t) => {
  const root = withProject(t, { host: true, picket: false });
  dropItemChecks(root, "20261109-a");
  assert.equal(existsSync(statePath(root, STATE_FILES.checkLog)), false);
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
