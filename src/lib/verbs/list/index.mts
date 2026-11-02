import { existsSync } from "node:fs";
import { join } from "node:path";
import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { securityPaths } from "../../shared/config.mjs";
import { hostConfigDir, liveSessionIds } from "../../shared/host-sessions.mts";
import type { ItemLayout } from "../../shared/repos.mts";
import type { ListRowView, WorktreeView } from "../../shared/views.mts";
import { attentionOf, sessionsOf } from "../../shared/work/attention.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { nextOf } from "../../shared/work/next-view.mts";
import { readSnapshot, stateView } from "../../shared/work/snapshot.mts";
import { listWork } from "../../shared/work/state.mts";

export type ListInput = Record<string, never>;

type ListScope = { root: string; secured: readonly string[]; live: ReadonlySet<string> };

function worktreesOf(root: string, layout: ItemLayout): WorktreeView[] {
  return layout.repos.flatMap(({ path, worktree }) => (worktree ? [{ repo: path, path: worktree, present: existsSync(join(root, worktree)) }] : []));
}

function rowOf({ root, secured, live }: ListScope, id: WorkId): ListRowView {
  const snap = readSnapshot(root, id);
  const d = stateView(snap);
  const next = nextOf(snap, secured);
  const sessions = sessionsOf(snap.state, snap.verdicts);
  const session = sessions.at(-1) ?? null;
  return {
    id,
    lane: d.lane,
    status: d.status,
    title: d.title,
    phases: `${d.phases_approved}/${d.phase_count}`,
    next: next.action,
    attention: attentionOf(d.status, next.actor, session !== null && live.has(session)),
    sessions,
    session,
    branch: d.branch ?? null,
    worktrees: worktreesOf(root, snap.layout),
  };
}

export const list = action<ListInput, ListRowView[]>(async (_input, { root, env, home }) => {
  const scope: ListScope = { root, secured: securityPaths(root), live: liveSessionIds(hostConfigDir(env, home)) };
  return done(listWork(root).map((id) => rowOf(scope, id)));
});

function renderList(rows: ListRowView[]): string {
  return rows.map((i) => `${i.id}  ${i.lane.padEnd(8)} ${i.status.padEnd(9)} ${i.phases.padEnd(5)} ${i.next.padEnd(16)} ${i.title}`).join("\n") || "(no work items)";
}

export const verb: VerbSpec<ListInput, ListRowView[]> = {
  usage: "list",
  output: "json",
  parse: () => ({}),
  run: list,
  render: renderList,
};
