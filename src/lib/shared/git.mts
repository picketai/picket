import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { gitRead, gitRun, type GitRunOptions } from "../util/git.mts";
import { BOOKKEEPING_PREFIXES } from "./paths.mts";

const FILE_BUFFER = 64 * 1024 * 1024;

export type WorkingState = { branch: string | null; state: "conflict" | "unstaged" | "staged" | "clean" };
export type CommitOptions = { add?: string[]; owns: (path: string) => boolean; env: NodeJS.ProcessEnv };
export type CommitResult = { sha: string | null; committed: string[]; left_staged: string[]; warnings: string[] };

export function isRepo(root: string): boolean {
  return gitRead(root, ["rev-parse", "--is-inside-work-tree"]) === "true";
}

export function repoPrefix(root: string): string {
  return gitRead(root, ["rev-parse", "--show-prefix"]) ?? "";
}

export function filesInCommit(root: string, rev: string): string[] {
  const out = gitRead(root, ["show", "--name-only", "--format=", rev]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function branch(root: string): string | null {
  return gitRead(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function changeState(entries: string[]): WorkingState["state"] {
  if (entries.some((line) => line.startsWith("u "))) return "conflict";
  const codes = entries.map((line) => line.slice(2, 4));
  if (codes.some(([, worktree]) => worktree !== ".")) return "unstaged";
  if (codes.some(([index]) => index !== ".")) return "staged";
  return "clean";
}

export function workingState(root: string): WorkingState | null {
  const out = gitRead(root, ["status", "--porcelain=v2", "--branch", "--untracked-files=no"]);
  if (out === null) return null;
  const lines = out.split(/\r?\n/);
  const header = (key: string) => lines.find((line) => line.startsWith(`# branch.${key} `))?.slice(`# branch.${key} `.length) ?? null;
  const name = header("head");
  return {
    branch: name === "(detached)" ? (header("oid") ?? "").slice(0, 7) : name,
    state: changeState(lines.filter((line) => /^[12u] /.test(line))),
  };
}

export function head(root: string): string | null {
  return gitRead(root, ["rev-parse", "--short", "HEAD"]);
}

/** The full sha a revision names, or null. */
export function revParse(root: string, rev: string): string | null {
  return gitRead(root, ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]);
}

/** The work tree (main or linked) that has `refs/heads/<branch>` checked out, or null. */
export function worktreeOnBranch(repo: string, branchName: string): string | null {
  const out = gitRead(repo, ["worktree", "list", "--porcelain"]);
  if (!out) return null;
  for (const block of out.split(/\r?\n\r?\n/)) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (path && block.match(/^branch (.+)$/m)?.[1] === `refs/heads/${branchName}`) return path;
  }
  return null;
}

export function mergeBase(repo: string, a: string, b: string): string | null {
  return gitRead(repo, ["merge-base", a, b]);
}

/** The branch `origin/HEAD` points at, else the first local main, master or trunk; null when none. */
export function defaultBranch(repo: string): string | null {
  const remote = gitRead(repo, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  if (remote) return remote.replace(/^origin\//, "");
  return ["main", "master", "trunk"].find((b) => revParse(repo, `refs/heads/${b}`)) ?? null;
}

export const NON_PRODUCT_PREFIXES = Object.freeze([...BOOKKEEPING_PREFIXES, "artifacts/"]);

export function isNonProduct(path: string): boolean {
  return NON_PRODUCT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function dirtyPaths(root: string, ignorePrefixes: readonly string[] = BOOKKEEPING_PREFIXES): string[] {
  const out = gitRead(root, ["status", "--porcelain", "--untracked-files=all"]);
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .filter((p) => !ignorePrefixes.some((pre) => p.startsWith(pre)));
}

/** Paths changed since a commit, working tree included, plus untracked files. */
export function changedSince(root: string, base: string): string[] {
  const diffed = gitRead(root, ["diff", "--name-only", base]) ?? "";
  const untracked = gitRead(root, ["ls-files", "--others", "--exclude-standard"]) ?? "";
  return [...new Set([...diffed.split(/\r?\n/), ...untracked.split(/\r?\n/)].map((s) => s.trim()).filter(Boolean))].sort();
}

export function fileAt(root: string, rev: string, path: string): string {
  return gitRead(root, ["show", `${rev}:${path}`], { maxBuffer: FILE_BUFFER }) ?? "";
}

export function deletedSince(root: string, base: string, head: string | null = null): string[] {
  const out = gitRead(root, ["diff", "--name-only", "--diff-filter=D", base, ...(head ? [head] : [])]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).sort();
}

export function rangeFiles(root: string, base: string, head: string): string[] {
  const out = gitRead(root, ["diff", "--name-only", base, head]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function diffStat(root: string, base: string, head: string | null): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of (gitRead(root, ["diff", "--numstat", base, ...(head ? [head] : [])]) ?? "").split(/\r?\n/)) {
    const m = line.match(/^(\d+)\t(\d+)\t/);
    if (m) {
      added += Number(m[1]);
      removed += Number(m[2]);
    }
  }
  return { added, removed };
}

function addedLines(numstat: string, excluded: (path: string) => boolean): number {
  let added = 0;
  for (const line of numstat.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\t(\d+)\t(.+)$/);
    if (m && !excluded(m[3])) added += Number(m[1]);
  }
  return added;
}

export function linesAddedSince(root: string, base: string, excluded: (path: string) => boolean = isNonProduct): number {
  return addedLines(gitRead(root, ["diff", "--numstat", base]) ?? "", excluded);
}

export function productLinesAdded(root: string, sha: string): number {
  return addedLines(gitRead(root, ["show", "--numstat", "--relative", "--format=", sha]) ?? "", isNonProduct);
}

export function log1(root: string): string | null {
  return gitRead(root, ["log", "-1", "--format=%h %s"]);
}

/** Paths in the index that differ from HEAD: what a commit would take right now. */
export function stagedFiles(root: string): string[] {
  const out = gitRead(root, ["diff", "--cached", "--name-only"]) ?? "";
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function listedPathMatcher(root: string, listed: unknown[]): (path: string) => boolean {
  const prefix = repoPrefix(root);
  const entries = listed.map((p) => prefix + String(p).replace(/\\/g, "/").replace(/^\.\//, ""));
  return (path) => entries.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
}

function gitStrict(cwd: string, args: string[], options: GitRunOptions): string {
  return gitRun(cwd, ["--literal-pathspecs", ...args], options);
}

function withIndex(env: NodeJS.ProcessEnv, index: string): NodeJS.ProcessEnv {
  return { ...env, GIT_INDEX_FILE: index };
}

function nulList(out: string | null): string[] {
  return (out ?? "").split("\0").filter(Boolean);
}

function nulInput(paths: string[]): string {
  return paths.map((p) => `${p}\0`).join("");
}

function stagedPathsNoRenames(top: string): string[] {
  return nulList(gitRead(top, ["--literal-pathspecs", "diff", "--cached", "--name-only", "--no-renames", "-z"]));
}

function entryPath(entry: string): string {
  return entry.slice(entry.indexOf("\t") + 1);
}

function buildTemporaryIndex(top: string, env: NodeJS.ProcessEnv, index: string, base: string | null, owned: string[]): void {
  const indexEnv = withIndex(env, index);
  gitStrict(top, base ? ["read-tree", base] : ["read-tree", "--empty"], { env: indexEnv });
  const wanted = new Set(owned);
  const entries = nulList(gitStrict(top, ["ls-files", "-s", "-z"], { env })).filter((entry) => wanted.has(entryPath(entry)));
  if (entries.length) gitStrict(top, ["update-index", "-z", "--index-info"], { env: indexEnv, input: nulInput(entries) });
  const present = new Set(entries.map(entryPath));
  const deleted = owned.filter((path) => !present.has(path));
  if (deleted.length) gitStrict(top, ["update-index", "--force-remove", "-z", "--stdin"], { env: indexEnv, input: nulInput(deleted) });
}

export function commitOwned(root: string, message: string, { add = [], owns, env }: CommitOptions): CommitResult {
  for (const p of add) gitRead(root, ["--literal-pathspecs", "add", "-A", "--", p]);
  const top = gitRead(root, ["rev-parse", "--show-toplevel"]);
  const staged = top ? stagedPathsNoRenames(top) : [];
  const committed = staged.filter((path) => owns(path));
  const left_staged = staged.filter((path) => !owns(path));
  if (!top || !committed.length) return { sha: null, committed, left_staged, warnings: [] };

  const index = resolve(root, gitRead(root, ["rev-parse", "--git-path", "picket-commit.index"]) ?? "");
  const before = revParse(top, "HEAD");
  try {
    buildTemporaryIndex(top, env, index, before, committed);
    gitStrict(top, ["commit", "-q", "-m", message], { env: withIndex(env, index) });
  } finally {
    rmSync(index, { force: true });
  }
  const sha = head(top);
  const warnings = revParse(top, `${sha}^`) === before ? [] : [`HEAD moved during the commit; check ${sha}`];
  gitStrict(top, ["reset", "-q", "--pathspec-from-file=-", "--pathspec-file-nul"], { env, input: nulInput(committed) });
  return { sha, committed, left_staged, warnings };
}
