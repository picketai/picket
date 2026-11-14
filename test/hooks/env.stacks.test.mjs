import { test } from "node:test";
import assert from "node:assert/strict";
import { hookProject, runHookBundle } from "#test/hook.mts";

test("the spawned env.stacks prints nothing at session end or startup when no stack is recorded", (t) => {
  const { root } = hookProject(t);
  for (const payload of [
    { hook_event_name: "SessionEnd", session_id: "s", reason: "logout", cwd: root },
    { hook_event_name: "SessionStart", session_id: "s", source: "startup", cwd: root },
  ]) {
    const r = runHookBundle("env.stacks", payload, { root, env: { CLAUDE_CONFIG_DIR: root } });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json, null, payload.hook_event_name);
  }
});
