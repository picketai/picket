import type { Attention } from "../views.mts";
import type { NextStep } from "./next-step.mts";
import { isSessionId, type Status, type WorkState } from "./state.mts";
import type { VerdictRow } from "./verdict-log.mts";

const CLOSED_STATUSES: readonly Status[] = ["done", "abandoned"];

export function attentionOf(status: Status, actor: NextStep["actor"], isLive: boolean): Attention {
  if (CLOSED_STATUSES.includes(status)) return "closed";
  if (actor === "user") return "needs-you";
  return isLive ? "working" : "open";
}

export function sessionsOf(state: WorkState, verdicts: readonly VerdictRow[]): string[] {
  const seen = new Set(verdicts.map((row) => row.session).filter(isSessionId));
  if (!isSessionId(state.session)) return [...seen];
  seen.delete(state.session);
  return [...seen, state.session];
}
