import { action, done } from "../../shared/action.mts";
import { isTurn, readLedger, type DenialRow, type LedgerRow, type TurnRow } from "../../shared/ledger.mts";
import { readReplies, REJECT_REPLY, type ReplyRow } from "../../shared/work/replies.mts";
import { listWork } from "../../shared/work/state.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type DenialGroup = { event: DenialRow["event"]; hook: string; key: string; count: number; items: string[]; recurring: boolean; example: string };
export type Rejection = { work_id: string; phase: number | null; action: ReplyRow["action"]; ts: string; reason: string };
export type FailedToolGroup = { agent: string | null; tool: string; count: number; items: string[]; recurring: boolean };
export type PatternsReport = { rows: number; skipped: number; denials: DenialGroup[]; rejections: Rejection[]; failed_tools: FailedToolGroup[] };

const MIN_ITEMS = 2;
const QUOTED = /"[^"]*"|`[^`]*`/g;
const CLAUSE_END = /; |: |(?<!(?:^|[^A-Za-z])[A-Za-z])\. /;
const FILE_NAME = /^[\w.-]*\w\.[A-Za-z]\w*$/;
const WHOLE_NUMBER = /\b\d+\b/g;

function maskToken(token: string): string {
  if (token.includes("/") || FILE_NAME.test(token)) return "<path>";
  return token.replace(WHOLE_NUMBER, "<n>");
}

export function reasonKey(hook: string, reason: string): string {
  const prefix = `${hook}: `;
  const body = reason.startsWith(prefix) ? reason.slice(prefix.length) : reason;
  const clause = body.replace(QUOTED, "<q>").split(CLAUSE_END)[0];
  return clause.trim().split(/\s+/).map(maskToken).join(" ");
}

type Tally<G> = { group: G; count: number; items: Set<string> };

function tallyInto<G>(tallies: Map<string, Tally<G>>, key: string, make: () => G, count: number, workId: string | null): void {
  const tally = tallies.get(key) ?? { group: make(), count: 0, items: new Set<string>() };
  tally.count += count;
  if (workId) tally.items.add(workId);
  tallies.set(key, tally);
}

function finish<G>({ group, count, items }: Tally<G>): G & { count: number; items: string[]; recurring: boolean } {
  return { ...group, count, items: [...items].sort(), recurring: items.size >= MIN_ITEMS };
}

function isDenial(row: LedgerRow): row is DenialRow {
  return row.event === "block" || row.event === "bounce";
}

export function groupDenials(rows: readonly LedgerRow[]): DenialGroup[] {
  const tallies = new Map<string, Tally<Omit<DenialGroup, "count" | "items" | "recurring">>>();
  for (const row of rows.filter(isDenial)) {
    const key = reasonKey(row.hook, row.reason);
    tallyInto(tallies, JSON.stringify([row.event, row.hook, key]), () => ({ event: row.event, hook: row.hook, key, example: row.reason }), 1, row.work_id);
  }
  return [...tallies.values()].map(finish).sort((a, b) => b.count - a.count || a.hook.localeCompare(b.hook) || a.key.localeCompare(b.key));
}

function failedToolsOf(row: TurnRow): [string, number][] {
  return Object.entries(row.failed_tools ?? {});
}

export function groupFailedTools(rows: readonly LedgerRow[]): FailedToolGroup[] {
  const tallies = new Map<string, Tally<Pick<FailedToolGroup, "agent" | "tool">>>();
  for (const row of rows.filter(isTurn)) {
    for (const [tool, count] of failedToolsOf(row)) tallyInto(tallies, JSON.stringify([row.agent, tool]), () => ({ agent: row.agent, tool }), count, row.work_id);
  }
  return [...tallies.values()].map(finish).sort((a, b) => b.count - a.count || String(a.agent).localeCompare(String(b.agent)) || a.tool.localeCompare(b.tool));
}

function rejectionOf(workId: string, row: ReplyRow): Rejection | null {
  const reason = row.reply.trim().match(REJECT_REPLY)?.[1];
  return reason === undefined ? null : { work_id: workId, phase: row.phase, action: row.action, ts: row.ts, reason: reason.trim() };
}

export function readRejections(root: string): Rejection[] {
  const rejections = listWork(root).flatMap((id) => readReplies(root, id).rows.map((row) => rejectionOf(id, row)));
  return rejections.filter((r): r is Rejection => r !== null).sort((a, b) => a.ts.localeCompare(b.ts));
}

export const patternsReport = action<Record<string, never>, PatternsReport>(async (_input, { root }) => {
  const { rows, skipped } = readLedger(root);
  return done({ rows: rows.length, skipped, denials: groupDenials(rows), rejections: readRejections(root), failed_tools: groupFailedTools(rows) });
});

function recurringCount(groups: readonly { recurring: boolean }[]): number {
  return groups.filter((g) => g.recurring).length;
}

function itemsNote(group: { items: string[]; recurring: boolean }): string {
  const noun = group.items.length === 1 ? "item" : "items";
  return `${group.items.length} ${noun}${group.recurring ? ", recurring" : ""}`;
}

function renderDenials(groups: DenialGroup[]): string[] {
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  const lines = groups.map((g) => `  ${g.count}  ${g.event} ${g.hook}  ${g.key}  (${itemsNote(g)})`);
  return [`denials: ${total} rows in ${groups.length} groups, ${recurringCount(groups)} recurring`, ...lines];
}

function renderRejections(rejections: Rejection[]): string[] {
  const lines = rejections.map((r) => `  ${r.ts}  ${r.work_id} phase ${r.phase ?? "-"}  ${r.reason}`);
  return [`rejections: ${rejections.length}`, ...lines];
}

function renderFailedTools(groups: FailedToolGroup[]): string[] {
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  const lines = groups.map((g) => `  ${g.count}  ${g.agent ?? "-"} ${g.tool}  (${itemsNote(g)})`);
  return [`failed tool calls: ${total} in ${groups.length} groups, ${recurringCount(groups)} recurring`, ...lines];
}

function renderPatterns(report: PatternsReport): string {
  return [...renderDenials(report.denials), ...renderRejections(report.rejections), ...renderFailedTools(report.failed_tools)].join("\n");
}

export const verb: VerbSpec<Record<string, never>, PatternsReport> = {
  usage: "patterns",
  output: "json",
  parse: () => ({}),
  run: patternsReport,
  render: renderPatterns,
};
