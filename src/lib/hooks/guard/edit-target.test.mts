import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { quotedList } from "./edit-target.mts";
import { editTarget } from "./edit-target.mts";
import { hookContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";

test("quotedList quotes at most three entries, cuts each at 80 characters and puts a label first (T-3.2)", () => {
  assert.equal(quotedList([{ text: "a" }, { text: "b" }]), '"a"; "b"');
  assert.equal(quotedList(["a", "b", "c", "d"].map((text) => ({ text }))), '"a"; "b"; "c" (+1 more)');
  assert.equal(quotedList([{ text: "x".repeat(100) }]), `"${"x".repeat(80)}"`);
  assert.equal(quotedList([{ text: "x", label: "skip" }]), 'skip "x"');
});

function targetOf(root: string, file_path: string) {
  const target = editTarget({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path, content: "x" }, cwd: root } as Parameters<typeof editTarget>[0], hookContext(root, { cwd: root }));
  return target === null ? null : { rel: target.rel, outside: target.outside };
}

function linkedProject(t: TestContext): { root: string; elsewhere: string } {
  const root = withProject(t, { picket: false });
  const elsewhere = withProject(t, { picket: false });
  mkdirSync(join(root, "test"));
  symlinkSync(join(root, "test"), join(root, "linked"), LINK_TYPE);
  symlinkSync(join(root, "test"), join(elsewhere, "outside"), LINK_TYPE);
  return { root, elsewhere };
}

test("editTarget reads a Write through a linked folder inside the root as the real path (T-4.1)", (t) => {
  const { root } = linkedProject(t);
  assert.deepEqual(targetOf(root, join(root, "linked", "a.test.ts")), { rel: "test/a.test.ts", outside: false });
  assert.deepEqual(targetOf(root, "linked/a.test.ts"), { rel: "test/a.test.ts", outside: false });
});

test("editTarget reads a Write through a link from outside the root as inside it (T-4.1)", (t) => {
  const { root, elsewhere } = linkedProject(t);
  assert.deepEqual(targetOf(root, join(elsewhere, "outside", "a.test.ts")), { rel: "test/a.test.ts", outside: false });
});

test("editTarget keeps a new file under a missing folder inside, and a path outside the root outside", (t) => {
  const { root, elsewhere } = linkedProject(t);
  assert.deepEqual(targetOf(root, "src/new/a.ts"), { rel: "src/new/a.ts", outside: false });
  assert.equal(targetOf(root, join(elsewhere, "a.ts"))?.outside, true);
});
