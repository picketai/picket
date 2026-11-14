import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { asWritten, closureFailure, openSpellings, pairNames, pairPlaces } from "#test/variants.mts";
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
