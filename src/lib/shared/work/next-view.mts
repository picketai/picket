import { securityPaths } from "../config.mjs";
import type { WorkId } from "./files.mts";
import type { Gate } from "./gate.mts";
import { nextStep, type NextAction, type NextStep } from "./next-step.mts";
import { readSnapshot, stateView, type StateView, type WorkSnapshot } from "./snapshot.mts";
import { currentItem, isSessionId, lastActivity, type Lane, type Status } from "./state.mts";
import type { LatestView as WireLatestView, NextView as WireNextView } from "../views.mts";

export type NextView = WireNextView & {
  id: WorkId;
  lane: Lane;
  status: Status;
  own_gate: Gate | null;
  action: NextAction;
  actor: NextStep["actor"];
};

export type LatestView = WireLatestView & ({ id: null } | NextView);

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

function stampOf(view: StateView): string | null {
  return isSessionId(view.session) ? view.session : null;
}

export function latest(root: string, { session }: { session?: string | null } = {}): LatestView {
  const current = currentItem(root, { session: session ?? null });
  if (!current) return { id: null, action: "none", actor: null, phase: null, detail: "no open work item", options: [] };
  const snap = readSnapshot(root, current.id);
  const view = stateView(snap);
  const given = isSessionId(session);
  return {
    ...nextOf(snap, securityPaths(root)),
    title: view.title,
    phases_approved: view.phases_approved,
    phase_count: view.phase_count,
    blocked_reason: view.blocked_reason ?? null,
    since: lastActivity(view, view.last_verdict),
    by: view.last_verdict?.agent ?? null,
    session: stampOf(view),
    other_session: given && stampOf(view) !== session,
  };
}
