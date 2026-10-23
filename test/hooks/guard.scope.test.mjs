import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { LEGACY, branchingManifestPath, statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { assistantEntry as assistant, hookProject, ledgerRows, runHookBundle, toolUse as tool, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { gitAt } from "#test/git.mts";
import { withProject, writeConfig } from "#test/project.mts";

function run(payload, root, env) {
  const r = runHookBundle("guard.scope", payload, { root, env });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

function projectWithSource(t) {
  const { root, id } = hookProject(t);
  writeConfig(root, { sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } });
  const base = withProject(t, { picket: false });
  const main = join(base, "analysis");
  mkdirSync(join(main, "docs"), { recursive: true });
  gitAt(base)("init", "-q", "-b", "main", main);
  writeFileSync(join(main, "docs", "a.md"), "rate 10\n");
  const g = gitAt(main);
  g("add", "-A");
  g("commit", "-q", "-m", "a");
  const feat = join(base, "analysis-feat");
  g("worktree", "add", "-q", "-b", "feat-x", feat);
  const hook = (payload) => run(payload, root, { HARNESS_SOURCE_ANALYSIS: main })?.hookSpecificOutput ?? null;
  return { root, id, main, feat, hook };
}

test("guard.scope denies kernel-owned writes and unread edits, allows the rest", (t) => {
  const { root, id } = hookProject(t);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "a.ts"), "x");
  const tp = transcript(root, [user("x"), assistant([tool("Read", { file_path: join(root, "src", "a.ts") })])]);
  const base = { hook_event_name: "PreToolUse", transcript_path: tp, cwd: root };
  const denied = run({ ...base, tool_name: "Write", tool_input: { file_path: join(root, "work", id, "state.yaml") } }, root);
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  const unread = run({ ...base, tool_name: "Edit", tool_input: { file_path: join(root, "src", "b.ts") } }, root);
  assert.match(unread.hookSpecificOutput.permissionDecisionReason, /read .* before editing/);
  assert.equal(run({ ...base, tool_name: "Edit", tool_input: { file_path: join(root, "src", "a.ts") } }, root), null);
  assert.equal(run({ ...base, tool_name: "Write", tool_input: { file_path: join(root, "src", "new.ts") } }, root), null);

  writeFileSync(join(root, "src", "c.ts"), "y");
  const subDir = join(dirname(tp), basename(tp, ".jsonl"), "subagents");
  mkdirSync(subDir, { recursive: true });
  const sub = { ...base, agent_id: "a1", agent_type: "developer", tool_name: "Edit", tool_input: { file_path: join(root, "src", "c.ts") } };
  assert.match(run(sub, root).hookSpecificOutput.permissionDecisionReason, /read .* before editing/, "unread anywhere: denied");
  writeFileSync(join(subDir, "agent-a1.jsonl"), JSON.stringify(assistant([tool("Read", { file_path: join(root, "src", "c.ts") })])) + "\n");
  assert.equal(run(sub, root), null, "read in its own transcript: allowed");
});

test("a spawned guard.scope deny appends one block row naming the hook, the bare agent, the session and the open item (T-2.1)", (t) => {
  const { root, id } = hookProject(t);
  const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, "state.yaml") }, cwd: root, session_id: "s30", agent_type: "picket:developer" }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  const rows = ledgerRows(root);
  assert.equal(rows.length, 1);
  assert.deepEqual({ v: rows[0].v, event: rows[0].event, hook: rows[0].hook, agent: rows[0].agent, session: rows[0].session, work_id: rows[0].work_id }, { v: 2, event: "block", hook: "guard.scope", agent: "developer", session: "s30", work_id: id });
  assert.ok(rows[0].reason.length > 0 && rows[0].reason.length <= 300, rows[0].reason);
  assert.match(rows[0].ts, /^\d{4}-\d{2}-\d{2}T/);
});

test("a denying hook still prints its deny and exits 0 when the state folder cannot be written (T-2.4)", (t) => {
  const { root, id } = hookProject(t);
  mkdirSync(join(root, ".picket"), { recursive: true });
  writeFileSync(join(root, ".picket", "state"), "a file where the state folder should be");
  const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, "state.yaml") }, cwd: root, session_id: "s33" }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
});

test("guard.scope keeps the comment approvals kernel-owned (T-1.5)", (t) => {
  const { root, id } = hookProject(t);
  const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, "comments.jsonl"), content: "{}" }, cwd: root }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /kernel-owned/);
});

test("guard.scope denies writes under a source and its linked worktree, not in the project (T-6.1)", (t) => {
  const { root, main, feat, hook } = projectWithSource(t);
  const write = (tool_name, file_path) => hook({ hook_event_name: "PreToolUse", tool_name, tool_input: { file_path }, cwd: root });
  for (const target of [join(main, "docs", "a.md"), join(feat, "docs", "new.md")]) {
    const w = write("Write", target);
    assert.equal(w?.permissionDecision, "deny", target);
    assert.match(w.permissionDecisionReason, /inside source analysis, which is read-only/);
    assert.equal(write("Edit", target)?.permissionDecision, "deny");
  }
  assert.equal(write("Write", join(root, "src", "new.ts")), null);
});

test("guard.scope keeps the intake record kernel-owned (T-6.2)", (t) => {
  const { root, id } = hookProject(t);
  for (const f of ["request.md", "story.md", "sources.yaml", "sources/a.md", "repos.yaml"]) {
    const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, f) }, cwd: root }, root);
    assert.match(out?.hookSpecificOutput?.permissionDecisionReason ?? "", /kernel-owned/, f);
  }
});

test("guard.scope lets a model write a drive script under the state scratch folder", (t) => {
  const { root } = hookProject(t);
  const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: statePath(root, "scratch/drive.mjs") }, cwd: root }, root);
  assert.equal(out?.hookSpecificOutput?.permissionDecision, undefined);
});

test("guard.scope denies a model write under the state folder (T-2.2)", (t) => {
  const { root } = hookProject(t);
  const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: statePath(root, STATE_FILES.ledger) }, cwd: root }, root);
  assert.equal(out?.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /written by the hooks only/);
});

test("guard.scope denies a model write under the legacy state folder (T-1.4)", (t) => {
  const { root } = hookProject(t);
  const out = run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, LEGACY.stateDir, STATE_FILES.driveLog) }, cwd: root }, root);
  assert.equal(out?.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /picket migrate/);
});

test("guard.scope lets a model write the branching manifest and nothing else in the state folder (T-4.4)", (t) => {
  const { root } = hookProject(t);
  const write = (file_path) => run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: root }, root);
  assert.equal(write(statePath(root, STATE_FILES.ledger))?.hookSpecificOutput.permissionDecision, "deny");
  assert.equal(write(branchingManifestPath(root)), null);
});

test("the spawned guard.scope asks on an extension write, asks on a read config edit, and denies an unread manifest edit", (t) => {
  const { root } = hookProject(t);
  mkdirSync(join(root, ".picket", "extensions", "acme"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), "{}");
  writeFileSync(join(root, ".picket", "extensions", "acme", "extension.json"), "{}");
  const tp = transcript(root, [user("x"), assistant([tool("Read", { file_path: join(root, ".picket", "config.json") })])]);
  const base = { hook_event_name: "PreToolUse", transcript_path: tp, cwd: root };
  const scopeOutput = (tool_name, ...rel) => run({ ...base, tool_name, tool_input: { file_path: join(root, ...rel) } }, root)?.hookSpecificOutput;
  assert.equal(scopeOutput("Write", ".picket", "extensions", "acme", "rules", "a.md").permissionDecision, "ask");
  assert.equal(scopeOutput("Edit", ".picket", "config.json").permissionDecision, "ask");
  const unread = scopeOutput("Edit", ".picket", "extensions", "acme", "extension.json");
  assert.equal(unread.permissionDecision, "deny");
  assert.match(unread.permissionDecisionReason, /read .* before editing/);
});
