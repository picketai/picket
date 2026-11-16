import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withProject } from "#test/project.mts";

const REPOSITORY = fileURLToPath(new URL("../..", import.meta.url));
const SCANNED_FOLDERS = ["src", "bench", "test"];
const CLOSURE_FILE = /\.variants\.test\.m[tj]s$/;

const INTERPRETERS = "src/lib/hooks/guard/bash/interpreters.mts";
const IN_PLACE = "src/lib/hooks/guard/bash/in-place.mts";
const IN_PLACE_CLOSURE = "src/lib/hooks/guard/bash/in-place.variants.test.mts";
const CONFIG_ENTRIES = "src/lib/shared/env/config-entries.mts";
const DECLARED_CHECKS = "src/lib/shared/work/declared-checks.mts";
const SPEND = "bench/lib/spend.mjs";
const SPEND_CLOSURE = "bench/test/spend.variants.test.mjs";
const SECRET_WORDS = [{ module: CONFIG_ENTRIES, name: "SECRET_WORDS" }];
const BASH_RULES = "src/lib/hooks/guard/bash/rules.mts";
const DESTRUCTIVE_TABLES = ["DENIED_NAMES", "DENY_GIT_SUBCOMMANDS", "NPM_DENY_SUBCOMMANDS"].map((name) => ({ module: BASH_RULES, name }));

const spendGuard = (guard) => ({ guard, module: SPEND, closure: SPEND_CLOSURE, tables: [] });

export const GUARDS = [
  { guard: "in-place guard", module: IN_PLACE, closure: IN_PLACE_CLOSURE, tables: [{ module: INTERPRETERS, name: "FAMILIES" }] },
  { guard: "in-place guard on piped programs", module: IN_PLACE, closure: IN_PLACE_CLOSURE, tables: [{ module: IN_PLACE, name: "VISIBLE_WRITERS" }] },
  { guard: "guard.bash destructive roots", module: "src/lib/hooks/guard/bash/judge.mts", closure: "src/lib/hooks/guard/bash/judge.variants.test.mts", tables: DESTRUCTIVE_TABLES },
  { guard: "guard.scope", module: "src/lib/hooks/guard/scope/index.mts", closure: "src/lib/hooks/guard/scope/index.variants.test.mts", tables: [] },
  { guard: "admit security", module: "src/lib/shared/admission/signals.mts", closure: "src/lib/shared/admission/signals.variants.test.mts", tables: [] },
  { guard: "maskedBody", module: "src/lib/shared/drive-log.mts", closure: "src/lib/shared/drive-log.variants.test.mts", tables: SECRET_WORDS },
  { guard: "masked", module: CONFIG_ENTRIES, closure: "src/lib/shared/env/config-entries.variants.test.mts", tables: SECRET_WORDS },
  { guard: "scenarioProblems", module: "src/lib/shared/scenarios/rules.mts", closure: "src/lib/shared/scenarios/rules.variants.test.mts", tables: SECRET_WORDS },
  {
    guard: "verify",
    module: "src/lib/verbs/verify/index.mts",
    closure: "src/lib/verbs/verify/index.variants.test.mts",
    tables: [{ module: DECLARED_CHECKS, name: "HTTP_KEYS" }, { module: DECLARED_CHECKS, name: "RUN_KEYS" }],
  },
  spendGuard("runRefusal --budget-usd"),
  spendGuard("runRefusal --max-usd"),
  spendGuard("runRefusal task budget_usd"),
  spendGuard("spendRefusal --max-usd"),
  { guard: "claudeArgs --max-budget-usd", module: "bench/lib/claude.mjs", closure: "bench/test/claude.variants.test.mjs", tables: [] },
];

function closureFiles(root) {
  return SCANNED_FOLDERS.filter((folder) => existsSync(join(root, folder))).flatMap((folder) =>
    readdirSync(join(root, folder), { recursive: true })
      .map((entry) => `${folder}/${String(entry).replaceAll("\\", "/")}`)
      .filter((path) => CLOSURE_FILE.test(path) && !path.includes("node_modules/")),
  );
}

function escaped(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function namesGuard(source, guard) {
  return new RegExp(`\\bguard:\\s*${escaped(JSON.stringify(guard))}`).test(source);
}

function readsTable(source, name) {
  return new RegExp(`\\btableRows(?:<[^>]*>)?\\(\\s*\\w+\\s*,\\s*${escaped(JSON.stringify(name))}\\s*\\)`).test(source);
}

async function exportsTable(root, { module, name }) {
  try {
    const loaded = await import(pathToFileURL(join(root, module)).href);
    return loaded[name] !== undefined;
  } catch {
    return false;
  }
}

async function tableProblems(root, entry, source) {
  const problems = [];
  for (const table of entry.tables) {
    if (!(await exportsTable(root, table))) problems.push(`${entry.guard}: table ${table.name} is not exported by ${table.module}`);
    if (!readsTable(source, table.name)) problems.push(`${entry.guard}: table ${table.name} is named in no tableRows( call of ${entry.closure}`);
  }
  return problems;
}

async function entryProblems(root, entry) {
  const closurePath = join(root, entry.closure);
  if (!existsSync(closurePath)) return [`${entry.guard}: closure file ${entry.closure} is missing`];
  const source = readFileSync(closurePath, "utf8");
  const named = namesGuard(source, entry.guard) ? [] : [`${entry.guard}: ${entry.closure} holds no guard: ${JSON.stringify(entry.guard)}`];
  return [...named, ...(await tableProblems(root, entry, source))];
}

export async function registryProblems(root, guards) {
  const registered = new Set(guards.map((entry) => entry.closure));
  const unregistered = closureFiles(root).filter((path) => !registered.has(path)).map((path) => `${path} is a closure file in no GUARDS entry`);
  const perEntry = [];
  for (const entry of guards) perEntry.push(...(await entryProblems(root, entry)));
  return [...unregistered, ...perEntry];
}

function writeTree(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

const GUARD_MODULE = "src/g.mjs";
const GUARD_CLOSURE = "src/g.variants.test.mjs";
const WORDS_MODULE = "export const WORDS = ['a'];\n";
const closureOf = (guard, call = 'tableRows(loaded, "WORDS")') => `closureTests({ guard: ${JSON.stringify(guard)}, rows: [{ table: ${call} }] });\n`;
const entry = (more = {}) => ({ guard: "g", module: GUARD_MODULE, closure: GUARD_CLOSURE, tables: [{ module: GUARD_MODULE, name: "WORDS" }], ...more });

function tree(t, files) {
  const root = withProject(t, { picket: false });
  writeTree(root, files);
  return root;
}

test("registryProblems on the repository returns no problem (T-5.1)", async () => {
  assert.deepEqual(await registryProblems(REPOSITORY, GUARDS), []);
});

test("the scan finds every registered closure file of the repository", () => {
  assert.deepEqual([...new Set(GUARDS.map((guard) => guard.closure))].filter((path) => !closureFiles(REPOSITORY).includes(path)), []);
});

test("a registered guard whose closure names it and reads its exported table has no problem", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("g") });
  assert.deepEqual(await registryProblems(root, [entry()]), []);
});

test("an unregistered closure file is a problem naming the file (T-5.2)", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("g"), "test/x.variants.test.mts": closureOf("x") });
  assert.deepEqual(await registryProblems(root, [entry()]), ["test/x.variants.test.mts is a closure file in no GUARDS entry"]);
});

test("a guard whose closure file is missing is a problem naming the guard (T-5.3)", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE });
  assert.deepEqual(await registryProblems(root, [entry()]), [`g: closure file ${GUARD_CLOSURE} is missing`]);
});

test("a guard whose closure holds no guard field with its name is a problem naming the guard (T-5.3)", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("other") });
  assert.deepEqual(await registryProblems(root, [entry()]), [`g: ${GUARD_CLOSURE} holds no guard: "g"`]);
});

test("a listed table its module does not export is a problem naming the table and the module (T-5.4)", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: "export const OTHER = [];\n", [GUARD_CLOSURE]: closureOf("g") });
  assert.deepEqual(await registryProblems(root, [entry()]), [`g: table WORDS is not exported by ${GUARD_MODULE}`]);
});

test("a listed table no tableRows( call of the closure names is a problem naming the table and the file (T-5.4)", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("g", 'rowsOf("WORDS")') });
  assert.deepEqual(await registryProblems(root, [entry()]), [`g: table WORDS is named in no tableRows( call of ${GUARD_CLOSURE}`]);
});

test("a tableRows( call with a type argument names its table", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("g", 'tableRows<string>(loaded, "WORDS")') });
  assert.deepEqual(await registryProblems(root, [entry()]), []);
});
