// Nested repositories: product repos cloned inside the project (an umbrella), each with its own .git.
// The root's `git diff` sees such a repo only as one untracked entry (`src/Orders/`), so the review
// summary diffs each one in its own work tree, against the HEAD it had when the work item opened.
import { existsSync, readdirSync, writeFileSync, type Dirent } from "node:fs";
import { join } from "node:path";
import { readText } from "../util/io.mts";
import { parse, stringify } from "../util/yaml-lite.mjs";
import { revParse } from "./git.mts";
import { branchingManifestPath } from "./paths.mts";
import { workFile, type WorkId } from "./work/files.mts";

export type RepoEntry = { path: string; default_branch: string | null };
export type RepoBase = { path: string; base: string };

type ManifestRepo = { path?: unknown; default_branch?: unknown } | null;

/** yaml-lite keeps an inline `# comment` as part of the value; the manifest has them. */
function uncomment(value: unknown): string | null {
  return typeof value === "string" ? value.replace(/\s+#.*$/, "").trim() : null;
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
    .map((r) => ({ path: uncomment(r?.path)?.replace(/\\/g, "/").replace(/\/+$/, "") ?? "", default_branch: uncomment(r?.default_branch) || null }))
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
  if (repos.length) writeFileSync(workFile(root, id, "repos.yaml"), stringify({ repos }) + "\n");
  return repos;
}

export function readBases(root: string, id: WorkId): Record<string, string> {
  const text = readText(workFile(root, id, "repos.yaml"));
  if (text === null) return {};
  const { repos } = parse(text) as { repos?: { path?: string; base?: unknown }[] | null };
  return Object.fromEntries((repos ?? []).filter((r) => r?.path && r?.base).map((r) => [r.path, String(r.base)]));
}
