import { action, done, failed } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { mutate, renderMutation } from "./mutate.mjs";

export type MutateInput = { id: WorkId };
export type MutationResult = { outcome: string } & Record<string, unknown>;

type Mutate = (id: string, options: { root: string }) => MutationResult;

const mutateTyped = mutate as unknown as Mutate;

export const mutateOnce = action<MutateInput, MutationResult>(async ({ id }, { root }) => {
  const result = mutateTyped(id, { root });
  return result.outcome === "error" ? failed(result) : done(result);
});

function parseMutate(args: Args): MutateInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("mutate needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<MutateInput, MutationResult> = {
  usage: "mutate <id>",
  output: "json",
  parse: parseMutate,
  run: mutateOnce,
  render: renderMutation,
};
