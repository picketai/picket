import { action, done } from "../../shared/action.mts";
import { places, SOURCE_MAX_BUFFER, type Place } from "../../shared/sources/places.mts";
import type { ReachableSource } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { gitRead } from "../../util/git.mts";
import { capped, reachableSource, renderHits, type Hit, type SearchHits, type SearchInput, type SearchResult } from "./reachable.mts";

function trackedPaths(source: ReachableSource, place: Place): string[] {
  const listing = place.worktree
    ? gitRead(place.worktree, ["ls-files", "-z"], { maxBuffer: SOURCE_MAX_BUFFER })
    : gitRead(source.root, ["ls-tree", "-r", "-z", "--name-only", String(place.branch)], { maxBuffer: SOURCE_MAX_BUFFER });
  return (listing ?? "").split("\0").filter(Boolean);
}

export function findPaths(source: ReachableSource, needle: string): SearchHits {
  const lower = String(needle).toLowerCase();
  const byPath = new Map<string, Hit>();
  for (const place of places(source.root)) {
    for (const path of trackedPaths(source, place)) {
      if (!path.toLowerCase().includes(lower)) continue;
      const hit = byPath.get(path) ?? { path, places: [] };
      hit.places.push(place.label);
      byPath.set(path, hit);
    }
  }
  return capped(byPath.values());
}

export const findInSource = action<SearchInput, SearchResult>(async ({ name, query }, { root }) => {
  const source = reachableSource(root, name);
  return done({ source: name, root: source.root, ...findPaths(source, query) });
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
