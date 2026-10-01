// Read-only access to a source: a repository outside the project (config.mjs) whose documents the
// stories refer to. A source has several worktrees and branches, so every lookup searches all of
// them: each worktree's working copy, plus every local branch no worktree has checked out.
// Nothing here writes to a source; every git call is a read.
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

export const HIT_CAP = 200;

function git(repo, args, { buffer = false } = {}) {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: buffer ? null : "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/**
 * Every live worktree of the source, main first.
 * @returns {Array<{ path: string, branch: string|null, commit: string|null, main: boolean }>}
 */
export function listWorktrees(sourceRoot) {
  const out = git(sourceRoot, ["worktree", "list", "--porcelain"]);
  if (!out) return [];
  const trees = [];
  for (const block of out.split(/\r?\n\r?\n/)) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (!path || /^(bare|prunable)\b/m.test(block)) continue;
    trees.push({ path, branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null, commit: block.match(/^HEAD (\w+)$/m)?.[1] ?? null, main: trees.length === 0 });
  }
  return trees.filter((t) => existsSync(t.path));
}

/** @returns {Array<{ branch: string, commit: string, checked_out: boolean }>} */
export function localBranches(sourceRoot, worktrees = listWorktrees(sourceRoot)) {
  const out = git(sourceRoot, ["for-each-ref", "--format=%(refname:short)%09%(objectname)", "refs/heads"]) ?? "";
  const checkedOut = new Set(worktrees.map((w) => w.branch).filter(Boolean));
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [branch, commit] = line.split("\t");
      return { branch, commit, checked_out: checkedOut.has(branch) };
    });
}

/**
 * The places a lookup searches, in a fixed order: worktrees (main first), then the branches no
 * worktree has checked out. A worktree's label is its branch, or its folder name when detached.
 */
export function places(sourceRoot) {
  const worktrees = listWorktrees(sourceRoot);
  return [
    ...worktrees.map((w) => ({ kind: "worktree", label: w.branch ?? basename(w.path), worktree: w.path, branch: w.branch, commit: w.commit })),
    ...localBranches(sourceRoot, worktrees)
      .filter((b) => !b.checked_out)
      .map((b) => ({ kind: "branch", label: b.branch, worktree: null, branch: b.branch, commit: b.commit })),
  ];
}

/** Content hash with CRLF turned into LF, so a checkout under core.autocrlf matches its blob. */
export function contentHash(bytes) {
  return createHash("sha256").update(Buffer.from(bytes).toString("latin1").replace(/\r\n/g, "\n"), "latin1").digest("hex");
}

/**
 * Every version of one document across the source's places.
 * @param {{ root: string }} source
 * @returns {Array<{ label: string, worktree: string|null, branch: string|null, commit: string|null, sha256: string, dirty: boolean, bytes: Buffer }>}
 */
export function candidates(source, path) {
  const out = [];
  for (const p of places(source.root)) {
    let bytes;
    let dirty = false;
    if (p.kind === "worktree") {
      const file = join(p.worktree, path);
      if (!existsSync(file)) continue;
      bytes = readFileSync(file);
      dirty = Boolean(git(p.worktree, ["status", "--porcelain", "--", path])?.trim());
    } else {
      bytes = git(source.root, ["cat-file", "blob", `${p.branch}:${path}`], { buffer: true });
      if (!bytes) continue;
    }
    out.push({ label: p.label, worktree: p.worktree, branch: p.branch, commit: p.commit, sha256: contentHash(bytes), dirty, bytes });
  }
  return out;
}

function capped(map) {
  const entries = [...map.values()].sort((a, b) => a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0));
  return { hits: entries.slice(0, HIT_CAP), overflow: Math.max(0, entries.length - HIT_CAP) };
}

/** Tracked files whose path contains `needle` (case-insensitive), one entry per path with every place. */
export function find(source, needle) {
  const lower = String(needle).toLowerCase();
  const byPath = new Map();
  for (const p of places(source.root)) {
    const listing = p.kind === "worktree" ? git(p.worktree, ["ls-files"]) : git(source.root, ["ls-tree", "-r", "--name-only", p.branch]);
    for (const path of (listing ?? "").split(/\r?\n/)) {
      if (!path || !path.toLowerCase().includes(lower)) continue;
      if (!byPath.has(path)) byPath.set(path, { path, places: [] });
      byPath.get(path).places.push(p.label);
    }
  }
  return capped(byPath);
}

/**
 * `git grep` across every place. Identical hits (same path, line and text) merge into one entry
 * listing every place they occur in.
 */
export function grep(source, regex, { path = null } = {}) {
  const byHit = new Map();
  const pathspec = path ? ["--", path] : [];
  for (const p of places(source.root)) {
    const out = p.kind === "worktree" ? git(p.worktree, ["grep", "-n", "-I", "-z", "-e", regex, ...pathspec]) : git(source.root, ["grep", "-n", "-I", "-z", "-e", regex, p.branch, ...pathspec]);
    for (const line of (out ?? "").split(/\r?\n/)) {
      // -z output: <path>\0<line>\0<text>; on a branch the path is prefixed `<branch>:`
      const [rawPath, lineNo, ...text] = line.split("\0");
      if (!rawPath || !lineNo) continue;
      const hitPath = p.kind === "branch" ? rawPath.slice(p.branch.length + 1) : rawPath;
      const hit = { path: hitPath, line: Number(lineNo), text: text.join("\0") };
      const key = `${hit.path}\0${hit.line}\0${hit.text}`;
      if (!byHit.has(key)) byHit.set(key, { ...hit, places: [] });
      byHit.get(key).places.push(p.label);
    }
  }
  return capped(byHit);
}
