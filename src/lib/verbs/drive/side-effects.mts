import { rmSync } from "node:fs";
import { join } from "node:path";
import { GitFailed, gitRead, gitRun } from "../../util/git.mts";

export type TreeSnapshot = { modified: string[]; untracked: string[] };
export type SideEffects = { dirtied: string[]; created: string[]; restored: string[]; removed: string[] };

const RENAME_OR_COPY = /^[RC]|^.[RC]/;
const STATUS_PREFIX_CHARS = 3;

function nulEntries(root: string, args: string[]): string[] {
  return (gitRead(root, args) ?? "").split("\0").filter(Boolean);
}

function currentPaths(statusEntries: string[]): string[] {
  const paths: string[] = [];
  for (let i = 0; i < statusEntries.length; i++) {
    paths.push(statusEntries[i].slice(STATUS_PREFIX_CHARS));
    if (RENAME_OR_COPY.test(statusEntries[i])) i++;
  }
  return paths;
}

export function treeSnapshot(root: string): TreeSnapshot {
  return {
    modified: currentPaths(nulEntries(root, ["status", "--porcelain", "-z", "--untracked-files=no"])),
    untracked: nulEntries(root, ["ls-files", "-z", "--others", "--exclude-standard"]),
  };
}

function checkout(root: string, paths: string[]): string[] {
  if (!paths.length) return [];
  try {
    gitRun(root, ["--literal-pathspecs", "checkout", "--", ...paths]);
    return paths;
  } catch (err) {
    if (err instanceof GitFailed) return [];
    throw err;
  }
}

function removeFiles(root: string, paths: string[]): string[] {
  return paths.filter((path) => {
    try {
      rmSync(join(root, path), { force: true });
      return true;
    } catch {
      return false;
    }
  });
}

export function restoreSideEffects(root: string, before: TreeSnapshot, keep: boolean): SideEffects {
  const after = treeSnapshot(root);
  const dirtied = after.modified.filter((path) => !before.modified.includes(path));
  const created = after.untracked.filter((path) => !before.untracked.includes(path));
  if (keep) return { dirtied, created, restored: [], removed: [] };
  return { dirtied, created, restored: checkout(root, dirtied), removed: removeFiles(root, created) };
}
