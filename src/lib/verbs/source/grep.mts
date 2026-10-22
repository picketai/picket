import { action, done } from "../../shared/action.mts";
import { grep } from "../../shared/sources/sources.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, UsageError, type Args } from "../../util/args.mts";
import { reachableSource, renderHits, type Hit, type SearchInput, type SearchResult, type Source } from "./reachable.mts";

type Grep = (source: Source, regex: string, options: { path: string | null }) => { hits: Hit[]; overflow: number };

const grepTyped = grep as unknown as Grep;

export const grepInSource = action<SearchInput, SearchResult>(async ({ name, query, path }, { root }) => {
  const source = reachableSource(root, name);
  return done({ source: name, root: source.root, ...grepTyped(source, query, { path }) });
});

function parseGrep(args: Args): SearchInput {
  const [name, query] = args.pos;
  if (!name || query === undefined) throw new UsageError("source grep needs <name> <regex> [--path <prefix>]");
  return { name, query, path: str(args, "path") ?? null };
}

export const verb: VerbSpec<SearchInput, SearchResult> = {
  usage: "source grep <name> <regex> [--path <prefix>]",
  output: "json",
  parse: parseGrep,
  run: grepInSource,
  render: renderHits,
};
