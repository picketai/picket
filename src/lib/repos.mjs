// Nested repositories: product repos cloned inside the project (an umbrella), each with its own .git.
// The root's `git diff` sees such a repo only as one untracked entry (`src/Orders/`), so the review
// summary diffs each one in its own work tree, against the HEAD it had when the work item opened.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "./yaml-lite.mjs";
import { revParse } from "./git.mjs";
import { branchingManifestPath } from "./paths.mjs";

/** yaml-lite keeps an inline `# comment` as part of the value; the manifest has them. */
function uncomment(value) {
  return typeof value === "string" ? value.replace(/\s+#.*$/, "").trim() : null;
}

function fromManifest(root) {
  const file = branchingManifestPath(root);
  if (!existsSync(file)) return [];
  let manifest;
  try {
    manifest = parse(readFileSync(file, "utf8"));
  } catch {
    return []; // an unparsable manifest falls back to the src/ scan
  }
  return (manifest.repos ?? [])
    .map((r) => ({ path: uncomment(r?.path)?.replace(/\\/g, "/").replace(/\/+$/, ""), default_branch: uncomment(r?.default_branch) || null }))
    .filter((r) => r.path && r.path !== ".");
}

function fromSrcScan(root) {
  const src = join(root, "src");
  let entries;
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
 * @returns {Array<{ path: string, default_branch: string|null }>}
 */
export function nestedRepos(root) {
  const listed = fromManifest(root);
  return listed.length ? listed : fromSrcScan(root);
}

function basesFile(id, root) {
  return join(root, "work", id, "repos.yaml");
}

/** Records each nested repo's HEAD as the work item's base for it. Writes nothing when there are none. */
export function recordBases(id, root) {
  const repos = nestedRepos(root)
    .map((r) => ({ path: r.path, base: revParse(join(root, r.path), "HEAD") }))
    .filter((r) => r.base);
  if (repos.length) writeFileSync(basesFile(id, root), stringify({ repos }) + "\n");
  return repos;
}

/** @returns {Record<string, string>} repo path to recorded base sha; empty when repos.yaml is absent */
export function readBases(id, root) {
  const file = basesFile(id, root);
  if (!existsSync(file)) return {};
  const { repos = [] } = parse(readFileSync(file, "utf8"));
  return Object.fromEntries((repos ?? []).filter((r) => r?.path && r?.base).map((r) => [r.path, String(r.base)]));
}
