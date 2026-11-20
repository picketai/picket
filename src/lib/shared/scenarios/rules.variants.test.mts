import { closureTests, JSON_SECRET_VALUE, jsonBodies, jsonSecretSeed, jsonSecretSeeds, loadGuard, tableRows } from "#test/variants.mts";
import type { Card } from "./format.mts";
import type { Family, Grammar } from "#test/variants.mts";
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

function fillingCard(label: string): Card {
  return {
    header: { id: "S-0001", kind: "normal", covers: [], intent: "closure", status: "active", format: 1 },
    steps: [
      { word: "open", line: 1, target: "{web}/" },
      { word: "fill", line: 2, label, value: JSON_SECRET_VALUE },
    ],
  };
}

function splitIn(label: string, joint: string): string {
  const half = Math.ceil(label.length / 2);
  return `${label.slice(0, half)}${joint}${label.slice(half)}`;
}

const labelSpellings: Family<string, string> = {
  name: "label spellings",
  spell: (word) =>
    [word.toUpperCase(), `${word[0].toUpperCase()}${word.slice(1)}`, `Your ${word}`, `New ${word} (again)`, `${word}:`, splitIn(word, " "), splitIn(word, "-")].map((label) => ({ label, input: label })),
};

const fillLabels: Grammar<string, string> = { name: "fill labels", written: (word) => word, label: (label) => label, families: [labelSpellings] };

closureTests({
  guard: "scenarioProblems on fill",
  grammar: fillLabels,
  seeds: [],
  rows: [{ table: tableRows<string>(configEntries, "SECRET_WORDS"), key: (word) => word, seedsOf: (word) => [word] }],
  run: (label: string) => scenarioProblems(fillingCard(label), ["web"]),
  closed: (problems) => problems.some((problem) => problem.includes(LITERAL_SECRET)),
});
