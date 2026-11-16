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

export type RowSource<Row, S> = { table: TableRows<Row>; key: (row: Row) => string; seedsOf: (row: Row) => S[]; problems?: (row: Row) => string[] };

export type Closure<S, I, R> = {
  guard: string;
  grammar: Grammar<S, I>;
  seeds: S[];
  probes?: I[];
  rows?: RowSource<any, S>[];
  run: (input: I, t: TestContext) => R | Promise<R>;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function rowsOf(value: unknown): readonly unknown[] | null {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  if (value instanceof Map) return [...value.keys()];
  if (isPlainObject(value)) return Object.keys(value);
  return null;
}

export function tableRows<Row>(loaded: Loaded<object>, name: string): TableRows<Row> {
  const table = { table: name, path: loaded.path };
  const { value, missing } = exportOf(loaded, name);
  if (missing !== null) return { ...table, rows: [], missing };
  const rows = rowsOf(value);
  if (rows === null) return { ...table, rows: [], missing: `${name} in ${loaded.path} is not an array, a Set, a Map or a plain object` };
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

export type ProgramSeed = { interpreter: string; flag: string | null; program: string };

type StdinReading = { bare: boolean; paths: string[]; scriptFlags?: string[]; scriptName?: string; prefix?: string; subcommandReadings?: string[][] };

type Vocabulary = {
  programFlags: string[];
  long?: Record<string, string>;
  attached?: true;
  clusterLetter?: string;
  leading: string[];
  subcommand?: { name: string; before: string[]; after: string[] };
  stdin?: StdinReading;
};

const STDIN_PATHS = ["-", "/dev/stdin", "/dev/fd/0", "/proc/self/fd/0"];
const STDIN_FILES = STDIN_PATHS.slice(1);
const ANY_STDIN: StdinReading = { bare: true, paths: STDIN_PATHS };

const VOCABULARY: Record<string, Vocabulary> = {
  node: { programFlags: ["-e"], long: { "-e": "--eval" }, clusterLetter: "p", leading: ["--no-warnings"], stdin: ANY_STDIN },
  python3: { programFlags: ["-c"], attached: true, clusterLetter: "B", leading: ["-X", "utf8"], stdin: ANY_STDIN },
  ruby: { programFlags: ["-e"], attached: true, clusterLetter: "w", leading: ["-w"], stdin: ANY_STDIN },
  perl: { programFlags: ["-e"], attached: true, clusterLetter: "w", leading: ["-w"], stdin: ANY_STDIN },
  bun: { programFlags: ["-e", "-p"], long: { "-e": "--eval", "-p": "--print" }, leading: ["--smol"], stdin: { bare: false, paths: [], subcommandReadings: [["run", "-"]] } },
  deno: { programFlags: [], leading: [], subcommand: { name: "eval", before: ["-q"], after: ["--quiet"] }, stdin: { bare: false, paths: [], subcommandReadings: [["run", "-"], ["run", "-A", "-"]] } },
  php: { programFlags: ["-r", "-B", "-R", "-E"], attached: true, clusterLetter: "n", leading: ["-c", "php.ini"], stdin: { bare: true, paths: STDIN_FILES, prefix: "<?php " } },
  lua: { programFlags: ["-e"], attached: true, leading: ["-l", "mod"], stdin: ANY_STDIN },
  Rscript: { programFlags: ["-e"], attached: true, leading: ["--vanilla"], stdin: { bare: false, paths: ["-"], scriptFlags: ["-f", "--file"], scriptName: "R" } },
  awk: { programFlags: ["-e"], long: { "-e": "--source" }, attached: true, clusterLetter: "b", leading: ["-F", ":"], stdin: { bare: false, paths: [], scriptFlags: ["-f", "--file", "-E"] } },
  tclsh: { programFlags: [], leading: ["-encoding", "utf-8"], stdin: { bare: true, paths: STDIN_FILES } },
};

function vocabularyOf(interpreter: string): Vocabulary {
  const vocabulary = VOCABULARY[interpreter];
  if (vocabulary === undefined) throw new Error(`no flag table row for the interpreter ${interpreter}`);
  return vocabulary;
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

function scriptReadings(interpreter: string, { scriptFlags = [], scriptName = interpreter }: StdinReading): string[][] {
  return scriptFlags.flatMap((flag) => STDIN_PATHS.flatMap((path) => [[scriptName, flag, path], [scriptName, flag.startsWith("--") ? `${flag}=${path}` : `${flag}${path}`]]));
}

function stdinReadings(interpreter: string, { leading, stdin }: Vocabulary): string[][] {
  if (stdin === undefined) return [];
  const alone = stdin.paths.map((path) => [interpreter, path]);
  const afterLeading = stdin.paths.length === 0 ? [] : [[interpreter, ...leading, stdin.paths[0]]];
  const throughSubcommand = (stdin.subcommandReadings ?? []).map((reading) => [interpreter, ...reading]);
  return [...alone, ...afterLeading, ...scriptReadings(interpreter, stdin), ...throughSubcommand];
}

function writtenStdin(interpreter: string, vocabulary: Vocabulary): string[] {
  if (vocabulary.stdin?.bare) return [interpreter];
  const first = stdinReadings(interpreter, vocabulary)[0];
  if (first === undefined) throw new Error(`the interpreter ${interpreter} reads no standard input in the vocabulary`);
  return first;
}

export function programInvocation({ interpreter, flag, program }: ProgramSeed): Invocation {
  if (flag !== null) return { argv: [interpreter, flag, program], heredocs: [] };
  return { argv: writtenStdin(interpreter, vocabularyOf(interpreter)), heredocs: [program] };
}

function withProgram(seed: ProgramSeed, programs: string[]): Spelling<Invocation>[] {
  return programs.map((program) => {
    const input = programInvocation({ ...seed, program });
    return { label: invocationLabel(input), input };
  });
}

function longSpellings(interpreter: string, long: string | undefined, program: string): string[][] {
  return long === undefined ? [] : [[interpreter, long, program], [interpreter, `${long}=${program}`]];
}

function clusterSpellings(interpreter: string, flag: string, program: string, { attached, clusterLetter }: Vocabulary): string[][] {
  if (clusterLetter === undefined) return [];
  const cluster = `-${clusterLetter}${flag.slice(1)}`;
  return [[interpreter, cluster, program], ...(attached ? [[interpreter, `${cluster}${program}`]] : [])];
}

function flagArgvs(interpreter: string, flag: string, program: string, vocabulary: Vocabulary): string[][] {
  return [
    ...longSpellings(interpreter, vocabulary.long?.[flag], program),
    ...(vocabulary.attached ? [[interpreter, `${flag}${program}`]] : []),
    ...clusterSpellings(interpreter, flag, program, vocabulary),
    [interpreter, ...vocabulary.leading, flag, program],
    [interpreter, flag, program, `${flag}1`],
    [interpreter, flag, program, flag, "1"],
  ];
}

function subcommandArgvs(interpreter: string, program: string, { name, before, after }: NonNullable<Vocabulary["subcommand"]>): string[][] {
  return [[interpreter, ...before, name, program], [interpreter, name, ...after, program]];
}

export const programFlagSpellings: Family<ProgramSeed, Invocation> = {
  name: "program flag spellings",
  spell: ({ interpreter, flag, program }) => {
    const vocabulary = vocabularyOf(interpreter);
    if (flag === null) return [];
    if (flag === vocabulary.subcommand?.name) return invocations(subcommandArgvs(interpreter, program, vocabulary.subcommand), []);
    if (!vocabulary.programFlags.includes(flag)) return [];
    return invocations(flagArgvs(interpreter, flag, program, vocabulary), []);
  },
};

export const stdinSpellings: Family<ProgramSeed, Invocation> = {
  name: "stdin spellings",
  spell: ({ interpreter, flag, program }) => {
    const vocabulary = vocabularyOf(interpreter);
    if (flag !== null) return [];
    return invocations(stdinReadings(interpreter, vocabulary), [program]);
  },
};

const PERL_MODES = [">", ">>", "+<", "+>"];
const PERL_QUOTES = ["'", "\""];
const PERL_GAPS = ["", " ", "\t"];
const PERL_OPEN_FORMS: ((quote: string, mode: string, path: string) => string)[] = [
  (quote, mode, path) => `open(F, ${quote}${mode}${path}${quote})`,
  (quote, mode, path) => `open F, ${quote}${mode}${path}${quote}`,
  (quote, mode, path) => `open(my $f, ${quote}${mode}${quote}, ${quote}${path}${quote})`,
];
const QUOTED = /(['"])([^'"]*)\1/g;
const PERL_MODE_PREFIX = /^(?:\+[<>]|>>|[<>])[ \t]*/;

function openedPath(program: string): string | null {
  if (!/\bopen\b/.test(program)) return null;
  const path = [...program.matchAll(QUOTED)].at(-1)?.[2].replace(PERL_MODE_PREFIX, "") ?? "";
  return path === "" ? null : path;
}

function perlOpens(path: string): string[] {
  return PERL_MODES.flatMap((mode) => PERL_QUOTES.flatMap((quote) => PERL_GAPS.flatMap((gap) => PERL_OPEN_FORMS.map((form) => form(quote, `${mode}${gap}`, path)))));
}

export const perlOpenModes: Family<ProgramSeed, Invocation> = {
  name: "perl open modes",
  spell: (seed) => {
    const path = seed.interpreter === "perl" ? openedPath(seed.program) : null;
    return path === null ? [] : withProgram(seed, perlOpens(path));
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
  bun: [],
  deno: [],
  Rscript: ["R"],
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

export const interpreterNames: Family<ProgramSeed, Invocation> = {
  name: "interpreter names",
  spell: (seed) => {
    const { argv: [, ...rest], heredocs } = programInvocation(seed);
    return invocations(nameSpellings(seed.interpreter).map((name) => [name, ...rest]), heredocs);
  },
};

export const interpreterArgv: Grammar<ProgramSeed, Invocation> = {
  name: "interpreter argv",
  written: programInvocation,
  label: invocationLabel,
  families: [programFlagSpellings, stdinSpellings, interpreterNames, perlOpenModes],
};

export function programSeeds(writes: Record<string, string[]>): ProgramSeed[] {
  return Object.entries(writes).flatMap(([interpreter, samples]) => {
    const vocabulary = vocabularyOf(interpreter);
    const flags = [...vocabulary.programFlags, ...(vocabulary.subcommand === undefined ? [] : [vocabulary.subcommand.name])];
    const flagged = flags.flatMap((flag) => samples.map((program) => ({ interpreter, flag, program })));
    const stdin = vocabulary.stdin;
    const fed = stdin === undefined ? [] : samples.map((program) => ({ interpreter, flag: null, program: `${stdin.prefix ?? ""}${program}` }));
    return [...flagged, ...fed];
  });
}

function spelledFlags(interpreter: string): string[] {
  const { programFlags, long = {}, subcommand, stdin } = vocabularyOf(interpreter);
  return [...programFlags, ...Object.values(long), ...(stdin?.scriptFlags ?? []), ...(subcommand === undefined ? [] : [subcommand.name])];
}

export function splitAlternatives(source: string): string[] {
  const alternatives: string[] = [];
  let depth = 0;
  let inClass = false;
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") i++;
    else if (inClass) inClass = char !== "]";
    else if (char === "[") inClass = true;
    else if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "|" && depth === 0) {
      alternatives.push(source.slice(start, i));
      start = i + 1;
    }
    if (depth < 0) throw new Error(`an unopened group at ${i} in ${source}`);
  }
  if (depth !== 0 || inClass) throw new Error(`an unclosed group or class in ${source}`);
  return [...alternatives, source.slice(start)];
}

export type InterpreterRow = { names: readonly string[]; programFlags?: readonly string[]; scriptFlags?: readonly string[]; subcommand?: string; writeCall: RegExp };

function aloneMatches(pattern: RegExp, samples: string[]): string[] {
  const alternatives = splitAlternatives(pattern.source);
  const matchers = alternatives.map((alternative) => new RegExp(alternative, pattern.flags));
  const matchedAlone = (k: number) => samples.some((sample) => matchers.every((matcher, j) => matcher.test(sample) === (j === k)));
  return alternatives.filter((_, k) => !matchedAlone(k));
}

function writeProblems<Row extends InterpreterRow>(row: Row, familyOf: (name: string) => Row | undefined, writes: Record<string, string[]>): string[] {
  const samples = Object.entries(writes).filter(([interpreter]) => familyOf(interpreter)?.writeCall.source === row.writeCall.source).flatMap(([, programs]) => programs);
  try {
    return aloneMatches(row.writeCall, samples).map((alternative) => `${row.names[0]} write alternative ${alternative} is matched alone by no sample`);
  } catch (error) {
    return [`${row.names[0]} write pattern does not split: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function flagProblems<Row extends InterpreterRow>(row: Row, interpreters: string[]): string[] {
  const spelled = new Set(interpreters.flatMap(spelledFlags));
  const needed = [...(row.programFlags ?? []), ...(row.scriptFlags ?? []), ...(row.subcommand === undefined ? [] : [row.subcommand])];
  return needed.filter((flag) => !spelled.has(flag)).map((flag) => `${row.names[0]} flag ${flag} has no spelling in the vocabulary`);
}

export function interpreterRowSource<Row extends InterpreterRow>(table: TableRows<Row>, familyOf: (name: string) => Row | undefined, writes: Record<string, string[]>): RowSource<Row, ProgramSeed> {
  const interpretersOf = (row: Row) => Object.keys(writes).filter((interpreter) => familyOf(interpreter) === row);
  return {
    table,
    key: (row) => row.names[0],
    seedsOf: (row) => programSeeds(Object.fromEntries(interpretersOf(row).map((interpreter) => [interpreter, writes[interpreter]]))),
    problems: (row) => {
      const interpreters = interpretersOf(row);
      if (interpreters.length === 0) return [`${row.names[0]} maps to no vocabulary interpreter`];
      return [...flagProblems(row, interpreters), ...writeProblems(row, familyOf, writes)];
    },
  };
}

export type PipedSeed = { writer: string; program: string; interpreter: string };

const WRAPPER_WORDS = ["command", "builtin", "env", "env -i", "exec", "nice", "nohup", "time"];

function pipedCommand({ writer, program, interpreter }: PipedSeed, wrap: (written: string) => string = verbatim, pipe = "|"): string {
  return `${wrap(`${writer} '${program}'`)} ${pipe} ${interpreter}`;
}

export const writerWrappers: Family<PipedSeed, string> = {
  name: "writer wrappers",
  spell: (seed) => spelled([
    ...WRAPPER_WORDS.map((word) => pipedCommand(seed, (written) => `${word} ${written}`)),
    pipedCommand(seed, (written) => `{ ${written}; }`),
    pipedCommand(seed, (written) => `(${written})`),
    pipedCommand(seed, verbatim, "|&"),
  ]),
};

export const shellCommands: Grammar<PipedSeed, string> = {
  name: "shell commands",
  written: (seed) => pipedCommand(seed),
  label: verbatim,
  families: [writerWrappers],
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

export type EditPathForm = "relative" | "absolute" | "dot" | "parent" | "upper-case on win32" | "symbolic link" | "symbolic link from outside";

export type EditInput = EditSeed & { form: EditPathForm };

const EDIT_PATH_LABELS: Record<EditPathForm, (rel: string) => string> = {
  relative: (rel) => rel,
  absolute: (rel) => `absolute ${rel}`,
  dot: (rel) => `./${rel}`,
  parent: (rel) => `services/../${rel}`,
  "upper-case on win32": (rel) => `upper-case folder on win32 ${rel}`,
  "symbolic link": (rel) => `symbolic link ${rel}`,
  "symbolic link from outside": (rel) => `symbolic link from outside ${rel}`,
};

function editPathLabel({ tool, rel, form }: EditInput): string {
  return `${tool} ${EDIT_PATH_LABELS[form](rel)}`;
}

const SPELLED_EDIT_FORMS: EditPathForm[] = ["absolute", "dot", "parent", "upper-case on win32", "symbolic link", "symbolic link from outside"];

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

type ShellPart = { kind: "word" | "gap" | "op"; text: string };
type WordRole = "assignment" | "command" | "argument";

const SHELL_GAP = /^[ \t]+/;
const SHELL_OP = /^(?:\|\||&&|\|&|;;|>>|[;&|()<>\n])/;
const WORD_STOP = /[ \t;&|()<>\n]/;
const PLAIN_WORD = /^[^'"\\$`]+$/;
const ASSIGNED_NAME = /^[A-Za-z_][A-Za-z0-9_]*=/;
const COMMAND_STARTS = new Set([";", ";;", "&", "&&", "|", "||", "|&", "(", "\n"]);

function quoteClose(text: string, open: number, quote: string, escapes: boolean): number {
  for (let i = open + 1; i < text.length; i++) {
    if (escapes && text[i] === "\\") i++;
    else if (text[i] === quote) return i;
  }
  throw new Error(`an unclosed quote at ${open} in the seed ${text}`);
}

function wordEnd(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") i++;
    else if (ch === "$" && text[i + 1] === "'") i = quoteClose(text, i + 1, "'", true);
    else if (ch === "'") i = quoteClose(text, i, "'", false);
    else if (ch === '"') i = quoteClose(text, i, '"', true);
    else if (WORD_STOP.test(ch)) return i;
  }
  return text.length;
}

function shellParts(seed: string): ShellPart[] {
  const parts: ShellPart[] = [];
  for (let i = 0; i < seed.length; ) {
    const rest = seed.slice(i);
    const gap = SHELL_GAP.exec(rest)?.[0];
    const op = gap === undefined ? SHELL_OP.exec(rest)?.[0] : undefined;
    const text = gap ?? op ?? seed.slice(i, wordEnd(seed, i));
    parts.push({ kind: gap !== undefined ? "gap" : op !== undefined ? "op" : "word", text });
    i += text.length;
  }
  return parts;
}

function wordRoles(parts: ShellPart[]): (WordRole | null)[] {
  let atCommand = true;
  return parts.map(({ kind, text }) => {
    if (kind === "op") atCommand ||= COMMAND_STARTS.has(text);
    if (kind !== "word") return null;
    if (atCommand && ASSIGNED_NAME.test(text)) return "assignment";
    const role = atCommand ? "command" : "argument";
    atCommand = false;
    return role;
  });
}

function respelled(parts: ShellPart[], at: number, text: string): string {
  return parts.map((part, i) => (i === at ? text : part.text)).join("");
}

type QuoteForm = { form: string; open: RegExp; spell: (content: string) => string | null };

const EXPANDS_IN_DOUBLE = /["\\$`]/;

const QUOTE_FORMS: QuoteForm[] = [
  { form: "single", open: /^'([^']*)'$/s, spell: (content) => (content.includes("'") ? null : `'${content}'`) },
  { form: "double", open: /^"([^"\\$`]*)"$/s, spell: (content) => (EXPANDS_IN_DOUBLE.test(content) ? null : `"${content}"`) },
  { form: "ANSI-C", open: /^\$'([^'\\]*)'$/s, spell: (content) => (/['\\]/.test(content) ? null : `$'${content}'`) },
  { form: "locale", open: /^\$"([^"\\$`]*)"$/s, spell: (content) => (EXPANDS_IN_DOUBLE.test(content) ? null : `$"${content}"`) },
];

function otherQuotings(word: string): string[] | null {
  const quoted = QUOTE_FORMS.find(({ open }) => open.test(word));
  if (quoted === undefined) return null;
  const content = (quoted.open.exec(word) as RegExpExecArray)[1];
  return QUOTE_FORMS.filter((form) => form !== quoted).flatMap((form) => form.spell(content) ?? []);
}

function hexOf(char: string): string {
  return (char.codePointAt(0) as number).toString(16).padStart(2, "0");
}

const LEADING_PLACEHOLDER = /^\{[a-z]+\}/;

function splitFirst(word: string): { first: string; rest: string; hexed: string | null } {
  const placeholder = LEADING_PLACEHOLDER.exec(word)?.[0];
  if (placeholder === undefined) return { first: word[0], rest: word.slice(1), hexed: `\\x${hexOf(word[0])}${word.slice(1)}` };
  const rest = word.slice(placeholder.length);
  return { first: placeholder, rest, hexed: rest === "" ? null : `${placeholder}\\x${hexOf(rest[0])}${rest.slice(1)}` };
}

function plainQuotings(word: string): string[] {
  if (!PLAIN_WORD.test(word)) return [];
  const { first, rest, hexed } = splitFirst(word);
  return [`'${word}'`, `"${word}"`, `\\${word}`, `${first}''${rest}`, `$'${word}'`, ...(hexed === null ? [] : [`$'${hexed}'`]), `$"${word}"`];
}

export const wordQuotings: Family<string, string> = {
  name: "word quotings",
  spell: (seed) => {
    const parts = shellParts(seed);
    const roles = wordRoles(parts);
    return spelled(parts.flatMap((part, at) => {
      if (roles[at] === null || roles[at] === "assignment") return [];
      return (otherQuotings(part.text) ?? plainQuotings(part.text)).map((text) => respelled(parts, at, text));
    }));
  },
};

function commandWordAt(parts: ShellPart[]): number {
  return wordRoles(parts).indexOf("command");
}

const COMMAND_PATHS: ((word: string) => string)[] = [(word) => `/bin/${word}`, (word) => `/usr/bin/${word}`, (word) => `${word}.exe`];

export const commandPaths: Family<string, string> = {
  name: "command paths",
  spell: (seed) => {
    const parts = shellParts(seed);
    const at = commandWordAt(parts);
    if (at < 0 || !PLAIN_WORD.test(parts[at].text)) return [];
    return spelled(COMMAND_PATHS.map((path) => respelled(parts, at, path(parts[at].text))));
  },
};

const COMMAND_PLACES: ((command: string) => string)[] = [
  (command) => `true && ${command}`,
  (command) => `false || ${command}`,
  (command) => `true; ${command}`,
  (command) => `echo x | ${command}`,
  (command) => `echo x |& ${command}`,
  (command) => `true\n${command}`,
  (command) => `true & ${command}`,
  (command) => `${command} &`,
  (command) => `(${command})`,
  (command) => `echo $(${command})`,
  (command) => `echo "$(${command})"`,
  (command) => `A=1 ${command}`,
  (command) => `2>/dev/null ${command}`,
  (command) => `</dev/null ${command}`,
  (command) => `>/dev/null ${command}`,
  (command) => `! ${command}`,
  (command) => `time ${command}`,
  (command) => `time -p ${command}`,
  (command) => `{ ${command}; }`,
  (command) => `if true; then ${command}; fi`,
  (command) => `if ${command}; then :; fi`,
  (command) => `while ${command}; do :; done`,
  (command) => `until ${command}; do :; done`,
  (command) => `for i in 1; do ${command}; done`,
];

export const commandPlaces: Family<string, string> = {
  name: "command places",
  spell: (command) => spelled(COMMAND_PLACES.map((place) => place(command))),
};

export const commandLines: Grammar<string, string> = {
  name: "command lines",
  written: verbatim,
  label: verbatim,
  families: [wordQuotings, commandPaths, commandPlaces],
};

const KERNEL_COMMAND = "picket";

const KERNEL_LAUNCHERS = [
  "/usr/local/bin/picket",
  "picket.cmd",
  "picket.exe",
  "node dist/bin/picket.mjs",
  "node ./dist/bin/picket.mjs",
  "dist/bin/picket.mjs",
  "picket.mjs",
  "npx picket",
  "npx --yes picket",
  "pnpx picket",
  "bunx picket",
  "npm exec -- picket",
  "picket --human",
  "picket --json",
  "picket --root .",
];

export const kernelLaunchers: Family<string, string> = {
  name: "kernel launchers",
  spell: (seed) => {
    const parts = shellParts(seed);
    const at = commandWordAt(parts);
    if (at < 0 || parts[at].text !== KERNEL_COMMAND) return [];
    return spelled(KERNEL_LAUNCHERS.map((launcher) => respelled(parts, at, launcher)));
  },
};

const ARGV_WRAPPERS = ["command", "env", "env -i", "exec", "nice", "nohup", "time", "timeout 5", "echo x | xargs"];

const TEXT_WRAPPERS: { quote: string; wrap: (command: string) => string }[] = [
  { quote: "'", wrap: (command) => `bash -c '${command}'` },
  { quote: '"', wrap: (command) => `sh -c "${command}"` },
  { quote: "'", wrap: (command) => `eval '${command}'` },
  { quote: "", wrap: (command) => `cmd /c ${command}` },
  { quote: "'", wrap: (command) => `pwsh -c '${command}'` },
  { quote: '"', wrap: (command) => `powershell -Command "${command}"` },
];

export const commandWrappers: Family<string, string> = {
  name: "command wrappers",
  spell: (seed) => {
    const parts = shellParts(seed);
    const at = commandWordAt(parts);
    if (at < 0) return [];
    const argvWrapped = ARGV_WRAPPERS.map((wrapper) => respelled(parts, at, `${wrapper} ${parts[at].text}`));
    const textWrapped = TEXT_WRAPPERS.filter(({ quote }) => quote === "" || !seed.includes(quote)).map(({ wrap }) => wrap(seed));
    return spelled([...argvWrapped, ...textWrapped]);
  },
};

export const kernelCalls: Grammar<string, string> = {
  name: "kernel calls",
  written: verbatim,
  label: verbatim,
  families: [kernelLaunchers, wordQuotings, commandPlaces, commandWrappers],
};

export const SOURCE_PLACEHOLDER = "{source}";

const TARGET_DIRECTORY_COMMANDS = new Set(["cp", "mv"]);

function targetDirectorySpelling(parts: ShellPart[], at: number): string[] {
  const words = parts.filter((part) => part.kind === "word").map((part) => part.text);
  const sourceWord = parts[at].text;
  const isLastWord = words.at(-1) === sourceWord && parts.every((part) => part.kind !== "op");
  if (!TARGET_DIRECTORY_COMMANDS.has(words[0]) || !isLastWord || !sourceWord.startsWith(`${SOURCE_PLACEHOLDER}/`)) return [];
  return [[words[0], `--target-directory=${SOURCE_PLACEHOLDER}`, ...words.slice(1, -1)].join(" ")];
}

export const sourcePathSpellings: Family<string, string> = {
  name: "source path spellings",
  spell: (seed) => {
    const parts = shellParts(seed);
    const at = parts.findIndex((part) => part.kind === "word" && part.text.includes(SOURCE_PLACEHOLDER));
    if (at < 0) return [];
    const word = parts[at].text;
    const inSource = (path: string) => respelled(parts, at, word.replace(SOURCE_PLACEHOLDER, path));
    return spelled([
      inSource(`${SOURCE_PLACEHOLDER}/.`),
      inSource(`${SOURCE_PLACEHOLDER}/sub/..`),
      ...(word === SOURCE_PLACEHOLDER ? [inSource(`${SOURCE_PLACEHOLDER}/`)] : []),
      respelled(parts, at, `"${word}"`),
      ...targetDirectorySpelling(parts, at),
    ]);
  },
};

export const sourceCommands: Grammar<string, string> = {
  name: "source commands",
  written: verbatim,
  label: verbatim,
  families: [wordQuotings, commandPaths, commandPlaces, sourcePathSpellings],
};

const CMDLET_MODULES: Record<string, string> = {
  "Format-Volume": "Storage",
  "Clear-Disk": "Storage",
};
const MANAGEMENT_MODULE = "Microsoft.PowerShell.Management";
const VERB_NOUN = /^[A-Z][a-z]+-[A-Z][A-Za-z]+$/;

function splitCommandWord(command: string): { name: string; rest: string } {
  const space = command.indexOf(" ");
  return space < 0 ? { name: command, rest: "" } : { name: command.slice(0, space), rest: command.slice(space) };
}

export const powerShellNames: Family<string, string> = {
  name: "PowerShell names",
  spell: (command) => {
    const { name, rest } = splitCommandWord(command);
    const qualified = VERB_NOUN.test(name) ? [`${CMDLET_MODULES[name] ?? MANAGEMENT_MODULE}\\${name}`] : [];
    const names = [name.toLowerCase(), name.toUpperCase(), `& ${name}`, `& '${name}'`, `. ${name}`, ...qualified];
    return spelled(names.filter((spelledName) => spelledName !== name).map((spelledName) => `${spelledName}${rest}`));
  },
};

const POWERSHELL_PLACES: ((command: string) => string)[] = [
  (command) => `$true; ${command}`,
  (command) => `${command} | Out-Null`,
  (command) => `(${command})`,
  (command) => `$(${command})`,
  (command) => `@(${command})`,
  (command) => `if ($true) { ${command} }`,
  (command) => `Write-Output 1 | ${command}`,
  (command) => `1 | % { ${command} }`,
];

export const powerShellPlaces: Family<string, string> = {
  name: "PowerShell places",
  spell: (command) => spelled(POWERSHELL_PLACES.map((place) => place(command))),
};

export const powerShellCommands: Grammar<string, string> = {
  name: "PowerShell commands",
  written: verbatim,
  label: verbatim,
  families: [powerShellNames, powerShellPlaces],
};

export type CommentSeed = { ext: string; text: string; trails: boolean };

export type CommentEdit = { tool: "Write" | "Edit"; rel: string; before: string; input: Record<string, string | boolean> };

type CommentForm = { text: string; trails: boolean };

type CommentRow = { statement: string; head?: string; forms: CommentForm[] };

const trailing = (text: string): CommentForm => ({ text, trails: true });
const ownLine = (text: string): CommentForm => ({ text, trails: false });

const C_COMMENTS = [trailing("// note"), trailing("/* note */"), trailing("/** note */"), ownLine("/*\n * note\n */")];
const HASH_COMMENTS = [trailing("# note")];
const MARKUP_COMMENTS = [trailing("<!-- note -->")];
const SCRIPT_COMMENTS = [ownLine("<script>\n// note\n</script>"), ownLine("<script>\n/* note */\n</script>"), ownLine("<style>\n/* note */\n</style>")];

function rowsFor(extensions: string, row: CommentRow): Record<string, CommentRow> {
  return Object.fromEntries(extensions.split(" ").map((ext) => [ext, row]));
}

export const COMMENT_SYNTAX: Record<string, CommentRow> = {
  ...rowsFor(".js .mjs .cjs .jsx .ts .mts .cts .tsx", { statement: "const a = 1;", forms: C_COMMENTS }),
  ".cs": { statement: "var a = 1;", forms: [...C_COMMENTS, trailing("/// note")] },
  ".java": { statement: "int a = 1;", forms: C_COMMENTS },
  ...rowsFor(".kt .kts", { statement: "val a = 1", forms: C_COMMENTS }),
  ".go": { statement: "var a = 1", forms: C_COMMENTS },
  ".rs": { statement: "const A: i32 = 1;", forms: [...C_COMMENTS, trailing("/// note"), trailing("//! note")] },
  ".swift": { statement: "let a = 1", forms: [...C_COMMENTS, trailing("/// note")] },
  ".scala": { statement: "val a = 1", forms: C_COMMENTS },
  ...rowsFor(".c .h .cpp .hpp .cc", { statement: "int a = 1;", forms: C_COMMENTS }),
  ".dart": { statement: "var a = 1;", forms: [...C_COMMENTS, trailing("/// note")] },
  ".groovy": { statement: "def a = 1", forms: C_COMMENTS },
  ".php": { head: "<?php", statement: "$a = 1;", forms: [trailing("// note"), trailing("# note"), trailing("/* note */")] },
  ".py": { statement: "a = 1", forms: [...HASH_COMMENTS, ownLine('"""note"""')] },
  ".rb": { statement: "a = 1", forms: [...HASH_COMMENTS, ownLine("=begin\nnote\n=end")] },
  ".pl": { statement: "my $a = 1;", forms: [...HASH_COMMENTS, ownLine("=pod\nnote\n=cut")] },
  ".ps1": { statement: "$a = 1", forms: [...HASH_COMMENTS, trailing("<# note #>")] },
  ...rowsFor(".sh .bash", { statement: "a=1", forms: HASH_COMMENTS }),
  ".r": { statement: "a <- 1", forms: HASH_COMMENTS },
  ".sql": { statement: "SELECT 1;", forms: [trailing("-- note"), trailing("/* note */")] },
  ".vb": { statement: "Dim a = 1", forms: [trailing("' note"), ownLine("REM note")] },
  ...rowsFor(".html .htm .vue .svelte", { statement: "<p>a</p>", forms: [...MARKUP_COMMENTS, ...SCRIPT_COMMENTS] }),
  ...rowsFor(".xml .xaml", { statement: "<p>a</p>", forms: MARKUP_COMMENTS }),
  ...rowsFor(".cshtml .razor", { statement: "<p>a</p>", forms: [...MARKUP_COMMENTS, trailing("@* note *@")] }),
};

export function commentSeeds(ext: string): CommentSeed[] {
  return Object.hasOwn(COMMENT_SYNTAX, ext) ? COMMENT_SYNTAX[ext].forms.map(({ text, trails }) => ({ ext, text, trails })) : [];
}

function syntaxOf(ext: string): CommentRow {
  if (!Object.hasOwn(COMMENT_SYNTAX, ext)) throw new Error(`no comment syntax row for ${ext}`);
  return COMMENT_SYNTAX[ext];
}

function fileOf(head: string | undefined, lines: string[], end = "\n"): string {
  return [...(head === undefined ? [] : [head]), ...lines].map((line) => `${line}${end}`).join("");
}

function commentRel(ext: string): string {
  return `src/a${ext}`;
}

function written(ext: string, content: string): CommentEdit {
  return { tool: "Write", rel: commentRel(ext), before: "", input: { content } };
}

function editedIn(ext: string, before: string, statement: string, text: string, replaceAll: boolean): CommentEdit {
  const input = { old_string: statement, new_string: `${statement}\n${text}`, ...(replaceAll ? { replace_all: true } : {}) };
  return { tool: "Edit", rel: commentRel(ext), before, input };
}

const STARTS_AT_COLUMN_ZERO = /^(=|""")/;

function indented(text: string, indent: string): string {
  return text.split("\n").map((line) => `${indent}${line}`).join("\n");
}

function commentPlacement({ ext, text, trails }: CommentSeed): { name: string; edit: CommentEdit }[] {
  const { head, statement } = syntaxOf(ext);
  const indentable = !STARTS_AT_COLUMN_ZERO.test(text);
  return [
    ...(indentable ? [{ name: "indented by four spaces", edit: written(ext, fileOf(head, [statement, indented(text, "    ")])) }] : []),
    ...(indentable ? [{ name: "indented by a tab", edit: written(ext, fileOf(head, [statement, indented(text, "\t")])) }] : []),
    ...(trails ? [{ name: "after the statement", edit: written(ext, fileOf(head, [`${statement} ${text}`])) }] : []),
    { name: "with CRLF line ends", edit: written(ext, fileOf(head, [statement, ...text.split("\n")], "\r\n")) },
    { name: "added by an Edit", edit: editedIn(ext, fileOf(head, [statement]), statement, text, false) },
    { name: "added by an Edit with replace_all", edit: editedIn(ext, fileOf(head, [statement, statement]), statement, text, true) },
  ];
}

function commentLabel({ ext, text }: CommentSeed, placement: string): string {
  return `${ext} ${JSON.stringify(text)} ${placement}`;
}

export const commentPlacements: Family<CommentSeed, CommentEdit> = {
  name: "comment placements",
  spell: (seed) => commentPlacement(seed).map(({ name, edit }) => ({ label: commentLabel(seed, name), input: edit })),
};

export const codeComments: Grammar<CommentSeed, CommentEdit> = {
  name: "code comments",
  written: ({ ext, text }) => written(ext, fileOf(syntaxOf(ext).head, [syntaxOf(ext).statement, text])),
  label: (edit) => `${edit.tool} ${edit.rel} ${JSON.stringify(edit.input)}`,
  families: [commentPlacements],
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

export async function openSpellings<S, I, R>(closure: Closure<S, I, R>, spellings: Spelling<I>[], t: TestContext): Promise<Spelling<I>[]> {
  const open: Spelling<I>[] = [];
  for (const spelling of spellings) {
    if (!closure.closed(await closure.run(spelling.input, t))) open.push(spelling);
  }
  return open;
}

export function closureFailure(guard: string, familyName: string, labels: string[]): string {
  return [`${guard} is open under ${familyName} for:`, ...labels].join("\n");
}

const AS_WRITTEN = "as written";

async function assertClosed<S, I, R>(closure: Closure<S, I, R>, familyName: string, spellings: Spelling<I>[], t: TestContext): Promise<void> {
  const labels = (await openSpellings(closure, spellings, t)).map((spelling) => spelling.label);
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
    ...source.table.rows.flatMap((row) => source.problems?.(row) ?? []),
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
