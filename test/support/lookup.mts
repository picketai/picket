import type { Candidate } from "../../src/lib/shared/sources/places.mts";
import type { Lookup } from "../../src/lib/shared/sources/resolve.mts";

export type CandidateOptions = { main?: boolean; branch?: string | null; worktree?: string | null; commit?: string | null; dirty?: boolean; bytes?: Uint8Array };
export type LookupTable = Record<string, Record<string, Candidate[]>>;

export function candidate(label: string, sha256: string, { main = false, branch = label, worktree = null, commit = null, dirty = false, bytes = Buffer.from(label) }: CandidateOptions = {}): Candidate {
  return { label, worktree, branch, commit, main, sha256, dirty, bytes };
}

export function lookupOf(table: LookupTable): Lookup {
  const bySource = (source: { name: string }) => table[source.name] ?? {};
  return {
    candidates: (source, path) => bySource(source)[path] ?? [],
    labels: (source) => [...new Set(Object.values(bySource(source)).flatMap((found) => found.map((c) => c.label)))],
  };
}

export function only(record: object, ...keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, (record as Record<string, unknown>)[key]]));
}
