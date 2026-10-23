import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { guardSilenced as silencedHandler } from "./index.mts";
import { hookContext } from "#test/context.mts";
import { climbBackIn, dotDotForms, looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const guardSilenced = looseHandler(silencedHandler);

test("guardSilenced denies a skip added through .. under the plain path, and ignores a path that climbs out", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  mkdirSync(join(root, "test"), { recursive: true });
  writeFileSync(join(root, "test", "a.test.mjs"), 'it("a", () => {});\n');
  const edit = async (file_path: string) => (await guardSilenced({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path, old_string: 'it("a"', new_string: 'it.skip("a"' }, cwd: root }, hookContext(root)))?.hookSpecificOutput ?? null;
  for (const rel of ["test/../test/a.test.mjs", climbBackIn(root, "test/a.test.mjs")]) {
    for (const file_path of dotDotForms(root, rel)) {
      const out = await edit(file_path);
      assert.equal(out?.permissionDecision, "deny", file_path);
      assert.ok(out.permissionDecisionReason.startsWith("guard.silenced: test/a.test.mjs adds 1 silenced check(s)"), out.permissionDecisionReason);
    }
  }
  for (const file_path of dotDotForms(root, "src/../../elsewhere/a.test.mjs")) assert.equal(await edit(file_path), null, file_path);
});
