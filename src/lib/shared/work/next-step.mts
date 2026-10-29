import { ownGate, type Gate } from "./gate.mts";
import { phaseOf, type PhaseStatus, type WorkSnapshot } from "./snapshot.mts";
import { ARTIFACT_BY_LANE, type Lane } from "./state.mts";
import type { VerdictRow } from "./verdict-log.mts";

export { NEXT_ACTIONS, type NextAction } from "./action-text.mts";

export type NextStep =
  | { action: "none"; actor: null; detail: string }
  | { action: "resolve_block" | "resolve_rejections"; actor: "user"; detail: string; options: string[] }
  | { action: "resolve_sources"; actor: "user"; detail: string; options: string[] }
  | { action: "write_artifact"; actor: "architect" | "analyst"; detail: string }
  | { action: "implement_phase"; actor: "developer"; phase: number; detail: string }
  | { action: "approve_phase"; actor: "user"; phase: number; detail: string; options: string[]; own_gate?: Gate | null }
  | { action: "review_checkpoint" | "review_cumulative"; actor: "reviewer"; phase: number; detail: string }
  | { action: "close"; actor: "lead"; detail: string }
  | { action: "fix_findings"; actor: "developer"; phase: number; detail: string }
  | { action: "amend"; actor: "architect"; detail: string };

const HEAVY: readonly Lane[] = ["design"];
const PHASED: readonly Lane[] = ["order", "design"];
const MIDPOINT_MIN_PHASES = 6;
const STALL_REPEATS = 3;
const STALL_OPTIONS = ["[c] continue with a fresh developer", "[d] redesign", "[x] abandon"];
const BLOCK_OPTIONS = ["[c] continue", "[x] abandon"];
const IRREVERSIBLE_OPTIONS = ["[i] confirm the irreversible step", "[x] reject: <why>"];

function isCumulativelyReviewed(snap: WorkSnapshot): boolean {
  return snap.phases.every((p) => p.reviewed) || snap.verdicts.some((v) => v.verdict === "APPROVED" && v.scope === "cumulative");
}

function isCumulativeRejection(row: VerdictRow | undefined): boolean {
  return row?.verdict === "CHANGES REQUIRED" && row.scope === "cumulative";
}

function cumulativeRejectionsSinceApproval(verdicts: readonly VerdictRow[]): number {
  const lastApproval = verdicts.map((v) => v.verdict).lastIndexOf("approved");
  return verdicts.slice(lastApproval + 1).filter(isCumulativeRejection).length;
}

function rejectionsStep(snap: WorkSnapshot): NextStep | null {
  if (!isCumulativeRejection(snap.verdicts.at(-1))) return null;
  const rejections = cumulativeRejectionsSinceApproval(snap.verdicts);
  if (rejections % STALL_REPEATS !== 0) return null;
  return { action: "resolve_rejections", actor: "user", detail: `${rejections} cumulative reviews returned CHANGES REQUIRED since the last approval`, options: STALL_OPTIONS };
}

function lastIndexWhere(verdicts: readonly VerdictRow[], matches: (row: VerdictRow) => boolean): number {
  for (let i = verdicts.length - 1; i >= 0; i--) if (matches(verdicts[i])) return i;
  return -1;
}

function pendingAmend({ verdicts }: WorkSnapshot): string | null {
  const at = lastIndexWhere(verdicts, (v) => Boolean(v.amend));
  if (at < 0 || verdicts.slice(at + 1).some((v) => v.verdict === "AMENDED")) return null;
  return verdicts[at].amend ?? null;
}

function amendStep(snap: WorkSnapshot): NextStep | null {
  const amend = pendingAmend(snap);
  return amend ? { action: "amend", actor: "architect", detail: amend } : null;
}

function findingsOpen({ verdicts }: WorkSnapshot): boolean {
  const at = lastIndexWhere(verdicts, (v) => v.agent === "reviewer" && v.scope === "cumulative");
  return isCumulativeRejection(verdicts[at]) && !verdicts.slice(at + 1).some((v) => v.verdict === "PHASE DONE");
}

function findingsStep(snap: WorkSnapshot): NextStep | null {
  if (!findingsOpen(snap)) return null;
  return { action: "fix_findings", actor: "developer", phase: snap.phases.length, detail: "the cumulative review returned CHANGES REQUIRED; fix its findings" };
}

function allApprovedStep(snap: WorkSnapshot): NextStep {
  if (isCumulativelyReviewed(snap)) return { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };
  return rejectionsStep(snap) ?? amendStep(snap) ?? findingsStep(snap) ?? { action: "review_cumulative", actor: "reviewer", phase: snap.phases.length, detail: "all phases approved; one cumulative review remains" };
}

function countOf(verdicts: readonly VerdictRow[], verdict: string): number {
  return verdicts.filter((v) => v.verdict === verdict).length;
}

function isStalled(snap: WorkSnapshot): boolean {
  if (!PHASED.includes(snap.state.lane)) return false;
  const { verdicts } = snap;
  return verdicts.at(-1)?.verdict === "PHASE STALLED" || countOf(verdicts, "DRIFT DETECTED") >= STALL_REPEATS || countOf(verdicts, "AMENDED") >= STALL_REPEATS;
}

function blockStep(snap: WorkSnapshot): NextStep {
  const amend = PHASED.includes(snap.state.lane) && !isStalled(snap) ? amendStep(snap) : null;
  return amend ?? { action: "resolve_block", actor: "user", detail: snap.state.blocked_reason ?? "", options: isStalled(snap) ? STALL_OPTIONS : BLOCK_OPTIONS };
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
    options: current.irreversible ? IRREVERSIBLE_OPTIONS : ["[a] approve", runOffer, "[x] reject: <why>"].filter((option): option is string => option !== null),
    own_gate,
  };
}

function phasedStep(snap: WorkSnapshot, securityPaths: readonly string[]): NextStep {
  if (snap.phases.length === 0) return { action: "write_artifact", actor: "architect", detail: `${snap.artifact?.path} has no "## Phase N" headings` };
  const current = snap.phases.find((p) => !p.approved);
  if (!current) return allApprovedStep(snap);
  const amend = amendStep(snap);
  if (amend) return amend;
  if (!current.done) return startStep(snap, current);
  return approvalStep(snap, current, securityPaths);
}

export function nextStep(snap: WorkSnapshot, securityPaths: readonly string[]): NextStep {
  const { id, lane, status } = snap.state;
  if (status === "done" || status === "abandoned") return { action: "none", actor: null, detail: `work item is ${status}` };
  if (status === "blocked") return blockStep(snap);
  const ambiguous = snap.ambiguousRefs.length;
  if (ambiguous) return { action: "resolve_sources", actor: "user", detail: `${ambiguous} reference(s) differ across worktrees`, options: [`[p] pick: picket source pick ${id} <ref> <label>`] };
  if (lane === "fast") return { action: "close", actor: "lead", detail: "fast lane: finish the change, run the checks, then close" };
  if (!snap.artifact) return { action: "write_artifact", actor: lane === "research" ? "analyst" : "architect", detail: `${ARTIFACT_BY_LANE[lane]} does not exist yet` };
  if (lane === "research") return { action: "approve_phase", actor: "user", phase: 1, detail: "report written; accept or ask for a deeper pass", options: ["[a] accept", "[d] deeper pass", "[x] reject: <why>"] };
  return phasedStep(snap, securityPaths);
}
