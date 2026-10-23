import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { appendComment, type Approval } from "../../shared/work/approvals.mts";
import { readState } from "../../shared/work/state.mts";
import { str, UsageError, type Args } from "../../util/args.mts";

export type CommentInput = { id: WorkId; path: string; text: string };
export type CommentApproval = Approval;

const USAGE = 'comment needs <id> --path <p> --text "<t>"';

export const approveComment = action<CommentInput, CommentApproval>(async ({ id, path, text }, { root, cwd, now }) => {
  readState(root, id);
  return done(appendComment(root, id, { path, text }, { cwd, now: now() }));
});

function field(args: Args, name: string): string | undefined {
  try {
    return str(args, name);
  } catch {
    throw new UsageError(USAGE);
  }
}

function parseComment(args: Args): CommentInput {
  const [id] = args.pos;
  const path = field(args, "path");
  const text = field(args, "text");
  if (!id || path === undefined || text === undefined || !text.trim()) throw new UsageError(USAGE);
  return { id: workId(id), path, text };
}

export const verb: VerbSpec<CommentInput, CommentApproval> = {
  usage: 'comment <id> --path <p> --text "<comment>"',
  output: "json",
  parse: parseComment,
  run: approveComment,
  render: (v) => `approved comment for ${v.path}: "${v.text}"`,
};
