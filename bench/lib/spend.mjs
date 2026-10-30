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

export function spendRefusal(maxUsd, total) {
  if (maxUsd === null || Number.isNaN(maxUsd) || maxUsd < 0) return "a real run needs --max-usd <dollars>";
  if (cents(total) > cents(maxUsd)) return `planned $${total.toFixed(2)} is over --max-usd $${maxUsd.toFixed(2)}`;
  return null;
}
