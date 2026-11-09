import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { mutate, renderMutation, verb } from "./index.mts";
import { STATE_FILES, statePath } from "../../shared/paths.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { writeLayout } from "../../shared/repos.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { Refused } from "../../shared/action.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { gitIn, gitOut, gitRepo, umbrella, writeIn } from "#test/git.mts";
import { openItem, writeArtifact, writeConfig } from "#test/project.mts";

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

const WORKTREE = "src/Orders/.worktrees/RMS-12";
const CALC = "export const small = 1;\n";
const CALC_CHANGED = "export const small = 1;\nexport const isSmall = (n) => n < 10;\n";
const CALC_PROBE = 'process.exit(require("fs").readFileSync("calc.js", "utf8").includes(">=") ? 1 : 0);\n';
const CALC_PLAN = "---\nlane: order\nphases:\n  - n: 1\n    files: [src/Orders/calc.js]\n---\n# O\n\n## Phase 1: Calc\n";

test("mutate plants its mutant in the recorded worktree, runs that checkout's tests and restores the file (T-4.5)", (t) => {
  const { root, repos } = umbrella(t, { repos: ["Orders"] });
  writeIn(repos.Orders, "package.json", JSON.stringify({ scripts: { test: "node probe.cjs" } }));
  writeIn(repos.Orders, "probe.cjs", CALC_PROBE);
  writeIn(repos.Orders, "calc.js", CALC);
  gitIn(repos.Orders, "add", "-A");
  gitIn(repos.Orders, "commit", "-q", "-m", "calc");
  const { id } = openItem(root, { lane: "order", title: "Calc" });
  writeArtifact(root, id, "order.md", CALC_PLAN);
  gitIn(repos.Orders, "worktree", "add", "-q", "-b", "RMS-12", join(root, WORKTREE));
  const base = gitOut(join(root, WORKTREE), "rev-parse", "HEAD");
  writeLayout(root, id, { worktrees: null, repos: [{ path: "src/Orders", base, worktree: WORKTREE }] });
  writeIn(root, `${WORKTREE}/calc.js`, CALC_CHANGED);

  const result = mutate(root, id, OPTIONS);
  const planted = { path: `${WORKTREE}/calc.js`, line: 2, from: "<", to: ">=" };
  assert.deepEqual([result.outcome, result.mutant, result.base], ["killed", planted, base]);
  assert.equal(readFileSync(join(root, WORKTREE, "calc.js"), "utf8"), CALC_CHANGED);
  assert.equal(readFileSync(join(repos.Orders, "calc.js"), "utf8"), CALC);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "work", id, "mutation.json"), "utf8")).mutant, planted);
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

const planOf = (file: string) => `---\nlane: order\nphases:\n  - n: 1\n    files: [${file}]\n---\n# O\n\n## Phase 1: Own\n`;

function sharedBase(t: TestContext) {
  const root = gitRepo(t, { host: true, branch: "trunk", message: "base", files: { "src/same.js": SOURCE, "src/a.js": SOURCE } });
  writeConfig(root, { version: 1, commands: { test: "node -e 0" } });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "config");
  const a = openItem(root, { lane: "order", title: "Item A" }).id;
  const b = openItem(root, { lane: "order", title: "Item B" }).id;
  writeArtifact(root, a, "order.md", planOf("src/same.js"));
  writeArtifact(root, b, "order.md", planOf("src/a.js"));
  return { root, a, b };
}

function commitItem(root: string, id: WorkId, path: string, text: string) {
  writeIn(root, path, text);
  gitIn(root, "add", "--", path, `work/${id}`);
  gitIn(root, "commit", "-q", "-m", `feat: ${id}`);
}

test("two items on one base: mutate plants only in the item's own commit and saves the parent of its first commit as base (T-1.1)", (t) => {
  const { root, a, b } = sharedBase(t);
  commitItem(root, b, "src/a.js", CHANGED);
  const parent = gitOut(root, "rev-parse", "HEAD");
  commitItem(root, a, "src/same.js", CHANGED);
  const result = mutate(root, a, OPTIONS);
  assert.deepEqual([result.mutant?.path, result.base], ["src/same.js", parent]);
  assert.equal(JSON.parse(readFileSync(join(root, "work", a, "mutation.json"), "utf8")).base, parent);
});

test("an operator only another item added is no candidate, and that item's file is untouched (T-1.2)", (t) => {
  const { root, a, b } = sharedBase(t);
  commitItem(root, b, "src/a.js", CHANGED);
  commitItem(root, a, "src/same.js", NO_OPERATOR);
  const before = readFileSync(join(root, "src", "a.js"));
  const result = mutate(root, a, OPTIONS);
  assert.deepEqual([result.outcome, result.mutant], ["no candidate", null]);
  assert.deepEqual(readFileSync(join(root, "src", "a.js")), before);
});

test("an uncommitted change in the item's plan paths is a candidate; one outside its plan and commits is not (T-1.3)", (t) => {
  const owned = sharedBase(t);
  writeIn(owned.root, "src/same.js", CHANGED);
  assert.equal(mutate(owned.root, owned.a, OPTIONS).mutant?.path, "src/same.js");
  const foreign = sharedBase(t);
  writeIn(foreign.root, "src/other.js", CHANGED);
  const result = mutate(foreign.root, foreign.a, OPTIONS);
  assert.deepEqual([result.outcome, result.mutant], ["no candidate", null]);
});

function forgetBase(root: string, id: WorkId) {
  const { base: _recorded, ...state } = readState(root, id);
  writeState(root, state, new Date());
}

test("with no recorded base, mutate plants in the item's own committed change", (t) => {
  const { root, id } = repo(t, { testCommand: "node probe.cjs" });
  const before = gitOut(root, "rev-parse", "HEAD");
  forgetBase(root, id);
  writeIn(root, "src/same.js", CHANGED);
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "feat(same): phase 1");
  const result = mutate(root, id, OPTIONS);
  assert.deepEqual([result.base, result.outcome, result.mutant?.path], [before, "killed", "src/same.js"]);
});

test("with no recorded base and no commit of the item, mutate refuses and saves nothing", (t) => {
  const { root, id } = repo(t);
  forgetBase(root, id);
  writeIn(root, "src/same.js", CHANGED);
  assert.throws(() => mutate(root, id, OPTIONS), (error) => error instanceof Refused && error.message === `no base recorded for ${id} and no commit of it found`);
  assert.equal(existsSync(join(root, "work", id, "mutation.json")), false);
  assert.equal(readFileSync(join(root, "src", "same.js"), "utf8"), CHANGED);
});
