// Read-only git helpers. Every function returns data, never throws on a missing repo.
import { execFileSync } from "node:child_process";
import { BOOKKEEPING_PREFIXES } from "./paths.mjs";

function git(root, args) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trimEnd();
  } catch {
    return null;
  }
}

export function isRepo(root) {
  return git(root, ["rev-parse", "--is-inside-work-tree"]) === "true";
}

export function branch(root) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

export function head(root) {
  return git(root, ["rev-parse", "--short", "HEAD"]);
}

/** The full sha a revision names, or null. */
export function revParse(root, rev) {
  return git(root, ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]);
}

/** The work tree (main or linked) that has `refs/heads/<branch>` checked out, or null. */
export function worktreeOnBranch(repo, branchName) {
  const out = git(repo, ["worktree", "list", "--porcelain"]);
  if (!out) return null;
  for (const block of out.split(/\r?\n\r?\n/)) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (path && block.match(/^branch (.+)$/m)?.[1] === `refs/heads/${branchName}`) return path;
  }
  return null;
}

export function mergeBase(repo, a, b) {
  return git(repo, ["merge-base", a, b]);
}

/** The branch `origin/HEAD` points at, else the first local main, master or trunk; null when none. */
export function defaultBranch(repo) {
  const remote = git(repo, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  if (remote) return remote.replace(/^origin\//, "");
  return ["main", "master", "trunk"].find((b) => revParse(repo, `refs/heads/${b}`)) ?? null;
}

export const NON_PRODUCT_PREFIXES = Object.freeze([...BOOKKEEPING_PREFIXES, "artifacts/"]);

export function isNonProduct(path) {
  return NON_PRODUCT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function dirtyPaths(root, ignorePrefixes = BOOKKEEPING_PREFIXES) {
  const out = git(root, ["status", "--porcelain", "--untracked-files=all"]);
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .filter((p) => !ignorePrefixes.some((pre) => p.startsWith(pre)));
}

/** Paths changed since a commit, working tree included, plus untracked files. */
export function changedSince(root, base) {
  const diffed = git(root, ["diff", "--name-only", base]) ?? "";
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]) ?? "";
  return [...new Set([...diffed.split(/\r?\n/), ...untracked.split(/\r?\n/)].map((s) => s.trim()).filter(Boolean))].sort();
}

export function linesAddedSince(root, base, excluded = isNonProduct) {
  const out = git(root, ["diff", "--numstat", base]) ?? "";
  let added = 0;
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\t(\d+)\t(.+)$/);
    if (m && !excluded(m[3])) added += Number(m[1]);
  }
  return added;
}

export function log1(root) {
  return git(root, ["log", "-1", "--format=%h %s"]);
}

/** Paths in the index that differ from HEAD: what a commit would take right now. */
export function stagedFiles(root) {
  const out = git(root, ["diff", "--cached", "--name-only"]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Commit whatever is staged, nothing more, and return the short sha; null when nothing is staged.
 * The developer stages a phase and ends its turn; the user's approval is what turns the index
 * into a commit, so a rejected phase never lands in history.
 */
export function commitStaged(root, message, alsoAdd = []) {
  // The work item's own state (markers, verdicts) rides along, so history shows the phase and the
  // decision that let it in as one commit.
  for (const p of alsoAdd) git(root, ["add", "-A", "--", p]);
  if (!stagedFiles(root).length) return null;
  try {
    execFileSync("git", ["-C", root, "commit", "-q", "-m", message], { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  } catch (err) {
    throw new Error(`git commit failed: ${String(err.stderr ?? err.message).trim().split("\n").at(-1)}`);
  }
  return git(root, ["rev-parse", "--short", "HEAD"]);
}
