import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Refused } from "../action.mts";
import { setMarker } from "../work/markers.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { isSessionId, writeState, type WorkState } from "../work/state.mts";
import { appendVerdict, type VerdictEntry } from "../work/verdict-log.mts";
import { commitPhase } from "./commit.mts";
import type { Change } from "./plan.mts";

export type ApplyOptions = { now: Date; env: NodeJS.ProcessEnv; session: string | null | undefined; row: VerdictEntry };

type StateChange = Extract<Change, { kind: "state" }>;
type PublishChange = Extract<Change, { kind: "publish" }>;

function isStateChange(change: Change): change is StateChange {
  return change.kind === "state";
}

function isPublishChange(change: Change): change is PublishChange {
  return change.kind === "publish";
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

function underRoot(root: string, rel: string): string {
  return join(root, ...rel.split("/"));
}

function publish(root: string, id: string, { from, to, line }: PublishChange): string {
  const report = readFileSync(underRoot(root, from));
  const target = underRoot(root, to);
  if (existsSync(target)) {
    if (readFileSync(target).equals(report)) return `already published to ${to}`;
    throw new Refused(`${to} already holds a different report; rename the item with picket set ${id} --title, or move that file`, { id, target: to });
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, report);
  return line;
}

function appliedLine(change: Change): string | null {
  return change.kind === "commit" || change.kind === "publish" ? null : change.line;
}

export function applyChanges(root: string, snap: WorkSnapshot, changes: Change[], { now, env, session, row }: ApplyOptions): string[] {
  const id = snap.state.id;
  const published = changes.filter(isPublishChange).map((change) => publish(root, id, change));
  for (const change of changes) if (change.kind === "marker") setMarker(root, id, change.phase, change.mark, now);
  const state = changedState(snap.state, changes, session);
  if (state) writeState(root, state, now);
  appendVerdict(root, id, row, now);
  const applied = [...published, ...changes.map(appliedLine).filter((line): line is string => line !== null)];
  for (const change of changes) if (change.kind === "commit") applied.push(...commitPhase(root, snap, change.phase, env, now));
  return applied;
}
