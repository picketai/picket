// The single next action for a work item, computed from derived state. Never stored.
// Every branch returns { action, actor, phase, detail, options } where `options` is the bracket menu
// the gate packet shows the user (empty when no user decision is due).
import { deriveState, isSessionId, listOpenWork, workDir } from "./work.mjs";
import { ambiguousRefs } from "../sources/sources.mjs";
import { ownGate } from "./gate.mjs";

export const ACTIONS = Object.freeze([
  "resolve_sources", // user picks a version for each ambiguous story reference
  "write_artifact", // architect or analyst produces the lane's artifact
  "implement_phase", // developer implements phase N
  "approve_phase", // user decides on phase N
  "review_cumulative", // reviewer runs the end-of-plan pass
  "review_checkpoint", // reviewer runs a mid-plan pass before the next phase
  "resolve_block", // user or lead clears blocked_reason
  "close", // mark done
  "none", // done or abandoned
]);

const HEAVY = new Set(["design"]);

export function next(id, root) {
  const s = deriveState(id, root);
  const base = { id: s.id, lane: s.lane, status: s.status, phase: null, options: [], own_gate: null };

  if (s.status === "done" || s.status === "abandoned") return { ...base, action: "none", actor: null, detail: `work item is ${s.status}` };
  if (s.status === "blocked") return { ...base, action: "resolve_block", actor: "user", detail: s.blocked_reason, options: ["[c] continue", "[x] abandon"] };

  // The opening gate: a story reference with differing versions across the source's worktrees is
  // the user's pick, before anyone reads it.
  const ambiguous = ambiguousRefs(workDir(id, root));
  if (ambiguous.length) {
    return { ...base, action: "resolve_sources", actor: "user", detail: `${ambiguous.length} reference(s) differ across worktrees`, options: [`[p] pick: picket source pick ${id} <ref> <label>`] };
  }

  if (s.lane === "fast") {
    // The fast lane has no artifact and no phases: it is running or it is done.
    return { ...base, action: "close", actor: "lead", detail: "fast lane: finish the change, run the checks, then close" };
  }

  if (!s.artifact) {
    const actor = s.lane === "research" ? "analyst" : "architect";
    return { ...base, action: "write_artifact", actor, detail: `${s.artifact_expected} does not exist yet` };
  }

  if (s.lane === "research") {
    return { ...base, action: "approve_phase", actor: "user", phase: 1, detail: "report written; accept or ask for a deeper pass", options: ["[a] accept", "[d] deeper pass", "[x] reject: <why>"] };
  }

  if (s.phase_count === 0) return { ...base, action: "write_artifact", actor: "architect", detail: `${s.artifact} has no "## Phase N" headings` };

  const current = s.phases.find((p) => !p.approved);
  if (!current) {
    const reviewed = s.phases.every((p) => p.reviewed) || s.verdicts.some((v) => v.verdict === "APPROVED" && v.scope === "cumulative");
    if (!reviewed) return { ...base, action: "review_cumulative", actor: "reviewer", phase: s.phase_count, detail: "all phases approved; one cumulative review remains" };
    // No user decision here: the review passed, the lead closes and prints the closing block.
    return { ...base, action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };
  }

  if (!current.done) {
    // A checkpoint gates the START of a phase in the heavy lane: midpoint, or after a reviewed-required phase.
    const prev = s.phases.find((p) => p.n === current.n - 1);
    const midpoint = HEAVY.has(s.lane) && s.phase_count >= 6 && current.n === Math.ceil(s.phase_count / 2) + 1;
    if (prev && midpoint && !prev.reviewed) return { ...base, action: "review_checkpoint", actor: "reviewer", phase: prev.n, detail: `mid-plan checkpoint before phase ${current.n}` };
    return { ...base, action: "implement_phase", actor: "developer", phase: current.n, detail: `phase ${current.n} of ${s.phase_count}: ${current.title}` };
  }

  const remaining = s.phases.filter((p) => p.n > current.n && !p.approved).map((p) => p.n);
  const runOffer = remaining.length ? `[r] run through ${remaining.at(-1)}` : null;
  const own_gate = ownGate(id, current.n, root);
  const awaiting = `phase ${current.n} of ${s.phase_count} is done and awaits your decision`;
  return {
    ...base,
    action: "approve_phase",
    actor: "user",
    phase: current.n,
    detail: own_gate ? `${awaiting}; it ${own_gate.reason}` : awaiting,
    options: ["[a] approve", runOffer, "[x] reject: <why>"].filter(Boolean),
    own_gate,
  };
}

function sinceOf(s) {
  const ts = s.last_verdict?.ts;
  return ts && ts > s.updated ? ts : s.updated;
}

function newestOf(items) {
  return items.reduce((best, s) => {
    const order = sinceOf(s).localeCompare(sinceOf(best)) || s.id.localeCompare(best.id);
    return order > 0 ? s : best;
  });
}

function stampOf(s) {
  return isSessionId(s.session) ? s.session : null;
}

export function latest(root, { session } = {}) {
  const open = listOpenWork(root).map((id) => deriveState(id, root));
  if (!open.length) return { id: null, action: "none", actor: null, phase: null, detail: "no open work item", options: [] };
  const given = isSessionId(session);
  const own = given ? open.filter((s) => stampOf(s) === session) : [];
  const newest = newestOf(own.length ? own : open);
  return {
    ...next(newest.id, root),
    title: newest.title,
    phases_approved: newest.phases_approved,
    phase_count: newest.phase_count,
    blocked_reason: newest.blocked_reason ?? null,
    since: sinceOf(newest),
    by: newest.last_verdict?.agent ?? null,
    session: stampOf(newest),
    other_session: given && stampOf(newest) !== session,
  };
}
