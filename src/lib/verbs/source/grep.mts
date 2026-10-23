import { action, done, Refused } from "../../shared/action.mts";
import { places, SOURCE_MAX_BUFFER, type Place } from "../../shared/sources/places.mts";
import type { ReachableSource } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, UsageError, type Args } from "../../util/args.mts";
import { GitFailed, gitRun } from "../../util/git.mts";
import { capped, reachableSource, renderHits, type Hit, type SearchHits, type SearchInput, type SearchResult } from "./reachable.mts";

type GrepOptions = { path: string | null };

function grepPlace(source: ReachableSource, place: Place, regex: string, pathspec: string[]): string {
  const args = place.worktree ? ["grep", "-n", "-I", "-z", "-e", regex, ...pathspec] : ["grep", "-n", "-I", "-z", "-e", regex, String(place.branch), ...pathspec];
  return gitRun(place.worktree ?? source.root, args, { okExitCodes: [0, 1], maxBuffer: SOURCE_MAX_BUFFER });
}

function placeHits(place: Place, out: string): Omit<Hit, "places">[] {
  return out.split(/\r?\n/).flatMap((line) => {
    const [rawPath, lineNo, ...text] = line.split("\0");
    if (!rawPath || !lineNo) return [];
    const path = place.kind === "branch" ? rawPath.slice(String(place.branch).length + 1) : rawPath;
    return [{ path, line: Number(lineNo), text: text.join("\0") }];
  });
}

export function grepHits(source: ReachableSource, regex: string, { path }: GrepOptions = { path: null }): SearchHits {
  const byHit = new Map<string, Hit>();
  const pathspec = path ? ["--", path] : [];
  for (const place of places(source.root)) {
    for (const found of placeHits(place, grepPlace(source, place, regex, pathspec))) {
      const key = `${found.path}\0${found.line}\0${found.text}`;
      const hit = byHit.get(key) ?? { ...found, places: [] };
      hit.places.push(place.label);
      byHit.set(key, hit);
    }
  }
  return capped(byHit.values());
}

function grepOrRefuse(source: ReachableSource, regex: string, options: GrepOptions): SearchHits {
  try {
    return grepHits(source, regex, options);
  } catch (err) {
    if (err instanceof GitFailed) throw new Refused(err.message, { source: source.name });
    throw err;
  }
}

export const grepInSource = action<SearchInput, SearchResult>(async ({ name, query, path }, { root }) => {
  const source = reachableSource(root, name);
  return done({ source: name, root: source.root, ...grepOrRefuse(source, query, { path }) });
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
