import type { Args } from "../util/args.mts";
import type { Action } from "./action.mts";

export type VerbSpec<I, O> = {
  usage: string;
  output: "json" | "text";
  parse: (args: Args) => I;
  run: Action<I, O>;
  render: (value: O) => string;
};
