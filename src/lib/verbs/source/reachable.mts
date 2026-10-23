import { Refused } from "../../shared/action.mts";
import { loadConfig } from "../../shared/config.mjs";
import { configRel } from "../../shared/paths.mts";
import { isReachable, type ReachableSource, type Source } from "../../shared/sources/source.mts";

export type { Source };
export type Hit = { path: string; line?: number; text?: string; places: string[] };
export type SearchResult = { source: string; root: string; hits: Hit[]; overflow: number };
export type SearchInput = { name: string; query: string; path: string | null };

export function declaredSources(root: string): Source[] {
  return (loadConfig(root) as unknown as { sources: Source[] }).sources;
}

export function reachableSource(root: string, name: string): ReachableSource {
  const sources = declaredSources(root);
  const source = sources.find((s) => s.name === name);
  if (!source) throw new Error(`no source named ${name}; declared: ${sources.map((s) => s.name).join(", ") || `(none, see ${configRel()})`}`);
  if (!isReachable(source)) throw new Refused(source.reason ?? `source ${name} is unreachable`, { source: name });
  return source;
}

function hitLine(h: Hit): string {
  return h.line ? `${h.path}:${h.line} [${h.places.join(", ")}] ${h.text}` : `${h.path} [${h.places.join(", ")}]`;
}

export function renderHits(v: SearchResult): string {
  const more = v.overflow ? `\n+${v.overflow} more not shown` : "";
  return (v.hits.map(hitLine).join("\n") || "(no hits)") + more;
}
