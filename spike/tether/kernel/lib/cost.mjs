// Reads the v2 ledger (.claude/ledger/ledger.jsonl, appended by the emit.ledger hook) and answers
// the free telemetry questions: spend, cache ratio, tokens per accepted line, stops, bounces, by agent.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./work.mjs";

export function readLedger(root = projectRoot()) {
  const p = join(root, ".claude", "ledger", "ledger.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((r) => r && r.v === 2);
}

function sumUsage(rows) {
  const u = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 };
  for (const r of rows) for (const k of Object.keys(u)) u[k] += r.usage?.[k] ?? 0;
  return u;
}

export function cacheHitRatio(u) {
  const d = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens;
  return d ? u.cache_read_input_tokens / d : null;
}

export function summarize(rows, { session = null, work_id = null } = {}) {
  let rs = rows;
  if (session) rs = rs.filter((r) => r.session === session);
  if (work_id) rs = rs.filter((r) => r.work_id === work_id);
  const usage = sumUsage(rs);
  const tokens = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens + usage.output_tokens;
  const lines = rs.reduce((a, r) => a + (r.lines_added ?? 0), 0);
  const byAgent = {};
  for (const r of rs) {
    const a = (byAgent[r.agent] ??= { turns: 0, duration_ms: 0, cost_usd: 0, bounces: 0, blocks: 0, tool_calls: 0, rereads: 0 });
    a.turns++;
    a.duration_ms += r.duration_ms ?? 0;
    a.cost_usd += r.cost_usd ?? 0;
    a.bounces += r.bounces ?? 0;
    a.blocks += r.blocks ?? 0;
    a.tool_calls += r.tool_calls ?? 0;
    a.rereads += r.rereads ?? 0;
  }
  const ttfr = rs.map((r) => r.first_reviewable_ms).filter((x) => Number.isFinite(x));
  return {
    rows: rs.length,
    sessions: new Set(rs.map((r) => r.session)).size,
    work_items: new Set(rs.map((r) => r.work_id).filter(Boolean)).size,
    cost_usd: rs.reduce((a, r) => a + (r.cost_usd ?? 0), 0),
    usage,
    tokens_total: tokens,
    cache_hit_ratio: cacheHitRatio(usage),
    lines_added: lines,
    tokens_per_accepted_line: lines ? tokens / lines : null,
    stops: rs.filter((r) => r.event === "gate").length,
    bounces: rs.reduce((a, r) => a + (r.bounces ?? 0), 0),
    blocks: rs.reduce((a, r) => a + (r.blocks ?? 0), 0),
    turns: rs.length,
    first_reviewable_ms: ttfr.length ? ttfr : [],
    by_agent: byAgent,
  };
}

export function cost(opts = {}) {
  const root = opts.root ?? projectRoot();
  return summarize(readLedger(root), opts);
}
