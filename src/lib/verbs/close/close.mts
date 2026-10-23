import { Refused } from "../../shared/action.mts";
import { securityPaths } from "../../shared/config.mjs";
import { commitOwned, dirtyPaths, filesInCommit, isRepo, listedPathMatcher, repoPrefix, stagedFiles, type CommitResult } from "../../shared/git.mts";
import { recordAccept } from "../../shared/ledger.mts";
import { phasePaths } from "../../shared/work/artifact.mts";
import { blockFiles } from "../../shared/work/block.mts";
import { workRel, type WorkId } from "../../shared/work/files.mts";
import { readLeft, type LeftEntry } from "../../shared/work/left.mts";
import { nextOf, type NextView } from "../../shared/work/next-view.mts";
import { readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { listWork, writeState, type Lane, type WorkState } from "../../shared/work/state.mts";
import { readVerdicts } from "../../shared/work/verdict-log.mts";

export type Repeat = { class: string; items: WorkId[] };
export type CloseOptions = { message?: string; touched?: string[] };
export type CloseContext = { now: Date; env: NodeJS.ProcessEnv };
export type CloseResult = WorkState & {
  commit: string | null;
  message: string;
  committed: string[];
  left_staged: string[];
  warnings: string[];
  dirty: string[];
  left: LeftEntry[];
  repeats: Repeat[];
};

const PHASED_LANES: readonly Lane[] = ["order", "design"];
const CLASSED_VERDICT = "CHANGES REQUIRED";
const MIN_REPEATS = 2;

export function defaultCloseMessage(id: WorkId): string {
  return `chore: close ${id}`;
}

function itemOwner(root: string, snap: WorkSnapshot, touched: string[]): (path: string) => boolean {
  const id = snap.state.id;
  const phases = PHASED_LANES.includes(snap.state.lane) ? snap.phases : [];
  const phaseLists = phases.flatMap((p) => [...phasePaths(p), ...blockFiles(root, id, p.n)]);
  return listedPathMatcher(root, [workRel(id), ...phaseLists, ...touched]);
}

function refuseUntouchedFastClose(root: string, { id, lane }: WorkState, touched: string[]): void {
  if (lane !== "fast" || touched.length) return;
  const own = `${repoPrefix(root)}${workRel(id)}`;
  const foreign = stagedFiles(root).filter((path) => !path.startsWith(own));
  if (foreign.length) throw new Refused(`staged paths outside ${own}: ${foreign.join(", ")}; pass --touched <p1,p2> to commit them with the close, or unstage them`, { id });
}

function markDone(root: string, state: WorkState, now: Date): WorkState {
  if (state.status === "done") return state;
  const closed: WorkState = { ...state, status: "done" };
  delete closed.blocked_reason;
  return writeState(root, closed, now);
}

function nextAllowsClose(lane: Lane, pending: NextView): boolean {
  if (pending.action === "close") return true;
  return lane === "research" && pending.action === "approve_phase" && pending.actor === "user";
}

function refuseUnlessClosable(root: string, snap: WorkSnapshot): void {
  const { id, lane, status } = snap.state;
  if (status === "abandoned") throw new Refused(`${id} is abandoned; only an open, blocked or done item closes`, { id });
  if (status === "done") return;
  const pending = nextOf(snap, securityPaths(root));
  if (nextAllowsClose(lane, pending)) return;
  const { action, actor, phase, detail } = pending;
  throw new Refused(`next is ${action}, not close`, { id, next: { action, actor, phase, detail } });
}

function classesOf(root: string, id: WorkId): string[] {
  return readVerdicts(root, id)
    .rows.filter((row) => row.verdict === CLASSED_VERDICT && Array.isArray(row.classes))
    .flatMap((row) => [...new Set(row.classes)]);
}

export function repeatedClasses(root: string): Repeat[] {
  const seen = new Map<string, WorkId[]>();
  for (const id of listWork(root)) for (const cls of classesOf(root, id)) seen.set(cls, [...(seen.get(cls) ?? []), id]);
  return [...seen]
    .filter(([, ids]) => ids.length >= MIN_REPEATS)
    .map(([cls, ids]) => ({ class: cls, items: [...new Set(ids)] }))
    .sort((a, b) => a.class.localeCompare(b.class));
}

function commitClose(root: string, snap: WorkSnapshot, message: string, touched: string[], env: NodeJS.ProcessEnv): CommitResult {
  const id = snap.state.id;
  try {
    return commitOwned(root, message, { add: [workRel(id)], owns: itemOwner(root, snap, touched), env });
  } catch (err) {
    throw new Refused((err as Error).message, { id });
  }
}

export function close(root: string, id: WorkId, { message, touched = [] }: CloseOptions, { now, env }: CloseContext): CloseResult {
  const snap = readSnapshot(root, id);
  refuseUnlessClosable(root, snap);
  const commitMessage = message ?? defaultCloseMessage(id);
  const repeats = repeatedClasses(root);
  if (!isRepo(root)) {
    const state = markDone(root, snap.state, now);
    return { ...state, commit: null, message: commitMessage, committed: [], left_staged: [], warnings: [], dirty: [], left: readLeft(root, id), repeats };
  }
  refuseUntouchedFastClose(root, snap.state, touched);
  const state = markDone(root, snap.state, now);
  const { sha: commit, left_staged, warnings } = commitClose(root, snap, commitMessage, touched, env);
  if (commit) recordAccept(root, id, commit, null, now);
  return { ...state, commit, message: commitMessage, committed: commit ? filesInCommit(root, commit) : [], left_staged, warnings, dirty: dirtyPaths(root), left: readLeft(root, id), repeats };
}
