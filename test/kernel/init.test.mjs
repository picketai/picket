import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { init, marketplaceRoot } from "../../dist/lib/verbs/init/init.mjs";

const TEMPLATE = readFileSync(resolve("src/templates/claude-block.md"), "utf8").replace(/\r\n/g, "\n");

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

function recordingRunner(onCall = () => {}) {
  const calls = [];
  const exec = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    onCall(command, args, options);
  };
  return { calls, exec };
}

test("init registers the marketplace, then installs picket, picket-status and picket-markdown, all from the project root", () => {
  const root = gitRepo();
  try {
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    const checkout = marketplaceRoot();
    assert.ok(checkout, "this checkout holds .claude-plugin/marketplace.json");
    assert.deepEqual(calls, [
      { command: "claude", args: ["plugin", "marketplace", "add", checkout, "--scope", "project"], cwd: root },
      { command: "claude", args: ["plugin", "install", "picket@picketai", "--scope", "project"], cwd: root },
      { command: "claude", args: ["plugin", "install", "picket-status@picketai", "--scope", "project"], cwd: root },
      { command: "claude", args: ["plugin", "install", "picket-markdown@picketai", "--scope", "project"], cwd: root },
    ]);
    assert.equal(results(report).marketplace, "created");
    assert.equal(results(report).plugin, "created");
    assert.equal(results(report).status, "created");
    assert.equal(results(report).markdown, "created");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const KNOWN_MARKETPLACE = { picketai: { source: { source: "directory", path: "x" } } };

function installedSettings(root, enabledPlugins) {
  mkdirSync(join(root, ".claude"));
  writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify({ extraKnownMarketplaces: KNOWN_MARKETPLACE, enabledPlugins }));
}

test("init runs no claude command when the project already knows the marketplace and all three plugins", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": true, "picket-markdown@picketai": true });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "unchanged");
    assert.equal(results(report).plugin, "unchanged");
    assert.equal(results(report).status, "unchanged");
    assert.equal(results(report).markdown, "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init leaves a disabled picket-status disabled and runs no claude command for it", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": false, "picket-markdown@picketai": true });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    assert.deepEqual(calls, []);
    assert.equal(results(report).status, "unchanged");
    assert.equal(JSON.parse(read(root, ".claude", "settings.json")).enabledPlugins["picket-status@picketai"], false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init leaves a disabled picket-markdown disabled and runs no claude command for it", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": true, "picket-markdown@picketai": false });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec });
    assert.deepEqual(calls, []);
    assert.equal(results(report).markdown, "unchanged");
    assert.equal(JSON.parse(read(root, ".claude", "settings.json")).enabledPlugins["picket-markdown@picketai"], false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("installed from the cache, with no marketplace beside the plugin, a rerun reports the install unchanged", () => {
  const root = gitRepo();
  try {
    installedSettings(root, { "picket@picketai": true, "picket-status@picketai": true, "picket-markdown@picketai": true });
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec, market: null });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "unchanged");
    assert.equal(results(report).plugin, "unchanged");
    assert.equal(results(report).status, "unchanged");
    assert.equal(results(report).markdown, "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("with no marketplace beside the plugin, an uninstalled project fails all four install steps without running claude", () => {
  const root = gitRepo();
  try {
    const { calls, exec } = recordingRunner();
    const report = init(root, { exec, market: null });
    assert.deepEqual(calls, []);
    assert.equal(results(report).marketplace, "failed");
    assert.equal(results(report).plugin, "failed");
    assert.equal(results(report).status, "failed");
    assert.equal(results(report).markdown, "failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a failing claude command fails its step and the exit, and --no-install runs none", () => {
  const root = gitRepo();
  try {
    const { exec } = recordingRunner((command, args) => {
      if (args[1] === "marketplace") throw Object.assign(new Error("exit 1"), { stderr: "warming up\nmarketplace source not found\n" });
    });
    const report = init(root, { exec });
    assert.equal(results(report).marketplace, "failed");
    const detail = report.steps.find((s) => s.name === "marketplace").detail;
    assert.match(detail, /^marketplace source not found; run by hand: claude plugin marketplace add/);
    assert.match(detail, /then claude plugin install picket@picketai --scope project, then claude plugin install picket-status@picketai --scope project, then claude plugin install picket-markdown@picketai --scope project$/);
    assert.equal(results(report).plugin, "created");
    assert.equal(results(report).status, "created");
    assert.equal(results(report).markdown, "created");
    assert.equal(results(report)["claude-md"], "created");

    const skipped = recordingRunner();
    const quiet = init(root, { install: false, exec: skipped.exec });
    assert.deepEqual(skipped.calls, []);
    assert.equal(results(quiet).marketplace, "skipped");
    assert.equal(results(quiet).plugin, "skipped");
    assert.equal(results(quiet).status, "skipped");
    assert.equal(results(quiet).markdown, "skipped");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
