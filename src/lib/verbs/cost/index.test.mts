import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLedger as summarize, verb } from "./index.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { readLedger, type AcceptRow, type DenialRow, type EscalationRow, type LedgerRow, type TurnRow, type Usage } from "../../shared/ledger.mts";
import { statePath, STATE_FILES } from "../../shared/paths.mts";
import { withProject } from "#test/project.mts";

type Row = Partial<TurnRow> | Partial<EscalationRow> | Partial<DenialRow> | Partial<AcceptRow>;

const usageOf = (input_tokens: number, cache_read_input_tokens = 0, cache_creation_input_tokens = 0, output_tokens = 0): Usage => ({ input_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens });
const stop = (session: string, agent: string, usage: Usage | null = null, work_id: string | null = "w1", phase: number | null = null): Partial<TurnRow> => ({ v: 2, session, event: "stop", agent, work_id, phase, duration_ms: 1000, usage, tool_calls: 3 });
const escalation = (session: string, outcome: EscalationRow["outcome"], key: string, extra: Partial<EscalationRow> = {}): Partial<EscalationRow> => ({ v: 2, session, event: "escalation", outcome, why: null, key, command: `git push origin ${key}`, reason: "you asked", agent: "developer", work_id: "w1", ...extra });

const ROWS = [stop("s1", "main", usageOf(5)), escalation("s1", "ask", "a"), escalation("s1", "ran", "a"), stop("s1", "developer", usageOf(7)), escalation("s1", "denied", "b", { why: "mode" })];

const summarizeRows = (rows: Row[], scope?: { work_id?: string }) => summarize(rows as LedgerRow[], scope);

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("cost reads --session and --work, and a bare --session is a usage error (T-4.2)", () => {
  assert.deepEqual(parse([]), { session: undefined, workId: undefined });
  assert.deepEqual(parse(["--session", "s-1", "--work", ID]), { session: "s-1", workId: ID });
  assert.throws(() => parse(["--session"]), (err) => err instanceof UsageError && err.message.includes("--session"));
});

test("an old v2 turn row carrying session_cost_usd is read and its usage counted in tokens_total (T-1.3)", (t) => {
  const root = withProject(t, { picket: false });
  const path = statePath(root, STATE_FILES.ledger);
  mkdirSync(dirname(path), { recursive: true });
  const old = { ...stop("s1", "developer", usageOf(1, 20, 300, 4000)), ts: "2026-10-18T07:00:00.000Z", session_cost_usd: 2.5 };
  writeFileSync(path, JSON.stringify(old) + "\n");
  const { rows } = readLedger(root);
  assert.deepEqual(rows, [old]);
  assert.equal(summarize(rows).tokens_total, 4321);
});

test("tokens add up per agent, per work item and per phase, a null phase under none (T-1.4)", () => {
  const rows = [
    stop("s1", "developer", usageOf(1, 2, 3, 4), "w1", 1),
    stop("s1", "reviewer", usageOf(10, 20, 30, 40), "w1", 1),
    stop("s1", "developer", usageOf(100, 0, 0, 100), "w1", 2),
    stop("s1", "reviewer", usageOf(1000), "w1", null),
    stop("s2", "developer", usageOf(5000, 0, 0, 5000), "w2", 1),
  ];
  const summary = summarizeRows(rows);
  assert.equal(summary.by_agent.developer.tokens, 10 + 200 + 10000);
  assert.equal(summary.by_agent.reviewer.tokens, 100 + 1000);
  assert.deepEqual(summary.by_work, {
    w1: { tokens: 1310, by_phase: { "1": 110, "2": 200, none: 1000 } },
    w2: { tokens: 10000, by_phase: { "1": 10000 } },
  });
  assert.equal(summary.tokens_total, 11310);
  assert.ok(!JSON.stringify(summary).includes("cost_usd"));
});

test("a turn without a work item is counted per agent but left out of by_work", () => {
  const summary = summarizeRows([stop("s1", "main", usageOf(9), null)]);
  assert.equal(summary.by_agent.main.tokens, 9);
  assert.deepEqual(summary.by_work, {});
});

test("blocks and bounces count their own rows, per agent too, inside the scope (T-2.5)", () => {
  const denial = (event: DenialRow["event"], agent: string, work_id = "w1"): Partial<DenialRow> => ({ v: 2, session: "s1", event, agent, hook: "guard.scope", work_id, reason: "r" });
  const rows = [stop("s1", "developer"), denial("block", "developer"), denial("block", "lead"), denial("bounce", "lead"), denial("block", "developer", "w2")];
  const summary = summarizeRows(rows, { work_id: "w1" });
  assert.deepEqual([summary.blocks, summary.bounces, summary.turns], [2, 1, 1]);
  assert.deepEqual(summary.by_agent.lead, { turns: 0, duration_ms: 0, tokens: 0, bounces: 1, blocks: 1, tool_calls: 0, rereads: 0 });
  assert.deepEqual([summary.by_agent.developer.blocks, summary.by_agent.developer.bounces], [1, 0]);
  const agents = Object.values(summary.by_agent);
  assert.equal(agents.reduce((n, a) => n + a.blocks, 0), summary.blocks);
  assert.equal(agents.reduce((n, a) => n + a.bounces, 0), summary.bounces);
});

test("lines come from the item's accept rows and divide its turn tokens (T-3.4)", () => {
  const turn = { ...stop("s1", "developer", usageOf(4000, 5000, 0, 1000)), lines_added: 999 };
  const accept = (lines_added: number, work_id = "w1"): Partial<AcceptRow> => ({ v: 2, event: "accept", session: null, agent: null, work_id, phase: 1, commit: "abc1234", lines_added });
  const summary = summarizeRows([turn, accept(40), accept(60), accept(500, "w2")], { work_id: "w1" });
  assert.equal(summary.lines_added, 100);
  assert.equal(summary.tokens_per_accepted_line, 100);
  assert.equal(summary.turns, 1);
});

test("turns count stop, subagent_stop and gate rows only, and escalations are summarized beside them", () => {
  const summary = summarizeRows(ROWS);
  assert.equal(summary.turns, 2);
  assert.equal(summary.rows, 2);
  assert.equal(summary.tokens_total, 12);
  assert.deepEqual({ main: summary.by_agent.main.tokens, developer: summary.by_agent.developer.tokens }, { main: 5, developer: 7 });
  assert.deepEqual(Object.keys(summary.by_agent).sort(), ["developer", "main"]);
  assert.deepEqual({ ...summary.escalations, recent: summary.escalations.recent.length }, { asked: 1, ran: 1, not_run: 0, denied: 1, recent: 3 });
});

test("an ask with no later ran row for its session and key counts as not run, and recent keeps the last five", () => {
  const rows = [escalation("s1", "ask", "a"), escalation("s2", "ran", "a"), escalation("s1", "ask", "b"), escalation("s1", "ran", "b"), ...[1, 2, 3].map((n) => escalation("s1", "denied", `d${n}`))];
  const { escalations } = summarizeRows(rows);
  assert.equal(escalations.asked, 2);
  assert.equal(escalations.not_run, 1);
  assert.deepEqual(escalations.recent.map((r) => r.key), ["b", "b", "d1", "d2", "d3"]);
});
