import { test } from "node:test";
import assert from "node:assert/strict";
import { quotedList } from "./edit-target.mts";

test("quotedList quotes at most three entries, cuts each at 80 characters and puts a label first (T-3.2)", () => {
  assert.equal(quotedList([{ text: "a" }, { text: "b" }]), '"a"; "b"');
  assert.equal(quotedList(["a", "b", "c", "d"].map((text) => ({ text }))), '"a"; "b"; "c" (+1 more)');
  assert.equal(quotedList([{ text: "x".repeat(100) }]), `"${"x".repeat(80)}"`);
  assert.equal(quotedList([{ text: "x", label: "skip" }]), 'skip "x"');
});
