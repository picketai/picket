import { test } from "node:test";
import assert from "node:assert/strict";
import { reportFindings } from "./report.mts";

test("reportFindings counts the finding lines and names the ones flagged for architect review", () => {
  const body = ["## Findings", "", "- **R-002** the port is hard-coded [ARCHITECT REVIEW NEEDED]", "- **R-004** the retry is unbounded", "", "### R-005 a heading finding", "R-006 a bare finding", "See R-002 again in prose."].join("\n");
  assert.deepEqual(reportFindings(body), { findings: 4, architect_review: ["R-002"], strategic_review: [] });
});

test("reportFindings names the findings flagged for strategic review, apart from architect review", () => {
  const body = ["- **R-001** [VERIFIED] two billing engines run side by side", "- **R-002** [INFERRED] the sales context owns pricing [STRATEGIC REVIEW NEEDED]", "Prose naming [STRATEGIC REVIEW NEEDED] is not a finding."].join("\n");
  assert.deepEqual(reportFindings(body), { findings: 2, architect_review: [], strategic_review: ["R-002"] });
});

test("a flag quoted in backticks on a finding line flags nothing", () => {
  const body = ["- **R-001** [VERIFIED] the shell names `[ARCHITECT REVIEW NEEDED]`", "- **R-002** [VERIFIED] the template quotes `[STRATEGIC REVIEW NEEDED]`"].join("\n");
  assert.deepEqual(reportFindings(body), { findings: 2, architect_review: [], strategic_review: [] });
});

test("a report with no finding lines has none to count or flag", () => {
  assert.deepEqual(reportFindings("# Report\n\nNothing found.\n"), { findings: 0, architect_review: [], strategic_review: [] });
});
