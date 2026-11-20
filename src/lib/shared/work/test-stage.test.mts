import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../testing/report.mts";
import { STALL_OPTIONS } from "./action-text.mts";
import { nextStep, type NextStep } from "./next-step.mts";
import type { ReplyRow } from "./replies.mts";
import { instanceTag, sendsFor } from "./send.mts";
import { reportReasons, type TestingFacts, type WorkSnapshot } from "./snapshot.mts";
import { testApplies, testStageStep } from "./test-stage.mts";
import type { VerdictRow } from "./verdict-log.mts";
import { snapshotOf, type PhaseInput, type SnapshotInput } from "#test/snapshot.mts";

const ID = "20261023-probe";
const S = "session-s";
const TAG = instanceTag(ID);
const HTTP_CHECK = { covers: "T-1.1", method: "POST", path: "/orders", status: 201 };
const CHECKED: PhaseInput = { n: 1, done: true, approved: true, reviewed: true, entry: { n: 1, files: ["src/a.mjs"], drive: [HTTP_CHECK] } };
const RUN_ONLY: PhaseInput = { ...CHECKED, entry: { n: 1, files: ["src/a.mjs"], drive: [{ covers: "T-1.1", command: "node a.mjs", exit_code: 0 }] } };
const ON: TestingFacts = { setting: "design", environment: true, reasons: [] };
const BREAKER_REASON = "C-02 T-1.1 normal passed in round 1 and fails now";

let minute = 0;

function at(): string {
  minute += 1;
  const hour = 10 + Math.floor(minute / 60);
  return `2026-10-23T${String(hour).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00.000Z`;
}

function row(agent: string, verdict: string, fields: Partial<VerdictRow> = {}): VerdictRow {
  return { ts: at(), agent, verdict, phase: agent === "tester" ? null : 1, scope: null, through: null, session: S, ...fields };
}

const cumulative = (verdict: string) => row("reviewer", verdict, { scope: "cumulative" });
const tester = (verdict: string, round: number, route?: "fix" | "breaker" | "user") => row("tester", verdict, { scope: "test", round, ...(route ? { test_route: route } : {}) });
const developer = (verdict = "PHASE DONE") => row("developer", verdict);
const fresh = (): ReplyRow => ({ ts: at(), session: S, action: "resolve_rejections", phase: null, reply: "c", fresh: true });

function snap(input: SnapshotInput = {}, testing: TestingFacts = ON): WorkSnapshot {
  return { ...snapshotOf({ lane: "design", phases: [CHECKED], ...input }), testing };
}

function stepOf(verdicts: VerdictRow[], input: SnapshotInput = {}, testing: TestingFacts = ON): NextStep {
  return nextStep(snap({ verdicts, ...input }, testing), []);
}

function sendOf(verdicts: VerdictRow[], step: NextStep, testing: TestingFacts = ON) {
  return sendsFor(snap({ verdicts }, testing), step, S)[0];
}

test("a design item with an HTTP check, an environment and testing design is tested (T-7.1)", () => {
  assert.deepEqual(testApplies(snap()), { applies: true });
});

test("each reason the stage does not apply has its own why (T-7.1)", () => {
  assert.deepEqual(testApplies(snap({ lane: "order" })), { applies: false, why: "off for the order lane (testing: design)" });
  assert.deepEqual(testApplies(snap({ lane: "order" }, { ...ON, setting: "all" })), { applies: true });
  assert.deepEqual(testApplies(snap({}, { ...ON, setting: "off" })), { applies: false, why: "testing is off" });
  assert.deepEqual(testApplies(snapshotOf({ lane: "design", phases: [CHECKED] })), { applies: false, why: "testing is off" });
  assert.deepEqual(testApplies(snap({}, { ...ON, environment: false })), { applies: false, why: "no environment" });
  assert.deepEqual(testApplies(snap({ phases: [RUN_ONLY] })), { applies: false, why: "no declared HTTP check" });
});

test("after the cumulative APPROVED with no tester row the tester tests round 1; with the stage off the item closes (T-7.2)", () => {
  const approved = [cumulative("APPROVED")];
  assert.deepEqual(stepOf(approved), { action: "test_item", actor: "tester", round: 1, detail: "the cumulative review passed; the tester checks the finished item" });
  assert.deepEqual(stepOf(approved, {}, { ...ON, setting: "off" }), { action: "close", actor: "lead", detail: "cumulative review passed; close and print the closing block" });
});

test("route fix sends the developer to the report, then the same cumulative reviewer with the round, then the tester again (T-7.3)", () => {
  const rows = [cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "fix")];
  const fix = stepOf(rows);
  assert.deepEqual(fix, { action: "fix_findings", actor: "developer", phase: 1, review: "test", detail: "the tester found product failures; fix them" });
  assert.match(sendOf(rows, fix).message, new RegExp(`^review: work/${ID}/test\\.md$`, "m"));
  const done = [...rows, developer()];
  const review = stepOf(done);
  assert.equal(review.action, "review_cumulative");
  const send = sendOf(done, review);
  assert.equal(send.to, `${TAG}-cumulative-reviewer`);
  assert.match(send.message, /^fixes: test round 1$/m);
  assert.deepEqual(stepOf([...done, cumulative("APPROVED")]), { action: "test_item", actor: "tester", round: 2, detail: "the tester retests the finished item, round 2" });
  assert.equal(stepOf([...done, cumulative("CHANGES REQUIRED")]).action, "fix_findings");
});

test("a third route fix round stops with the stall options until a fresh reply (T-7.4)", () => {
  const round = (n: number) => [tester("CHANGES REQUIRED", n, "fix"), developer(), cumulative("APPROVED")];
  const rows = [cumulative("APPROVED"), ...round(1), ...round(2), tester("CHANGES REQUIRED", 3, "fix")];
  assert.deepEqual(stepOf(rows), { action: "resolve_rejections", actor: "user", detail: "3 test rounds returned CHANGES REQUIRED since the last approval", options: STALL_OPTIONS });
  const answered = stepOf(rows, { replies: [fresh()] });
  assert.equal(answered.action, "fix_findings");
});

test("route breaker asks for a diagnosis, the stall stops, and a fresh reply sends a plain fix (T-7.5)", () => {
  const rows = [cumulative("APPROVED"), tester("CHANGES REQUIRED", 2, "breaker")];
  const testing = { ...ON, reasons: [BREAKER_REASON] };
  const diagnose = stepOf(rows, {}, testing);
  assert.equal(diagnose.action === "fix_findings" && diagnose.diagnose, BREAKER_REASON);
  assert.match(sendOf(rows, diagnose, testing).message, new RegExp(`^diagnose: ${BREAKER_REASON}$`, "m"));
  const stalled = [...rows, developer("PHASE STALLED")];
  const blocked = stepOf(stalled, { status: "blocked", blocked_reason: "PHASE STALLED on phase 1" }, testing);
  assert.deepEqual([blocked.action, "options" in blocked && blocked.options], ["resolve_block", STALL_OPTIONS]);
  const continued = stepOf(stalled, { replies: [fresh()] }, testing);
  assert.equal(continued.action, "fix_findings");
  assert.doesNotMatch(sendOf(stalled, continued, testing).message, /diagnose:/);
});

test("route user stops for answers, and a drift asks for the amendment naming the report (T-7.6)", () => {
  const user = stepOf([cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "user")], {}, { ...ON, reasons: ["T-1.1 has no passed case"] });
  assert.deepEqual(user, {
    action: "resolve_tests",
    actor: "user",
    detail: `the tester needs your answers: T-1.1 has no passed case; report: work/${ID}/test.md`,
    options: ["[t] tell the tester: <answers>", "[n] accept the unproved criteria as not verified", "[x] abandon"],
  });
  const drift = stepOf([cumulative("APPROVED"), tester("DRIFT DETECTED", 1)], {}, { ...ON, reasons: ["T-1.1 cannot be tested as written: fast is not a number"] });
  assert.equal(drift.action, "approve_amendment");
  assert.equal(drift.detail, `the tester found a criterion it cannot test as written: T-1.1 cannot be tested as written: fast is not a number; report: work/${ID}/test.md`);
});

test("an amend answer to a tester drift sends the architect to reword, then the tester retests", () => {
  const rows = [cumulative("APPROVED"), tester("DRIFT DETECTED", 1)];
  const answer: ReplyRow = { ts: at(), session: S, action: "approve_amendment", phase: null, reply: "a", choice: "amend" };
  const amend = stepOf(rows, { replies: [answer] });
  assert.deepEqual([amend.action, "reword" in amend && amend.reword], ["amend", true]);
  assert.equal(stepOf([...rows, row("architect", "AMENDED", { record: "a".repeat(64) })], { replies: [answer] }).action, "test_item");
});

test("a tester APPROVED after fixes asks to approve them; with no fix the item closes (T-7.7)", () => {
  const fixed = [cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "fix"), developer(), cumulative("APPROVED"), tester("APPROVED", 2)];
  assert.deepEqual(stepOf(fixed), { action: "approve_fixes", actor: "user", detail: "the tester approved round 2; the fixes of the test stage await your approval", options: ["[a] approve and commit the fixes", "[x] reject: <why>"] });
  assert.equal(testStageStep(snap({ verdicts: [cumulative("APPROVED"), tester("APPROVED", 1)] })), null);
  assert.equal(stepOf([cumulative("APPROVED"), tester("APPROVED", 1)]).action, "close");
});

const answered = (choice: "answers" | "accept", answers?: string): ReplyRow => ({ ts: at(), session: S, action: "resolve_tests", phase: null, reply: choice === "answers" ? `t: ${answers}` : "n", choice, ...(answers ? { answers } : {}) });

test("answers to the tester send it the next round with the answers (T-8.1)", () => {
  const rows = [cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "user")];
  const step = stepOf(rows, { replies: [answered("answers", "keep the old rounding")] });
  assert.deepEqual(step, { action: "test_item", actor: "tester", round: 2, detail: "the tester retests the finished item, round 2", answers: "keep the old rounding" });
  assert.match(sendOf(rows, step).message, /^answers: keep the old rounding$/m);
});

test("accepting the unproved criteria passes the stage: fixes await approval, no fixes close (T-8.2)", () => {
  const fixed = [cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "fix"), developer(), cumulative("APPROVED"), tester("CHANGES REQUIRED", 2, "user")];
  assert.equal(stepOf(fixed, { replies: [answered("accept")] }).action, "approve_fixes");
  assert.equal(stepOf([cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "user")], { replies: [answered("accept")] }).action, "close");
});

test("the user's answer at the fix approval closes or sends the developer back (T-8.3, T-8.4)", () => {
  const fixed = [cumulative("APPROVED"), tester("CHANGES REQUIRED", 1, "fix"), developer(), cumulative("APPROVED"), tester("APPROVED", 2)];
  assert.equal(stepOf([...fixed, row("user", "approved", { scope: "test", phase: null })]).action, "close");
  const rejected = [...fixed, row("user", "rejected", { scope: "test", phase: null })];
  assert.deepEqual(stepOf(rejected), { action: "fix_findings", actor: "developer", phase: 1, review: "test", detail: "the user rejected the test fixes; fix what the reason names" });
  assert.equal(stepOf([...rejected, developer()]).action, "review_cumulative");
});

const stalledAtRound3 = () => {
  const round = (n: number) => [tester("CHANGES REQUIRED", n, "fix"), developer(), cumulative("APPROVED")];
  return [cumulative("APPROVED"), ...round(1), ...round(2), tester("CHANGES REQUIRED", 3, "fix")];
};
const redesignReply = (): ReplyRow => ({ ts: at(), session: S, action: "resolve_rejections", phase: null, reply: "d" });
const amended = () => row("architect", "AMENDED", { record: "b".repeat(64) });

test("a redesign reply at the third fix round holds the stop until the architect amends, then the developer fixes (T-1.1)", () => {
  const rows = stalledAtRound3();
  const replies = [redesignReply()];
  assert.deepEqual(stepOf(rows, { replies }), { action: "resolve_rejections", actor: "user", detail: "3 test rounds returned CHANGES REQUIRED since the last approval", options: STALL_OPTIONS });
  assert.deepEqual(stepOf([...rows, amended()], { replies }), { action: "fix_findings", actor: "developer", phase: 1, review: "test", detail: "the tester found product failures; fix them" });
});

test("after the amendment the fix runs the cumulative review, then the tester's round 4 (T-1.2)", () => {
  const replies = [redesignReply()];
  const done = [...stalledAtRound3(), amended(), developer()];
  assert.deepEqual(stepOf(done, { replies }), { action: "review_cumulative", actor: "reviewer", phase: 1, detail: "the fixes of test round 3 are done; the cumulative review runs again", fixes: 3 });
  assert.deepEqual(stepOf([...done, cumulative("APPROVED")], { replies }), { action: "test_item", actor: "tester", round: 4, detail: "the tester retests the finished item, round 4" });
});

const rejectedAtRound2 = () => [
  cumulative("APPROVED"),
  tester("CHANGES REQUIRED", 1, "fix"),
  developer(),
  cumulative("APPROVED"),
  tester("APPROVED", 2),
  row("user", "rejected", { scope: "test", phase: null }),
];

test("a rejected fix runs the developer, the cumulative review and the tester's next round (T-1.4)", () => {
  const rejected = rejectedAtRound2();
  assert.deepEqual(stepOf(rejected), { action: "fix_findings", actor: "developer", phase: 1, review: "test", detail: "the user rejected the test fixes; fix what the reason names" });
  const reworked = [...rejected, developer()];
  assert.deepEqual(stepOf(reworked), { action: "review_cumulative", actor: "reviewer", phase: 1, detail: "the fixes of test round 2 are done; the cumulative review runs again", fixes: 2 });
  assert.deepEqual(stepOf([...reworked, cumulative("APPROVED")]), { action: "test_item", actor: "tester", round: 3, detail: "the tester retests the finished item, round 3" });
});

test("the tester's approval after a rejected fix asks for approval again, and approving closes (T-1.5)", () => {
  const retested = [...rejectedAtRound2(), developer(), cumulative("APPROVED"), tester("APPROVED", 3)];
  assert.deepEqual(stepOf(retested), { action: "approve_fixes", actor: "user", detail: "the tester approved round 3; the fixes of the test stage await your approval", options: ["[a] approve and commit the fixes", "[x] reject: <why>"] });
  assert.equal(stepOf([...retested, row("user", "approved", { scope: "test", phase: null })]).action, "close");
});

test("a cumulative rejection of a reworked fix sends the developer to the cumulative findings (T-1.6)", () => {
  const step = stepOf([...rejectedAtRound2(), developer(), cumulative("CHANGES REQUIRED")]);
  assert.deepEqual([step.action, "review" in step && step.review], ["fix_findings", "cumulative"]);
});

test("a tester drift does not count toward the reviewer's repeated drifts", () => {
  const drifts = [tester("DRIFT DETECTED", 1), tester("DRIFT DETECTED", 2), tester("DRIFT DETECTED", 3)];
  const blocked = stepOf(drifts, { status: "blocked", blocked_reason: "x" });
  assert.deepEqual("options" in blocked && blocked.options, ["[c] continue", "[x] abandon"]);
});

test("the reasons the snapshot reads from test.md are the report's reasons, in order", () => {
  const derived = { verdict: "CHANGES REQUIRED" as const, route: "breaker" as const, reasons: [BREAKER_REASON, "T-1.1 has no passed case"], unclassified: [] };
  const text = renderReport({ id: ID, round: 2, derived, rows: [], criteria: ["T-1.1"] });
  assert.deepEqual(reportReasons(text), derived.reasons);
  assert.deepEqual(reportReasons(null), []);
});

const capCriteria = (count: number) => Array.from({ length: count }, (_, at) => `T-1.${at + 1}`);
const checkedWith = (count: number): PhaseInput => ({ ...CHECKED, entry: { n: 1, files: ["src/a.mjs"], drive: capCriteria(count).map((covers, at) => ({ ...HTTP_CHECK, covers, path: `/orders/${at}` })) } });
const capSet = (cases: number, defaultCases: number): ReplyRow => ({ ts: at(), session: S, action: "set_case_cap", phase: null, reply: String(cases), cases, default_cases: defaultCases });

test("four tested criteria stop at the user for the cases per round before the tester's first round (T-2.1)", () => {
  assert.deepEqual(stepOf([cumulative("APPROVED")], { phases: [checkedWith(4)] }), {
    action: "set_case_cap",
    actor: "user",
    detail: "the round allows 24 cases, six for each of 4 tested criteria; reply with the total for each round, lower or higher",
    options: ["reply: <total>, 24 keeps six for each criterion"],
  });
});

test("three tested criteria, eighteen cases, go to the tester with nothing asked (T-2.2)", () => {
  assert.deepEqual(stepOf([cumulative("APPROVED")], { phases: [checkedWith(3)] }), { action: "test_item", actor: "tester", round: 1, detail: "the cumulative review passed; the tester checks the finished item" });
});

test("a set total sends the tester round 1 and round 2 with no second stop; a fifth criterion asks again (T-2.3)", () => {
  const replies = [capSet(12, 24)];
  const approved = [cumulative("APPROVED")];
  assert.deepEqual(stepOf(approved, { phases: [checkedWith(4)], replies }), { action: "test_item", actor: "tester", round: 1, detail: "the cumulative review passed; the tester checks the finished item" });
  const fixed = [...approved, tester("CHANGES REQUIRED", 1, "fix"), developer(), cumulative("APPROVED")];
  assert.deepEqual(stepOf(fixed, { phases: [checkedWith(4)], replies }), { action: "test_item", actor: "tester", round: 2, detail: "the tester retests the finished item, round 2" });
  const widened = stepOf(fixed, { phases: [checkedWith(5)], replies });
  assert.deepEqual(widened, {
    action: "set_case_cap",
    actor: "user",
    detail: "the round allows 30 cases, six for each of 5 tested criteria; reply with the total for each round, lower or higher",
    options: ["reply: <total>, 30 keeps six for each criterion"],
  });
});
