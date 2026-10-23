import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { runStep } from "./checks.mts";
import { stateDir, statePath } from "./paths.mts";
import { withProject } from "#test/project.mts";

const OPTIONS = { env: process.env, timeoutMs: 30_000, logPrefix: "probe" };

test("a passing command is passed, with no tail and its log written", (t) => {
  const root = withProject(t, { picket: false });
  const step = runStep(root, "test", 'node -e "console.log(7)"', OPTIONS);
  assert.equal(step.status, "passed");
  assert.equal(step.exit_code, 0);
  assert.equal(step.tail, "");
  assert.equal(step.log, ".picket/state/probe-test.log");
  assert.match(readFileSync(statePath(root, "probe-test.log"), "utf8"), /7/);
});

test("a failing command is failed, with its exit code and the output tail", (t) => {
  const root = withProject(t, { picket: false });
  const step = runStep(root, "lint", "node -e \"console.error('boom'); process.exit(3)\"", OPTIONS);
  assert.equal(step.status, "failed");
  assert.equal(step.exit_code, 3);
  assert.match(step.tail, /boom/);
});

test("a command past its timeout is timed out", (t) => {
  const root = withProject(t, { picket: false });
  const step = runStep(root, "test", 'node -e "setTimeout(() => {}, 5000)"', { ...OPTIONS, timeoutMs: 300 });
  assert.equal(step.status, "timed out");
});

test("a null command is none detected and writes nothing", (t) => {
  const root = withProject(t, { picket: false });
  assert.deepEqual(runStep(root, "build", null, OPTIONS), { name: "build", command: null, status: "none detected", exit_code: null, ms: 0, log: null, tail: "" });
  assert.equal(existsSync(stateDir(root)), false);
});
