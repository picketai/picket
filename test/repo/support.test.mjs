import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withProject } from "#test/project.mts";

const PROJECT_HELPER = pathToFileURL(resolve("test", "support", "project.mts")).href;
const PRINTED_ROOT = /ROOT=(.+)$/m;

function failingTestSource() {
  return [
    'import { test } from "node:test";',
    `import { withProject } from ${JSON.stringify(PROJECT_HELPER)};`,
    'test("fails after making a project", (t) => {',
    "  const root = withProject(t);",
    "  console.log(`ROOT=${root}`);",
    '  throw new Error("planned failure");',
    "});",
  ].join("\n");
}

function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

test("withProject removes its folder when the test using it fails (T-1.4)", (t) => {
  const scratch = withProject(t);
  const file = join(scratch, "fails.test.mjs");
  writeFileSync(file, failingTestSource());
  const child = spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], { encoding: "utf8", env: childEnv() });
  assert.notEqual(child.status, 0, child.stdout);
  const printed = child.stdout.match(PRINTED_ROOT);
  assert.ok(printed, child.stdout);
  const root = printed[1].trim();
  assert.ok(root.length > 0);
  assert.equal(existsSync(root), false, root);
});
