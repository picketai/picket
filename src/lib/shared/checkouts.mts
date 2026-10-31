import { realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { gitRead } from "../util/git.mts";
import { readText } from "../util/io.mts";
import { Refused } from "./action.mts";
import { defaultBranch, revParse } from "./git.mts";
import { nestedRepos, readLayout, writeLayout, type ItemLayout, type RepoLayout } from "./repos.mts";
import { detectTooling } from "./tooling.mts";
import { parseArtifact, phasePaths, type ArtifactPhase } from "./work/artifact.mts";
import { workFile, type WorkId } from "./work/files.mts";
import { ARTIFACT_BY_LANE, readState, writeState, type WorkState } from "./work/state.mts";

export type Located = { dir: string; rel: string; repo: string | null };
export type BranchChoice = { name: string; from?: string };
export type PlannedWorktree = { repo: string; from: string; base: string | null; worktree: string };
export type ItemPlan = { layout: ItemLayout; phases: Pick<ArtifactPhase, "entry" | "touchSet">[] };
export type TestRun = { dir: string; command: string | null; warnings: string[] };

const WORKTREE_FOLDER = /^\.worktrees\/[^/]+(?:\/|$)/;
const TICKET_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

function normalised(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function inside(path: string, folder: string): string | null {
  if (path === folder) return "";
  return path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : null;
}

function joined(folder: string, rel: string): string {
  return rel === "" ? folder : `${folder}/${rel}`;
}

function knownRepos(layout: ItemLayout): RepoLayout[] {
  const unrecorded = layout.nested.filter((path) => !layout.repos.some((r) => r.path === path)).map((path) => ({ path, base: null }));
  return [...layout.repos, ...unrecorded];
}

function inRecordedWorktree(repos: RepoLayout[], path: string): Located | null {
  for (const { path: repo, worktree } of repos) {
    const rel = worktree ? inside(path, worktree) : null;
    if (worktree && rel !== null) return { dir: worktree, rel, repo };
  }
  return null;
}

function owningRepo(repos: RepoLayout[], path: string): RepoLayout | null {
  const owners = repos.filter((r) => inside(path, r.path) !== null);
  return owners.sort((a, b) => b.path.length - a.path.length)[0] ?? null;
}

export function locate(layout: ItemLayout, path: string): Located {
  const plain = normalised(path);
  const repos = knownRepos(layout);
  const inWorktree = inRecordedWorktree(repos, plain);
  if (inWorktree) return inWorktree;
  const owner = owningRepo(repos, plain);
  if (!owner) return { dir: "", rel: plain, repo: null };
  return { dir: owner.worktree ?? owner.path, rel: inside(plain, owner.path) ?? "", repo: owner.path };
}

export function planPathOf(layout: ItemLayout, path: string): string {
  const { repo, rel } = locate(layout, path);
  return repo === null ? rel : joined(repo, rel.replace(WORKTREE_FOLDER, ""));
}
export function touchedRepos(layout: ItemLayout, paths: string[]): string[] {
  const repos = paths.map((path) => locate(layout, path).repo).filter((repo): repo is string => repo !== null);
  return [...new Set(repos)].sort();
}

export function worktreeDirName(branch: string): string {
  return branch.replace(/[/\s]/g, "-");
}

export function ticketKey(source: string | null | undefined): string | null {
  return source && TICKET_KEY.test(source) ? source : null;
}

export function readPlan(root: string, id: WorkId): { state: WorkState; phases: ArtifactPhase[] } {
  const state = readState(root, id);
  const artifact = ARTIFACT_BY_LANE[state.lane];
  const text = artifact ? readText(workFile(root, id, artifact)) : null;
  return { state, phases: text === null ? [] : parseArtifact(text).phases };
}

function realPath(path: string): string {
  try {
    return realpathSync.native(resolve(path));
  } catch {
    return resolve(path);
  }
}

export function workingCheckout(root: string, cwd: string): string {
  const top = gitRead(cwd, ["rev-parse", "--show-toplevel"])?.trim();
  if (!top) return "";
  const rel = relative(realPath(root), realPath(top)).replaceAll("\\", "/");
  return rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel) ? "" : rel;
}

export function testRuns(root: string, id: WorkId, n: number): TestRun[] {
  const phase = readPlan(root, id).phases.find((p) => p.n === n);
  if (!phase?.entry) throw new Error(`${id} has no phases[] entry for n: ${n}`);
  const layout = readLayout(root, id);
  const dirs = [...new Set(phasePaths(phase).map((path) => locate(layout, path).dir))].sort();
  return (dirs.length ? dirs : [""]).map((dir) => {
    const { tooling, warnings } = detectTooling(join(root, dir));
    return { dir, command: tooling.test, warnings };
  });
}

function planTouchedRepos({ layout, phases }: ItemPlan): string[] {
  return touchedRepos(layout, phases.flatMap(phasePaths));
}

function startRef(root: string, repo: string, from: string | undefined): string {
  const manifestDefault = nestedRepos(root).find((r) => r.path === repo)?.default_branch;
  return from ?? manifestDefault ?? defaultBranch(join(root, repo)) ?? "HEAD";
}

export function planWorktrees(root: string, plan: ItemPlan, { name, from }: BranchChoice): PlannedWorktree[] {
  return planTouchedRepos(plan).map((repo) => {
    const ref = startRef(root, repo, from);
    return { repo, from: ref, base: revParse(join(root, repo), ref), worktree: `${repo}/.worktrees/${worktreeDirName(name)}` };
  });
}

function isBranchName(root: string, name: string): boolean {
  return gitRead(root, ["check-ref-format", "--branch", name]) !== null;
}

function withPlanned(repos: RepoLayout[], planned: PlannedWorktree[]): RepoLayout[] {
  const byRepo = new Map(planned.map((p) => [p.repo, p]));
  const updated = repos.map((r) => {
    const p = byRepo.get(r.path);
    return p ? { ...r, from: p.from, base: p.base } : r;
  });
  const added = planned.filter((p) => !repos.some((r) => r.path === p.repo)).map((p) => ({ path: p.repo, base: p.base, from: p.from }));
  return [...updated, ...added];
}

export function recordBranch(root: string, id: WorkId, choice: BranchChoice, now: Date): PlannedWorktree[] {
  if (!isBranchName(root, choice.name)) throw new Refused(`"${choice.name}" is not a valid branch name`);
  const { state, phases } = readPlan(root, id);
  const layout = readLayout(root, id);
  const planned = planWorktrees(root, { layout, phases }, choice);
  const unresolved = planned.find((p) => p.base === null);
  if (unresolved) throw new Refused(`${unresolved.repo} has no commit at "${unresolved.from}"`);
  writeLayout(root, id, { worktrees: null, repos: withPlanned(layout.repos, planned) });
  writeState(root, { ...state, branch: choice.name }, now);
  return planned;
}

export function recordNone(root: string, id: WorkId): void {
  const { repos } = readLayout(root, id);
  const created = repos.find((r) => r.worktree);
  if (created) throw new Refused(`${created.path} already has the worktree ${created.worktree}; the item cannot switch to the main checkouts`);
  writeLayout(root, id, { worktrees: "none", repos });
}
