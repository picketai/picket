import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { next } from "../../shared/work/next-step.mjs";
import { deriveState, listWork } from "../../shared/work/work.mjs";

export type ListInput = Record<string, never>;
export type ListRow = { id: string; lane: string; status: string; title: string; phases: string; next: string };

type Summary = { lane: string; status: string; title: string; phases_approved: number; phase_count: number };

function summaryOf(root: string, id: string): Summary {
  return deriveState(id, root) as unknown as Summary;
}

function rowOf(root: string, id: string): ListRow {
  const d = summaryOf(root, id);
  return { id, lane: d.lane, status: d.status, title: d.title, phases: `${d.phases_approved}/${d.phase_count}`, next: next(id, root).action };
}

export const list = action<ListInput, ListRow[]>(async (_input, { root }) => done((listWork(root) as string[]).map((id) => rowOf(root, id))));

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
