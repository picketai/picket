import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import { withProject } from "#test/project.mts";

const SCRIPT = fileURLToPath(new URL("../../scripts/replay-rejected.mjs", import.meta.url));
const HELPER = readFileSync(new URL("../support/variants.mts", import.meta.url), "utf8");
const CLOSURE_TEST = "test/guard.variants.test.mjs";
const USAGE = "usage: node scripts/replay-rejected.mjs <rev> <test-file>...";

function guardSource(refusesAtOrBelow) {
  return `export const refusal = (n) => (n <= ${refusesAtOrBelow} ? "refused" : null);\n`;
}

function closureTestSource() {
  return [
    'import { closureTests } from "./support/variants.mts";',
    'import { refusal } from "../guard.mjs";',
    "closureTests({",
    '  guard: "refusal",',
    '  grammar: { name: "integers", written: (n) => n, label: String, families: [] },',
    "  seeds: [-1, 0],",
    "  run: refusal,",
    "  closed: (output) => output !== null,",
    "});",
  ].join("\n");
}

function guardRepository(t) {
  const root = gitRepo(t, { files: { "guard.mjs": guardSource(-2) } });
  const leavesMinusOneOpen = gitOut(root, "rev-parse", "HEAD");
  writeIn(root, "guard.mjs", guardSource(0));
  gitIn(root, "commit", "-q", "-am", "close -1");
  const closesMinusOne = gitOut(root, "rev-parse", "HEAD");
  writeIn(root, "test/support/variants.mts", HELPER);
  writeIn(root, CLOSURE_TEST, closureTestSource());
  return { root, leavesMinusOneOpen, closesMinusOne };
}

function replay(cwd, temp, args) {
  const env = { ...process.env, TMPDIR: temp, TMP: temp, TEMP: temp };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8", env });
}

test("a replay fails at the revision that leaves a seed open and passes where it is closed (T-1.5)", (t) => {
  const { root, leavesMinusOneOpen, closesMinusOne } = guardRepository(t);
  const temp = withProject(t, { picket: false });
  const open = replay(root, temp, [leavesMinusOneOpen, CLOSURE_TEST]);
  assert.equal(open.status, 1, open.stdout + open.stderr);
  assert.match(open.stdout, /refusal is open under as written for:/);
  assert.match(open.stdout, /^\s*-1$/m);
  const closed = replay(root, temp, [closesMinusOne, CLOSURE_TEST]);
  assert.equal(closed.status, 0, closed.stdout + closed.stderr);
  assert.deepEqual(readdirSync(temp), []);
});

test("a replay at an unknown revision exits 2 and names it (T-1.6)", (t) => {
  const { root } = guardRepository(t);
  const temp = withProject(t, { picket: false });
  const child = replay(root, temp, ["no-such-rev", CLOSURE_TEST]);
  assert.equal(child.status, 2, child.stderr);
  assert.equal(child.stderr.trim(), "replay-rejected: no commit named no-such-rev");
  assert.deepEqual(readdirSync(temp), []);
});

test("a replay with no test file exits 2 with the usage line (T-1.6)", (t) => {
  const { root } = guardRepository(t);
  const temp = withProject(t, { picket: false });
  const child = replay(root, temp, ["HEAD"]);
  assert.equal(child.status, 2, child.stderr);
  assert.equal(child.stderr.trim(), USAGE);
  assert.deepEqual(readdirSync(temp), []);
});

test("a replay naming a missing test file exits 2 and names the file", (t) => {
  const { root } = guardRepository(t);
  const temp = withProject(t, { picket: false });
  const child = replay(root, temp, ["HEAD", "test/none.test.mjs"]);
  assert.equal(child.status, 2, child.stderr);
  assert.equal(child.stderr.trim(), "replay-rejected: no test file test/none.test.mjs");
  assert.deepEqual(readdirSync(temp), []);
});
