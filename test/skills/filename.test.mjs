import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function installedProject() {
  const root = mkdtempSync(join(tmpdir(), "tether-filename-"));
  mkdirSync(join(root, ".picket"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "artifacts", "strategy", "decisions"), { recursive: true });
  writeFileSync(join(root, "artifacts", "strategy", "decisions", "00003-x.md"), "# x\n");
  return root;
}

function sdrName(cwd, projectDir) {
  const { CLAUDE_PROJECT_DIR, ...env } = process.env;
  if (projectDir) env.CLAUDE_PROJECT_DIR = projectDir;
  return execFileSync(process.execPath, [script, "sdr", "pricing"], { cwd, env, encoding: "utf8" }).trim();
}

test("SDR numbering continues from the project the command runs in, at its root or in a subfolder", () => {
  const root = installedProject();
  try {
    assert.equal(sdrName(root), "00004-pricing");
    assert.equal(sdrName(join(root, "src")), "00004-pricing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SDR numbering follows CLAUDE_PROJECT_DIR from an unrelated folder", () => {
  const root = installedProject();
  const elsewhere = mkdtempSync(join(tmpdir(), "tether-elsewhere-"));
  try {
    assert.equal(sdrName(elsewhere, root), "00004-pricing");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});
