import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { injectState as stateHandler } from "./index.mts";
import { hostPath, STATE_FILES, statePath } from "../../../shared/paths.mts";
import { picketVersion } from "../../../shared/picket-version.mts";
import { writeState } from "../../../shared/work/state.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { setMarker } from "../../../shared/work/markers.mts";
import { openItem, withProject, writeArtifact, writeConfig } from "#test/project.mts";

const injectState = looseHandler(stateHandler);

const RUNNING = picketVersion();
const NOTICE = `Picket updated to ${RUNNING}; run \`picket init\` to refresh this project.`;

function noticeFile(root: string): string {
  return statePath(root, STATE_FILES.updateNotice);
}

test("an older recorded version gives the notice once per running version, in the message and the context (T-3.2)", (t) => {
  const root = withProject(t, { host: true });
  writeConfig(root, { version: 1, picket_version: "0.0.1" });
  const first = injectState({}, hookContext(root));
  assert.equal(first.systemMessage, NOTICE);
  assert.ok(first.hookSpecificOutput.additionalContext.startsWith(`# Picket update\n${NOTICE}`), first.hookSpecificOutput.additionalContext);
  assert.deepEqual(JSON.parse(readFileSync(noticeFile(root), "utf8")), { version: RUNNING });
  assert.equal(injectState({}, hookContext(root))?.systemMessage, undefined);
});

test("a config with no recorded version gives the notice (T-3.3)", (t) => {
  const root = withProject(t, { host: true });
  writeConfig(root, { version: 1 });
  assert.equal(injectState({}, hookContext(root)).systemMessage, NOTICE);
});

test("the running version, a newer recorded version, or no config gives no notice and writes no notice file (T-3.4)", (t) => {
  for (const recorded of [RUNNING, "99.0.0"]) {
    const root = withProject(t, { host: true });
    writeConfig(root, { version: 1, picket_version: recorded });
    assert.equal(injectState({}, hookContext(root))?.systemMessage, undefined, recorded);
    assert.equal(existsSync(noticeFile(root)), false, recorded);
  }
  const bare = withProject(t, { host: true, picket: false });
  assert.equal(injectState({}, hookContext(bare))?.systemMessage, undefined);
  assert.equal(existsSync(noticeFile(bare)), false);
});

test("injectState with an empty event lists the open work items (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Csv export" });
  const out = injectState({}, hookContext(root));
  assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`# Open work items\\n- ${s.id} · order · open`));
});

const TWO_PHASES = "---\nlane: order\n---\n# O\n\n## Phase 1: One\n\nt\n\n## Phase 2: Two\n\nt\n";

test("injectState words each item's next step as an observer would read it", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const implementing = openItem(root, { lane: "order", title: "Implementing" }).id;
  writeArtifact(root, implementing, "order.md", TWO_PHASES);
  setMarker(root, implementing, 1, "done", new Date());
  setMarker(root, implementing, 1, "approved", new Date());
  const approving = openItem(root, { lane: "order", title: "Approving" }).id;
  writeArtifact(root, approving, "order.md", TWO_PHASES);
  setMarker(root, approving, 1, "done", new Date());
  const context = injectState({}, hookContext(root)).hookSpecificOutput.additionalContext;
  assert.ok(context.includes(`- ${implementing} · order · open · phases 1/2 · next: developer implements phase 2\n`), context);
  assert.ok(context.includes(`- ${approving} · order · open · phases 0/2 · next: waits for approval of phase 1\n`), context);
});

test("injectState keeps the glossary's earlier entries, drops the one past 6,000 characters, and ends with the cut note", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const head = `# Project\n\n## Decisions\n\n- **First**: ${"f".repeat(3000)}\n- **Last**: `;
  writeFileSync(hostPath(root, "MEMORY.md"), head + "l".repeat(6100 - head.length));
  const context = injectState({}, hookContext(root)).hookSpecificOutput.additionalContext;
  assert.ok(context.includes("- **First**: f"), context);
  assert.equal(context.includes("**Last**"), false);
  assert.ok(context.endsWith("\n\nCut at 6,000 characters; read .claude/MEMORY.md for the rest."), context.slice(-200));
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
