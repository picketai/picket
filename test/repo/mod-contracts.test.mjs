import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TSC = resolve("node_modules/typescript/bin/tsc");
const FIXTURE = resolve("test/repo/mod-contracts");
const STATUS_CONTRACT = resolve("src/mods/status/types/index.d.ts");
const VIEWS = resolve("src/lib/shared/views.mts");
const CHECK_ERROR = /check\.mts\(\d+,\d+\): error TS\d+:/;

function tsc(project) {
  const r = spawnSync(process.execPath, [TSC, "-p", project, "--pretty", "false"], { encoding: "utf8" });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

function plantedProject(t, contractText) {
  const dir = mkdtempSync(join(tmpdir(), "mod-contract-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "index.d.ts"), contractText);
  const config = {
    extends: resolve("tsconfig.json"),
    compilerOptions: { types: [], paths: { "status-contract": [join(dir, "index.d.ts")], "picket-views": [VIEWS] } },
    include: [join(FIXTURE, "check.mts"), join(FIXTURE, "claude-code.d.ts")],
  };
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(config));
  return dir;
}

function contract() {
  return readFileSync(STATUS_CONTRACT, "utf8");
}

test("the status contract holds no import and declares its now, work and agents state", () => {
  const text = contract();
  assert.doesNotMatch(text, /\bimport\b/);
  assert.match(text, /'picket-status': \{ now: number; work: Work \| null; agents: AgentRow\[\] \}/);
});

test("status's Work is the open LatestView of views.mts, cut down to Work's keys (D-004)", () => {
  const r = tsc(FIXTURE);
  assert.equal(r.status, 0, r.output);
});

test("a planted contract whose Work renames phase_count fails the check", (t) => {
  const planted = contract().replace("  phase_count: number", "  phase_total: number");
  assert.notEqual(planted, contract());
  const r = tsc(plantedProject(t, planted));
  assert.notEqual(r.status, 0);
  assert.match(r.output, CHECK_ERROR);
});

test("a planted contract whose Work types phase_count as a string fails the check", (t) => {
  const planted = contract().replace("  phase_count: number", "  phase_count: string");
  assert.notEqual(planted, contract());
  const r = tsc(plantedProject(t, planted));
  assert.notEqual(r.status, 0);
  assert.match(r.output, CHECK_ERROR);
});

test("a planted contract whose Work gives own_gate a field LatestView lacks fails the check", (t) => {
  const planted = contract().replace("own_gate: { kind: string; reason: string } | null", "own_gate: { kind: string; reason: string; since: string } | null");
  assert.notEqual(planted, contract());
  const r = tsc(plantedProject(t, planted));
  assert.notEqual(r.status, 0);
  assert.match(r.output, CHECK_ERROR);
});
