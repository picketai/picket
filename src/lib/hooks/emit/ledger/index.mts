import { existsSync, readFileSync } from "node:fs";
import { appendLedger, type TurnRow, type Usage } from "../../../shared/ledger.mts";
import { sessionCostPath } from "../../../shared/paths.mts";
import { agentName, agentTranscript, isSubagentTurn } from "../../../shared/transcript/agent.mts";
import { spawnHints, toolStats, type Hints, type ToolStats } from "../../../shared/transcript/entries.mts";
import { blockLines, readTurn, turnSpan, type TurnUsage } from "../../../shared/transcript/turn.mts";
import { findVerdict } from "../../../shared/verdicts.mjs";
import { readHeading } from "../../../shared/work/block.mts";
import { workId } from "../../../shared/work/files.mts";
import { readState, type Lane } from "../../../shared/work/state.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";

type StopEvent = "Stop" | "SubagentStop";

function laneOf(hints: Hints, id: string | null, root: string): Lane | null {
  if (hints.lane || !id) return (hints.lane as Lane | null) ?? null;
  try {
    return readState(root, workId(id)).lane ?? null;
  } catch {
    return null;
  }
}

function firstReviewableMs(stats: ToolStats): number | null {
  const reviewable = stats.first_work_write_ts ?? stats.first_write_ts ?? stats.last_ts;
  return stats.first_ts !== null && reviewable !== null ? reviewable - stats.first_ts : null;
}

function gateKind(text: string): TurnRow["gate_kind"] {
  if (/\[i\] confirm/.test(text)) return "irreversible";
  return /\[c\] continue/.test(text) ? "stall" : "approval";
}

function ledgerUsage(usage: TurnUsage | null): Usage | null {
  return usage ? { input_tokens: usage.input, cache_read_input_tokens: usage.cache_read, cache_creation_input_tokens: usage.cache_creation, output_tokens: usage.output } : null;
}

function sessionCost(root: string, session: string | undefined): number | null {
  const file = sessionCostPath(root, session);
  if (file === null) return null;
  try {
    const cost = JSON.parse(readFileSync(file, "utf8"))?.cost_usd;
    return Number.isFinite(cost) ? cost : null;
  } catch {
    return null;
  }
}

export function emitLedger(event: PayloadOf<StopEvent>, { root, now }: HookContext): null {
  const main = event.transcript_path;
  const path = agentTranscript(event);
  if (!path || !existsSync(path)) return null;
  const isSub = isSubagentTurn(event);
  const { text } = readTurn(event, { includeToolPayloads: true });
  const span = turnSpan(path);
  const stats = toolStats(path);
  const hints = spawnHints(main && existsSync(main) ? main : path);
  const heading = readHeading(text);
  const work_id = heading?.id ?? hints.work_id ?? null;
  const gate = !isSub && /\[a\] approve|\[c\] continue|\[i\] confirm/.test(text);
  appendLedger(root, {
    session: event.session_id ?? null,
    event: gate ? "gate" : isSub ? "subagent_stop" : "stop",
    agent: agentName(event, path),
    lane: laneOf(hints, work_id, root),
    work_id,
    phase: heading?.kind === "phase" ? heading.phase : (hints.phase ?? null),
    model: readTurn(event).model ?? null,
    duration_ms: span.durationMs ?? (stats.first_ts !== null && stats.last_ts !== null ? stats.last_ts - stats.first_ts : 0),
    verdict: findVerdict(blockLines(text).last) ?? null,
    gate_kind: gate ? gateKind(text) : null,
    tool_calls: stats.tool_calls,
    reads: stats.reads,
    rereads: stats.rereads,
    first_reviewable_ms: firstReviewableMs(stats),
    usage: ledgerUsage(span.usage),
    session_cost_usd: sessionCost(root, event.session_id),
  }, now());
  return null;
}

export const hook: HookSpec<StopEvent> = {
  handler: async (event, ctx) => emitLedger(event, ctx),
};
