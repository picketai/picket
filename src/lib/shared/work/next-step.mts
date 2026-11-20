import { ticketKey, touchedRepos } from "../checkouts.mts";
import { documentRel, documentSlug } from "../document-path.mts";
import { isOutOfFrameAmendment, isUnchangedAmendment } from "./amendment.mts";
import { decisionsRevisedSince, phasePaths } from "./artifact.mts";
import { ownGate, type Gate } from "./gate.mts";
import { amendmentChoice, freshReplies, type AmendmentChoice, type ReplyRow } from "./replies.mts";
import { reviewRel } from "./reviews.mts";
import { phaseOf, type PhaseStatus, type WorkSnapshot } from "./snapshot.mts";
import { amendmentsAnsweringBlocks, newestBlockRow, STALL_REPEATS } from "./stall.mts";
import { ARTIFACT_BY_LANE, type Lane } from "./state.mts";
import type { VerdictRow } from "./verdict-log.mts";
import type { WorkId } from "./files.mts";
import { STALL_OPTIONS } from "./action-text.mts";
import { testApplies, testStageStep } from "./test-stage.mts";

export { NEXT_ACTIONS, type NextAction } from "./action-text.mts";

export type FindingsReview = "checkpoint" | "cumulative" | "test";

export type NextStep =
  | { action: "none"; actor: null; detail: string }
  | { action: "resolve_block" | "resolve_rejections" | "approve_amendment" | "resolve_tests" | "approve_fixes" | "set_case_cap"; actor: "user"; detail: string; options: string[] }
  | { action: "resolve_sources"; actor: "user"; detail: string; options: string[] }
  | { action: "write_artifact"; actor: "architect" | "analyst"; detail: string }
  | { action: "implement_phase"; actor: "developer"; phase: number; detail: string }
  | { action: "approve_phase"; actor: "user"; phase: number; detail: string; options: string[]; own_gate?: Gate | null }
  | { action: "review_checkpoint"; actor: "reviewer"; phase: number; detail: string }
  | { action: "review_cumulative"; actor: "reviewer"; phase: number; detail: string; fixes?: number }
  | { action: "close"; actor: "lead"; detail: string }
  | { action: "fix_findings"; actor: "developer"; phase: number; review: FindingsReview; detail: string; diagnose?: string }
  | { action: "amend"; actor: "architect"; detail: string; review?: string; reword?: true }
  | { action: "review_crosscheck"; actor: "reviewer"; detail: string; delta: string[] }
  | { action: "create_worktrees"; actor: "user"; phase: number; detail: string; options: string[] }
  | { action: "test_item"; actor: "tester"; round: number; detail: string; answers?: string };

const HEAVY: readonly Lane[] = ["design"];
const PHASED: readonly Lane[] = ["order", "design"];
const MIDPOINT_MIN_PHASES = 6;
const ISO_DAY = "YYYY-MM-DD".length;
const DECISION_ANCHOR = /#(D-\d{3})$/;
const OUT_OF_FRAME_FINDING = "the architect's amendment changed the frontmatter beyond the declared checks it names";
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

type AmendRow = VerdictRow & { amend: string };

function isAmendRow(row: VerdictRow): row is AmendRow {
  return Boolean(row.amend);
}

function pendingAmend({ verdicts }: WorkSnapshot): AmendRow | null {
  const at = lastIndexWhere(verdicts, (v) => isAmendRow(v) && v.scope !== "cumulative");
  const row = verdicts[at];
  if (!row || !isAmendRow(row) || verdicts.slice(at + 1).some((v) => v.verdict === "AMENDED")) return null;
  return row;
}

function amendReview(id: WorkId, row: AmendRow): string | null {
  if (row.scope === "crosscheck" || row.scope === "checkpoint") return reviewRel(id, row.scope, null);
  if (row.agent === "reviewer" && row.scope === null && row.phase !== null) return reviewRel(id, "phase", row.phase);
  return null;
}

type RedesignReply = ReplyRow & { amend: string };

function pendingRedesign({ replies, verdicts }: WorkSnapshot): RedesignReply | null {
  const reply = replies.filter((r) => r.choice === "redesign").at(-1);
  if (!reply?.amend || verdicts.some((v) => v.verdict === "AMENDED" && isAfter(v, reply))) return null;
  return { ...reply, amend: reply.amend };
}

function redesignStep(snap: WorkSnapshot): NextStep | null {
  const reply = pendingRedesign(snap);
  return reply ? { action: "amend", actor: "architect", detail: reply.amend } : null;
}

function amendStep(snap: WorkSnapshot): NextStep | null {
  const row = pendingAmend(snap);
  if (!row) return redesignStep(snap);
  const review = amendReview(snap.state.id, row);
  return { action: "amend", actor: "architect", detail: row.amend, ...(review ? { review } : {}) };
}

function amendedDrift({ state, verdicts }: WorkSnapshot): VerdictRow | null {
  if (state.lane !== "design") return null;
  const at = lastIndexWhere(verdicts, (v) => v.agent === "reviewer" && v.scope === "crosscheck");
  if (verdicts[at]?.verdict !== "DRIFT DETECTED") return null;
  return verdicts.slice(at + 1).some((v) => v.verdict === "AMENDED") ? verdicts[at] : null;
}

function decisionAnchor(path: string): string | null {
  return path.match(DECISION_ANCHOR)?.[1] ?? null;
}

function recheckDelta(drift: VerdictRow, revised: string[]): string[] {
  if (drift.blocking === undefined) return revised;
  const covered = drift.blocking.length > 0 && drift.blocking.every((path) => revised.includes(decisionAnchor(path) ?? ""));
  return covered ? revised : [];
}

function recheckStep(snap: WorkSnapshot): NextStep | null {
  const drift = amendedDrift(snap);
  if (!drift) return null;
  const delta = recheckDelta(drift, decisionsRevisedSince(snap.artifact?.body ?? "", drift.ts.slice(0, ISO_DAY)));
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

function amendmentGate(snap: WorkSnapshot, review: GatedReview, finding: string): NextStep {
  const { id, lane } = snap.state;
  const detail = `${finding}: ${review.amend}; review: ${reviewRel(id, "cumulative", null)}`;
  return { action: "approve_amendment", actor: "user", detail, options: [`[a] amend ${ARTIFACT_BY_LANE[lane]}, approved phases included`, "[f] fix the code instead"] };
}

function rowsBefore(snap: WorkSnapshot, row: VerdictRow): VerdictRow[] {
  return snap.verdicts.slice(0, snap.verdicts.indexOf(row));
}

function isOutOfFrame(snap: WorkSnapshot, row: VerdictRow): boolean {
  return isOutOfFrameAmendment(rowsBefore(snap, row), row.frame);
}

function isCountedAmended(snap: WorkSnapshot, row: VerdictRow): boolean {
  return row.verdict === "AMENDED" && !isUnchangedAmendment(rowsBefore(snap, row), row.record) && !isOutOfFrame(snap, row);
}

function uncountedFinding(snap: WorkSnapshot, amended: VerdictRow): string {
  if (isOutOfFrame(snap, amended)) return OUT_OF_FRAME_FINDING;
  return `the architect returned AMENDED but ${ARTIFACT_BY_LANE[snap.state.lane]} is unchanged`;
}

function amendAnswerStep(snap: WorkSnapshot, review: GatedReview, after: readonly VerdictRow[]): NextStep {
  const amendedAt = after.findIndex((v) => isCountedAmended(snap, v));
  if (amendedAt >= 0) return amendedStep(snap, review, after.slice(amendedAt + 1));
  const uncounted = after.filter((v) => v.verdict === "AMENDED").at(-1);
  if (uncounted) return amendmentGate(snap, review, uncountedFinding(snap, uncounted));
  return { action: "amend", actor: "architect", detail: review.amend, review: reviewRel(snap.state.id, "cumulative", null), reword: true };
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
  if (choice === "amend") return amendAnswerStep(snap, review, after);
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
  const answer = snap.replies.filter((r) => r.action === "approve_amendment" && amendmentChoice(r) !== null && isAfter(r, review)).at(-1);
  const choice = answer ? amendmentChoice(answer) : null;
  if (!answer || !choice) return amendmentGate(snap, review, gateFinding(review));
  const after = snap.verdicts.slice(at + 1).filter((v) => isAfter(v, answer));
  return answeredAmendment(snap, choice, review, after);
}

const CLOSE_STEP: NextStep = { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" };

function allApprovedStep(snap: WorkSnapshot): NextStep {
  if (isCumulativelyReviewed(snap)) return testApplies(snap).applies ? (testStageStep(snap) ?? CLOSE_STEP) : CLOSE_STEP;
  return rejectionsStep(snap) ?? planAmendStep(snap) ?? amendStep(snap) ?? findingsStep(snap) ?? cumulativeReviewStep(snap, "all phases approved; one cumulative review remains");
}

function isRepeatStall(verdicts: readonly VerdictRow[]): boolean {
  const drifts = verdicts.filter((v) => v.verdict === "DRIFT DETECTED" && v.agent === "reviewer").length;
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
