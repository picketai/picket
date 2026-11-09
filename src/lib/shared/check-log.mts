import { readJsonl, rewriteJsonl } from "../util/io.mts";
import type { StepName, StepStatus } from "./checks.mts";
import { statePath, STATE_FILES } from "./paths.mts";

export type CheckStep = { name: StepName; status: StepStatus };

export type CheckRow = {
  ts: string;
  session: string | null;
  work_id: string;
  phase: number | null;
  checkout: string;
  ok: boolean;
  product_changed: boolean;
  steps: CheckStep[];
};

function checkLogPath(root: string): string {
  return statePath(root, STATE_FILES.checkLog);
}

function isCheckRow(value: unknown): value is CheckRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.work_id === "string" && Array.isArray(row.steps);
}

function checkRows(root: string): CheckRow[] {
  return readJsonl<unknown>(checkLogPath(root)).rows.filter(isCheckRow);
}

function isRedBeforeChange(row: CheckRow): boolean {
  return !row.ok && row.product_changed === false;
}

function keyOf(row: CheckRow): string {
  return JSON.stringify([row.work_id, row.phase]);
}

function keptRows(rows: CheckRow[]): CheckRow[] {
  const newest = new Map<string, CheckRow>();
  const newestRed = new Map<string, CheckRow>();
  for (const row of rows) {
    newest.set(keyOf(row), row);
    if (isRedBeforeChange(row)) newestRed.set(keyOf(row), row);
  }
  const kept = new Set([...newest.values(), ...newestRed.values()]);
  return rows.filter((row) => kept.has(row));
}

export function appendCheckRow(root: string, row: CheckRow): void {
  rewriteJsonl(checkLogPath(root), keptRows([...checkRows(root), row]));
}

export function dropItemChecks(root: string, id: string): void {
  const rows = checkRows(root);
  const kept = rows.filter((row) => row.work_id !== id);
  if (kept.length < rows.length) rewriteJsonl(checkLogPath(root), kept);
}

function rowsOf(root: string, id: string, phase: number | null): CheckRow[] {
  return checkRows(root).filter((row) => row.work_id === id && row.phase === phase);
}

export function latestCheck(root: string, id: string, phase: number | null): CheckRow | null {
  return rowsOf(root, id, phase).at(-1) ?? null;
}

export function redBeforeChange(root: string, id: string, phase: number | null): CheckRow | null {
  return rowsOf(root, id, phase).filter(isRedBeforeChange).at(-1) ?? null;
}
