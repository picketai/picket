import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { lintGlossary as glossaryHandler } from "./index.mts";
import { hostPath } from "../../../shared/paths.mts";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";

const lintGlossary = looseHandler(glossaryHandler);

function written(root: string, path: string, text: string | null) {
  if (text !== null) writeFileSync(path, text);
  return lintGlossary({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: path } }, hookContext(root));
}

test("a MEMORY.md of 6,001 characters gets context naming its size, the limit and where the detail goes", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const out = written(root, hostPath(root, "MEMORY.md"), "m".repeat(6001));
  assert.deepEqual(Object.keys(out), ["hookSpecificOutput"]);
  assert.deepEqual(Object.keys(out.hookSpecificOutput), ["hookEventName", "additionalContext"]);
  assert.equal(out.hookSpecificOutput.hookEventName, "PostToolUse");
  const text = out.hookSpecificOutput.additionalContext;
  for (const part of ["6,001", "6,000", "artifacts/strategy/decisions/"]) assert.ok(text.includes(part), part);
});

test("a MEMORY.md at 6,000 characters, LF or CRLF, gets nothing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const memory = hostPath(root, "MEMORY.md");
  assert.equal(written(root, memory, "m".repeat(6000)), null);
  assert.equal(written(root, memory, `${"a".repeat(2999)}\r\n${"b".repeat(3000)}`), null);
});

test("another file over 6,000 characters gets nothing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  assert.equal(written(root, join(root, "README.md"), "r".repeat(7000)), null);
});

test("a MEMORY.md path that does not exist gets nothing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  assert.equal(written(root, hostPath(root, "MEMORY.md"), null), null);
});
