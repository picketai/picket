import { test } from "node:test";
import assert from "node:assert/strict";
import { isGreen, keyOutcome } from "../lib/key-outcome.mjs";

const NOT_LOADED = { ok: false, label: "key failed to load" };

test("a defect key that fails to load, is missing or never ran is reported as not loaded (T-3.1)", () => {
  assert.deepEqual(keyOutcome("defect", { passed: 0, failed: 0, total: 0, suitesFailed: 1 }), NOT_LOADED);
  assert.deepEqual(keyOutcome("defect", { passed: 0, failed: 0, total: 0, missing: true }), NOT_LOADED);
  assert.deepEqual(keyOutcome("defect", null), NOT_LOADED);
});

test("a defect is live only when a loaded key test fails (T-3.2)", () => {
  assert.deepEqual(keyOutcome("defect", { passed: 2, failed: 1, total: 3, suitesFailed: 0 }), { ok: true, label: "defect live" });
  assert.deepEqual(keyOutcome("defect", { passed: 3, failed: 0, total: 3, suitesFailed: 0 }), { ok: false, label: "defect live" });
  assert.deepEqual(keyOutcome("defect", { passed: 0, failed: 0, total: 0, suitesFailed: 0 }), { ok: false, label: "defect live" });
});

test("a trap holds only when its loaded key is green, and a silent story is seeded (T-3.3)", () => {
  assert.deepEqual(keyOutcome("trap", { passed: 0, failed: 0, total: 0, suitesFailed: 1 }), NOT_LOADED);
  assert.deepEqual(keyOutcome("trap", { passed: 2, failed: 0, total: 2, suitesFailed: 0 }), { ok: true, label: "trap holds" });
  assert.deepEqual(keyOutcome("trap", { passed: 1, failed: 1, total: 2, suitesFailed: 0 }), { ok: false, label: "trap holds" });
  assert.deepEqual(keyOutcome("silent", null), { ok: true, label: "seeded" });
});

test("a run is green only with tests, none failed and every suite loaded", () => {
  assert.equal(isGreen({ passed: 2, failed: 0, total: 2, suitesFailed: 0 }), true);
  assert.equal(isGreen({ passed: 0, failed: 0, total: 0, suitesFailed: 0 }), false);
  assert.equal(isGreen({ passed: 2, failed: 0, total: 2, suitesFailed: 1 }), false);
  assert.equal(isGreen({ passed: 0, failed: 0, total: 0, missing: true }), false);
});
