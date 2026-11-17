import { test } from "node:test";
import assert from "node:assert/strict";
import type { Derived } from "./derive.mts";
import { renderReport } from "./report.mts";
import type { CaseRow, TestRow } from "./results.mts";

const TS = "2026-11-17T10:00:00.000Z";
const FIX: Derived = { verdict: "CHANGES REQUIRED", route: "fix", reasons: ["C-03 T-2.1 boundary failed: product"], unclassified: [] };

function caseRow(id: string, outcome: CaseRow["outcome"], mocks: string[] = [], round = 1): CaseRow {
  return { ts: TS, round, type: "case", case: id, criterion: "T-2.1", kind: "normal", intent: "an order is placed", steps: "request GET {orders}/orders", outcome, attempts: 1, unstable: false, detail: outcome === "failed" ? "expected 201, got 500" : "", mocks };
}

const ROWS: TestRow[] = [
  caseRow("C-01", "passed"),
  caseRow("C-02", "passed"),
  caseRow("C-03", "failed", ["payments-mock"]),
  { ts: TS, round: 1, type: "class", case: "C-03", class: "product", evidence: "the service answered 500" },
  { ts: TS, round: 1, type: "cell", criterion: "T-2.1", kind: "state", outcome: "blocked", why: "no stock fixture" },
  { ts: TS, round: 1, type: "cell", criterion: "T-2.1", kind: "permission", outcome: "not covered", why: "the cap is reached" },
];

function tableRows(text: string): string[] {
  return text.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| Criterion") && !line.startsWith("| ---"));
}

test("counts, table rows and mocks are counted from the rows (T-1.7)", () => {
  const text = renderReport({ id: "20261117-orders", round: 1, derived: FIX, rows: ROWS, criteria: ["T-2.1"] });
  assert.ok(text.startsWith("# Test report: 20261117-orders\n"));
  assert.ok(text.includes("\nRound 1 · CHANGES REQUIRED · route fix\n"));
  assert.ok(text.includes("\n2 passed, 1 failed, 1 blocked, 1 not covered\n"));
  assert.equal(tableRows(text).length, 5);
  assert.ok(text.includes("| T-2.1 | normal | C-03 | failed | product | payments-mock | expected 201, got 500 |"));
  assert.ok(text.includes("\n- C-03 T-2.1 boundary failed: product\n"));
  assert.ok(text.includes("\nThrough a mock: payments-mock\n"));
});

test("rows of another round and earlier runs of a case are left out", () => {
  const rows: TestRow[] = [caseRow("C-01", "failed", [], 1), caseRow("C-01", "failed", [], 2), caseRow("C-01", "passed", [], 2)];
  const text = renderReport({ id: "x-1", round: 2, derived: { verdict: "APPROVED", route: null, reasons: [], unclassified: [] }, rows, criteria: ["T-2.1"] });
  assert.ok(text.includes("\nRound 2 · APPROVED\n"));
  assert.ok(text.includes("\n1 passed\n"));
  assert.equal(tableRows(text).length, 1);
  assert.ok(!text.includes("Through a mock"));
});

test("a question renders with its choices, default and basis", () => {
  const rows: TestRow[] = [{ ts: TS, round: 1, type: "question", criterion: "T-2.1", question: "Is an empty basket an error?", choices: ["yes", "no"], default: "no", basis: "the request says nothing" }];
  const text = renderReport({ id: "x-1", round: 1, derived: { verdict: "CHANGES REQUIRED", route: "user", reasons: [], unclassified: [] }, rows, criteria: ["T-2.1"] });
  assert.ok(text.includes("- T-2.1: Is an empty basket an error?\n  - yes\n  - no (default)\n  Basis: the request says nothing\n"));
  assert.ok(text.includes("\nno cases recorded\n"));
});

test("a pipe in a detail does not break the table", () => {
  const rows: TestRow[] = [{ ...caseRow("C-01", "failed"), detail: "body a|b" }];
  const text = renderReport({ id: "x-1", round: 1, derived: FIX, rows, criteria: ["T-2.1"] });
  assert.ok(text.includes("| body a\\|b |"));
});
