#!/usr/bin/env node
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { buildTemplate, materializeRun } from "./lib/fixture.mjs";
import { loadTasks } from "./lib/tasks.mjs";
import { seedTesterTask } from "./lib/tester-seed.mjs";
import { isGreen, keyOutcome } from "./lib/key-outcome.mjs";

const BENCH = dirname(fileURLToPath(import.meta.url));
const KEY_TEST = "key.test.ts";
const PINS_TODAY = new Set(["fast-18-router-refactor"]);

function vitest(repo, args) {
  const out = join(repo, ".selfcheck.json");
  rmSync(out, { force: true });
  try {
    execFileSync("npx", ["vitest", "run", "--reporter=json", `--outputFile=${out}`, ...args], { cwd: repo, stdio: "ignore", shell: true, timeout: 180_000 });
  } catch {}
  if (!existsSync(out)) return { passed: 0, failed: 0, total: 0, missing: true };
  const j = JSON.parse(readFileSync(out, "utf8"));
  return { passed: j.numPassedTests ?? 0, failed: j.numFailedTests ?? 0, total: j.numTotalTests ?? 0, suitesFailed: j.numFailedTestSuites ?? 0 };
}

function placeHidden(repo, folder) {
  const target = join(repo, "test", "hidden");
  rmSync(target, { recursive: true, force: true });
  cpSync(folder, target, { recursive: true });
}

function checkTesterTask(template, task) {
  const runDir = join(BENCH, ".runs", `selfcheck-${task.id}`);
  const { repo, sha } = materializeRun({ template, runDir });
  seedTesterTask({ repo, task, seedDir: join(BENCH, "seeds", task.id), base: sha });
  const hidden = join(BENCH, "hidden", task.id);
  const key = JSON.parse(readFileSync(join(hidden, "key.json"), "utf8"));
  const suite = vitest(repo, []);
  const keyRun = existsSync(join(hidden, KEY_TEST)) ? (placeHidden(repo, hidden), vitest(repo, ["test/hidden"])) : null;
  const outcome = keyOutcome(key.kind, keyRun);
  const ok = isGreen(suite) && outcome.ok;
  const keyText = keyRun ? `, key ${keyRun.passed} passed, ${keyRun.failed} failed` : "";
  console.log(`${ok ? "ok  " : "BAD "} ${task.id}: ${outcome.label} (suite ${suite.passed}/${suite.total}${keyText})`);
  rmSync(runDir, { recursive: true, force: true });
  return ok;
}

const { template } = buildTemplate({ fixtureDir: join(BENCH, "fixture"), cacheDir: join(BENCH, ".cache"), log: console.log });
const runDir = join(BENCH, ".runs", "selfcheck");
const { repo, sha } = materializeRun({ template, runDir });
console.log(`fixture sha ${sha}`);

const own = vitest(repo, []);
console.log(`own suite: ${own.passed}/${own.total} passed${own.failed ? " FAILED" : ""}`);
let bad = own.failed > 0 || own.total === 0;

const testerTasks = loadTasks("kind:tester");
const testerIds = new Set(testerTasks.map((task) => task.id));
for (const task of readdirSync(join(BENCH, "hidden")).sort().filter((id) => !testerIds.has(id))) {
  placeHidden(repo, join(BENCH, "hidden", task));
  const r = vitest(repo, ["test/hidden"]);
  const asExpected = PINS_TODAY.has(task) ? isGreen(r) : r.failed > 0 || r.suitesFailed > 0 || r.missing;
  if (!asExpected) bad = true;
  console.log(`${asExpected ? "ok  " : "BAD "} ${task}: ${r.passed} passed, ${r.failed} failed, ${r.suitesFailed ?? 0} suite(s) failed to load`);
}
rmSync(runDir, { recursive: true, force: true });

for (const task of testerTasks) if (!checkTesterTask(template, task)) bad = true;
process.exit(bad ? 1 : 0);
