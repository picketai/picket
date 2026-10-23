import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "#test/git.mts";
import { hookProject, runHookBundle } from "#test/hook.mts";
import { openItem, writeConfig } from "#test/project.mts";

function run(payload, root) {
  const r = runHookBundle("lint.schema", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("lint.schema reports structural problems and the revision protocol", (t) => {
  const { root, id } = hookProject(t);
  const p = join(root, "work", id, "order.md");
  const git = gitAt(root);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  writeFileSync(p, readFileSync(p, "utf8").replace("**Decision:** x", "**Decision:** y").replace("## Phase 1: A", "## Phase 2: A"));
  const out = run({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: p }, cwd: root }, root);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.match(ctx, /phase headings must run 1, 2, 3/);
  assert.match(ctx, /D-001 body changed without bumping/);
  assert.match(ctx, /Revision log/);
});

test("lint.schema takes the order phase cap from the config (T-5.3)", (t) => {
  const { root } = hookProject(t);
  const s = openItem(root, { lane: "order", title: "Three phases" });
  const p = join(root, "work", s.id, "order.md");
  const phase = (n) => `## Phase ${n}: P${n}\n\n- **T-${n}.1** a\n- **T-${n}.2** b\n- **T-${n}.3** c\n\n`;
  const entries = [1, 2, 3].map((n) => `  - n: ${n}\n    files: [src/a.ts]\n`).join("");
  writeFileSync(p, `---\nlane: order\nphases:\n${entries}---\n# O\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n${[1, 2, 3].map(phase).join("")}## Revision log\n`);
  const lint = () => run({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: p }, cwd: root }, root)?.hookSpecificOutput.additionalContext ?? "";
  assert.doesNotMatch(lint(), /phases; the order cap/);
  writeConfig(root, { version: 1, lanes: { order: { max_phases: 2 } } });
  assert.match(lint(), /3 phases; the order cap is 2/);
});

test("lint.schema requires a boolean security on every design phase entry and not on order entries", (t) => {
  const { root, id } = hookProject(t);
  const lint = (file) => run({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: file }, cwd: root }, root)?.hookSpecificOutput.additionalContext ?? "";
  const s = openItem(root, { lane: "design", title: "Marked" });
  const p = join(root, "work", s.id, "design.md");
  const record = (mark) => `---\nlane: design\nphases:\n  - n: 1\n    files: [src/a.ts]\n${mark}---\n# D\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n\n## Revision log\n`;
  const missing = "phases[n=1].security must be true or false";

  writeFileSync(p, record(""));
  assert.ok(lint(p).includes(missing), "an absent key is reported");
  writeFileSync(p, record("    security: maybe\n"));
  assert.ok(lint(p).includes(missing), "a non-boolean value is reported");
  writeFileSync(p, record("    security: false\n"));
  assert.doesNotMatch(lint(p), /security/);
  assert.doesNotMatch(lint(join(root, "work", id, "order.md")), /security/, "an order record needs no security key");
});
