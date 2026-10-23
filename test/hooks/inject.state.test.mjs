import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { tempProject, tempSource } from "#test/source.mts";

const INJECT_STATE = resolve("dist/hooks/inject.state.mjs");

test("SessionStart names each source with its root, or unreachable with the reason (T-3.6)", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const session = (sourceRoot) => {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
    delete env.HARNESS_SOURCE_ANALYSIS;
    if (sourceRoot) env.HARNESS_SOURCE_ANALYSIS = sourceRoot;
    const out = execFileSync("node", [INJECT_STATE], { input: JSON.stringify({ hook_event_name: "SessionStart", cwd: root }), encoding: "utf8", env });
    return JSON.parse(out).hookSpecificOutput.additionalContext;
  };
  assert.ok(session(main).includes(`# Sources\n- analysis: ${resolve(main)} · read-only`));
  assert.match(session(null), /- analysis: unreachable \(HARNESS_SOURCE_ANALYSIS is not set/);
});
