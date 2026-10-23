import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { appendWaiver, type Approval } from "../../shared/work/approvals.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";

export type WaiveInput = { id: WorkId; path: string; text: string | null; deleted: boolean };
export type Waiver = Approval;

const USAGE = 'waive needs <id> --path <p> and exactly one of --text "<added line>" or --deleted';

export const waive = action<WaiveInput, Waiver>(async ({ id, path, text, deleted }, { root, cwd, now }) => done(appendWaiver(root, id, { path, text, deleted }, { cwd, now: now() })));

function parseWaive(args: Args): WaiveInput {
  const [id] = args.pos;
  const path = str(args, "path");
  const given = str(args, "text");
  const text = given?.trim() ? given : null;
  const deleted = flag(args, "deleted");
  if (!id || path === undefined || (text !== null) === deleted) throw new UsageError(USAGE);
  return { id: workId(id), path, text, deleted };
}

export const verb: VerbSpec<WaiveInput, Waiver> = {
  usage: 'waive <id> --path <p> (--text "<added line>" | --deleted)',
  output: "json",
  parse: parseWaive,
  run: waive,
  render: (v) => `waived for ${v.path}: ${v.deleted ? "its deletion" : `"${v.text}"`}`,
};
