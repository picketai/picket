const DEFAULT_BUDGET_USD = 10;

export function taskBudget(task, budgetUsd) {
  return budgetUsd ?? task.budget_usd ?? DEFAULT_BUDGET_USD;
}

function runsToDo(task, runs, records) {
  const recorded = new Set(records.filter((r) => r.task === task.id).map((r) => r.run));
  return Array.from({ length: runs }, (_, i) => i + 1).filter((run) => !recorded.has(run));
}

export function plannedSpend({ tasks, runs, budgetUsd, records }) {
  const rows = tasks.map((task) => ({ id: task.id, lane: task.lane, budget: taskBudget(task, budgetUsd), runs: runsToDo(task, runs, records) }));
  const total = rows.reduce((sum, row) => sum + row.budget * row.runs.length, 0);
  return { rows, total };
}

function cents(usd) {
  return Math.round(usd * 100);
}

export function openLedger(maxUsd) {
  return { maxUsd, spentUsd: 0 };
}

export function charge(ledger, usd) {
  return { ...ledger, spentUsd: ledger.spentUsd + usd };
}

export function capLeft(ledger) {
  return Math.max(0, cents(ledger.maxUsd) - cents(ledger.spentUsd)) / 100;
}

export function callLimit(ledger, budgetUsd) {
  const left = capLeft(ledger);
  return left === 0 ? null : Math.min(budgetUsd, left);
}

export function budgetRefusal(budgetUsd) {
  if (budgetUsd === null) return null;
  return Number.isFinite(budgetUsd) && budgetUsd > 0 ? null : "--budget-usd needs a positive number of dollars";
}

export function spendRefusal(maxUsd, total) {
  if (!Number.isFinite(maxUsd) || maxUsd < 0) return "a real run needs --max-usd <dollars>";
  if (!Number.isFinite(total)) return "the planned spend is not a number; check every task's budget_usd";
  if (cents(total) > cents(maxUsd)) return `planned $${total.toFixed(2)} is over --max-usd $${maxUsd.toFixed(2)}`;
  return null;
}
