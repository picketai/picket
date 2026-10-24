// Where the read-only sources live on disk, for the guards (D-008). A source is declared in the
// project config with an env root; protectionScope says what that root protects. Read from the filesystem, never by spawning git: a guard runs on every tool
// call and must stay inside the hook budget.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, type Stats } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { loadConfig } from "../config.mjs";
import type { Source } from "./source.mts";

export type Platform = NodeJS.Platform;
export type ProtectionScope = { kind: "folder" | "repository"; paths: string[]; topLevel: boolean };
export type SourceRoot = { name: string; paths: string[] };

/**
 * One spelling per location: symlinks and Windows 8.3 short names (`RUNNER~1`) resolved,
 * forward slashes, lowercase on Windows. A path that does not exist yet (a Write target) is
 * canonicalised through its nearest existing ancestor.
 */
export function canonicalPath(p: string, platform: Platform): string {
  let head = resolve(p);
  const tail: string[] = [];
  while (!existsSync(head)) {
    const up = dirname(head);
    if (up === head) break;
    tail.unshift(basename(head));
    head = up;
  }
  let real = head;
  try {
    real = realpathSync.native(head);
  } catch {}
  const out = join(real, ...tail).replaceAll("\\", "/").replace(/\/+$/, "");
  return platform === "win32" ? out.toLowerCase() : out;
}

function readText(file: string): string | null {
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return null;
  }
}

/** The repository's common git dir: `<root>/.git`, or, for a linked worktree, the one its `commondir` names. */
function commonGitDir(root: string): string | null {
  const dotGit = join(root, ".git");
  let stat: Stats;
  try {
    stat = statSync(dotGit);
  } catch {
    return null;
  }
  if (stat.isDirectory()) return dotGit;
  const gitdir = readText(dotGit)?.match(/^gitdir:\s*(.+)$/m)?.[1];
  if (!gitdir) return null;
  const own = isAbsolute(gitdir) ? gitdir : resolve(root, gitdir);
  const common = readText(join(own, "commondir"));
  return common ? resolve(own, common) : own;
}

/** The top of the repository holding `dir`: the nearest ancestor (or itself) with a `.git` entry. */
export function enclosingRepo(dir: string): string | null {
  let cur = resolve(dir);
  for (;;) {
    if (existsSync(join(cur, ".git"))) return cur;
    const up = dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

/**
 * What a source root protects (D-008 r3), with the reason so preflight can name it:
 * - `folder`: the root is in no repository, or in this project's own repository (any of its
 *   worktrees), so only the root folder is protected and the project stays writable;
 * - `repository`: the root is inside another repository, so that repository's top level and every
 *   linked worktree are protected (`D:\analysis\docs` protects all of `D:\analysis`).
 * `topLevel` says whether the root is itself a worktree's top level.
 */
export function protectionScope(sourceRoot: string, projectRoot: string, platform: Platform): ProtectionScope {
  const canonical = (p: string) => canonicalPath(p, platform);
  const repo = enclosingRepo(sourceRoot);
  const common = repo && commonGitDir(repo);
  const topLevel = repo !== null && canonical(repo) === canonical(sourceRoot);
  const ownCommon = commonGitDir(enclosingRepo(projectRoot) ?? projectRoot);
  if (!repo || !common || (ownCommon && canonical(common) === canonical(ownCommon))) {
    return { kind: "folder", paths: [canonical(sourceRoot)], topLevel };
  }
  return { kind: "repository", paths: worktreePaths(repo, common, platform), topLevel };
}

/** Every worktree of the repository at `root` (common git dir `common`): the main one and each linked one still on disk. */
function worktreePaths(root: string, common: string, platform: Platform): string[] {
  const paths = [root];
  if (basename(common) === ".git") paths.push(dirname(common)); // the main worktree
  let entries: string[] = [];
  try {
    entries = readdirSync(join(common, "worktrees"));
  } catch {}
  for (const name of entries) {
    const gitFile = readText(join(common, "worktrees", name, "gitdir")); // <worktree>/.git
    if (gitFile) paths.push(dirname(isAbsolute(gitFile) ? gitFile : resolve(common, "worktrees", name, gitFile)));
  }
  return [...new Set(paths.filter((p) => existsSync(p)).map((p) => canonicalPath(p, platform)))];
}

/**
 * The protected paths of each reachable source; empty when none is declared or none has a root,
 * so the guards then behave exactly as before.
 */
export function sourceRoots(projectRoot: string, env: NodeJS.ProcessEnv, platform: Platform): SourceRoot[] {
  const { sources } = loadConfig(projectRoot, env) as unknown as { sources: Source[] };
  return sources.flatMap((s) => (s.root ? [{ name: s.name, paths: protectionScope(s.root, projectRoot, platform).paths }] : []));
}

/** The name of the source whose worktree holds `absPath`, or null. */
export function underSource(absPath: string, roots: readonly SourceRoot[], platform: Platform): string | null {
  if (!roots.length) return null;
  const p = canonicalPath(absPath, platform);
  for (const { name, paths } of roots) {
    if (paths.some((root) => p === root || p.startsWith(root + "/"))) return name;
  }
  return null;
}
