import { action, done } from "../../shared/action.mts";
import { find } from "../../shared/sources/sources.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { reachableSource, renderHits, type Hit, type SearchInput, type SearchResult, type Source } from "./reachable.mts";

type Find = (source: Source, needle: string) => { hits: Hit[]; overflow: number };

const findTyped = find as unknown as Find;

export const findInSource = action<SearchInput, SearchResult>(async ({ name, query }, { root }) => {
  const source = reachableSource(root, name);
  return done({ source: name, root: source.root, ...findTyped(source, query) });
});

function parseFind(args: Args): SearchInput {
  const [name, query] = args.pos;
  if (!name || query === undefined) throw new UsageError("source find needs <name> <substring>");
  return { name, query, path: null };
}

export const verb: VerbSpec<SearchInput, SearchResult> = {
  usage: "source find <name> <substring>",
  output: "json",
  parse: parseFind,
  run: findInSource,
  render: renderHits,
};
