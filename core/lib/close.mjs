import { commitStaged, dirtyPaths, filesInCommit, isRepo, repoPrefix, stagedFiles } from "./git.mjs";
import { readState, writeState } from "./work.mjs";

export class CloseRefused extends Error {}

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

export function close(id, root, { message } = {}) {
  if (readState(id, root).status === "abandoned") throw new CloseRefused(`${id} is abandoned; only an open, blocked or done item closes`);
  const commitMessage = message ?? defaultCloseMessage(id);
  if (!isRepo(root)) {
    markDone(id, root);
    return { ...readState(id, root), commit: null, message: commitMessage, committed: [], dirty: [] };
  }
  if (message === undefined) refuseForeignStaged(id, root);
  markDone(id, root);
  const commit = commitStaged(root, commitMessage, [`work/${id}`]);
  return { ...readState(id, root), commit, message: commitMessage, committed: commit ? filesInCommit(root, commit) : [], dirty: dirtyPaths(root) };
}
