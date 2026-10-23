import { test } from "node:test";
import assert from "node:assert/strict";
import { hookProject, runHookBundle } from "#test/hook.mts";

function run(payload, root, env) {
  const r = runHookBundle("notify.user", payload, { root, env });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("the spawned notify.user prints nothing when notifications are off or the type is not a prompt", (t) => {
  const { root } = hookProject(t);
  const prompt = { hook_event_name: "Notification", notification_type: "permission_prompt", message: "Claude needs your permission to use Bash", cwd: root };
  assert.equal(run(prompt, root, { PICKET_NOTIFY: "off" }), null);
  assert.equal(run({ ...prompt, notification_type: "auth_success" }, root), null);
});
