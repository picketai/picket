import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CELLS, INTERACTIVE_DIR, RECORD, interactiveAnswers, parseConfirm, probeDirs, probeSettings, summarizeCell, withInteractive } from "../probe-ask.mjs";
import { answer, logLine } from "../lib/ask-probe-hook.mjs";

test("the sweep picks earlier probe directories and spares the interactive project and other workspaces", () => {
  const trusted = {
    "C:/Users/u/AppData/Local/Temp/picket-ask-probe-Qz9Nxi": {},
    [INTERACTIVE_DIR.replaceAll("\\", "/")]: {},
    "D:/workspace/github/AISpec": {},
  };
  assert.deepEqual(probeDirs(trusted), ["C:/Users/u/AppData/Local/Temp/picket-ask-probe-Qz9Nxi"]);
  assert.deepEqual(probeDirs(undefined), []);
});

test("the probe covers eight cells: five modes asking, two with a saved rule, one failing command", () => {
  assert.equal(CELLS.length, 8);
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
  assert.deepEqual(pre, { event: "PreToolUse", tool: "PowerShell", permission_mode: "auto", has_tool_use_id: true, command: "echo picket-probe-ok" });
  assert.equal(answer(pre).hookSpecificOutput.permissionDecision, "ask");
  assert.equal(answer({ ...pre, event: "PostToolUse" }), null);
  assert.equal(answer({ ...pre, command: "ls" }), null);
  assert.deepEqual(logLine(null), { event: null, tool: null, permission_mode: null, has_tool_use_id: false, command: null });
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

test("the committed record holds either an invalid interactive block or a confirmed one, beside the eight recorded cells", () => {
  const record = JSON.parse(readFileSync(RECORD, "utf8"));
  const { interactive } = record;
  if (interactive.invalid !== undefined) {
    assert.ok(typeof interactive.invalid === "string" && interactive.invalid.length > 0);
    assert.equal(interactive.auto_dialog, null);
    assert.equal(interactive.bang_hooked, null);
  } else {
    assert.ok(["Bash", "PowerShell"].includes(interactive.tool), `tool was ${interactive.tool}`);
  }
  const expectedCells = CELLS.map(({ mode, scenario }) => ({
    mode,
    scenario,
    hook_permission_mode: mode === "manual" ? "default" : mode,
    prompt_tool_called: true,
    command_ran: true,
    post_events: [scenario === "ask+fail" ? "PostToolUseFailure" : "PostToolUse"],
    has_tool_use_id: true,
    error: null,
  }));
  assert.deepEqual(record.cells, expectedCells);
});
