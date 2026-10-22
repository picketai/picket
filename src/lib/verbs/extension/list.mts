import { action, done } from "../../shared/action.mts";
import { describeExtensions, loadExtensions, renderExtensions } from "../../shared/extensions.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";

export type ListInput = Record<string, never>;
export type ExtensionSummary = Record<string, unknown>;

export const listExtensions = action<ListInput, ExtensionSummary>(async (_input, { root }) => done(describeExtensions(loadExtensions(root)) as ExtensionSummary));

export const verb: VerbSpec<ListInput, ExtensionSummary> = {
  usage: "extension list",
  output: "json",
  parse: () => ({}),
  run: listExtensions,
  render: renderExtensions,
};
