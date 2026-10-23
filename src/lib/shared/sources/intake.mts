import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readText } from "../../util/io.mts";
import { parse, stringify } from "../../util/yaml-lite.mjs";
import { workDir, workFile, type WorkId } from "../work/files.mts";
import type { AmbiguousRef, Resolution, ResolvedRef } from "./resolve.mts";

export const SNAPSHOT_MAX_BYTES = 1024 * 1024;

export type IntakeRecord = { refs: (ResolvedRef | AmbiguousRef)[]; unmatched: string[] };

export function readIntake(root: string, id: WorkId): IntakeRecord | null {
  const text = readText(workFile(root, id, "sources.yaml"));
  if (text === null) return null;
  const { refs, unmatched } = parse(text) as Partial<IntakeRecord>;
  return { refs: refs ?? [], unmatched: unmatched ?? [] };
}

export function writeRecord(root: string, id: WorkId, record: IntakeRecord): void {
  writeFileSync(workFile(root, id, "sources.yaml"), stringify({ refs: record.refs, unmatched: record.unmatched }) + "\n");
}

export function snapshotInto(root: string, id: WorkId, ref: ResolvedRef, bytes: Uint8Array): ResolvedRef {
  if (bytes.length > SNAPSHOT_MAX_BYTES) return { ...ref, snapshot: null, snapshot_reason: `${bytes.length} bytes, over the ${SNAPSHOT_MAX_BYTES}-byte snapshot cap` };
  const snapshot = `sources/${ref.source}/${ref.path}`;
  const file = join(workDir(root, id), snapshot);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return { ...ref, snapshot };
}

function snapshotted(root: string, id: WorkId, ref: ResolvedRef | AmbiguousRef, bytes: Map<string, Uint8Array>): ResolvedRef | AmbiguousRef {
  if (ref.status !== "resolved") return ref;
  const found = bytes.get(ref.ref);
  return found ? snapshotInto(root, id, ref, found) : ref;
}

export function writeIntake(root: string, id: WorkId, { refs, unmatched, bytes }: Resolution): void {
  writeRecord(root, id, { refs: refs.map((ref) => snapshotted(root, id, ref, bytes)), unmatched });
}

function isAmbiguous(ref: ResolvedRef | AmbiguousRef): ref is AmbiguousRef {
  return ref.status === "ambiguous";
}

export function ambiguousRefs(root: string, id: WorkId): AmbiguousRef[] {
  return (readIntake(root, id)?.refs ?? []).filter(isAmbiguous);
}
