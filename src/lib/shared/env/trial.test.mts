import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ServiceSource } from "./build-plan.mts";
import { findEngine, type Engine, type EngineRunner } from "./engine.mts";
import { readModel } from "./model.mts";
import { recordTrial, runTrial, trialFinding } from "./trial.mts";

const MODEL_JSON = JSON.parse(readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8")) as Record<string, unknown>;
const SOURCES: ServiceSource[] = [{ service: "orders", checkout: "/u", context: "/u/services/orders", dockerfile: null, version: "4f2a91c" }];
const VALUE_FLAGS = ["-p", "--project-directory", "-f"];

function tempRoot(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-trial-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function engine(failUpOnCall = 0): { engine: Engine; calls: string[]; stacks: string[] } {
  const calls: string[] = [];
  const stacks: string[] = [];
  let ups = 0;
  const runner: EngineRunner = (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: "{}", stderr: "" };
    const stack = args.indexOf("-p");
    if (stack >= 0) stacks.push(args[stack + 1]);
    const words = args.filter((arg, i) => !VALUE_FLAGS.includes(arg) && !VALUE_FLAGS.includes(args[i - 1]));
    calls.push(words.slice(0, 2).join(" "));
    if (words[1] === "up" && ++ups === failUpOnCall) return { status: 1, stdout: "", stderr: "orders is unhealthy" };
    if (words[1] === "ls") return { status: 0, stdout: "sha256:aaa\nsha256:bbb\n", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  const found = findEngine({}, "/", runner, null);
  assert.ok(found);
  calls.length = 0;
  return { engine: found, calls, stacks };
}

test("a trial builds, starts and removes the stack twice, then removes the trial images, all as picket-trial (T-6.1)", (t) => {
  const root = tempRoot(t);
  const { engine: e, calls, stacks } = engine();
  const result = runTrial(e, root, readModel(MODEL_JSON), SOURCES);
  assert.deepEqual(result, { passed: true, rounds: 2, failure: null, removed_images: 2 });
  assert.deepEqual(calls, ["compose build", "compose up", "compose down", "compose build", "compose up", "compose down", "image ls", "image rm"]);
  assert.deepEqual([...new Set(stacks)], ["picket-trial"]);
  const override = JSON.parse(readFileSync(join(root, ".picket", "state", "env", "picket-trial", "compose.picket.yaml"), "utf8"));
  assert.equal(override.services.orders.image, "picket/orders-trial:4f2a91c");
  assert.deepEqual(override.services.cache.labels, { "io.github.picketai.item": "trial" });
});

test("a failing second up still takes the stack down and fails the trial (T-6.2)", (t) => {
  const root = tempRoot(t);
  const { engine: e, calls } = engine(2);
  const result = runTrial(e, root, readModel(MODEL_JSON), SOURCES);
  assert.deepEqual(result, { passed: false, rounds: 2, failure: "round 2: up failed: orders is unhealthy", removed_images: 2 });
  assert.deepEqual(calls, ["compose build", "compose up", "compose down", "compose build", "compose up", "compose down", "image ls", "image rm"]);
});

test("E10 is pending with no record, an error for another model or a failed run, and absent after a pass (T-6.3)", (t) => {
  const root = tempRoot(t);
  assert.deepEqual(trialFinding(root, MODEL_JSON), { rule: "E10", service: "trial", level: "pending", message: "run picket env trial" });
  recordTrial(root, { ...MODEL_JSON, name: "other" }, true, new Date("2026-11-14T10:00:00Z"));
  assert.deepEqual(trialFinding(root, MODEL_JSON), { rule: "E10", service: null, level: "error", message: "the last trial ran on another environment; run picket env trial" });
  recordTrial(root, MODEL_JSON, false, new Date("2026-11-14T10:00:00Z"));
  assert.deepEqual(trialFinding(root, MODEL_JSON), { rule: "E10", service: null, level: "error", message: "the last trial failed; fix the environment and run picket env trial" });
  const record = recordTrial(root, MODEL_JSON, true, new Date("2026-11-14T10:00:00Z"));
  assert.equal(record.at, "2026-11-14T10:00:00.000Z");
  assert.match(record.fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(trialFinding(root, MODEL_JSON), null);
});
