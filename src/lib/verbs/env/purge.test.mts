import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { describeExit, Refused } from "../../shared/action.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readStacks, recordStack } from "../../shared/env/stacks.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readState, writeState, type Status } from "../../shared/work/state.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject } from "#test/project.mts";
import { parseArgs } from "../../util/args.mts";
import { purgeEnvironment, renderPurge, verb, type PurgeReport } from "./purge.mts";

const STACK = "picket-proj-481";

function engine(): { runner: EngineRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: EngineRunner = (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    calls.push(args);
    if (args[0] === "ps" && args.includes("-q")) return { status: 0, stdout: "c1\n", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  return { runner, calls };
}

function stackOf(t: TestContext, status: Status | null): { root: string; id: WorkId | string } {
  const root = withProject(t);
  const id = status === null ? "20260101-gone" : openItem(root, { lane: "order", title: "Orders" }).id;
  const reason = status === "blocked" ? { blocked_reason: "waiting" } : {};
  if (status !== null && status !== "open") writeState(root, { ...readState(root, id as WorkId), status, ...reason }, new Date());
  recordStack(root, STACK, { item: id, session: null, files: [], engine: { name: "docker", program: "docker", prefix: [] }, started: "2026-11-14T10:00:00.000Z" });
  return { root, id };
}

test("env purge needs a stack name of the picket-<key> form", () => {
  assert.throws(() => verb.parse(parseArgs([])), /env purge needs <stack>/);
  assert.throws(() => verb.parse(parseArgs(["../x"])), /is not a stack name/);
  assert.deepEqual(verb.parse(parseArgs([STACK])), { stack: STACK });
});

test("a stack of an open or blocked item refuses, naming the status, with no down call (T-8.2)", (t) => {
  for (const status of ["open", "blocked"] as const) {
    const { root, id } = stackOf(t, status);
    const { runner, calls } = engine();
    assert.throws(() => purgeEnvironment(fixedContext(root), runner, STACK), (err: Error) => err instanceof Refused && err.message === `${STACK} belongs to ${id}, which is ${status}; close it first`);
    assert.ok(!calls.some((args) => args.includes("down")), status);
    assert.deepEqual(Object.keys(readStacks(root)), [STACK]);
  }
});

test("a stack of a done, abandoned or unknown item is purged (T-8.2)", (t) => {
  for (const status of ["done", "abandoned", null] as const) {
    const { root } = stackOf(t, status);
    const { runner, calls } = engine();
    const outcome = purgeEnvironment(fixedContext(root), runner, STACK);
    assert.equal(describeExit(outcome).code, 0, String(status));
    assert.ok(calls.some((args) => args.includes("down")), String(status));
    assert.deepEqual(readStacks(root), {});
    assert.equal(renderPurge(describeExit(outcome).json as PurgeReport).split("\n").at(-1), "removed");
  }
});

test("an unrecorded stack takes its item from the container labels, so an open item's stack still refuses", (t) => {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "order", title: "Orders" });
  const runner: EngineRunner = (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    if (args[0] === "ps" && args.includes("json")) return { status: 0, stdout: JSON.stringify({ Labels: `com.docker.compose.project=${STACK},io.github.picketai.item=${id}` }), stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  assert.throws(() => purgeEnvironment(fixedContext(root), runner, STACK), /which is open; close it first$/);
});

test("a stack recorded for a done item but labelled with an open item refuses, naming the open one (T-1.5)", (t) => {
  const { root } = stackOf(t, "done");
  const { id: open } = openItem(root, { lane: "order", title: "Payments", source: "PROJ-481" });
  const before = readStacks(root);
  const calls: string[][] = [];
  const runner: EngineRunner = (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    calls.push(args);
    if (args[0] === "ps" && args.includes("json")) return { status: 0, stdout: JSON.stringify({ Labels: `com.docker.compose.project=${STACK},io.github.picketai.item=${open}` }), stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  assert.throws(() => purgeEnvironment(fixedContext(root), runner, STACK), (err: Error) => err instanceof Refused && err.message === `${STACK} belongs to ${open}, which is open; close it first`);
  assert.ok(!calls.some((args) => args.includes("down")));
  assert.deepEqual(readStacks(root), before);
});
