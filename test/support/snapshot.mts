import { ARTIFACT_BY_LANE, type WorkState } from "../../src/lib/shared/work/state.mts";
import type { PhaseStatus, SnapshotArtifact, WorkSnapshot } from "../../src/lib/shared/work/snapshot.mts";
import type { VerdictRow } from "../../src/lib/shared/work/verdict-log.mts";
import type { AmbiguousRef } from "../../src/lib/shared/sources/resolve.mts";

const PROBE_TIME = "2026-10-23T10:00:00.000Z";

export type PhaseInput = Partial<PhaseStatus> & { n: number };
export type SnapshotInput = Partial<Omit<WorkState, "id">> & {
  id?: string;
  phases?: PhaseInput[];
  verdicts?: Partial<VerdictRow>[];
  ambiguousRefs?: AmbiguousRef[];
  warnings?: string[];
  artifact?: SnapshotArtifact | null;
};

function phaseStatus(partial: PhaseInput): PhaseStatus {
  return { title: `Phase ${partial.n}`, entry: null, touchSet: [], irreversible: false, done: false, approved: false, reviewed: false, ...partial };
}

function defaultArtifact(state: WorkState): SnapshotArtifact | null {
  const expected = ARTIFACT_BY_LANE[state.lane];
  return expected ? { path: `/probe/work/${state.id}/${expected}`, expected, body: "" } : null;
}

export function snapshotOf({ phases = [], verdicts = [], ambiguousRefs = [], warnings = [], artifact, ...fields }: SnapshotInput = {}): WorkSnapshot {
  const state = { id: "20261023-probe", lane: "order", title: "Probe", status: "open", created: PROBE_TIME, updated: PROBE_TIME, ...fields } as WorkState;
  return {
    state,
    artifact: artifact === undefined ? defaultArtifact(state) : artifact,
    phases: phases.map(phaseStatus),
    verdicts: verdicts as VerdictRow[],
    ambiguousRefs,
    warnings,
  };
}
