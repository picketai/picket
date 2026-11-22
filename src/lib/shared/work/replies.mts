import { appendJsonl, readJsonl, type JsonlRead } from "../../util/io.mts";
import type { NextAction } from "./action-text.mts";
import { workFile, type WorkId } from "./files.mts";

export type AmendmentChoice = "amend" | "fix";
export type TestChoice = "answers" | "accept";
export type ReplyChoice = AmendmentChoice | TestChoice | "redesign";
export type ReplyRow = { ts: string; session?: string; action: NextAction; phase: number | null; reply: string; fresh?: true; choice?: ReplyChoice; answers?: string; amend?: string; cases?: number; default_cases?: number };
export type ReplyEntry = Omit<ReplyRow, "ts">;

export const REJECT_REPLY = /^(?:x:?|reject:)\s+(\S.*)$/i;

export function appendReply(root: string, id: WorkId, entry: ReplyEntry, now: Date): void {
  appendJsonl(workFile(root, id, "replies.jsonl"), { ts: now.toISOString(), ...entry });
}

export function amendmentChoice(row: ReplyRow): AmendmentChoice | null {
  return row.choice === "amend" || row.choice === "fix" ? row.choice : null;
}

export function freshReplies(replies: readonly ReplyRow[]): ReplyRow[] {
  return replies.filter((row) => row.fresh === true);
}

export function rowsSinceLastReply<R extends { ts: string }>(rows: readonly R[], replies: readonly ReplyRow[]): R[] {
  const newest = replies.reduce<string | null>((latest, reply) => (latest === null || reply.ts > latest ? reply.ts : latest), null);
  return newest === null ? [...rows] : rows.filter((row) => row.ts > newest);
}

export function readReplies(root: string, id: WorkId): JsonlRead<ReplyRow> {
  return readJsonl<ReplyRow>(workFile(root, id, "replies.jsonl"));
}
