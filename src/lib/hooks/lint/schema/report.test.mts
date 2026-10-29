import { test } from "node:test";
import assert from "node:assert/strict";
import { reportProblems } from "./report.mts";

type Draft = { front?: string; summary?: string; findings?: string[] };

const FRONT = "kind: report\ntitle: Pricing\nconfidence: high";

function report({ front = FRONT, summary = "Prices round half-up [VERIFIED].", findings = ["- **R-001** [VERIFIED] Prices round half-up."] }: Draft = {}): string {
  return `---\n${front}\n---\n# Report: Pricing\n\n## Summary\n${summary}\n\n## Findings\n${findings.join("\n")}\n\n## Risks and unknowns\n- [UNKNOWN] none\n`;
}

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
}

test("a complete report has no problems", () => {
  assert.deepEqual(reportProblems(report()), []);
});

test("a confidence outside high, medium and low is reported by name (T-2.1)", () => {
  assert.deepEqual(reportProblems(report({ front: "kind: report\nconfidence: certain" })), ['confidence is "certain"; a report takes high, medium, low']);
  assert.deepEqual(reportProblems(report({ front: "kind: report" })), ["confidence is null; a report takes high, medium, low"]);
});

test("a kind other than report is reported by name (T-2.1)", () => {
  assert.deepEqual(reportProblems(report({ front: "kind: design\nconfidence: high" })), ['kind is "design"; a report needs kind: report']);
});

test("a finding that does not open with exactly one marker is reported with its id (T-2.2)", () => {
  for (const line of ["- **R-003** [VERIFIED, corrected] x", "- **R-003** [VERIFIED] [INFERRED] x", "- **R-003** x"]) {
    const problems = reportProblems(report({ findings: [line] }));
    assert.equal(problems.length, 1, line);
    assert.match(problems[0], /^R-003 opens with/, line);
  }
});

test("a withdrawn finding and one with a single marker pass (T-2.2)", () => {
  assert.deepEqual(reportProblems(report({ findings: ["- **R-004** [withdrawn] x", "- **R-005** [ASSUMED] x"] })), []);
});

test("a report holds at most 50 findings (T-2.3)", () => {
  const findings = (n: number) => Array.from({ length: n }, (_, i) => `- **R-${String(i + 1).padStart(3, "0")}** [VERIFIED] x`);
  assert.deepEqual(reportProblems(report({ findings: findings(50) })), []);
  assert.deepEqual(reportProblems(report({ findings: findings(51) })), ["51 findings; the cap is 50"]);
});

test("a finding holds at most 120 words after its id, continuation lines included (T-2.3)", () => {
  assert.deepEqual(reportProblems(report({ findings: [`- **R-001** [VERIFIED] ${words(60)}`, `  ${words(59)}`] })), []);
  assert.deepEqual(reportProblems(report({ findings: [`- **R-001** [VERIFIED] ${words(60)}`, `  ${words(60)}`] })), ["R-001 runs 121 words; the cap is 120"]);
});

test("the next finding ends a finding's word count", () => {
  assert.deepEqual(reportProblems(report({ findings: [`- **R-001** [VERIFIED] ${words(119)}`, `- **R-002** [VERIFIED] ${words(119)}`] })), []);
});

test("the Summary cites at most three distinct findings, and an SDR id is not one (T-2.4)", () => {
  assert.deepEqual(reportProblems(report({ summary: "R-001, R-002 and R-003 carry it; R-001 again; SDR-00001 records it." })), []);
  assert.deepEqual(reportProblems(report({ summary: "R-001, R-002, R-003 and R-004 carry it." })), ["the Summary cites 4 findings (R-001, R-002, R-003, R-004); the cap is 3"]);
});

test("an id cited outside the Summary does not count toward its cap", () => {
  const findings = ["- **R-001** [VERIFIED] see R-002, R-003, R-004 and R-005."];
  assert.deepEqual(reportProblems(report({ findings })), []);
});

test("an unfilled placeholder and an HTML comment are reported (T-2.5)", () => {
  assert.deepEqual(reportProblems(report({ summary: "[REPLACE: answer]" })), ["unfilled [REPLACE] placeholder left in the file"]);
  assert.deepEqual(reportProblems(report({ summary: "[REPLACE]" })), ["unfilled [REPLACE] placeholder left in the file"]);
  assert.deepEqual(reportProblems(report({ summary: "[REPLACED] is a word, not a placeholder [VERIFIED]." })), []);
  assert.deepEqual(reportProblems(report({ summary: "<!-- required -->\nAnswer [VERIFIED]." })), ["template comment left in the file"]);
});
