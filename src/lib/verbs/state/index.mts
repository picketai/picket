import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readSnapshot, stateView, type StateView } from "../../shared/work/snapshot.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type StateInput = { id: WorkId };

export const state = action<StateInput, StateView>(async ({ id }, { root }) => done(stateView(readSnapshot(root, id))));

function parseState(args: Args): StateInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("state needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<StateInput, StateView> = {
  usage: "state <id>",
  output: "json",
  parse: parseState,
  run: state,
  render: (value) => JSON.stringify(value),
};
