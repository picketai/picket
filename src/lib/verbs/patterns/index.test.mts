import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { patternsReport, reasonKey, type PatternsReport } from "./index.mts";
import { emitLedger } from "../../hooks/emit/ledger/index.mts";
import { appendLedger } from "../../shared/ledger.mts";
import { statePath, STATE_FILES } from "../../shared/paths.mts";
import { appendReply } from "../../shared/work/replies.mts";
import { workFile } from "../../shared/work/files.mts";
import { fixedContext, hookContext } from "#test/context.mts";
import { assistantEntry, assistantText, bouncedThenContinuedSteps, looseHandler, userEntry, writeTranscript } from "#test/hook.mts";
import { openItem, withProject } from "#test/project.mts";

const writeTurnRow = looseHandler(emitLedger);
const NOW = new Date("2026-11-22T10:00:00.000Z");

async function report(root: string): Promise<PatternsReport> {
  const outcome = await patternsReport({}, fixedContext(root));
  assert.equal(outcome.status, "done");
  return (outcome as { value: PatternsReport }).value;
}

function failedBashTurn(root: string, workId: string, name: string): void {
  const tp = writeTranscript(root, [
    userEntry(`work: ${workId}\nphase: 1`),
    assistantEntry([{ type: "tool_use", id: "b1", name: "Bash", input: { command: "false" } }]),
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "b1", is_error: true, content: "Exit code 1" }] } },
    assistantText("ok"),
  ], name);
  const event = { hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, agent_transcript_path: tp, agent_type: "picket:developer", cwd: root };
  writeTurnRow(event, hookContext(root));
}

test("the reason key masks paths, numbers and the clause after the first stop (T-2.1)", () => {
  assert.equal(
    reasonKey("guard.scope", "guard.scope: read ../../CONTRIBUTING.md with the Read tool before editing it; the file may have changed since you last saw it"),
    "read <path> with the Read tool before editing it",
  );
  assert.equal(
    reasonKey("guard.block", "guard.block: the commit subject is 74 characters; write <type>(<scope>): <subject> of at most 72 characters"),
    "the commit subject is <n> characters",
  );
  const code = (path: string) => reasonKey("guard.bash", `guard.bash: ${path} is code; a shell write skips guard.comments and guard.silenced.`);
  assert.equal(code("a/b/x.mts"), "<path> is code");
  assert.equal(code("c/y.mts"), code("a/b/x.mts"));
});

test("the reason key does not cut at a full stop after a one-letter segment (T-1.1)", () => {
  assert.equal(
    reasonKey("guard.bash", "guard.bash: command contains a destructive sub-command (e.g. rm, sudo, git push/reset). If the user asked for this action, run it alone"),
    "command contains a destructive sub-command (e.g. rm, sudo, git <path>",
  );
});

test("the reason key still cuts at a full stop after a word (T-1.2)", () => {
  assert.equal(reasonKey("guard.scope", "guard.scope: the file is missing. Read it first"), "the file is missing");
});

test("the reason key masks quoted spans before it cuts the clause", () => {
  assert.equal(reasonKey("guard.block", 'guard.block: "Red: none; feature" is none of <test> failed'), "<q> is none of <test> failed");
  assert.equal(reasonKey("guard.bash", "guard.bash: `picket uninstall` removes Picket. The developer leaves it"), "<q> removes Picket");
});

test("failed tool calls written by emitLedger group by agent and tool across work items (T-2.2)", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  failedBashTurn(root, "20261122-one", "one.jsonl");
  failedBashTurn(root, "20261122-two", "two.jsonl");
  appendLedger(root, { event: "stop", session: "s1", agent: "lead", work_id: "20261122-one", lane: null, phase: null, model: null, duration_ms: 0, verdict: null, gate_kind: null, tool_calls: 1, failed_tool_calls: 1, failed_tools: { Edit: 1 }, reads: 0, rereads: 0, first_reviewable_ms: null, usage: null }, NOW);
  const { failed_tools } = await report(root);
  assert.deepEqual(failed_tools, [
    { agent: "developer", tool: "Bash", count: 2, items: ["20261122-one", "20261122-two"], recurring: true },
    { agent: "lead", tool: "Edit", count: 1, items: ["20261122-one"], recurring: false },
  ]);
});

test("denials group by event, hook and key, recurring when two work items share a key", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const block = (work_id: string | null, reason: string) => appendLedger(root, { event: "block", session: "s1", agent: "developer", work_id, hook: "guard.bash", reason }, NOW);
  block("20261122-one", "guard.bash: a/b/x.mts is code; write it with Edit");
  block("20261122-two", "guard.bash: c/y.mts is code; write it with Edit");
  block(null, "guard.bash: probe.mts is code; write it with Edit");
  block("20261122-one", "guard.bash: command contains a destructive sub-command (e.g. rm)");
  const { denials, rows } = await report(root);
  assert.equal(rows, 4);
  assert.deepEqual(denials, [
    { event: "block", hook: "guard.bash", key: "<path> is code", count: 3, items: ["20261122-one", "20261122-two"], recurring: true, example: "guard.bash: a/b/x.mts is code; write it with Edit" },
    { event: "block", hook: "guard.bash", key: "command contains a destructive sub-command (e.g. rm)", count: 1, items: ["20261122-one"], recurring: false, example: "guard.bash: command contains a destructive sub-command (e.g. rm)" },
  ]);
});

test("rejections are the replies the reject form matches, with their reasons (T-2.3)", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Csv export" });
  const reply = (text: string, minute: number) => appendReply(root, id, { action: "approve_phase", phase: 1, reply: text }, new Date(Date.UTC(2026, 10, 22, 10, minute)));
  reply("x: shorten the subject", 1);
  reply("reject: wrong file", 2);
  reply("a", 3);
  reply("r 3", 4);
  const { rejections } = await report(root);
  assert.deepEqual(rejections, [
    { work_id: id, phase: 1, action: "approve_phase", ts: "2026-11-22T10:01:00.000Z", reason: "shorten the subject" },
    { work_id: id, phase: 1, action: "approve_phase", ts: "2026-11-22T10:02:00.000Z", reason: "wrong file" },
  ]);
});

test("the report changes neither the ledger nor any replies file (T-2.4)", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Csv export" });
  failedBashTurn(root, id, "one.jsonl");
  appendReply(root, id, { action: "approve_phase", phase: 1, reply: "x: no" }, NOW);
  const files = [statePath(root, STATE_FILES.ledger), workFile(root, id, "replies.jsonl")];
  const before = files.map((f) => readFileSync(f));
  await report(root);
  assert.deepEqual(files.map((f) => readFileSync(f)), before);
});

test("an empty project gives three empty sections", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const path = statePath(root, STATE_FILES.ledger);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "not json\n");
  assert.deepEqual(await report(root), { rows: 0, skipped: 1, denials: [], rejections: [], failed_tools: [] });
});

function bouncedThenContinuedTurn(root: string): void {
  const entries: Record<string, unknown>[] = [];
  for (const step of bouncedThenContinuedSteps()) {
    entries.push(...step);
    const tp = writeTranscript(root, entries);
    writeTurnRow({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, agent_transcript_path: tp, agent_type: "picket:developer", cwd: root }, hookContext(root));
  }
}

test("a failed call in a bounced and continued turn written by emitLedger counts once (T-3.3)", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  bouncedThenContinuedTurn(root);
  const { failed_tools } = await report(root);
  assert.deepEqual(failed_tools, [{ agent: "developer", tool: "Bash", count: 1, items: ["w1"], recurring: false }]);
});

test("the failed calls of two turn rows without a turn_id both count (T-3.4)", async (t) => {
  const root = withProject(t, { host: true, picket: false });
  const row = { event: "subagent_stop", session: "s1", agent: "developer", work_id: "w1", lane: null, phase: 1, model: null, duration_ms: 0, verdict: null, gate_kind: null, tool_calls: 1, failed_tool_calls: 1, failed_tools: { Bash: 1 }, reads: 0, rereads: 0, first_reviewable_ms: null, usage: null } as const;
  appendLedger(root, row, NOW);
  appendLedger(root, row, NOW);
  const { failed_tools } = await report(root);
  assert.deepEqual(failed_tools, [{ agent: "developer", tool: "Bash", count: 2, items: ["w1"], recurring: false }]);
});
