import type { ArtifactPhase } from "../work/artifact.mts";
import { readChecks } from "../work/declared-checks.mts";
import type { ReplyRow } from "../work/replies.mts";
import { CASE_KINDS, latestCases, latestClass, roundRows, type CaseRow, type TestRow } from "./results.mts";

export const MAX_QUESTIONS = 3;
export const MAX_DEFECTS = 3;
export const CASE_CAP_ASK_ABOVE = 20;

export type TestVerdict = "APPROVED" | "CHANGES REQUIRED" | "DRIFT DETECTED";
export type TestRoute = "fix" | "breaker" | "user";
export type Derived = { verdict: TestVerdict; route: TestRoute | null; reasons: string[]; unclassified: string[] };
export type CaseCap = { cases: number; byDefault: number; source: "default" | "user" | "held" };
export type CapReply = Pick<ReplyRow, "action" | "cases" | "default_cases">;
export type DeriveInput = {
  criteria: string[];
  rows: TestRow[];
  round: number;
  replay: { run: string | null; passed: string[]; blamed: string[]; unexplained: string[] };
  previousReplay: { run: string | null; passed: string[] };
};

type Outcome = Pick<Derived, "verdict" | "route">;
type Rule = { outcome: Outcome; reasons: string[] };

const APPROVED: Outcome = { verdict: "APPROVED", route: null };
const NOT_REPLAYED = "saved scenarios not replayed this round";

export function testedCriteria(phases: readonly Pick<ArtifactPhase, "n" | "entry">[]): string[] {
  const covers = phases.flatMap((phase) => (readChecks(phase.entry?.drive, phase.n)?.checks ?? []).filter((check) => "path" in check).map((check) => check.covers));
  return [...new Set(covers)];
}

export function caseCap(criteria: readonly string[]): number {
  return CASE_KINDS.length * criteria.length;
}

function userTotal(replies: readonly CapReply[], byDefault: number): number | null {
  const answers = replies.filter((reply) => reply.action === "set_case_cap" && reply.default_cases === byDefault && reply.cases !== undefined);
  return answers.length ? (answers[answers.length - 1].cases ?? null) : null;
}

export function roundCap(criteria: readonly string[], replies: readonly CapReply[]): CaseCap {
  const byDefault = caseCap(criteria);
  if (byDefault <= CASE_CAP_ASK_ABOVE) return { cases: byDefault, byDefault, source: "default" };
  const total = userTotal(replies, byDefault);
  return total === null ? { cases: CASE_CAP_ASK_ABOVE, byDefault, source: "held" } : { cases: total, byDefault, source: "user" };
}

function confirmedFailure(row: CaseRow): boolean {
  return row.outcome === "failed" && !row.unstable;
}

function caseLabel(row: CaseRow): string {
  return `${row.case} ${row.criterion} ${row.kind}`;
}

function breakerReasons(input: DeriveInput, current: CaseRow[], previous: CaseRow[]): string[] {
  const earlier = input.round - 1;
  const passedBefore = new Set(previous.filter((row) => row.outcome === "passed").map((row) => row.case));
  const cases = current.filter((row) => passedBefore.has(row.case) && confirmedFailure(row)).map((row) => `${caseLabel(row)} passed in round ${earlier} and fails now`);
  const scenarios = input.replay.blamed.filter((scenario) => input.previousReplay.passed.includes(scenario)).map((scenario) => `${scenario} passed in round ${earlier} and fails now`);
  return [...cases, ...scenarios];
}

function fixReasons(input: DeriveInput, current: CaseRow[], rows: TestRow[]): string[] {
  const products = current.filter((row) => row.outcome === "failed" && latestClass(rows, row.case)?.class === "product").map((row) => `${caseLabel(row)} failed: product`);
  const blamed = input.replay.blamed.map((scenario) => `${scenario} fails in the latest replay`);
  return [...products, ...blamed];
}

function driftReasons(rows: TestRow[]): string[] {
  return rows.flatMap((row) => (row.type === "untestable" ? [`${row.criterion} cannot be tested as written: ${row.why}`] : []));
}

function userReasons(input: DeriveInput, current: CaseRow[], rows: TestRow[]): string[] {
  const questions = rows.flatMap((row) => (row.type === "question" ? [`${row.criterion} has an open question: ${row.question}`] : []));
  const passed = new Set(current.filter((row) => row.outcome === "passed").map((row) => row.criterion));
  const unproved = input.criteria.filter((criterion) => !passed.has(criterion)).map((criterion) => `${criterion} has no passed case`);
  const replayed = input.replay.run !== null && input.replay.run !== input.previousReplay.run;
  return [...questions, ...unproved, ...(replayed ? [] : [NOT_REPLAYED]), ...input.replay.unexplained];
}

function rules(input: DeriveInput, rows: TestRow[], current: CaseRow[], previous: CaseRow[]): Rule[] {
  return [
    { outcome: { verdict: "CHANGES REQUIRED", route: "breaker" }, reasons: breakerReasons(input, current, previous) },
    { outcome: { verdict: "CHANGES REQUIRED", route: "fix" }, reasons: fixReasons(input, current, rows) },
    { outcome: { verdict: "DRIFT DETECTED", route: null }, reasons: driftReasons(rows) },
    { outcome: { verdict: "CHANGES REQUIRED", route: "user" }, reasons: userReasons(input, current, rows) },
  ];
}

export function deriveVerdict(input: DeriveInput): Derived {
  const rows = roundRows(input.rows, input.round);
  const current = latestCases(rows);
  const previous = latestCases(roundRows(input.rows, input.round - 1));
  const unclassified = current.filter((row) => row.outcome === "failed" && latestClass(rows, row.case) === null).map((row) => row.case);
  const applied = rules(input, rows, current, previous);
  const first = applied.find((rule) => rule.reasons.length > 0);
  return { ...(first?.outcome ?? APPROVED), reasons: applied.flatMap((rule) => rule.reasons), unclassified };
}
