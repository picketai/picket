import { test } from "node:test";
import assert from "node:assert/strict";
import { assistantEntry as assistant, hookProject, runHookBundle, toolUse as tool, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";

function run(payload, root) {
  const r = runHookBundle("monitor.context", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("monitor.context speaks up after six look-around calls", (t) => {
  const { root } = hookProject(t);
  const six = Array.from({ length: 6 }, () => tool("Read", { file_path: "x" }));
  const tp = transcript(root, [user("x"), assistant(six)]);
  const out = run({ hook_event_name: "PostToolUse", tool_name: "Read", transcript_path: tp, cwd: root }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /6 consecutive/);
  const five = transcript(root, [user("x"), assistant(six.slice(1))]);
  assert.equal(run({ hook_event_name: "PostToolUse", tool_name: "Read", transcript_path: five, cwd: root }, root), null);
});
