import { test } from "node:test";
import assert from "node:assert/strict";
import { plannedSpend, spendRefusal, taskBudget } from "../lib/spend.mjs";

const TASKS = [
  { id: "fast-a", lane: "fast", budget_usd: 5 },
  { id: "order-b", lane: "order" },
];

test("refuses a real run without --max-usd", () => {
  assert.match(spendRefusal(null, 9), /--max-usd/);
  assert.match(spendRefusal(NaN, 9), /--max-usd/);
});

test("refuses a plan over the cap", () => {
  const reason = spendRefusal(24.99, 25);
  assert.match(reason, /\$25\.00/);
  assert.match(reason, /\$24\.99/);
});

test("allows a plan exactly at the cap", () => {
  const { total } = plannedSpend({ tasks: [TASKS[0]], runs: 3, budgetUsd: 0.1, records: [] });
  assert.equal(spendRefusal(0.3, total), null);
});

test("leaves recorded runs out of a resumed plan", () => {
  const records = [{ task: "fast-a", run: 1 }];
  assert.deepEqual(plannedSpend({ tasks: TASKS, runs: 2, budgetUsd: null, records }), {
    rows: [
      { id: "fast-a", lane: "fast", budget: 5, runs: [2] },
      { id: "order-b", lane: "order", budget: 10, runs: [1, 2] },
    ],
    total: 25,
  });
  assert.equal(plannedSpend({ tasks: TASKS, runs: 2, budgetUsd: 3, records }).total, 9);
});

test("a task budget comes from the flag, then the task, then $10", () => {
  assert.equal(taskBudget(TASKS[0], 3), 3);
  assert.equal(taskBudget(TASKS[0], null), 5);
  assert.equal(taskBudget(TASKS[1], null), 10);
});
