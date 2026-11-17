import { test } from "node:test";
import assert from "node:assert/strict";
import { fingerprintMatches, parseScenario } from "../scenarios/format.mts";
import { caseCandidates, notProven } from "./keep-cases.mts";
import type { CaseKind, CaseRow, TestRow } from "./results.mts";

const ITEM = "20261117-orders";
const GET_STEPS = "request GET {orders}/orders\nexpect status 200\n";

function caseRow(id: string, kind: CaseKind, fields: Partial<CaseRow> = {}): CaseRow {
  return { ts: "2026-11-17T10:00:00.000Z", round: 2, type: "case", case: id, criterion: "T-2.1", kind, intent: "orders are listed", steps: GET_STEPS, outcome: "passed", attempts: 1, unstable: false, detail: "", mocks: [], ...fields };
}

test("a passed, stable, unmasked case that writes only its own data becomes a candidate card for the item's criterion (T-9.5)", () => {
  const [candidate] = caseCandidates(ITEM, [caseRow("C-01", "normal")], 2);
  assert.deepEqual([candidate.covers, candidate.outcome, candidate.replaces], ["T-2.1 normal", "passed", null]);
  assert.ok(candidate.text !== null && fingerprintMatches(candidate.text));
  assert.deepEqual(parseScenario(candidate.text ?? "").card?.header.covers, [`${ITEM}/T-2.1`]);
});

test("a failed case, an unstable one, a masked one and a POST without PKT- are never kept (T-9.5)", () => {
  const rows: TestRow[] = [
    caseRow("C-01", "normal", { outcome: "failed" }),
    caseRow("C-02", "boundary", { unstable: true }),
    caseRow("C-03", "permission", { steps: "request GET {orders}/orders\n  header x-key: ***\nexpect status 200\n" }),
    caseRow("C-04", "negative", { steps: 'request POST {orders}/orders\n  body {"sku":"a"}\nexpect status 201\n' }),
    caseRow("C-05", "state", { round: 1 }),
  ];
  assert.deepEqual(caseCandidates(ITEM, rows, 2), []);
});

test("the latest run of a case in the final round decides whether it is kept", () => {
  const rows: TestRow[] = [caseRow("C-01", "normal", { outcome: "failed" }), caseRow("C-01", "normal")];
  assert.equal(caseCandidates(ITEM, rows, 2).length, 1);
});

test("the final round's mocks name the real services, the name before -mock (T-9.4)", () => {
  const rows: TestRow[] = [caseRow("C-01", "normal", { mocks: ["payments-mock", "mailer"] }), caseRow("C-02", "boundary", { mocks: ["payments-mock"] }), caseRow("C-03", "state", { round: 1, mocks: ["stock-mock"] })];
  assert.deepEqual(notProven(rows, 2), ["payments", "mailer"]);
});
