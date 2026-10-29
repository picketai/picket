import { test } from "node:test";
import assert from "node:assert/strict";
import { overridesAdmission } from "./admit.mts";

test("a lighter change lane overrides admit's lane; the same or a heavier one does not", () => {
  assert.equal(overridesAdmission("fast", "order"), true);
  assert.equal(overridesAdmission("order", "design"), true);
  assert.equal(overridesAdmission("order", "order"), false);
  assert.equal(overridesAdmission("design", "fast"), false);
});

test("research on only one side, or an admit answer of none, overrides admit", () => {
  assert.equal(overridesAdmission("research", "order"), true);
  assert.equal(overridesAdmission("design", "research"), true);
  assert.equal(overridesAdmission("research", "research"), false);
  assert.equal(overridesAdmission("design", "none"), true);
});
