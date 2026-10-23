import { action, done, refuse, type Outcome } from "../../shared/action.mts";
import { readIntake, snapshotInto, writeRecord, type IntakeRecord } from "../../shared/sources/intake.mts";
import { liveLookup } from "../../shared/sources/places.mts";
import { extractReferences } from "../../shared/sources/references.mts";
import { resolveReferences, type AmbiguousRef, type Lookup, type ResolvedRef } from "../../shared/sources/resolve.mts";
import { isReachable, type Source } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { declaredSources } from "./reachable.mts";

export type AddInput = { id: WorkId; ref: string };
export type Added = { added: true; ref: ResolvedRef } | { added: false; ref: ResolvedRef | AmbiguousRef };

const asStoryText = (ref: string) => `\`${ref}\``;

function searchedPlaces(sources: readonly Source[], lookup: Lookup): string {
  return sources.filter(isReachable).map((s) => `${s.name}: ${lookup.labels(s).join(", ")}`).join("; ") || "no reachable source";
}

function resolveAndAdd(root: string, id: WorkId, intake: IntakeRecord, ref: string): Outcome<Added> {
  const sources = declaredSources(root);
  const lookup = liveLookup();
  const { refs: [rec], failures, bytes } = resolveReferences(asStoryText(ref), sources, lookup);
  if (failures.length) return refuse(failures.join("\n"), { failures });
  if (!rec) return refuse(`${ref}: not found; searched ${searchedPlaces(sources, lookup)}`, { ref });
  if (rec.status === "ambiguous") return refuse(`${ref} differs across places: ${rec.candidates.join(", ")}; record an OQ, or pin it as ${rec.source}@<branch>:${rec.path}`, { ref, candidates: rec.candidates });
  const found = bytes.get(rec.ref);
  const added = found ? snapshotInto(root, id, rec, found) : rec;
  writeRecord(root, id, { refs: [...intake.refs, added], unmatched: intake.unmatched.filter((u) => u !== added.path) });
  return done({ added: true, ref: added });
}

export const addSourceRef = action<AddInput, Added>(async ({ id, ref }, { root }) => {
  readState(root, id);
  const intake = readIntake(root, id) ?? { refs: [], unmatched: [] };
  const [reference] = extractReferences(asStoryText(ref)).refs;
  if (!reference) return refuse(`${ref} is not a path reference (expected <path>[#anchor] or <source>@<branch>:<path>)`, { ref });
  const present = intake.refs.find((r) => r.ref === reference.ref);
  if (present) return done({ added: false, ref: present });
  return resolveAndAdd(root, id, intake, ref);
});

function parseAdd(args: Args): AddInput {
  const [id, ref] = args.pos;
  if (!id || !ref) throw new UsageError("source add needs <id> <ref>");
  return { id: workId(id), ref };
}

function renderAdd(v: Added): string {
  if (!v.added) return `${v.ref.ref}: already recorded`;
  return `${v.ref.ref}: added from ${v.ref.branch ?? v.ref.worktree} @ ${String(v.ref.commit).slice(0, 8)} (${v.ref.chosen_by}) · snapshot ${v.ref.snapshot}`;
}

export const verb: VerbSpec<AddInput, Added> = {
  usage: "source add <id> <ref>",
  output: "json",
  parse: parseAdd,
  run: addSourceRef,
  render: renderAdd,
};
