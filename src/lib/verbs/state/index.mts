import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { deriveState } from "../../shared/work/work.mjs";
import { UsageError, type Args } from "../../util/args.mts";

export type StateInput = { id: WorkId };
export type DerivedState = Record<string, unknown>;

export const state = action<StateInput, DerivedState>(async ({ id }, { root }) => done(deriveState(id, root) as DerivedState));

function parseState(args: Args): StateInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("state needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<StateInput, DerivedState> = {
  usage: "state <id>",
  output: "json",
  parse: parseState,
  run: state,
  render: (value) => JSON.stringify(value),
};
