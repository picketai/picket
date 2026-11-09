import { appendJsonl, readJsonl } from "../util/io.mts";
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
  steps: CheckStep[];
};

function checkLogPath(root: string): string {
  return statePath(root, STATE_FILES.checkLog);
}

export function appendCheckRow(root: string, row: CheckRow): void {
  appendJsonl(checkLogPath(root), row);
}

function isCheckRow(value: unknown): value is CheckRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.work_id === "string" && Array.isArray(row.steps);
}

export function latestCheck(root: string, id: string, phase: number | null): CheckRow | null {
  const rows = readJsonl<unknown>(checkLogPath(root)).rows.filter(isCheckRow);
  return rows.reverse().find((row) => row.work_id === id && row.phase === phase) ?? null;
}
