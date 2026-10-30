// The review summary: everything the reviewer used to detect for itself, computed once by code.
// size class, frameworks, concerns, security paths, changed files, and the diff base, across the
// project root and every nested repo (repos.mjs).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { planPathOf } from "./checkouts.mts";
import { loadExtensions, REVIEW_SIZES } from "./extensions.mjs";
import * as git from "./git.mts";
import { nestedRepos, readLayout, type ItemLayout } from "./repos.mts";
import { securityPathOf } from "./security-paths.mts";
import { deletedTestMoves, normaliseLine, scansPath, silencedMoves } from "./silenced.mjs";
import type { Approval } from "./work/approvals.mts";
import type { WorkState } from "./work/state.mts";

export type Size = "small" | "medium" | "large";
export type QualityBar = Record<string, unknown>;
export type SummaryConfig = { security_paths: readonly string[]; quality: QualityBar };
export type SilencedInput = { dir: string; base: string; head: string | null; files: string[]; prefix: string };
export type RepoChange = {
  path: string;
  worktree: string | null;
  prefix: string;
  base: string | null;
  base_from?: "recorded" | "merge-base";
  changed: string[];
  added: number;
  removed: number;
  skipped?: string;
};
export type ChangeSet = { base: string; head: string | null; files: string[]; planFiles: string[]; added: number; removed: number; silencedInputs: SilencedInput[]; repos: RepoChange[] };
export type ExtensionStep = { extension: string; path: string };
export type Move = { path: string; kind: string; text: string | null };
export type MarkedMove = Move & { waived: boolean };
export type Summary = {
  size: Size;
  changed_files: string[];
  lines_added: number;
  lines_removed: number;
  frameworks: string[];
  concerns: string[];
  security_path: boolean;
  extension_steps: ExtensionStep[];
  silenced: MarkedMove[];
};

type Extension = { name: string; review_steps: { path: string; min_size: Size }[] };

export const SIZE = Object.freeze({ small: { files: 3, lines: 50 }, medium: { files: 10, lines: 400 } });

const DELETED = "\0deleted";

function workingText(dir: string, path: string): string {
  try {
    return readFileSync(join(dir, path), "utf8");
  } catch {
    return "";
  }
}

function silencedIn({ dir, base, head, files, prefix }: SilencedInput, bar: QualityBar): Move[] {
  const deleted = git.deletedSince(dir, base, head).filter((path) => !git.isNonProduct(path));
  const gone = new Set(deleted);
  const after = (path: string) => (head ? git.fileAt(dir, head, path) : workingText(dir, path));
  const edited: Move[] = files
    .filter((path) => !gone.has(path) && scansPath(path))
    .flatMap((path) => silencedMoves({ rel: path, before: git.fileAt(dir, base, path), after: after(path), bar }).map((move: Omit<Move, "path">) => ({ path, ...move })));
  return [...edited, ...(deletedTestMoves(deleted) as Move[])].map((move) => ({ ...move, path: prefix + move.path }));
}

function pathKey(path: string, platform: NodeJS.Platform): string {
  const slashed = String(path).replaceAll("\\", "/");
  return platform === "win32" ? slashed.toLowerCase() : slashed;
}

export function markWaived(moves: readonly Move[], waivers: readonly Approval[], platform: NodeJS.Platform, planPath: (path: string) => string = (path) => path): MarkedMove[] {
  const key = (path: string, text: string) => `${pathKey(planPath(path), platform)}\n${text}`;
  const waived = new Set(waivers.map((w) => key(w.path, w.deleted ? DELETED : normaliseLine(w.text))));
  return moves.map(({ path, kind, text }) => ({ path, kind, text, waived: waived.has(key(path, text ?? DELETED)) }));
}

function unwaived(moves: readonly Move[]): MarkedMove[] {
  return moves.map(({ path, kind, text }) => ({ path, kind, text, waived: false }));
}

export function sizeClass(files: number, lines: number): Size {
  if (files <= SIZE.small.files && lines <= SIZE.small.lines) return "small";
  if (files <= SIZE.medium.files && lines <= SIZE.medium.lines) return "medium";
  return "large";
}

export function extensionSteps(root: string, size: Size, securityPath: boolean): ExtensionStep[] {
  const rank = REVIEW_SIZES.indexOf(size);
  return (loadExtensions(root).enabled as Extension[]).flatMap((extension) =>
    extension.review_steps
      .filter((step) => securityPath || REVIEW_SIZES.indexOf(step.min_size) <= rank)
      .map((step) => ({ extension: extension.name, path: step.path })),
  );
}

export function detectFrameworks(root: string): string[] {
  const out = new Set<string>();
  const pkgPath = join(root, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.typescript || existsSync(join(root, "tsconfig.json"))) out.add("typescript");
    if (deps.react) out.add("react");
  }
  if (hasFile(root, (f) => /\.(csproj|sln)$/.test(f), 3)) out.add("dotnet");
  if (existsSync(join(root, "pyproject.toml")) || existsSync(join(root, "requirements.txt"))) out.add("python");
  return [...out].sort();
}

export function detectConcerns(root: string, changedFiles: string[]): string[] {
  const out = new Set<string>();
  const dirs = new Set(changedFiles.map((f) => f.toLowerCase()));
  const has = (re: RegExp) => [...dirs].some((f) => re.test(f)) || hasFile(root, (f) => re.test(f.toLowerCase()), 4);
  if (has(/(^|\/)(domain|application|infrastructure|usecases?|ports?|adapters?)\//)) out.add("clean-architecture");
  if (has(/(^|\/)(features?|slices?)\/[^/]+\//)) out.add("vertical-slice");
  return [...out].sort();
}

function hasFile(root: string, pred: (rel: string) => boolean, depth: number, dir = root, level = 0): boolean {
  if (level > depth) return false;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name.startsWith(".")) continue;
    const rel = join(dir, e.name).slice(root.length + 1).replaceAll("\\", "/");
    if (pred(rel)) return true;
    if (e.isDirectory() && hasFile(root, pred, depth, join(dir, e.name), level + 1)) return true;
  }
  return false;
}

function checkoutOf(root: string, repoPath: string, recordedWorktree: string | undefined, branch: string | null): { worktree: string; prefix: string } {
  if (recordedWorktree) return { worktree: join(root, recordedWorktree).replaceAll("\\", "/"), prefix: `${recordedWorktree}/` };
  const repoDir = join(root, repoPath);
  return { worktree: ((branch && git.worktreeOnBranch(repoDir, branch)) || repoDir).replaceAll("\\", "/"), prefix: `${repoPath}/` };
}

function nestedChanges(root: string, layout: ItemLayout, branch: string | null): RepoChange[] {
  return nestedRepos(root).map((repo) => {
    const repoDir = join(root, repo.path);
    const entry: RepoChange = { path: repo.path, worktree: null, prefix: `${repo.path}/`, base: null, changed: [], added: 0, removed: 0 };
    if (!git.isRepo(repoDir)) return { ...entry, skipped: "not a git repository" };
    const layoutEntry = layout.repos.find((r) => r.path === repo.path);
    const checkout = checkoutOf(root, repo.path, layoutEntry?.worktree, branch);
    const { worktree } = checkout;
    const recorded = layoutEntry?.base ?? null;
    const fallbackBranch = recorded ? null : (repo.default_branch ?? git.defaultBranch(worktree));
    const base = recorded ?? (fallbackBranch && git.mergeBase(worktree, "HEAD", fallbackBranch));
    if (!base) return { ...entry, ...checkout, skipped: "no recorded base and no default branch to merge-base with" };
    const { added, removed } = git.diffStat(worktree, base, null);
    const changed = git.changedSince(worktree, base).map((f) => `${checkout.prefix}${f}`);
    return { ...entry, ...checkout, base, base_from: recorded ? "recorded" : "merge-base", changed, added, removed };
  });
}

export function changesOfItem(root: string, state: WorkState, base: string): ChangeSet {
  const layout = readLayout(root, state.id);
  const nested = nestedChanges(root, layout, state.branch ?? null);
  // The root sees a nested repo as one untracked directory entry; its files are counted below instead.
  const nestedEntries = new Set(nested.flatMap((r) => [r.path, `${r.path}/`]));
  const rootChanged = git.changedSince(root, base).filter((f) => !git.isNonProduct(f) && !nestedEntries.has(f));
  const files = [...rootChanged, ...nested.flatMap((r) => r.changed)].sort();
  const { added, removed } = nested.reduce((sum, r) => ({ added: sum.added + r.added, removed: sum.removed + r.removed }), git.diffStat(root, base, null));
  const silencedInputs: SilencedInput[] = [
    { dir: root, base, head: null, files: rootChanged, prefix: "" },
    ...nested.filter((r) => !r.skipped).map((r) => ({ dir: r.worktree as string, base: r.base as string, head: null, files: r.changed.map((f) => f.slice(r.prefix.length)), prefix: r.prefix })),
  ];
  return { base, head: null, files, planFiles: files.map((f) => planPathOf(layout, f)), added, removed, silencedInputs, repos: nested };
}

/** The summary for a committed range (a pull request): `git diff base head`, nothing from the working tree. */
export function changesOfRange(root: string, base: string, head: string): ChangeSet {
  const files = git.rangeFiles(root, base, head).filter((f) => !git.isNonProduct(f)).sort();
  const { added, removed } = git.diffStat(root, base, head);
  return { base, head, files, planFiles: files, added, removed, silencedInputs: [{ dir: root, base, head, files, prefix: "" }], repos: [] };
}

export function summarize(root: string, changes: ChangeSet, config: SummaryConfig): Summary {
  const { files, planFiles, added, removed } = changes;
  const size = sizeClass(files.length, added + removed);
  const securityPath = planFiles.some((file) => securityPathOf(file, config.security_paths) !== null);
  return {
    size,
    changed_files: files,
    lines_added: added,
    lines_removed: removed,
    frameworks: detectFrameworks(root),
    concerns: detectConcerns(root, planFiles),
    security_path: securityPath,
    extension_steps: extensionSteps(root, size, securityPath),
    silenced: unwaived(changes.silencedInputs.flatMap((input) => silencedIn(input, config.quality))),
  };
}

export function renderSummary(s: Summary): string {
  return `${s.size} · ${s.changed_files.length} file(s), +${s.lines_added}/-${s.lines_removed} · frameworks ${s.frameworks.join(",") || "-"} · concerns ${s.concerns.join(",") || "-"} · security ${s.security_path ? "yes" : "no"}`;
}
