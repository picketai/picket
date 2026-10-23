import { ownGate, type Gate } from "./gate.mts";
import { phaseOf, type PhaseStatus, type WorkSnapshot } from "./snapshot.mts";
import { ARTIFACT_BY_LANE, type Lane } from "./state.mts";

export const NEXT_ACTIONS = ["resolve_sources", "write_artifact", "implement_phase", "approve_phase", "review_cumulative", "review_checkpoint", "resolve_block", "close", "none"] as const;

export type NextAction = (typeof NEXT_ACTIONS)[number];

export type NextStep =
  | { action: "none"; actor: null; detail: string }
  | { action: "resolve_block"; actor: "user"; detail: string; options: string[] }
  | { action: "resolve_sources"; actor: "user"; detail: string; options: string[] }
  | { action: "write_artifact"; actor: "architect" | "analyst"; detail: string }
  | { action: "implement_phase"; actor: "developer"; phase: number; detail: string }
  | { action: "approve_phase"; actor: "user"; phase: number; detail: string; options: string[]; own_gate?: Gate | null }
  | { action: "review_checkpoint" | "review_cumulative"; actor: "reviewer"; phase: number; detail: string }
  | { action: "close"; actor: "lead"; detail: string };

const HEAVY: readonly Lane[] = ["design"];
const MIDPOINT_MIN_PHASES = 6;

function isCumulativelyReviewed(snap: WorkSnapshot): boolean {
  return snap.phases.every((p) => p.reviewed) || snap.verdicts.some((v) => v.verdict === "APPROVED" && v.scope === "cumulative");
}

function allApprovedStep(snap: WorkSnapshot): NextStep {
  if (!isCumulativelyReviewed(snap)) return { action: "review_cumulative", actor: "reviewer", phase: snap.phases.length, detail: "all phases approved; one cumulative review remains" };
  return { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };
}

function isMidpoint(snap: WorkSnapshot, current: PhaseStatus): boolean {
  const count = snap.phases.length;
  return HEAVY.includes(snap.state.lane) && count >= MIDPOINT_MIN_PHASES && current.n === Math.ceil(count / 2) + 1;
}

function startStep(snap: WorkSnapshot, current: PhaseStatus): NextStep {
  const prev = phaseOf(snap, current.n - 1);
  if (prev && isMidpoint(snap, current) && !prev.reviewed) return { action: "review_checkpoint", actor: "reviewer", phase: prev.n, detail: `mid-plan checkpoint before phase ${current.n}` };
  return { action: "implement_phase", actor: "developer", phase: current.n, detail: `phase ${current.n} of ${snap.phases.length}: ${current.title}` };
}

function approvalStep(snap: WorkSnapshot, current: PhaseStatus, securityPaths: readonly string[]): NextStep {
  const remaining = snap.phases.filter((p) => p.n > current.n && !p.approved).map((p) => p.n);
  const runOffer = remaining.length ? `[r] run through ${remaining.at(-1)}` : null;
  const own_gate = ownGate(current, securityPaths);
  const awaiting = `phase ${current.n} of ${snap.phases.length} is done and awaits your decision`;
  return {
    action: "approve_phase",
    actor: "user",
    phase: current.n,
    detail: own_gate ? `${awaiting}; it ${own_gate.reason}` : awaiting,
    options: ["[a] approve", runOffer, "[x] reject: <why>"].filter((option): option is string => option !== null),
    own_gate,
  };
}

function phasedStep(snap: WorkSnapshot, securityPaths: readonly string[]): NextStep {
  if (snap.phases.length === 0) return { action: "write_artifact", actor: "architect", detail: `${snap.artifact?.path} has no "## Phase N" headings` };
  const current = snap.phases.find((p) => !p.approved);
  if (!current) return allApprovedStep(snap);
  if (!current.done) return startStep(snap, current);
  return approvalStep(snap, current, securityPaths);
}

export function nextStep(snap: WorkSnapshot, securityPaths: readonly string[]): NextStep {
  const { id, lane, status } = snap.state;
  if (status === "done" || status === "abandoned") return { action: "none", actor: null, detail: `work item is ${status}` };
  if (status === "blocked") return { action: "resolve_block", actor: "user", detail: snap.state.blocked_reason ?? "", options: ["[c] continue", "[x] abandon"] };
  const ambiguous = snap.ambiguousRefs.length;
  if (ambiguous) return { action: "resolve_sources", actor: "user", detail: `${ambiguous} reference(s) differ across worktrees`, options: [`[p] pick: picket source pick ${id} <ref> <label>`] };
  if (lane === "fast") return { action: "close", actor: "lead", detail: "fast lane: finish the change, run the checks, then close" };
  if (!snap.artifact) return { action: "write_artifact", actor: lane === "research" ? "analyst" : "architect", detail: `${ARTIFACT_BY_LANE[lane]} does not exist yet` };
  if (lane === "research") return { action: "approve_phase", actor: "user", phase: 1, detail: "report written; accept or ask for a deeper pass", options: ["[a] accept", "[d] deeper pass", "[x] reject: <why>"] };
  return phasedStep(snap, securityPaths);
}
