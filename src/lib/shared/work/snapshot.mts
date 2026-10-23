import { readText } from "../../util/io.mts";
import { ambiguousRefs } from "../sources/intake.mts";
import type { AmbiguousRef } from "../sources/resolve.mts";
import type { PhaseView as WirePhaseView, StateView as WireStateView } from "../views.mts";
import { parseArtifact, type ArtifactPhase } from "./artifact.mts";
import { workFile, type WorkFile, type WorkId } from "./files.mts";
import { hasMarker } from "./markers.mts";
import { ARTIFACT_BY_LANE, readState, type WorkState } from "./state.mts";
import { readVerdicts, type VerdictRow } from "./verdict-log.mts";

export type PhaseStatus = ArtifactPhase & { done: boolean; approved: boolean; reviewed: boolean };
export type SnapshotArtifact = { path: string; expected: WorkFile; body: string };

export type WorkSnapshot = {
  state: WorkState;
  artifact: SnapshotArtifact | null;
  phases: PhaseStatus[];
  verdicts: VerdictRow[];
  ambiguousRefs: AmbiguousRef[];
  warnings: string[];
};

export type PhaseView = WirePhaseView;

export type StateView = WireStateView &
  WorkState & {
    artifact_expected: WorkFile | null;
    verdicts: VerdictRow[];
    last_verdict: VerdictRow | null;
  };

function readArtifactFile(root: string, id: WorkId, expected: WorkFile | null): { artifact: SnapshotArtifact; phases: ArtifactPhase[] } | null {
  if (!expected) return null;
  const path = workFile(root, id, expected);
  const text = readText(path);
  if (text === null) return null;
  const { body, phases } = parseArtifact(text);
  return { artifact: { path, expected, body }, phases };
}

function withMarkers(root: string, id: WorkId, phase: ArtifactPhase): PhaseStatus {
  return { ...phase, done: hasMarker(root, id, phase.n, "done"), approved: hasMarker(root, id, phase.n, "approved"), reviewed: hasMarker(root, id, phase.n, "reviewed") };
}

function skippedWarning(skipped: number): string[] {
  if (!skipped) return [];
  return [`verdicts.jsonl: ${skipped} unreadable ${skipped === 1 ? "line" : "lines"} skipped`];
}

export function readSnapshot(root: string, id: WorkId): WorkSnapshot {
  const state = readState(root, id);
  const read = readArtifactFile(root, id, ARTIFACT_BY_LANE[state.lane]);
  const verdicts = readVerdicts(root, id);
  return {
    state,
    artifact: read?.artifact ?? null,
    phases: (read?.phases ?? []).map((phase) => withMarkers(root, id, phase)),
    verdicts: verdicts.rows,
    ambiguousRefs: ambiguousRefs(root, id),
    warnings: skippedWarning(verdicts.skipped),
  };
}

export function phaseOf(snap: WorkSnapshot, n: number): PhaseStatus | undefined {
  return snap.phases.find((phase) => phase.n === n);
}

export function currentPhase(snap: WorkSnapshot): PhaseStatus | null {
  return snap.phases.find((phase) => !phase.approved) ?? null;
}

function phaseView({ n, title, done, approved, reviewed }: PhaseStatus): PhaseView {
  return { n, title, done, approved, reviewed };
}

export function stateView(snap: WorkSnapshot): StateView {
  const current = currentPhase(snap);
  const view: StateView = {
    ...snap.state,
    artifact: snap.artifact?.path ?? null,
    artifact_expected: ARTIFACT_BY_LANE[snap.state.lane],
    phases: snap.phases.map(phaseView),
    phase_count: snap.phases.length,
    phases_approved: snap.phases.filter((phase) => phase.approved).length,
    current_phase: current ? current.n : null,
    verdicts: snap.verdicts,
    last_verdict: snap.verdicts.at(-1) ?? null,
  };
  return snap.warnings.length ? { ...view, warnings: snap.warnings } : view;
}
