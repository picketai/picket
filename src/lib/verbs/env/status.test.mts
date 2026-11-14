import { test } from "node:test";
import assert from "node:assert/strict";
import { describeExit } from "../../shared/action.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject } from "#test/project.mts";
import { environmentStatus, renderStatus, stackRows, verb, type StatusReport } from "./status.mts";

function container(project: string, item: string, state: string, labelsAsText = true): object {
  const labels = { "com.docker.compose.project": project, "io.github.picketai.item": item };
  const text = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(",");
  return { Labels: labelsAsText ? text : labels, State: state };
}

test("rows show open, done and unknown item statuses and running or stopped per stack (T-7.5)", (t) => {
  const root = withProject(t);
  const open = openItem(root, { lane: "order", title: "Open one" });
  const closed = openItem(root, { lane: "order", title: "Closed one" });
  writeState(root, { ...readState(root, closed.id), status: "done" }, new Date());
  const rows = stackRows(root, [
    container("picket-open", open.id, "running"),
    container("picket-open", open.id, "exited"),
    container("picket-done", closed.id, "exited", false),
    container("picket-gone", "20260101-missing", "exited"),
    { Labels: "com.docker.compose.project=other", State: "running" },
  ]);
  assert.deepEqual(rows, [
    { stack: "picket-done", item: closed.id, item_status: "done", state: "stopped" },
    { stack: "picket-gone", item: "20260101-missing", item_status: "unknown", state: "stopped" },
    { stack: "picket-open", item: open.id, item_status: "open", state: "running" },
  ]);
  const machine = { ok: true, engine: { program: "docker", kind: "docker" as const }, os_type: "linux", compose: "2.29.1", memory_bytes: null, free_disk_bytes: null, missing: [] };
  assert.equal(renderStatus({ ok: true, machine, stacks: rows }).split("\n")[2], `picket-open · item ${open.id} (open) · running`);
});

test("env status asks ps for every container with the item label and prints no stacks when there are none (T-7.7)", (t) => {
  const root = withProject(t);
  const calls: string[][] = [];
  const runner: EngineRunner = (program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    calls.push([program, ...args]);
    return { status: 0, stdout: "", stderr: "" };
  };
  const outcome = environmentStatus(fixedContext(root), runner);
  assert.equal(describeExit(outcome).code, 0);
  assert.deepEqual(calls, [["docker", "ps", "-a", "--format", "json", "--filter", "label=io.github.picketai.item"]]);
  assert.equal(renderStatus(describeExit(outcome).json as StatusReport), "no stacks");
  assert.equal(verb.usage, "env status");
});
