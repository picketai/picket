import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetRefusal, callLimit, capLeft, charge, openLedger, plannedSpend, runRefusal, spendRefusal, taskBudget } from "../lib/spend.mjs";

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

test("refuses a --budget-usd that is not a positive number", () => {
  for (const budget of [NaN, 0, -5, Infinity]) assert.match(budgetRefusal(budget), /--budget-usd/, String(budget));
  assert.equal(budgetRefusal(null), null);
  assert.equal(budgetRefusal(3), null);
});

test("refuses a planned total that is not a number", () => {
  const { total } = plannedSpend({ tasks: [{ id: "x", lane: "fast", budget_usd: "five" }], runs: 1, budgetUsd: null, records: [] });
  assert.match(spendRefusal(100, total), /not a number/);
  assert.match(spendRefusal(100, NaN), /not a number/);
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

test("limits a call to the cap left", () => {
  assert.equal(callLimit(charge(openLedger(10), 7.5), 5), 2.5);
  assert.equal(callLimit(charge(openLedger(10), 2), 5), 5);
});

test("stops the suite when no cap is left", () => {
  for (const spent of [10, 10.004, 12]) {
    const ledger = charge(openLedger(10), spent);
    assert.equal(capLeft(ledger), 0, String(spent));
    assert.equal(callLimit(ledger, 5), null, String(spent));
  }
});

function refusalFor(task, budgetUsd) {
  const { rows, total } = plannedSpend({ tasks: [task], runs: 1, budgetUsd, records: [] });
  return runRefusal({ maxUsd: 100, budgetUsd, rows, total });
}

test("refuses a task whose budget_usd is not a positive number", () => {
  for (const budget_usd of [0, "2"]) {
    assert.equal(refusalFor({ id: "fast-a", lane: "fast", budget_usd }, null), "task fast-a: budget_usd needs a positive number of dollars", String(budget_usd));
  }
});

test("a valid --budget-usd overrides a bad task budget_usd", () => {
  assert.equal(refusalFor({ id: "fast-a", lane: "fast", budget_usd: 0 }, 3), null);
});

test("refuses a bad task budget_usd even when its runs are recorded", () => {
  const { rows, total } = plannedSpend({ tasks: [{ id: "fast-a", lane: "fast", budget_usd: -1 }], runs: 1, budgetUsd: null, records: [{ task: "fast-a", run: 1 }] });
  assert.equal(runRefusal({ maxUsd: 100, budgetUsd: null, rows, total }), "task fast-a: budget_usd needs a positive number of dollars");
});

test("a bad --budget-usd is refused before a bad task budget_usd", () => {
  assert.equal(refusalFor({ id: "fast-a", lane: "fast", budget_usd: 0 }, NaN), "--budget-usd needs a positive number of dollars");
});

test("leaves a resumed file's recorded cost out of the cap", () => {
  const records = [
    { task: "fast-a", run: 1, cost_usd: 18 },
    { task: "fast-a", run: 2, cost_usd: 12 },
  ];
  const { total } = plannedSpend({ tasks: [TASKS[0]], runs: 3, budgetUsd: null, records });
  assert.equal(total, 5);
  assert.equal(spendRefusal(10, total), null);
  assert.equal(callLimit(openLedger(10), 5), 5);
});
