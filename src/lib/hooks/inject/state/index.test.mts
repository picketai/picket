import { test } from "node:test";
import assert from "node:assert/strict";
import { injectState as stateHandler } from "./index.mts";
import { writeState } from "../../../shared/work/state.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { openItem, withProject } from "#test/project.mts";

const injectState = looseHandler(stateHandler);

test("injectState with an empty event lists the open work items (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Csv export" });
  const out = injectState({}, hookContext(root));
  assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`# Open work items\\n- ${s.id} · order · open`));
});

test("injectState lists open and blocked items and leaves a done item out (T-4.2)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const open = openItem(root, { lane: "order", title: "Open one" }).id;
  const blocked = openItem(root, { lane: "order", title: "Blocked one" });
  writeState(root, { ...blocked, status: "blocked", blocked_reason: "waiting" }, new Date());
  const done = openItem(root, { lane: "order", title: "Done one" });
  writeState(root, { ...done, status: "done" }, new Date());
  const context = injectState({}, hookContext(root)).hookSpecificOutput.additionalContext;
  assert.ok(context.includes(`- ${open} · order · open`));
  assert.ok(context.includes(`- ${blocked.id} · order · blocked`));
  assert.equal(context.includes(done.id), false);
});
