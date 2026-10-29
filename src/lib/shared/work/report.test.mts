import { test } from "node:test";
import assert from "node:assert/strict";
import { reportFindings } from "./report.mts";

test("reportFindings counts the finding lines and names the ones flagged for architect review", () => {
  const body = ["## Findings", "", "- **R-002** the port is hard-coded [ARCHITECT REVIEW NEEDED]", "- **R-004** the retry is unbounded", "", "### R-005 a heading finding", "R-006 a bare finding", "See R-002 again in prose."].join("\n");
  assert.deepEqual(reportFindings(body), { findings: 4, architect_review: ["R-002"] });
});

test("a report with no finding lines has none to count or flag", () => {
  assert.deepEqual(reportFindings("# Report\n\nNothing found.\n"), { findings: 0, architect_review: [] });
});
