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

export const JSON_SECRET_VALUE = "Kval9";

const JSON_SECRET_KEYS = ["password", "pwd", "secret", "token", "api_key", "apikey", "signature", "credential", "accountkey", "sharedaccesskey", "authCode", "passcode", "code", "auth_code", "code_verifier"];

const NESTED_SECRET_PAIRS = [
  { secret: { value: JSON_SECRET_VALUE } },
  { tokens: [JSON_SECRET_VALUE] },
  { password: { items: [{ v: JSON_SECRET_VALUE }] } },
];

export const jsonSecretSeeds: string[] = [...JSON_SECRET_KEYS.map((key) => ({ [key]: JSON_SECRET_VALUE })), ...NESTED_SECRET_PAIRS].map((pair) => JSON.stringify(pair));

function onlyPair(seed: string): [string, unknown] {
  const pairs = Object.entries(JSON.parse(seed) as Record<string, unknown>);
  if (pairs.length !== 1) throw new Error(`a JSON seed holds one key, got ${seed}`);
  return pairs[0];
}

export const jsonPlaces: Family<string> = {
  name: "JSON places",
  spell: (seed) => {
    const [key, value] = onlyPair(seed);
    const pair = { [key]: value };
    return spelled([
      JSON.stringify({ sku: "PKT-a", ...pair }),
      JSON.stringify({ order: { customer: pair } }),
      JSON.stringify([{ sku: "PKT-a" }, pair]),
      JSON.stringify({ items: [{ auth: pair }] }),
      JSON.stringify({ sku: "PKT-a", ...pair }, null, 2),
    ]);
  },
};

export const jsonKeySpellings: Family<string> = {
  name: "key spellings",
  spell: (seed) => {
    const [key, value] = onlyPair(seed);
    const keys = [key.toUpperCase(), `${key[0].toUpperCase()}${key.slice(1)}`, `user_${key}`, `x-${key.replaceAll("_", "-")}`, `${key}Hash`];
    return spelled(keys.map((spelledKey) => JSON.stringify({ [spelledKey]: value })));
  },
};

export type Invocation = { argv: string[]; heredocs: string[] };

type InterpreterFlags = { long: Record<string, string>; attached?: true; clusterLetter?: string; leading: string[] };

const INTERPRETER_FLAGS: Record<string, InterpreterFlags> = {
  node: { long: { "-e": "--eval" }, clusterLetter: "p", leading: ["--no-warnings"] },
  python3: { long: {}, clusterLetter: "B", leading: ["-X", "utf8"] },
  ruby: { long: {}, clusterLetter: "w", leading: ["-w"] },
  php: { long: {}, attached: true, leading: ["-c", "php.ini"] },
  lua: { long: {}, attached: true, leading: ["-l", "mod"] },
  awk: { long: { "-e": "--source" }, attached: true, leading: ["-F", ":"] },
};

function flagsOf(interpreter: string): InterpreterFlags {
  const flags = INTERPRETER_FLAGS[interpreter];
  if (flags === undefined) throw new Error(`no flag table row for the interpreter ${interpreter}`);
  return flags;
}

export function invocationLabel({ argv, heredocs }: Invocation): string {
  return [argv.join(" "), ...heredocs.map((program) => `<< ${program}`)].join(" ");
}

function invocations(argvs: string[][], heredocs: string[]): Spelling<Invocation>[] {
  return argvs.map((argv) => {
    const input = { argv, heredocs };
    return { label: invocationLabel(input), input };
  });
}

function longSpellings(interpreter: string, long: string | undefined, program: string): string[][] {
  return long === undefined ? [] : [[interpreter, long, program], [interpreter, `${long}=${program}`]];
}

export const programFlagSpellings: Family<Invocation> = {
  name: "program flag spellings",
  spell: ({ argv: [interpreter, flag, program] }) => {
    const { long, attached, clusterLetter, leading } = flagsOf(interpreter);
    return invocations([
      ...longSpellings(interpreter, long[flag], program),
      ...(attached ? [[interpreter, `${flag}${program}`]] : []),
      ...(clusterLetter === undefined ? [] : [[interpreter, `-${clusterLetter}${flag.slice(1)}`, program]]),
      [interpreter, ...leading, flag, program],
    ], []);
  },
};

export const stdinSpellings: Family<Invocation> = {
  name: "stdin spellings",
  spell: ({ argv: [interpreter], heredocs }) => {
    const { leading } = flagsOf(interpreter);
    return invocations([[interpreter, "-"], [interpreter, ...leading, "-"]], heredocs);
  },
};

const INTERPRETER_NAMES: Record<string, string[]> = {
  python3: ["python3.14", "python3.14t", "pypy3", "py"],
  node: ["nodejs"],
  ruby: ["ruby3.3"],
  perl: ["perl5.40"],
  php: ["php8.3"],
  lua: ["lua5.4", "luajit"],
  awk: ["gawk", "mawk", "nawk"],
  tclsh: ["tclsh8.6"],
};

function namesOf(interpreter: string): string[] {
  const names = INTERPRETER_NAMES[interpreter];
  if (names === undefined) throw new Error(`no name table row for the interpreter ${interpreter}`);
  return names;
}

function nameSpellings(interpreter: string): string[] {
  const names = [interpreter, ...namesOf(interpreter)];
  return [...names.slice(1), ...names.flatMap((name) => [`/usr/bin/${name}`, `${name}.exe`])];
}

export const interpreterNames: Family<Invocation> = {
  name: "interpreter names",
  spell: ({ argv: [interpreter, ...rest], heredocs }) => invocations(nameSpellings(interpreter).map((name) => [name, ...rest]), heredocs),
};

function sentenceParts(sentence: string): { inner: string; bare: string } {
  if (!sentence.endsWith(".")) throw new Error(`a sentence seed ends with a period, got ${sentence}`);
  const inner = `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  return { inner, bare: inner.slice(0, -1) };
}

export function distractorSentences(distractor: string): Family<string> {
  return {
    name: "distractor sentences",
    spell: (sentence) => {
      const { inner } = sentenceParts(sentence);
      return spelled([`${distractor}. ${sentence}`, `${sentence} ${distractor}.`, `${distractor}, and ${inner}`, `${distractor}\n${sentence}`]);
    },
  };
}

const QUOTES: [string, string][] = [["\"", "\""], ["`", "`"], ["“", "”"], ["'", "'"]];

export const quotedSpans: Family<string> = {
  name: "quoted spans",
  spell: (sentence) => {
    const { bare } = sentenceParts(sentence);
    const fromTicket = QUOTES.map(([open, close]) => `Implement ${open}${bare}${close} from the ticket.`);
    return spelled([...fromTicket, `Make the API match the spec: "${bare}".`]);
  },
};

export type ListSeed = { label: string; lines: string[] };

const DRIVE_HEADER = "    drive:";

export function listPlacements(valid: string[]): Family<ListSeed> {
  const placed = (label: string, lines: string[]): Spelling<ListSeed> => ({ label, input: { label, lines: [DRIVE_HEADER, ...lines] } });
  return {
    name: "list placements",
    spell: ({ label, lines }) => [
      placed(`${label}, alone`, lines),
      placed(`${label}, before a valid check`, [...lines, ...valid]),
      placed(`${label}, after a valid check`, [...valid, ...lines]),
    ],
  };
}

function numberLabel(n: number): string {
  return Object.is(n, -0) ? "-0" : String(n);
}

export const outOfDomainNumbers: Family<number> = {
  name: "out-of-domain numbers",
  spell: (n) => [NaN, 0, -0, -n, Infinity, -Infinity].map((input) => ({ label: numberLabel(input), input })),
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
