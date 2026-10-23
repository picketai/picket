import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";
import { recordEscalation } from "../../dist/lib/shared/escalation.mjs";
import { assistantEntry as assistant, HOOK_BUNDLES, hookProject, ledgerRows, runHookBundle, toolUse as tool, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { openItem, withProject } from "#test/project.mts";

function run(name, payload, root, env) {
  const r = runHookBundle(name, payload, { root, env });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

const observe = (payload, root) => run("observe.drive", payload, root);

const MARKED_PUSH = 'PICKET_ESCALATE="you asked for the tag" git push origin v1';
const POWERSHELL_MARKED_PUSH = '$env:PICKET_ESCALATE = "you asked for the tag"; git push origin v1';

function driveLogRows(root) {
  const path = statePath(root, STATE_FILES.driveLog);
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").filter(Boolean) : [];
}

function asked(root, session) {
  recordEscalation(root, { session, outcome: "ask", command: "git push origin v1", reason: "you asked for the tag" }, new Date());
}

test("observe.drive counts a command as a kernel call only when a segment starts with picket", (t) => {
  const { root } = hookProject(t);
  const kind = (command) => {
    observe({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s10" }, root);
    return readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l)).at(-1).kind;
  };
  assert.equal(kind("cd ~/src/picket && npm start"), "drive");
  assert.equal(kind("picket next x"), "inspect");
  assert.equal(kind("cd repo && picket check"), "inspect");
  assert.equal(kind('API_KEY=k picket drive --hit "GET /h"'), "inspect");
  assert.equal(kind("node dist/bin/picket.mjs state x"), "inspect");
  assert.equal(kind('node "D:/My Projects/x/dist/bin/picket.mjs" next x'), "inspect");
  assert.equal(kind('"/c/Users/John Smith/.claude/plugins/picket/bin/picket" next x'), "inspect");
  assert.equal(kind("{ picket next x; }"), "inspect");
  assert.equal(kind('curl -s "http://127.0.0.1:8080/picket ok"'), "drive");
});

test("emit.ledger appends a v2 row and observe.drive tags commands with the open item", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([tool("Read", { file_path: "a" }), tool("Read", { file_path: "a" }), tool("Edit", { file_path: "src/a.ts" })]), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nok\n\nPHASE DONE` }])]);
  run("emit.ledger", { hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "developer" }, root);
  const rows = readFileSync(statePath(root, STATE_FILES.ledger), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].v, 2);
  assert.equal(rows[0].agent, "developer");
  assert.equal(rows[0].verdict, "PHASE DONE");
  assert.equal(rows[0].work_id, id);
  assert.equal(rows[0].rereads, 1);
  assert.equal(rows[0].usage.cache_read_input_tokens, 2000);

  observe({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl -s http://127.0.0.1:8080/health" }, cwd: root, session_id: "s1" }, root);
  const drives = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(drives[0].kind, "drive");
  assert.equal(drives[0].work_id, id);
  assert.equal(drives[0].phase, 1);
});

test("observe.drive tags a command with the most recently active open item, not the last id", (t) => {
  const root = withProject(t, { host: true, picket: false });
  openItem(root, { lane: "fast", title: "Older", id: "20261022-zeta-older" }, new Date("2026-10-22T08:00:00.000Z"));
  openItem(root, { lane: "fast", title: "Newer", id: "20261022-alpha-newer" }, new Date("2026-10-22T15:00:00.000Z"));
  observe({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl -s http://127.0.0.1:8080/health" }, cwd: root, session_id: "s1" }, root);
  const drives = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(drives[0].work_id, "20261022-alpha-newer");
});

test("observe.drive records a picket:developer as developer", (t) => {
  const { root } = hookProject(t);
  observe({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl -s http://127.0.0.1:8080/health" }, cwd: root, session_id: "s9", agent_type: "picket:developer" }, root);
  const drives = readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(drives.at(-1).agent, "developer");
});

test("observe.drive appends one ran escalation row for an asked marked command, and none for an unmarked or never asked one", (t) => {
  const { root } = hookProject(t);
  const post = (command, extra = {}) => observe({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s12", ...extra }, root);
  post("git status");
  post("PICKET_ESCALATE=x ls");
  post(MARKED_PUSH);
  assert.deepEqual(ledgerRows(root), []);
  asked(root, "s12");
  post(MARKED_PUSH, { agent_type: "picket:developer" });
  post(MARKED_PUSH);
  const rows = ledgerRows(root);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].event, "escalation");
  assert.equal(rows[1].outcome, "ran");
  assert.equal(rows[1].why, null);
  assert.equal(rows[1].command, "git push origin v1");
  assert.equal(rows[1].reason, "you asked for the tag");
  assert.equal(rows[1].agent, "developer");
  assert.equal(rows[1].session, "s12");
});

test("observe.drive is registered for PostToolUse and PostToolUseFailure on Bash and PowerShell", () => {
  const hooks = JSON.parse(readFileSync(join(HOOK_BUNDLES, "hooks.json"), "utf8")).hooks;
  for (const event of ["PostToolUse", "PostToolUseFailure"]) {
    const observers = hooks[event].filter((entry) => entry.hooks.some((hook) => hook.args.some((arg) => arg.endsWith("/hooks/observe.drive.mjs"))));
    assert.deepEqual(observers.map((entry) => entry.matcher), ["Bash|PowerShell"], event);
  }
});

test("a PowerShell escalation the guard asked for gets a ran row with the same key, and a failure gets ran failed with no drive-log row", (t) => {
  const { root } = hookProject(t);
  const home = withProject(t, { picket: false });
  const event = (hook_event_name, command, session_id) => ({ hook_event_name, tool_name: "PowerShell", tool_input: { command }, cwd: root, session_id, permission_mode: "default" });
  const guardOut = run("guard.bash", event("PreToolUse", POWERSHELL_MARKED_PUSH, "s20"), root, { HOME: home, USERPROFILE: home });
  assert.equal(guardOut.hookSpecificOutput.permissionDecision, "ask");
  observe(event("PostToolUse", POWERSHELL_MARKED_PUSH, "s20"), root);
  const [ask, ran] = ledgerRows(root);
  assert.deepEqual([ask.outcome, ran.outcome, ran.why], ["ask", "ran", null]);
  assert.equal(ran.key, ask.key);
  assert.equal(ran.reason, "you asked for the tag");

  const driveRowsBefore = driveLogRows(root).length;
  asked(root, "s21");
  observe(event("PostToolUseFailure", POWERSHELL_MARKED_PUSH, "s21"), root);
  assert.deepEqual(ledgerRows(root).slice(-2).map((r) => [r.outcome, r.why]), [["ask", null], ["ran", "failed"]]);
  assert.equal(driveLogRows(root).length, driveRowsBefore);

  observe(event("PostToolUse", "picket state x", "s22"), root);
  assert.equal(JSON.parse(driveLogRows(root).at(-1)).kind, "inspect");
});

test("observe.drive records a failed escalation as ran, with no drive-log row", (t) => {
  const { root } = hookProject(t);
  const fail = (command) => observe({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s13" }, root);
  fail("ls missing-dir");
  assert.deepEqual(ledgerRows(root), []);
  assert.deepEqual(driveLogRows(root), []);
  asked(root, "s13");
  fail(MARKED_PUSH);
  const rows = ledgerRows(root);
  assert.deepEqual(rows.map((r) => [r.outcome, r.why]), [["ask", null], ["ran", "failed"]]);
  assert.deepEqual(driveLogRows(root), []);
});

test("observe.drive logs --env values masked, quoted or not", (t) => {
  const { root } = hookProject(t);
  const logged = (command) => {
    observe({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command }, cwd: root, session_id: "s11" }, root);
    return readFileSync(statePath(root, STATE_FILES.driveLog), "utf8").trim().split("\n").map((l) => JSON.parse(l)).at(-1).command;
  };
  const plain = logged('picket drive --run "node .picket/state/scratch/env-probe.mjs" --env PROBE=secret-probe-42');
  assert.match(plain, /--env PROBE=\*\*\*/);
  assert.equal(plain.includes("secret-probe-42"), false);
  const quoted = logged(`picket drive --hit "GET /h" --env "A=two words" --env B="three more words" --env C='single quoted'`);
  assert.match(quoted, /--env A=\*\*\* --env B=\*\*\* --env C=\*\*\*/);
  assert.equal(/two words|three more|single quoted/.test(quoted), false);
});
