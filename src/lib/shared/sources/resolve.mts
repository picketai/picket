import { extractReferences, hasExtension, type Reference } from "./references.mts";
import { isReachable, type ReachableSource, type Source } from "./source.mts";
import type { Candidate } from "./places.mts";

export type Lookup = {
  candidates: (source: ReachableSource, path: string) => Candidate[];
  labels: (source: ReachableSource) => string[];
};

export type ChosenBy = "single" | "identical" | "pin" | "user";

export type ResolvedRef = {
  ref: string;
  source: string;
  path: string;
  status: "resolved";
  chosen_by: ChosenBy;
  worktree: string | null;
  branch: string | null;
  commit: string | null;
  sha256: string;
  dirty: boolean;
  snapshot: string | null;
  snapshot_reason?: string;
  anchor?: string;
};

export type AmbiguousRef = { ref: string; source: string; path: string; status: "ambiguous"; candidates: string[] };

export type Resolution = { refs: (ResolvedRef | AmbiguousRef)[]; unmatched: string[]; failures: string[]; bytes: Map<string, Uint8Array> };

type Chosen = { rec: ResolvedRef | AmbiguousRef; bytes: Uint8Array | null };

export function resolvedRef(reference: Pick<Reference, "ref" | "path"> & { anchor?: string | null }, sourceName: string, candidate: Candidate, chosenBy: ChosenBy): ResolvedRef {
  const rec: ResolvedRef = {
    ref: reference.ref,
    source: sourceName,
    path: reference.path,
    status: "resolved",
    chosen_by: chosenBy,
    worktree: candidate.worktree,
    branch: candidate.branch,
    commit: candidate.commit,
    sha256: candidate.sha256,
    dirty: candidate.dirty,
    snapshot: null,
  };
  if (reference.anchor) rec.anchor = reference.anchor;
  return rec;
}

function choose(reference: Reference, sourceName: string, found: Candidate[]): Chosen {
  if (found.length === 1) return { rec: resolvedRef(reference, sourceName, found[0], "single"), bytes: found[0].bytes };
  if (new Set(found.map((c) => c.sha256)).size === 1) {
    const c = found.find((x) => x.main) ?? found[0];
    return { rec: resolvedRef(reference, sourceName, c, "identical"), bytes: c.bytes };
  }
  return { rec: { ref: reference.ref, source: sourceName, path: reference.path, status: "ambiguous", candidates: found.map((c) => c.label) }, bytes: null };
}

function resolvePin(reference: Reference, sources: readonly Source[], lookup: Lookup): Chosen | string {
  const source = sources.find((s) => s.name === reference.source);
  if (!source || !isReachable(source)) return `${reference.ref}: source ${reference.source} is ${source ? `unreachable (${source.reason})` : "not declared"}`;
  const found = lookup.candidates(source, reference.path).filter((c) => c.branch === reference.pin);
  if (!found.length) return `${reference.ref}: no ${reference.path} on branch ${reference.pin}; searched ${lookup.labels(source).join(", ")}`;
  return { rec: resolvedRef(reference, source.name, found[0], "pin"), bytes: found[0].bytes };
}

function firstFound(reference: Reference, reachable: readonly ReachableSource[], lookup: Lookup): Chosen | null {
  for (const source of reachable) {
    const found = lookup.candidates(source, reference.path);
    if (found.length) return choose(reference, source.name, found);
  }
  return null;
}

export function resolveReferences(text: string, sources: readonly Source[], lookup: Lookup): Resolution {
  const reachable = sources.filter(isReachable);
  const refs: Resolution["refs"] = [];
  const failures: string[] = [];
  const bytes = new Map<string, Uint8Array>();
  const keep = ({ rec, bytes: b }: Chosen) => {
    refs.push(rec);
    if (b) bytes.set(rec.ref, b);
  };
  const { refs: found, unshaped } = extractReferences(text);
  const unmatched = [...unshaped];
  for (const reference of found) {
    if (reference.pin) {
      const pinned = resolvePin(reference, sources, lookup);
      if (typeof pinned === "string") failures.push(pinned);
      else keep(pinned);
      continue;
    }
    const hit = firstFound(reference, reachable, lookup);
    if (hit) keep(hit);
    else if (reference.path.includes("/") && hasExtension(reference.path) && !unmatched.includes(reference.path)) unmatched.push(reference.path);
  }
  return { refs, unmatched, failures, bytes };
}
