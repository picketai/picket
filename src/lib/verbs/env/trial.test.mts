import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { describeExit } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { gitIn, gitRepo } from "#test/git.mts";
import { renderTrial, trialEnvironment, verb, type TrialReport } from "./trial.mts";

const RECORDED = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const ENV = { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "" };

function project(t: TestContext): Context {
  const root = realpathSync(gitRepo(t, { files: { "README.md": "u\n" } }));
  cpSync(resolve("test/fixtures/env/umbrella"), root, { recursive: true });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  return { root, cwd: root, now: () => new Date("2026-11-14T10:00:00Z"), env: ENV, home: root, session: null, platform: process.platform };
}

function runner(root: string, { failUp }: { failUp: boolean }): EngineRunner {
  return (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    if (args.at(-1) === "--profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
    if (args.includes("config")) return { status: 0, stdout: RECORDED.replaceAll('"/umbrella/', `"${root}/`), stderr: "" };
    if (failUp && args.includes("up")) return { status: 1, stdout: "", stderr: "cache is unhealthy" };
    return { status: 0, stdout: "", stderr: "" };
  };
}

test("env trial takes no arguments", () => {
  assert.equal(verb.usage, "env trial");
  assert.equal(verb.output, "text");
});

test("a passing trial exits 0, prints trial passed twice and records a pass", (t) => {
  const ctx = project(t);
  const outcome = trialEnvironment(ctx, runner(ctx.root, { failUp: false }));
  assert.equal(describeExit(outcome).code, 0);
  assert.equal(renderTrial(describeExit(outcome).json as TrialReport), "trial passed twice; removed 0 trial image(s)");
  const record = JSON.parse(readFileSync(join(ctx.root, ".picket", "state", "env", "trial.json"), "utf8"));
  assert.deepEqual([record.passed, record.at], [true, "2026-11-14T10:00:00.000Z"]);
});

test("a failing up exits 2, names the round and records a failure (T-6.2)", (t) => {
  const ctx = project(t);
  const outcome = trialEnvironment(ctx, runner(ctx.root, { failUp: true }));
  assert.equal(describeExit(outcome).code, 2);
  assert.equal(renderTrial(describeExit(outcome).json as TrialReport), "trial failed in round 1: up failed: cache is unhealthy; removed 0 trial image(s)");
  assert.equal(JSON.parse(readFileSync(join(ctx.root, ".picket", "state", "env", "trial.json"), "utf8")).passed, false);
});
