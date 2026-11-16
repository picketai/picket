import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Refused } from "../action.mts";
import { correctCheckPath, withRevisionLine } from "../work/check-correction.mts";
import { setMarker } from "../work/markers.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { isSessionId, writeState, type WorkState } from "../work/state.mts";
import { appendVerdict, type VerdictEntry } from "../work/verdict-log.mts";
import { keepCandidates, restoreKept, type KeptFiles } from "../scenarios/keep.mts";
import { commitCheckouts, commitPhase, phaseCommitMessage } from "./commit.mts";
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
type KeepChange = Extract<Change, { kind: "keep" }>;
type CorrectChange = Extract<Change, { kind: "correct" }>;

function isCorrectChange(change: Change): change is CorrectChange {
  return change.kind === "correct";
}

function correctedRecord(text: string, corrections: CorrectChange[], day: string): string {
  return corrections.reduce((record, { phase, index, to, line }) => {
    const corrected = correctCheckPath(record, phase, index, to);
    return corrected === record ? record : withRevisionLine(corrected, `- ${day}: ${line}`);
  }, text);
}

function writeCorrections(snap: WorkSnapshot, changes: Change[], now: Date): void {
  const corrections = changes.filter(isCorrectChange);
  if (!corrections.length || !snap.artifact) return;
  const text = readFileSync(snap.artifact.path, "utf8");
  writeFileSync(snap.artifact.path, correctedRecord(text, corrections, now.toISOString().slice(0, 10)));
}

function isCommitChange(change: Change): change is CommitChange {
  return change.kind === "commit";
}

function isKeepChange(change: Change): change is KeepChange {
  return change.kind === "keep";
}

function writeKept(root: string, changes: Change[], committing: boolean): KeptFiles {
  const candidates = committing ? changes.filter(isKeepChange).flatMap((change) => change.candidates) : [];
  return candidates.length ? keepCandidates(root, candidates) : { paths: [], lines: [], before: [] };
}

function committedOrRestored(root: string, snap: WorkSnapshot, phase: number, message: string, { env, now }: Pick<ApplyOptions, "env" | "now">, kept: KeptFiles): string[] {
  const { lines, sha } = commitPhase(root, snap, phase, message, env, now, kept.paths);
  return sha === null ? [...lines, ...restoreKept(root, kept)] : lines;
}

function grantsRun(change: Change): boolean {
  return isStateChange(change) && change.set !== undefined && "run_through" in change.set;
}

function withoutApproval(changes: Change[], phase: number, refusal: string): Change[] {
  const approves = (change: Change) => change.kind === "marker" && change.phase === phase && change.mark === "approved";
  const kept = changes.filter((change) => !approves(change) && !isCommitChange(change) && !grantsRun(change) && !isCorrectChange(change) && !isKeepChange(change));
  return [...kept, { kind: "state", unset: ["run_through"], line: null }, { kind: "note", line: refusal }];
}

type NestedOutcome = { changes: Change[]; lines: string[]; refused: boolean; message: string | null };

function refusedOutcome(changes: Change[], phase: number, refusal: string, lines: string[] = []): NestedOutcome {
  return { changes: withoutApproval(changes, phase, refusal), lines, refused: true, message: null };
}

function commitNestedFirst(root: string, snap: WorkSnapshot, changes: Change[], env: NodeJS.ProcessEnv): NestedOutcome {
  const commit = changes.find(isCommitChange);
  if (!commit) return { changes, lines: [], refused: false, message: null };
  const checked = phaseCommitMessage(root, snap, commit.phase);
  if ("problem" in checked) return refusedOutcome(changes, commit.phase, `phase ${commit.phase} is not committed: ${checked.problem}`);
  const { lines, refused } = commitCheckouts(root, snap, commit.phase, checked.message, env);
  return refused ? refusedOutcome(changes, commit.phase, refused, lines) : { changes, lines, refused: false, message: checked.message };
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
  writeCorrections(snap, changes, now);
  const state = changedState(snap.state, changes, session);
  if (state) writeState(root, state, now);
  if (!isRefusedApproval(nested, row)) appendVerdict(root, id, row, now);
  const kept = writeKept(root, changes, nested.message !== null);
  const applied = [...published, ...nested.lines, ...changes.map(appliedLine).filter((line): line is string => line !== null), ...kept.lines];
  for (const change of changes) if (change.kind === "commit" && nested.message !== null) applied.push(...committedOrRestored(root, snap, change.phase, nested.message, { env, now }, kept));
  return applied;
}
