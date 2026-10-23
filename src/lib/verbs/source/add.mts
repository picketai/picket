import { action, done, Refused } from "../../shared/action.mts";
import { addRef, LookupError } from "../../shared/sources/sources.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { declaredSources, type Source } from "./reachable.mts";

export type AddInput = { id: WorkId; ref: string };
export type RefRecord = { ref: string; branch: string | null; worktree: string | null; commit: string; chosen_by: string; snapshot: string | null };
export type Added = { added: boolean; ref: RefRecord };

type AddRef = (root: string, id: WorkId, ref: string, sources: Source[]) => Added;

const addRefTyped = addRef as unknown as AddRef;

function addOrRefuse(root: string, id: WorkId, ref: string, sources: Source[]): Added {
  try {
    return addRefTyped(root, id, ref, sources);
  } catch (err) {
    if (err instanceof LookupError) throw new Refused(err.message, { ref });
    throw err;
  }
}

export const addSourceRef = action<AddInput, Added>(async ({ id, ref }, { root }) => {
  readState(root, id);
  return done(addOrRefuse(root, id, ref, declaredSources(root)));
});

function parseAdd(args: Args): AddInput {
  const [id, ref] = args.pos;
  if (!id || !ref) throw new UsageError("source add needs <id> <ref>");
  return { id: workId(id), ref };
}

function renderAdd({ added, ref }: Added): string {
  return `${ref.ref}: ${added ? `added from ${ref.branch ?? ref.worktree} @ ${String(ref.commit).slice(0, 8)} (${ref.chosen_by}) · snapshot ${ref.snapshot}` : "already recorded"}`;
}

export const verb: VerbSpec<AddInput, Added> = {
  usage: "source add <id> <ref>",
  output: "json",
  parse: parseAdd,
  run: addSourceRef,
  render: renderAdd,
};
