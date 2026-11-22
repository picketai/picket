import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CELLS, INTERACTIVE_DIR, RECORD, interactiveAnswers, parseConfirm, probeDirs, probeSettings, summarizeCell, withInteractive } from "../probe-ask.mjs";
import { answer, logLine, rewriteNonce } from "../lib/ask-probe-hook.mjs";
import { decide } from "../lib/approver-mcp.mjs";

test("the sweep picks earlier probe directories and spares the interactive project and other workspaces", () => {
  const trusted = {
    "C:/Users/u/AppData/Local/Temp/picket-ask-probe-Qz9Nxi": {},
    [INTERACTIVE_DIR.replaceAll("\\", "/")]: {},
    "D:/workspace/github/AISpec": {},
  };
  assert.deepEqual(probeDirs(trusted), ["C:/Users/u/AppData/Local/Temp/picket-ask-probe-Qz9Nxi"]);
  assert.deepEqual(probeDirs(undefined), []);
});

test("the probe covers ten cells: five modes asking, two with a saved rule, one failing command, one rewritten and one refused", () => {
  assert.equal(CELLS.length, 10);
  assert.deepEqual(CELLS.filter((c) => ["ask+update", "ask+refuse"].includes(c.scenario)).map((c) => c.mode), ["manual", "manual"]);
  assert.deepEqual(CELLS.filter((c) => c.scenario === "ask+rule").map((c) => c.mode), ["manual", "auto"]);
  assert.deepEqual(CELLS.filter((c) => c.scenario === "ask+fail").map((c) => c.mode), ["manual"]);
});

test("the probe hook is registered for Bash and PowerShell on every event it logs", () => {
  const settings = probeSettings("C:\\tmp\\hook-log.jsonl");
  for (const event of ["PreToolUse", "PostToolUse", "PostToolUseFailure"]) {
    assert.equal(settings.hooks[event].length, 1, event);
    assert.equal(settings.hooks[event][0].matcher, "Bash|PowerShell", event);
  }
});

test("the probe hook asks only on a PreToolUse for the sentinel and logs every event with its tool", () => {
  const pre = logLine({ hook_event_name: "PreToolUse", tool_name: "PowerShell", permission_mode: "auto", tool_use_id: "t1", tool_input: { command: "echo picket-probe-ok" } });
  assert.deepEqual(pre, { event: "PreToolUse", tool: "PowerShell", permission_mode: "auto", has_tool_use_id: true, command: "echo picket-probe-ok", transcript_path: null });
  assert.equal(answer(pre).hookSpecificOutput.updatedInput, undefined);
  assert.equal(answer(pre).hookSpecificOutput.permissionDecision, "ask");
  assert.equal(answer({ ...pre, event: "PostToolUse" }), null);
  assert.equal(answer({ ...pre, command: "ls" }), null);
  assert.deepEqual(logLine(null), { event: null, tool: null, permission_mode: null, has_tool_use_id: false, command: null, transcript_path: null });
});

test("a cell summary reads the mode, the prompt tool call and the post events from the logs", () => {
  const hookLines = [
    { event: "PreToolUse", permission_mode: "default", has_tool_use_id: true, command: "echo picket-probe-ok" },
    { event: "PostToolUse", permission_mode: "default", has_tool_use_id: true, command: "echo picket-probe-ok" },
  ];
  const run = { result: { subtype: "success" }, exitCode: 0, stderr: "" };
  const summary = summarizeCell({ mode: "manual", scenario: "ask" }, { hookLines, promptLines: [{ command: "echo picket-probe-ok" }], run });
  assert.deepEqual(summary, {
    mode: "manual",
    scenario: "ask",
    hook_permission_mode: "default",
    prompt_tool_called: true,
    command_ran: true,
    post_events: ["PostToolUse"],
    has_tool_use_id: true,
    error: null,
  });
});

test("a cell that never started records an error and empty observations", () => {
  const summary = summarizeCell({ mode: "auto", scenario: "ask" }, { hookLines: [], promptLines: [], run: { result: null, exitCode: 1, stderr: "bad flag" } });
  assert.equal(summary.command_ran, false);
  assert.equal(summary.has_tool_use_id, null);
  assert.match(summary.error, /no result event \(exit 1\): bad flag/);
});

const hookLine = (event, command, tool = "PowerShell") => ({ event, tool, permission_mode: "auto", has_tool_use_id: true, command });

test("--confirm reads the tool and the bang answer from the hook log and takes only the auto answer from the user", () => {
  const okLines = [hookLine("PreToolUse", "echo picket-probe-ok"), hookLine("PostToolUse", "echo picket-probe-ok")];
  assert.deepEqual(interactiveAnswers(okLines, ["auto=shown"]), { auto_dialog: "shown", bang_hooked: false, tool: "PowerShell" });
  const withBang = [...okLines, hookLine("PreToolUse", "echo picket-probe-bang", "Bash")];
  assert.deepEqual(interactiveAnswers(withBang, ["auto=silent"]), { auto_dialog: "silent", bang_hooked: true, tool: "PowerShell" });
  assert.throws(() => interactiveAnswers([hookLine("PostToolUse", "echo picket-probe-ok")], ["auto=shown"]), /picket-probe-ok/);
  assert.throws(() => parseConfirm(["bang=hooked"]), /only auto=/);
  assert.throws(() => parseConfirm(["auto=shown", "bang=hooked"]), /only auto=/);
  assert.throws(() => parseConfirm(["auto=maybe"]), /auto=shown or auto=silent/);
});

test("--confirm answers set the interactive block and leave the cells as they were", () => {
  const record = { claude_version: "2.1.301", cells: [{ mode: "manual" }], interactive: { auto_dialog: null, bang_hooked: null, tool: null } };
  const answers = { auto_dialog: "shown", bang_hooked: false, tool: "PowerShell" };
  const updated = withInteractive(record, answers);
  assert.deepEqual(updated.interactive, answers);
  assert.equal(updated.cells, record.cells);
});

const HEX_NONCE = /^[0-9a-f]{64}$/;
const UPDATE_INPUT = { hook_event_name: "PreToolUse", tool_name: "Bash", permission_mode: "default", tool_use_id: "t1", transcript_path: "/home/u/.claude/projects/p/s.jsonl", tool_input: { command: "echo picket-probe-update" } };

test("a PreToolUse for the update sentinel asks with the command rewritten to end in a fresh 64-hex nonce, and the log line holds it (T-2.1)", () => {
  const lines = [1, 2].map(() => logLine(UPDATE_INPUT, rewriteNonce(UPDATE_INPUT)));
  const commands = lines.map((line) => answer(line).hookSpecificOutput.updatedInput.command);
  for (const [i, line] of lines.entries()) {
    assert.match(line.nonce, HEX_NONCE);
    assert.equal(line.transcript_path, "/home/u/.claude/projects/p/s.jsonl");
    assert.equal(answer(line).hookSpecificOutput.permissionDecision, "ask");
    assert.equal(commands[i], `echo picket-probe-update ${line.nonce}`);
  }
  assert.notEqual(lines[0].nonce, lines[1].nonce);
});

test("the refusal sentinel is rewritten too, while other sentinels and post events get no nonce (T-2.1)", () => {
  const refuse = { ...UPDATE_INPUT, tool_input: { command: "echo picket-probe-refuse" } };
  assert.match(rewriteNonce(refuse), HEX_NONCE);
  assert.equal(rewriteNonce({ ...UPDATE_INPUT, tool_input: { command: "echo picket-probe-ok" } }), null);
  assert.equal(rewriteNonce({ ...UPDATE_INPUT, hook_event_name: "PostToolUse" }), null);
  assert.equal("nonce" in logLine({ ...UPDATE_INPUT, hook_event_name: "PostToolUse" }, "a".repeat(64)), false);
});

const NONCE = "ab".repeat(32);
const RUN = { result: { subtype: "success" }, exitCode: 0, stderr: "" };
const HOOK_LOG = "/tmp/picket-ask-probe-x/hook-log.jsonl";
const PROMPT_LOG = "/tmp/picket-ask-probe-x/prompt-log.jsonl";

function rewriteSummary(scenario, postCommand, files) {
  const command = scenario === "ask+update" ? "echo picket-probe-update" : "echo picket-probe-refuse";
  const hookLines = [
    { event: "PreToolUse", permission_mode: "default", has_tool_use_id: true, command, transcript_path: "/t/s.jsonl", nonce: NONCE },
    ...(postCommand === null ? [] : [{ event: "PostToolUse", permission_mode: "default", has_tool_use_id: true, command: postCommand, transcript_path: "/t/s.jsonl" }]),
  ];
  return summarizeCell({ mode: "manual", scenario }, { hookLines, promptLines: [{ command }], run: RUN, files, ownLogs: [HOOK_LOG, PROMPT_LOG] });
}

test("ran_updated is true only when a post event ran the command holding the PreToolUse nonce (T-2.2)", () => {
  assert.equal(rewriteSummary("ask+update", `echo picket-probe-update ${NONCE}`, []).ran_updated, true);
  assert.equal(rewriteSummary("ask+update", "echo picket-probe-update", []).ran_updated, false);
});

test("nonce_found lists the scanned files holding the nonce and leaves out the probe's own logs (T-2.2)", () => {
  const files = [
    { path: HOOK_LOG, text: `{"nonce":"${NONCE}"}` },
    { path: PROMPT_LOG, text: `{"command":"echo picket-probe-refuse ${NONCE}"}` },
    { path: "/t/s.jsonl", text: `denied: echo picket-probe-refuse ${NONCE}` },
    { path: "/tmp/picket-ask-probe-x/.claude/settings.json", text: "{}" },
  ];
  const summary = rewriteSummary("ask+refuse", null, files);
  assert.deepEqual(summary, {
    mode: "manual",
    scenario: "ask+refuse",
    hook_permission_mode: "default",
    prompt_tool_called: true,
    command_ran: false,
    post_events: [],
    has_tool_use_id: true,
    error: null,
    pre_count: 1,
    ran_updated: false,
    nonce_found: ["/t/s.jsonl"],
  });
});

test("nonce_found names a file under the home folder from ~ with forward slashes, whatever the machine", () => {
  const transcript = join(homedir(), ".claude", "projects", "p", "s.jsonl");
  const summary = rewriteSummary("ask+refuse", null, [{ path: transcript, text: NONCE }]);
  assert.deepEqual(summary.nonce_found, ["~/.claude/projects/p/s.jsonl"]);
});

test("pre_count counts every PreToolUse holding the sentinel, so a second hook call on the rewritten command shows", () => {
  const pre = (command) => ({ event: "PreToolUse", permission_mode: "default", has_tool_use_id: true, command, nonce: NONCE });
  const once = summarizeCell({ mode: "manual", scenario: "ask+update" }, { hookLines: [pre("echo picket-probe-update")], promptLines: [], run: RUN });
  const twice = summarizeCell({ mode: "manual", scenario: "ask+update" }, { hookLines: [pre("echo picket-probe-update"), pre(`echo picket-probe-update ${NONCE}`)], promptLines: [], run: RUN });
  assert.deepEqual([once.pre_count, twice.pre_count], [1, 2]);
});

test("the cells that do not rewrite the command keep their fields as before", () => {
  const hookLines = [{ event: "PreToolUse", permission_mode: "default", has_tool_use_id: true, command: "echo picket-probe-ok" }];
  const summary = summarizeCell({ mode: "manual", scenario: "ask" }, { hookLines, promptLines: [], run: RUN, files: [{ path: "/x", text: NONCE }] });
  assert.equal(["pre_count", "ran_updated", "nonce_found"].some((field) => field in summary), false);
});

test("the approver refuses the refusal sentinel and still allows the other probe commands (T-2.3)", () => {
  assert.equal(decide({ tool_name: "Bash", input: { command: `echo picket-probe-refuse ${NONCE}` } }).behavior, "deny");
  assert.deepEqual(decide({ tool_name: "Bash", input: { command: "echo picket-probe-ok" } }), { behavior: "allow", updatedInput: { command: "echo picket-probe-ok" } });
  assert.equal(decide({ tool_name: "Bash", input: { command: `echo picket-probe-update ${NONCE}` } }).behavior, "allow");
  assert.equal(decide({ tool_name: "Bash", input: { command: "sudo ls" } }).message, "bench approver: destructive command refused");
});

const REWRITE_SCENARIOS = ["ask+update", "ask+refuse"];
const SESSION_TRANSCRIPT = /^~\/\.claude\/projects\/[^/]+\/[^/]+\.jsonl$/;

function isSessionTranscript(path) {
  return SESSION_TRANSCRIPT.test(path);
}

function expectedCell({ mode, scenario }) {
  return {
    mode,
    scenario,
    hook_permission_mode: mode === "manual" ? "default" : mode,
    prompt_tool_called: true,
    command_ran: true,
    post_events: [scenario === "ask+fail" ? "PostToolUseFailure" : "PostToolUse"],
    has_tool_use_id: true,
    error: null,
  };
}

test("the committed record holds either an invalid interactive block or a confirmed one, beside the recorded cells", () => {
  const record = JSON.parse(readFileSync(RECORD, "utf8"));
  const { interactive } = record;
  if (interactive.invalid !== undefined) {
    assert.ok(typeof interactive.invalid === "string" && interactive.invalid.length > 0);
    assert.equal(interactive.auto_dialog, null);
    assert.equal(interactive.bang_hooked, null);
  } else {
    assert.ok(["Bash", "PowerShell"].includes(interactive.tool), `tool was ${interactive.tool}`);
  }
  const unchanged = CELLS.filter(({ scenario }) => !REWRITE_SCENARIOS.includes(scenario));
  assert.deepEqual(record.cells.filter(({ scenario }) => !REWRITE_SCENARIOS.includes(scenario)), unchanged.map(expectedCell));
});

test("the committed record shows the rewritten command ran once hooked and the refused one ran nowhere, its nonce only in the session transcript (T-2.4)", () => {
  const { cells } = JSON.parse(readFileSync(RECORD, "utf8"));
  const update = cells.find((cell) => cell.scenario === "ask+update");
  const refuse = cells.find((cell) => cell.scenario === "ask+refuse");
  assert.ok(update && refuse, "the record has no ask+update or ask+refuse cell; run node bench/probe-ask.mjs");
  assert.deepEqual([update.prompt_tool_called, update.command_ran, update.ran_updated, update.pre_count, update.error], [true, true, true, 1, null]);
  assert.deepEqual([refuse.prompt_tool_called, refuse.command_ran, refuse.post_events, refuse.error], [true, false, [], null]);
  assert.equal(refuse.nonce_found.length, 1, `nonce_found was ${JSON.stringify(refuse.nonce_found)}`);
  assert.ok(isSessionTranscript(refuse.nonce_found[0]), `${refuse.nonce_found[0]} is not a session transcript under ~/.claude/projects/`);
});
