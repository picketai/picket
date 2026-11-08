import { appendJsonl, readJsonl, type JsonlRead } from "../util/io.mts";
import { productLinesAdded } from "./git.mts";
import { statePath, STATE_FILES } from "./paths.mts";
import type { Lane } from "./work/state.mts";

export type Usage = { input_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number; output_tokens: number };

export const USAGE_KEYS = ["input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "output_tokens"] as const;

type Common = { v: 2; ts: string; session: string | null; agent: string | null; work_id: string | null };

export type TurnRow = Common & {
  event: "stop" | "subagent_stop" | "gate";
  lane: Lane | null;
  phase: number | null;
  model: string | null;
  duration_ms: number;
  verdict: string | null;
  gate_kind: "approval" | "stall" | "irreversible" | null;
  tool_calls: number;
  reads: number;
  rereads: number;
  first_reviewable_ms: number | null;
  usage: Usage | null;
};
export type AcceptRow = Common & { event: "accept"; phase: number | null; commit: string; lines_added: number };
export type DenialRow = Common & { event: "block" | "bounce"; hook: string; reason: string };
export type EscalationRow = Common & { event: "escalation"; outcome: "ask" | "ran" | "denied"; why: string | null; key: string; command: string; reason: string | null };
export type RepeatRow = Common & { event: "repeat"; class: string; items: string[] };
export type LedgerRow = TurnRow | AcceptRow | DenialRow | EscalationRow | RepeatRow;

type Unstamped<T> = T extends LedgerRow ? Omit<T, "v" | "ts"> : never;
export type NewRow = Unstamped<LedgerRow>;

const VERSION = 2;

function ledgerPath(root: string): string {
  return statePath(root, STATE_FILES.ledger);
}

export function appendLedger(root: string, row: NewRow, now: Date): void {
  appendJsonl(ledgerPath(root), { v: VERSION, ts: now.toISOString(), ...row });
}

export function recordAccept(root: string, id: string, commit: string, phase: number | null, now: Date): void {
  try {
    appendLedger(root, { event: "accept", session: null, agent: null, work_id: id, phase, commit, lines_added: productLinesAdded(root, commit) }, now);
  } catch {}
}

export function turnTokens(row: TurnRow): number {
  return USAGE_KEYS.reduce((sum, key) => sum + (row.usage?.[key] ?? 0), 0);
}

export const TURN_EVENTS: ReadonlySet<LedgerRow["event"]> = new Set(["stop", "subagent_stop", "gate"]);

export function isTurn(row: LedgerRow): row is TurnRow {
  return TURN_EVENTS.has(row.event);
}

function isCurrent(row: unknown): row is LedgerRow {
  return (row as { v?: unknown } | null)?.v === VERSION;
}

export function readLedger(root: string): JsonlRead<LedgerRow> {
  const { rows, skipped } = readJsonl<unknown>(ledgerPath(root));
  return { rows: rows.filter(isCurrent), skipped };
}
