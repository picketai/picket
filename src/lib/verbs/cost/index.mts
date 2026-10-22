import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, type Args } from "../../util/args.mts";
import { cost } from "./cost.mjs";

export type CostInput = { session: string | undefined; workId: string | undefined };
export type CostSummary = {
  rows: number;
  cost_usd: number | null;
  cache_hit_ratio: number | null;
  tokens_per_accepted_line: number | null;
  stops: number;
  bounces: number;
  escalations: { asked: number; ran: number; not_run: number; denied: number };
};

const PERCENT = 100;

export const costSummary = action<CostInput, CostSummary>(async ({ session, workId }, { root }) => done(cost({ root, session, work_id: workId }) as CostSummary));

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
