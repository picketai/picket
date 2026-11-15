import { existsSync } from "node:fs";
import { appendJsonl, readJsonl, type JsonlRead } from "../util/io.mts";
import { isSecretName, masked } from "./env/config-entries.mts";
import { statePath, STATE_FILES } from "./paths.mts";
import { readChecks, type DeclaredCheck } from "./work/declared-checks.mts";
import { isWorkId, workFile, type WorkId } from "./work/files.mts";
import { currentPhase, phaseOf, readSnapshot } from "./work/snapshot.mts";
import { currentItem } from "./work/state.mts";

export type ContainsMap = Record<string, boolean>;
export type DriveHit = { method: string; path: string; status: number | null; ms: number; contains?: ContainsMap; body?: string };

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
  run?: string;
  contains?: ContainsMap;
  port?: number;
  hits?: DriveHit[];
};

export type DriveTarget = { work_id: WorkId | null; phase: number | null };

const QUOTED_ENV_FLAG = /--env(\s+)(["'])([A-Za-z_][A-Za-z0-9_]*)=[^"']*\2/g;
const ENV_FLAG = /--env(\s+)([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s"']*)/g;

export function maskEnvValues(command: string): string {
  return command.replace(QUOTED_ENV_FLAG, "--env$1$3=***").replace(ENV_FLAG, "--env$1$2=***");
}

const MASK = "***";

function maskedValue(key: string, value: unknown): unknown {
  if (isSecretName(key.replaceAll("-", "")) && (typeof value === "string" || typeof value === "number")) return MASK;
  return maskedJson(value);
}

function maskedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskedJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, maskedValue(key, child)]));
}

function parsedJson(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

export function maskedBody(text: string): string {
  const parsed = parsedJson(text);
  return parsed === null ? (masked(null, text) ?? "") : JSON.stringify(maskedJson(parsed.value));
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

export function phaseChecks(root: string, { work_id, phase }: { work_id: string | null; phase: number | null }): DeclaredCheck[] {
  if (work_id === null || phase === null || !isWorkId(work_id) || !existsSync(workFile(root, work_id, "state.yaml"))) return [];
  const entry = phaseOf(readSnapshot(root, work_id), phase)?.entry;
  return readChecks(entry?.drive, phase)?.checks ?? [];
}

export function driveTarget(root: string, { session }: { session: string | null }): DriveTarget {
  const item = currentItem(root, { session });
  if (!item) return { work_id: null, phase: null };
  return { work_id: item.id, phase: currentPhase(readSnapshot(root, item.id))?.n ?? null };
}
