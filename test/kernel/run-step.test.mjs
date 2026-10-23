import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runStep } from "../../dist/lib/shared/checks.mjs";
import { stateDir, statePath } from "../../dist/lib/shared/paths.mjs";

const OPTIONS = { env: process.env, timeoutMs: 30_000, logPrefix: "probe" };

function withRoot(body) {
  const root = mkdtempSync(join(tmpdir(), "picket-run-step-"));
  try {
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 40, retryDelay: 200 });
  }
}

test("a passing command is passed, with no tail and its log written", () => {
  withRoot((root) => {
    const step = runStep(root, "test", 'node -e "console.log(7)"', OPTIONS);
    assert.equal(step.status, "passed");
    assert.equal(step.exit_code, 0);
    assert.equal(step.tail, "");
    assert.equal(step.log, ".picket/state/probe-test.log");
    assert.match(readFileSync(statePath(root, "probe-test.log"), "utf8"), /7/);
  });
});

test("a failing command is failed, with its exit code and the output tail", () => {
  withRoot((root) => {
    const step = runStep(root, "lint", "node -e \"console.error('boom'); process.exit(3)\"", OPTIONS);
    assert.equal(step.status, "failed");
    assert.equal(step.exit_code, 3);
    assert.match(step.tail, /boom/);
  });
});

test("a command past its timeout is timed out", () => {
  withRoot((root) => {
    const step = runStep(root, "test", 'node -e "setTimeout(() => {}, 5000)"', { ...OPTIONS, timeoutMs: 300 });
    assert.equal(step.status, "timed out");
  });
});

test("a null command is none detected and writes nothing", () => {
  withRoot((root) => {
    assert.deepEqual(runStep(root, "build", null, OPTIONS), { name: "build", command: null, status: "none detected", exit_code: null, ms: 0, log: null, tail: "" });
    assert.equal(existsSync(stateDir(root)), false);
  });
});
