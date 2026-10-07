import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../core/skills/documenting/scripts/filename.mjs", import.meta.url));

function name(kind, subject) {
  return execFileSync(process.execPath, [script, "--kind", kind, subject], { encoding: "utf8" }).trim();
}

test("a name that would start with a blocked word gets the about- prefix", () => {
  assert.equal(name("report", "Report on invoice pricing"), "about-report-invoice-pricing-analysis");
  assert.equal(name("api", "GET /v1/summary"), "about-summary");
  assert.equal(name("api", "GET /v1/reports/monthly"), "about-reports-monthly");
});

test("the match is a string prefix, as in Claude Code's regex, not a whole token", () => {
  assert.equal(name("report", "reporting pipeline latency"), "about-reporting-pipeline-latency-analysis");
});

test("names that do not start with a blocked word are unchanged", () => {
  assert.equal(name("report", "invoice pricing"), "invoice-pricing-analysis");
  assert.equal(name("report", "Analysis of pricing"), "pricing-analysis");
});
