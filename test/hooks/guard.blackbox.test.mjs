import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runHookBundle, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";

const PLAN_PATH = "src/orders/api.mts";
const DESIGN = `---\nlane: design\nphases:\n  - n: 1\n    files: [${PLAN_PATH}]\n---\n# D\n\n## Phase 1: Orders\n`;

function testedItem(t) {
  const root = withProject(t, { host: true });
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", DESIGN);
  mkdirSync(join(root, "src", "orders"), { recursive: true });
  writeFileSync(join(root, PLAN_PATH), "x\n");
  return { root, id, tp: transcript(root, [user(`work: ${id}\nphase: 1`)]) };
}

test("the guard.blackbox bundle denies a tester Read of a plan path as part of the black box (T-4.7)", (t) => {
  const { root, tp } = testedItem(t);
  const payload = { hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: join(root, PLAN_PATH) }, cwd: root, agent_type: "abcd-tester", transcript_path: tp };
  const r = runHookBundle("guard.blackbox", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(r.json.hookSpecificOutput.permissionDecisionReason, /black box/);
});

test("the guard.blackbox bundle stays silent for a developer Read of the same path", (t) => {
  const { root, tp } = testedItem(t);
  const payload = { hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: join(root, PLAN_PATH) }, cwd: root, agent_type: "picket:developer", transcript_path: tp };
  const r = runHookBundle("guard.blackbox", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json, null);
});
