import { ticketKey, touchedRepos } from "../checkouts.mts";
import { documentRel, documentSlug } from "../document-path.mts";
import { decisionsRevisedSince, phasePaths } from "./artifact.mts";
import { ownGate, type Gate } from "./gate.mts";
import { freshReplies, type AmendmentChoice } from "./replies.mts";
import { reviewRel } from "./reviews.mts";
import { phaseOf, type PhaseStatus, type WorkSnapshot } from "./snapshot.mts";
import { amendmentsAnsweringBlocks, newestBlockRow, STALL_REPEATS } from "./stall.mts";
import { ARTIFACT_BY_LANE, type Lane } from "./state.mts";
import type { VerdictRow } from "./verdict-log.mts";

export { NEXT_ACTIONS, type NextAction } from "./action-text.mts";

export type FindingsReview = "checkpoint" | "cumulative";

export type NextStep =
  | { action: "none"; actor: null; detail: string }
  | { action: "resolve_block" | "resolve_rejections" | "approve_amendment"; actor: "user"; detail: string; options: string[] }
  | { action: "resolve_sources"; actor: "user"; detail: string; options: string[] }
  | { action: "write_artifact"; actor: "architect" | "analyst"; detail: string }
  | { action: "implement_phase"; actor: "developer"; phase: number; detail: string }
  | { action: "approve_phase"; actor: "user"; phase: number; detail: string; options: string[]; own_gate?: Gate | null }
  | { action: "review_checkpoint" | "review_cumulative"; actor: "reviewer"; phase: number; detail: string }
  | { action: "close"; actor: "lead"; detail: string }
  | { action: "fix_findings"; actor: "developer"; phase: number; review: FindingsReview; detail: string }
  | { action: "amend"; actor: "architect"; detail: string; reword?: true }
  | { action: "review_crosscheck"; actor: "reviewer"; detail: string; delta: string[] }
  | { action: "create_worktrees"; actor: "user"; phase: number; detail: string; options: string[] };

const HEAVY: readonly Lane[] = ["design"];
const PHASED: readonly Lane[] = ["order", "design"];
const MIDPOINT_MIN_PHASES = 6;
const ISO_DAY = "YYYY-MM-DD".length;
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

function freshAfterRejection(snap: WorkSnapshot): boolean {
  const rejection = snap.verdicts.at(-1);
  const fresh = freshReplies(snap.replies).at(-1);
  return rejection !== undefined && fresh !== undefined && Date.parse(fresh.ts) > Date.parse(rejection.ts);
}

function rejectionsStep(snap: WorkSnapshot): NextStep | null {
  if (!isCumulativeRejection(snap.verdicts.at(-1)) || freshAfterRejection(snap)) return null;
  const rejections = cumulativeRejectionsSinceApproval(snap.verdicts);
  if (rejections % STALL_REPEATS !== 0) return null;
  return { action: "resolve_rejections", actor: "user", detail: `${rejections} cumulative reviews returned CHANGES REQUIRED since the last approval`, options: STALL_OPTIONS };
}

function lastIndexWhere(verdicts: readonly VerdictRow[], matches: (row: VerdictRow) => boolean): number {
  for (let i = verdicts.length - 1; i >= 0; i--) if (matches(verdicts[i])) return i;
  return -1;
}

function pendingAmend({ verdicts }: WorkSnapshot): string | null {
  const at = lastIndexWhere(verdicts, (v) => Boolean(v.amend) && v.scope !== "cumulative");
  if (at < 0 || verdicts.slice(at + 1).some((v) => v.verdict === "AMENDED")) return null;
  return verdicts[at].amend ?? null;
}

function amendStep(snap: WorkSnapshot): NextStep | null {
  const amend = pendingAmend(snap);
  return amend ? { action: "amend", actor: "architect", detail: amend } : null;
}

function amendedDrift({ state, verdicts }: WorkSnapshot): VerdictRow | null {
  if (state.lane !== "design") return null;
  const at = lastIndexWhere(verdicts, (v) => v.agent === "reviewer" && v.scope === "crosscheck");
  if (verdicts[at]?.verdict !== "DRIFT DETECTED") return null;
  return verdicts.slice(at + 1).some((v) => v.verdict === "AMENDED") ? verdicts[at] : null;
}

function recheckStep(snap: WorkSnapshot): NextStep | null {
  const drift = amendedDrift(snap);
  if (!drift) return null;
  const delta = decisionsRevisedSince(snap.artifact?.body ?? "", drift.ts.slice(0, ISO_DAY));
  return { action: "review_crosscheck", actor: "reviewer", detail: "the design record was amended after a drift; the cross-check runs again", delta };
}

function findingsOpen({ verdicts }: WorkSnapshot, review: FindingsReview): boolean {
  const at = lastIndexWhere(verdicts, (v) => v.agent === "reviewer" && v.scope === review);
  return verdicts[at]?.verdict === "CHANGES REQUIRED" && !verdicts.slice(at + 1).some((v) => v.verdict === "PHASE DONE");
}

function findingsStep(snap: WorkSnapshot): NextStep | null {
  if (!findingsOpen(snap, "cumulative")) return null;
  return { action: "fix_findings", actor: "developer", phase: snap.phases.length, review: "cumulative", detail: "the cumulative review returned CHANGES REQUIRED; fix its findings" };
}

function cumulativeReviewStep(snap: WorkSnapshot, detail: string): NextStep {
  return { action: "review_cumulative", actor: "reviewer", phase: snap.phases.length, detail };
}

function isAfter(later: { ts: string }, earlier: { ts: string }): boolean {
  return Date.parse(later.ts) > Date.parse(earlier.ts);
}

type GatedReview = VerdictRow & { amend: string };

function gateFinding(review: GatedReview): string {
  return review.plan_only === true ? "the cumulative review found only plan wording" : "the cumulative review found plan wording and code findings";
}

function amendmentGate(snap: WorkSnapshot, review: GatedReview): NextStep {
  const { id, lane } = snap.state;
  const detail = `${gateFinding(review)}: ${review.amend}; review: ${reviewRel(id, "cumulative", null)}`;
  return { action: "approve_amendment", actor: "user", detail, options: [`[a] amend ${ARTIFACT_BY_LANE[lane]}, approved phases included`, "[f] fix the code instead"] };
}

function cumulativeFixStep(snap: WorkSnapshot, detail: string): NextStep {
  return { action: "fix_findings", actor: "developer", phase: snap.phases.length, review: "cumulative", detail };
}

function hasPhaseDone(rows: readonly VerdictRow[]): boolean {
  return rows.some((v) => v.verdict === "PHASE DONE");
}

function amendedStep(snap: WorkSnapshot, review: GatedReview, afterAmended: readonly VerdictRow[]): NextStep {
  if (review.plan_only === true) return cumulativeReviewStep(snap, "the plan wording was amended; the cumulative review runs again");
  if (hasPhaseDone(afterAmended)) return cumulativeReviewStep(snap, "the plan wording was amended and the code findings fixed; the cumulative review runs again");
  return cumulativeFixStep(snap, "the plan wording was amended; fix the cumulative review's code findings");
}

function answeredAmendment(snap: WorkSnapshot, choice: AmendmentChoice, review: GatedReview, after: readonly VerdictRow[]): NextStep {
  if (choice === "amend") {
    const amendedAt = after.findIndex((v) => v.verdict === "AMENDED");
    if (amendedAt >= 0) return amendedStep(snap, review, after.slice(amendedAt + 1));
    return { action: "amend", actor: "architect", detail: review.amend, reword: true };
  }
  if (hasPhaseDone(after)) return cumulativeReviewStep(snap, "the code was fixed instead of the plan; the cumulative review runs again");
  return cumulativeFixStep(snap, "the user chose to fix the code instead of the plan wording; fix the cumulative review's findings");
}

function isGatedReview(row: VerdictRow | undefined): row is GatedReview {
  return Boolean(row?.amend);
}

function planAmendStep(snap: WorkSnapshot): NextStep | null {
  const at = lastIndexWhere(snap.verdicts, (v) => v.agent === "reviewer" && v.scope === "cumulative");
  const review = snap.verdicts[at];
  if (!isGatedReview(review)) return null;
  const answer = snap.replies.filter((r) => r.action === "approve_amendment" && r.choice !== undefined && isAfter(r, review)).at(-1);
  if (!answer?.choice) return amendmentGate(snap, review);
  const after = snap.verdicts.slice(at + 1).filter((v) => isAfter(v, answer));
  return answeredAmendment(snap, answer.choice, review, after);
}

function allApprovedStep(snap: WorkSnapshot): NextStep {
  if (isCumulativelyReviewed(snap)) return { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };
  return rejectionsStep(snap) ?? planAmendStep(snap) ?? amendStep(snap) ?? findingsStep(snap) ?? cumulativeReviewStep(snap, "all phases approved; one cumulative review remains");
}

function isRepeatStall(verdicts: readonly VerdictRow[]): boolean {
  const drifts = verdicts.filter((v) => v.verdict === "DRIFT DETECTED").length;
  return drifts >= STALL_REPEATS || amendmentsAnsweringBlocks(verdicts).length >= STALL_REPEATS;
}

function isStalled({ verdicts }: WorkSnapshot): boolean {
  return newestBlockRow(verdicts)?.verdict === "PHASE STALLED" || isRepeatStall(verdicts);
}

function resolveBlockStep(snap: WorkSnapshot, phased: boolean): NextStep {
  const options = phased && isStalled(snap) ? STALL_OPTIONS : BLOCK_OPTIONS;
  return { action: "resolve_block", actor: "user", detail: snap.state.blocked_reason ?? "", options };
}

function blockStep(snap: WorkSnapshot): NextStep {
  const phased = PHASED.includes(snap.state.lane);
  const answer = phased && !isRepeatStall(snap.verdicts) ? (amendStep(snap) ?? recheckStep(snap)) : null;
  return answer ?? resolveBlockStep(snap, phased);
}

function isMidpoint(snap: WorkSnapshot, current: PhaseStatus): boolean {
  const count = snap.phases.length;
  return HEAVY.includes(snap.state.lane) && count >= MIDPOINT_MIN_PHASES && current.n === Math.ceil(count / 2) + 1;
}

function checkpointStep(snap: WorkSnapshot, prev: PhaseStatus, current: PhaseStatus): NextStep {
  if (findingsOpen(snap, "checkpoint")) return { action: "fix_findings", actor: "developer", phase: prev.n, review: "checkpoint", detail: "the checkpoint review returned CHANGES REQUIRED; fix its findings" };
  return { action: "review_checkpoint", actor: "reviewer", phase: prev.n, detail: `mid-plan checkpoint before phase ${current.n}` };
}

function startStep(snap: WorkSnapshot, current: PhaseStatus): NextStep {
  const prev = phaseOf(snap, current.n - 1);
  if (prev && isMidpoint(snap, current) && !prev.reviewed) return checkpointStep(snap, prev, current);
  return { action: "implement_phase", actor: "developer", phase: current.n, detail: `phase ${current.n} of ${snap.phases.length}: ${current.title}` };
}

function worktreeOptions(source: string | undefined): string[] {
  const key = ticketKey(source);
  return [...(key ? [`[y] create ${key}`] : []), "reply: <name> [from <ref>]", "[n] use the main checkouts"];
}

function worktreesStep({ state, layout, phases }: WorkSnapshot, current: PhaseStatus): NextStep | null {
  if (!layout.nested.length || state.branch || layout.worktrees === "none") return null;
  const repos = touchedRepos(layout, phases.flatMap(phasePaths));
  if (!repos.length) return null;
  const detail = `the plan touches ${repos.join(", ")}; name the branch for their worktrees before phase ${current.n}`;
  return { action: "create_worktrees", actor: "user", phase: current.n, detail, options: worktreeOptions(state.source) };
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
  const amendOrRecheck = amendStep(snap) ?? recheckStep(snap);
  if (amendOrRecheck) return amendOrRecheck;
  if (!current.done) return worktreesStep(snap, current) ?? startStep(snap, current);
  return approvalStep(snap, current, securityPaths);
}

function researchOptions(title: string): string[] {
  const publish = documentSlug("report", title) === null ? [] : [`[p] accept and publish to ${documentRel("report", { subject: title })}`];
  return ["[a] accept", ...publish, "[d] deeper pass", "[x] reject: <why>"];
}

export function nextStep(snap: WorkSnapshot, securityPaths: readonly string[]): NextStep {
  const { id, lane, status } = snap.state;
  if (status === "done" || status === "abandoned") return { action: "none", actor: null, detail: `work item is ${status}` };
  if (status === "blocked") return blockStep(snap);
  const ambiguous = snap.ambiguousRefs.length;
  if (ambiguous) return { action: "resolve_sources", actor: "user", detail: `${ambiguous} reference(s) differ across worktrees`, options: [`[p] pick: picket source pick ${id} <ref> <label>`] };
  if (lane === "fast") return { action: "close", actor: "lead", detail: "fast lane: finish the change, run the checks, then close" };
  if (!snap.artifact) return { action: "write_artifact", actor: lane === "research" ? "analyst" : "architect", detail: `${ARTIFACT_BY_LANE[lane]} does not exist yet` };
  if (lane === "research") return { action: "approve_phase", actor: "user", phase: 1, detail: "report written; accept or ask for a deeper pass", options: researchOptions(snap.state.title) };
  return phasedStep(snap, securityPaths);
}
