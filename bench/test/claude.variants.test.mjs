import { closureTests, outOfDomainNumbers } from "#test/variants.mts";
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
  run: (maxBudgetUsd) => throws(() => claudeArgs({ maxBudgetUsd })),
  closed: (threw) => threw,
  checks: [{ family: outOfDomainNumbers, seeds: [2] }],
});
