import { projectRoot } from "./shared/work/work.mjs";
import { notRunAsks } from "./shared/escalation.mjs";
import { readLedger } from "./shared/ledger.mjs";

function sumUsage(rows) {
  const u = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 };
  for (const r of rows) for (const k of Object.keys(u)) u[k] += r.usage?.[k] ?? 0;
  return u;
}

export function cacheHitRatio(u) {
  const d = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens;
  return d ? u.cache_read_input_tokens / d : null;
}

const TURN_EVENTS = new Set(["stop", "subagent_stop", "gate"]);
const RECENT_ESCALATIONS = 5;

function summarizeEscalations(rows) {
  const escalations = rows.filter((r) => r.event === "escalation");
  const count = (outcome) => escalations.filter((r) => r.outcome === outcome).length;
  return {
    asked: count("ask"),
    ran: count("ran"),
    not_run: notRunAsks(escalations).length,
    denied: count("denied"),
    recent: escalations.slice(-RECENT_ESCALATIONS),
  };
}

export function rowCosts(rows) {
  const previous = new Map();
  return rows.map((r) => {
    if (!TURN_EVENTS.has(r.event) || !Number.isFinite(r.session_cost_usd)) return null;
    const before = previous.get(r.session);
    previous.set(r.session, r.session_cost_usd);
    return before === undefined || r.session_cost_usd < before ? r.session_cost_usd : r.session_cost_usd - before;
  });
}

function addKnown(sum, value) {
  return value === null ? sum : (sum ?? 0) + value;
}

export function summarize(rows, { session = null, work_id = null } = {}) {
  const costs = rowCosts(rows);
  const costOf = new Map(rows.map((r, i) => [r, costs[i]]));
  let scoped = rows;
  if (session) scoped = scoped.filter((r) => r.session === session);
  if (work_id) scoped = scoped.filter((r) => r.work_id === work_id);
  const rs = scoped.filter((r) => TURN_EVENTS.has(r.event));
  const usage = sumUsage(rs);
  const tokens = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens + usage.output_tokens;
  const lines = scoped.filter((r) => r.event === "accept").reduce((a, r) => a + (r.lines_added ?? 0), 0);
  const bounces = scoped.filter((r) => r.event === "bounce");
  const blocks = scoped.filter((r) => r.event === "block");
  const byAgent = {};
  const agentEntry = (agent) => (byAgent[agent] ??= { turns: 0, duration_ms: 0, cost_usd: null, bounces: 0, blocks: 0, tool_calls: 0, rereads: 0 });
  for (const r of rs) {
    const a = agentEntry(r.agent);
    a.turns++;
    a.duration_ms += r.duration_ms ?? 0;
    a.cost_usd = addKnown(a.cost_usd, costOf.get(r));
    a.tool_calls += r.tool_calls ?? 0;
    a.rereads += r.rereads ?? 0;
  }
  for (const r of bounces) agentEntry(r.agent).bounces++;
  for (const r of blocks) agentEntry(r.agent).blocks++;
  const ttfr = rs.map((r) => r.first_reviewable_ms).filter((x) => Number.isFinite(x));
  return {
    rows: rs.length,
    sessions: new Set(rs.map((r) => r.session)).size,
    work_items: new Set(rs.map((r) => r.work_id).filter(Boolean)).size,
    cost_usd: rs.reduce((sum, r) => addKnown(sum, costOf.get(r)), null),
    usage,
    tokens_total: tokens,
    cache_hit_ratio: cacheHitRatio(usage),
    lines_added: lines,
    tokens_per_accepted_line: lines ? tokens / lines : null,
    stops: rs.filter((r) => r.event === "gate").length,
    bounces: bounces.length,
    blocks: blocks.length,
    turns: rs.length,
    first_reviewable_ms: ttfr.length ? ttfr : [],
    by_agent: byAgent,
    escalations: summarizeEscalations(scoped),
  };
}

export function cost(opts = {}) {
  const root = opts.root ?? projectRoot();
  return summarize(readLedger(root), opts);
}
