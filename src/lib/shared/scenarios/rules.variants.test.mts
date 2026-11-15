import { asWritten, closureTests, jsonKeySpellings, jsonPlaces, jsonSecretSeeds } from "#test/variants.mts";
import type { Card } from "./format.mts";
import { scenarioProblems } from "./rules.mts";

const LITERAL_SECRET = "holds a literal secret";

function postingCard(body: string): Card {
  return {
    header: { id: "S-0001", kind: "normal", covers: [], intent: "closure", status: "active", format: 1 },
    steps: [{ word: "request", line: 1, method: "POST", target: "{orders}/x", headers: [], body }],
  };
}

closureTests({
  guard: "scenarioProblems",
  run: (body: string) => scenarioProblems(postingCard(body), ["orders"]),
  closed: (problems) => problems.some((problem) => problem.includes(LITERAL_SECRET)),
  checks: [
    { family: asWritten((body: string) => body), seeds: jsonSecretSeeds },
    { family: jsonPlaces, seeds: jsonSecretSeeds },
    { family: jsonKeySpellings, seeds: jsonSecretSeeds },
  ],
});
