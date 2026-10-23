import { test } from "node:test";
import assert from "node:assert/strict";
import { isLeadOnly, kernelClass, WRAPPING_FLAGS } from "./kernel.mts";
import { VERB_NAMES } from "../../../verbs.mts";

const READ_VERBS = ["state", "next", "packet", "list", "summary", "cost", "preflight", "admit", "verify"];
const READ_SUBVERBS: Record<string, string[]> = { source: ["find", "grep"], extension: ["list"] };

test("every flag whose value drive or check executes is a wrapping flag guard.bash inspects", () => {
  for (const flag of ["--only", "--run", "--start"]) assert.ok(WRAPPING_FLAGS.has(flag), flag);
});

test("kernelClass is safe for today's read verbs and subverbs and kernel for every other entry; isLeadOnly holds for comment and waive only (T-4.1)", () => {
  const verbs = Object.keys(VERB_NAMES);
  assert.ok(verbs.length > 10, verbs.join(" "));
  for (const [verb, entry] of Object.entries(VERB_NAMES)) {
    if (!("subverbs" in entry)) {
      assert.equal(kernelClass(verb, undefined), READ_VERBS.includes(verb) ? "safe" : "kernel", verb);
      continue;
    }
    assert.equal(kernelClass(verb, undefined), "kernel", `${verb} without a subverb`);
    for (const sub of Object.keys(entry.subverbs)) assert.equal(kernelClass(verb, sub), READ_SUBVERBS[verb]?.includes(sub) ? "safe" : "kernel", `${verb} ${sub}`);
  }
  assert.equal(kernelClass("nosuchverb", undefined), "kernel");
  assert.equal(kernelClass("constructor", undefined), "kernel");
  assert.deepEqual(verbs.filter(isLeadOnly).sort(), ["comment", "waive"]);
});
