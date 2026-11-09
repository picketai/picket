import { compactTokens } from "../../shared/format.mts";
import { isTurn, turnTokens, type LedgerRow, type TurnRow } from "../../shared/ledger.mts";
import type { WorkState } from "../../shared/work/state.mts";

const SEPARATOR = " · ";
const UNKNOWN_AGENT = "unknown";

function tokensPart(turns: TurnRow[]): string {
  if (!turns.length) return "tokens none";
  const byAgent = new Map<string, number>();
  for (const turn of turns) {
    const agent = turn.agent ?? UNKNOWN_AGENT;
    byAgent.set(agent, (byAgent.get(agent) ?? 0) + turnTokens(turn));
  }
  const agents = [...byAgent].sort(([a], [b]) => a.localeCompare(b));
  return `tokens ${agents.map(([agent, tokens]) => `${agent} ${compactTokens(tokens)}`).join(", ")}`;
}

function countOf(rows: LedgerRow[], event: LedgerRow["event"]): number {
  return rows.filter((row) => row.event === event).length;
}

export function auditLine(state: WorkState, phases: number, rows: LedgerRow[]): string {
  const own = rows.filter((row) => row.work_id === state.id);
  return [state.lane, `phases ${phases}`, tokensPart(own.filter(isTurn)), `bounces ${countOf(own, "bounce")}`, `blocks ${countOf(own, "block")}`].join(SEPARATOR);
}
