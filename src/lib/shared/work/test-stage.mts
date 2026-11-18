import { testedCriteria } from "../testing/derive.mts";
import { testRound } from "../testing/results.mts";
import { STALL_OPTIONS } from "./action-text.mts";
import { isOutOfFrameAmendment, isUnchangedAmendment } from "./amendment.mts";
import { workRel } from "./files.mts";
import type { NextStep } from "./next-step.mts";
import { amendmentChoice, freshReplies, type ReplyRow } from "./replies.mts";
import type { WorkSnapshot } from "./snapshot.mts";
import { ARTIFACT_BY_LANE } from "./state.mts";
import { STALL_REPEATS } from "./stall.mts";
import type { VerdictRow } from "./verdict-log.mts";

export type Applicability = { applies: true } | { applies: false; why: string };

type Stamped = { ts: string };
type FixCycle = { tester: VerdictRow; rows: VerdictRow[]; diagnose: string | null; why?: string };

const TESTER = "tester";
const TEST_SCOPE = "test";
const RESOLVE_TESTS_OPTIONS = ["[t] tell the tester: <answers>", "[n] accept the unproved criteria as not verified", "[x] abandon"];
const APPROVE_FIXES_OPTIONS = ["[a] approve and commit the fixes", "[x] reject: <why>"];
const SEE_REPORT = "see the test report";
const REJECTED_FIXES = "the user rejected the test fixes; fix what the reason names";

export function testApplies(snap: WorkSnapshot): Applicability {
  const setting = snap.testing?.setting ?? "off";
  if (setting === "off") return { applies: false, why: "testing is off" };
  if (snap.state.lane !== "design" && setting !== "all") return { applies: false, why: `off for the ${snap.state.lane} lane (testing: ${setting})` };
  if (!snap.testing?.environment) return { applies: false, why: "no environment" };
  if (testedCriteria(snap.phases).length === 0) return { applies: false, why: "no declared HTTP check" };
  return { applies: true };
}

function isAfter(later: Stamped, earlier: Stamped): boolean {
  return Date.parse(later.ts) > Date.parse(earlier.ts);
}

function stageRows(verdicts: readonly VerdictRow[]): VerdictRow[] {
  const start = verdicts.findIndex((row) => row.agent === "reviewer" && row.scope === "cumulative" && row.verdict === "APPROVED");
  return verdicts.slice(start + 1);
}

function reportRel(snap: WorkSnapshot): string {
  return `${workRel(snap.state.id)}test.md`;
}

function firstReason(snap: WorkSnapshot): string {
  return snap.testing?.reasons[0] ?? SEE_REPORT;
}

function testStep(snap: WorkSnapshot, answers?: string): NextStep {
  const round = testRound(snap.verdicts);
  const detail = round === 1 ? "the cumulative review passed; the tester checks the finished item" : `the tester retests the finished item, round ${round}`;
  return { action: "test_item", actor: TESTER, round, detail, ...(answers === undefined ? {} : { answers }) };
}

function fixStep(snap: WorkSnapshot, diagnose: string | null, why = "the tester found product failures; fix them"): NextStep {
  const detail = diagnose === null ? why : "a case that passed before fails now; find the root cause and write a red test, fix nothing";
  return { action: "fix_findings", actor: "developer", phase: snap.phases.length, review: "test", detail, ...(diagnose === null ? {} : { diagnose }) };
}

function lastIndexWhere(rows: readonly VerdictRow[], matches: (row: VerdictRow) => boolean): number {
  for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i])) return i;
  return -1;
}

const isDeveloper = (row: VerdictRow) => row.agent === "developer";
const isCumulativeReview = (row: VerdictRow) => row.agent === "reviewer" && row.scope === "cumulative";

function fixCycleStep(snap: WorkSnapshot, { tester, rows, diagnose, why }: FixCycle): NextStep {
  const developerAt = lastIndexWhere(rows, isDeveloper);
  const reviewAt = lastIndexWhere(rows, isCumulativeReview);
  if (developerAt < 0) return fixStep(snap, diagnose, why);
  if (reviewAt > developerAt) {
    if (rows[reviewAt].verdict === "APPROVED") return testStep(snap);
    return { action: "fix_findings", actor: "developer", phase: snap.phases.length, review: "cumulative", detail: "the cumulative review of the test fixes returned CHANGES REQUIRED; fix its findings" };
  }
  if (rows[developerAt].verdict !== "PHASE DONE") return fixStep(snap, null, why);
  const round = tester.round ?? testRound(snap.verdicts) - 1;
  return { action: "review_cumulative", actor: "reviewer", phase: snap.phases.length, detail: `the fixes of test round ${round} are done; the cumulative review runs again`, fixes: round };
}

function latestFresh(snap: WorkSnapshot, after: Stamped | null): Stamped | null {
  return freshReplies(snap.replies).filter((reply) => after === null || isAfter(reply, after)).at(-1) ?? null;
}

function fixRoundsSince(stage: readonly VerdictRow[], fresh: Stamped | null): number {
  return stage.filter((row) => row.agent === TESTER && row.test_route === "fix" && (fresh === null || isAfter(row, fresh))).length;
}

function rejectionsStep(snap: WorkSnapshot, stage: VerdictRow[], tester: VerdictRow): NextStep | null {
  if (tester.test_route !== "fix") return null;
  const rounds = fixRoundsSince(stage, latestFresh(snap, null));
  if (rounds < STALL_REPEATS || rounds % STALL_REPEATS !== 0) return null;
  if (rowsAfterTester(stage, tester).length > 0) return null;
  return { action: "resolve_rejections", actor: "user", detail: `${rounds} test rounds returned CHANGES REQUIRED since the last approval`, options: STALL_OPTIONS };
}

function rowsAfter(rows: readonly VerdictRow[], anchor: Stamped): VerdictRow[] {
  return rows.filter((row) => isAfter(row, anchor));
}

function rowsAfterTester(stage: readonly VerdictRow[], tester: VerdictRow): VerdictRow[] {
  return stage.slice(stage.indexOf(tester) + 1);
}

function changesStep(snap: WorkSnapshot, stage: VerdictRow[], tester: VerdictRow): NextStep {
  const repeated = rejectionsStep(snap, stage, tester);
  if (repeated) return repeated;
  const fresh = latestFresh(snap, tester);
  const afterTester = rowsAfterTester(stage, tester);
  const rows = fresh === null ? afterTester : rowsAfter(afterTester, fresh);
  const diagnose = tester.test_route === "breaker" && fresh === null ? firstReason(snap) : null;
  return fixCycleStep(snap, { tester, rows, diagnose });
}

function isCountedAmended(stage: readonly VerdictRow[], row: VerdictRow): boolean {
  const before = stage.slice(0, stage.indexOf(row));
  return row.verdict === "AMENDED" && !isUnchangedAmendment(before, row.record) && !isOutOfFrameAmendment(before, row.frame);
}

function amendmentGate(snap: WorkSnapshot): NextStep {
  const detail = `the tester found a criterion it cannot test as written: ${firstReason(snap)}; report: ${reportRel(snap)}`;
  return { action: "approve_amendment", actor: "user", detail, options: [`[a] amend ${ARTIFACT_BY_LANE[snap.state.lane]}, approved phases included`, "[f] fix the code instead"] };
}

function driftStep(snap: WorkSnapshot, stage: VerdictRow[], tester: VerdictRow): NextStep {
  const answer = snap.replies.filter((reply) => reply.action === "approve_amendment" && amendmentChoice(reply) !== null && isAfter(reply, tester)).at(-1);
  if (answer === undefined) return amendmentGate(snap);
  const rows = rowsAfter(rowsAfterTester(stage, tester), answer);
  if (amendmentChoice(answer) === "fix") return fixCycleStep(snap, { tester, rows, diagnose: null });
  if (rows.some((row) => isCountedAmended(stage, row))) return testStep(snap);
  return { action: "amend", actor: "architect", detail: `AMENDMENT NEEDED: ${firstReason(snap)}`, review: reportRel(snap), reword: true };
}

function userAnswerToFixes(stage: VerdictRow[], tester: VerdictRow): VerdictRow | null {
  return rowsAfterTester(stage, tester).filter((row) => row.agent === "user" && row.scope === TEST_SCOPE).at(-1) ?? null;
}

function approvedStep(snap: WorkSnapshot, stage: VerdictRow[], tester: VerdictRow): NextStep | null {
  if (!stage.some((row) => isDeveloper(row) && row.verdict === "PHASE DONE")) return null;
  const answer = userAnswerToFixes(stage, tester);
  if (answer?.verdict === "approved") return null;
  if (answer?.verdict === "rejected") return fixCycleStep(snap, { tester, rows: rowsAfter(stage, answer), diagnose: null, why: REJECTED_FIXES });
  return { action: "approve_fixes", actor: "user", detail: `the tester approved round ${tester.round ?? testRound(snap.verdicts) - 1}; the fixes of the test stage await your approval`, options: APPROVE_FIXES_OPTIONS };
}

function testAnswer(snap: WorkSnapshot, tester: VerdictRow): ReplyRow | null {
  return snap.replies.filter((reply) => reply.action === "resolve_tests" && (reply.choice === "answers" || reply.choice === "accept") && isAfter(reply, tester)).at(-1) ?? null;
}

function userStep(snap: WorkSnapshot, stage: VerdictRow[], tester: VerdictRow): NextStep | null {
  const answer = testAnswer(snap, tester);
  if (answer?.choice === "accept") return approvedStep(snap, stage, tester);
  if (answer?.choice === "answers") return testStep(snap, answer.answers ?? answer.reply);
  return { action: "resolve_tests", actor: "user", detail: `the tester needs your answers: ${firstReason(snap)}; report: ${reportRel(snap)}`, options: RESOLVE_TESTS_OPTIONS };
}

export function testStageStep(snap: WorkSnapshot): NextStep | null {
  const stage = stageRows(snap.verdicts);
  const tester = stage.filter((row) => row.agent === TESTER).at(-1);
  if (tester === undefined) return testStep(snap);
  if (tester.verdict === "APPROVED") return approvedStep(snap, stage, tester);
  if (tester.verdict === "DRIFT DETECTED") return driftStep(snap, stage, tester);
  if (tester.test_route === "fix" || tester.test_route === "breaker") return changesStep(snap, stage, tester);
  return userStep(snap, stage, tester);
}
