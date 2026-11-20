import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { workId } from "../work/files.mts";
import { appendTestRow, nextCaseId, readTestRows, roundRows, testFolderRel, testRound, type TestEntry, type TestRow } from "./results.mts";
import { roundCounts } from "./report.mts";
import { COUNTED_OUTCOMES } from "./results.mts";
import { nextFoundId } from "./results.mts";
import { latestDefects } from "./results.mts";

const ID = workId("20261117-orders");
const TS = "2026-11-17T10:00:00.000Z";
const NOW = new Date(TS);

function scratch(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-testing-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function caseEntry(id: string, round = 1): TestEntry {
  return { round, type: "case", case: id, criterion: "T-2.1", kind: "boundary", intent: "an empty basket", steps: "request GET {orders}/orders\nexpect status 200", outcome: "failed", attempts: 2, unstable: false, detail: "expected 200, got 500", mocks: ["payments-mock"] };
}

function defectEntry(found: string, round = 1): TestEntry {
  return { round, type: "defect", found, kind: "negative", intent: "a negative quantity is refused", steps: "request GET {orders}/orders\nexpect status 400", evidence: "POST /orders answered 201", outcome: "failed", detail: "step 2: expected status 400, got 201", attempts: 2, mocks: [] };
}

const ENTRIES: TestEntry[] = [
  caseEntry("C-01"),
  { round: 1, type: "class", case: "C-01", class: "product", evidence: "the service answered 500" },
  { round: 1, type: "cell", criterion: "T-2.1", kind: "state", outcome: "not covered", why: "the cap is reached" },
  { round: 1, type: "question", criterion: "T-2.1", question: "Is an empty basket an error?", choices: ["yes", "no"], default: "no", basis: "the request says nothing" },
  { round: 1, type: "untestable", criterion: "T-2.1", why: "fast is not a number" },
  defectEntry("K-01"),
];

test("a row of each type reads back equal, stamped with the time (T-1.6)", (t) => {
  const root = scratch(t);
  for (const entry of ENTRIES) appendTestRow(root, ID, entry, NOW);
  assert.deepEqual(readTestRows(root, ID), ENTRIES.map((entry) => ({ ts: TS, ...entry })));
});

test("an item with no results file has no rows", (t) => {
  assert.deepEqual(readTestRows(scratch(t), ID), []);
});

test("the next case id is one above the highest, from C-01 (T-1.6)", (t) => {
  const root = scratch(t);
  assert.equal(nextCaseId(readTestRows(root, ID)), "C-01");
  for (const id of ["C-01", "C-03", "C-02"]) appendTestRow(root, ID, caseEntry(id), NOW);
  assert.equal(nextCaseId(readTestRows(root, ID)), "C-04");
});

test("the next found id is one above the highest defect row, from K-01, and case ids ignore it (T-1.4)", (t) => {
  const root = scratch(t);
  assert.equal(nextFoundId(readTestRows(root, ID)), "K-01");
  appendTestRow(root, ID, caseEntry("C-01"), NOW);
  appendTestRow(root, ID, defectEntry("K-01"), NOW);
  const rows = readTestRows(root, ID);
  assert.equal(nextFoundId(rows), "K-02");
  assert.equal(nextCaseId(rows), "C-02");
});

test("the latest defects are the newest row of each found id, in first-seen order (T-1.3)", () => {
  const rows = [defectEntry("K-01", 1), defectEntry("K-02", 1), defectEntry("K-01", 2), caseEntry("C-01", 2)].map((entry) => ({ ts: TS, ...entry }) as TestRow);
  assert.deepEqual(latestDefects(rows).map((row) => [row.found, row.round]), [["K-01", 2], ["K-02", 1]]);
});

test("the round is one above the tester's verdict rows (T-1.6)", () => {
  assert.equal(testRound([{ agent: "tester" }, { agent: "reviewer" }, { agent: "tester" }]), 3);
  assert.equal(testRound([]), 1);
});

test("round rows keep only the named round", () => {
  const rows: TestRow[] = [caseEntry("C-01", 1), caseEntry("C-01", 2)].map((entry) => ({ ts: TS, ...entry }) as TestRow);
  assert.deepEqual(roundRows(rows, 2).map((row) => row.round), [2]);
});

test("the test folder sits in the work item", () => {
  assert.equal(testFolderRel(ID), "work/20261117-orders/test/");
});

test("the counted outcomes are the case outcomes then the cell outcomes, each once", () => {
  assert.deepEqual(COUNTED_OUTCOMES, ["passed", "failed", "blocked", "not run", "not covered"]);
});

test("the counts line names each outcome once, passed first and not covered last", () => {
  const cells: TestEntry[] = (["not covered", "not run", "blocked"] as const).map((outcome) => ({ round: 1, type: "cell", criterion: "T-2.1", kind: "state", outcome, why: "x" }));
  const cases: TestEntry[] = (["blocked", "failed", "passed"] as const).map((outcome, at) => ({ ...caseEntry(`C-0${at + 1}`), outcome }) as TestEntry);
  const rows = [...cells, ...cases].map((entry) => ({ ts: TS, ...entry }) as TestRow);
  assert.equal(roundCounts(rows, 1), "1 passed, 1 failed, 2 blocked, 1 not run, 1 not covered");
});
