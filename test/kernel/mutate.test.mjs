import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createWork } from "../../dist/lib/shared/work/work.mjs";
import { mutate, pickMutant, renderMutation } from "../../dist/lib/verbs/mutate/mutate.mjs";
import { STATE_FILES, statePath } from "../../dist/lib/shared/paths.mjs";
import { reviewSummary } from "../../dist/lib/shared/review-summary.mjs";
import { writeConfig } from "./config-fixture.mjs";

const BIN = resolve("dist/bin/picket.mjs");
const SOURCE = "export function same(a, b) {\n  return 0;\n}\n";
const CHANGED = "export function same(a, b) {\n  if (a === b) return 1;\n  return 0;\n}\n";
const PROBE = 'const text = require("fs").readFileSync("src/same.js", "utf8");\nprocess.exit(text.includes("!==") ? 1 : 0);\n';
const BUILD = 'const fs = require("fs");\nfs.mkdirSync("out", { recursive: true });\nfs.copyFileSync("src/same.js", "out/same.js");\n';
const NO_OPERATOR = SOURCE.replace("return 0;", "return 0;\n  const x = 1;");

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function write(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function repo({ testCommand = "node -e 0", buildCommand = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "harness-mutate-"));
  mkdirSync(join(root, ".claude"));
  git(root, "init", "-q", "-b", "trunk");
  write(root, "src/same.js", SOURCE);
  write(root, "probe.cjs", PROBE);
  write(root, "build.cjs", BUILD);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  if (testCommand) writeConfig(root, { version: 1, commands: buildCommand ? { test: testCommand, build: buildCommand } : { test: testCommand } });
  const id = createWork({ lane: "order", title: "Same", root }).id;
  return { root, id };
}

function withRepo(options, fn) {
  const r = repo(options);
  try {
    fn(r);
  } finally {
    rmSync(r.root, { recursive: true, force: true });
  }
}

test("a mutant the tests do not catch survives, is saved to mutation.json, and the file is restored byte for byte (T-6.1)", () => {
  withRepo({}, ({ root, id }) => {
    write(root, "src/same.js", CHANGED);
    const printed = execFileSync("node", [BIN, "mutate", id, "--root", root, "--human"], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } }).trim();
    assert.equal(printed, "mutant src/same.js:2 === -> !==: survived");
    const saved = JSON.parse(readFileSync(join(root, "work", id, "mutation.json"), "utf8"));
    assert.deepEqual([saved.outcome, saved.mutant], ["survived", { path: "src/same.js", line: 2, from: "===", to: "!==" }]);
    assert.equal(saved.command, "node -e 0");
    assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
    assert.equal(existsSync(statePath(root, STATE_FILES.mutationRestore)), false);
  });
});

test("a test that catches the inversion kills the mutant (T-6.2)", () => {
  withRepo({ testCommand: "node probe.cjs" }, ({ root, id }) => {
    write(root, "src/same.js", CHANGED);
    assert.equal(mutate(id, { root }).outcome, "killed");
    assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
  });
});

test("no added operator is no candidate; no test command is no test command (T-6.2)", () => {
  withRepo({}, ({ root, id }) => {
    write(root, "src/same.js", SOURCE.replace("return 0;", "return 0;\n  const x = 1;"));
    const none = mutate(id, { root });
    assert.deepEqual([none.outcome, none.mutant], ["no candidate", null]);
    assert.equal(renderMutation(none), "mutant none: no candidate");
  });
  withRepo({ testCommand: null }, ({ root, id }) => {
    write(root, "src/same.js", CHANGED);
    const result = mutate(id, { root });
    assert.deepEqual([result.outcome, result.command], ["no test command", null]);
    assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
  });
});

test("a test command that builds leaves the mutant in the build output, so mutate rebuilds from the restored source", () => {
  withRepo({ testCommand: "node build.cjs", buildCommand: "node build.cjs" }, ({ root, id }) => {
    write(root, "src/same.js", CHANGED);
    const result = mutate(id, { root });
    assert.equal(result.outcome, "survived");
    assert.equal(result.rebuild, "passed");
    assert.equal(readFileSync(join(root, "out", "same.js"), "utf8"), CHANGED);
  });
});

test("a file restored from an interrupted run is rebuilt even with no candidate, and no build command is none detected", () => {
  withRepo({ buildCommand: "node build.cjs" }, ({ root, id }) => {
    write(root, "src/same.js", CHANGED.replace("===", "!=="));
    write(root, "out/same.js", "export const stale = 1;\n");
    mkdirSync(dirname(statePath(root, STATE_FILES.mutationRestore)), { recursive: true });
    writeFileSync(statePath(root, STATE_FILES.mutationRestore), JSON.stringify({ path: "src/same.js", original: Buffer.from(NO_OPERATOR).toString("base64") }));
    const result = mutate(id, { root });
    assert.deepEqual([result.outcome, result.rebuild], ["no candidate", "passed"]);
    assert.equal(readFileSync(join(root, "out", "same.js"), "utf8"), NO_OPERATOR);
  });
  withRepo({}, ({ root, id }) => {
    write(root, "src/same.js", CHANGED);
    assert.equal(mutate(id, { root }).rebuild, "none detected");
  });
});

test("a failed rebuild is reported, since the build output may still hold the mutant", () => {
  const failed = { mutant: { path: "src/a.js", line: 3, from: "<", to: ">=" }, outcome: "survived", rebuild: "failed" };
  assert.equal(renderMutation(failed), "mutant src/a.js:3 < -> >=: survived\nrebuild after restoring: failed; the build output may still hold the mutant");
  assert.equal(renderMutation({ ...failed, rebuild: "passed" }), "mutant src/a.js:3 < -> >=: survived");
});

test("a suite that is red before any mutant is baseline red, and no mutant is written", () => {
  withRepo({ testCommand: "node probe.cjs" }, ({ root, id }) => {
    write(root, "src/same.js", CHANGED.replace("===", "!=="));
    const before = readFileSync(join(root, "src", "same.js"), "utf8");
    const result = mutate(id, { root });
    assert.deepEqual([result.outcome, result.mutant], ["baseline red", null]);
    assert.equal(renderMutation(result), "mutant none: baseline red");
    assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), before);
  });
});

test("a restore record left by an interrupted run is applied before the next pick (T-6.3)", () => {
  withRepo({}, ({ root, id }) => {
    write(root, "src/same.js", CHANGED.replace("===", "!=="));
    mkdirSync(dirname(statePath(root, STATE_FILES.mutationRestore)), { recursive: true });
    writeFileSync(statePath(root, STATE_FILES.mutationRestore), JSON.stringify({ path: "src/same.js", original: Buffer.from(CHANGED).toString("base64") }));
    const result = mutate(id, { root });
    assert.equal(result.restored, "src/same.js");
    assert.equal(result.mutant.from, "===", "the pick saw the restored file, not the leftover mutant");
    assert.match(renderMutation(result), /^restored src\/same\.js from an interrupted run\nmutant src\/same\.js:2 === -> !==: survived$/);
    assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
  });
});

test("an operator in a string or comment is never mutated, and a test file is never chosen (T-6.4)", () => {
  withRepo({}, ({ root }) => {
    const base = git(root, "rev-parse", "HEAD");
    write(root, "src/same.js", SOURCE.replace("return 0;", 'return 0;\n  const s = "a === b"; // a && b'));
    write(root, "test/same.test.js", "if (a === b) throw new Error();\n");
    write(root, "src/same.test.js", "expect(a === b).toBe(true);\n");
    assert.equal(pickMutant(root, base), null);
    write(root, "src/later.js", "const ok = a < b && c;\n");
    assert.deepEqual(pickMutant(root, base), { path: "src/later.js", line: 1, col: 13, from: "<", to: ">=" });
  });
});

test("generics and arrows are not comparisons; the first operator by path, line and column is picked", () => {
  withRepo({}, ({ root }) => {
    const base = git(root, "rev-parse", "HEAD");
    write(root, "src/b.ts", "const m: Map<string, number> = new Map();\nconst f = (x) => x;\nconst t = x >= 1 || false;\n");
    write(root, "src/a.ts", "const y = 1;\n");
    write(root, "src/c.ts", "const z = a === b;\n");
    assert.deepEqual(pickMutant(root, base), { path: "src/b.ts", line: 3, col: 12, from: ">=", to: "<" });
  });
});

test("the review summary carries the saved mutation (T-6.5)", () => {
  withRepo({}, ({ root, id }) => {
    assert.equal(reviewSummary(id, { root }).mutation, null);
    write(root, "src/same.js", CHANGED);
    mutate(id, { root });
    assert.equal(reviewSummary(id, { root }).mutation.outcome, "survived");
  });
});
