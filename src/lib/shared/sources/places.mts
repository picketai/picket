import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { gitRead } from "../../util/git.mts";
import type { Lookup } from "./resolve.mts";
import type { ReachableSource } from "./source.mts";

export const SOURCE_MAX_BUFFER = 64 * 1024 * 1024;

export type Worktree = { path: string; branch: string | null; commit: string | null; main: boolean };

export type Branch = { branch: string; commit: string; checked_out: boolean };

export type Place = { kind: "worktree" | "branch"; label: string; worktree: string | null; branch: string | null; commit: string | null; main: boolean };

export type Candidate = Omit<Place, "kind"> & { sha256: string; dirty: boolean; bytes: Uint8Array };

function read(root: string, args: string[]): string | null {
  return gitRead(root, args, { maxBuffer: SOURCE_MAX_BUFFER });
}

function readBytes(root: string, args: string[]): Buffer | null {
  return gitRead(root, args, { maxBuffer: SOURCE_MAX_BUFFER, buffer: true });
}

export function listWorktrees(sourceRoot: string): Worktree[] {
  const out = read(sourceRoot, ["worktree", "list", "--porcelain"]);
  if (!out) return [];
  const trees: Worktree[] = [];
  for (const block of out.split(/\r?\n\r?\n/)) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (!path || /^(bare|prunable)\b/m.test(block)) continue;
    trees.push({ path, branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null, commit: block.match(/^HEAD (\w+)$/m)?.[1] ?? null, main: trees.length === 0 });
  }
  return trees.filter((t) => existsSync(t.path));
}

export function localBranches(sourceRoot: string, worktrees: readonly Worktree[] = listWorktrees(sourceRoot)): Branch[] {
  const out = read(sourceRoot, ["for-each-ref", "--format=%(refname:short)%09%(objectname)", "refs/heads"]) ?? "";
  const checkedOut = new Set(worktrees.map((w) => w.branch).filter(Boolean));
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [branch, commit] = line.split("\t");
      return { branch, commit, checked_out: checkedOut.has(branch) };
    });
}

export function places(sourceRoot: string): Place[] {
  const worktrees = listWorktrees(sourceRoot);
  return [
    ...worktrees.map((w): Place => ({ kind: "worktree", label: w.branch ?? basename(w.path), worktree: w.path, branch: w.branch, commit: w.commit, main: w.main })),
    ...localBranches(sourceRoot, worktrees)
      .filter((b) => !b.checked_out)
      .map((b): Place => ({ kind: "branch", label: b.branch, worktree: null, branch: b.branch, commit: b.commit, main: false })),
  ];
}

export function contentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes).toString("latin1").replace(/\r\n/g, "\n"), "latin1").digest("hex");
}

function versionAt(source: ReachableSource, place: Place, path: string): { bytes: Uint8Array; dirty: boolean } | null {
  if (place.kind === "branch") {
    const bytes = readBytes(source.root, ["cat-file", "blob", `${place.branch}:${path}`]);
    return bytes ? { bytes, dirty: false } : null;
  }
  const worktree = place.worktree as string;
  const file = join(worktree, path);
  if (!statSync(file, { throwIfNoEntry: false })?.isFile()) return null;
  return { bytes: readFileSync(file), dirty: Boolean(read(worktree, ["status", "--porcelain", "--", path])?.trim()) };
}

export function candidates(source: ReachableSource, path: string, where: readonly Place[]): Candidate[] {
  const out: Candidate[] = [];
  for (const p of where) {
    const version = versionAt(source, p, path);
    if (!version) continue;
    out.push({ label: p.label, worktree: p.worktree, branch: p.branch, commit: p.commit, main: p.main, sha256: contentHash(version.bytes), dirty: version.dirty, bytes: version.bytes });
  }
  return out;
}

export function liveLookup(): Lookup {
  const placesByRoot = new Map<string, Place[]>();
  const placesOf = (source: ReachableSource): Place[] => {
    const known = placesByRoot.get(source.root);
    if (known) return known;
    const found = places(source.root);
    placesByRoot.set(source.root, found);
    return found;
  };
  return {
    candidates: (source, path) => candidates(source, path, placesOf(source)),
    labels: (source) => placesOf(source).map((p) => p.label),
  };
}
