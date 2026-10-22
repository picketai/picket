import { commitOwned, dirtyPaths, filesInCommit, isRepo, listedPathMatcher, productLinesAdded, repoPrefix, stagedFiles } from "./git.mjs";
import { phasePaths } from "./gate.mjs";
import { blockFiles } from "./packet.mjs";
import { appendLedger } from "./ledger.mjs";
import { next } from "./next.mjs";
import { listWork, readArtifact, readState, readVerdicts, writeState } from "./work.mjs";
import { readLeft } from "./shared/work/left.mjs";

export class CloseRefused extends Error {
  constructor(message, pending) {
    super(message);
    if (pending) this.next = pending;
  }
}

export function defaultCloseMessage(id) {
  return `chore: close ${id}`;
}

const PHASED_LANES = new Set(["order", "design"]);

function itemOwner(id, root, lane, touched) {
  const phases = PHASED_LANES.has(lane) ? readArtifact(id, root).phases : [];
  const phaseLists = phases.flatMap((p) => [...phasePaths(id, p.n, root), ...blockFiles(id, p.n, root)]);
  return listedPathMatcher(root, [`work/${id}/`, ...phaseLists, ...touched]);
}

function refuseUntouchedFastClose(id, root, lane, touched) {
  if (lane !== "fast" || touched.length) return;
  const own = `${repoPrefix(root)}work/${id}/`;
  const foreign = stagedFiles(root).filter((path) => !path.startsWith(own));
  if (foreign.length) throw new CloseRefused(`staged paths outside ${own}: ${foreign.join(", ")}; pass --touched <p1,p2> to commit them with the close, or unstage them`);
}

function markDone(id, root) {
  const state = readState(id, root);
  if (state.status === "done") return;
  state.status = "done";
  delete state.blocked_reason;
  writeState(state, root);
}

function nextAllowsClose(lane, pending) {
  if (pending.action === "close") return true;
  return lane === "research" && pending.action === "approve_phase" && pending.actor === "user";
}

function refuseUnlessClosable(id, root) {
  const state = readState(id, root);
  if (state.status === "abandoned") throw new CloseRefused(`${id} is abandoned; only an open, blocked or done item closes`);
  if (state.status === "done") return;
  const pending = next(id, root);
  if (nextAllowsClose(state.lane, pending)) return;
  const { action, actor, phase, detail } = pending;
  throw new CloseRefused(`next is ${action}, not close`, { action, actor, phase, detail });
}

export function recordAccept(root, id, commit, phase = null) {
  try {
    appendLedger(root, { event: "accept", session: null, agent: null, work_id: id, phase, commit, lines_added: productLinesAdded(root, commit) });
  } catch {}
}

const MIN_REPEATS = 2;

export function repeatedClasses(root) {
  const seen = new Map();
  for (const id of listWork(root)) {
    for (const entry of readVerdicts(id, root)) {
      if (entry.verdict !== "CHANGES REQUIRED" || !Array.isArray(entry.classes)) continue;
      for (const cls of new Set(entry.classes)) seen.set(cls, [...(seen.get(cls) ?? []), id]);
    }
  }
  return [...seen]
    .filter(([, ids]) => ids.length >= MIN_REPEATS)
    .map(([cls, ids]) => ({ class: cls, items: [...new Set(ids)] }))
    .sort((a, b) => a.class.localeCompare(b.class));
}

export function close(id, root, { message, touched = [] } = {}) {
  refuseUnlessClosable(id, root);
  const commitMessage = message ?? defaultCloseMessage(id);
  const repeats = repeatedClasses(root);
  if (!isRepo(root)) {
    markDone(id, root);
    return { ...readState(id, root), commit: null, message: commitMessage, committed: [], left_staged: [], warnings: [], dirty: [], left: readLeft(root, id), repeats };
  }
  const { lane } = readState(id, root);
  refuseUntouchedFastClose(id, root, lane, touched);
  markDone(id, root);
  const { sha: commit, left_staged, warnings } = commitOwned(root, commitMessage, { add: [`work/${id}`], owns: itemOwner(id, root, lane, touched), env: process.env });
  if (commit) recordAccept(root, id, commit);
  return { ...readState(id, root), commit, message: commitMessage, committed: commit ? filesInCommit(root, commit) : [], left_staged, warnings, dirty: dirtyPaths(root), left: readLeft(root, id), repeats };
}
