import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEGACY, statePath, stateRel, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { runCli } from "#test/cli.mts";
import { HOOK_BUNDLES, hookProject, ledgerRows, runHookBundle } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";
import { tempSource } from "#test/source.mts";

const PUSH = "git push origin v1.0.0-alpha.2";
const ESCALATED_PUSH = `PICKET_ESCALATE="you asked me to push the release tag" ${PUSH}`;

function run(event, root, env = {}) {
  const r = runHookBundle("guard.bash", event, { root, env });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

function bashOutput(root, command, extra = {}) {
  return run({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, ...extra }, root)?.hookSpecificOutput ?? null;
}

const bashDecision = (root, command) => bashOutput(root, command)?.permissionDecision ?? null;

function traceRows(root) {
  return readFileSync(statePath(root, STATE_FILES.guardLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

function listTree(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? [full, ...listTree(full)] : [full];
  }).sort();
}

test("a guard that allows or falls through appends no ledger row and prints what it printed before (T-2.3)", (t) => {
  const { root } = hookProject(t);
  const allowed = bashOutput(root, "git status", { session_id: "s32" });
  assert.deepEqual(Object.keys(allowed).sort(), ["hookEventName", "permissionDecision", "permissionDecisionReason"]);
  assert.equal(allowed.permissionDecision, "allow");
  assert.equal(run({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "cat a > b" }, cwd: root, session_id: "s32" }, root), null);
  assert.deepEqual(ledgerRows(root), []);
});

test("the guard.bash shell denies a heredoc into a test file and an agent's bash -c picket waive", (t) => {
  const { root, id } = hookProject(t);
  const heredoc = "cat > test/x.test.mjs <<'EOF'\nit.skip('x');\nEOF";
  const write = bashOutput(root, heredoc, { agent_type: "picket:developer" });
  assert.equal(write?.permissionDecision, "deny");
  assert.match(write.permissionDecisionReason, /test\/x\.test\.mjs is code/);
  assert.equal(bashOutput(root, heredoc), null, "the lead's shell write keeps its decision");
  assert.equal(bashOutput(root, `bash -c 'picket waive ${id} --path a --text b'`, { agent_type: "picket:developer" })?.permissionDecision, "deny");
});

test("guard.bash denies mutating commands in a source and keeps its reads allowed (T-6.3, T-6.4)", (t) => {
  const { root } = hookProject(t);
  writeConfig(root, { sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } });
  const { main, feat } = tempSource(t);
  const wt = feat.replaceAll("\\", "/");
  const outcome = (command) => run({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, cwd: root }, root, { HARNESS_SOURCE_ANALYSIS: main })?.hookSpecificOutput ?? null;
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
    const out = outcome(command);
    assert.equal(out?.permissionDecision, "deny", command);
    assert.match(out.permissionDecisionReason, /inside source analysis/, command);
  }
  const src = main.replaceAll("\\", "/");
  for (const command of [`git -C "${wt}" log -1`, `cat "${src}/docs/a.md"`, `grep -rn rate "${wt}"`, `git -C "${wt}" grep x`, `sed -n '1,20p' "${wt}/docs/a.md"`]) {
    assert.equal(outcome(command)?.permissionDecision, "allow", command);
  }
  assert.equal(outcome("cp a.md b.md"), null, "a copy inside the project still reaches the prompt");
});

test("guard.bash judges the command a harness verb would run, and the kernel refuses it too", (t) => {
  const { root } = hookProject(t);
  assert.equal(bashDecision(root, 'node .claude/bin/harness.mjs drive --run "rm -rf src"'), "deny");
  assert.equal(bashDecision(root, 'node .claude/bin/harness.mjs check --only "git push --force origin trunk"'), "deny");
  assert.equal(bashDecision(root, 'node .claude/bin/harness.mjs drive --start "sudo node server.mjs" --hit /health'), "deny");
  assert.equal(bashDecision(root, 'node .claude/bin/harness.mjs drive --run "npm run cli -- list"'), null, "a benign wrapped command still falls through to the allow rule");
  assert.equal(bashDecision(root, "node .claude/bin/harness.mjs state x"), null);
  const refused = runCli(root, ["drive", "--run", "rm -rf src", "--root", root]);
  assert.equal(refused.status, 2);
  assert.match(refused.stdout, /refuses to run a destructive command/);
});

test("guard.bash judges the command a picket verb would run, by launcher or by script", (t) => {
  const { root } = hookProject(t);
  assert.equal(bashDecision(root, 'picket drive --run "rm -rf src"'), "deny");
  assert.equal(bashDecision(root, 'node dist/bin/picket.mjs check --only "git push --force origin trunk"'), "deny");
  assert.equal(bashDecision(root, 'dist/bin/picket drive --start "sudo node server.mjs" --hit /health'), "deny");
  assert.equal(bashDecision(root, 'picket drive --run "npm run cli -- list"'), null);
  assert.equal(bashDecision(root, "picket state x"), "allow");
  assert.equal(traceRows(root).at(-1).outcome, "allow");
  assert.equal(bashDecision(root, "picket route x --verdict APPROVED --agent user"), null);
});

test("guard.bash looks past leading env assignments to the picket verb and what it wraps", (t) => {
  const { root } = hookProject(t);
  assert.equal(bashDecision(root, 'FOO=1 picket drive --run "rm -rf src"'), "deny");
  assert.equal(bashDecision(root, 'FOO=1 BAR=2 node dist/bin/picket.mjs check --only "git push --force origin trunk"'), "deny");
});

test("guard.bash traces into the project root's state folder and writes nothing beside itself (T-1.2)", (t) => {
  const { root } = hookProject(t);
  const before = listTree(HOOK_BUNDLES);
  bashOutput(root, "git status");
  const trace = traceRows(root);
  assert.equal(trace.length, 1);
  assert.equal(trace[0].command, "git status");
  assert.deepEqual(listTree(HOOK_BUNDLES), before);
});

test("guard.bash allows a redirect into the state log sink and falls through on a variable target (T-2.2)", (t) => {
  const { root } = hookProject(t);
  const allowed = bashOutput(root, `git status > ${stateRel("phase-1.log")} 2>&1`);
  assert.equal(allowed?.permissionDecision, "allow");
  assert.ok(allowed.permissionDecisionReason.includes(stateRel("")));
  assert.equal(bashOutput(root, `git status > ${stateRel("$NAME.log")} 2>&1`), null);
  assert.equal(bashOutput(root, "git status > elsewhere/phase-1.log 2>&1"), null);
});

test("guard.bash sinks test logs into the new state folder only (T-4.4)", (t) => {
  const { root } = hookProject(t);
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "git status --short" } }));
  assert.equal(stateRel("phase-1.log"), ".picket/state/phase-1.log");
  assert.equal(bashDecision(root, `npm test > ${stateRel("phase-1.log")} 2>&1`), "allow");
  assert.equal(bashDecision(root, `npm test > ${LEGACY.stateDir}/x.log`), null);
});

test("guard.bash lets git switch -c through to the prompt and keeps git checkout -b denied", (t) => {
  const { root } = hookProject(t);
  assert.equal(bashDecision(root, "git -C src/Api/.worktrees/feat-a switch -c feat-b feat-a"), null);
  assert.equal(bashDecision(root, "git -C src/Api/.worktrees/feat-a checkout -b feat-b"), "deny");
});

test("the spawned guard.bash allows a bare picket call chained with a read-only command and traces it", (t) => {
  const { root, id } = hookProject(t);
  assert.equal(bashDecision(root, `picket next ${id}; ls work`), "allow");
  const trace = traceRows(root);
  assert.ok(trace.some((row) => row.outcome === "allow" && String(row.command).includes(`picket next ${id}`)), JSON.stringify(trace.at(-1)));
});

test("the spawned guard.bash traces a picket drive --env value masked", (t) => {
  const { root } = hookProject(t);
  bashOutput(root, 'picket drive --run "node .picket/state/scratch/env-probe.mjs" --env PROBE=secret-probe-42');
  const log = readFileSync(statePath(root, STATE_FILES.guardLog), "utf8");
  assert.doesNotMatch(log, /secret-probe-42/);
  assert.match(log, /--env PROBE=\*\*\*/);
});

test("guard.bash is registered for Bash and PowerShell, and the spawned hook denies a destructive cmdlet with a PowerShell log row", (t) => {
  const hooks = JSON.parse(readFileSync(join(HOOK_BUNDLES, "hooks.json"), "utf8")).hooks;
  const guards = hooks.PreToolUse.filter((entry) => entry.hooks.some((hook) => hook.args.some((arg) => arg.endsWith("/hooks/guard.bash.mjs"))));
  assert.deepEqual(guards.map((entry) => entry.matcher), ["Bash|PowerShell"]);

  const { root } = hookProject(t);
  const out = run({ hook_event_name: "PreToolUse", tool_name: "PowerShell", tool_input: { command: "Remove-Item -Recurse -Force build" }, cwd: root }, root);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  const last = traceRows(root).at(-1);
  assert.equal(last.tool, "PowerShell");
  assert.equal(last.outcome, "deny");
});

test("the spawned guard.bash hook prints the ask for a marked push", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const home = withProject(t, { picket: false });
  const event = { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: ESCALATED_PUSH }, cwd: root, session_id: "s1", permission_mode: "default" };
  assert.equal(run(event, root, { HOME: home, USERPROFILE: home }).hookSpecificOutput.permissionDecision, "ask");
});

for (const [what, command] of [
  ["reading the files an assigned substitution lists", 'cd src && f=$(grep -rln "class X" --include=*.cs .); echo $f; cat -n $f'],
  ["a grep over the files a substitution lists", 'grep -rn "Headers" $(grep -rln "class AuthorizeApiKey" --include=*.cs . | grep -v /obj/) | head'],
  ["a stderr discard", "ls x 2>/dev/null"],
]) {
  test(`the spawned guard.bash hook allows ${what} and traces the allow`, (t) => {
    const root = withProject(t, { host: true, picket: false });
    assert.equal(run({ tool_input: { command } }, root).hookSpecificOutput.permissionDecision, "allow");
    assert.deepEqual(traceRows(root).map((r) => r.outcome), ["allow"]);
  });
}
