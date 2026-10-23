// Hooks are run as processes on synthetic payloads and transcripts, the way Claude Code runs them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createWork } from "../kernel/work-fixture.mjs";
import { LEGACY, statePath, stateRel, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { writeConfig } from "../kernel/config-fixture.mjs";
import { recordEscalation } from "../../dist/lib/shared/escalation.mjs";

const HOOKS = resolve("dist/hooks");

function run(hook, payload, root, env = {}) {
  const out = execFileSync("node", [join(HOOKS, hook)], { input: JSON.stringify(payload), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env } });
  return out.trim() ? JSON.parse(out) : null;
}

function project() {
  const root = mkdtempSync(join(tmpdir(), "harness-hooks-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  execFileSync("git", ["-C", root, "init", "-q"]);
  const s = createWork({ lane: "order", title: "Csv export", root });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# O\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n\n## Revision log\n");
  return { root, id: s.id };
}

test("a guard that allows or falls through appends no ledger row and prints what it printed before (T-2.3)", () => {
  const { root } = project();
  const allowed = run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git status" }, cwd: root, session_id: "s32" }, root);
  assert.deepEqual(Object.keys(allowed.hookSpecificOutput).sort(), ["hookEventName", "permissionDecision", "permissionDecisionReason"]);
  assert.equal(allowed.hookSpecificOutput.permissionDecision, "allow");
  assert.equal(run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "cat a > b" }, cwd: root, session_id: "s32" }, root), null);
  assert.deepEqual(ledgerRows(root), []);
  rmSync(root, { recursive: true, force: true });
});

const BIN = resolve("dist/bin/picket.mjs");

test("the guard.bash shell denies a heredoc into a test file and an agent's bash -c picket waive", () => {
  const { root, id } = project();
  const bash = (command, agent_type) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, agent_type }, root)?.hookSpecificOutput ?? null;
  const heredoc = "cat > test/x.test.mjs <<'EOF'\nit.skip('x');\nEOF";
  const write = bash(heredoc, "picket:developer");
  assert.equal(write?.permissionDecision, "deny");
  assert.match(write.permissionDecisionReason, /test\/x\.test\.mjs is code/);
  assert.equal(bash(heredoc), null, "the lead's shell write keeps its decision");
  assert.equal(bash(`bash -c 'picket waive ${id} --path a --text b'`, "picket:developer")?.permissionDecision, "deny");
  rmSync(root, { recursive: true, force: true });
});

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
    (err) => err.status === 2 && /refuses to run a destructive command/.test(err.stdout),
  );
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash judges the command a picket verb would run, by launcher or by script", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(decision('picket drive --run "rm -rf src"'), "deny");
  assert.equal(decision('node dist/bin/picket.mjs check --only "git push --force origin trunk"'), "deny");
  assert.equal(decision('dist/bin/picket drive --start "sudo node server.mjs" --hit /health'), "deny");
  assert.equal(decision('picket drive --run "npm run cli -- list"'), null);
  assert.equal(decision("picket state x"), "allow");
  assert.equal(JSON.parse(readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").at(-1)).outcome, "allow");
  assert.equal(decision("picket route x --verdict APPROVED --agent user"), null);
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash looks past leading env assignments to the picket verb and what it wraps", () => {
  const { root } = project();
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(decision('FOO=1 picket drive --run "rm -rf src"'), "deny");
  assert.equal(decision('FOO=1 BAR=2 node dist/bin/picket.mjs check --only "git push --force origin trunk"'), "deny");
  rmSync(root, { recursive: true, force: true });
});

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
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "git status --short" } }));
  const decision = (command) => run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root)?.hookSpecificOutput?.permissionDecision ?? null;
  assert.equal(stateRel("phase-1.log"), ".picket/state/phase-1.log");
  assert.equal(decision(`npm test > ${stateRel("phase-1.log")} 2>&1`), "allow");
  assert.equal(decision(`npm test > ${LEGACY.stateDir}/x.log`), null);
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

function ledgerRows(root) {
  const path = statePath(root, STATE_FILES.ledger);
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
}

test("recordEscalation appends a v2 escalation row stamped with the given time and returns it", () => {
  const { root } = project();
  const now = new Date("2026-10-23T10:00:00.000Z");
  const row = recordEscalation(root, { session: "s3", outcome: "ask", command: "git push origin v1", reason: "you asked for the tag" }, now);
  assert.deepEqual(ledgerRows(root), [row]);
  assert.deepEqual([row.v, row.ts, row.event, row.outcome], [2, "2026-10-23T10:00:00.000Z", "escalation", "ask"]);
  assert.match(row.key, /^[0-9a-f]{64}$/);
  rmSync(root, { recursive: true, force: true });
});

test("guard.bash is registered for Bash and PowerShell, and the spawned hook denies a destructive cmdlet with a PowerShell log row", () => {
  const hooks = JSON.parse(readFileSync(join(HOOKS, "hooks.json"), "utf8")).hooks;
  const guards = hooks.PreToolUse.filter((entry) => entry.hooks.some((hook) => hook.args.some((arg) => arg.endsWith("/hooks/guard.bash.mjs"))));
  assert.deepEqual(guards.map((entry) => entry.matcher), ["Bash|PowerShell"]);

  const { root } = project();
  const out = run("guard.bash.mjs", { hook_event_name: "PreToolUse", tool_name: "PowerShell", tool_input: { command: "Remove-Item -Recurse -Force build" }, cwd: root }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  const last = JSON.parse(readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").at(-1));
  assert.equal(last.tool, "PowerShell");
  assert.equal(last.outcome, "deny");
  rmSync(root, { recursive: true, force: true });
});
