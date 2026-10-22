import { action, done, refuse } from "../../shared/action.mts";
import { dirtyPaths } from "../../shared/git.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { next } from "../../shared/work/next-step.mjs";
import { readState, writeState } from "../../shared/work/work.mjs";
import { UsageError, type Args } from "../../util/args.mts";

export type Assignment = { field: string; value: string };
export type SetInput = { id: WorkId; assignments: Assignment[] };
export type SetResult = { id: string; status: string; blocked_reason?: string; dirty: string[]; next: { action: string } } & Record<string, unknown>;

type ItemState = Record<string, unknown> & { id: string; status: string };

const SETTABLE = ["status", "blocked_reason", "branch", "title", "run_through"];
const ASSIGNMENT = /^([a-z_]+)=(.*)$/;
const USAGE = "set needs <id> and key=value pairs (status, blocked_reason, branch, title, run_through)";

function applyAssignment(st: ItemState, { field, value }: Assignment): void {
  if (value === "") delete st[field];
  else st[field] = field === "run_through" ? Number(value) : value;
}

export const setFields = action<SetInput, SetResult>(async ({ id, assignments }, { root }) => {
  const unknown = assignments.find(({ field }) => !SETTABLE.includes(field));
  if (unknown) return refuse(`field ${unknown.field} is not settable`, { id });
  const st = readState(id, root) as ItemState;
  for (const assignment of assignments) applyAssignment(st, assignment);
  if (st.status !== "blocked") delete st.blocked_reason;
  writeState(st, root);
  const dirty = st.status === "done" ? (dirtyPaths(root) ?? []) : [];
  return done({ ...st, dirty, next: next(st.id, root) } as SetResult);
});

function parseAssignment(token: string): Assignment {
  const m = token.match(ASSIGNMENT);
  if (!m) throw new UsageError(`bad assignment ${token}`);
  return { field: m[1], value: m[2] };
}

function parseSet(args: Args): SetInput {
  const [id, ...tokens] = args.pos;
  if (!id || tokens.length === 0) throw new UsageError(USAGE);
  return { id: workId(id), assignments: tokens.map(parseAssignment) };
}

function dirtyWarning(dirty: string[]): string {
  return dirty.length ? `\nWARNING: uncommitted changes: ${dirty.join(", ")} (commit them or \`git checkout -- <path>\` before you print the closing block)` : "";
}

function renderSet(v: SetResult): string {
  return `${v.id}: status ${v.status}${v.blocked_reason ? " (" + v.blocked_reason + ")" : ""} · next: ${v.next.action}${dirtyWarning(v.dirty)}`;
}

export const verb: VerbSpec<SetInput, SetResult> = {
  usage: "set <id> <key>=<value>...",
  output: "json",
  parse: parseSet,
  run: setFields,
  render: renderSet,
};
