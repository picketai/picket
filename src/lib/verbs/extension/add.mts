import { action, done } from "../../shared/action.mts";
import { NAME, scaffoldExtension } from "../../shared/extensions.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type AddInput = { name: string };
export type Scaffolded = { name: string; dir: string; manifest: string; extensions: string[] };

type Scaffold = (root: string, name: string) => Scaffolded;

const scaffoldTyped = scaffoldExtension as unknown as Scaffold;

export const addExtension = action<AddInput, Scaffolded>(async ({ name }, { root }) => done(scaffoldTyped(root, name)));

function parseAdd(args: Args): AddInput {
  const [name] = args.pos;
  if (!name) throw new UsageError("extension add needs <name>");
  if (!NAME.test(name)) throw new UsageError(`extension name "${name}" must match ${NAME.source}`);
  return { name };
}

function renderAdd(v: Scaffolded): string {
  return `created ${v.manifest} and enabled ${v.name} (extensions: ${v.extensions.join(", ")})\nnext: list your files in its rules, agents, review_steps or preflight keys`;
}

export const verb: VerbSpec<AddInput, Scaffolded> = {
  usage: "extension add <name>",
  output: "json",
  parse: parseAdd,
  run: addExtension,
  render: renderAdd,
};
