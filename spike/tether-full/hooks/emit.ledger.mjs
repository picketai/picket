#!/usr/bin/env node
// Stop + SubagentStop: one v2 ledger row per turn (bench/schema/ledger-v2.schema.json). The free
// telemetry: who, how long, which verdict, how many tool calls and re-reads, tokens, first
// reviewable output. Never blocks, never fails loudly.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readTurn, turnSpan, toolStats, spawnHints, agentName, blockLines, isSubagentTurn, agentTranscript } from "./lib/transcript.mjs";
import { findVerdict } from "../lib/route.mjs";
import { projectRoot, listWork, readState } from "../lib/work.mjs";

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
try {
  // Every payload names the main session file; a subagent's turns live in its own transcript
  // (agent_transcript_path on SubagentStop). Stats and span come from the agent's file, spawn hints
  // (which agent was asked to do what) from the lead's.
  const main = data.transcript_path;
  const path = agentTranscript(data);
  if (!path || !existsSync(path)) process.exit(0);
  const isSub = isSubagentTurn(data);

  const root = projectRoot(data.cwd);
  const { text } = readTurn(data, { includeToolPayloads: true });
  const span = turnSpan(path);
  const stats = toolStats(path);
  const hints = spawnHints(main && existsSync(main) ? main : path);
  const verdict = findVerdict(blockLines(text).last);
  const heading = text.match(/^##\s+(Phase\s+(\d+)\s+of\s+([a-z0-9-]+)|Review:\s+([a-z0-9-]+)|(?:Order|Design|Amendment):\s+([a-z0-9-]+)|Report:\s+([a-z0-9-]+)|Expedited:\s+([a-z0-9-]+))/m);
  const work_id = heading?.[3] ?? heading?.[4] ?? heading?.[5] ?? heading?.[6] ?? heading?.[7] ?? hints.work_id ?? null;
  let lane = hints.lane;
  if (!lane && work_id) {
    try {
      lane = readState(work_id, root).lane;
    } catch {}
  }
  const gate = !isSub && /\[a\] approve|\[c\] continue|\[i\] confirm/.test(text);
  const firstReviewable = stats.first_ts !== null && (stats.first_work_write_ts ?? stats.first_write_ts ?? stats.last_ts) !== null ? (stats.first_work_write_ts ?? stats.first_write_ts ?? stats.last_ts) - stats.first_ts : null;

  const row = {
    v: 2,
    ts: new Date().toISOString(),
    session: data.session_id ?? "unknown",
    event: gate ? "gate" : isSub ? "subagent_stop" : "stop",
    agent: agentName(data, path),
    lane: lane ?? null,
    work_id,
    phase: heading?.[2] ? Number(heading[2]) : hints.phase ?? null,
    model: readTurn(data).model ?? null,
    // turnSpan reads a 512 KB tail; a long turn falls back to the whole transcript span
    duration_ms: span.durationMs ?? (stats.first_ts !== null && stats.last_ts !== null ? stats.last_ts - stats.first_ts : 0),
    verdict: verdict ?? null,
    gate_kind: gate ? (/\[i\] confirm/.test(text) ? "irreversible" : /\[c\] continue/.test(text) ? "stall" : "approval") : null,
    tool_calls: stats.tool_calls,
    reads: stats.reads,
    rereads: stats.rereads,
    bounces: 0,
    blocks: 0,
    first_reviewable_ms: firstReviewable,
    usage: span.usage ? { input_tokens: span.usage.input, cache_read_input_tokens: span.usage.cache_read, cache_creation_input_tokens: span.usage.cache_creation, output_tokens: span.usage.output } : null,
    cost_usd: null,
    lines_added: null,
  };
  const dir = join(root, ".claude", "ledger");
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, "ledger.jsonl"), JSON.stringify(row) + "\n");
} catch {}
process.exit(0);
