import { closureTests, numbers } from "#test/variants.mts";
import { claudeArgs } from "../lib/claude.mjs";

function throws(call) {
  try {
    call();
    return false;
  } catch {
    return true;
  }
}

closureTests({
  guard: "claudeArgs --max-budget-usd",
  grammar: numbers,
  seeds: [2],
  run: (maxBudgetUsd) => throws(() => claudeArgs({ maxBudgetUsd })),
  closed: (threw) => threw,
});
