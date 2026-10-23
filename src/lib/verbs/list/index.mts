import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { securityPaths } from "../../shared/config.mjs";
import type { WorkId } from "../../shared/work/files.mts";
import { nextOf } from "../../shared/work/next-view.mts";
import { readSnapshot, stateView } from "../../shared/work/snapshot.mts";
import { listWork } from "../../shared/work/state.mts";

export type ListInput = Record<string, never>;
export type ListRow = { id: string; lane: string; status: string; title: string; phases: string; next: string };

function rowOf(root: string, id: WorkId, secured: readonly string[]): ListRow {
  const snap = readSnapshot(root, id);
  const d = stateView(snap);
  return { id, lane: d.lane, status: d.status, title: d.title, phases: `${d.phases_approved}/${d.phase_count}`, next: nextOf(snap, secured).action };
}

export const list = action<ListInput, ListRow[]>(async (_input, { root }) => {
  const secured = securityPaths(root);
  return done(listWork(root).map((id) => rowOf(root, id, secured)));
});

function renderList(rows: ListRow[]): string {
  return rows.map((i) => `${i.id}  ${i.lane.padEnd(8)} ${i.status.padEnd(9)} ${i.phases.padEnd(5)} ${i.next.padEnd(16)} ${i.title}`).join("\n") || "(no work items)";
}

export const verb: VerbSpec<ListInput, ListRow[]> = {
  usage: "list",
  output: "json",
  parse: () => ({}),
  run: list,
  render: renderList,
};
