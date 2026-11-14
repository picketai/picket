import { createHash } from "node:crypto";
import type { PhaseEntry } from "./artifact.mts";
import type { VerdictRow } from "./verdict-log.mts";

type Fields = Record<string, unknown>;
type FramedPhase = { entry: PhaseEntry | null };

const CRITERION_ID = /\bT-\d+\.\d+\b/g;
const CORRECTABLE_KEYS: readonly string[] = ["contains", "exit_code", "command"];

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function recordDigest(body: string): string {
  return sha256(body);
}

function newestAsked(prior: readonly VerdictRow[]): VerdictRow | undefined {
  return prior.filter((row) => Boolean(row.amend)).at(-1);
}

export function isUnchangedAmendment(prior: readonly VerdictRow[], record: string | undefined): boolean {
  if (record === undefined) return false;
  return newestAsked(prior)?.record === record;
}

export function isOutOfFrameAmendment(prior: readonly VerdictRow[], frame: string | undefined): boolean {
  const asked = newestAsked(prior)?.frame;
  return frame !== undefined && asked !== undefined && asked !== frame;
}

function isFields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function driveChecks(entry: PhaseEntry | null): Fields[] {
  return Array.isArray(entry?.drive) ? entry.drive.filter(isFields) : [];
}

export function namedChecks(phases: readonly FramedPhase[], amend: string): string[] {
  const covered = new Set(phases.flatMap((phase) => driveChecks(phase.entry)).map((check) => check.covers));
  return [...new Set(amend.match(CRITERION_ID) ?? [])].filter((id) => covered.has(id));
}

function withoutCorrectable(check: unknown, named: readonly string[]): unknown {
  if (!isFields(check) || !named.includes(String(check.covers))) return check;
  return Object.fromEntries(Object.entries(check).filter(([key]) => !CORRECTABLE_KEYS.includes(key)));
}

function framedEntry(entry: PhaseEntry | null, named: readonly string[]): PhaseEntry | null {
  if (!entry || !Array.isArray(entry.drive)) return entry;
  return { ...entry, drive: entry.drive.map((check) => withoutCorrectable(check, named)) };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isFields(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

export function frameDigest(phases: readonly FramedPhase[], named: readonly string[]): string {
  return sha256(JSON.stringify(canonical(phases.map((phase) => framedEntry(phase.entry, named)))));
}
