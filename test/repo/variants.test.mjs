import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { closureFailure, distractorSentences, editPaths, familySpellings, listPlacements, loadedExport, loadGuard, numbers, interpreterArgv, interpreterRowSource, openSpellings, outOfDomainNumbers, pairNames, pairPlaces, perlOpenModes, programFlagSpellings, programSeeds, quotedSpans, rowProblems, shellCommands, splitAlternatives, stdinSpellings, tableRows, writerWrappers, writtenSpellings } from "#test/variants.mts";
import { withProject } from "#test/project.mts";

const HELPER_URL = new URL("../support/variants.mts", import.meta.url).href;

const nonPositive = { name: "non-positive", written: (n) => n, label: String, families: [] };

function positiveOnly(seeds) {
  return {
    guard: "g",
    grammar: nonPositive,
    seeds,
    run: (n) => (n > 0 ? null : "refused"),
    closed: (output) => output !== null,
  };
}

const SHIFTS_GRAMMAR = [
  "const shifts = {",
  '  name: "shifts",',
  "  written: (n) => n,",
  "  label: String,",
  "  families: [",
  '    { name: "plus ten", spell: (n) => (n < UNSPELLED_BELOW ? [] : [{ label: `${n}+10`, input: n + 10 }]) },',
  '    { name: "plus five", spell: (n) => (n < UNSPELLED_BELOW ? [] : [{ label: `${n}+5`, input: n + 5 }]) },',
  "  ],",
  "};",
];

const UNSPELLED_BELOW = -100;

function rowsSource(table, seedsOf) {
  return [
    'const loaded = await loadGuard(() => import("./guard.mjs"), "guard.mjs");',
    `const rows = [{ table: tableRows(loaded, ${JSON.stringify(table)}), key: String, seedsOf: ${seedsOf} }];`,
  ];
}

function closureTestSource({ seeds, probes = [], rows = null }) {
  return [
    `import { closureTests, loadGuard, tableRows } from ${JSON.stringify(HELPER_URL)};`,
    `const UNSPELLED_BELOW = ${UNSPELLED_BELOW};`,
    ...SHIFTS_GRAMMAR,
    ...(rows === null ? ["const rows = [];"] : rowsSource(rows.table, rows.seedsOf)),
    "closureTests({",
    '  guard: "g",',
    "  grammar: shifts,",
    `  seeds: ${JSON.stringify(seeds)},`,
    `  probes: ${JSON.stringify(probes)},`,
    "  rows,",
    '  run: (n) => (n > 0 ? null : "refused"),',
    "  closed: (output) => output !== null,",
    "});",
  ].join("\n");
}

function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function runClosureTest(t, closure, guardModule = null) {
  const root = withProject(t, { picket: false });
  const file = join(root, "guard.variants.test.mjs");
  writeFileSync(file, closureTestSource(closure));
  if (guardModule !== null) writeFileSync(join(root, "guard.mjs"), guardModule);
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], { encoding: "utf8", env: childEnv() });
}

function testLines(stdout) {
  return stdout.split("\n").filter((line) => /^(not )?ok \d+ - /.test(line));
}

function failureOf(stdout, familyName) {
  return linesAfter(stdout, `g is open under ${familyName} for:`);
}

function rowFailureOf(stdout, table) {
  return linesAfter(stdout, `g does not cover every row of ${table} in guard.mjs:`);
}

function linesAfter(stdout, header) {
  const start = stdout.indexOf(header);
  if (start < 0) return null;
  const lines = stdout.slice(start).split("\n").slice(1).map((line) => line.trim());
  return lines.slice(0, lines.indexOf("+ actual - expected"));
}

test("openSpellings returns exactly the open spellings in the order given", (t) => {
  const closure = positiveOnly([]);
  const spellings = [-1, 0, 2, 5].map((n) => ({ label: String(n), input: n }));
  assert.deepEqual(openSpellings(closure, spellings, t), [{ label: "2", input: 2 }, { label: "5", input: 5 }]);
});

test("familySpellings visits every spelling of every seed in order and drops repeated labels", () => {
  const twice = { name: "twice", spell: (n) => [{ label: `${n}a`, input: n }, { label: `${n}b`, input: n + 10 }] };
  assert.deepEqual(familySpellings(twice, [-20, -5, -20]).map((s) => s.label), ["-20a", "-20b", "-5a", "-5b"]);
});

test("writtenSpellings writes the seeds through the grammar, then the probes as given, dropping repeated labels", () => {
  const doubling = { ...nonPositive, written: (n) => n * 2 };
  assert.deepEqual(writtenSpellings({ grammar: doubling, seeds: [1, 3], probes: [7, 2] }), [
    { label: "2", input: 2 },
    { label: "6", input: 6 },
    { label: "7", input: 7 },
  ]);
});

test("closureFailure names the guard and family, then one label per line", () => {
  assert.equal(closureFailure("g", "f", ["a", "b"]), "g is open under f for:\na\nb");
});

test("a closure test reports one as-written test and one per family, each family naming the open spellings of both seeds (T-1.1)", (t) => {
  const child = runClosureTest(t, { seeds: [-1, -4], probes: [] });
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), ["ok 1 - g stays closed as written", "not ok 2 - g stays closed under plus ten", "not ok 3 - g stays closed under plus five"]);
  assert.deepEqual(failureOf(child.stdout, "plus ten"), ["-1+10", "-4+10"]);
  assert.deepEqual(failureOf(child.stdout, "plus five"), ["-1+5", "-4+5"]);
});

test("a probe a family would open fails only the as-written test (T-1.2)", (t) => {
  const child = runClosureTest(t, { seeds: [-20], probes: [-5, 3] });
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), ["not ok 1 - g stays closed as written", "ok 2 - g stays closed under plus ten", "ok 3 - g stays closed under plus five"]);
  assert.deepEqual(failureOf(child.stdout, "as written"), ["3"]);
});

const WORDS_MODULE = "export const WORDS = [-30, -40];\n";
const ROW_TESTS = ["ok 1 - g stays closed as written", "ok 2 - g stays closed under plus ten", "ok 3 - g stays closed under plus five"];

test("a row with no seed fails the row test naming its key (T-2.1)", (t) => {
  const child = runClosureTest(t, { seeds: [], rows: { table: "WORDS", seedsOf: "(row) => (row === -40 ? [] : [row])" } }, WORDS_MODULE);
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), [...ROW_TESTS, "not ok 4 - g covers every row of WORDS"]);
  assert.deepEqual(rowFailureOf(child.stdout, "WORDS"), ["-40 has no seed"]);
});

test("a seed for every row passes the row test, and the row seeds join every family test", (t) => {
  const child = runClosureTest(t, { seeds: [], rows: { table: "WORDS", seedsOf: "(row) => [row + 35]" } }, WORDS_MODULE);
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), ["not ok 1 - g stays closed as written", "not ok 2 - g stays closed under plus ten", "not ok 3 - g stays closed under plus five", "ok 4 - g covers every row of WORDS"]);
  assert.deepEqual(failureOf(child.stdout, "as written"), ["5"]);
  assert.deepEqual(failureOf(child.stdout, "plus ten"), ["5+10", "-5+10"]);
});

test("a closure whose import rejects fails only its row test, naming the module, and its families still name open spellings (T-2.2)", (t) => {
  const child = runClosureTest(t, { seeds: [-1], rows: { table: "WORDS", seedsOf: "(row) => [row]" } });
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), ["ok 1 - g stays closed as written", "not ok 2 - g stays closed under plus ten", "not ok 3 - g stays closed under plus five", "not ok 4 - g covers every row of WORDS"]);
  assert.deepEqual(failureOf(child.stdout, "plus ten"), ["-1+10"]);
  assert.match(rowFailureOf(child.stdout, "WORDS")[0], /^guard\.mjs does not load: /);
});

test("a closure whose table export is absent fails only its row test, naming the export and the module (T-2.2)", (t) => {
  const child = runClosureTest(t, { seeds: [-20], rows: { table: "WORDS", seedsOf: "(row) => [row]" } }, "export const OTHER = [];\n");
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), [...ROW_TESTS, "not ok 4 - g covers every row of WORDS"]);
  assert.deepEqual(rowFailureOf(child.stdout, "WORDS"), ["WORDS is not exported by guard.mjs"]);
});

test("a row whose seeds no family spells fails the row test naming the row (T-2.3)", (t) => {
  const child = runClosureTest(t, { seeds: [], rows: { table: "WORDS", seedsOf: `(row) => [row === -40 ? ${UNSPELLED_BELOW - 1} : row]` } }, WORDS_MODULE);
  assert.equal(child.status, 1, child.stdout);
  assert.deepEqual(testLines(child.stdout), [...ROW_TESTS, "not ok 4 - g covers every row of WORDS"]);
  assert.deepEqual(rowFailureOf(child.stdout, "WORDS"), ["-40 has seeds no family spells"]);
});

test("tableRows reads an array, a Set and a Map's keys", async () => {
  const loaded = await loadGuard(() => Promise.resolve({ A: ["x"], S: new Set(["y"]), M: new Map([["z", 1]]) }), "m.mjs");
  assert.deepEqual(["A", "S", "M"].map((name) => tableRows(loaded, name)), [
    { table: "A", path: "m.mjs", rows: ["x"], missing: null },
    { table: "S", path: "m.mjs", rows: ["y"], missing: null },
    { table: "M", path: "m.mjs", rows: ["z"], missing: null },
  ]);
});

test("tableRows names an export that is not a table, and the load failure of a module that does not load", async () => {
  const loaded = await loadGuard(() => Promise.resolve({ N: 3 }), "m.mjs");
  assert.deepEqual(tableRows(loaded, "N"), { table: "N", path: "m.mjs", rows: [], missing: "N in m.mjs is not an array, a Set or a Map" });
  const failed = await loadGuard(() => Promise.reject(new Error("boom")), "m.mjs");
  assert.deepEqual(failed, { path: "m.mjs", module: null, missing: "m.mjs does not load: boom" });
  assert.deepEqual(tableRows(failed, "N"), { table: "N", path: "m.mjs", rows: [], missing: "m.mjs does not load: boom" });
});

test("loadedExport returns an export and throws naming one that is absent", async () => {
  const loaded = await loadGuard(() => Promise.resolve({ f: Math.abs }), "m.mjs");
  assert.equal(loadedExport(loaded, "f"), Math.abs);
  assert.throws(() => loadedExport(loaded, "g"), /^Error: g is not exported by m\.mjs$/);
});

test("a closure test with no open spelling passes", (t) => {
  const child = runClosureTest(t, { seeds: [-20, -11], probes: [-5] });
  assert.equal(child.status, 0, child.stdout);
});

function labels(family, seed) {
  return family.spell(seed).map((spelling) => spelling.label);
}

test("pairPlaces puts the pair in the five addresses, in order (T-2.3)", () => {
  assert.deepEqual(labels(pairPlaces, "password=K"), [
    "https://a.example.com/x?password=K",
    "https://a.example.com/x?a=1&password=K",
    "Server=h;password=K",
    "jdbc:postgresql://h/db?user=a&password=K",
    "redis://h:6379?password=K",
  ]);
});

test("pairNames prefixes the name, then upper-cases it, each in a query string (T-2.3)", () => {
  assert.deepEqual(labels(pairNames, "password=K"), [
    "https://a.example.com/x?sslpassword=K",
    "https://a.example.com/x?client_password=K",
    "https://a.example.com/x?access_password=K",
    "https://a.example.com/x?X-Amz-password=K",
    "https://a.example.com/x?PASSWORD=K",
  ]);
});

test("a spelling's input is the address its label shows", () => {
  for (const spelling of [...pairPlaces.spell("pwd=V"), ...pairNames.spell("pwd=V")]) assert.equal(spelling.input, spelling.label);
});

test("pairNames refuses a seed that is not name=value", () => {
  assert.throws(() => pairNames.spell("password"), /a pair seed needs name=value, got password/);
});

const flagged = (interpreter, flag) => ({ interpreter, flag, program: "P" });
const fed = (interpreter) => ({ interpreter, flag: null, program: "P" });

test("programFlagSpellings spells the long, attached, cluster and leading forms, then the two repeated flags last (T-3.3)", () => {
  assert.deepEqual(labels(programFlagSpellings, flagged("node", "-e")), ["node --eval P", "node --eval=P", "node -pe P", "node --no-warnings -e P", "node -e P -e1", "node -e P -e 1"]);
  assert.deepEqual(labels(programFlagSpellings, flagged("php", "-r")), ["php -rP", "php -nr P", "php -nrP", "php -c php.ini -r P", "php -r P -r1", "php -r P -r 1"]);
  assert.deepEqual(labels(programFlagSpellings, flagged("awk", "-e")), ["awk --source P", "awk --source=P", "awk -eP", "awk -be P", "awk -beP", "awk -F : -e P", "awk -e P -e1", "awk -e P -e 1"]);
});

test("programFlagSpellings spells python3, ruby and perl through their attached flag and cluster letter", () => {
  assert.deepEqual(labels(programFlagSpellings, flagged("python3", "-c")).slice(0, 4), ["python3 -cP", "python3 -Bc P", "python3 -BcP", "python3 -X utf8 -c P"]);
  assert.deepEqual(labels(programFlagSpellings, flagged("ruby", "-e")).slice(0, 4), ["ruby -eP", "ruby -we P", "ruby -weP", "ruby -w -e P"]);
  assert.deepEqual(labels(programFlagSpellings, flagged("perl", "-e")).slice(0, 4), ["perl -eP", "perl -we P", "perl -weP", "perl -w -e P"]);
});

test("programFlagSpellings carries the program as its own word or attached to the long flag", () => {
  const inputs = programFlagSpellings.spell(flagged("node", "-e")).map((spelling) => spelling.input);
  assert.deepEqual(inputs.slice(0, 4), [
    { argv: ["node", "--eval", "P"], heredocs: [] },
    { argv: ["node", "--eval=P"], heredocs: [] },
    { argv: ["node", "-pe", "P"], heredocs: [] },
    { argv: ["node", "--no-warnings", "-e", "P"], heredocs: [] },
  ]);
});

test("programFlagSpellings skips the cluster for a row without a letter, and spells bun's --print and deno's subcommand", () => {
  assert.deepEqual(labels(programFlagSpellings, flagged("lua", "-e")).slice(0, 2), ["lua -eP", "lua -l mod -e P"]);
  assert.deepEqual(labels(programFlagSpellings, flagged("bun", "-p")).slice(0, 3), ["bun --print P", "bun --print=P", "bun --smol -p P"]);
  assert.deepEqual(labels(programFlagSpellings, flagged("deno", "eval")), ["deno -q eval P", "deno eval --quiet P"]);
});

test("programFlagSpellings returns nothing for a stdin seed or a flag outside the vocabulary (T-1.3)", () => {
  assert.deepEqual(programFlagSpellings.spell(fed("node")), []);
  assert.deepEqual(programFlagSpellings.spell(flagged("python3", "-e")), []);
});

test("programFlagSpellings and stdinSpellings throw on an interpreter with no vocabulary row (T-1.3)", () => {
  assert.throws(() => programFlagSpellings.spell(flagged("bash", "-c")), /no flag table row for the interpreter bash/);
  assert.throws(() => stdinSpellings.spell(fed("bash")), /no flag table row for the interpreter bash/);
  assert.throws(() => stdinSpellings.spell(flagged("bash", "-c")), /no flag table row for the interpreter bash/);
});

test("stdinSpellings returns nothing for a seed with a program flag, or for an interpreter that reads no standard input (T-1.3)", () => {
  assert.deepEqual(stdinSpellings.spell(flagged("python3", "-c")), []);
  assert.deepEqual(stdinSpellings.spell(fed("bun")), []);
});

test("stdinSpellings feeds tclsh a standard input file, then after its leading -encoding utf-8", () => {
  assert.deepEqual(labels(stdinSpellings, fed("tclsh")), ["tclsh /dev/stdin << P", "tclsh /dev/fd/0 << P", "tclsh /proc/self/fd/0 << P", "tclsh -encoding utf-8 /dev/stdin << P"]);
});

test("stdinSpellings gives awk only script flags, never a bare -, and gives R's script flags to R", () => {
  const awk = labels(stdinSpellings, fed("awk"));
  assert.deepEqual(awk.slice(0, 4), ["awk -f - << P", "awk -f- << P", "awk -f /dev/stdin << P", "awk -f/dev/stdin << P"]);
  assert.ok(awk.includes("awk --file=/dev/fd/0 << P") && awk.includes("awk -E /proc/self/fd/0 << P"));
  assert.ok(!awk.includes("awk - << P"));
  assert.deepEqual(labels(stdinSpellings, fed("Rscript")).slice(0, 4), ["Rscript - << P", "Rscript --vanilla - << P", "R -f - << P", "R -f- << P"]);
});

test("a stdin seed is written bare for an interpreter that reads standard input bare, else in its first reading", () => {
  assert.deepEqual(writtenSpellings({ grammar: interpreterArgv, seeds: [fed("python3"), fed("awk"), flagged("node", "-e")] }).map((spelling) => spelling.label), ["python3 << P", "awk -f - << P", "node -e P"]);
});

test("programSeeds crosses each program flag and the subcommand with every sample, then feeds each sample on standard input", () => {
  assert.deepEqual(programSeeds({ php: ["W"], deno: ["D"] }), [
    { interpreter: "php", flag: "-r", program: "W" },
    { interpreter: "php", flag: "-B", program: "W" },
    { interpreter: "php", flag: "-R", program: "W" },
    { interpreter: "php", flag: "-E", program: "W" },
    { interpreter: "php", flag: null, program: "<?php W" },
    { interpreter: "deno", flag: "eval", program: "D" },
  ]);
});

test("perlOpenModes gives 72 spellings of the seed's path, open(F, M) first, and nothing for another interpreter (T-3.4)", () => {
  const seed = { interpreter: "perl", flag: "-e", program: "open(F, '>src/a.pl')" };
  const spelled = labels(perlOpenModes, seed);
  assert.equal(spelled.length, 72);
  assert.deepEqual(spelled.slice(0, 3), ["perl -e open(F, '>src/a.pl')", "perl -e open F, '>src/a.pl'", "perl -e open(my $f, '>', 'src/a.pl')"]);
  assert.ok(spelled.includes("perl -e open F, '> src/a.pl'") && spelled.includes("perl -e open(my $f, \"+>\t\", \"src/a.pl\")"));
  assert.deepEqual(perlOpenModes.spell({ ...seed, interpreter: "ruby" }), []);
  assert.deepEqual(perlOpenModes.spell({ ...seed, program: "print 1" }), []);
});

const WRITE_CALL = String.raw`\.write\(|write_text\(|writeFileSync\(|writeFile\(|appendFileSync\(|File\.write|\bopen\([^)]*?(['"])[rbt]*[wa+][rwabt+]*\1|\bopen[ \t]*\(?[^;)\n'"]*['"](?:>|\+[<>])`;
const PHP_WRITE_CALL = String.raw`\bfile_put_contents\(|\bfopen\([^)]*?(['"])[waxc][bt+]*\1`;
const LUA_WRITE_CALL = String.raw`\bio\.open\([^)]*?(['"])[wa][b+]*\1|\bio\.output\(`;
const R_WRITE_CALL = String.raw`\bwriteLines\(|\bwriteChar\(|\bwriteBin\(|\bwrite(?:\.\w+)?\(|\bsink\(|\bcat\([^)]*\bfile\s*=|\bfile\([^)]*?(['"])[wa][bt+]*\1`;

test("splitAlternatives splits the write patterns at their top-level bars only (T-3.2)", () => {
  assert.equal(splitAlternatives(WRITE_CALL).length, 8);
  assert.deepEqual(splitAlternatives(PHP_WRITE_CALL), [String.raw`\bfile_put_contents\(`, String.raw`\bfopen\([^)]*?(['"])[waxc][bt+]*\1`]);
  assert.equal(splitAlternatives(LUA_WRITE_CALL).length, 2);
  assert.equal(splitAlternatives(R_WRITE_CALL).length, 7);
});

test("splitAlternatives keeps a bar inside a group, a class or after a backslash, and refuses an unclosed group", () => {
  assert.deepEqual(splitAlternatives(String.raw`a(b|c)|[|]|\||d`), ["a(b|c)", "[|]", String.raw`\|`, "d"]);
  assert.throws(() => splitAlternatives("(a|b"), /an unclosed group or class in \(a\|b/);
});

const fakeRow = (names, writeCall, more = {}) => ({ names, writeCall, ...more });

function rowSourceOver(rows, writes) {
  const byName = (name) => rows.find((row) => row.names.includes(name.toLowerCase()));
  return interpreterRowSource({ table: "FAKE", path: "fake.mjs", rows, missing: null }, byName, writes);
}

test("interpreterRowSource fails a row no vocabulary interpreter maps to, naming it (T-3.1)", () => {
  const rows = [fakeRow(["node"], /write\(/), fakeRow(["zsh"], /print/)];
  const source = rowSourceOver(rows, { node: ["write('src/a.ts')"] });
  assert.deepEqual(rowProblems(interpreterArgv, source), ["zsh has no seed", "zsh maps to no vocabulary interpreter"]);
});

test("interpreterRowSource fails a row flag the vocabulary does not spell, and an alternative no sample matches alone", () => {
  const rows = [fakeRow(["php"], /put\(|File\.put/, { programFlags: ["-r", "-Z"] })];
  const source = rowSourceOver(rows, { php: ["File.put(1)", "File.put 1"] });
  assert.deepEqual(rowProblems(interpreterArgv, source), ["php flag -Z has no spelling in the vocabulary", String.raw`php write alternative put\( is matched alone by no sample`]);
  const isolated = rowSourceOver(rows.map((row) => ({ ...row, programFlags: ["-r"] })), { php: ["File.put", "put(1)"] });
  assert.deepEqual(rowProblems(interpreterArgv, isolated), []);
});

test("writerWrappers spells the eleven wrapped forms in order (T-4.1)", () => {
  assert.deepEqual(labels(writerWrappers, { writer: "echo", program: "P", interpreter: "python3" }), [
    "command echo 'P' | python3",
    "builtin echo 'P' | python3",
    "env echo 'P' | python3",
    "env -i echo 'P' | python3",
    "exec echo 'P' | python3",
    "nice echo 'P' | python3",
    "nohup echo 'P' | python3",
    "time echo 'P' | python3",
    "{ echo 'P'; } | python3",
    "(echo 'P') | python3",
    "echo 'P' |& python3",
  ]);
});

test("shellCommands writes a piped seed as the writer, the quoted program and the interpreter", () => {
  assert.deepEqual(writtenSpellings({ grammar: shellCommands, seeds: [{ writer: "printf", program: "P", interpreter: "node" }] }), [{ label: "printf 'P' | node", input: "printf 'P' | node" }]);
});

test("stdinSpellings reads the heredoc after - and each standard input path alone, then after the leading flags", () => {
  const spellings = stdinSpellings.spell(fed("python3"));
  assert.deepEqual(spellings, [
    { label: "python3 - << P", input: { argv: ["python3", "-"], heredocs: ["P"] } },
    { label: "python3 /dev/stdin << P", input: { argv: ["python3", "/dev/stdin"], heredocs: ["P"] } },
    { label: "python3 /dev/fd/0 << P", input: { argv: ["python3", "/dev/fd/0"], heredocs: ["P"] } },
    { label: "python3 /proc/self/fd/0 << P", input: { argv: ["python3", "/proc/self/fd/0"], heredocs: ["P"] } },
    { label: "python3 -X utf8 - << P", input: { argv: ["python3", "-X", "utf8", "-"], heredocs: ["P"] } },
  ]);
});

test("distractorSentences puts the distractor before, after, joined by and, and on the line above (T-4.2)", () => {
  assert.deepEqual(labels(distractorSentences("D"), "Store it."), ["D. Store it.", "Store it. D.", "D, and store it.", "D\nStore it."]);
});

test("quotedSpans quotes the sentence four ways in a ticket request, then in a spec request (T-4.3)", () => {
  assert.deepEqual(labels(quotedSpans, "Store it."), [
    'Implement "store it" from the ticket.',
    "Implement `store it` from the ticket.",
    "Implement “store it” from the ticket.",
    "Implement 'store it' from the ticket.",
    'Make the API match the spec: "store it".',
  ]);
});

test("the prose families refuse a seed without a closing period", () => {
  assert.throws(() => quotedSpans.spell("Store it"), /a sentence seed ends with a period, got Store it/);
  assert.throws(() => distractorSentences("D").spell("Store it"), /a sentence seed ends with a period, got Store it/);
});

test("listPlacements puts the malformed item alone, before and after the valid check (T-5.2)", () => {
  const spellings = listPlacements(["V"]).spell({ label: "x", lines: ["M"] });
  assert.deepEqual(spellings, [
    { label: "x, alone", input: { label: "x, alone", lines: ["    drive:", "M"] } },
    { label: "x, before a valid check", input: { label: "x, before a valid check", lines: ["    drive:", "M", "V"] } },
    { label: "x, after a valid check", input: { label: "x, after a valid check", lines: ["    drive:", "V", "M"] } },
  ]);
});

test("outOfDomainNumbers spells NaN, both zeros, the negation and both infinities (T-6.2)", () => {
  const spellings = outOfDomainNumbers.spell(2);
  assert.deepEqual(spellings.map((spelling) => spelling.label), ["NaN", "0", "-0", "-2", "Infinity", "-Infinity"]);
  assert.deepEqual(spellings.map((spelling) => spelling.input), [NaN, 0, -0, -2, Infinity, -Infinity]);
});

test("numbers writes a seed as its negation, the first value outside a positive domain", () => {
  assert.deepEqual(writtenSpellings({ grammar: numbers, seeds: [2, 0] }), [{ label: "-2", input: -2 }, { label: "-0", input: -0 }]);
});

test("editPaths writes a seed as its relative path and spells five other forms, each labelled with the tool", () => {
  const seed = { tool: "Edit", rel: "a/b.md" };
  assert.deepEqual(writtenSpellings({ grammar: editPaths, seeds: [seed] }), [{ label: "Edit a/b.md", input: { ...seed, form: "relative" } }]);
  assert.deepEqual(familySpellings(editPaths.families[0], [seed]), [
    { label: "Edit absolute a/b.md", input: { ...seed, form: "absolute" } },
    { label: "Edit ./a/b.md", input: { ...seed, form: "dot" } },
    { label: "Edit services/../a/b.md", input: { ...seed, form: "parent" } },
    { label: "Edit upper-case folder on win32 a/b.md", input: { ...seed, form: "upper-case on win32" } },
    { label: "Edit symbolic link a/b.md", input: { ...seed, form: "symbolic link" } },
  ]);
});

test("a guard that masks only after ; leaves the other pair places open (T-2.4)", (t) => {
  const closure = {
    guard: "semicolon masker",
    run: (value) => value.replace(/;(\w+)=[^;]*/g, ";$1=***"),
    closed: (output) => !output.includes("K"),
  };
  assert.deepEqual(openSpellings(closure, familySpellings(pairPlaces, ["password=K"]), t).map((spelling) => spelling.label), [
    "https://a.example.com/x?password=K",
    "https://a.example.com/x?a=1&password=K",
    "jdbc:postgresql://h/db?user=a&password=K",
    "redis://h:6379?password=K",
  ]);
});
