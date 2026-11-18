import { test } from "node:test";
import assert from "node:assert/strict";
import { testerCheck, testerRow, testerSuite } from "../lib/tester-measures.mjs";

function run({ found = null, false_alarms = 0, questions_right = null, cost_usd = 2, wall_ms = 60_000 }) {
  const signature = `found=${found} false_alarms=${false_alarms} questions_right=${questions_right}`;
  return { cost_usd, wall_ms, grade: { tester: { verdict: "CHANGES REQUIRED", found, false_alarms, questions_right, signature } } };
}

function row(task, key_kind, fields) {
  return { task, key_kind, n: 3, found: null, false_alarms: 0, questions_right: null, consistent: true, cost_mean: 2, wall_p50: 60, ...fields };
}

test("two defect runs, one found and one missed, give a found share of 0.5 and are not consistent (T-3.1)", () => {
  const got = testerRow("test-01", [run({ found: true, cost_usd: 2, wall_ms: 60_000 }), run({ found: false, cost_usd: 4, wall_ms: 90_000 })]);
  assert.deepEqual(got, { task: "test-01", key_kind: "defect", n: 2, found: 0.5, false_alarms: 0, questions_right: null, consistent: false, cost_mean: 3, wall_p50: 60 });
});

test("two trap runs with 0 and 2 false alarms give one false alarm per run and no found share (T-3.1)", () => {
  const got = testerRow("test-04", [run({ false_alarms: 0 }), run({ false_alarms: 2 })]);
  assert.deepEqual(got, { task: "test-04", key_kind: "trap", n: 2, found: null, false_alarms: 1, questions_right: null, consistent: false, cost_mean: 2, wall_p50: 60 });
});

test("two equal silent runs give a questions-right share of 1 and are consistent (T-3.1)", () => {
  const got = testerRow("test-06", [run({ questions_right: true }), run({ questions_right: true })]);
  assert.deepEqual(got, { task: "test-06", key_kind: "silent", n: 2, found: null, false_alarms: 0, questions_right: 1, consistent: true, cost_mean: 2, wall_p50: 60 });
});

test("the suite takes catch rate from defect runs, alarms over every run and questions from silent runs (T-3.2)", () => {
  const rows = [
    row("test-01", "defect", { n: 2, found: 0.5, false_alarms: 1 }),
    row("test-04", "trap", { n: 2, false_alarms: 2 }),
    row("test-06", "silent", { n: 4, questions_right: 0.75 }),
  ];
  assert.deepEqual(testerSuite(rows), { catch_rate: 0.5, false_alarms: 0.75, questions_right: 0.75, consistent: 3 });
});

const DEFECTS = ["test-01", "test-02", "test-03"];

test("found deltas of (-1, -1, -1) fail with defects found fell (T-3.3)", () => {
  const before = DEFECTS.map((task) => row(task, "defect", { found: 1 }));
  const after = DEFECTS.map((task) => row(task, "defect", { found: 0 }));
  const { fails, found } = testerCheck(before, after);
  assert.deepEqual(fails, ["defects found fell by 100% on average over 3 paired task(s) (limit 10%)"]);
  assert.deepEqual(found, { n: 3, mean: -1, se: 0.05 });
});

test("false alarm deltas of (1, 1, 1) fail with false alarms rose (T-3.3)", () => {
  const before = DEFECTS.map((task) => row(task, "trap", { false_alarms: 0 }));
  const after = DEFECTS.map((task) => row(task, "trap", { false_alarms: 1 }));
  assert.deepEqual(testerCheck(before, after).fails, ["false alarms rose by 1.00 per run on average over 3 paired task(s) (limit 0.10)"]);
});

test("a silent delta of -1 fails with questions asked rightly fell (T-3.3)", () => {
  const { fails } = testerCheck([row("test-06", "silent", { questions_right: 1 })], [row("test-06", "silent", { questions_right: 0 })]);
  assert.deepEqual(fails, ["questions asked rightly fell by 100% on average over 1 paired task(s) (limit 10%)"]);
});

test("identical rows fail nothing (T-3.3)", () => {
  const rows = [row("test-01", "defect", { found: 0.5 }), row("test-04", "trap", { false_alarms: 1 }), row("test-06", "silent", { questions_right: 1 })];
  assert.deepEqual(testerCheck(rows, rows).fails, []);
});
