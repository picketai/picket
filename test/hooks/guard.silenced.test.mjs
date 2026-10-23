import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runCli } from "#test/cli.mts";
import { hookProject, runHookBundle } from "#test/hook.mts";
import { writeConfig } from "#test/project.mts";

const lines = (...rows) => rows.join("\n");

function run(name, payload, root) {
  const r = runHookBundle(name, payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

function silencedEdit(root, path, old_string, new_string) {
  return run("guard.silenced", { hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: join(root, path), old_string, new_string }, cwd: root }, root)?.hookSpecificOutput ?? null;
}

function withFile(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function picket(root, ...args) {
  const r = runCli(root, [...args, "--root", root]);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

for (const [path, added, kind] of [
  ["test/fee.test.ts", 'it.skip("rounds half up", () => {});', "skipped-test"],
  ["src/fee.ts", "// eslint-disable-next-line no-console", "suppression"],
  ["src/fee.py", "x = 1  # noqa", "suppression"],
  ["tests/FeeTests.cs", '[Fact(Skip = "flaky")]', "skipped-test"],
]) {
  test(`guard.silenced denies an edit that adds a ${kind} to ${path} (T-1.1)`, (t) => {
    const { root } = hookProject(t);
    const out = silencedEdit(root, path, "a();", lines(added, "a();"));
    assert.equal(out?.permissionDecision, "deny");
    assert.match(out.permissionDecisionReason, new RegExp(`^guard\\.silenced: ${path.replaceAll(".", "\\.")} adds 1 silenced check\\(s\\): ${kind} `));
    assert.match(out.permissionDecisionReason, /Waivers: line/);
  });
}

test("guard.silenced lets a waived line through on its path while the item is open, and the waiver store is kernel-owned (T-1.2)", (t) => {
  const { root, id } = hookProject(t);
  const skip = 'it.skip("rounds half up", () => {});';
  picket(root, "waive", id, "--path", "test/fee.test.ts", "--text", `  ${skip}`);
  assert.equal(silencedEdit(root, "test/fee.test.ts", "a();", lines(skip, "a();")), null, "waived path");
  assert.equal(silencedEdit(root, "test/other.test.ts", "a();", lines(skip, "a();"))?.permissionDecision, "deny", "other path");
  const recorded = readFileSync(join(root, "work", id, "waivers.jsonl"), "utf8").trim().split("\n");
  assert.equal(recorded.length, 1);
  const write = run("guard.scope", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, "waivers.jsonl"), content: "{}" }, cwd: root }, root);
  assert.equal(write.hookSpecificOutput.permissionDecision, "deny");
  assert.match(write.hookSpecificOutput.permissionDecisionReason, /kernel-owned/);
  picket(root, "set", id, "status=done");
  assert.equal(silencedEdit(root, "test/fee.test.ts", "a();", lines(skip, "a();"))?.permissionDecision, "deny", "item closed");
});

test("guard.silenced denies a weaker coverage or warning threshold and allows a stricter one (T-1.3)", (t) => {
  const { root } = hookProject(t);
  const vitest = lines("export default {", "  test: { coverage: { thresholds: { lines: 80 } } },", "};");
  withFile(root, "vitest.config.ts", vitest);
  assert.equal(silencedEdit(root, "vitest.config.ts", "lines: 80", "lines: 70")?.permissionDecision, "deny", "lowered");
  assert.equal(silencedEdit(root, "vitest.config.ts", "lines: 80", "lines: 90"), null, "raised");
  withFile(root, "package.json", lines("{", '  "scripts": { "lint": "eslint . --max-warnings 0" }', "}"));
  const raised = silencedEdit(root, "package.json", "--max-warnings 0", "--max-warnings 5");
  assert.equal(raised?.permissionDecision, "deny", "max-warnings raised");
  assert.match(raised.permissionDecisionReason, /threshold "/);
  writeConfig(root, { quality: { coverage_min: 85 } });
  rmSync(join(root, "vitest.config.ts"));
  const fresh = run("guard.silenced", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "vitest.config.ts"), content: vitest }, cwd: root }, root);
  assert.equal(fresh?.hookSpecificOutput.permissionDecision, "deny", "fresh threshold under the bar");
});

test("guard.silenced allows a kept skip, a skip in a string, in markdown and in a non-test source file (T-1.4)", (t) => {
  const { root } = hookProject(t);
  const skip = 'it.skip("old", () => {});';
  withFile(root, "test/kept.test.ts", lines(skip, "a();"));
  assert.equal(silencedEdit(root, "test/kept.test.ts", "a();", "b();"), null, "kept");
  assert.equal(silencedEdit(root, "test/kept.test.ts", lines(skip, "a();"), lines("a();", skip)), null, "moved");
  assert.equal(silencedEdit(root, "test/s.test.ts", "a();", lines('const s = ".skip(";', "a();")), null, "string");
  assert.equal(silencedEdit(root, "docs/testing.md", "x", lines(skip, "x")), null, "markdown");
  assert.equal(silencedEdit(root, "src/runner.ts", "a();", lines(skip, "a();")), null, "non-test source");
});
