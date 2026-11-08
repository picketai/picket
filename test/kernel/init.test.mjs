import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { init } from "../../dist/lib/verbs/init/init.mjs";
import { INSTALL } from "../../dist/lib/shared/install.mjs";

const TEMPLATE = readFileSync(resolve("src/templates/claude-block.md"), "utf8").replace(/\r\n/g, "\n");
const NO_PATH = { PATH: "" };

function tempDir(prefix = "picket-init-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

function gitRepo() {
  const root = tempDir();
  execFileSync("git", ["-C", root, "init", "-q"]);
  return root;
}

function results(report) {
  return Object.fromEntries(report.steps.map((s) => [s.name, s.result]));
}

function read(root, ...path) {
  return readFileSync(join(root, ...path), "utf8");
}

test("this repository's CLAUDE.md carries the shipped block verbatim, with no repository-only text in it", () => {
  const own = readFileSync(resolve("CLAUDE.md"), "utf8").replace(/\r\n/g, "\n");
  assert.ok(own.startsWith(TEMPLATE), "CLAUDE.md must start with src/templates/claude-block.md");
  assert.equal(TEMPLATE.includes("--plugin-dir"), false);
  assert.equal(TEMPLATE.includes("harness-authoring"), false);
});

function recordingRunner() {
  const calls = [];
  const exec = (command, args, options) => calls.push({ command, args, cwd: options.cwd });
  return { calls, exec };
}

test("the built init writes the settings marketplace and installs picket alone, from the project root", () => {
  const root = gitRepo();
  try {
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec, env: NO_PATH });
    assert.deepEqual(calls, [{ command: "claude", args: ["plugin", "install", "picket@picketai", "--scope", "project"], cwd: root }]);
    assert.deepEqual(JSON.parse(read(root, ".claude", "settings.json")).extraKnownMarketplaces, { picketai: INSTALL.marketplace });
    assert.deepEqual(report.steps.slice(-2).map(({ name, result }) => `${name} ${result}`), ["marketplace created", "plugin created"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the built init runs no claude command when the project already holds the settings marketplace and picket", () => {
  const root = gitRepo();
  try {
    mkdirSync(join(root, ".claude"));
    writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify({ extraKnownMarketplaces: { picketai: INSTALL.marketplace }, enabledPlugins: { "picket@picketai": true } }));
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec, env: NO_PATH });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "unchanged");
    assert.equal(results(report).plugin, "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
