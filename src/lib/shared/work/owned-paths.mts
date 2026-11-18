import { phasePaths, type ArtifactPhase } from "./artifact.mts";
import { blockFiles, fixesFiles } from "./block.mts";
import type { WorkId } from "./files.mts";

export function itemOwnedPaths(root: string, id: WorkId, phases: readonly ArtifactPhase[]): string[] | null {
  if (!phases.length) return null;
  return phases.flatMap((phase) => [...phasePaths(phase), ...blockFiles(root, id, phase.n), ...fixesFiles(root, id, phase.n)]);
}
