import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { grade, redFirst } from "../lib/grade.mjs";
import { laneMatches } from "../lib/lanes.mjs";

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8" }).trim();
}

function write(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function fixture(fn) {
  const repo = mkdtempSync(join(tmpdir(), "bench-grade-"));
  try {
    git(repo, "init", "-q", "-b", "trunk");
    write(repo, "src/ids.ts", "export const next = 'INV-NaN';\n");
    write(repo, "test/ids.test.ts", "old test\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "base");
    fn(repo, git(repo, "rev-parse", "HEAD"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

const fixedSource = (repo) => readFileSync(join(repo, "src", "ids.ts"), "utf8").includes("INV-1007");
const catchesTheBug = (calls) => (repo, files) => {
  calls.push({ files, fixed: fixedSource(repo), helperPresent: existsSync(join(repo, "src", "helper.ts")) });
  return { passed: fixedSource(repo) ? 1 : 0, failed: fixedSource(repo) ? 0 : 1, total: 1, error: null };
};
const alwaysPasses = () => ({ passed: 1, failed: 0, total: 1, error: null });

function runFixesTheBug(repo) {
  write(repo, "src/ids.ts", "export const next = 'INV-1007';\n");
  write(repo, "src/helper.ts", "export const h = 1;\n");
  write(repo, "test/next-id.test.ts", "new test\n");
  write(repo, "test/hidden/x.hidden.test.ts", "hidden\n");
  write(repo, "work/item/state.yaml", "id: item\n");
}

test("red_first passes when an added test fails on the base source, and every file is put back (T-8.3)", () => {
  fixture((repo, base) => {
    runFixesTheBug(repo);
    const calls = [];
    const red = redFirst({ repo, base, runner: catchesTheBug(calls) });
    assert.equal(red.ok, true, red.detail);
    assert.deepEqual(calls, [{ files: ["test/next-id.test.ts"], fixed: false, helperPresent: false }], "the source was at base and only the run's own test ran");
    assert.equal(fixedSource(repo), true, "the fix is back");
    assert.equal(readFileSync(join(repo, "src", "helper.ts"), "utf8"), "export const h = 1;\n", "a new source file is back");
  });
});

test("red_first fails when every added test passes on the base source, or when no test was added (T-8.3)", () => {
  fixture((repo, base) => {
    runFixesTheBug(repo);
    const red = redFirst({ repo, base, runner: alwaysPasses });
    assert.equal(red.ok, false);
    assert.match(red.detail, /0 of 1 failed/);
    assert.equal(fixedSource(repo), true);
  });
  fixture((repo, base) => {
    write(repo, "src/ids.ts", "export const next = 'INV-1007';\n");
    write(repo, "test/hidden/x.hidden.test.ts", "hidden\n");
    const red = redFirst({ repo, base, runner: catchesTheBug([]) });
    assert.deepEqual(red, { ok: false, detail: "the run added or changed no test" });
  });
});

test("red_first restores the files even when the runner throws", () => {
  fixture((repo, base) => {
    runFixesTheBug(repo);
    assert.throws(() => redFirst({ repo, base, runner: () => { throw new Error("vitest crashed"); } }), /vitest crashed/);
    assert.equal(fixedSource(repo), true);
    assert.equal(existsSync(join(repo, "src", "helper.ts")), true);
  });
});

function checkNamed(result, name) {
  return result.checks.find((c) => c.name === name);
}

test("tests_added passes for a changed test outside test/hidden and fails otherwise (T-8.3)", () => {
  const run = (repo, base) => grade({ repo, base, task: { checks: { tests_added: true } }, hiddenDir: join(repo, "no-hidden"), adapter: {}, runner: alwaysPasses });
  fixture((repo, base) => {
    write(repo, "test/ids.test.ts", "old test, pinned more\n");
    assert.equal(checkNamed(run(repo, base), "tests_added").ok, true);
  });
  fixture((repo, base) => {
    write(repo, "src/ids.ts", "changed\n");
    write(repo, "test/hidden/x.hidden.test.ts", "hidden\n");
    assert.equal(checkNamed(run(repo, base), "tests_added").ok, false);
  });
});

test("grade runs red_first only when the task asks for it", () => {
  fixture((repo, base) => {
    runFixesTheBug(repo);
    const asked = grade({ repo, base, task: { checks: { red_first: true } }, hiddenDir: join(repo, "no-hidden"), adapter: {}, runner: catchesTheBug([]) });
    assert.equal(checkNamed(asked, "red_first").ok, true);
    const plain = grade({ repo, base, task: { checks: {} }, hiddenDir: join(repo, "no-hidden"), adapter: {}, runner: alwaysPasses });
    assert.equal(checkNamed(plain, "red_first"), undefined);
  });
});

test("lane none matches only a run that took no lane, and the result schema accepts it (T-8.4)", () => {
  assert.equal(laneMatches({ harness: "plugin", lane_expected: "none", signals: { lane: null } }), true);
  assert.equal(laneMatches({ harness: "plugin", lane_expected: "none", signals: {} }), true);
  assert.equal(laneMatches({ harness: "plugin", lane_expected: "none", signals: { lane: "research" } }), false);
  assert.equal(laneMatches({ harness: "trunk", lane_expected: "none", signals: { lane: "direct" } }), true);
  assert.equal(laneMatches({ harness: "trunk", lane_expected: "none", signals: { lane: "pipeline" } }), false);
  assert.equal(laneMatches({ harness: "plugin", lane_expected: "fast", signals: { lane: "fast" } }), true);
  const schema = JSON.parse(readFileSync(resolve("bench", "schema", "result.schema.json"), "utf8"));
  assert.ok(JSON.stringify(schema).includes('"enum":["fast","order","design","research","none"]'));
});
