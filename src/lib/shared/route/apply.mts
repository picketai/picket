import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Refused } from "../action.mts";
import { setMarker } from "../work/markers.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { isSessionId, writeState, type WorkState } from "../work/state.mts";
import { appendVerdict, type VerdictEntry } from "../work/verdict-log.mts";
import { commitCheckouts, commitPhase } from "./commit.mts";
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

type CommitChange = Extract<Change, { kind: "commit" }>;

function isCommitChange(change: Change): change is CommitChange {
  return change.kind === "commit";
}

function grantsRun(change: Change): boolean {
  return isStateChange(change) && change.set !== undefined && "run_through" in change.set;
}

function withoutApproval(changes: Change[], phase: number, refusal: string): Change[] {
  const approves = (change: Change) => change.kind === "marker" && change.phase === phase && change.mark === "approved";
  const kept = changes.filter((change) => !approves(change) && !isCommitChange(change) && !grantsRun(change));
  return [...kept, { kind: "state", unset: ["run_through"], line: null }, { kind: "note", line: refusal }];
}

type NestedOutcome = { changes: Change[]; lines: string[]; refused: boolean };

function commitNestedFirst(root: string, snap: WorkSnapshot, changes: Change[], env: NodeJS.ProcessEnv): NestedOutcome {
  const commit = changes.find(isCommitChange);
  if (!commit) return { changes, lines: [], refused: false };
  const { lines, refused } = commitCheckouts(root, snap, commit.phase, env);
  return refused ? { changes: withoutApproval(changes, commit.phase, refused), lines, refused: true } : { changes, lines, refused: false };
}

function isRefusedApproval(nested: NestedOutcome, row: VerdictEntry): boolean {
  return nested.refused && row.verdict === "approved";
}

export function applyChanges(root: string, snap: WorkSnapshot, planned: Change[], { now, env, session, row }: ApplyOptions): string[] {
  const id = snap.state.id;
  const nested = commitNestedFirst(root, snap, planned, env);
  const changes = nested.changes;
  const published = changes.filter(isPublishChange).map((change) => publish(root, id, change));
  for (const change of changes) if (change.kind === "marker") setMarker(root, id, change.phase, change.mark, now);
  const state = changedState(snap.state, changes, session);
  if (state) writeState(root, state, now);
  if (!isRefusedApproval(nested, row)) appendVerdict(root, id, row, now);
  const applied = [...published, ...nested.lines, ...changes.map(appliedLine).filter((line): line is string => line !== null)];
  for (const change of changes) if (change.kind === "commit") applied.push(...commitPhase(root, snap, change.phase, env, now));
  return applied;
}
