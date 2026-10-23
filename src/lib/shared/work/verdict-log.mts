import { appendJsonl, readJsonl, type JsonlRead } from "../../util/io.mts";
import { workFile, type WorkId } from "./files.mts";

export type VerdictRow = { ts: string; agent: string; verdict: string; phase: number | null; scope: string | null; through: number | null; classes?: string[] };
export type VerdictEntry = Omit<VerdictRow, "ts">;

export function appendVerdict(root: string, id: WorkId, entry: VerdictEntry, now: Date): void {
  appendJsonl(workFile(root, id, "verdicts.jsonl"), { ts: now.toISOString(), ...entry });
}

export function readVerdicts(root: string, id: WorkId): JsonlRead<VerdictRow> {
  return readJsonl<VerdictRow>(workFile(root, id, "verdicts.jsonl"));
}
