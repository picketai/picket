import { readJsonl } from "../../util/io.mts";
import { workFile, type WorkId } from "./files.mts";

export type LeftEntry = { ts: string; command: string; why: string | null };

export function readLeft(root: string, id: WorkId): LeftEntry[] {
  return readJsonl<LeftEntry>(workFile(root, id, "left.jsonl")).rows;
}

export function leftLine({ command, why }: LeftEntry): string {
  return `left for you: ${command}${why ? ` (${why})` : ""}`;
}
