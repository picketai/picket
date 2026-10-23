import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { observeDrive as driveHandler } from "../../observe/drive/index.mts";
import { hookContext } from "#test/context.mts";
import { gitIn } from "#test/git.mts";
import { guardOutput, ledgerRows, looseHandler, type DecisionOptions, type GuardOutput } from "#test/hook.mts";
import { withProject, writeConfig } from "#test/project.mts";

const observeDrive = looseHandler(driveHandler);

const PUSH = "git push origin v1.0.0-alpha.2";
const ESCALATED_PUSH = `PICKET_ESCALATE="you asked me to push the release tag" ${PUSH}`;
const POWERSHELL_ESCALATED_PUSH = `$env:PICKET_ESCALATE = "you asked me to push the release tag"; ${PUSH}`;

type JudgeOptions = Omit<DecisionOptions, "root">;

function escalationProject(t: TestContext) {
  const root = withProject(t, { host: true, picket: false });
  const home = withProject(t, { picket: false });
  const judge = (command: string, extra: JudgeOptions = {}): GuardOutput | null => guardOutput(command, { root, home, tool: "Bash", session: "s1", mode: "default", ...extra });
  const mustJudge = (command: string, extra: JudgeOptions = {}): GuardOutput => {
    const out = judge(command, extra);
    assert.ok(out, command);
    return out;
  };
  const escalationRows = () => ledgerRows(root).filter((r) => r.event === "escalation");
  return { root, judge, mustJudge, escalationRows };
}

test("a marked push asks in default, acceptEdits and auto only, and denies for the mode everywhere else", (t) => {
  const { mustJudge, escalationRows } = escalationProject(t);
  for (const mode of ["default", "acceptEdits", "auto"]) {
    assert.equal(mustJudge(ESCALATED_PUSH, { mode, session: `asks-${mode}` }).permissionDecision, "ask", mode);
  }
  for (const mode of [undefined, "plan", "bypassPermissions", "dontAsk"]) {
    const out = mustJudge(ESCALATED_PUSH, { mode, session: `denies-${mode}` });
    assert.equal(out.permissionDecision, "deny", String(mode));
    assert.ok(out.permissionDecisionReason.endsWith(`! ${PUSH}`), out.permissionDecisionReason);
  }
  assert.deepEqual(escalationRows().map((r) => r.why), [null, null, null, "mode", "mode", "mode", "mode"]);
});

test("a marked destructive command asks in a proven mode, quoting the reason, and never allows", (t) => {
  const { judge, mustJudge, escalationRows } = escalationProject(t);
  const asked = mustJudge(ESCALATED_PUSH, { agent: "picket:developer" });
  assert.equal(asked.permissionDecision, "ask");
  assert.match(asked.permissionDecisionReason, /escalation by developer: "you asked me to push the release tag"\. Approving runs this one command once; nothing carries over\./);
  assert.match(mustJudge(ESCALATED_PUSH, { session: "s2" }).permissionDecisionReason, /escalation by main:/);
  for (const mode of [undefined, "auto", "plan", "default", "acceptEdits", "bypassPermissions", "dontAsk"]) {
    for (const command of [ESCALATED_PUSH, "PICKET_ESCALATE=x ls", "PICKET_ESCALATE=x git status"]) {
      assert.notEqual(judge(command, { mode, session: `mode-${mode}` })?.permissionDecision, "allow", `${mode} ${command}`);
    }
  }
  const [first] = escalationRows();
  assert.equal(first.outcome, "ask");
  assert.equal(first.why, null);
  assert.equal(first.command, PUSH);
  assert.equal(first.reason, "you asked me to push the release tag");
  assert.equal(first.agent, "developer");
  assert.equal(first.session, "s1");
  assert.match(first.key, /^[0-9a-f]{64}$/);
});

test("a marked push in an absent or unlisted permission mode denies with the mode and the user's own route", (t) => {
  const { mustJudge, escalationRows } = escalationProject(t);
  for (const mode of [undefined, "plan", "bypassPermissions", "dontAsk"]) {
    const out = mustJudge(ESCALATED_PUSH, { mode });
    assert.equal(out.permissionDecision, "deny");
    assert.match(out.permissionDecisionReason, new RegExp(`permission mode ${mode ?? "unknown"}`));
    assert.ok(out.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`), out.permissionDecisionReason);
  }
  assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why]), [["denied", "mode"], ["denied", "mode"], ["denied", "mode"], ["denied", "mode"]]);
});

test("a marker that is not one command alone with a literal reason denies with the shape cause", (t) => {
  const { judge, mustJudge, escalationRows } = escalationProject(t);
  const shapes = [
    "PICKET_ESCALATE=x git push && ls",
    "FOO=1 PICKET_ESCALATE=x git push",
    'PICKET_ESCALATE="$HOME" git push',
    "PICKET_ESCALATE= git push",
    "PICKET_ESCALATE=x; git push",
    "PICKET_ESCALATE=x git push > out.txt",
    "PICKET_ESCALATE=\"`whoami`\" git push",
    `PICKET_ESCALATE="${"y".repeat(201)}" git push`,
  ];
  for (const command of shapes) {
    const out = mustJudge(command);
    assert.equal(out.permissionDecision, "deny", command);
    assert.match(out.permissionDecisionReason, /escalate one command, alone/, command);
    assert.match(out.permissionDecisionReason, /run it yourself: ! /, command);
  }
  assert.equal(escalationRows().length, shapes.length);
  assert.ok(escalationRows().every((r) => r.outcome === "denied" && r.why === "shape"));
  for (const [index, command] of [`PICKET_ESCALATE='it'"'"'s the tag' git push`, 'PICKET_ESCALATE="say \\"go\\"" git push'].entries()) {
    assert.equal(judge(command, { session: `quotes-${index}` })?.permissionDecision, "ask", command);
  }
  assert.equal(escalationRows().at(-1)?.reason, 'say "go"');
});

test("a marker on a command that does not deny falls through and records nothing; an unmarked command records nothing", (t) => {
  const { judge, mustJudge, escalationRows } = escalationProject(t);
  assert.equal(judge("PICKET_ESCALATE=x ls"), null);
  assert.equal(mustJudge(PUSH).permissionDecision, "deny");
  assert.match(mustJudge(PUSH).permissionDecisionReason, /run it alone as `PICKET_ESCALATE="<why>" <command>`/);
  assert.match(mustJudge(PUSH).permissionDecisionReason, /never escalated: record it with `picket leave <id> --command "<command>"`/);
  assert.notEqual(judge('picket leave x --command "git push origin v1"')?.permissionDecision, "deny");
  assert.equal(mustJudge("ls").permissionDecision, "allow");
  assert.deepEqual(escalationRows(), []);
});

test("the marker never reaches the source deny or the wrapped picket verb deny", (t) => {
  const { root, judge, mustJudge, escalationRows } = escalationProject(t);
  const source = join(root, "analysis");
  gitIn(root, "init", "-q", source);
  writeConfig(root, { version: 1, sources: { analysis: { env: "PICKET_TEST_SOURCE_ANALYSIS" } } });
  process.env.PICKET_TEST_SOURCE_ANALYSIS = source;
  try {
    const inSource = mustJudge(`PICKET_ESCALATE=x git -C "${source.replaceAll("\\", "/")}" push`);
    assert.equal(inSource.permissionDecision, "deny");
    assert.match(inSource.permissionDecisionReason, /inside source analysis, which is read-only/);
    const wrapped = mustJudge('PICKET_ESCALATE=x picket drive --run "rm -rf src"');
    assert.equal(wrapped.permissionDecision, "deny");
    assert.match(wrapped.permissionDecisionReason, /the command wrapped in a picket verb/);
    assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why, r.reason]), [["denied", "source", "x"], ["denied", "wrapped_verb", "x"]]);
    judge(`git -C "${source.replaceAll("\\", "/")}" push`);
    assert.equal(escalationRows().length, 2);
  } finally {
    delete process.env.PICKET_TEST_SOURCE_ANALYSIS;
  }
});

test("a saved allow rule that could approve the marked command turns the escalation into a deny naming the rule and its file", (t) => {
  for (const rule of ["Bash(*)", "Bash(PICKET_ESCALATE=*)"]) {
    const { root, mustJudge, escalationRows } = escalationProject(t);
    mkdirSync(join(root, ".claude"), { recursive: true });
    const file = join(root, ".claude", "settings.local.json");
    writeFileSync(file, JSON.stringify({ permissions: { allow: [rule] } }));
    const out = mustJudge(ESCALATED_PUSH);
    assert.equal(out.permissionDecision, "deny", rule);
    assert.ok(out.permissionDecisionReason.includes(`${rule} in ${file}`), out.permissionDecisionReason);
    assert.ok(out.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`));
    assert.deepEqual(escalationRows().map((r) => r.why), ["saved_rule"]);
  }
});

test("an ask that never ran is not asked again in its session; one that ran gets a fresh ask; another session starts clean", (t) => {
  const { root, mustJudge, escalationRows } = escalationProject(t);
  const ran = (command: string) => observeDrive({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, session_id: "s1" }, hookContext(root));
  assert.equal(mustJudge(ESCALATED_PUSH).permissionDecision, "ask");
  const refused = mustJudge(`PICKET_ESCALATE="a better reason this time" ${PUSH}`);
  assert.equal(refused.permissionDecision, "deny");
  assert.match(refused.permissionDecisionReason, /did not run \(refused, interrupted or failed\)/);
  assert.ok(refused.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`));
  assert.equal(mustJudge(ESCALATED_PUSH, { session: "s2" }).permissionDecision, "ask");
  assert.equal(mustJudge("PICKET_ESCALATE=x git push origin other-tag").permissionDecision, "ask");

  const fresh = escalationProject(t);
  assert.equal(fresh.mustJudge(ESCALATED_PUSH).permissionDecision, "ask");
  observeDrive({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: ESCALATED_PUSH }, session_id: "s1" }, hookContext(fresh.root));
  assert.equal(fresh.mustJudge(`PICKET_ESCALATE="push it again" ${PUSH}`).permissionDecision, "ask");
  assert.deepEqual(fresh.escalationRows().map((r) => r.outcome), ["ask", "ran", "ask"]);

  ran("ls");
  assert.deepEqual(escalationRows().map((r) => [r.session, r.outcome, r.why]), [["s1", "ask", null], ["s1", "denied", "refused_before"], ["s2", "ask", null], ["s1", "ask", null]]);
});

test("a PowerShell-marked push asks in default, acceptEdits and auto, denies for the mode in bypassPermissions, and is not asked twice when it never ran", (t) => {
  const { mustJudge, escalationRows } = escalationProject(t);
  const powerShell = (command: string, extra: JudgeOptions = {}) => mustJudge(command, { tool: "PowerShell", ...extra });
  for (const mode of ["default", "acceptEdits", "auto"]) {
    assert.equal(powerShell(POWERSHELL_ESCALATED_PUSH, { mode, session: `ps-${mode}` }).permissionDecision, "ask", mode);
  }
  const bypass = powerShell(POWERSHELL_ESCALATED_PUSH, { mode: "bypassPermissions", session: "ps-bypassPermissions" });
  assert.equal(bypass.permissionDecision, "deny");
  assert.ok(bypass.permissionDecisionReason.endsWith(`run it yourself: ! ${PUSH}`), bypass.permissionDecisionReason);
  assert.equal(powerShell(POWERSHELL_ESCALATED_PUSH, { session: "ps-default" }).permissionDecision, "deny");
  assert.deepEqual(escalationRows().map((r) => [r.outcome, r.why]), [["ask", null], ["ask", null], ["ask", null], ["denied", "mode"], ["denied", "refused_before"]]);
  assert.equal(escalationRows()[0].command, PUSH);
});

test("a PowerShell marker that is not first or stands before two commands denies on shape", (t) => {
  const { mustJudge, escalationRows } = escalationProject(t);
  for (const command of [`git status; $env:PICKET_ESCALATE = "x"; ${PUSH}`, `$env:PICKET_ESCALATE = "x"; git status; ${PUSH}`, `$env:PICKET_ESCALATE = "x"; ${PUSH} > out.txt`]) {
    const out = mustJudge(command, { tool: "PowerShell" });
    assert.equal(out.permissionDecision, "deny", command);
    assert.match(out.permissionDecisionReason, /escalate one command, alone/, command);
  }
  assert.ok(escalationRows().every((r) => r.why === "shape"));
});

test("a saved PowerShell rule that could approve the escalation turns it into a deny, and a Bash rule does not", (t) => {
  const { root, mustJudge } = escalationProject(t);
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ permissions: { allow: ["Bash(git *)", "PowerShell(picket *)"] } }));
  assert.equal(mustJudge(POWERSHELL_ESCALATED_PUSH, { tool: "PowerShell" }).permissionDecision, "ask");
  writeFileSync(join(root, ".claude", "settings.local.json"), JSON.stringify({ permissions: { allow: ["PowerShell(git *)"] } }));
  const out = mustJudge(POWERSHELL_ESCALATED_PUSH, { tool: "PowerShell", session: "s2" });
  assert.equal(out.permissionDecision, "deny");
  assert.match(out.permissionDecisionReason, /saved allow rule PowerShell\(git \*\)/);
});

test("the PowerShell deny names the PowerShell marker form and the Bash deny keeps its text", (t) => {
  const { mustJudge } = escalationProject(t);
  assert.match(mustJudge(PUSH, { tool: "PowerShell" }).permissionDecisionReason, /\$env:PICKET_ESCALATE = "<why>"; <command>/);
  assert.equal(
    mustJudge(PUSH).permissionDecisionReason,
    'guard.bash: command contains a destructive sub-command (e.g. rm, sudo, git push/reset/rebase/checkout/merge/clean). If the user asked for this action in this session or the work cannot continue without it, run it alone as `PICKET_ESCALATE="<why>" <command>` and the user decides in the dialog. Cleanup after the work is never escalated: record it with `picket leave <id> --command "<command>"` and it is listed when the item closes.',
  );
});
