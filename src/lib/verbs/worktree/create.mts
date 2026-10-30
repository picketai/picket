import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { worktreeDirName, type PlannedWorktree } from "../../shared/checkouts.mts";
import { revParse, worktreeOnBranch } from "../../shared/git.mts";
import type { RepoLayout } from "../../shared/repos.mts";
import { GitFailed, gitRead, gitRun } from "../../util/git.mts";

export type SubmoduleAction = "hydrate" | "report" | "conflict" | "leave";
export type SubmoduleEntry = { action: SubmoduleAction; path: string };
export type CheckoutState = "created" | "resumed" | "failed";
export type RepoOutcome = {
  repo: string;
  worktree: string;
  state: CheckoutState;
  base: string | null;
  hydrated: string[];
  reported: string[];
  conflicted: string[];
  error?: string;
};

const WORKTREES_FOLDER = ".worktrees/";
const GITLINK_MODE = /^160000 /m;
const SUBMODULE_LINE = /^([-+U ])\S+ (.+?)(?: \(.*\))?$/;
const ACTION_BY_PREFIX: Record<string, SubmoduleAction> = { "-": "hydrate", "+": "report", U: "conflict", " ": "leave" };

export function submoduleEntry(line: string): SubmoduleEntry | null {
  const m = line.match(SUBMODULE_LINE);
  return m ? { action: ACTION_BY_PREFIX[m[1]], path: m[2] } : null;
}

function realPath(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
}

function projectRelative(root: string, path: string): string {
  return relative(realPath(root), realPath(path)).split(sep).join("/");
}

function excludeWorktrees(repoDir: string): void {
  if (gitRead(repoDir, ["check-ignore", "-q", WORKTREES_FOLDER]) !== null) return;
  const exclude = resolve(repoDir, gitRun(repoDir, ["rev-parse", "--git-path", "info/exclude"]).trim());
  mkdirSync(dirname(exclude), { recursive: true });
  const text = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
  appendFileSync(exclude, `${text === "" || text.endsWith("\n") ? "" : "\n"}${WORKTREES_FOLDER}\n`);
}

function submodules(worktreeDir: string): SubmoduleEntry[] {
  if (!GITLINK_MODE.test(gitRun(worktreeDir, ["ls-files", "--stage"]))) return [];
  return gitRun(worktreeDir, ["submodule", "status", "--recursive"])
    .split(/\r?\n/)
    .map(submoduleEntry)
    .filter((entry): entry is SubmoduleEntry => entry !== null);
}

function pathsFor(entries: SubmoduleEntry[], action: SubmoduleAction): string[] {
  return entries.filter((entry) => entry.action === action).map((entry) => entry.path);
}

function settleSubmodules(worktreeDir: string): Pick<RepoOutcome, "hydrated" | "reported" | "conflicted"> {
  const entries = submodules(worktreeDir);
  const hydrated = pathsFor(entries, "hydrate");
  if (hydrated.length) gitRun(worktreeDir, ["submodule", "update", "--init", "--recursive", "--", ...hydrated]);
  return { hydrated, reported: pathsFor(entries, "report"), conflicted: pathsFor(entries, "conflict") };
}

function addWorktree(root: string, repoDir: string, branch: string, worktree: string, from: string): void {
  const target = join(root, worktree);
  if (revParse(repoDir, `refs/heads/${branch}`)) gitRun(repoDir, ["worktree", "add", target, branch]);
  else gitRun(repoDir, ["worktree", "add", "-b", branch, target, from]);
}

function openCheckout(root: string, planned: PlannedWorktree, recorded: RepoLayout | undefined, branch: string): Pick<RepoOutcome, "worktree" | "state" | "base"> {
  const repoDir = join(root, planned.repo);
  const existing = worktreeOnBranch(repoDir, branch);
  if (existing) {
    const worktree = projectRelative(root, existing);
    return { worktree, state: "resumed", base: recorded?.base ?? revParse(join(root, worktree), "HEAD") };
  }
  const worktree = `${planned.repo}/.worktrees/${worktreeDirName(branch)}`;
  addWorktree(root, repoDir, branch, worktree, recorded?.from ?? planned.from);
  return { worktree, state: "created", base: revParse(join(root, worktree), "HEAD") };
}

export function createOrResume(root: string, planned: PlannedWorktree, recorded: RepoLayout | undefined, branch: string): RepoOutcome {
  try {
    const checkout = openCheckout(root, planned, recorded, branch);
    excludeWorktrees(join(root, planned.repo));
    return { repo: planned.repo, ...checkout, ...settleSubmodules(join(root, checkout.worktree)) };
  } catch (err) {
    if (!(err instanceof GitFailed)) throw err;
    return { repo: planned.repo, worktree: planned.worktree, state: "failed", base: null, hydrated: [], reported: [], conflicted: [], error: err.message };
  }
}

export function hasFailed(outcome: RepoOutcome): boolean {
  return outcome.state === "failed" || outcome.conflicted.length > 0;
}
