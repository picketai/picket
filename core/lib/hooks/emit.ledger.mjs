import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { readTurn, turnSpan, toolStats, spawnHints, agentName, blockLines, isSubagentTurn, agentTranscript } from "../transcript.mjs";
import { findVerdict } from "../route.mjs";
import { readState } from "../work.mjs";
import { stateDir, statePath, STATE_FILES } from "../paths.mjs";

const HEADING = /^##\s+(Phase\s+(\d+)\s+of\s+([a-z0-9-]+)|Review:\s+([a-z0-9-]+)|(?:Order|Design|Amendment):\s+([a-z0-9-]+)|Report:\s+([a-z0-9-]+)|Expedited:\s+([a-z0-9-]+))/m;

function laneOf(hints, workId, root) {
  if (hints.lane || !workId) return hints.lane ?? null;
  try {
    return readState(workId, root).lane ?? null;
  } catch {
    return null;
  }
}

function firstReviewableMs(stats) {
  const reviewable = stats.first_work_write_ts ?? stats.first_write_ts ?? stats.last_ts;
  return stats.first_ts !== null && reviewable !== null ? reviewable - stats.first_ts : null;
}

function gateKind(text) {
  if (/\[i\] confirm/.test(text)) return "irreversible";
  return /\[c\] continue/.test(text) ? "stall" : "approval";
}

function ledgerUsage(usage) {
  return usage ? { input_tokens: usage.input, cache_read_input_tokens: usage.cache_read, cache_creation_input_tokens: usage.cache_creation, output_tokens: usage.output } : null;
}

export function emitLedger(event, { root }) {
  const main = event.transcript_path;
  const path = agentTranscript(event);
  if (!path || !existsSync(path)) return null;
  const isSub = isSubagentTurn(event);
  const { text } = readTurn(event, { includeToolPayloads: true });
  const span = turnSpan(path);
  const stats = toolStats(path);
  const hints = spawnHints(main && existsSync(main) ? main : path);
  const heading = text.match(HEADING);
  const work_id = heading?.[3] ?? heading?.[4] ?? heading?.[5] ?? heading?.[6] ?? heading?.[7] ?? hints.work_id ?? null;
  const gate = !isSub && /\[a\] approve|\[c\] continue|\[i\] confirm/.test(text);
  const row = {
    v: 2,
    ts: new Date().toISOString(),
    session: event.session_id ?? "unknown",
    event: gate ? "gate" : isSub ? "subagent_stop" : "stop",
    agent: agentName(event, path),
    lane: laneOf(hints, work_id, root),
    work_id,
    phase: heading?.[2] ? Number(heading[2]) : hints.phase ?? null,
    model: readTurn(event).model ?? null,
    duration_ms: span.durationMs ?? (stats.first_ts !== null && stats.last_ts !== null ? stats.last_ts - stats.first_ts : 0),
    verdict: findVerdict(blockLines(text).last) ?? null,
    gate_kind: gate ? gateKind(text) : null,
    tool_calls: stats.tool_calls,
    reads: stats.reads,
    rereads: stats.rereads,
    bounces: 0,
    blocks: 0,
    first_reviewable_ms: firstReviewableMs(stats),
    usage: ledgerUsage(span.usage),
    cost_usd: null,
    lines_added: null,
  };
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.ledger), JSON.stringify(row) + "\n");
  return null;
}
