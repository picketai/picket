import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { edgeContext } from "../../shared/context.mts";
import { statePath, STATE_FILES } from "../../shared/paths.mts";
import { workId } from "../../shared/work/files.mts";
import { setMarker } from "../../shared/work/markers.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitIn, gitRepo, writeIn } from "#test/git.mts";
import { openItem } from "#test/project.mts";
import { renderCheck, runChecks, verb, type CheckReport } from "./index.mts";

const writesMarker = (name: string) => JSON.stringify({ scripts: { test: `node -e "require('fs').writeFileSync('${name}', 'x')"` } });

function twoCheckouts(t: TestContext, appTooling = true): string {
  const root = gitRepo(t, { host: true, files: { "package.json": writesMarker("root-ran.txt") } });
  const app = join(root, "app");
  mkdirSync(app);
  gitIn(app, "init", "-q", "-b", "main");
  writeIn(app, appTooling ? "package.json" : "README.md", appTooling ? writesMarker("app-ran.txt") : "app\n");
  return root;
}

async function checkFrom(root: string, cwd: string): Promise<CheckReport> {
  const outcome = await runChecks({ steps: ["test"], only: undefined, timeoutMs: undefined }, { ...edgeContext(root), cwd });
  assert.notEqual(outcome.status, "refused");
  return (outcome as { value: CheckReport }).value;
}

const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("check reads its steps, a single command and a whole-second timeout (T-6.4)", () => {
  assert.deepEqual(parse(["--steps", "test,build", "--timeout", "60"]), { steps: ["test", "build"], only: undefined, timeoutMs: 60000 });
  assert.deepEqual(parse([]), { steps: undefined, only: undefined, timeoutMs: undefined });
  assert.throws(() => parse(["--timeout", "1.5"]), UsageError);
  assert.throws(() => parse(["--only"]), UsageError);
});

test("check run from a nested checkout runs that checkout's test command and names it", async (t) => {
  const root = twoCheckouts(t);
  const report = await checkFrom(root, join(root, "app"));
  assert.equal(report.checkout, "app");
  assert.equal(report.steps[0].status, "passed");
  assert.equal(existsSync(join(root, "app", "app-ran.txt")), true);
  assert.equal(existsSync(join(root, "root-ran.txt")), false);
  assert.equal(existsSync(join(root, "app", "root-ran.txt")), false);
  assert.match(renderCheck(report), /^checkout: app\ntest: passed/);
});

test("check run from the root runs the root's test command and names no checkout", async (t) => {
  const root = twoCheckouts(t);
  const report = await checkFrom(root, root);
  assert.equal(report.checkout, "");
  assert.equal(existsSync(join(root, "root-ran.txt")), true);
  assert.equal(existsSync(join(root, "app", "app-ran.txt")), false);
  assert.doesNotMatch(renderCheck(report), /checkout:/);
});

test("check from a nested checkout with no tooling detects none and never runs the root's tests", async (t) => {
  const root = twoCheckouts(t, false);
  const report = await checkFrom(root, join(root, "app"));
  assert.equal(report.steps[0].status, "none detected");
  assert.equal(existsSync(join(root, "root-ran.txt")), false);
});

const NOW = new Date("2026-11-09T12:00:00.000Z");

async function checkAt(root: string): Promise<CheckReport> {
  const outcome = await runChecks({ steps: ["test", "lint"], only: undefined, timeoutMs: undefined }, { ...edgeContext(root), cwd: root, session: "s1", now: () => NOW });
  return (outcome as { value: CheckReport }).value;
}

function itemAtPhase2(root: string): string {
  const s = openItem(root, { lane: "order", title: "Logged check", session: "s1" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  for (const mark of ["done", "approved"] as const) setMarker(root, workId(s.id), 1, mark, NOW);
  return s.id;
}

const checkRows = (root: string) => readFileSync(statePath(root, STATE_FILES.checkLog), "utf8").trim().split("\n").map((line) => JSON.parse(line));

test("check with a current item at phase 2 appends one row with the item, phase, result, checkout and steps (T-4.1)", async (t) => {
  const root = gitRepo(t, { host: true, files: { "package.json": writesMarker("ran.txt") } });
  const id = itemAtPhase2(root);
  const report = await checkAt(root);
  assert.deepEqual(checkRows(root), [
    { ts: NOW.toISOString(), session: "s1", work_id: id, phase: 2, checkout: "", ok: true, product_changed: false, steps: report.steps.map(({ name, status }) => ({ name, status })) },
  ]);
  assert.deepEqual(report.steps.map(({ name, status }) => [name, status]), [["test", "passed"], ["lint", "none detected"]]);
});

test("check logs product_changed true for a dirty product file and false for only a test and a work item file (T-6.5)", async (t) => {
  const root = gitRepo(t, { host: true, files: { "package.json": writesMarker("ran.txt") } });
  const id = itemAtPhase2(root);
  writeIn(root, "test/a.test.ts", "x\n");
  writeIn(root, `work/${id}/order.md`, "changed\n");
  await checkAt(root);
  assert.equal(checkRows(root).at(-1).product_changed, false);
  writeIn(root, "src/a.ts", "x\n");
  await checkAt(root);
  assert.equal(checkRows(root).at(-1).product_changed, true);
});

test("check with no open item appends no row and reports as before (T-4.2)", async (t) => {
  const root = gitRepo(t, { host: true, files: { "package.json": writesMarker("ran.txt") } });
  const report = await checkAt(root);
  assert.equal(existsSync(statePath(root, STATE_FILES.checkLog)), false);
  assert.deepEqual(Object.keys(report).sort(), ["checkout", "ok", "skipped", "steps"]);
  assert.equal(report.ok, true);
  assert.deepEqual(report.skipped, []);
  assert.match(renderCheck(report), /^test: passed · npm test · [\d.]+ s\nlint: none detected\nCHECK OK$/);
});

test("a nested check logs under the root's state folder with the checkout in its name", async (t) => {
  const root = twoCheckouts(t);
  await checkFrom(root, join(root, "app"));
  assert.equal(existsSync(statePath(root, "check-app-test.log")), true);
  assert.equal(existsSync(join(root, "app", ".picket")), false);
});
