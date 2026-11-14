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

function spelled(inputs: string[]): Spelling<string>[] {
  return inputs.map((input) => ({ label: input, input }));
}

const PAIR_ADDRESSES: ((pair: string) => string)[] = [
  (pair) => `https://a.example.com/x?${pair}`,
  (pair) => `https://a.example.com/x?a=1&${pair}`,
  (pair) => `Server=h;${pair}`,
  (pair) => `jdbc:postgresql://h/db?user=a&${pair}`,
  (pair) => `redis://h:6379?${pair}`,
];

export const pairPlaces: Family<string> = {
  name: "pair places",
  spell: (pair) => spelled(PAIR_ADDRESSES.map((place) => place(pair))),
};

const NAME_PREFIXES = ["ssl", "client_", "access_", "X-Amz-"];

function splitPair(pair: string): { name: string; value: string } {
  const at = pair.indexOf("=");
  if (at < 1) throw new Error(`a pair seed needs name=value, got ${pair}`);
  return { name: pair.slice(0, at), value: pair.slice(at + 1) };
}

export const pairNames: Family<string> = {
  name: "pair names",
  spell: (pair) => {
    const { name, value } = splitPair(pair);
    const names = [...NAME_PREFIXES.map((prefix) => `${prefix}${name}`), name.toUpperCase()];
    return spelled(names.map((spelledName) => `https://a.example.com/x?${spelledName}=${value}`));
  },
};

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
