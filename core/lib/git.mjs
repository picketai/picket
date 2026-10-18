// Read-only git helpers. Every function returns data, never throws on a missing repo.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
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

export function repoPrefix(root) {
  return git(root, ["rev-parse", "--show-prefix"]) ?? "";
}

export function filesInCommit(root, rev) {
  const out = git(root, ["show", "--name-only", "--format=", rev]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function branch(root) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function changeState(entries) {
  if (entries.some((line) => line.startsWith("u "))) return "conflict";
  const codes = entries.map((line) => line.slice(2, 4));
  if (codes.some(([, worktree]) => worktree !== ".")) return "unstaged";
  if (codes.some(([index]) => index !== ".")) return "staged";
  return "clean";
}

export function workingState(root) {
  const out = git(root, ["status", "--porcelain=v2", "--branch", "--untracked-files=no"]);
  if (out === null) return null;
  const lines = out.split(/\r?\n/);
  const header = (key) => lines.find((line) => line.startsWith(`# branch.${key} `))?.slice(`# branch.${key} `.length) ?? null;
  const name = header("head");
  return {
    branch: name === "(detached)" ? (header("oid") ?? "").slice(0, 7) : name,
    state: changeState(lines.filter((line) => /^[12u] /.test(line))),
  };
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

function addedLines(numstat, excluded) {
  let added = 0;
  for (const line of numstat.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\t(\d+)\t(.+)$/);
    if (m && !excluded(m[3])) added += Number(m[1]);
  }
  return added;
}

export function linesAddedSince(root, base, excluded = isNonProduct) {
  return addedLines(git(root, ["diff", "--numstat", base]) ?? "", excluded);
}

export function productLinesAdded(root, sha) {
  return addedLines(git(root, ["show", "--numstat", "--relative", "--format=", sha]) ?? "", isNonProduct);
}

export function log1(root) {
  return git(root, ["log", "-1", "--format=%h %s"]);
}

/** Paths in the index that differ from HEAD: what a commit would take right now. */
export function stagedFiles(root) {
  const out = git(root, ["diff", "--cached", "--name-only"]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

const TEST_DIRS = new Set(["test", "tests", "__tests__", "spec"]);
const TEST_FILE_PATTERNS = [/\.(test|spec)\.[^.]+$/, /_test\.go$/, /^test_.*\.py$/, /Tests\.cs$/];

export function isTestPath(path) {
  const segments = String(path).replace(/\\/g, "/").split("/");
  const name = segments.pop();
  if (segments.some((dir) => TEST_DIRS.has(dir) || /\.Tests$/.test(dir))) return true;
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

export function listedPathMatcher(root, listed) {
  const prefix = repoPrefix(root);
  const entries = listed.map((p) => prefix + String(p).replace(/\\/g, "/").replace(/^\.\//, ""));
  return (path) => entries.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
}

function gitStrict(cwd, args, { index, input } = {}) {
  return execFileSync("git", ["-C", cwd, "--literal-pathspecs", ...args], {
    encoding: "utf8",
    input,
    env: index ? { ...process.env, GIT_INDEX_FILE: index } : process.env,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  });
}

function nulList(out) {
  return (out ?? "").split("\0").filter(Boolean);
}

function nulInput(paths) {
  return paths.map((p) => `${p}\0`).join("");
}

function stagedPathsNoRenames(top) {
  return nulList(git(top, ["--literal-pathspecs", "diff", "--cached", "--name-only", "--no-renames", "-z"]));
}

function entryPath(entry) {
  return entry.slice(entry.indexOf("\t") + 1);
}

function buildTemporaryIndex(top, index, base, owned) {
  gitStrict(top, base ? ["read-tree", base] : ["read-tree", "--empty"], { index });
  const wanted = new Set(owned);
  const entries = nulList(gitStrict(top, ["ls-files", "-s", "-z"])).filter((entry) => wanted.has(entryPath(entry)));
  if (entries.length) gitStrict(top, ["update-index", "-z", "--index-info"], { index, input: nulInput(entries) });
  const present = new Set(entries.map(entryPath));
  const deleted = owned.filter((path) => !present.has(path));
  if (deleted.length) gitStrict(top, ["update-index", "--force-remove", "-z", "--stdin"], { index, input: nulInput(deleted) });
}

function commitIndex(top, index, message) {
  try {
    gitStrict(top, ["commit", "-q", "-m", message], { index });
  } catch (err) {
    throw new Error(`git commit failed: ${String(err.stderr ?? err.message).trim().split("\n").at(-1)}`);
  }
}

export function commitOwned(root, message, { add = [], owns }) {
  for (const p of add) git(root, ["--literal-pathspecs", "add", "-A", "--", p]);
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  const staged = top ? stagedPathsNoRenames(top) : [];
  const committed = staged.filter((path) => owns(path));
  const left_staged = staged.filter((path) => !owns(path));
  if (!committed.length) return { sha: null, committed, left_staged, warnings: [] };

  const index = resolve(root, git(root, ["rev-parse", "--git-path", "picket-commit.index"]));
  const before = revParse(top, "HEAD");
  try {
    buildTemporaryIndex(top, index, before, committed);
    commitIndex(top, index, message);
  } finally {
    rmSync(index, { force: true });
  }
  const sha = head(top);
  const warnings = revParse(top, `${sha}^`) === before ? [] : [`HEAD moved during the commit; check ${sha}`];
  gitStrict(top, ["reset", "-q", "--pathspec-from-file=-", "--pathspec-file-nul"], { input: nulInput(committed) });
  return { sha, committed, left_staged, warnings };
}
