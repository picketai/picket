import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { hookProject, runHookBundle } from "#test/hook.mts";
import { tempProject, tempSource } from "#test/source.mts";

function run(payload, root, env) {
  const r = runHookBundle("inject.state", payload, { root, env });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("SessionStart names each source with its root, or unreachable with the reason (T-3.6)", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const session = (sourceRoot) => run({ hook_event_name: "SessionStart", cwd: root }, root, { HARNESS_SOURCE_ANALYSIS: sourceRoot ?? undefined }).hookSpecificOutput.additionalContext;
  assert.ok(session(main).includes(`# Sources\n- analysis: ${resolve(main)} · read-only`));
  assert.match(session(null), /- analysis: unreachable \(HARNESS_SOURCE_ANALYSIS is not set/);
});

test("inject.state lists open items", (t) => {
  const { root, id } = hookProject(t);
  const out = run({ hook_event_name: "SessionStart", cwd: root }, root);
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`${id} · order · open`));
});
