import { test } from "node:test";
import assert from "node:assert/strict";
import { compactTokens } from "../../shared/format.mts";
import type { DenialRow, LedgerRow, TurnRow, Usage } from "../../shared/ledger.mts";
import type { WorkId } from "../../shared/work/files.mts";
import type { WorkState } from "../../shared/work/state.mts";
import { auditLine } from "./audit.mts";

const STATE: WorkState = { id: "w1" as WorkId, lane: "design", title: "X", status: "open", created: "2026-11-08T09:00:00.000Z" };

const usage = (input_tokens: number, output_tokens: number): Usage => ({ input_tokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens });

function turn(agent: string | null, ts: string, tokens: Usage, work_id = "w1"): TurnRow {
  return { v: 2, ts, session: "s1", agent, work_id, event: "subagent_stop", lane: "design", phase: 1, model: null, duration_ms: 1000, verdict: null, gate_kind: null, tool_calls: 0, reads: 0, rereads: 0, first_reviewable_ms: null, usage: tokens };
}

function denial(event: DenialRow["event"], ts: string): DenialRow {
  return { v: 2, ts, session: "s1", agent: "developer", work_id: "w1", event, hook: "guard.block", reason: "r" };
}

test("the audit line sums each agent's tokens of this item only and counts its bounces and blocks (T-2.1)", () => {
  const rows: LedgerRow[] = [
    turn("developer", "2026-11-08T10:00:00.000Z", usage(1000, 500)),
    denial("bounce", "2026-11-08T10:10:00.000Z"),
    turn("reviewer", "2026-11-08T10:20:00.000Z", usage(300, 200)),
    denial("block", "2026-11-08T10:30:00.000Z"),
    turn("developer", "2026-11-08T11:00:00.000Z", usage(20000, 4000), "w2"),
    turn("developer", "2026-11-08T11:30:00.000Z", usage(2000, 0)),
  ];
  const expected = ["design", "phases 2", `tokens developer ${compactTokens(3500)}, reviewer ${compactTokens(500)}`, "bounces 1", "blocks 1"].join(" · ");
  assert.equal(auditLine(STATE, 2, rows), expected);
});

test("the audit line with no rows says tokens none and zero counts (T-2.2)", () => {
  assert.equal(auditLine(STATE, 0, []), "design · phases 0 · tokens none · bounces 0 · blocks 0");
});

test("a turn without an agent counts as unknown, sorted with the named agents", () => {
  const rows = [turn(null, "2026-11-08T10:00:00.000Z", usage(10, 0)), turn("analyst", "2026-11-08T10:05:00.000Z", usage(20, 0))];
  assert.equal(auditLine({ ...STATE, lane: "fast" }, 0, rows), `fast · phases 0 · tokens analyst 20, unknown 10 · bounces 0 · blocks 0`);
});
