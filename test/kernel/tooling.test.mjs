import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectTooling } from "../../dist/lib/shared/tooling.mjs";
import { writeConfig } from "./config-fixture.mjs";

const MALFORMED = '{ "scripts": { "test": "node t.js", }';
const DOTNET = { test: "dotnet test", lint: null, build: "dotnet build", run: null, stack: "dotnet" };
const NO_COMMANDS = { test: null, lint: null, build: null, run: null };

function withFiles(files, body) {
  const root = mkdtempSync(join(tmpdir(), "picket-tooling-"));
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const file of ["App.sln", "App.slnx", "Directory.Build.props"]) {
  test(`a folder holding only ${file} is a dotnet project`, () => {
    withFiles({ [file]: "" }, (root) => assert.deepEqual(detectTooling(root), { tooling: DOTNET, warnings: [] }));
  });
}

test("a folder holding only pyproject.toml runs pytest", () => {
  withFiles({ "pyproject.toml": "" }, (root) => {
    const { tooling, warnings } = detectTooling(root);
    assert.equal(tooling.stack, "python");
    assert.equal(tooling.test, "pytest");
    assert.deepEqual(warnings, []);
  });
});

test("a malformed package.json detects no npm script and says why, without throwing", () => {
  withFiles({ "package.json": MALFORMED }, (root) => {
    const { tooling, warnings } = detectTooling(root);
    assert.deepEqual(tooling, { ...NO_COMMANDS, stack: "node" });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^package\.json is not valid JSON \(.+\); no npm scripts detected$/);
  });
});

test("a package.json that is not a JSON object gives one warning", () => {
  withFiles({ "package.json": "null" }, (root) => {
    const { tooling, warnings } = detectTooling(root);
    assert.deepEqual(tooling, { ...NO_COMMANDS, stack: "node" });
    assert.deepEqual(warnings, ["package.json is not a JSON object; no npm scripts detected"]);
  });
});

test("a configured test command wins over a malformed package.json, and the warning stays", () => {
  withFiles({ "package.json": MALFORMED }, (root) => {
    writeConfig(root, { version: 1, commands: { test: "node -e 1" } });
    const { tooling, warnings } = detectTooling(root);
    assert.equal(tooling.test, "node -e 1");
    assert.match(warnings[0], /^package\.json is not valid JSON/);
  });
});
