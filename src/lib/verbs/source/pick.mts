import { action, done } from "../../shared/action.mts";
import { pick } from "../../shared/sources/sources.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workDir, workId, type WorkId } from "../../shared/work/files.mts";
import { readNext } from "../../shared/work/next-view.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { declaredSources, type Source } from "./reachable.mts";

export type PickInput = { id: WorkId; ref: string; label: string };
export type PickedRecord = { ref: string; branch: string | null; worktree: string | null; commit: string } & Record<string, unknown>;
export type PickedRef = PickedRecord & { next: { action: string } };

type Pick = (dir: string, ref: string, label: string, sources: Source[]) => PickedRecord;

const pickTyped = pick as unknown as Pick;

export const pickVersion = action<PickInput, PickedRef>(async ({ id, ref, label }, { root }) => {
  const record = pickTyped(workDir(root, id), ref, label, declaredSources(root));
  return done({ ...record, next: readNext(root, id) });
});

function parsePick(args: Args): PickInput {
  const [id, ref, label] = args.pos;
  if (!id || !ref || !label) throw new UsageError("source pick needs <id> <ref> <label>");
  return { id: workId(id), ref, label };
}

function renderPick(v: PickedRef): string {
  return `${v.ref}: ${v.branch ?? v.worktree} @ ${String(v.commit).slice(0, 8)} (chosen_by user) · next: ${v.next.action}`;
}

export const verb: VerbSpec<PickInput, PickedRef> = {
  usage: "source pick <id> <ref> <label>",
  output: "json",
  parse: parsePick,
  run: pickVersion,
  render: renderPick,
};
