import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const BIN = resolve("core/bin/tether.mjs");
const TEMPLATE = readFileSync(resolve("core/templates/claude-block.md"), "utf8").replace(/\r\n/g, "\n");

function tempDir(prefix = "tether-init-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

function gitRepo() {
  const root = tempDir();
  execFileSync("git", ["-C", root, "init", "-q"]);
  return root;
}

function runInit(cwd, { env = {}, args = [] } = {}) {
  const { CLAUDE_PROJECT_DIR, ...base } = process.env;
  const r = spawnSync("node", [BIN, "init", ...args], { cwd, env: { ...base, ...env }, encoding: "utf8" });
  return { code: r.status, json: r.stdout.trim().startsWith("{") ? JSON.parse(r.stdout) : null, stdout: r.stdout, stderr: r.stderr };
}

function results(report) {
  return Object.fromEntries(report.steps.map((s) => [s.name, s.result]));
}

function read(root, ...path) {
  return readFileSync(join(root, ...path), "utf8");
}

test("init creates the CLAUDE.md block, the config and the ignore line in a fresh repo", () => {
  const root = gitRepo();
  try {
    const r = runInit(root);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(results(r.json), { "claude-md": "created", config: "created", gitignore: "created" });
    assert.equal(read(root, "CLAUDE.md"), `${TEMPLATE}\n## Project facts\n`);
    assert.deepEqual(JSON.parse(read(root, ".tether", "config.json")), { version: 1 });
    assert.ok(read(root, ".gitignore").split("\n").includes(".tether/state/"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a second init reports every step unchanged and leaves the files byte-identical", () => {
  const root = gitRepo();
  try {
    runInit(root);
    const before = ["CLAUDE.md", ".tether/config.json", ".gitignore"].map((p) => read(root, p));
    const r = runInit(root);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(results(r.json), { "claude-md": "unchanged", config: "unchanged", gitignore: "unchanged" });
    assert.deepEqual(["CLAUDE.md", ".tether/config.json", ".gitignore"].map((p) => read(root, p)), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init replaces only the Tether block and keeps the project's own heading and facts", () => {
  const root = gitRepo();
  try {
    const app = "# My app\n\nA billing service.\n\n";
    const oldBlock = "# Tether\n\nOld intro.\n\n## Every request\n\n1. Old step.\n2. An extra line a user added.\n\n## Rules\n\nOld rules.\n\n";
    const facts = "## Project facts\n\n- The API listens on 8080.\n";
    writeFileSync(join(root, "CLAUDE.md"), app + oldBlock + facts);
    const r = runInit(root);
    assert.equal(results(r.json)["claude-md"], "updated");
    assert.equal(read(root, "CLAUDE.md"), `${app}${TEMPLATE}\n${facts}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init appends the block to a CLAUDE.md without one, and a rerun keeps it", () => {
  const root = gitRepo();
  try {
    writeFileSync(join(root, "CLAUDE.md"), "# My app\n\nA billing service.\n");
    assert.equal(results(runInit(root).json)["claude-md"], "updated");
    assert.equal(read(root, "CLAUDE.md"), `# My app\n\nA billing service.\n\n${TEMPLATE}`);
    assert.equal(results(runInit(root).json)["claude-md"], "unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init leaves an existing config and an ignore file that already holds the state line", () => {
  const root = gitRepo();
  try {
    mkdirSync(join(root, ".tether"));
    const config = JSON.stringify({ version: 1, sources: { analysis: { env: "SRC_ANALYSIS" } } }, null, 2) + "\n";
    writeFileSync(join(root, ".tether", "config.json"), config);
    writeFileSync(join(root, ".gitignore"), "node_modules/\n.tether/state/\n");
    const r = runInit(root);
    assert.equal(results(r.json).config, "unchanged");
    assert.equal(results(r.json).gitignore, "unchanged");
    assert.equal(read(root, ".tether", "config.json"), config);
    assert.equal(read(root, ".gitignore"), "node_modules/\n.tether/state/\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init writes at the git top level from a subfolder, in the cwd outside git, and refuses the home folder", () => {
  const repo = gitRepo();
  const plain = tempDir();
  const home = tempDir();
  try {
    mkdirSync(join(repo, "src"));
    assert.equal(runInit(join(repo, "src")).code, 0);
    assert.ok(existsSync(join(repo, "CLAUDE.md")));
    assert.equal(existsSync(join(repo, "src", "CLAUDE.md")), false);

    assert.equal(runInit(plain).code, 0);
    assert.ok(existsSync(join(plain, "CLAUDE.md")));

    const refused = runInit(home, { env: { HOME: home, USERPROFILE: home } });
    assert.equal(refused.code, 2);
    assert.match(refused.json.error, /home folder/);
    assert.deepEqual(readdirSync(home), []);
  } finally {
    for (const dir of [repo, plain, home]) rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's CLAUDE.md carries the shipped block verbatim, with no repository-only text in it", () => {
  const own = readFileSync(resolve("CLAUDE.md"), "utf8").replace(/\r\n/g, "\n");
  assert.ok(own.startsWith(TEMPLATE), "CLAUDE.md must start with core/templates/claude-block.md");
  assert.equal(TEMPLATE.includes("--plugin-dir"), false);
  assert.equal(TEMPLATE.includes("harness-authoring"), false);
});
