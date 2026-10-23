import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { phaseMarker, type Marker, type WorkId } from "./files.mts";

export type PhaseMark = Exclude<Marker, "block.md">;

export function hasMarker(root: string, id: WorkId, n: number, mark: PhaseMark): boolean {
  return existsSync(phaseMarker(root, id, n, mark));
}

export function setMarker(root: string, id: WorkId, n: number, mark: PhaseMark, now: Date): string {
  const path = phaseMarker(root, id, n, mark);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${now.toISOString()}\n`);
  return path;
}
