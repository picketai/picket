import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeRole, isEscapePoint, missingEscapes, NOT_CHECKABLE } from "./escapes.mts";
import type { CaseRow, ClassRow, EscapeRow, TestRow } from "./results.mts";

const TS = "2026-11-17T10:00:00.000Z";

function failed(id: string, round = 1): CaseRow {
  return { ts: TS, round, type: "case", case: id, criterion: "T-2.1", kind: "boundary", intent: "an empty basket", steps: "request POST {orders}/orders", outcome: "failed", attempts: 2, unstable: false, detail: "expected 201, got 500", mocks: [] };
}

function classed(id: string, cls: ClassRow["class"], round = 1): ClassRow {
  return { ts: TS, round, type: "class", case: id, class: cls, evidence: "the service answered 500" };
}

function escaped(id: string, round = 2): EscapeRow {
  return { ts: TS, round, type: "escape", case: id, root_cause: "the total skipped the discount", escaped: "unit test" };
}

test("the escape points are the closed list and review row ids by shape", () => {
  for (const point of ["unit test", "declared check", NOT_CHECKABLE, "Ts4", "Sec12"]) assert.equal(isEscapePoint(point), true, point);
  for (const point of ["code review", "ts4", "Ts", "unit tests", ""]) assert.equal(isEscapePoint(point), false, point);
});

test("each escape point names the role whose check it got past, and none has no role", () => {
  assert.deepEqual(["unit test", "declared check", "Ts4", NOT_CHECKABLE].map(escapeRole), ["developer", "architect", "reviewer", null]);
});

test("a product failure of the round with no escape row is missing; an environment failure is not (T-3.2)", () => {
  const rows: TestRow[] = [failed("C-03"), classed("C-03", "product"), failed("C-04"), classed("C-04", "environment")];
  assert.deepEqual(missingEscapes(rows, 1), ["C-03"]);
  assert.deepEqual(missingEscapes([...rows, escaped("C-03")], 1), []);
});

test("a product failure of another round is not missing in this one", () => {
  assert.deepEqual(missingEscapes([failed("C-03", 2), classed("C-03", "product", 2)], 1), []);
});
