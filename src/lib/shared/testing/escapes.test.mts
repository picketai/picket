import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeRole, isEscapePoint, missingEscapes, NOT_CHECKABLE } from "./escapes.mts";
import type { CaseRow, ClassRow, EscapeRow, TestRow } from "./results.mts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { missingDefectEscapes } from "./escapes.mts";
import { appendTestRow } from "./results.mts";
import { writeDefect, type DefectEntry } from "../scenarios/defects.mts";
import { readSnapshot } from "../work/snapshot.mts";
import { openItem, withProject } from "#test/project.mts";

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

function known(id: string, status: DefectEntry["status"]): DefectEntry {
  return { id, status, opened: "2026-11-01", found_in: "20261101-a", scenario: "S-0001", expected: "x", actual: "y", evidence: "z" };
}

test("an open known defect the request names and no escape row names is missing; a fixed or unnamed one is not (T-2.2)", (t) => {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "order", title: "Fix" });
  writeFileSync(join(root, "work", id, "request.md"), "fixes DF-0001 and DF-0003\n");
  for (const entry of [known("DF-0001", "open"), known("DF-0002", "open"), known("DF-0003", "fixed")]) writeDefect(root, entry);
  assert.deepEqual(missingDefectEscapes(root, readSnapshot(root, id)), ["DF-0001"]);
  appendTestRow(root, id, { round: 1, type: "escape", case: "DF-0001", root_cause: "the total skipped the discount", escaped: "unit test" }, new Date(TS));
  assert.deepEqual(missingDefectEscapes(root, readSnapshot(root, id)), []);
});
