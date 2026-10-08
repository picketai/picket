import { execFileSync } from "node:child_process";
import { commitStaged, dirtyPaths, stagedFiles } from "./git.mjs";
import { readState, writeState } from "./work.mjs";

export class CloseRefused extends Error {}

export function defaultCloseMessage(id) {
  return `chore: close ${id}`;
}

function stageWorkItem(root, workPath) {
  execFileSync("git", ["-C", root, "add", "-A", "--", workPath], { stdio: "ignore" });
}

function refuseForeignStaged(id, root) {
  const own = `work/${id}/`;
  const foreign = stagedFiles(root).filter((path) => !path.startsWith(own));
  if (foreign.length) throw new CloseRefused(`staged paths outside ${own}: ${foreign.join(", ")}; unstage them, or pass --message "<m>" to commit them with the close`);
}

export function close(id, root, { message } = {}) {
  const state = readState(id, root);
  if (state.status === "abandoned") throw new CloseRefused(`${id} is abandoned; only an open, blocked or done item closes`);
  if (message === undefined) refuseForeignStaged(id, root);
  if (state.status !== "done") {
    state.status = "done";
    delete state.blocked_reason;
    writeState(state, root);
  }
  const workPath = `work/${id}`;
  const commitMessage = message ?? defaultCloseMessage(id);
  stageWorkItem(root, workPath);
  const committed = stagedFiles(root);
  const commit = commitStaged(root, commitMessage, [workPath]);
  return { ...readState(id, root), commit, message: commitMessage, committed: commit ? committed : [], dirty: dirtyPaths(root) };
}
