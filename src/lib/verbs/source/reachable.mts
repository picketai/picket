import { Refused } from "../../shared/action.mts";
import { loadConfig } from "../../shared/config.mjs";
import { configRel } from "../../shared/paths.mts";
import { isReachable, type ReachableSource, type Source } from "../../shared/sources/source.mts";

export type { Source };
export type Hit = { path: string; line?: number; text?: string; places: string[] };
export type SearchHits = { hits: Hit[]; overflow: number };
export type SearchResult = { source: string; root: string } & SearchHits;
export type SearchInput = { name: string; query: string; path: string | null };

export const HIT_CAP = 200;

export function declaredSources(root: string): Source[] {
  return (loadConfig(root) as unknown as { sources: Source[] }).sources;
}

export function reachableSource(root: string, name: string): ReachableSource {
  const sources = declaredSources(root);
  const source = sources.find((s) => s.name === name);
  const declared = sources.map((s) => s.name);
  if (!source) throw new Refused(`no source named ${name}; declared: ${declared.join(", ") || `(none, see ${configRel()})`}`, { declared });
  if (!isReachable(source)) throw new Refused(source.reason ?? `source ${name} is unreachable`, { source: name });
  return source;
}

export function capped(hits: Iterable<Hit>): SearchHits {
  const entries = [...hits].sort((a, b) => a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0));
  return { hits: entries.slice(0, HIT_CAP), overflow: Math.max(0, entries.length - HIT_CAP) };
}

function hitLine(h: Hit): string {
  return h.line ? `${h.path}:${h.line} [${h.places.join(", ")}] ${h.text}` : `${h.path} [${h.places.join(", ")}]`;
}

export function renderHits(v: SearchResult): string {
  const more = v.overflow ? `\n+${v.overflow} more not shown` : "";
  return (v.hits.map(hitLine).join("\n") || "(no hits)") + more;
}
