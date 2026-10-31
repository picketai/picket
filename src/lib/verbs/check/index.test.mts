import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { edgeContext } from "../../shared/context.mts";
import { statePath } from "../../shared/paths.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitIn, gitRepo, writeIn } from "#test/git.mts";
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

test("a nested check logs under the root's state folder with the checkout in its name", async (t) => {
  const root = twoCheckouts(t);
  await checkFrom(root, join(root, "app"));
  assert.equal(existsSync(statePath(root, "check-app-test.log")), true);
  assert.equal(existsSync(join(root, "app", ".picket")), false);
});
