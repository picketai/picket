import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { mutate, renderMutation, verb } from "./index.mts";
import { STATE_FILES, statePath } from "../../shared/paths.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitRepo, writeIn } from "#test/git.mts";
import { openItem, writeConfig } from "#test/project.mts";

const SOURCE = "export function same(a, b) {\n  return 0;\n}\n";
const CHANGED = "export function same(a, b) {\n  if (a === b) return 1;\n  return 0;\n}\n";
const PROBE = 'const text = require("fs").readFileSync("src/same.js", "utf8");\nprocess.exit(text.includes("!==") ? 1 : 0);\n';
const BUILD = 'const fs = require("fs");\nfs.mkdirSync("out", { recursive: true });\nfs.copyFileSync("src/same.js", "out/same.js");\n';
const NO_OPERATOR = SOURCE.replace("return 0;", "return 0;\n  const x = 1;");
const OPTIONS = { env: process.env, now: () => new Date() };

type RepoSetup = { testCommand?: string | null; buildCommand?: string | null };

function repo(t: TestContext, { testCommand = "node -e 0", buildCommand = null }: RepoSetup = {}) {
  const root = gitRepo(t, { host: true, branch: "trunk", message: "base", files: { "src/same.js": SOURCE, "probe.cjs": PROBE, "build.cjs": BUILD } });
  if (testCommand) writeConfig(root, { version: 1, commands: buildCommand ? { test: testCommand, build: buildCommand } : { test: testCommand } });
  const id = openItem(root, { lane: "order", title: "Same" }).id;
  return { root, id };
}

test("mutate needs an id, and statusline reads its input from standard input", () => {
  assert.deepEqual(verb.parse(parseArgs(["20261023-x"])), { id: "20261023-x" });
  assert.throws(() => verb.parse(parseArgs([])), UsageError);
});

test("mutate saves the clock's time and logs the baseline to mutate-test.log", (t) => {
  const { root, id } = repo(t);
  writeIn(root, "src/same.js", CHANGED);
  mutate(root, id, { env: process.env, now: () => new Date("2026-10-23T10:00:00.000Z") });
  assert.equal(JSON.parse(readFileSync(join(root, "work", id, "mutation.json"), "utf8")).ts, "2026-10-23T10:00:00.000Z");
  assert.equal(existsSync(statePath(root, "mutate-test.log")), true);
});

test("a test that catches the inversion kills the mutant (T-6.2)", (t) => {
  const { root, id } = repo(t, { testCommand: "node probe.cjs" });
  writeIn(root, "src/same.js", CHANGED);
  assert.equal(mutate(root, id, OPTIONS).outcome, "killed");
  assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
});

test("no added operator is no candidate; no test command is no test command (T-6.2)", (t) => {
  const first = repo(t);
  writeIn(first.root, "src/same.js", SOURCE.replace("return 0;", "return 0;\n  const x = 1;"));
  const none = mutate(first.root, first.id, OPTIONS);
  assert.deepEqual([none.outcome, none.mutant], ["no candidate", null]);
  assert.equal(renderMutation(none), "mutant none: no candidate");
  const second = repo(t, { testCommand: null });
  writeIn(second.root, "src/same.js", CHANGED);
  const result = mutate(second.root, second.id, OPTIONS);
  assert.deepEqual([result.outcome, result.command], ["no test command", null]);
  assert.equal(readFileSync(join(second.root, "src", "same.js"), "utf8"), CHANGED);
});

test("a test command that builds leaves the mutant in the build output, so mutate rebuilds from the restored source", (t) => {
  const { root, id } = repo(t, { testCommand: "node build.cjs", buildCommand: "node build.cjs" });
  writeIn(root, "src/same.js", CHANGED);
  const result = mutate(root, id, OPTIONS);
  assert.equal(result.outcome, "survived");
  assert.equal(result.rebuild, "passed");
  assert.equal(readFileSync(join(root, "out", "same.js"), "utf8"), CHANGED);
});

test("a file restored from an interrupted run is rebuilt even with no candidate, and no build command is none detected", (t) => {
  const first = repo(t, { buildCommand: "node build.cjs" });
  writeIn(first.root, "src/same.js", CHANGED.replace("===", "!=="));
  writeIn(first.root, "out/same.js", "export const stale = 1;\n");
  mkdirSync(dirname(statePath(first.root, STATE_FILES.mutationRestore)), { recursive: true });
  writeFileSync(statePath(first.root, STATE_FILES.mutationRestore), JSON.stringify({ path: "src/same.js", original: Buffer.from(NO_OPERATOR).toString("base64") }));
  const result = mutate(first.root, first.id, OPTIONS);
  assert.deepEqual([result.outcome, result.rebuild], ["no candidate", "passed"]);
  assert.equal(readFileSync(join(first.root, "out", "same.js"), "utf8"), NO_OPERATOR);
  const second = repo(t);
  writeIn(second.root, "src/same.js", CHANGED);
  assert.equal(mutate(second.root, second.id, OPTIONS).rebuild, "none detected");
});

test("a failed rebuild is reported, since the build output may still hold the mutant", () => {
  const failed = { mutant: { path: "src/a.js", line: 3, from: "<", to: ">=" }, outcome: "survived", rebuild: "failed" } as Parameters<typeof renderMutation>[0];
  assert.equal(renderMutation(failed), "mutant src/a.js:3 < -> >=: survived\nrebuild after restoring: failed; the build output may still hold the mutant");
  assert.equal(renderMutation({ ...failed, rebuild: "passed" }), "mutant src/a.js:3 < -> >=: survived");
});

test("a suite that is red before any mutant is baseline red, and no mutant is written", (t) => {
  const { root, id } = repo(t, { testCommand: "node probe.cjs" });
  writeIn(root, "src/same.js", CHANGED.replace("===", "!=="));
  const before = readFileSync(join(root, "src", "same.js"), "utf8");
  const result = mutate(root, id, OPTIONS);
  assert.deepEqual([result.outcome, result.mutant], ["baseline red", null]);
  assert.equal(renderMutation(result), "mutant none: baseline red");
  assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), before);
});

test("a restore record left by an interrupted run is applied before the next pick (T-6.3)", (t) => {
  const { root, id } = repo(t);
  writeIn(root, "src/same.js", CHANGED.replace("===", "!=="));
  mkdirSync(dirname(statePath(root, STATE_FILES.mutationRestore)), { recursive: true });
  writeFileSync(statePath(root, STATE_FILES.mutationRestore), JSON.stringify({ path: "src/same.js", original: Buffer.from(CHANGED).toString("base64") }));
  const result = mutate(root, id, OPTIONS);
  assert.equal(result.restored, "src/same.js");
  assert.equal(result.mutant?.from, "===", "the pick saw the restored file, not the leftover mutant");
  assert.match(renderMutation(result), /^restored src\/same\.js from an interrupted run\nmutant src\/same\.js:2 === -> !==: survived$/);
  assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
});
