import { action, done } from "../../shared/action.mts";
import { reviewSummary, reviewSummaryRange } from "../../shared/review-summary.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { str, UsageError, type Args } from "../../util/args.mts";

export type SummaryInput = { id: WorkId; base: string | undefined } | { range: { base: string; head: string } };
type Counts = { size: string; changed_files: string[]; lines_added: number; lines_removed: number; frameworks: string[]; concerns: string[]; security_path: boolean };
export type ItemSummary = Counts & { base: string; repos: unknown[] } & Record<string, unknown>;
export type RangeSummary = Counts & { base: string; head: string } & Record<string, unknown>;

type ForItem = (id: string, options: { root: string; base: string | undefined }) => ItemSummary;
type ForRange = (root: string, base: string, head: string) => RangeSummary;

const RANGE = /^(.+?)\.\.\.?(.+)$/;
const SHORT_SHA = 8;
const forItem = reviewSummary as unknown as ForItem;
const forRange = reviewSummaryRange as unknown as ForRange;

export const summarize = action<SummaryInput, ItemSummary | RangeSummary>(async (input, { root }) => {
  if ("range" in input) return done(forRange(root, input.range.base, input.range.head));
  return done(forItem(input.id, { root, base: input.base }));
});

function parseSummary(args: Args): SummaryInput {
  const range = str(args, "range");
  if (range !== undefined) {
    const m = range.match(RANGE);
    if (!m) throw new UsageError("--range needs <base>..<head>");
    return { range: { base: m[1], head: m[2] } };
  }
  const [id] = args.pos;
  if (!id) throw new UsageError("summary needs <id> or --range <base>..<head>");
  return { id: workId(id), base: str(args, "base") };
}

function counts(v: Counts): string {
  return `${v.size} · ${v.changed_files.length} file(s), +${v.lines_added}/-${v.lines_removed} · frameworks ${v.frameworks.join(",") || "-"} · concerns ${v.concerns.join(",") || "-"} · security ${v.security_path ? "yes" : "no"}`;
}

function isRange(v: ItemSummary | RangeSummary): v is RangeSummary {
  return "head" in v;
}

function renderSummary(v: ItemSummary | RangeSummary): string {
  if (isRange(v)) return `${counts(v)} · ${v.base.slice(0, SHORT_SHA)}..${v.head.slice(0, SHORT_SHA)}`;
  return `${counts(v)} · base ${v.base.slice(0, SHORT_SHA)} · repos ${v.repos.length}`;
}

export const verb: VerbSpec<SummaryInput, ItemSummary | RangeSummary> = {
  usage: "summary <id> [--base <ref>] | summary --range <base>..<head>",
  output: "json",
  parse: parseSummary,
  run: summarize,
  render: renderSummary,
};
