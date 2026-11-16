import { closureTests, loadedExport, loadGuard, numbers } from "#test/variants.mts";

const CAP_USD = 100;
const PLANNED_USD = 5;
const TASK = { id: "fast-a", lane: "fast", budget_usd: 2 };
const isRefusal = (result) => typeof result === "string";

const spend = await loadGuard(() => import("../lib/spend.mjs"), "bench/lib/spend.mjs");
const plannedSpend = (options) => loadedExport(spend, "plannedSpend")(options);
const runRefusal = (options) => loadedExport(spend, "runRefusal")(options);

closureTests({
  guard: "runRefusal --budget-usd",
  grammar: numbers,
  seeds: [2],
  run: (budgetUsd) => {
    const { rows, total } = plannedSpend({ tasks: [TASK], runs: 1, budgetUsd, records: [] });
    return runRefusal({ maxUsd: CAP_USD, budgetUsd, rows, total });
  },
  closed: isRefusal,
});

closureTests({
  guard: "runRefusal --max-usd",
  grammar: numbers,
  seeds: [CAP_USD],
  run: (maxUsd) => runRefusal({ maxUsd, budgetUsd: null, rows: [], total: PLANNED_USD }),
  closed: isRefusal,
});

closureTests({
  guard: "runRefusal task budget_usd",
  grammar: numbers,
  seeds: [2],
  run: (budgetUsd) => {
    const { rows, total } = plannedSpend({ tasks: [{ ...TASK, budget_usd: budgetUsd }], runs: 1, budgetUsd: null, records: [] });
    return runRefusal({ maxUsd: CAP_USD, budgetUsd: null, rows, total });
  },
  closed: isRefusal,
});

closureTests({
  guard: "spendRefusal --max-usd",
  grammar: numbers,
  seeds: [CAP_USD],
  run: (maxUsd) => loadedExport(spend, "spendRefusal")(maxUsd, PLANNED_USD),
  closed: isRefusal,
});
