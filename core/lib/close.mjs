import { commitStaged, dirtyPaths, filesInCommit, isRepo, repoPrefix, stagedFiles } from "./git.mjs";
import { next } from "./next.mjs";
import { readState, writeState } from "./work.mjs";
import { readLeft } from "./leave.mjs";

export class CloseRefused extends Error {
  constructor(message, pending) {
    super(message);
    if (pending) this.next = pending;
  }
}

export function defaultCloseMessage(id) {
  return `chore: close ${id}`;
}

function refuseForeignStaged(id, root) {
  const own = `${repoPrefix(root)}work/${id}/`;
  const foreign = stagedFiles(root).filter((path) => !path.startsWith(own));
  if (foreign.length) throw new CloseRefused(`staged paths outside ${own}: ${foreign.join(", ")}; unstage them, or pass --message "<m>" to commit them with the close`);
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

export function close(id, root, { message } = {}) {
  refuseUnlessClosable(id, root);
  const commitMessage = message ?? defaultCloseMessage(id);
  if (!isRepo(root)) {
    markDone(id, root);
    return { ...readState(id, root), commit: null, message: commitMessage, committed: [], dirty: [], left: readLeft(id, root) };
  }
  if (message === undefined) refuseForeignStaged(id, root);
  markDone(id, root);
  const commit = commitStaged(root, commitMessage, [`work/${id}`]);
  return { ...readState(id, root), commit, message: commitMessage, committed: commit ? filesInCommit(root, commit) : [], dirty: dirtyPaths(root), left: readLeft(id, root) };
}
