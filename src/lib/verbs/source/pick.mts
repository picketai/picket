import { action, done, refuse } from "../../shared/action.mts";
import { readIntake, snapshotInto, writeRecord } from "../../shared/sources/intake.mts";
import { liveLookup } from "../../shared/sources/places.mts";
import { resolvedRef, type ResolvedRef } from "../../shared/sources/resolve.mts";
import { isReachable } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workFile, workId, type WorkId } from "../../shared/work/files.mts";
import { readNext } from "../../shared/work/next-view.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { declaredSources } from "./reachable.mts";

export type PickInput = { id: WorkId; ref: string; label: string };
export type PickedRef = ResolvedRef & { next: { action: string } };

export const pickVersion = action<PickInput, PickedRef>(async ({ id, ref, label }, { root }) => {
  const intake = readIntake(root, id);
  const i = intake?.refs.findIndex((r) => r.ref === ref) ?? -1;
  if (!intake || i < 0) return refuse(`no reference ${ref} in ${workFile(root, id, "sources.yaml")}`, { ref });
  const entry = intake.refs[i];
  if (entry.status !== "ambiguous") return refuse(`${ref} is already resolved (chosen_by: ${entry.chosen_by})`, { ref, chosen_by: entry.chosen_by });
  const source = declaredSources(root).find((s) => s.name === entry.source);
  if (!source || !isReachable(source)) return refuse(`source ${entry.source} is unreachable: ${source?.reason ?? "not declared"}`, { source: entry.source });
  const found = liveLookup().candidates(source, entry.path);
  const chosen = found.find((c) => c.label === label);
  if (!chosen) return refuse(`no candidate ${label} for ${ref}; labels: ${found.map((c) => c.label).join(", ")}`, { ref, labels: found.map((c) => c.label) });
  const rec = snapshotInto(root, id, resolvedRef({ ref: entry.ref, path: entry.path }, entry.source, chosen, "user"), chosen.bytes);
  intake.refs[i] = rec;
  writeRecord(root, id, intake);
  return done({ ...rec, next: readNext(root, id) });
});

function parsePick(args: Args): PickInput {
  const [id, ref, label] = args.pos;
  if (!id || !ref || !label) throw new UsageError("source pick needs <id> <ref> <label>");
  return { id: workId(id), ref, label };
}

function renderPick(v: PickedRef): string {
  return `${v.ref}: ${v.branch ?? v.worktree} @ ${String(v.commit).slice(0, 8)} (chosen_by user) · next: ${v.next.action}`;
}

export const verb: VerbSpec<PickInput, PickedRef> = {
  usage: "source pick <id> <ref> <label>",
  output: "json",
  parse: parsePick,
  run: pickVersion,
  render: renderPick,
};
