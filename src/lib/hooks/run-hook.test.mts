import { test } from "node:test";
import assert from "node:assert/strict";
import { denialOf } from "./run-hook.mts";

test("denialOf reads a deny and a bounce, and nothing from an output without hookSpecificOutput", () => {
  assert.deepEqual(denialOf({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "guard.x: no" } }), { event: "block", reason: "guard.x: no" });
  assert.deepEqual(denialOf({ decision: "block", reason: "guard.block: re-emit" }), { event: "bounce", reason: "guard.block: re-emit" });
  assert.equal(denialOf({}), null);
  assert.equal(denialOf({ hookSpecificOutput: null }), null);
  assert.equal(denialOf({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: "ok" } }), null);
  assert.equal(denialOf({ decision: "approve" }), null);
  assert.equal(denialOf(null), null);
});
