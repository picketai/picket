import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { asWritten, closureFailure, distractorSentences, openSpellings, pairNames, pairPlaces, programFlagSpellings, quotedSpans, stdinSpellings } from "#test/variants.mts";
import { withProject } from "#test/project.mts";

const HELPER_URL = new URL("../support/variants.mts", import.meta.url).href;

function positiveOnly(seeds) {
  return {
    guard: "g",
    run: (n) => (n > 0 ? null : "refused"),
    closed: (output) => output !== null,
    checks: [{ family: asWritten(String), seeds }],
  };
}

function closureTestSource(seeds) {
  return [
    `import { asWritten, closureTests } from ${JSON.stringify(HELPER_URL)};`,
    "closureTests({",
    '  guard: "g",',
    '  run: (n) => (n > 0 ? null : "refused"),',
    "  closed: (output) => output !== null,",
    `  checks: [{ family: asWritten(String), seeds: ${JSON.stringify(seeds)} }],`,
    "});",
  ].join("\n");
}

function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function runClosureTest(t, seeds) {
  const file = join(withProject(t, { picket: false }), "guard.variants.test.mjs");
  writeFileSync(file, closureTestSource(seeds));
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], { encoding: "utf8", env: childEnv() });
}

test("openSpellings returns exactly the open spellings in family order (T-1.1)", (t) => {
  const closure = positiveOnly([-1, 0, 2]);
  const open = openSpellings(closure, closure.checks[0], t);
  assert.deepEqual(open, [{ label: "2", input: 2 }]);
});

test("openSpellings visits every spelling of every seed in order", (t) => {
  const twice = { name: "twice", spell: (n) => [{ label: `${n}a`, input: n }, { label: `${n}b`, input: n + 10 }] };
  const closure = { ...positiveOnly([]), checks: [{ family: twice, seeds: [-20, -5] }] };
  assert.deepEqual(openSpellings(closure, closure.checks[0], t).map((s) => s.label), ["-5b"]);
});

test("closureFailure names the guard and family, then one label per line (T-1.2)", () => {
  assert.equal(closureFailure("g", "f", ["a", "b"]), "g is open under f for:\na\nb");
});

test("a closure test with an open seed fails and names the open label (T-1.3)", (t) => {
  const child = runClosureTest(t, [-1, 7]);
  assert.equal(child.status, 1, child.stdout);
  assert.match(child.stdout, /g stays closed under as written/);
  assert.match(child.stdout, /g is open under as written for:/);
  assert.match(child.stdout, /^\s*7$/m);
});

test("a closure test with no open seed passes (T-1.3)", (t) => {
  const child = runClosureTest(t, [-1, 0]);
  assert.equal(child.status, 0, child.stdout);
  assert.match(child.stdout, /ok 1 - g stays closed under as written/);
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

test("programFlagSpellings spells the long form, the attached form, the cluster and leading flags (T-3.2)", () => {
  assert.deepEqual(labels(programFlagSpellings, { argv: ["node", "-e", "P"], heredocs: [] }), ["node --eval P", "node --eval=P", "node -pe P", "node --no-warnings -e P"]);
  assert.deepEqual(labels(programFlagSpellings, { argv: ["python3", "-c", "P"], heredocs: [] }), ["python3 -Bc P", "python3 -X utf8 -c P"]);
});

test("programFlagSpellings carries the program as its own word or attached to the long flag", () => {
  const inputs = programFlagSpellings.spell({ argv: ["node", "-e", "P"], heredocs: [] }).map((spelling) => spelling.input);
  assert.deepEqual(inputs, [
    { argv: ["node", "--eval", "P"], heredocs: [] },
    { argv: ["node", "--eval=P"], heredocs: [] },
    { argv: ["node", "-pe", "P"], heredocs: [] },
    { argv: ["node", "--no-warnings", "-e", "P"], heredocs: [] },
  ]);
});

test("programFlagSpellings throws on an interpreter missing from the table (T-3.3)", () => {
  assert.throws(() => programFlagSpellings.spell({ argv: ["perl", "-e", "P"], heredocs: [] }), /no flag table row for the interpreter perl/);
});

test("stdinSpellings reads the heredoc after - alone and after the leading flags (T-3.4)", () => {
  const spellings = stdinSpellings.spell({ argv: ["python3"], heredocs: ["P"] });
  assert.deepEqual(spellings, [
    { label: "python3 - << P", input: { argv: ["python3", "-"], heredocs: ["P"] } },
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

test("a guard that masks only after ; leaves the other pair places open (T-2.4)", (t) => {
  const closure = {
    guard: "semicolon masker",
    run: (value) => value.replace(/;(\w+)=[^;]*/g, ";$1=***"),
    closed: (output) => !output.includes("K"),
    checks: [{ family: pairPlaces, seeds: ["password=K"] }],
  };
  assert.deepEqual(openSpellings(closure, closure.checks[0], t).map((spelling) => spelling.label), [
    "https://a.example.com/x?password=K",
    "https://a.example.com/x?a=1&password=K",
    "jdbc:postgresql://h/db?user=a&password=K",
    "redis://h:6379?password=K",
  ]);
});
