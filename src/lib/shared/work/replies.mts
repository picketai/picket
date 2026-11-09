import { appendJsonl, readJsonl, type JsonlRead } from "../../util/io.mts";
import type { NextAction } from "./action-text.mts";
import { workFile, type WorkId } from "./files.mts";

export type AmendmentChoice = "amend" | "fix";
export type ReplyRow = { ts: string; session?: string; action: NextAction; phase: number | null; reply: string; fresh?: true; choice?: AmendmentChoice };
export type ReplyEntry = Omit<ReplyRow, "ts">;

export function appendReply(root: string, id: WorkId, entry: ReplyEntry, now: Date): void {
  appendJsonl(workFile(root, id, "replies.jsonl"), { ts: now.toISOString(), ...entry });
}

export function freshReplies(replies: readonly ReplyRow[]): ReplyRow[] {
  return replies.filter((row) => row.fresh === true);
}

export function readReplies(root: string, id: WorkId): JsonlRead<ReplyRow> {
  return readJsonl<ReplyRow>(workFile(root, id, "replies.jsonl"));
}
