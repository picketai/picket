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

test("a pending answer ranks with fast: any change lane takes it and research does not", () => {
  assert.equal(overridesAdmission("fast", "pending"), false);
  assert.equal(overridesAdmission("order", "pending"), false);
  assert.equal(overridesAdmission("design", "pending"), false);
  assert.equal(overridesAdmission("research", "pending"), true);
});
