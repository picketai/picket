import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { appendComment, readState } from "../../shared/work/work.mjs";
import { str, UsageError, type Args } from "../../util/args.mts";

export type CommentInput = { id: WorkId; path: string; text: string };
export type CommentApproval = { path: string; text: string } & Record<string, unknown>;

type AppendComment = (id: string, entry: { path: string; text: string }, root: string) => CommentApproval;

const USAGE = 'comment needs <id> --path <p> --text "<t>"';
const appendCommentTyped = appendComment as unknown as AppendComment;

export const approveComment = action<CommentInput, CommentApproval>(async ({ id, path, text }, { root }) => {
  readState(id, root);
  return done(appendCommentTyped(id, { path, text }, root));
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
