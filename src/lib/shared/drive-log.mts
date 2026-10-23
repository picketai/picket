import { appendJsonl, readJsonl, type JsonlRead } from "../util/io.mts";
import { statePath, STATE_FILES } from "./paths.mts";
import type { WorkId } from "./work/files.mts";
import { currentPhase, readSnapshot } from "./work/snapshot.mts";
import { currentItem } from "./work/state.mts";

export type DriveHit = { method: string; path: string; status: number | null; ms: number };

export type DriveRow = {
  ts: string;
  kind: "drive" | "inspect";
  command: string;
  work_id: string | null;
  phase: number | null;
  session?: string | null;
  agent?: string | null;
  source?: string;
  env?: string[];
  ok?: boolean;
  exit_code?: number;
  port?: number;
  hits?: DriveHit[];
};

export type DriveTarget = { work_id: WorkId | null; phase: number | null };

const QUOTED_ENV_FLAG = /--env(\s+)(["'])([A-Za-z_][A-Za-z0-9_]*)=[^"']*\2/g;
const ENV_FLAG = /--env(\s+)([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s"']*)/g;

export function maskEnvValues(command: string): string {
  return command.replace(QUOTED_ENV_FLAG, "--env$1$3=***").replace(ENV_FLAG, "--env$1$2=***");
}

function driveLogPath(root: string): string {
  return statePath(root, STATE_FILES.driveLog);
}

export function appendDriveRow(root: string, row: DriveRow): void {
  appendJsonl(driveLogPath(root), row);
}

function isRow(value: unknown): value is DriveRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readDriveLog(root: string): JsonlRead<DriveRow> {
  const { rows, skipped } = readJsonl<unknown>(driveLogPath(root));
  const good = rows.filter(isRow);
  return { rows: good, skipped: skipped + rows.length - good.length };
}

export function driveTarget(root: string, { session }: { session: string | null }): DriveTarget {
  const item = currentItem(root, { session });
  if (!item) return { work_id: null, phase: null };
  return { work_id: item.id, phase: currentPhase(readSnapshot(root, item.id))?.n ?? null };
}
