import { action, done } from "../../shared/action.mts";
import { notRunAsks } from "../../shared/escalation.mts";
import { readLedger, type EscalationRow, type LedgerRow, type TurnRow, type Usage } from "../../shared/ledger.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, type Args } from "../../util/args.mts";

export type CostInput = { session: string | undefined; workId: string | undefined };
export type LedgerScope = { session?: string | null; work_id?: string | null };
export type AgentSummary = { turns: number; duration_ms: number; cost_usd: number | null; bounces: number; blocks: number; tool_calls: number; rereads: number };
export type EscalationSummary = { asked: number; ran: number; not_run: number; denied: number; recent: EscalationRow[] };
export type CostSummary = {
  rows: number;
  sessions: number;
  work_items: number;
  cost_usd: number | null;
  usage: Usage;
  tokens_total: number;
  cache_hit_ratio: number | null;
  lines_added: number;
  tokens_per_accepted_line: number | null;
  stops: number;
  bounces: number;
  blocks: number;
  turns: number;
  first_reviewable_ms: number[];
  by_agent: Record<string, AgentSummary>;
  escalations: EscalationSummary;
};

const PERCENT = 100;
const TURN_EVENTS = new Set(["stop", "subagent_stop", "gate"]);
const RECENT_ESCALATIONS = 5;
const USAGE_KEYS = ["input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "output_tokens"] as const;

function isTurn(row: LedgerRow): row is TurnRow {
  return TURN_EVENTS.has(row.event);
}

function sumUsage(rows: TurnRow[]): Usage {
  const u: Usage = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 };
  for (const r of rows) for (const k of USAGE_KEYS) u[k] += r.usage?.[k] ?? 0;
  return u;
}

export function cacheHitRatio(u: Usage): number | null {
  const d = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens;
  return d ? u.cache_read_input_tokens / d : null;
}

function summarizeEscalations(rows: LedgerRow[]): EscalationSummary {
  const escalations = rows.filter((r): r is EscalationRow => r.event === "escalation");
  const count = (outcome: EscalationRow["outcome"]) => escalations.filter((r) => r.outcome === outcome).length;
  return {
    asked: count("ask"),
    ran: count("ran"),
    not_run: notRunAsks(escalations).length,
    denied: count("denied"),
    recent: escalations.slice(-RECENT_ESCALATIONS),
  };
}

export function rowCosts(rows: LedgerRow[]): (number | null)[] {
  const previous = new Map<string | null, number>();
  return rows.map((r) => {
    if (!isTurn(r) || !Number.isFinite(r.session_cost_usd)) return null;
    const spent = r.session_cost_usd as number;
    const before = previous.get(r.session);
    previous.set(r.session, spent);
    return before === undefined || spent < before ? spent : spent - before;
  });
}

function addKnown(sum: number | null, value: number | null | undefined): number | null {
  return value === null || value === undefined ? sum : (sum ?? 0) + value;
}

function emptyAgent(): AgentSummary {
  return { turns: 0, duration_ms: 0, cost_usd: null, bounces: 0, blocks: 0, tool_calls: 0, rereads: 0 };
}

export function summarizeLedger(rows: LedgerRow[], { session = null, work_id = null }: LedgerScope = {}): CostSummary {
  const costs = rowCosts(rows);
  const costOf = new Map(rows.map((r, i) => [r, costs[i]]));
  let scoped = rows;
  if (session) scoped = scoped.filter((r) => r.session === session);
  if (work_id) scoped = scoped.filter((r) => r.work_id === work_id);
  const rs = scoped.filter(isTurn);
  const usage = sumUsage(rs);
  const tokens = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens + usage.output_tokens;
  const lines = scoped.reduce((a, r) => (r.event === "accept" ? a + (r.lines_added ?? 0) : a), 0);
  const bounces = scoped.filter((r) => r.event === "bounce");
  const blocks = scoped.filter((r) => r.event === "block");
  const byAgent: Record<string, AgentSummary> = {};
  const agentEntry = (agent: string | null) => (byAgent[String(agent)] ??= emptyAgent());
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
  const ttfr = rs.map((r) => r.first_reviewable_ms).filter((x): x is number => Number.isFinite(x));
  return {
    rows: rs.length,
    sessions: new Set(rs.map((r) => r.session)).size,
    work_items: new Set(rs.map((r) => r.work_id).filter(Boolean)).size,
    cost_usd: rs.reduce<number | null>((sum, r) => addKnown(sum, costOf.get(r)), null),
    usage,
    tokens_total: tokens,
    cache_hit_ratio: cacheHitRatio(usage),
    lines_added: lines,
    tokens_per_accepted_line: lines ? tokens / lines : null,
    stops: rs.filter((r) => r.event === "gate").length,
    bounces: bounces.length,
    blocks: blocks.length,
    turns: rs.length,
    first_reviewable_ms: ttfr,
    by_agent: byAgent,
    escalations: summarizeEscalations(scoped),
  };
}

export const costSummary = action<CostInput, CostSummary>(async ({ session, workId }, { root }) => done(summarizeLedger(readLedger(root).rows, { session, work_id: workId })));

function parseCost(args: Args): CostInput {
  return { session: str(args, "session"), workId: str(args, "work") };
}

function renderCost(v: CostSummary): string {
  const dollars = v.cost_usd == null ? "-" : v.cost_usd.toFixed(2);
  const cache = v.cache_hit_ratio == null ? "-" : `${Math.round(v.cache_hit_ratio * PERCENT)}%`;
  const perLine = v.tokens_per_accepted_line == null ? "-" : Math.round(v.tokens_per_accepted_line);
  const { asked, ran, not_run, denied } = v.escalations;
  return `${v.rows} turns · $${dollars} · cache ${cache} · ${perLine} tok/line · stops ${v.stops} · bounces ${v.bounces} · escalations ${asked} asked, ${ran} ran, ${not_run} not run, ${denied} denied`;
}

export const verb: VerbSpec<CostInput, CostSummary> = {
  usage: "cost [--session <id>] [--work <id>]",
  output: "json",
  parse: parseCost,
  run: costSummary,
  render: renderCost,
};
