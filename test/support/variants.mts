import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";

export type Spelling<I> = { label: string; input: I };

export type Family<S, I> = { name: string; spell: (seed: S) => Spelling<I>[] };

export type Grammar<S, I> = {
  name: string;
  written: (seed: S) => I;
  label: (input: I) => string;
  families: readonly Family<S, I>[];
};

export type Loaded<M> = { path: string; module: Partial<M> | null; missing: string | null };

export type TableRows<Row> = { table: string; path: string; rows: readonly Row[]; missing: string | null };

export type RowSource<Row, S> = { table: TableRows<Row>; key: (row: Row) => string; seedsOf: (row: Row) => S[] };

export type Closure<S, I, R> = {
  guard: string;
  grammar: Grammar<S, I>;
  seeds: S[];
  probes?: I[];
  rows?: RowSource<any, S>[];
  run: (input: I, t: TestContext) => R;
  closed: (output: R) => boolean;
};

export async function loadGuard<M>(load: () => Promise<M>, path: string): Promise<Loaded<M>> {
  try {
    return { path, module: await load(), missing: null };
  } catch (error) {
    return { path, module: null, missing: `${path} does not load: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function exportOf(loaded: Loaded<object>, name: string): { value: unknown; missing: string | null } {
  if (loaded.module === null) return { value: undefined, missing: loaded.missing };
  const value = (loaded.module as Record<string, unknown>)[name];
  return value === undefined ? { value, missing: `${name} is not exported by ${loaded.path}` } : { value, missing: null };
}

export function loadedExport<M extends object, K extends keyof M>(loaded: Loaded<M>, name: K & string): M[K] {
  const { value, missing } = exportOf(loaded, name);
  if (missing !== null) throw new Error(missing);
  return value as M[K];
}

function rowsOf(value: unknown): readonly unknown[] | null {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  if (value instanceof Map) return [...value.keys()];
  return null;
}

export function tableRows<Row>(loaded: Loaded<object>, name: string): TableRows<Row> {
  const table = { table: name, path: loaded.path };
  const { value, missing } = exportOf(loaded, name);
  if (missing !== null) return { ...table, rows: [], missing };
  const rows = rowsOf(value);
  if (rows === null) return { ...table, rows: [], missing: `${name} in ${loaded.path} is not an array, a Set or a Map` };
  return { ...table, rows: rows as Row[], missing: null };
}

function spelled(inputs: string[]): Spelling<string>[] {
  return inputs.map((input) => ({ label: input, input }));
}

const verbatim = (text: string): string => text;

const PAIR_ADDRESSES: ((pair: string) => string)[] = [
  (pair) => `https://a.example.com/x?${pair}`,
  (pair) => `https://a.example.com/x?a=1&${pair}`,
  (pair) => `Server=h;${pair}`,
  (pair) => `jdbc:postgresql://h/db?user=a&${pair}`,
  (pair) => `redis://h:6379?${pair}`,
];

export const pairPlaces: Family<string, string> = {
  name: "pair places",
  spell: (pair) => spelled(PAIR_ADDRESSES.map((place) => place(pair))),
};

const NAME_PREFIXES = ["ssl", "client_", "access_", "X-Amz-"];

function splitPair(pair: string): { name: string; value: string } {
  const at = pair.indexOf("=");
  if (at < 1) throw new Error(`a pair seed needs name=value, got ${pair}`);
  return { name: pair.slice(0, at), value: pair.slice(at + 1) };
}

export const pairNames: Family<string, string> = {
  name: "pair names",
  spell: (pair) => {
    const { name, value } = splitPair(pair);
    const names = [...NAME_PREFIXES.map((prefix) => `${prefix}${name}`), name.toUpperCase()];
    return spelled(names.map((spelledName) => `https://a.example.com/x?${spelledName}=${value}`));
  },
};

export const pairs: Grammar<string, string> = {
  name: "pairs",
  written: (pair) => `https://a.example.com/x?${pair}`,
  label: verbatim,
  families: [pairPlaces, pairNames],
};

export const JSON_SECRET_VALUE = "Kval9";

export const JSON_SECRET_KEYS = ["password", "pwd", "secret", "token", "api_key", "apikey", "signature", "credential", "accountkey", "sharedaccesskey", "authCode", "passcode", "code", "auth_code", "code_verifier"];

const NESTED_SECRET_PAIRS = [
  { secret: { value: JSON_SECRET_VALUE } },
  { tokens: [JSON_SECRET_VALUE] },
  { password: { items: [{ v: JSON_SECRET_VALUE }] } },
];

export function jsonSecretSeed(key: string): string {
  return JSON.stringify({ [key]: JSON_SECRET_VALUE });
}

export const jsonSecretSeeds: string[] = [...JSON_SECRET_KEYS.map(jsonSecretSeed), ...NESTED_SECRET_PAIRS.map((pair) => JSON.stringify(pair))];

function onlyPair(seed: string): [string, unknown] {
  const entries = Object.entries(JSON.parse(seed) as Record<string, unknown>);
  if (entries.length !== 1) throw new Error(`a JSON seed holds one key, got ${seed}`);
  return entries[0];
}

export const jsonPlaces: Family<string, string> = {
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

export const jsonKeySpellings: Family<string, string> = {
  name: "key spellings",
  spell: (seed) => {
    const [key, value] = onlyPair(seed);
    const keys = [key.toUpperCase(), `${key[0].toUpperCase()}${key.slice(1)}`, `user_${key}`, `x-${key.replaceAll("_", "-")}`, `${key}Hash`];
    return spelled(keys.map((spelledKey) => JSON.stringify({ [spelledKey]: value })));
  },
};

export const jsonBodies: Grammar<string, string> = {
  name: "JSON bodies",
  written: verbatim,
  label: verbatim,
  families: [jsonPlaces, jsonKeySpellings],
};

export type Invocation = { argv: string[]; heredocs: string[] };

type InterpreterFlags = { programFlags: string[]; long: Record<string, string>; attached?: true; clusterLetter?: string; leading: string[] };

const INTERPRETER_FLAGS: Record<string, InterpreterFlags> = {
  node: { programFlags: ["-e"], long: { "-e": "--eval" }, clusterLetter: "p", leading: ["--no-warnings"] },
  python3: { programFlags: ["-c"], long: {}, attached: true, clusterLetter: "B", leading: ["-X", "utf8"] },
  ruby: { programFlags: ["-e"], long: {}, attached: true, clusterLetter: "w", leading: ["-w"] },
  perl: { programFlags: ["-e"], long: {}, attached: true, clusterLetter: "w", leading: ["-w"] },
  php: { programFlags: ["-r"], long: {}, attached: true, clusterLetter: "n", leading: ["-c", "php.ini"] },
  lua: { programFlags: ["-e"], long: {}, attached: true, leading: ["-l", "mod"] },
  awk: { programFlags: ["-e"], long: { "-e": "--source" }, attached: true, clusterLetter: "b", leading: ["-F", ":"] },
  tclsh: { programFlags: [], long: {}, leading: ["-encoding", "utf-8"] },
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

function clusterSpellings(interpreter: string, flag: string, program: string, { attached, clusterLetter }: InterpreterFlags): string[][] {
  if (clusterLetter === undefined) return [];
  const cluster = `-${clusterLetter}${flag.slice(1)}`;
  return [[interpreter, cluster, program], ...(attached ? [[interpreter, `${cluster}${program}`]] : [])];
}

export const programFlagSpellings: Family<Invocation, Invocation> = {
  name: "program flag spellings",
  spell: ({ argv: [interpreter, flag, program] }) => {
    const flags = flagsOf(interpreter);
    if (!flags.programFlags.includes(flag)) return [];
    return invocations([
      ...longSpellings(interpreter, flags.long[flag], program),
      ...(flags.attached ? [[interpreter, `${flag}${program}`]] : []),
      ...clusterSpellings(interpreter, flag, program, flags),
      [interpreter, ...flags.leading, flag, program],
    ], []);
  },
};

const STDIN_PATHS = ["-", "/dev/stdin", "/dev/fd/0", "/proc/self/fd/0"];

export const stdinSpellings: Family<Invocation, Invocation> = {
  name: "stdin spellings",
  spell: ({ argv: [interpreter], heredocs }) => {
    const { leading } = flagsOf(interpreter);
    if (heredocs.length === 0) return [];
    return invocations([...STDIN_PATHS.map((path) => [interpreter, path]), [interpreter, ...leading, "-"]], heredocs);
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

export const interpreterNames: Family<Invocation, Invocation> = {
  name: "interpreter names",
  spell: ({ argv: [interpreter, ...rest], heredocs }) => invocations(nameSpellings(interpreter).map((name) => [name, ...rest]), heredocs),
};

export const interpreterArgv: Grammar<Invocation, Invocation> = {
  name: "interpreter argv",
  written: (invocation) => invocation,
  label: invocationLabel,
  families: [programFlagSpellings, stdinSpellings, interpreterNames],
};

export const shellCommands: Grammar<string, string> = {
  name: "shell commands",
  written: verbatim,
  label: verbatim,
  families: [],
};

function sentenceParts(sentence: string): { inner: string; bare: string } {
  if (!sentence.endsWith(".")) throw new Error(`a sentence seed ends with a period, got ${sentence}`);
  const inner = `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  return { inner, bare: inner.slice(0, -1) };
}

export function distractorSentences(distractor: string): Family<string, string> {
  return {
    name: "distractor sentences",
    spell: (sentence) => {
      const { inner } = sentenceParts(sentence);
      return spelled([`${distractor}. ${sentence}`, `${sentence} ${distractor}.`, `${distractor}, and ${inner}`, `${distractor}\n${sentence}`]);
    },
  };
}

const QUOTES: [string, string][] = [["\"", "\""], ["`", "`"], ["“", "”"], ["'", "'"]];

export const quotedSpans: Family<string, string> = {
  name: "quoted spans",
  spell: (sentence) => {
    const { bare } = sentenceParts(sentence);
    const fromTicket = QUOTES.map(([open, close]) => `Implement ${open}${bare}${close} from the ticket.`);
    return spelled([...fromTicket, `Make the API match the spec: "${bare}".`]);
  },
};

export function requestProse(distractor: string): Grammar<string, string> {
  return {
    name: "request prose",
    written: verbatim,
    label: verbatim,
    families: [distractorSentences(distractor), quotedSpans],
  };
}

export type ListSeed = { label: string; lines: string[] };

const DRIVE_HEADER = "    drive:";

function driveList(label: string, lines: string[]): ListSeed {
  return { label, lines: [DRIVE_HEADER, ...lines] };
}

export function listPlacements(valid: string[]): Family<ListSeed, ListSeed> {
  const placed = (label: string, lines: string[]): Spelling<ListSeed> => ({ label, input: driveList(label, lines) });
  return {
    name: "list placements",
    spell: ({ label, lines }) => [
      placed(`${label}, alone`, lines),
      placed(`${label}, before a valid check`, [...lines, ...valid]),
      placed(`${label}, after a valid check`, [...valid, ...lines]),
    ],
  };
}

export function declaredLists(valid: string[]): Grammar<ListSeed, ListSeed> {
  return {
    name: "declared lists",
    written: ({ label, lines }) => driveList(label, lines),
    label: (input) => input.label,
    families: [listPlacements(valid)],
  };
}

function numberLabel(n: number): string {
  return Object.is(n, -0) ? "-0" : String(n);
}

export const outOfDomainNumbers: Family<number, number> = {
  name: "out-of-domain numbers",
  spell: (n) => [NaN, 0, -0, -n, Infinity, -Infinity].map((input) => ({ label: numberLabel(input), input })),
};

export const numbers: Grammar<number, number> = {
  name: "numbers",
  written: (n) => -n,
  label: numberLabel,
  families: [outOfDomainNumbers],
};

export type EditSeed = { tool: "Edit" | "Write"; rel: string };

export type EditPathForm = "relative" | "absolute" | "dot" | "parent" | "upper-case on win32" | "symbolic link";

export type EditInput = EditSeed & { form: EditPathForm };

const EDIT_PATH_LABELS: Record<EditPathForm, (rel: string) => string> = {
  relative: (rel) => rel,
  absolute: (rel) => `absolute ${rel}`,
  dot: (rel) => `./${rel}`,
  parent: (rel) => `services/../${rel}`,
  "upper-case on win32": (rel) => `upper-case folder on win32 ${rel}`,
  "symbolic link": (rel) => `symbolic link ${rel}`,
};

function editPathLabel({ tool, rel, form }: EditInput): string {
  return `${tool} ${EDIT_PATH_LABELS[form](rel)}`;
}

const SPELLED_EDIT_FORMS: EditPathForm[] = ["absolute", "dot", "parent", "upper-case on win32", "symbolic link"];

export const editPathSpellings: Family<EditSeed, EditInput> = {
  name: "path spellings",
  spell: (seed) => SPELLED_EDIT_FORMS.map((form) => {
    const input = { ...seed, form };
    return { label: editPathLabel(input), input };
  }),
};

export const editPaths: Grammar<EditSeed, EditInput> = {
  name: "edit paths",
  written: (seed) => ({ ...seed, form: "relative" }),
  label: editPathLabel,
  families: [editPathSpellings],
};

function distinctByLabel<I>(spellings: Spelling<I>[]): Spelling<I>[] {
  const seen = new Set<string>();
  return spellings.filter(({ label }) => {
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

export function writtenSpellings<S, I>({ grammar, seeds, probes = [] }: Pick<Closure<S, I, unknown>, "grammar" | "seeds" | "probes">): Spelling<I>[] {
  const inputs = [...seeds.map(grammar.written), ...probes];
  return distinctByLabel(inputs.map((input) => ({ label: grammar.label(input), input })));
}

export function familySpellings<S, I>(family: Family<S, I>, seeds: S[]): Spelling<I>[] {
  return distinctByLabel(seeds.flatMap((seed) => family.spell(seed)));
}

export function openSpellings<S, I, R>(closure: Closure<S, I, R>, spellings: Spelling<I>[], t: TestContext): Spelling<I>[] {
  return spellings.filter((spelling) => !closure.closed(closure.run(spelling.input, t)));
}

export function closureFailure(guard: string, familyName: string, labels: string[]): string {
  return [`${guard} is open under ${familyName} for:`, ...labels].join("\n");
}

const AS_WRITTEN = "as written";

function assertClosed<S, I, R>(closure: Closure<S, I, R>, familyName: string, spellings: Spelling<I>[], t: TestContext): void {
  const labels = openSpellings(closure, spellings, t).map((spelling) => spelling.label);
  assert.deepEqual(labels, [], closureFailure(closure.guard, familyName, labels));
}

function rowSeeds<S>(source: RowSource<any, S>): S[] {
  return source.table.rows.flatMap((row) => source.seedsOf(row));
}

export function rowProblems<S, I>(grammar: Grammar<S, I>, source: RowSource<any, S>): string[] {
  const unseeded = source.table.rows.filter((row) => source.seedsOf(row).length === 0);
  const spellingsOf = (seeds: S[]) => seeds.flatMap((seed) => grammar.families.flatMap((family) => family.spell(seed)));
  const unspelled = source.table.rows.filter((row) => {
    const seeds = source.seedsOf(row);
    return seeds.length > 0 && spellingsOf(seeds).length === 0;
  });
  return [
    ...(source.table.missing === null ? [] : [source.table.missing]),
    ...unseeded.map((row) => `${source.key(row)} has no seed`),
    ...unspelled.map((row) => `${source.key(row)} has seeds no family spells`),
  ];
}

function coverageTest<S, I, R>(closure: Closure<S, I, R>, source: RowSource<any, S>): void {
  const { table, path } = source.table;
  test(`${closure.guard} covers every row of ${table}`, () => {
    const problems = rowProblems(closure.grammar, source);
    assert.deepEqual(problems, [], [`${closure.guard} does not cover every row of ${table} in ${path}:`, ...problems].join("\n"));
  });
}

export function closureTests<S, I, R>(closure: Closure<S, I, R>): void {
  const rows = closure.rows ?? [];
  const seeded = { ...closure, seeds: [...closure.seeds, ...rows.flatMap(rowSeeds)] };
  test(`${closure.guard} stays closed ${AS_WRITTEN}`, (t) => assertClosed(closure, AS_WRITTEN, writtenSpellings(seeded), t));
  for (const family of closure.grammar.families) {
    test(`${closure.guard} stays closed under ${family.name}`, (t) => assertClosed(closure, family.name, familySpellings(family, seeded.seeds), t));
  }
  for (const source of rows) coverageTest(closure, source);
}
