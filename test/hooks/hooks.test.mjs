// Hooks are run as processes on synthetic payloads and transcripts, the way Claude Code runs them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createWork, deriveState } from "../../.claude/lib/work.mjs";

const HOOKS = resolve(".claude/hooks");

function run(hook, payload, root) {
  const out = execFileSync("node", [join(HOOKS, hook)], { input: JSON.stringify(payload), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  return out.trim() ? JSON.parse(out) : null;
}

function transcript(root, entries) {
  const p = join(root, "transcript.jsonl");
  const t0 = Date.parse("2026-09-07T10:00:00Z");
  writeFileSync(p, entries.map((e, i) => JSON.stringify({ timestamp: new Date(t0 + i * 1000).toISOString(), ...e })).join("\n") + "\n");
  return p;
}
const user = (text) => ({ type: "user", message: { role: "user", content: text } });
const assistant = (content) => ({ type: "assistant", message: { role: "assistant", model: "claude-opus-5", usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 100 }, content } });
const tool = (name, input) => ({ type: "tool_use", id: "t", name, input });

function project() {
  const root = mkdtempSync(join(tmpdir(), "harness-hooks-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  execFileSync("git", ["-C", root, "init", "-q"]);
  const s = createWork({ lane: "order", title: "Csv export", root });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# O\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n\n## Revision log\n");
  return { root, id: s.id };
}

test("route.verdict applies PHASE DONE from a developer block and reports the next action", () => {
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1\nartifact: work/${id}/order.md`), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE` }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.match(out.hookSpecificOutput.additionalContext, /approve_phase by user/);
  assert.equal(deriveState(id, root).phases[0].done, true);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.block.md")), true, "the developer block is saved for the gate packet");
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict reads the block a subagent handed back, not the paraphrase after it", () => {
  const { root, id } = project();
  // The lead's transcript opens with the user's request, so it holds no `work:` hint.
  const main = join(root, "main.jsonl");
  writeFileSync(main, JSON.stringify(user("fix the export")) + "\n");
  const block = `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE`;
  const own = transcript(root, [
    user(`work: ${id}\nphase: 1\nartifact: work/${id}/order.md`),
    assistant([tool("SubagentHandback", { message: block })]),
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "Report delivered to your caller." }] } },
    assistant([{ type: "text", text: "Phase 1 is staged and waits for approval.\n\nPHASE DONE" }]),
  ]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s4", transcript_path: main, agent_transcript_path: own, cwd: root, agent_type: "developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.equal(readFileSync(join(root, "work", id, "phases", "1.block.md"), "utf8").includes("Files: src/a.ts"), true, "the saved block is the handed-back one");
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict ignores a hand-back from an earlier turn of the same agent", () => {
  const { root, id } = project();
  const own = transcript(root, [
    user(`work: ${id}\nphase: 1`),
    assistant([tool("SubagentHandback", { message: `## Phase 1 of ${id}: A\n\nDone.\n\nPHASE DONE` })]),
    user("what did you change in src/a.ts?"),
    assistant([{ type: "text", text: "Only the export header." }]),
  ]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s5", transcript_path: own, agent_transcript_path: own, cwd: root, agent_type: "developer" }, root);
  assert.equal(out, null);
  assert.equal(deriveState(id, root).phases[0].done, false);
  rmSync(root, { recursive: true, force: true });
});

test("guard.block bounces a contract block without a token and passes one with it", () => {
  const { root, id } = project();
  const bad = transcript(root, [user("x"), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nI think this is approved.` }])]);
  const b = run("guard.block.mjs", { hook_event_name: "SubagentStop", transcript_path: bad, cwd: root }, root);
  assert.equal(b.decision, "block");
  assert.match(b.reason, /verdict token/);
  const good = transcript(root, [user("x"), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nPHASE DONE` }])]);
  assert.equal(run("guard.block.mjs", { hook_event_name: "SubagentStop", transcript_path: good, cwd: root }, root), null);
  const plain = transcript(root, [user("x"), assistant([{ type: "text", text: "just a chat reply" }])]);
  assert.equal(run("guard.block.mjs", { hook_event_name: "Stop", transcript_path: plain, cwd: root }, root), null);
  rmSync(root, { recursive: true, force: true });
});

test("guard.scope denies kernel-owned writes and unread edits, allows the rest", () => {
  const { root, id } = project();
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "a.ts"), "x");
  const tp = transcript(root, [user("x"), assistant([tool("Read", { file_path: join(root, "src", "a.ts") })])]);
  const base = { hook_event_name: "PreToolUse", transcript_path: tp, cwd: root };
  const denied = run("guard.scope.mjs", { ...base, tool_name: "Write", tool_input: { file_path: join(root, "work", id, "state.yaml") } }, root);
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  const unread = run("guard.scope.mjs", { ...base, tool_name: "Edit", tool_input: { file_path: join(root, "src", "b.ts") } }, root);
  assert.match(unread.hookSpecificOutput.permissionDecisionReason, /read .* before editing/);
  assert.equal(run("guard.scope.mjs", { ...base, tool_name: "Edit", tool_input: { file_path: join(root, "src", "a.ts") } }, root), null);
  assert.equal(run("guard.scope.mjs", { ...base, tool_name: "Write", tool_input: { file_path: join(root, "src", "new.ts") } }, root), null);

  // A subagent's payload names the main transcript but its reads live in <session>/subagents/agent-<id>.jsonl.
  writeFileSync(join(root, "src", "c.ts"), "y");
  const subDir = join(dirname(tp), basename(tp, ".jsonl"), "subagents");
  mkdirSync(subDir, { recursive: true });
  const sub = { ...base, agent_id: "a1", agent_type: "developer", tool_name: "Edit", tool_input: { file_path: join(root, "src", "c.ts") } };
  assert.match(run("guard.scope.mjs", sub, root).hookSpecificOutput.permissionDecisionReason, /read .* before editing/, "unread anywhere: denied");
  writeFileSync(join(subDir, "agent-a1.jsonl"), JSON.stringify(assistant([tool("Read", { file_path: join(root, "src", "c.ts") })])) + "\n");
  assert.equal(run("guard.scope.mjs", sub, root), null, "read in its own transcript: allowed");
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict keeps a pull request review in the ledger instead of routing it", () => {
  const { root } = project();
  const block = "## Review: pr-7287 · pr\n\nApproved: the diff does what the description says.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
  const tp = transcript(root, [user("scope: pr"), assistant([{ type: "text", text: block }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /APPROVED recorded for pr-7287/);
  assert.equal(readFileSync(join(root, ".claude", "ledger", "pr-7287.review.md"), "utf8").trim(), block);
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash judges the command a harness verb would run, so the allow rule is not a bypass", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(decision('node .claude/bin/harness.mjs drive --run "rm -rf src"'), "deny");
  assert.equal(decision('node .claude/bin/harness.mjs check --only "git push --force origin trunk"'), "deny");
  assert.equal(decision('node .claude/bin/harness.mjs drive --start "sudo node server.mjs" --hit /health'), "deny");
  assert.equal(decision('node .claude/bin/harness.mjs drive --run "npm run cli -- list"'), null, "a benign wrapped command still falls through to the allow rule");
  assert.equal(decision("node .claude/bin/harness.mjs state x"), null);
  // second layer: the kernel itself refuses, even if the hook were not installed
  assert.throws(
    () => execFileSync("node", [resolve(".claude/bin/harness.mjs"), "drive", "--run", "rm -rf src", "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root }, stdio: ["ignore", "pipe", "pipe"] }),
    (err) => /refuses to run a destructive command/.test(err.stderr),
  );
  rmSync(root, { recursive: true, force: true });
});

// branching --into (steps/10-create.md) relies on these two classifications: switch falls
// through to the permission prompt, checkout stays hard-denied.
test("guard.bash lets git switch -c through to the prompt and keeps git checkout -b denied", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(decision("git -C src/Api/.worktrees/feat-a switch -c feat-b feat-a"), null);
  assert.equal(decision("git -C src/Api/.worktrees/feat-a checkout -b feat-b"), "deny");
  rmSync(root, { recursive: true, force: true });
});

test("emit.ledger attributes a Stop without an agent id to the lead, not to the agent it spawned", () => {
  const { root, id } = project();
  const tp = transcript(root, [user("build it"), assistant([tool("Agent", { subagent_type: "architect", description: "Write the order" })]), assistant([{ type: "text", text: `▶ ${id} · phase 1/1 done\n[a] approve · [x] reject: <why>` }])]);
  run("emit.ledger.mjs", { hook_event_name: "Stop", session_id: "s2", transcript_path: tp, cwd: root }, root);
  const rows = readFileSync(join(root, ".claude", "ledger", "ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.at(-1).agent, "lead");
  assert.equal(rows.at(-1).event, "gate");
  rmSync(root, { recursive: true, force: true });
});

test("lint.schema reports structural problems and the revision protocol", () => {
  const { root, id } = project();
  const p = join(root, "work", id, "order.md");
  execFileSync("git", ["-C", root, "add", "-A"], { stdio: "ignore" });
  execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "base"], { stdio: "ignore" });
  writeFileSync(p, readFileSync(p, "utf8").replace("**Decision:** x", "**Decision:** y").replace("## Phase 1: A", "## Phase 2: A"));
  const out = run("lint.schema.mjs", { hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: p }, cwd: root }, root);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.match(ctx, /phase headings must run 1, 2, 3/);
  assert.match(ctx, /D-001 body changed without bumping/);
  assert.match(ctx, /Revision log/);
  rmSync(root, { recursive: true, force: true });
});

test("emit.ledger appends a v2 row and observe.drive tags commands with the open item", () => {
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([tool("Read", { file_path: "a" }), tool("Read", { file_path: "a" }), tool("Edit", { file_path: "src/a.ts" })]), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nok\n\nPHASE DONE` }])]);
  run("emit.ledger.mjs", { hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "developer" }, root);
  const rows = readFileSync(join(root, ".claude", "ledger", "ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].v, 2);
  assert.equal(rows[0].agent, "developer");
  assert.equal(rows[0].verdict, "PHASE DONE");
  assert.equal(rows[0].work_id, id);
  assert.equal(rows[0].rereads, 1);
  assert.equal(rows[0].usage.cache_read_input_tokens, 2000);

  run("observe.drive.mjs", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl -s http://127.0.0.1:8080/health" }, cwd: root, session_id: "s1" }, root);
  const drives = readFileSync(join(root, ".claude", "ledger", "drive-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(drives[0].kind, "drive");
  assert.equal(drives[0].work_id, id);
  assert.equal(drives[0].phase, 1);
  rmSync(root, { recursive: true, force: true });
});

test("monitor.context speaks up after six look-around calls", () => {
  const { root } = project();
  const six = Array.from({ length: 6 }, () => tool("Read", { file_path: "x" }));
  const tp = transcript(root, [user("x"), assistant(six)]);
  const out = run("monitor.context.mjs", { hook_event_name: "PostToolUse", tool_name: "Read", transcript_path: tp, cwd: root }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /6 consecutive/);
  const five = transcript(root, [user("x"), assistant(six.slice(1))]);
  assert.equal(run("monitor.context.mjs", { hook_event_name: "PostToolUse", tool_name: "Read", transcript_path: five, cwd: root }, root), null);
  rmSync(root, { recursive: true, force: true });
});

test("inject.state lists open items", () => {
  const { root, id } = project();
  const out = run("inject.state.mjs", { hook_event_name: "SessionStart", cwd: root }, root);
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`${id} · order · open`));
  rmSync(root, { recursive: true, force: true });
});
