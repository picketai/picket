import { test } from "node:test";
import assert from "node:assert/strict";
import { caseCap, deriveVerdict, testedCriteria, type DeriveInput } from "./derive.mts";
import type { CaseRow, ClassRow, TestRow } from "./results.mts";

const TS = "2026-11-17T10:00:00.000Z";

function phase(n: number, drive: unknown[]): { n: number; entry: { n: number; drive: unknown[] } } {
  return { n, entry: { n, drive } };
}

function http(covers: string, path = "/orders"): Record<string, unknown> {
  return { covers, method: "POST", path, status: 201 };
}

function passedCase(id: string, criterion: string, round: number, overrides: Partial<CaseRow> = {}): CaseRow {
  return { ts: TS, round, type: "case", case: id, criterion, kind: "normal", intent: "an order is placed", steps: "request GET {orders}/orders", outcome: "passed", attempts: 1, unstable: false, detail: "", mocks: [], ...overrides };
}

function failedCase(id: string, criterion: string, round: number, overrides: Partial<CaseRow> = {}): CaseRow {
  return passedCase(id, criterion, round, { kind: "boundary", outcome: "failed", attempts: 2, detail: "expected 201, got 500", ...overrides });
}

function classed(id: string, round: number, cls: ClassRow["class"]): ClassRow {
  return { ts: TS, round, type: "class", case: id, class: cls, evidence: "the service answered 500" };
}

function input(rows: TestRow[], overrides: Partial<DeriveInput> = {}): DeriveInput {
  return {
    criteria: ["T-2.1", "T-2.3"],
    rows,
    round: 1,
    replay: { run: "r2", passed: [], blamed: [] },
    previousReplay: { run: "r1", passed: [] },
    ...overrides,
  };
}

const BOTH_PASSED = [passedCase("C-01", "T-2.1", 1), passedCase("C-02", "T-2.3", 1)];

test("the tested criteria are the covers of HTTP checks, in order and without repeats (T-1.1)", () => {
  const phases = [phase(1, [{ covers: "T-1.7", command: "npm test", exit_code: 0 }]), phase(2, [http("T-2.1"), http("T-2.1", "/orders/1")]), phase(3, [http("T-3.2")])];
  const criteria = testedCriteria(phases);
  assert.deepEqual(criteria, ["T-2.1", "T-3.2"]);
  assert.equal(caseCap(criteria), 12);
});

test("phases with no drive list give no tested criteria", () => {
  assert.deepEqual(testedCriteria([{ n: 1, entry: { n: 1, drive: true } }, { n: 2, entry: null }]), []);
});

test("every criterion passed and a fresh replay approves (T-1.2)", () => {
  assert.deepEqual(deriveVerdict(input(BOTH_PASSED)), { verdict: "APPROVED", route: null, reasons: [], unclassified: [] });
});

test("a replay run no newer than the previous round sends the round to the user (T-1.2)", () => {
  const derived = deriveVerdict(input(BOTH_PASSED, { replay: { run: "r1", passed: [], blamed: [] } }));
  assert.deepEqual(derived, { verdict: "CHANGES REQUIRED", route: "user", reasons: ["saved scenarios not replayed this round"], unclassified: [] });
});

test("no full replay at all is not replayed this round", () => {
  const derived = deriveVerdict(input(BOTH_PASSED, { replay: { run: null, passed: [], blamed: [] }, previousReplay: { run: null, passed: [] } }));
  assert.equal(derived.route, "user");
  assert.deepEqual(derived.reasons, ["saved scenarios not replayed this round"]);
});

test("a product failure routes to fix even beside an untestable row (T-1.3)", () => {
  const rows: TestRow[] = [...BOTH_PASSED, failedCase("C-03", "T-2.1", 1), classed("C-03", 1, "product"), { ts: TS, round: 1, type: "untestable", criterion: "T-2.3", why: "fast is not a number" }];
  const derived = deriveVerdict(input(rows));
  assert.equal(derived.verdict, "CHANGES REQUIRED");
  assert.equal(derived.route, "fix");
  assert.deepEqual(derived.reasons, ["C-03 T-2.1 boundary failed: product", "T-2.3 cannot be tested as written: fast is not a number"]);
  assert.deepEqual(derived.unclassified, []);
});

test("a failed case with no class row is unclassified (T-1.3)", () => {
  const derived = deriveVerdict(input([...BOTH_PASSED, failedCase("C-03", "T-2.1", 1)]));
  assert.deepEqual(derived.unclassified, ["C-03"]);
});

test("a class row from another round does not classify the case", () => {
  const derived = deriveVerdict(input([failedCase("C-03", "T-2.1", 2), classed("C-03", 1, "product")], { round: 2 }));
  assert.deepEqual(derived.unclassified, ["C-03"]);
  assert.notEqual(derived.route, "fix");
});

test("a case that passed last round and now fails confirmed trips the breaker (T-1.4)", () => {
  const rows: TestRow[] = [passedCase("C-02", "T-2.1", 1), failedCase("C-02", "T-2.1", 2, { kind: "normal" }), classed("C-02", 2, "product")];
  const derived = deriveVerdict(input(rows, { round: 2 }));
  assert.equal(derived.verdict, "CHANGES REQUIRED");
  assert.equal(derived.route, "breaker");
  assert.equal(derived.reasons[0], "C-02 T-2.1 normal passed in round 1 and fails now");
});

test("an unstable failure of a case that passed before does not trip the breaker (T-1.4)", () => {
  const rows: TestRow[] = [passedCase("C-02", "T-2.1", 1), failedCase("C-02", "T-2.1", 2, { unstable: true }), classed("C-02", 2, "product")];
  const derived = deriveVerdict(input(rows, { round: 2 }));
  assert.equal(derived.route, "fix");
});

test("a saved scenario that passed in the previous replay and is blamed now trips the breaker (T-1.4)", () => {
  const derived = deriveVerdict(input(BOTH_PASSED, { round: 2, replay: { run: "r2", passed: [], blamed: ["S-0004"] }, previousReplay: { run: "r1", passed: ["S-0004"] } }));
  assert.equal(derived.verdict, "CHANGES REQUIRED");
  assert.equal(derived.route, "breaker");
  assert.equal(derived.reasons[0], "S-0004 passed in round 1 and fails now");
});

test("a blamed scenario that did not pass before routes to fix", () => {
  const derived = deriveVerdict(input(BOTH_PASSED, { replay: { run: "r2", passed: [], blamed: ["S-0004"] } }));
  assert.equal(derived.route, "fix");
  assert.deepEqual(derived.reasons, ["S-0004 fails in the latest replay"]);
});

test("an untestable row alone gives drift (T-1.5)", () => {
  const derived = deriveVerdict(input([...BOTH_PASSED, { ts: TS, round: 1, type: "untestable", criterion: "T-2.3", why: "fast is not a number" }]));
  assert.deepEqual(derived, { verdict: "DRIFT DETECTED", route: null, reasons: ["T-2.3 cannot be tested as written: fast is not a number"], unclassified: [] });
});

test("a criterion whose only row is a blocked cell goes to the user (T-1.5)", () => {
  const rows: TestRow[] = [passedCase("C-01", "T-2.1", 1), { ts: TS, round: 1, type: "cell", criterion: "T-2.3", kind: "state", outcome: "blocked", why: "no stock fixture" }];
  const derived = deriveVerdict(input(rows));
  assert.deepEqual(derived, { verdict: "CHANGES REQUIRED", route: "user", reasons: ["T-2.3 has no passed case"], unclassified: [] });
});

test("a criterion whose only case failed for the environment goes to the user (T-1.5)", () => {
  const rows: TestRow[] = [passedCase("C-01", "T-2.1", 1), failedCase("C-02", "T-2.3", 1), classed("C-02", 1, "environment")];
  const derived = deriveVerdict(input(rows));
  assert.equal(derived.route, "user");
  assert.deepEqual(derived.reasons, ["T-2.3 has no passed case"]);
});

test("an open question goes to the user (T-1.5)", () => {
  const rows: TestRow[] = [...BOTH_PASSED, { ts: TS, round: 1, type: "question", criterion: "T-2.1", question: "Is an empty basket an error?", choices: ["yes", "no"], default: null, basis: null }];
  const derived = deriveVerdict(input(rows));
  assert.deepEqual(derived, { verdict: "CHANGES REQUIRED", route: "user", reasons: ["T-2.1 has an open question: Is an empty basket an error?"], unclassified: [] });
});

test("only the current round's rows count", () => {
  const derived = deriveVerdict(input(BOTH_PASSED, { round: 2 }));
  assert.deepEqual(derived.reasons, ["T-2.1 has no passed case", "T-2.3 has no passed case"]);
});
