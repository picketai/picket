import { ARTIFACT_BY_LANE } from "../../dist/lib/shared/work/state.mjs";

const PROBE_TIME = "2026-10-23T10:00:00.000Z";

function phaseStatus(partial) {
  return { title: `Phase ${partial.n}`, entry: null, touchSet: [], irreversible: false, done: false, approved: false, reviewed: false, ...partial };
}

function defaultArtifact(state) {
  const expected = ARTIFACT_BY_LANE[state.lane];
  return expected ? { path: `/probe/work/${state.id}/${expected}`, expected, body: "" } : null;
}

export function snapshotOf({ phases = [], verdicts = [], ambiguousRefs = [], warnings = [], artifact, ...fields } = {}) {
  const state = { id: "20261023-probe", lane: "order", title: "Probe", status: "open", created: PROBE_TIME, updated: PROBE_TIME, ...fields };
  return {
    state,
    artifact: artifact === undefined ? defaultArtifact(state) : artifact,
    phases: phases.map(phaseStatus),
    verdicts,
    ambiguousRefs,
    warnings,
  };
}
