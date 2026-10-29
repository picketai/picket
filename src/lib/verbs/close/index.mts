import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { list, str, UsageError, type Args } from "../../util/args.mts";
import { closingBlock } from "./block.mts";
import { close, type CloseResult } from "./close.mts";

export type { Closing, CloseResult, Repeat } from "./close.mts";
export type CloseInput = { id: WorkId; message: string | undefined; touched: string[] };

export const closeItem = action<CloseInput, CloseResult>(async ({ id, message, touched }, { root, now, env }) => done(close(root, id, { message, touched }, { now: now(), env })));

function parseClose(args: Args): CloseInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("close needs <id>");
  return { id: workId(id), message: str(args, "message"), touched: list(args, "touched") };
}

export const verb: VerbSpec<CloseInput, CloseResult> = {
  usage: 'close <id> [--message "<message>"] [--touched <p1,p2>]',
  output: "json",
  parse: parseClose,
  run: closeItem,
  render: closingBlock,
};
