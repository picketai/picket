import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { describeExit, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readStacks, recordStack, type StackEntry } from "../../shared/env/stacks.mts";
import { withProject, openItem } from "#test/project.mts";
import { parseArgs } from "../../util/args.mts";
import { renderStop, stopEnvironment, verb, type StopReport } from "./stop.mts";

function context(t: TestContext): Context {
  const root = withProject(t);
  return { root, cwd: root, now: () => new Date(0), env: {}, home: root, session: "s", platform: process.platform };
}

function recording(): { runner: EngineRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: EngineRunner = (program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    calls.push([program, ...args]);
    return { status: 0, stdout: "", stderr: "" };
  };
  return { runner, calls };
}

test("env stop needs an id", () => {
  assert.throws(() => verb.parse(parseArgs([])), /env stop needs <id>/);
});

test("stop runs compose -p picket-<key> with the recorded files and keeps the stacks entry (T-5.5)", (t) => {
  const ctx = context(t);
  const { id } = openItem(ctx.root, { lane: "order", title: "Orders", source: "PROJ-481" });
  const entry: StackEntry = { item: id, session: "s", files: ["/u/compose.yaml", "/u/compose.picket.yaml"], engine: { name: "docker", program: "docker", prefix: [] }, started: "2026-11-14T10:00:00.000Z" };
  recordStack(ctx.root, "picket-proj-481", entry);
  const { runner, calls } = recording();
  const outcome = stopEnvironment(ctx, runner, id);
  assert.equal(describeExit(outcome).code, 0);
  assert.deepEqual(calls, [["docker", "compose", "-p", "picket-proj-481", "--project-directory", join(ctx.root, ".picket", "env"), "-f", "/u/compose.yaml", "-f", "/u/compose.picket.yaml", "stop"]]);
  assert.deepEqual(readStacks(ctx.root), { "picket-proj-481": entry });
  assert.equal(renderStop(describeExit(outcome).json as StopReport), "stopped picket-proj-481; its containers and volumes stay until the item closes");
});

test("stop without a recorded stack refuses and calls no compose", (t) => {
  const ctx = context(t);
  const { id } = openItem(ctx.root, { lane: "order", title: "Orders", source: "PROJ-481" });
  const { runner, calls } = recording();
  assert.throws(() => stopEnvironment(ctx, runner, id), (err: Error) => err instanceof Refused && err.message === `no stack picket-proj-481 is recorded; run picket env start ${id}`);
  assert.deepEqual(calls, []);
});
