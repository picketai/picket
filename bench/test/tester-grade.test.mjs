import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { appendTestRow } from "../../dist/lib/shared/testing/results.mjs";
import { gradeTester, loadKernelReaders } from "../lib/tester-grade.mjs";

const ITEM = "20260101-new-invoices-are-validated";
const TASK = { id: "test-01-negative-quantity", item: ITEM };
const DEFECT = { kind: "defect", defect: { criterion: "T-1.1", method: "POST", path: "^/invoices$", status: 400 } };
const TRAP = { kind: "trap" };
const SILENT = { kind: "silent", question: { criterion: "T-1.2" } };
const NEGATIVE_POST = 'request POST {ledgerlite}/invoices\n  body {"customer":"PKT-a","currency":"EUR","lines":[{"description":"a","quantity":-1,"unitPriceCents":5}]}\nexpect status 400';
const C09 = [
  "request GET {ledgerlite}/invoices",
  "expect status 200",
  "capture before json total",
  "request POST {ledgerlite}/invoices",
  "  header content-type: application/json",
  '  body {"customer": "PKT-{run}", "currency": "EUR", "lines": [{"description": "item", "quantity": -1, "unitPriceCents": 150}]}',
  "request GET {ledgerlite}/invoices",
  "expect status 200",
  'expect contains "\\"total\\":{before}"',
].join("\n");
const TEST_01_KEY = JSON.parse(readFileSync(new URL("../hidden/test-01-negative-quantity/key.json", import.meta.url), "utf8"));
const PAGE_PAST_END = "request GET {ledgerlite}/invoices?page=99\nexpect status 404";
const ROUND_ONE = "# Test report\n\nRound 1 · CHANGES REQUIRED · route fix\n";
const readers = await loadKernelReaders(resolve("dist"));

let minute = 0;

function at() {
  minute += 1;
  return new Date(Date.UTC(2026, 0, 1, 10, minute));
}

function item(t, report = ROUND_ONE) {
  const repo = mkdtempSync(join(tmpdir(), "bench-grade-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  mkdirSync(join(repo, "work", ITEM), { recursive: true });
  if (report !== null) writeFileSync(join(repo, "work", ITEM, "test.md"), report);
  return repo;
}

function failedCase(repo, { id, steps, failure = "product", round = 1, criterion = "T-1.1" }) {
  appendTestRow(repo, ITEM, { type: "case", round, case: id, criterion, kind: "negative", intent: "refuse a bad body", steps, outcome: "failed", attempts: 1, unstable: false, detail: "got 201", mocks: [] }, at());
  appendTestRow(repo, ITEM, { type: "class", round, case: id, class: failure, evidence: "the answer breaks the story" }, at());
}

function question(repo, criterion, round = 1) {
  appendTestRow(repo, ITEM, { type: "question", round, criterion, question: "may a credit exceed the total?", choices: ["yes", "no"], default: null, basis: null }, at());
}

const grade = (repo, key) => gradeTester({ repo, task: TASK, key, readers });

test("a round-1 product failure on the key's request and status finds the defect (T-2.1)", (t) => {
  const repo = item(t);
  failedCase(repo, { id: "C-01", steps: NEGATIVE_POST });
  const graded = grade(repo, DEFECT);
  assert.deepEqual(graded.tester, { verdict: "CHANGES REQUIRED", found: true, false_alarms: 0, questions_right: null, signature: "found=true false_alarms=0 questions_right=null" });
  assert.equal(graded.pass, true);
  assert.deepEqual(graded.checks.map((c) => [c.name, c.ok]), [["report_exists", true], ["defect_found", true], ["no_false_alarm", true]]);
});

test("a second product failure on another request is a false alarm and fails the run (T-2.2)", (t) => {
  const repo = item(t);
  failedCase(repo, { id: "C-01", steps: NEGATIVE_POST });
  failedCase(repo, { id: "C-02", steps: PAGE_PAST_END });
  const graded = grade(repo, DEFECT);
  assert.deepEqual([graded.tester.found, graded.tester.false_alarms, graded.tester.questions_right, graded.pass], [true, 1, null, false]);
});

test("on a trap key one product failure or one question fails the run (T-2.2)", (t) => {
  const failing = item(t);
  failedCase(failing, { id: "C-01", steps: PAGE_PAST_END });
  const failed = grade(failing, TRAP);
  assert.deepEqual([failed.tester.found, failed.tester.false_alarms, failed.tester.questions_right, failed.pass], [null, 1, null, false]);
  const asking = item(t);
  question(asking, "T-1.2");
  const asked = grade(asking, TRAP);
  assert.deepEqual([asked.tester.found, asked.tester.false_alarms, asked.tester.questions_right, asked.pass], [null, 0, null, false]);
  const quiet = grade(item(t), TRAP);
  assert.deepEqual([quiet.tester.found, quiet.tester.false_alarms, quiet.tester.questions_right, quiet.pass], [null, 0, null, true]);
});

test("on a silent key a question on its criterion is right and one on another criterion is not (T-2.3)", (t) => {
  const right = item(t);
  question(right, "T-1.2");
  const asked = grade(right, SILENT);
  assert.deepEqual([asked.tester.found, asked.tester.false_alarms, asked.tester.questions_right, asked.pass], [null, 0, true, true]);
  const wrong = item(t);
  question(wrong, "T-1.1");
  const missed = grade(wrong, SILENT);
  assert.deepEqual([missed.tester.found, missed.tester.false_alarms, missed.tester.questions_right, missed.pass], [null, 0, false, false]);
});

test("a test or environment class and a round-2 match find nothing and raise no alarm (T-2.4)", (t) => {
  const cases = [
    { id: "C-01", steps: NEGATIVE_POST, failure: "test" },
    { id: "C-01", steps: NEGATIVE_POST, failure: "environment" },
    { id: "C-01", steps: NEGATIVE_POST, round: 2 },
  ];
  for (const spec of cases) {
    const repo = item(t);
    failedCase(repo, spec);
    const graded = grade(repo, DEFECT);
    assert.deepEqual([graded.tester.found, graded.tester.false_alarms, graded.tester.questions_right, graded.pass], [false, 0, null, false], JSON.stringify(spec));
  }
});

test("the key's request expecting the planted answer passes, so it finds nothing and raises no alarm (T-2.4)", (t) => {
  const repo = item(t);
  const steps = NEGATIVE_POST.replace("expect status 400", "expect status 201");
  appendTestRow(repo, ITEM, { type: "case", round: 1, case: "C-01", criterion: "T-1.1", kind: "negative", intent: "store a negative line", steps, outcome: "passed", attempts: 1, unstable: false, detail: "", mocks: [] }, at());
  const graded = grade(repo, DEFECT);
  assert.deepEqual([graded.tester.found, graded.tester.false_alarms, graded.tester.questions_right, graded.pass], [false, 0, null, false]);
});

test("a product failure whose request matches but whose expected status differs is not the defect (T-2.4)", (t) => {
  const repo = item(t);
  failedCase(repo, { id: "C-01", steps: NEGATIVE_POST.replace("expect status 400", "expect status 422") });
  const graded = grade(repo, DEFECT);
  assert.deepEqual([graded.tester.found, graded.tester.false_alarms, graded.pass], [false, 1, false]);
});

test("without test.md the report check fails, the verdict is null and the run fails (T-2.5)", (t) => {
  const repo = item(t, null);
  failedCase(repo, { id: "C-01", steps: NEGATIVE_POST });
  const graded = grade(repo, DEFECT);
  assert.deepEqual(graded.checks[0], { name: "report_exists", ok: false, detail: `work/${ITEM}/test.md` });
  assert.deepEqual([graded.tester.verdict, graded.tester.found, graded.tester.false_alarms, graded.pass], [null, true, 0, false]);
});

test("the shipped test-01 key adds one T-1.2 consequence beside an unchanged defect (T-2.1)", () => {
  assert.deepEqual(TEST_01_KEY, {
    kind: "defect",
    defect: { criterion: "T-1.1", method: "POST", path: "^/invoices$", status: 400 },
    consequences: [{ criterion: "T-1.2", method: "POST", path: "^/invoices$", body: '"quantity"\\s*:\\s*-' }],
  });
});

test("with the shipped test-01 key a T-1.2 case posting a negative quantity counts as the defect beside the T-1.1 case (T-2.2)", (t) => {
  const repo = item(t);
  failedCase(repo, { id: "C-02", steps: NEGATIVE_POST });
  failedCase(repo, { id: "C-09", steps: C09, criterion: "T-1.2" });
  const graded = grade(repo, TEST_01_KEY);
  assert.deepEqual(graded.tester, { verdict: "CHANGES REQUIRED", found: true, false_alarms: 0, questions_right: null, signature: "found=true false_alarms=0 questions_right=null" });
  assert.equal(graded.pass, true);
  assert.deepEqual(graded.checks[1], { name: "defect_found", ok: true, detail: "C-02, C-09" });
});

test("with the shipped test-01 key the T-1.2 consequence alone finds the defect (T-2.3)", (t) => {
  const repo = item(t);
  failedCase(repo, { id: "C-09", steps: C09, criterion: "T-1.2" });
  const graded = grade(repo, TEST_01_KEY);
  assert.deepEqual(graded.tester, { verdict: "CHANGES REQUIRED", found: true, false_alarms: 0, questions_right: null, signature: "found=true false_alarms=0 questions_right=null" });
  assert.equal(graded.pass, true);
});

test("with the shipped test-01 key a positive quantity or the consequence under T-1.1 is a false alarm (T-2.4)", (t) => {
  const cases = [
    { id: "C-09", steps: C09.replace('"quantity": -1', '"quantity": 1'), criterion: "T-1.2" },
    { id: "C-09", steps: C09, criterion: "T-1.1" },
  ];
  for (const spec of cases) {
    const repo = item(t);
    failedCase(repo, spec);
    const graded = grade(repo, TEST_01_KEY);
    assert.deepEqual(graded.tester, { verdict: "CHANGES REQUIRED", found: false, false_alarms: 1, questions_right: null, signature: "found=false false_alarms=1 questions_right=null" }, spec.criterion);
    assert.equal(graded.pass, false, spec.criterion);
  }
});
