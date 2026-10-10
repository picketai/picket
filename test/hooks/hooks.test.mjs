// Hooks are run as processes on synthetic payloads and transcripts, the way Claude Code runs them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createWork, deriveState, setMarker } from "../../core/lib/work.mjs";
import { LEGACY, branchingManifestPath, statePath, stateRel, STATE_FILES } from "../../core/lib/paths.mjs";
import { writeConfig } from "../kernel/config-fixture.mjs";

const HOOKS = resolve("core/hooks");

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

test("route.verdict saves the block of a plugin-prefixed picket:developer", () => {
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE` }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s5", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Block not saved/);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.block.md")), true);
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict tells a picket:developer whose block has no phase heading that it was not saved", () => {
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "Phase 1 is staged.\n\n**Checks:** tests passed\n\nPHASE DONE" }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s6", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.match(out.hookSpecificOutput.additionalContext, /Block not saved: it has no `## Phase <n> of <id>: <title>` heading/);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.block.md")), false);
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

test("guard.scope keeps the comment approvals kernel-owned (T-1.5)", () => {
  const { root, id } = project();
  const out = run("guard.scope.mjs", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, "comments.jsonl"), content: "{}" }, cwd: root }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /kernel-owned/);
  rmSync(root, { recursive: true, force: true });
});

const BIN = resolve("core/bin/picket.mjs");
const lines = (...rows) => rows.join("\n");

function commentEdit(root, path, old_string, new_string) {
  return run("guard.comments.mjs", { hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: join(root, path), old_string, new_string }, cwd: root }, root)?.hookSpecificOutput ?? null;
}

for (const [form, path, added] of [
  ["a line comment", "src/a.ts", "// sum the totals"],
  ["an XML doc comment", "src/A.cs", "/// <remarks>Why</remarks>"],
  ["a Python hash comment", "src/a.py", "# note"],
  ["an HTML comment", "src/a.html", ["<", "!-- note --", ">"].join("")],
]) {
  test(`guard.comments denies an edit that adds ${form} (T-1.1)`, () => {
    const { root } = project();
    const out = commentEdit(root, path, "x = 1", lines(added, "x = 1"));
    assert.equal(out?.permissionDecision, "deny");
    assert.match(out.permissionDecisionReason, /^guard\.comments: /);
    assert.match(out.permissionDecisionReason, new RegExp(path.replace(".", "\\.")));
    rmSync(root, { recursive: true, force: true });
  });
}

test("guard.comments allows kept comments, directives, docs, data files and strings (T-1.2)", () => {
  const { root } = project();
  assert.equal(commentEdit(root, "src/a.ts", lines("// keep", "const a = 1;"), lines("// keep", "const a = 2;")), null, "kept comment");
  assert.equal(commentEdit(root, "src/a.ts", "a();", lines("// eslint-disable-next-line no-console", "a();")), null, "directive");
  assert.equal(commentEdit(root, "src/a.ts", "a();", lines("// SPDX-License-Identifier: MIT", "a();")), null, "SPDX header");
  const markupNote = ["<", "!-- note --", ">"].join("");
  assert.equal(commentEdit(root, "docs/a.md", "x", lines("# Heading", markupNote, "x")), null, "markdown");
  assert.equal(commentEdit(root, "conf/a.yaml", "a: 1", lines("# note", "a: 1")), null, "yaml");
  assert.equal(commentEdit(root, "src/a.ts", "", 'const s = "// not a comment";'), null, "string literal");
  rmSync(root, { recursive: true, force: true });
});

test("guard.comments compares a Write with the file on disk", () => {
  const { root } = project();
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "w.ts"), lines("// existing", "const a = 1;"));
  const write = (content) => run("guard.comments.mjs", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "src", "w.ts"), content }, cwd: root }, root)?.hookSpecificOutput ?? null;
  assert.equal(write(lines("// existing", "const a = 2;")), null);
  assert.equal(write(lines("// existing", "// added", "const a = 2;"))?.permissionDecision, "deny");
  rmSync(root, { recursive: true, force: true });
});

test("guard.comments lets an approved comment through on its path while the item is open (T-1.3)", () => {
  const { root, id } = project();
  const harness = (...args) => execFileSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  harness("comment", id, "--path", "src/fee.ts", "--text", "half-up: the tariff table is published that way");
  const added = lines("// half-up: the tariff table is published that way", "const ROUNDING = 0.5;");
  assert.equal(commentEdit(root, "src/fee.ts", "const ROUNDING = 0.5;", added), null, "approved path");
  assert.equal(commentEdit(root, "src/other.ts", "const ROUNDING = 0.5;", added)?.permissionDecision, "deny", "other path");
  harness("set", id, "status=done");
  assert.equal(commentEdit(root, "src/fee.ts", "const ROUNDING = 0.5;", added)?.permissionDecision, "deny", "item closed");
  rmSync(root, { recursive: true, force: true });
});

test("guard.comments matches an approval recorded as an absolute or dotted path", () => {
  const { root, id } = project();
  const harness = (...args) => execFileSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  harness("comment", id, "--path", join(root, "src", "abs.ts"), "--text", "why abs");
  harness("comment", id, "--path", ".\\src\\dot.ts", "--text", "why dot");
  assert.equal(commentEdit(root, "src/abs.ts", "a();", lines("// why abs", "a();")), null, "absolute");
  assert.equal(commentEdit(root, "src/dot.ts", "a();", lines("// why dot", "a();")), null, "dotted backslash");
  if (process.platform === "win32") assert.equal(commentEdit(root, "SRC/Abs.ts", "a();", lines("// why abs", "a();")), null, "letter case");
  rmSync(root, { recursive: true, force: true });
});

test("guard.comments reads the file so an Edit inside an open block keeps the block state", () => {
  const { root } = project();
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "d.py"), lines("def f():", '    """Totals the lines.', "    more", '    """', "    return 1"));
  writeFileSync(join(root, "src", "b.ts"), lines("/*", " existing", " */", "const a = 1;"));
  assert.equal(commentEdit(root, "src/d.py", "    more", lines("    more", "    added prose"))?.permissionDecision, "deny", "docstring");
  assert.equal(commentEdit(root, "src/b.ts", " existing", lines(" existing", " added prose"))?.permissionDecision, "deny", "block comment");
  assert.equal(commentEdit(root, "src/b.ts", "const a = 1;", "const a = 2;"), null, "code edit beside a block");
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict closes the item on a cumulative APPROVED from the fresh cumulative-reviewer (T-2.5)", () => {
  const { root, id } = project();
  setMarker(id, 1, "done", root);
  setMarker(id, 1, "approved", root);
  const block = `## Review: ${id} · cumulative\n\nApproved: every story row passes.\n\nRequirements: PASS (2)\nAlignment: PASS\nDecisions: HONOURED\nRegression: none\nSources: none\nQuestions: none\nFindings: clean\n\nAPPROVED`;
  const tp = transcript(root, [user(`You are reviewing a change you did not write. You have no context beyond what is below.\nwork: ${id}\nscope: cumulative`), assistant([{ type: "text", text: block }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s6", transcript_path: tp, agent_transcript_path: tp, cwd: root, agent_type: "cumulative-reviewer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /APPROVED applied/);
  assert.match(out.hookSpecificOutput.additionalContext, /Next: close/);
  const last = deriveState(id, root).last_verdict;
  assert.deepEqual([last.agent, last.scope], ["reviewer", "cumulative"]);
  rmSync(root, { recursive: true, force: true });
});

/**
 * A project that declares source `analysis`, and that source: a main worktree with docs/a.md and a
 * linked worktree on feat-x. Hooks run with HARNESS_SOURCE_ANALYSIS pointing at the main worktree.
 */
function projectWithSource() {
  const { root, id } = project();
  writeConfig(root, { sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } });
  const base = mkdtempSync(join(tmpdir(), "harness-guard-src-"));
  const main = join(base, "analysis");
  const g = (...args) => execFileSync("git", ["-C", main, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { stdio: "ignore" });
  mkdirSync(join(main, "docs"), { recursive: true });
  execFileSync("git", ["init", "-q", "-b", "main", main]);
  writeFileSync(join(main, "docs", "a.md"), "rate 10\n");
  g("add", "-A");
  g("commit", "-q", "-m", "a");
  const feat = join(base, "analysis-feat");
  g("worktree", "add", "-q", "-b", "feat-x", feat);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root, HARNESS_SOURCE_ANALYSIS: main };
  const hook = (name, payload) => {
    const out = execFileSync("node", [join(HOOKS, name)], { input: JSON.stringify(payload), encoding: "utf8", env });
    return out.trim() ? JSON.parse(out).hookSpecificOutput : null;
  };
  const cleanup = () => {
    rmSync(root, { recursive: true, force: true });
    rmSync(base, { recursive: true, force: true });
  };
  return { root, id, main, feat, hook, cleanup };
}

test("guard.scope denies writes under a source and its linked worktree, not in the project (T-6.1)", () => {
  const { root, main, feat, hook, cleanup } = projectWithSource();
  const write = (tool_name, file_path) => hook("guard.scope.mjs", { hook_event_name: "PreToolUse", tool_name, tool_input: { file_path }, cwd: root });
  for (const target of [join(main, "docs", "a.md"), join(feat, "docs", "new.md")]) {
    const w = write("Write", target);
    assert.equal(w?.permissionDecision, "deny", target);
    assert.match(w.permissionDecisionReason, /inside source analysis, which is read-only/);
    assert.equal(write("Edit", target)?.permissionDecision, "deny");
  }
  assert.equal(write("Write", join(root, "src", "new.ts")), null);
  cleanup();
});

test("guard.scope keeps the intake record kernel-owned (T-6.2)", () => {
  const { root, id } = project();
  for (const f of ["request.md", "story.md", "sources.yaml", "sources/a.md", "repos.yaml"]) {
    const out = run("guard.scope.mjs", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, "work", id, f) }, cwd: root }, root);
    assert.match(out?.hookSpecificOutput?.permissionDecisionReason ?? "", /kernel-owned/, f);
  }
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash denies mutating commands in a source and keeps its reads allowed (T-6.3, T-6.4)", () => {
  const { root, feat, main, hook, cleanup } = projectWithSource();
  const wt = feat.replaceAll("\\", "/");
  const decision = (command) => hook("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root });
  const denied = [
    `git -C "${wt}" commit -m x`,
    `cd "${wt}" && git add .`,
    `cp a.md "${wt}/a.md"`,
    `echo x > "${wt}/a.md"`,
    `node .claude/bin/harness.mjs drive --run "cp a.md ${wt}/a.md"`,
    `git -C "${wt}" tag -d v1`,
    `git -C "${wt}" reflog expire --expire=now --all`,
    `git -C "${wt}" remote set-url origin x`,
    `prettier --write "${wt}/docs/a.md"`,
    `cd "${wt}" && eslint --fix .`,
    `git -C "${wt}" --config-env=core.pager=X log`,
    `git -C "${wt}" log --output=f`,
    `find "${wt}" -delete`,
    `awk 1 "${wt}/docs/a.md"`,
  ];
  for (const command of denied) {
    const d = decision(command);
    assert.equal(d?.permissionDecision, "deny", command);
    assert.match(d.permissionDecisionReason, /inside source analysis/, command);
  }
  const src = main.replaceAll("\\", "/");
  const allowed = [`git -C "${wt}" log -1`, `cat "${src}/docs/a.md"`, `grep -rn rate "${wt}"`, `git -C "${wt}" grep x`, `sed -n '1,20p' "${wt}/docs/a.md"`];
  for (const command of allowed) assert.equal(decision(command)?.permissionDecision, "allow", command);
  assert.equal(decision("cp a.md b.md"), null, "a copy inside the project still reaches the prompt");
  cleanup();
});

test("route.verdict keeps a pull request review in the ledger instead of routing it", () => {
  const { root } = project();
  const block = "## Review: pr-7287 · pr\n\nApproved: the diff does what the description says.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
  const tp = transcript(root, [user("scope: pr"), assistant([{ type: "text", text: block }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /APPROVED recorded for pr-7287/);
  assert.equal(readFileSync(statePath(root, "pr-7287.review.md"), "utf8").trim(), block);
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
    () => execFileSync("node", [BIN, "drive", "--run", "rm -rf src", "--root", root], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root }, stdio: ["ignore", "pipe", "pipe"] }),
    (err) => /refuses to run a destructive command/.test(err.stderr),
  );
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash judges the command a picket verb would run, by launcher or by script", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(decision('picket drive --run "rm -rf src"'), "deny");
  assert.equal(decision('node core/bin/picket.mjs check --only "git push --force origin trunk"'), "deny");
  assert.equal(decision('core/bin/picket drive --start "sudo node server.mjs" --hit /health'), "deny");
  assert.equal(decision('picket drive --run "npm run cli -- list"'), null);
  assert.equal(decision("picket state x"), null);
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash looks past leading env assignments to the picket verb and what it wraps", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(decision('FOO=1 picket drive --run "rm -rf src"'), "deny");
  assert.equal(decision('FOO=1 BAR=2 node core/bin/picket.mjs check --only "git push --force origin trunk"'), "deny");
  rmSync(root, { recursive: true, force: true });
});

test("observe.drive counts a command as a kernel call only when a segment starts with picket", () => {
  const { root } = project();
  const kind = (command) => {
    run("observe.drive.mjs", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s10" }, root);
    return readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l)).at(-1).kind;
  };
  assert.equal(kind("cd ~/src/picket && npm start"), "drive");
  assert.equal(kind("picket next x"), "inspect");
  assert.equal(kind("cd repo && picket check"), "inspect");
  assert.equal(kind('API_KEY=k picket drive --hit "GET /h"'), "inspect");
  assert.equal(kind("node core/bin/picket.mjs state x"), "inspect");
  assert.equal(kind('node "D:/My Projects/x/core/bin/picket.mjs" next x'), "inspect");
  assert.equal(kind('"/c/Users/John Smith/.claude/plugins/picket/bin/picket" next x'), "inspect");
  assert.equal(kind("{ picket next x; }"), "inspect");
  assert.equal(kind('curl -s "http://127.0.0.1:8080/picket ok"'), "drive");
  rmSync(root, { recursive: true, force: true });
});

for (const payload of [{ hook_event_name: "SubagentStart", agent_type: "picket:developer" }, { hook_event_name: "SessionStart", source: "compact" }]) {
  test(`inject.rules prints the four rules in order, without frontmatter, on ${payload.hook_event_name}`, () => {
    const { root } = project();
    const text = run("inject.rules.mjs", { ...payload, cwd: root }, root).hookSpecificOutput.additionalContext;
    const positions = ["# Writing rules", "# Comments in code", "# Work items", "# Security paths"].map((h) => text.indexOf(`${h}\n`));
    assert.ok(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])), `heading positions ${positions}`);
    assert.doesNotMatch(text, /^paths:/m);
    rmSync(root, { recursive: true, force: true });
  });
}

function listTree(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? [full, ...listTree(full)] : [full];
  }).sort();
}

test("guard.bash traces into the project root's state folder and writes nothing beside itself (T-1.2)", () => {
  const { root } = project();
  const before = listTree(HOOKS);
  run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git status" }, cwd: root }, root);
  const trace = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n");
  assert.equal(trace.length, 1);
  assert.equal(JSON.parse(trace[0]).command, "git status");
  assert.deepEqual(listTree(HOOKS), before);
  rmSync(root, { recursive: true, force: true });
});

test("guard.scope denies a model write under the state folder (T-2.2)", () => {
  const { root } = project();
  const out = run("guard.scope.mjs", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: statePath(root, STATE_FILES.ledger) }, cwd: root }, root);
  assert.equal(out?.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /written by the hooks only/);
  rmSync(root, { recursive: true, force: true });
});

test("guard.scope denies a model write under the legacy state folder (T-1.4)", () => {
  const { root } = project();
  const out = run("guard.scope.mjs", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(root, LEGACY.stateDir, STATE_FILES.driveLog) }, cwd: root }, root);
  assert.equal(out?.hookSpecificOutput.permissionDecision, "deny");
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /picket migrate/);
  rmSync(root, { recursive: true, force: true });
});

function designProject(phaseCount) {
  const root = mkdtempSync(join(tmpdir(), "harness-hooks-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  execFileSync("git", ["-C", root, "init", "-q"]);
  const s = createWork({ lane: "design", title: "Six phases", root });
  const numbers = Array.from({ length: phaseCount }, (_, i) => i + 1);
  const frontmatter = numbers.map((n) => `  - n: ${n}\n    files: [src/${n}.ts]\n    security: false\n`).join("");
  const bodies = numbers.map((n) => `## Phase ${n}: P${n}\n\n- **T-${n}.1** a\n- **T-${n}.2** b\n- **T-${n}.3** c\n`).join("\n");
  writeFileSync(join(root, "work", s.id, "design.md"), `---\nlane: design\nphases:\n${frontmatter}---\n# D\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n${bodies}\n## Revision log\n`);
  return { root, id: s.id };
}

test("route.verdict records a continued reviewer's checkpoint on the phase of its latest message (T-2.4, T-2.5)", () => {
  const { root, id } = designProject(6);
  for (const n of [1, 2, 3, 4]) {
    setMarker(id, n, "done", root);
    setMarker(id, n, "approved", root);
  }
  const block = `## Review: ${id} · checkpoint (phases 1 to 4, base b5cc4bb to HEAD 4840897)\n\nApproved.\n\nFindings: clean\n\nAPPROVED`;
  const tp = transcript(root, [
    user(`work: ${id}\nscope: crosscheck`),
    assistant([{ type: "text", text: `## Review: ${id} · crosscheck\n\nALIGNED` }]),
    user(`The coordinator sent a message while you were working:\nwork: ${id}\nscope: checkpoint\nphase: 4`),
    assistant([{ type: "text", text: block }]),
  ]);
  run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s9", transcript_path: tp, agent_transcript_path: tp, cwd: root, agent_type: "reviewer" }, root);
  assert.equal(existsSync(join(root, "work", id, "phases", "4.reviewed")), true);
  assert.equal(existsSync(join(root, "work", id, "phases", "5.reviewed")), false);
  const rows = readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.at(-1).phase, 4);
  assert.equal(rows.at(-1).scope, "checkpoint");
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash allows a redirect into the state log sink and falls through on a variable target (T-2.2)", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput ?? null;
  const allowed = decision(`git status > ${stateRel("phase-1.log")} 2>&1`);
  assert.equal(allowed?.permissionDecision, "allow");
  assert.ok(allowed.permissionDecisionReason.includes(stateRel("")));
  assert.equal(decision(`git status > ${stateRel("$NAME.log")} 2>&1`), null);
  assert.equal(decision("git status > elsewhere/phase-1.log 2>&1"), null);
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash sinks test logs into the new state folder only (T-4.4)", () => {
  const { root } = project();
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(stateRel("phase-1.log"), ".picket/state/phase-1.log");
  assert.equal(decision(`npm test > ${stateRel("phase-1.log")} 2>&1`), "allow");
  assert.equal(decision(`npm test > ${LEGACY.stateDir}/x.log`), null);
  rmSync(root, { recursive: true, force: true });
});

test("guard.scope lets a model write the branching manifest and nothing else in the state folder (T-4.4)", () => {
  const { root } = project();
  const write = (file_path) => run("guard.scope.mjs", { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path }, cwd: root }, root);
  assert.equal(write(statePath(root, STATE_FILES.ledger))?.hookSpecificOutput.permissionDecision, "deny");
  assert.equal(write(branchingManifestPath(root)), null);
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
  const rows = readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
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

test("lint.schema takes the order phase cap from the config (T-5.3)", () => {
  const { root } = project();
  const s = createWork({ lane: "order", title: "Three phases", root });
  const p = join(root, "work", s.id, "order.md");
  const phase = (n) => `## Phase ${n}: P${n}\n\n- **T-${n}.1** a\n- **T-${n}.2** b\n- **T-${n}.3** c\n\n`;
  const entries = [1, 2, 3].map((n) => `  - n: ${n}\n    files: [src/a.ts]\n`).join("");
  writeFileSync(p, `---\nlane: order\nphases:\n${entries}---\n# O\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n${[1, 2, 3].map(phase).join("")}## Revision log\n`);
  const lint = () => run("lint.schema.mjs", { hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: p }, cwd: root }, root)?.hookSpecificOutput.additionalContext ?? "";
  assert.doesNotMatch(lint(), /phases; the order cap/);
  writeConfig(root, { version: 1, lanes: { order: { max_phases: 2 } } });
  assert.match(lint(), /3 phases; the order cap is 2/);
  rmSync(root, { recursive: true, force: true });
});

test("lint.schema requires a boolean security on every design phase entry and not on order entries", () => {
  const { root, id } = project();
  const lint = (file) => run("lint.schema.mjs", { hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: file }, cwd: root }, root)?.hookSpecificOutput.additionalContext ?? "";
  const s = createWork({ lane: "design", title: "Marked", root });
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
  rmSync(root, { recursive: true, force: true });
});

test("emit.ledger appends a v2 row and observe.drive tags commands with the open item", () => {
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([tool("Read", { file_path: "a" }), tool("Read", { file_path: "a" }), tool("Edit", { file_path: "src/a.ts" })]), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nok\n\nPHASE DONE` }])]);
  run("emit.ledger.mjs", { hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "developer" }, root);
  const rows = readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].v, 2);
  assert.equal(rows[0].agent, "developer");
  assert.equal(rows[0].verdict, "PHASE DONE");
  assert.equal(rows[0].work_id, id);
  assert.equal(rows[0].rereads, 1);
  assert.equal(rows[0].usage.cache_read_input_tokens, 2000);

  run("observe.drive.mjs", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl -s http://127.0.0.1:8080/health" }, cwd: root, session_id: "s1" }, root);
  const drives = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(drives[0].kind, "drive");
  assert.equal(drives[0].work_id, id);
  assert.equal(drives[0].phase, 1);
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict applies PHASE DONE from a picket:developer whose block has no phase heading", () => {
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "Done.\n\nPHASE DONE" }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: "s7", transcript_path: tp, agent_transcript_path: tp, cwd: root, agent_type: "picket:developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`PHASE DONE applied to ${id} phase 1`));
  assert.equal(deriveState(id, root).phases[0].done, true);
  rmSync(root, { recursive: true, force: true });
});

test("emit.ledger records picket-prefixed agents under their bare names", () => {
  const { root, id } = project();
  const ledger = () => readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const own = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "ok" }])]);
  run("emit.ledger.mjs", { hook_event_name: "SubagentStop", session_id: "s8", transcript_path: own, agent_transcript_path: own, cwd: root, agent_type: "picket:developer" }, root);
  assert.equal(ledger().at(-1).agent, "developer");

  const spawning = transcript(root, [user("build it"), assistant([tool("Agent", { subagent_type: "picket:architect", description: "Write the order" })])]);
  run("emit.ledger.mjs", { hook_event_name: "SubagentStop", session_id: "s8", transcript_path: spawning, agent_transcript_path: spawning, cwd: root }, root);
  assert.equal(ledger().at(-1).agent, "architect");
  rmSync(root, { recursive: true, force: true });
});

test("observe.drive records a picket:developer as developer", () => {
  const { root } = project();
  run("observe.drive.mjs", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl -s http://127.0.0.1:8080/health" }, cwd: root, session_id: "s9", agent_type: "picket:developer" }, root);
  const drives = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(drives.at(-1).agent, "developer");
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

test("the spawned guard.bash allows a bare picket call chained with a read-only command and traces it", () => {
  const { root, id } = project();
  const command = `picket next ${id}; ls work`;
  const out = run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "allow");
  const trace = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(trace.some((row) => row.outcome === "allow" && String(row.command).includes(`picket next ${id}`)), JSON.stringify(trace.at(-1)));
  rmSync(root, { recursive: true, force: true });
});

test("the spawned guard.bash traces a picket drive --env value masked", () => {
  const { root } = project();
  const command = 'picket drive --run "node .picket/state/scratch/env-probe.mjs" --env PROBE=secret-probe-42';
  run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root);
  const log = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8");
  assert.doesNotMatch(log, /secret-probe-42/);
  assert.match(log, /--env PROBE=\*\*\*/);
  rmSync(root, { recursive: true, force: true });
});

test("observe.drive logs --env values masked, quoted or not", () => {
  const { root } = project();
  const logged = (command) => {
    run("observe.drive.mjs", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s11" }, root);
    return readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l)).at(-1).command;
  };
  const plain = logged('picket drive --run "node .picket/state/scratch/env-probe.mjs" --env PROBE=secret-probe-42');
  assert.match(plain, /--env PROBE=\*\*\*/);
  assert.equal(plain.includes("secret-probe-42"), false);
  const quoted = logged(`picket drive --hit "GET /h" --env "A=two words" --env B="three more words" --env C='single quoted'`);
  assert.match(quoted, /--env A=\*\*\* --env B=\*\*\* --env C=\*\*\*/);
  assert.equal(/two words|three more|single quoted/.test(quoted), false);
  rmSync(root, { recursive: true, force: true });
});

function projectWithReviewerExtension() {
  const root = mkdtempSync(join(tmpdir(), "picket-ext-spawn-"));
  const dir = join(root, ".picket", "extensions", "acme");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions: ["acme"] }));
  writeFileSync(join(dir, "extension.json"), JSON.stringify({ name: "acme", version: "0.2.0", schema: 1, rules: ["rules.md"], agents: { reviewer: ["reviewer.md"] } }));
  writeFileSync(join(dir, "rules.md"), "Use pnpm, never npm.\n");
  writeFileSync(join(dir, "reviewer.md"), "Check every endpoint against openapi.yaml.\n");
  return root;
}

test("the spawned inject.extensions gives a picket:reviewer its addition on SubagentStart and the lead its rules on SessionStart", () => {
  const root = projectWithReviewerExtension();
  try {
    const reviewer = run("inject.extensions.mjs", { hook_event_name: "SubagentStart", agent_type: "picket:reviewer", cwd: root }, root);
    assert.equal(reviewer.hookSpecificOutput.hookEventName, "SubagentStart");
    assert.match(reviewer.hookSpecificOutput.additionalContext, /## Extension acme 0\.2\.0\n\nUse pnpm, never npm\.\n\nCheck every endpoint against openapi\.yaml\./);
    const lead = run("inject.extensions.mjs", { hook_event_name: "SessionStart", source: "startup", cwd: root }, root);
    assert.equal(lead.hookSpecificOutput.additionalContext, "## Extension acme 0.2.0\n\nUse pnpm, never npm.");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the core rules hook prints the same bytes with and without an extension enabled", () => {
  const plain = mkdtempSync(join(tmpdir(), "picket-ext-plain-"));
  const extended = projectWithReviewerExtension();
  try {
    const event = (root) => ({ hook_event_name: "SubagentStart", agent_type: "picket:reviewer", cwd: root });
    const rulesOut = (root) => execFileSync("node", [join(HOOKS, "inject.rules.mjs")], { input: JSON.stringify(event(root)), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.equal(rulesOut(extended), rulesOut(plain));
  } finally {
    rmSync(plain, { recursive: true, force: true });
    rmSync(extended, { recursive: true, force: true });
  }
});

test("the spawned guard.scope asks on an extension write, asks on a read config edit, and denies an unread manifest edit", () => {
  const { root } = project();
  mkdirSync(join(root, ".picket", "extensions", "acme"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), "{}");
  writeFileSync(join(root, ".picket", "extensions", "acme", "extension.json"), "{}");
  const tp = transcript(root, [user("x"), assistant([tool("Read", { file_path: join(root, ".picket", "config.json") })])]);
  const base = { hook_event_name: "PreToolUse", transcript_path: tp, cwd: root };
  const decision = (tool_name, ...rel) => run("guard.scope.mjs", { ...base, tool_name, tool_input: { file_path: join(root, ...rel) } }, root)?.hookSpecificOutput;
  assert.equal(decision("Write", ".picket", "extensions", "acme", "rules", "a.md").permissionDecision, "ask");
  assert.equal(decision("Edit", ".picket", "config.json").permissionDecision, "ask");
  const unread = decision("Edit", ".picket", "extensions", "acme", "extension.json");
  assert.equal(unread.permissionDecision, "deny");
  assert.match(unread.permissionDecisionReason, /read .* before editing/);
  rmSync(root, { recursive: true, force: true });
});

test("route.verdict applies a PHASE DONE from a picket:developer", () => {
  const agent_type = "picket:developer";
  const { root, id } = project();
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE` }])]);
  const out = run("route.verdict.mjs", { hook_event_name: "SubagentStop", session_id: `s-${agent_type}`, transcript_path: tp, cwd: root, agent_type }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /^picket: PHASE DONE applied/);
  assert.equal(deriveState(id, root).phases[0].done, true);
  rmSync(root, { recursive: true, force: true });
});
