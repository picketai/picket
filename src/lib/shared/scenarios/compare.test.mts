import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, isBlamed, type ResultClass } from "./compare.mts";
import type { ResultRow, ScenarioOutcome } from "./results.mts";

function base(outcome: ScenarioOutcome): ResultRow {
  return { type: "result", run: "r0", scenario: "S-0001", fingerprint: "sha256:f", key: "k", versions: {}, outcome, attempts: 1, unstable: false, class: "passed", detail: "" };
}

const FAILED = { outcome: "failed" as const, unstable: false };

const CASES: { name: string; cls: ResultClass; blamed: boolean; got: ResultClass }[] = [
  { name: "a pass", cls: "passed", blamed: false, got: classify({ outcome: "passed", unstable: false }, base("failed"), false) },
  { name: "a failure the base passed", cls: "new failure", blamed: true, got: classify(FAILED, base("passed"), false) },
  { name: "a failure the base failed too", cls: "failing before the item", blamed: false, got: classify(FAILED, base("failed"), false) },
  { name: "a failure with no base row", cls: "no base result", blamed: true, got: classify(FAILED, null, false) },
  { name: "a failure with a blocked base row", cls: "no base result", blamed: true, got: classify(FAILED, base("blocked"), false) },
  { name: "a failure of a scenario the item replaces", cls: "replaced by this item", blamed: false, got: classify(FAILED, base("passed"), true) },
  { name: "a failure that passed on the second attempt", cls: "unstable", blamed: false, got: classify({ outcome: "failed", unstable: true }, base("passed"), false) },
  { name: "a blocked run", cls: "blocked", blamed: false, got: classify({ outcome: "blocked", unstable: false }, base("passed"), false) },
  { name: "a scenario not run", cls: "not run", blamed: false, got: classify({ outcome: "not run", unstable: false }, null, false) },
];

for (const { name, cls, blamed, got } of CASES) {
  test(`${name} is classed ${cls} and ${blamed ? "is" : "is not"} blamed on the item (T-3.5)`, () => {
    assert.equal(got, cls);
    assert.equal(isBlamed(got), blamed);
  });
}
