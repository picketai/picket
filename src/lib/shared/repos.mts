// Nested repositories: product repos cloned inside the project (an umbrella), each with its own .git.
// The root's `git diff` sees such a repo only as one untracked entry (`src/Orders/`), so the review
// summary diffs each one in its own work tree, against the HEAD it had when the work item opened.
import { existsSync, readdirSync, writeFileSync, type Dirent } from "node:fs";
import { join } from "node:path";
import { readText } from "../util/io.mts";
import { parse, stringify } from "../util/yaml-lite.mts";
import { revParse } from "./git.mts";
import { branchingManifestPath } from "./paths.mts";
import { workFile, type WorkId } from "./work/files.mts";

export type RepoEntry = { path: string; default_branch: string | null };
export type RepoBase = { path: string; base: string };

type ManifestRepo = { path?: unknown; default_branch?: unknown } | null;

function stringOf(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function manifestRepos(file: string): ManifestRepo[] {
  const text = readText(file);
  if (text === null) return [];
  try {
    return (parse(text) as { repos?: ManifestRepo[] }).repos ?? [];
  } catch {
    return []; // an unparsable manifest falls back to the src/ scan
  }
}

function fromManifest(root: string): RepoEntry[] {
  return manifestRepos(branchingManifestPath(root))
    .map((r) => ({ path: stringOf(r?.path)?.replace(/\\/g, "/").replace(/\/+$/, "") ?? "", default_branch: stringOf(r?.default_branch) || null }))
    .filter((r) => r.path && r.path !== ".");
}

function fromSrcScan(root: string): RepoEntry[] {
  const src = join(root, "src");
  let entries: Dirent[];
  try {
    entries = readdirSync(src, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && existsSync(join(src, e.name, ".git")))
    .map((e) => ({ path: `src/${e.name}`, default_branch: null }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * The nested repos of the project: the manifest's entries other than `.`, else every immediate
 * child of `src/` holding a `.git` entry.
 */
export function nestedRepos(root: string): RepoEntry[] {
  const listed = fromManifest(root);
  return listed.length ? listed : fromSrcScan(root);
}

/** Records each nested repo's HEAD as the work item's base for it. Writes nothing when there are none. */
export function recordBases(root: string, id: WorkId): RepoBase[] {
  const repos = nestedRepos(root).flatMap((r) => {
    const base = revParse(join(root, r.path), "HEAD");
    return base ? [{ path: r.path, base }] : [];
  });
  if (repos.length) writeLayout(root, id, { worktrees: null, repos });
  return repos;
}

export type RepoLayout = { path: string; base: string | null; from?: string; worktree?: string };
export type ItemLayout = { nested: string[]; worktrees: "none" | null; repos: RepoLayout[] };
export type RecordedLayout = Omit<ItemLayout, "nested">;

type RepoRow = { path?: unknown; base?: unknown; from?: unknown; worktree?: unknown } | null;

function repoLayout(row: RepoRow): RepoLayout[] {
  const path = stringOf(row?.path);
  if (!path) return [];
  const from = stringOf(row?.from);
  const worktree = stringOf(row?.worktree);
  return [{ path, base: row?.base ? String(row.base) : null, ...(from ? { from } : {}), ...(worktree ? { worktree } : {}) }];
}

function readRecorded(root: string, id: WorkId): RecordedLayout {
  const text = readText(workFile(root, id, "repos.yaml"));
  if (text === null) return { worktrees: null, repos: [] };
  const { repos, worktrees } = parse(text) as { repos?: RepoRow[] | null; worktrees?: unknown };
  return { worktrees: worktrees === "none" ? "none" : null, repos: (repos ?? []).flatMap(repoLayout) };
}

export function readLayout(root: string, id: WorkId): ItemLayout {
  return { nested: nestedRepos(root).map((r) => r.path), ...readRecorded(root, id) };
}

function repoRow({ path, base, from, worktree }: RepoLayout): Record<string, string> {
  return { path, ...(base ? { base } : {}), ...(from ? { from } : {}), ...(worktree ? { worktree } : {}) };
}

export function writeLayout(root: string, id: WorkId, { worktrees, repos }: RecordedLayout): void {
  const file = { ...(worktrees ? { worktrees } : {}), ...(repos.length ? { repos: repos.map(repoRow) } : {}) };
  writeFileSync(workFile(root, id, "repos.yaml"), stringify(file) + "\n");
}

export function readBases(root: string, id: WorkId): Record<string, string> {
  return Object.fromEntries(readRecorded(root, id).repos.flatMap((r) => (r.base ? [[r.path, r.base]] : [])));
}
