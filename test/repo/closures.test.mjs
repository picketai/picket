import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withProject } from "#test/project.mts";

const REPOSITORY = fileURLToPath(new URL("../..", import.meta.url));
const SCANNED_FOLDERS = ["src", "bench", "test"];
const CLOSURE_FILE = /\.variants\.test\.m[tj]s$/;
const GUARD_FOLDER = "src/lib/hooks/guard";
const GUARD_MODULE_FILE = /\.m[tj]s$/;
const TEST_FILE = /\.test\.m[tj]s$/;

const INTERPRETERS = "src/lib/hooks/guard/bash/interpreters.mts";
const IN_PLACE = "src/lib/hooks/guard/bash/in-place.mts";
const IN_PLACE_CLOSURE = "src/lib/hooks/guard/bash/in-place.variants.test.mts";
const CONFIG_ENTRIES = "src/lib/shared/env/config-entries.mts";
const DECLARED_CHECKS = "src/lib/shared/work/declared-checks.mts";
const SPEND = "bench/lib/spend.mjs";
const SPEND_CLOSURE = "bench/test/spend.variants.test.mjs";
const SECRET_WORDS = [{ module: CONFIG_ENTRIES, name: "SECRET_WORDS" }];
const BASH_RULES = "src/lib/hooks/guard/bash/rules.mts";
const BASH_KERNEL = "src/lib/hooks/guard/bash/kernel.mts";
const BASH_ESCALATION = "src/lib/hooks/guard/bash/escalation.mts";
const ESCALATION_CLOSURE = "src/lib/hooks/guard/bash/escalation.variants.test.mts";
const BASH_RECORDS = "src/lib/hooks/guard/bash/records.mts";
const RECORDS_CLOSURE = "src/lib/hooks/guard/bash/records.variants.test.mts";
const DESTRUCTIVE_TABLES = ["DENIED_NAMES", "DENY_GIT_SUBCOMMANDS", "NPM_DENY_SUBCOMMANDS"].map((name) => ({ module: BASH_RULES, name }));

const spendGuard = (guard) => ({ guard, module: SPEND, closure: SPEND_CLOSURE, tables: [] });

export const GUARDS = [
  { guard: "in-place guard", module: IN_PLACE, closure: IN_PLACE_CLOSURE, tables: [{ module: INTERPRETERS, name: "FAMILIES" }] },
  { guard: "in-place guard on piped programs", module: IN_PLACE, closure: IN_PLACE_CLOSURE, tables: [{ module: IN_PLACE, name: "VISIBLE_WRITERS" }] },
  {
    guard: "guard.bash destructive roots",
    module: "src/lib/hooks/guard/bash/judge.mts",
    parts: ["src/lib/hooks/guard/bash/index.mts", "src/lib/hooks/guard/bash/bash.mts"],
    closure: "src/lib/hooks/guard/bash/judge.variants.test.mts",
    tables: DESTRUCTIVE_TABLES,
  },
  { guard: "guard.bash lead-only verbs", module: "src/lib/hooks/guard/bash/payloads.mts", closure: "src/lib/hooks/guard/bash/payloads.variants.test.mts", tables: [{ module: BASH_KERNEL, name: "LEAD_ONLY_VERBS" }] },
  { guard: "guard.bash tester commands", module: "src/lib/hooks/guard/bash/payloads.mts", closure: "src/lib/hooks/guard/bash/tester.variants.test.mts", tables: [{ module: "src/lib/hooks/guard/bash/payloads.mts", name: "TESTER_VERBS" }] },
  { guard: "guard.blackbox", module: "src/lib/hooks/guard/blackbox/index.mts", closure: "src/lib/hooks/guard/blackbox/index.variants.test.mts", tables: [] },
  { guard: "guard.bash wrapped kernel commands", module: BASH_KERNEL, closure: "src/lib/hooks/guard/bash/kernel.variants.test.mts", tables: [{ module: BASH_KERNEL, name: "WRAPPING_FLAGS" }] },
  { guard: "guard.bash sources", module: "src/lib/hooks/guard/bash/sources.mts", closure: "src/lib/hooks/guard/bash/sources.variants.test.mts", tables: [] },
  { guard: "guard.bash kernel records", module: BASH_RECORDS, closure: RECORDS_CLOSURE, tables: [] },
  { guard: "guard.bash kernel records in programs", module: BASH_RECORDS, closure: RECORDS_CLOSURE, tables: [] },
  { guard: "guard.bash kernel records in work items", module: BASH_RECORDS, closure: RECORDS_CLOSURE, tables: [] },
  { guard: "guard.bash escalation outside an asking mode", module: BASH_ESCALATION, closure: ESCALATION_CLOSURE, tables: [] },
  { guard: "guard.bash escalation of more than one command", module: BASH_ESCALATION, closure: ESCALATION_CLOSURE, tables: [] },
  { guard: "guard.bash on PowerShell", module: "src/lib/hooks/guard/bash/powershell.mts", closure: "src/lib/hooks/guard/bash/powershell.variants.test.mts", tables: [{ module: BASH_RULES, name: "DENIED_NAMES" }] },
  { guard: "edit target", module: "src/lib/hooks/guard/edit-target.mts", closure: "src/lib/hooks/guard/edit-target.variants.test.mts", tables: [] },
  { guard: "guard.comments", module: "src/lib/hooks/guard/comments/index.mts", closure: "src/lib/hooks/guard/comments/index.variants.test.mts", tables: [{ module: "src/lib/shared/comments.mjs", name: "LANGS" }] },
  { guard: "guard.silenced", module: "src/lib/hooks/guard/silenced/index.mts", closure: "src/lib/hooks/guard/silenced/index.variants.test.mts", tables: [{ module: "src/lib/shared/silenced.mjs", name: "TEST_MOVES" }, { module: "src/lib/shared/comments.mjs", name: "LANGS" }] },
  { guard: "guard.silenced thresholds", module: "src/lib/hooks/guard/silenced/index.mts", closure: "src/lib/hooks/guard/silenced/index.variants.test.mts", tables: [{ module: "src/lib/shared/silenced.mjs", name: "THRESHOLDS" }] },
  {
    guard: "guard.block",
    module: "src/lib/hooks/guard/block/index.mts",
    closure: "src/lib/hooks/guard/block/index.variants.test.mts",
    tables: [
      { module: "src/lib/shared/verdicts.mjs", name: "VERDICTS" },
      { module: "src/lib/shared/verdicts.mjs", name: "TESTER_VERDICTS" },
      { module: "src/lib/hooks/guard/block/index.mts", name: "BLOCKED_KINDS" },
    ],
  },
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

function guardModules(root) {
  if (!existsSync(join(root, GUARD_FOLDER))) return [];
  return readdirSync(join(root, GUARD_FOLDER), { recursive: true })
    .map((entry) => `${GUARD_FOLDER}/${String(entry).replaceAll("\\", "/")}`)
    .filter((path) => GUARD_MODULE_FILE.test(path) && !TEST_FILE.test(path))
    .sort();
}

function answeringModules(guards) {
  return new Set(guards.flatMap((entry) => [entry.module, ...(entry.parts ?? []), ...entry.tables.map((table) => table.module)]));
}

function uncoveredModules(root, guards) {
  const answering = answeringModules(guards);
  return guardModules(root).filter((path) => !answering.has(path)).map((path) => `${path} is a guard module with no GUARDS entry and no closure test`);
}

function missingModules(root, entry) {
  return [entry.module, ...(entry.parts ?? [])].filter((path) => !existsSync(join(root, path))).map((path) => `${entry.guard}: module ${path} is missing`);
}

async function closureProblems(root, entry) {
  const closurePath = join(root, entry.closure);
  if (!existsSync(closurePath)) return [`${entry.guard}: closure file ${entry.closure} is missing`];
  const source = readFileSync(closurePath, "utf8");
  const named = namesGuard(source, entry.guard) ? [] : [`${entry.guard}: ${entry.closure} holds no guard: ${JSON.stringify(entry.guard)}`];
  return [...named, ...(await tableProblems(root, entry, source))];
}

async function entryProblems(root, entry) {
  return [...missingModules(root, entry), ...(await closureProblems(root, entry))];
}

export async function registryProblems(root, guards) {
  const registered = new Set(guards.map((entry) => entry.closure));
  const unregistered = closureFiles(root).filter((path) => !registered.has(path)).map((path) => `${path} is a closure file in no GUARDS entry`);
  const perEntry = [];
  for (const entry of guards) perEntry.push(...(await entryProblems(root, entry)));
  return [...unregistered, ...uncoveredModules(root, guards), ...perEntry];
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

const NEW_GUARD_MODULE = "src/lib/hooks/guard/x/index.mts";
const GUARD_PART = "src/lib/hooks/guard/x/part.mts";
const guardedTree = (t, more = {}) => tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("g"), [NEW_GUARD_MODULE]: "export const x = 1;\n", ...more });

test("a module under the guard folder in no entry is a problem naming the module, and its tests are not modules (T-10.1)", async (t) => {
  const root = guardedTree(t, { "src/lib/hooks/guard/x/index.test.mts": "", "src/lib/hooks/guard/x/index.variants.test.mts": closureOf("x") });
  assert.deepEqual(await registryProblems(root, [entry()]), [
    "src/lib/hooks/guard/x/index.variants.test.mts is a closure file in no GUARDS entry",
    `${NEW_GUARD_MODULE} is a guard module with no GUARDS entry and no closure test`,
  ]);
});

test("a guard module named as an entry's part or as a table's module is covered (T-10.2)", async (t) => {
  assert.deepEqual(await registryProblems(guardedTree(t), [entry({ parts: [NEW_GUARD_MODULE] })]), []);
  const tabled = guardedTree(t, { [GUARD_CLOSURE]: closureOf("g", 'tableRows(loaded, "x")') });
  assert.deepEqual(await registryProblems(tabled, [entry({ tables: [{ module: NEW_GUARD_MODULE, name: "x" }] })]), []);
});

test("a missing module or part is a problem naming the guard (T-10.2)", async (t) => {
  const root = guardedTree(t);
  assert.deepEqual(await registryProblems(root, [entry({ parts: [NEW_GUARD_MODULE, GUARD_PART] })]), [`g: module ${GUARD_PART} is missing`]);
  assert.deepEqual(await registryProblems(root, [entry({ module: "src/gone.mjs", parts: [NEW_GUARD_MODULE] })]), ["g: module src/gone.mjs is missing"]);
});

test("a tableRows( call with a type argument names its table", async (t) => {
  const root = tree(t, { [GUARD_MODULE]: WORDS_MODULE, [GUARD_CLOSURE]: closureOf("g", 'tableRows<string>(loaded, "WORDS")') });
  assert.deepEqual(await registryProblems(root, [entry()]), []);
});
