import { securityPaths } from "../config.mjs";
import type { WorkId } from "./files.mts";
import type { Gate } from "./gate.mts";
import { nextStep, type NextAction, type NextStep } from "./next-step.mts";
import { readSnapshot, stateView, type StateView, type WorkSnapshot } from "./snapshot.mts";
import { isSessionId, listOpenWork, type Lane, type Status } from "./state.mts";

export type NextView = {
  id: WorkId;
  lane: Lane;
  status: Status;
  phase: number | null;
  options: string[];
  own_gate: Gate | null;
  action: NextAction;
  actor: NextStep["actor"];
  detail: string;
  warnings?: string[];
};

export type LatestView =
  | { id: null; action: "none"; actor: null; phase: null; detail: string; options: string[] }
  | (NextView & {
      title: string;
      phases_approved: number;
      phase_count: number;
      blocked_reason: string | null;
      since: string;
      by: string | null;
      session: string | null;
      other_session: boolean;
    });

type Seen = { snap: WorkSnapshot; view: StateView };

export function nextView(snap: WorkSnapshot, step: NextStep): NextView {
  const { id, lane, status } = snap.state;
  const view: NextView = {
    id,
    lane,
    status,
    phase: "phase" in step ? step.phase : null,
    options: "options" in step ? step.options : [],
    own_gate: "own_gate" in step ? (step.own_gate ?? null) : null,
    action: step.action,
    actor: step.actor,
    detail: step.detail,
  };
  return snap.warnings.length ? { ...view, warnings: snap.warnings } : view;
}

export function nextOf(snap: WorkSnapshot, securityPaths: readonly string[]): NextView {
  return nextView(snap, nextStep(snap, securityPaths));
}

export function readNext(root: string, id: WorkId): NextView {
  return nextOf(readSnapshot(root, id), securityPaths(root));
}

function sinceOf(view: StateView): string {
  const ts = view.last_verdict?.ts;
  const updated = view.updated ?? view.created;
  return ts && ts > updated ? ts : updated;
}

function newestOf(items: Seen[]): Seen {
  return items.reduce((best, item) => {
    const order = sinceOf(item.view).localeCompare(sinceOf(best.view)) || item.view.id.localeCompare(best.view.id);
    return order > 0 ? item : best;
  });
}

function stampOf(view: StateView): string | null {
  return isSessionId(view.session) ? view.session : null;
}

export function latest(root: string, { session }: { session?: string | null } = {}): LatestView {
  const open = listOpenWork(root).map((id): Seen => {
    const snap = readSnapshot(root, id);
    return { snap, view: stateView(snap) };
  });
  if (!open.length) return { id: null, action: "none", actor: null, phase: null, detail: "no open work item", options: [] };
  const given = isSessionId(session);
  const own = given ? open.filter(({ view }) => stampOf(view) === session) : [];
  const { snap, view } = newestOf(own.length ? own : open);
  return {
    ...nextOf(snap, securityPaths(root)),
    title: view.title,
    phases_approved: view.phases_approved,
    phase_count: view.phase_count,
    blocked_reason: view.blocked_reason ?? null,
    since: sinceOf(view),
    by: view.last_verdict?.agent ?? null,
    session: stampOf(view),
    other_session: given && stampOf(view) !== session,
  };
}
