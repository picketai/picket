import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { detectTooling } from "./tooling.mts";
import { loadConfig } from "./config.mjs";
import { withProject, writeConfig } from "#test/project.mts";

const MALFORMED = '{ "scripts": { "test": "node t.js", }';
const DOTNET = { test: "dotnet test", lint: null, build: "dotnet build", run: null, stack: "dotnet" };
const NO_COMMANDS = { test: null, lint: null, build: null, run: null };

function withFiles(t: TestContext, files: Record<string, string>): string {
  const root = withProject(t, { picket: false });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  return root;
}

for (const file of ["App.sln", "App.slnx", "Directory.Build.props"]) {
  test(`a folder holding only ${file} is a dotnet project`, (t) => {
    assert.deepEqual(detectTooling(withFiles(t, { [file]: "" })), { tooling: DOTNET, warnings: [] });
  });
}

test("a folder holding only pyproject.toml runs pytest", (t) => {
  const { tooling, warnings } = detectTooling(withFiles(t, { "pyproject.toml": "" }));
  assert.equal(tooling.stack, "python");
  assert.equal(tooling.test, "pytest");
  assert.deepEqual(warnings, []);
});

test("a malformed package.json detects no npm script and says why, without throwing", (t) => {
  const { tooling, warnings } = detectTooling(withFiles(t, { "package.json": MALFORMED }));
  assert.deepEqual(tooling, { ...NO_COMMANDS, stack: "node" });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^package\.json is not valid JSON \(.+\); no npm scripts detected$/);
});

test("a package.json that is not a JSON object gives one warning", (t) => {
  const { tooling, warnings } = detectTooling(withFiles(t, { "package.json": "null" }));
  assert.deepEqual(tooling, { ...NO_COMMANDS, stack: "node" });
  assert.deepEqual(warnings, ["package.json is not a JSON object; no npm scripts detected"]);
});

test("a configured command overrides detection; a destructive one is dropped with a warning (T-5.4)", (t) => {
  const configured = withFiles(t, { "package.json": JSON.stringify({ scripts: { test: "vitest run" } }) });
  writeConfig(configured, { version: 1, commands: { test: "node -e 1" } });
  assert.equal(detectTooling(configured).tooling.test, "node -e 1");
  const destructive = withFiles(t, { "package.json": JSON.stringify({ scripts: { test: "vitest run" } }) });
  writeConfig(destructive, { version: 1, commands: { test: "rm -rf ." } });
  const c = loadConfig(destructive, {});
  assert.deepEqual(c.commands, {});
  assert.match(c.warnings[0], /commands\.test dropped: .*destructive/);
  assert.equal(detectTooling(destructive).tooling.test, "npm test");
});

test("a configured test command wins over a malformed package.json, and the warning stays", (t) => {
  const root = withFiles(t, { "package.json": MALFORMED });
  writeConfig(root, { version: 1, commands: { test: "node -e 1" } });
  const { tooling, warnings } = detectTooling(root);
  assert.equal(tooling.test, "node -e 1");
  assert.match(warnings[0], /^package\.json is not valid JSON/);
});
