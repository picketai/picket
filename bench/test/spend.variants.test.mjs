import { closureTests, outOfDomainNumbers } from "#test/variants.mts";
import { plannedSpend, runRefusal } from "../lib/spend.mjs";

const CAP_USD = 100;
const TASK = { id: "fast-a", lane: "fast", budget_usd: 2 };
const isRefusal = (result) => typeof result === "string";

closureTests({
  guard: "runRefusal --budget-usd",
  run: (budgetUsd) => {
    const { rows, total } = plannedSpend({ tasks: [TASK], runs: 1, budgetUsd, records: [] });
    return runRefusal({ maxUsd: CAP_USD, budgetUsd, rows, total });
  },
  closed: isRefusal,
  checks: [{ family: outOfDomainNumbers, seeds: [2] }],
});

closureTests({
  guard: "runRefusal --max-usd",
  run: (maxUsd) => runRefusal({ maxUsd, budgetUsd: null, rows: [], total: 5 }),
  closed: isRefusal,
  checks: [{ family: outOfDomainNumbers, seeds: [CAP_USD] }],
});

closureTests({
  guard: "runRefusal task budget_usd",
  run: (budgetUsd) => {
    const { rows, total } = plannedSpend({ tasks: [{ ...TASK, budget_usd: budgetUsd }], runs: 1, budgetUsd: null, records: [] });
    return runRefusal({ maxUsd: CAP_USD, budgetUsd: null, rows, total });
  },
  closed: isRefusal,
  checks: [{ family: outOfDomainNumbers, seeds: [2] }],
});
