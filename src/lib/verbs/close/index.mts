import { action, done, Refused } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { leftLine, type LeftEntry } from "../../shared/work/left.mts";
import { list, str, UsageError, type Args } from "../../util/args.mts";
import { close } from "./close.mjs";

export type CloseInput = { id: WorkId; message: string | undefined; touched: string[] };
export type Repeat = { class: string; items: string[] };
export type CloseResult = {
  id: string;
  commit: string | null;
  message: string;
  left_staged: string[];
  warnings: string[];
  dirty: string[];
  left: LeftEntry[];
  repeats: Repeat[];
} & Record<string, unknown>;

type CloseFailure = { message: string; next?: Record<string, unknown> };
type Close = (id: string, root: string, options: { message: string | undefined; touched: string[] }) => CloseResult;

const closeTyped = close as unknown as Close;

function closeOrRefuse(input: CloseInput, root: string): CloseResult {
  try {
    return closeTyped(input.id, root, { message: input.message, touched: input.touched });
  } catch (err) {
    const failure = err as CloseFailure;
    throw new Refused(failure.message, failure.next ? { id: input.id, next: failure.next } : { id: input.id });
  }
}

export const closeItem = action<CloseInput, CloseResult>(async (input, { root }) => done(closeOrRefuse(input, root)));

function parseClose(args: Args): CloseInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("close needs <id>");
  return { id: workId(id), message: str(args, "message"), touched: list(args, "touched") };
}

function dirtyWarning(dirty: string[]): string {
  return dirty.length ? `\nWARNING: uncommitted changes: ${dirty.join(", ")} (commit them or \`git checkout -- <path>\` before you print the closing block)` : "";
}

function renderClose(v: CloseResult): string {
  return [
    `${v.id}: closed · ${v.commit ? `committed ${v.commit} ${v.message}` : "nothing to commit"}${dirtyWarning(v.dirty)}`,
    ...(v.left_staged.length ? [`left staged (not this item's): ${v.left_staged.join(", ")}`] : []),
    ...v.warnings.map((w) => `WARNING: ${w}`),
    ...v.left.map(leftLine),
    ...v.repeats.map((r) => `repeats: ${r.class} (${r.items.join(", ")})`),
  ].join("\n");
}

export const verb: VerbSpec<CloseInput, CloseResult> = {
  usage: 'close <id> [--message "<message>"] [--touched <p1,p2>]',
  output: "json",
  parse: parseClose,
  run: closeItem,
  render: renderClose,
};
