import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { asWritten, closureFailure, openSpellings } from "#test/variants.mts";
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
