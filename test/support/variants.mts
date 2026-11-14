import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";

export type Spelling<T> = { label: string; input: T };

export type Family<T> = { name: string; spell: (seed: T) => Spelling<T>[] };

export type ClosureCheck<T> = { family: Family<T>; seeds: T[] };

export type Closure<T, R> = {
  guard: string;
  run: (input: T, t: TestContext) => R;
  closed: (output: R) => boolean;
  checks: ClosureCheck<T>[];
};

export function asWritten<T>(show: (input: T) => string): Family<T> {
  return { name: "as written", spell: (seed) => [{ label: show(seed), input: seed }] };
}

export function openSpellings<T, R>(closure: Closure<T, R>, check: ClosureCheck<T>, t: TestContext): Spelling<T>[] {
  const spellings = check.seeds.flatMap((seed) => check.family.spell(seed));
  return spellings.filter((spelling) => !closure.closed(closure.run(spelling.input, t)));
}

export function closureFailure(guard: string, familyName: string, labels: string[]): string {
  return [`${guard} is open under ${familyName} for:`, ...labels].join("\n");
}

export function closureTests<T, R>(closure: Closure<T, R>): void {
  for (const check of closure.checks) {
    test(`${closure.guard} stays closed under ${check.family.name}`, (t) => {
      const labels = openSpellings(closure, check, t).map((spelling) => spelling.label);
      assert.deepEqual(labels, [], closureFailure(closure.guard, check.family.name, labels));
    });
  }
}
