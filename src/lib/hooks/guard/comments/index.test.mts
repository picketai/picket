import { test } from "node:test";
import assert from "node:assert/strict";
import { guardComments as commentsHandler } from "./index.mts";
import { hookContext } from "#test/context.mts";
import { climbBackIn, dotDotForms, looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const guardComments = looseHandler(commentsHandler);

test("guardComments denies a comment written through .. under the plain path, and ignores a path that climbs out", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const write = async (file_path: string) => (await guardComments({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path, content: `const a = 1;\n${"/".repeat(2)} note\n` }, cwd: root }, hookContext(root)))?.hookSpecificOutput ?? null;
  for (const rel of ["src/../src/a.mjs", climbBackIn(root, "src/a.mjs")]) {
    for (const file_path of dotDotForms(root, rel)) {
      const out = await write(file_path);
      assert.equal(out?.permissionDecision, "deny", file_path);
      assert.ok(out.permissionDecisionReason.startsWith("guard.comments: src/a.mjs adds 1 comment line(s)"), out.permissionDecisionReason);
    }
  }
  for (const file_path of dotDotForms(root, "src/../../elsewhere/a.mjs")) assert.equal(await write(file_path), null, file_path);
});
