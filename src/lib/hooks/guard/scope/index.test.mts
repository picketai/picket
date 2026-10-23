import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { guardScope as scopeHandler } from "./index.mts";
import { branchingManifestPath, statePath, STATE_FILES } from "../../../shared/paths.mts";
import type { Context } from "../../../shared/context.mts";
import { hookContext } from "#test/context.mts";
import { gitIn } from "#test/git.mts";
import { climbBackIn, dotDotForms, looseHandler, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { openItem, withProject, writeConfig } from "#test/project.mts";

const guardScope = looseHandler(scopeHandler);

const project = (t: Parameters<typeof withProject>[0]) => withProject(t, { host: true, picket: false });

const scopeWrite = (root: string, file_path: string, ctx: Context = hookContext(root)) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path, content: "x" }, cwd: root }, ctx)?.hookSpecificOutput ?? null;

test("guardScope called directly guards kernel and hook state but lets the branching manifest through (T-7.3)", (t) => {
  const root = project(t);
  const s = openItem(root, { lane: "order", title: "Scope" });
  const write = (file_path: string) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: root }, hookContext(root))?.hookSpecificOutput.permissionDecision ?? null;
  assert.equal(write(join(root, "work", s.id, "state.yaml")), "deny");
  assert.equal(write(join(root, "work", s.id, "left.jsonl")), "deny");
  assert.equal(write(statePath(root, STATE_FILES.ledger)), "deny");
  assert.equal(write(branchingManifestPath(root)), null);
});

test("guardScope decides the same whatever form the root and the target path take", (t) => {
  const root = project(t);
  const s = openItem(root, { lane: "order", title: "Forms" });
  const longRoot = realpathSync.native(root);
  const decide = (rootForm: string, file_path: string) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: rootForm }, hookContext(rootForm))?.hookSpecificOutput.permissionDecision ?? null;
  assert.equal(decide(root, join(longRoot, "work", s.id, "state.yaml")), "deny");
  assert.equal(decide(longRoot, join(root, "work", s.id, "state.yaml")), "deny");
  assert.equal(decide(root, join(longRoot, ".picket", "extensions", "acme", "extension.json")), "ask");
  assert.equal(decide(root, join(longRoot, "src", "new", "file.ts")), null);
  if (process.platform === "win32") assert.equal(decide(root, join(root, "Work", s.id, "State.yaml")), "deny");
});

test("guardScope denies the legacy state folder and hook state in any case, not look-alikes (T-1.1, T-1.2, T-1.3)", (t) => {
  const root = project(t);
  const guard = (tool_name: string, rel: string) => guardScope({ hook_event_name: "PreToolUse", tool_name, tool_input: { file_path: join(root, rel) }, cwd: root }, hookContext(root))?.hookSpecificOutput ?? null;
  for (const [tool_name, rel] of [["Write", ".claude/ledger/drive-log.jsonl"], ["Edit", ".claude/ledger/drive-log.jsonl"], ["Write", ".claude/ledger/ledger.jsonl"]]) {
    const out = guard(tool_name, rel);
    assert.equal(out?.permissionDecision, "deny", `${tool_name} ${rel}`);
    assert.match(out.permissionDecisionReason, /\.claude\/ledger\//);
    assert.match(out.permissionDecisionReason, /picket migrate/);
  }
  assert.equal(guard("Write", ".Claude/Ledger/drive-log.jsonl")?.permissionDecision, "deny");
  assert.equal(guard("Write", ".PICKET/State/drive-log.jsonl")?.permissionDecision, "deny");
  assert.equal(guard("Write", ".picket/state/branching.yaml"), null);
  assert.equal(guard("Write", ".Picket/State/Branching.yaml"), null);
  assert.equal(guard("Write", ".claude/ledger-notes.md"), null);
});

test("guardScope asks before an edit to extension content or the config, and keeps its denials first", (t) => {
  const root = project(t);
  const decide = (tool_name: string, rel: string) => guardScope({ hook_event_name: "PreToolUse", tool_name, tool_input: { file_path: join(root, rel) }, cwd: root }, hookContext(root))?.hookSpecificOutput ?? null;
  const extension = decide("Write", ".picket/extensions/acme/rules/a.md");
  assert.equal(extension.permissionDecision, "ask");
  assert.match(extension.permissionDecisionReason, /\.picket\/extensions\/acme\/rules\/a\.md is extension content/);
  const config = decide("Edit", ".picket/config.json");
  assert.equal(config.permissionDecision, "ask");
  assert.match(config.permissionDecisionReason, /\.picket\/config\.json changes what the kernel loads/);
  assert.equal(decide("Write", ".picket/state/ledger.jsonl").permissionDecision, "deny");
  assert.equal(decide("Write", "src/a.ts"), null);
  if (process.platform === "win32") assert.equal(decide("Write", ".PICKET/Extensions/acme/x.md").permissionDecision, "ask");
});

test("guardScope asks for the moved config and extensions, keeps .picket/state hook-only, and has no rule for any other folder", (t) => {
  const root = project(t);
  const decide = (rel: string) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, rel) }, cwd: root }, hookContext(root))?.hookSpecificOutput ?? null;
  assert.equal(decide(".picket/config.json").permissionDecision, "ask");
  assert.equal(decide(".picket/extensions/a/rules/r.md").permissionDecision, "ask");
  assert.equal(decide(".picket/state/ledger.jsonl").permissionDecision, "deny");
  assert.equal(decide("notes/config.json"), null);
});

test("guardScope denies kernel-owned and hook state reached through .. in every path form", (t) => {
  const root = project(t);
  const s = openItem(root, { lane: "order", title: "Dots" });
  for (const rel of [`src/../work/${s.id}/state.yaml`, "src/../.picket/state/ledger.jsonl", climbBackIn(root, `work/${s.id}/state.yaml`)]) {
    for (const file_path of dotDotForms(root, rel)) assert.equal(scopeWrite(root, file_path)?.permissionDecision, "deny", file_path);
  }
  for (const file_path of dotDotForms(root, "src/../../elsewhere/a.ts")) assert.equal(scopeWrite(root, file_path), null, file_path);
});

test("guardScope denies a write into a source reached through ..", (t) => {
  const root = project(t);
  const source = join(root, "analysis");
  gitIn(root, "init", "-q", source);
  writeConfig(root, { version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } });
  const ctx = hookContext(root, { env: { ...process.env, PICKET_TEST_SOURCE_ANALYSIS: source } });
  for (const file_path of dotDotForms(root, "src/../analysis/a.md")) {
    const out = scopeWrite(root, file_path, ctx);
    assert.equal(out?.permissionDecision, "deny", file_path);
    assert.match(out.permissionDecisionReason, /inside source analysis, which is read-only/, file_path);
  }
});

test("guardScope lets an Edit through .. reach a file the transcript read under its plain path", (t) => {
  const root = project(t);
  const plain = join(root, "src", "a.ts");
  mkdirSync(dirname(plain), { recursive: true });
  writeFileSync(plain, "a\n");
  const read = { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "r", name: "Read", input: { file_path: plain } }] } };
  const tp = transcript(root, [user("go"), read]);
  const edit = (file_path: string) => guardScope({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path, old_string: "a", new_string: "b" }, cwd: root, transcript_path: tp }, hookContext(root))?.hookSpecificOutput ?? null;
  for (const file_path of dotDotForms(root, "src/../src/a.ts")) assert.equal(edit(file_path), null, file_path);
  assert.equal(edit(join(root, "src", "b.ts"))?.permissionDecision, "deny");
});
