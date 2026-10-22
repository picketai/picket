import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { checkNodeFloor } from "../../dist/lib/node-floor.mjs";

const BIN = resolve("dist/bin/picket.mjs");
const RULES_HOOK = resolve("dist/hooks/inject.rules.mjs");
const OLD_NODE = "20.11.1";
const REFUSAL = `Picket needs Node 22 or newer; this is ${OLD_NODE}`;
const FAKE_OLD_NODE = `--import=data:text/javascript,${encodeURIComponent(`Object.defineProperty(process.versions, "node", { value: "${OLD_NODE}" });`)}`;

function withProject(fn) {
  const root = mkdtempSync(join(tmpdir(), "picket-node-floor-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(args, root, input = "") {
  return spawnSync(process.execPath, args, { input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
}

function sessionStart(root) {
  return JSON.stringify({ hook_event_name: "SessionStart", cwd: root });
}

test("checkNodeFloor refuses a Node below 22 by name and accepts 22 and newer", () => {
  assert.equal(checkNodeFloor(OLD_NODE), REFUSAL);
  assert.equal(checkNodeFloor("22.0.0"), null);
  assert.equal(checkNodeFloor("24.22.1"), null);
});

test("the CLI on an old Node exits 1 with the refusal on stderr and nothing on stdout", () => {
  withProject((root) => {
    const r = run([FAKE_OLD_NODE, BIN, "state", "x"], root);
    assert.equal(r.status, 1);
    assert.equal(r.stdout, "");
    assert.equal(r.stderr, `${REFUSAL}\n`);
  });
});

test("a hook on an old Node exits 0 with the refusal on stderr, no output and no ledger row", () => {
  withProject((root) => {
    const r = run([FAKE_OLD_NODE, RULES_HOOK], root, sessionStart(root));
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    assert.equal(r.stderr, `${REFUSAL}\n`);
    assert.equal(existsSync(join(root, ".picket")), false);
    assert.notEqual(run([RULES_HOOK], root, sessionStart(root)).stdout, "", "the hook prints rules on a supported Node");
  });
});
