import { action, done, failed, refuse, type Outcome } from "../../shared/action.mts";
import { planWorktrees, recordBranch, recordNone, type BranchChoice, type PlannedWorktree } from "../../shared/checkouts.mts";
import { writeLayout, type RepoLayout } from "../../shared/repos.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readSnapshot } from "../../shared/work/snapshot.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";
import { createOrResume, hasFailed, type RepoOutcome } from "./create.mts";

export type WorktreeInput = { id: WorkId; mode: "record"; choice: BranchChoice } | { id: WorkId; mode: "none" } | { id: WorkId; mode: "create" };
export type WorktreeResult =
  | { id: WorkId; mode: "record"; branch: string; planned: PlannedWorktree[] }
  | { id: WorkId; mode: "none" }
  | { id: WorkId; mode: "create"; branch: string; repos: RepoOutcome[] };

const USAGE = "worktree <id> [--record <name> [--from <ref>] | --none]";
const BASE_CHARS = 8;

function withOutcomes(repos: RepoLayout[], outcomes: RepoOutcome[]): RepoLayout[] {
  const settled = outcomes.filter((o) => o.state !== "failed");
  const updated = repos.map((r) => {
    const outcome = settled.find((o) => o.repo === r.path);
    return outcome ? { ...r, base: outcome.base, worktree: outcome.worktree } : r;
  });
  const added = settled.filter((o) => !repos.some((r) => r.path === o.repo)).map((o) => ({ path: o.repo, base: o.base, worktree: o.worktree }));
  return [...updated, ...added];
}

function createAll(root: string, id: WorkId): Outcome<WorktreeResult> {
  const snap = readSnapshot(root, id);
  if (snap.layout.worktrees === "none") return done({ id, mode: "none" });
  const branch = snap.state.branch;
  if (!branch) return refuse(`${id} has no branch recorded; the create_worktrees stop names it (picket worktree ${id} --record <name>)`, { id });
  const outcomes = planWorktrees(root, snap, { name: branch }).map((planned) =>
    createOrResume(root, planned, snap.layout.repos.find((r) => r.path === planned.repo), branch),
  );
  writeLayout(root, id, { worktrees: null, repos: withOutcomes(snap.layout.repos, outcomes) });
  const result: WorktreeResult = { id, mode: "create", branch, repos: outcomes };
  return outcomes.some(hasFailed) ? failed(result) : done(result);
}

export const worktree = action<WorktreeInput, WorktreeResult>(async (input, { root, now }) => {
  const { id } = input;
  if (input.mode === "record") return done({ id, mode: "record", branch: input.choice.name, planned: recordBranch(root, id, input.choice, now()) });
  if (input.mode === "none") {
    recordNone(root, id);
    return done({ id, mode: "none" });
  }
  return createAll(root, id);
});

function parseWorktree(args: Args): WorktreeInput {
  const [raw] = args.pos;
  if (!raw) throw new UsageError(`${USAGE}: needs <id>`);
  const id = workId(raw);
  const name = str(args, "record");
  const from = str(args, "from");
  const none = flag(args, "none");
  if (name !== undefined && none) throw new UsageError(`${USAGE}: --record and --none exclude each other`);
  if (from !== undefined && name === undefined) throw new UsageError(`${USAGE}: --from needs --record`);
  if (name !== undefined) return { id, mode: "record", choice: from === undefined ? { name } : { name, from } };
  return none ? { id, mode: "none" } : { id, mode: "create" };
}

function shortBase(base: string | null): string {
  return base ? base.slice(0, BASE_CHARS) : "none";
}

function plannedLine({ repo, worktree, from, base }: PlannedWorktree): string {
  return `${repo} -> ${worktree} · planned · from ${from} @${shortBase(base)}`;
}

function submoduleLines({ hydrated, reported, conflicted }: RepoOutcome): string[] {
  return [
    ...hydrated.map((path) => `  submodule ${path} · hydrated`),
    ...reported.map((path) => `  submodule ${path} · reported, its commit kept`),
    ...conflicted.map((path) => `  submodule ${path} · conflicted`),
  ];
}

function outcomeLines(outcome: RepoOutcome): string[] {
  if (outcome.state === "failed") return [`${outcome.repo} -> ${outcome.worktree} · failed · ${outcome.error}`];
  return [`${outcome.repo} -> ${outcome.worktree} · ${outcome.state} · base ${shortBase(outcome.base)}`, ...submoduleLines(outcome)];
}

export function renderWorktree(result: WorktreeResult): string {
  if (result.mode === "none") return `${result.id} works in the main checkouts`;
  const lines = result.mode === "record" ? result.planned.map(plannedLine) : result.repos.flatMap(outcomeLines);
  const header = result.mode === "record" ? `${result.id}: branch ${result.branch} recorded` : `${result.id}: branch ${result.branch}`;
  return [header, ...(lines.length ? lines : ["no nested repo is touched by the plan"])].join("\n");
}

export const verb: VerbSpec<WorktreeInput, WorktreeResult> = {
  usage: USAGE,
  output: "json",
  parse: parseWorktree,
  run: worktree,
  render: renderWorktree,
};
