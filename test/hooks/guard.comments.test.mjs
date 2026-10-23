import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCli } from "#test/cli.mts";
import { hookProject, runHookBundle } from "#test/hook.mts";

const lines = (...rows) => rows.join("\n");

function run(payload, root) {
  const r = runHookBundle("guard.comments", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

function commentEdit(root, path, old_string, new_string) {
  return run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: join(root, path), old_string, new_string }, cwd: root }, root)?.hookSpecificOutput ?? null;
}

function picket(root, ...args) {
  const r = runCli(root, [...args, "--root", root]);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

for (const [form, path, added] of [
  ["a line comment", "src/a.ts", "// sum the totals"],
  ["an XML doc comment", "src/A.cs", "/// <remarks>Why</remarks>"],
  ["a Python hash comment", "src/a.py", "# note"],
  ["an HTML comment", "src/a.html", ["<", "!-- note --", ">"].join("")],
]) {
  test(`guard.comments denies an edit that adds ${form} (T-1.1)`, (t) => {
    const { root } = hookProject(t);
    const out = commentEdit(root, path, "x = 1", lines(added, "x = 1"));
    assert.equal(out?.permissionDecision, "deny");
    assert.match(out.permissionDecisionReason, /^guard\.comments: /);
    assert.match(out.permissionDecisionReason, new RegExp(path.replace(".", "\\.")));
  });
}

test("guard.comments allows kept comments, directives, docs, data files and strings (T-1.2)", (t) => {
  const { root } = hookProject(t);
  assert.equal(commentEdit(root, "src/a.ts", lines("// keep", "const a = 1;"), lines("// keep", "const a = 2;")), null, "kept comment");
  assert.equal(commentEdit(root, "src/a.ts", "a();", lines("// eslint-disable-next-line no-console", "a();")), null, "directive");
  assert.equal(commentEdit(root, "src/a.ts", "a();", lines("// SPDX-License-Identifier: MIT", "a();")), null, "SPDX header");
  const markupNote = ["<", "!-- note --", ">"].join("");
  assert.equal(commentEdit(root, "docs/a.md", "x", lines("# Heading", markupNote, "x")), null, "markdown");
  assert.equal(commentEdit(root, "conf/a.yaml", "a: 1", lines("# note", "a: 1")), null, "yaml");
  assert.equal(commentEdit(root, "src/a.ts", "", 'const s = "// not a comment";'), null, "string literal");
});

test("guard.comments compares a Write with the file on disk", (t) => {
  const { root } = hookProject(t);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "w.ts"), lines("// existing", "const a = 1;"));
  const write = (content) => run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "src", "w.ts"), content }, cwd: root }, root)?.hookSpecificOutput ?? null;
  assert.equal(write(lines("// existing", "const a = 2;")), null);
  assert.equal(write(lines("// existing", "// added", "const a = 2;"))?.permissionDecision, "deny");
});

test("guard.comments lets an approved comment through on its path while the item is open (T-1.3)", (t) => {
  const { root, id } = hookProject(t);
  picket(root, "comment", id, "--path", "src/fee.ts", "--text", "half-up: the tariff table is published that way");
  const added = lines("// half-up: the tariff table is published that way", "const ROUNDING = 0.5;");
  assert.equal(commentEdit(root, "src/fee.ts", "const ROUNDING = 0.5;", added), null, "approved path");
  assert.equal(commentEdit(root, "src/other.ts", "const ROUNDING = 0.5;", added)?.permissionDecision, "deny", "other path");
  picket(root, "set", id, "status=done");
  assert.equal(commentEdit(root, "src/fee.ts", "const ROUNDING = 0.5;", added)?.permissionDecision, "deny", "item closed");
});

test("guard.comments matches an approval recorded as an absolute or dotted path", (t) => {
  const { root, id } = hookProject(t);
  picket(root, "comment", id, "--path", join(root, "src", "abs.ts"), "--text", "why abs");
  picket(root, "comment", id, "--path", ".\\src\\dot.ts", "--text", "why dot");
  assert.equal(commentEdit(root, "src/abs.ts", "a();", lines("// why abs", "a();")), null, "absolute");
  assert.equal(commentEdit(root, "src/dot.ts", "a();", lines("// why dot", "a();")), null, "dotted backslash");
  if (process.platform === "win32") assert.equal(commentEdit(root, "SRC/Abs.ts", "a();", lines("// why abs", "a();")), null, "letter case");
});

test("guard.comments reads the file so an Edit inside an open block keeps the block state", (t) => {
  const { root } = hookProject(t);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "d.py"), lines("def f():", '    """Totals the lines.', "    more", '    """', "    return 1"));
  writeFileSync(join(root, "src", "b.ts"), lines("/*", " existing", " */", "const a = 1;"));
  assert.equal(commentEdit(root, "src/d.py", "    more", lines("    more", "    added prose"))?.permissionDecision, "deny", "docstring");
  assert.equal(commentEdit(root, "src/b.ts", " existing", lines(" existing", " added prose"))?.permissionDecision, "deny", "block comment");
  assert.equal(commentEdit(root, "src/b.ts", "const a = 1;", "const a = 2;"), null, "code edit beside a block");
});
