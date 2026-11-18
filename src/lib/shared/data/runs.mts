import { appendJsonl, readJsonl } from "../../util/io.mts";
import { statePath, STATE_FILES } from "../paths.mts";

export type DataRun = { at: string; item: string; entry: string; path: string; sha256: string; server: string; database: string; status: number | null };

function runsPath(root: string): string {
  return statePath(root, STATE_FILES.dataRuns);
}

export function appendDataRun(root: string, row: DataRun): void {
  appendJsonl(runsPath(root), row);
}

export function itemDataRuns(root: string, item: string): DataRun[] {
  return readJsonl<DataRun>(runsPath(root)).rows.filter((row) => row.item === item);
}
