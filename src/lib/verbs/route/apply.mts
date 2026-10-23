import { setMarker } from "../../shared/work/markers.mts";
import type { WorkSnapshot } from "../../shared/work/snapshot.mts";
import { isSessionId, writeState, type WorkState } from "../../shared/work/state.mts";
import { appendVerdict, type VerdictEntry } from "../../shared/work/verdict-log.mts";
import { commitPhase } from "./commit.mts";
import type { Change } from "./plan.mts";

export type ApplyOptions = { now: Date; env: NodeJS.ProcessEnv; session: string | null | undefined; row: VerdictEntry };

type StateChange = Extract<Change, { kind: "state" }>;

function isStateChange(change: Change): change is StateChange {
  return change.kind === "state";
}

function claimsSession(state: WorkState, session: string | null | undefined): session is string {
  return isSessionId(session) && String(state.session) !== String(session);
}

function changedState(state: WorkState, changes: Change[], session: string | null | undefined): WorkState | null {
  const stateChanges = changes.filter(isStateChange);
  const claim = claimsSession(state, session);
  if (!stateChanges.length && !claim) return null;
  const next: WorkState = { ...state };
  for (const { set, unset = [] } of stateChanges) {
    Object.assign(next, set);
    for (const key of unset) delete next[key];
  }
  if (claim) next.session = session;
  return next;
}

function appliedLine(change: Change): string | null {
  return change.kind === "commit" ? null : change.line;
}

export function applyChanges(root: string, snap: WorkSnapshot, changes: Change[], { now, env, session, row }: ApplyOptions): string[] {
  const id = snap.state.id;
  for (const change of changes) if (change.kind === "marker") setMarker(root, id, change.phase, change.mark, now);
  const state = changedState(snap.state, changes, session);
  if (state) writeState(root, state, now);
  appendVerdict(root, id, row, now);
  const applied = changes.map(appliedLine).filter((line): line is string => line !== null);
  for (const change of changes) if (change.kind === "commit") applied.push(...commitPhase(root, snap, change.phase, env, now));
  return applied;
}
