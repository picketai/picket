import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

test("lint.schema flags a plan path inside a worktree, in files and in greps, and passes the project-root path (T-9.1)", (t) => {
  const { root } = hookProject(t);
  const lint = (file) => run({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: file }, cwd: root }, root)?.hookSpecificOutput.additionalContext ?? "";
  const s = openItem(root, { lane: "design", title: "Worktree paths" });
  const p = join(root, "work", s.id, "design.md");
  const record = (file, grep) =>
    `---\nlane: design\nphases:\n  - n: 1\n    files: [${file}]\n    greps:\n      - path: ${grep}\n        pattern: Rate\n    security: false\n---\n# D\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n\n## Revision log\n`;
  const worktreeFile = "src/Orders/.worktrees/RMS-12/pricing.cs";
  const worktreeGrep = "src/Orders/.worktrees/RMS-12/rates.cs";

  writeFileSync(p, record(worktreeFile, worktreeGrep));
  const flagged = lint(p);
  assert.ok(flagged.includes(`phases[n=1] ${worktreeFile} is a worktree path; plan paths are project-root relative`), flagged);
  assert.ok(flagged.includes(`phases[n=1] ${worktreeGrep} is a worktree path; plan paths are project-root relative`), flagged);
  writeFileSync(p, record("src/Orders/pricing.cs", "src/Orders/rates.cs"));
  assert.doesNotMatch(lint(p), /worktree path/);
});

test("lint.schema names a malformed deferral and still counts the phase's three criteria", (t) => {
  const { root } = hookProject(t);
  const s = openItem(root, { lane: "design", title: "Deferred mail" });
  const p = join(root, "work", s.id, "design.md");
  const record = (marker) =>
    `---\nlane: design\nphases:\n  - n: 1\n    files: [src/mail.ts]\n    security: false\n---\n# D\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** ${marker} the mail renders in a real client\n\n## Revision log\n`;

  writeFileSync(p, record("[DEFERRED: QA]"));
  const flagged = lintWrite(root, p);
  assert.ok(flagged.includes("T-1.3: write a deferral as [DEFERRED: <owner>, <gate>] right after the id"), flagged);
  assert.doesNotMatch(flagged, /criteria; 3 to 8 required/);
  writeFileSync(p, record("[DEFERRED: QA, before go-live]"));
  assert.equal(lintWrite(root, p), "");
});

function grepRecord(grep) {
  return `---\nlane: design\nphases:\n  - n: 1\n    files: [src/units.ts]\n    greps:\n      - path: src/units.ts\n${grep}    security: false\n---\n# D\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n\n## Revision log\n`;
}

test("lint.schema flags a non-boolean absent and a whole-file lookahead, and passes absent: true with a plain pattern", (t) => {
  const { root } = hookProject(t);
  const s = openItem(root, { lane: "design", title: "Units" });
  const p = join(root, "work", s.id, "design.md");

  writeFileSync(p, grepRecord('        pattern: \\bmetres\\b\n        absent: "yes"\n'));
  assert.ok(lintWrite(root, p).includes("phases[n=1] grep absent must be true or false"));
  writeFileSync(p, grepRecord("        pattern: ^(?![\\s\\S]*metres)\n"));
  assert.ok(lintWrite(root, p).includes("phases[n=1] grep pattern ^(?![\\s\\S]*metres) is a whole-file lookahead; write it as absent: true with the plain pattern"));
  writeFileSync(p, grepRecord("        pattern: \\bmetres\\b\n        absent: true\n"));
  assert.equal(lintWrite(root, p), "");
});

function reportText(front) {
  return `---\n${front}\n---\n# Report: Pricing\n\n## Summary\nPrices round half-up [VERIFIED].\n\n## Findings\n- **R-001** [VERIFIED] Prices round half-up.\n`;
}

function lintWrite(root, file) {
  return run({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: file }, cwd: root }, root)?.hookSpecificOutput.additionalContext ?? "";
}

test("lint.schema checks every research.md a work item writes (T-2.1)", (t) => {
  const { root, id } = hookProject(t);
  const p = join(root, "work", id, "research.md");
  writeFileSync(p, reportText("kind: report\nconfidence: certain"));
  assert.match(lintWrite(root, p), /confidence is "certain"/);
  writeFileSync(p, reportText("kind: design\nconfidence: high"));
  assert.match(lintWrite(root, p), /kind is "design"/);
  writeFileSync(p, reportText("kind: report\nconfidence: high"));
  assert.equal(lintWrite(root, p), "");
});

test("lint.schema checks a file under artifacts/reports/ only when it says kind: report (T-2.5)", (t) => {
  const { root } = hookProject(t);
  mkdirSync(join(root, "artifacts", "reports"), { recursive: true });
  const p = join(root, "artifacts", "reports", "x.md");
  writeFileSync(p, "# Notes\n\n<!-- draft -->\n");
  assert.equal(lintWrite(root, p), "");
  writeFileSync(p, reportText("kind: report\nconfidence: certain").replace("Prices round", "<!-- draft --> Prices round"));
  const context = lintWrite(root, p);
  assert.match(context, /confidence is "certain"/);
  assert.match(context, /template comment left in the file/);
});
