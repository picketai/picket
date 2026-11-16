import { closureTests, jsonBodies, jsonSecretSeed, jsonSecretSeeds, loadGuard, tableRows } from "#test/variants.mts";
import type { Card } from "./format.mts";
import { scenarioProblems } from "./rules.mts";

const LITERAL_SECRET = "holds a literal secret";

function postingCard(body: string): Card {
  return {
    header: { id: "S-0001", kind: "normal", covers: [], intent: "closure", status: "active", format: 1 },
    steps: [{ word: "request", line: 1, method: "POST", target: "{orders}/x", headers: [], body }],
  };
}

const configEntries = await loadGuard(() => import("../env/config-entries.mts"), "src/lib/shared/env/config-entries.mts");

closureTests({
  guard: "scenarioProblems",
  grammar: jsonBodies,
  seeds: jsonSecretSeeds,
  rows: [{ table: tableRows<string>(configEntries, "SECRET_WORDS"), key: (word) => word, seedsOf: (word) => [jsonSecretSeed(word)] }],
  run: (body: string) => scenarioProblems(postingCard(body), ["orders"]),
  closed: (problems) => problems.some((problem) => problem.includes(LITERAL_SECRET)),
});
