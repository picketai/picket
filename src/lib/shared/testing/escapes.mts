import { readDefects } from "../scenarios/defects.mts";
import { namesDefect } from "../scenarios/known.mts";
import { workFile } from "../work/files.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { readText } from "../../util/io.mts";
import { latestCases, latestClass, readTestRows, roundRows, type EscapeRow, type TestRow } from "./results.mts";

export const UNIT_TEST = "unit test";
export const DECLARED_CHECK = "declared check";
export const NOT_CHECKABLE = "none: not checkable earlier";
export const REVIEW_ROW = /^[A-Z][A-Za-z]*\d+$/;

export type EscapeRole = "developer" | "architect" | "reviewer";

export function isEscapePoint(text: string): boolean {
  return text === UNIT_TEST || text === DECLARED_CHECK || text === NOT_CHECKABLE || REVIEW_ROW.test(text);
}

export function escapeRole(point: string): EscapeRole | null {
  if (point === UNIT_TEST) return "developer";
  if (point === DECLARED_CHECK) return "architect";
  return REVIEW_ROW.test(point) ? "reviewer" : null;
}

export function newestEscape(rows: readonly TestRow[], caseId: string): EscapeRow | null {
  return rows.filter((row): row is EscapeRow => row.type === "escape" && row.case === caseId).at(-1) ?? null;
}

export function missingEscapes(rows: readonly TestRow[], round: number): string[] {
  const inRound = roundRows(rows, round);
  return latestCases(inRound)
    .filter((row) => row.outcome === "failed" && latestClass(inRound, row.case)?.class === "product" && newestEscape(rows, row.case) === null)
    .map((row) => row.case);
}

export function itemTexts(root: string, snap: WorkSnapshot): string[] {
  return [readText(workFile(root, snap.state.id, "request.md")) ?? "", snap.artifact?.body ?? ""];
}

export function missingDefectEscapes(root: string, snap: WorkSnapshot): string[] {
  const texts = itemTexts(root, snap);
  const rows = readTestRows(root, snap.state.id);
  return readDefects(root)
    .filter((entry) => entry.status === "open" && namesDefect(texts, entry.id) && newestEscape(rows, entry.id) === null)
    .map((entry) => entry.id);
}

export function escapeFirstText(id: string, caseId: string): string {
  return `record where ${caseId} escaped first: picket test escape ${id} ${caseId} --root-cause "<text>" --escaped "<point>"`;
}
