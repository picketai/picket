import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, writeState, type Status } from "../work/state.mts";
import { openItem, withProject } from "#test/project.mts";
import { activeClaim, dropStack, readStacks, recordStack, type StackEntry } from "./stacks.mts";

function root(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), "picket-stacks-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function entry(item: string, session: string | null): StackEntry {
  return { item, session, files: ["/u/.picket/env/compose.yaml", `/u/.picket/state/env/picket-${item}/compose.picket.yaml`], engine: { name: "docker", program: "docker", prefix: [] }, started: "2026-11-14T10:00:00.000Z" };
}

function itemAt(dir: string, title: string, status: Status): string {
  const { id } = openItem(dir, { lane: "order", title });
  const reason = status === "blocked" ? { blocked_reason: "waiting" } : {};
  if (status !== "open") writeState(dir, { ...readState(dir, id), status, ...reason }, new Date());
  return id;
}

test("activeClaim names another open or blocked item and passes everything else (T-1.6)", (t) => {
  const dir = withProject(t);
  const stack = "picket-proj-481";
  const owner = itemAt(dir, "Owner", "open");
  assert.equal(activeClaim(dir, stack, null, owner), null);
  assert.equal(activeClaim(dir, stack, owner, owner), null);
  for (const status of ["done", "abandoned"] as const) assert.equal(activeClaim(dir, stack, itemAt(dir, `Other ${status}`, status), owner), null, status);
  assert.equal(activeClaim(dir, stack, "20260101-gone", owner), null);
  for (const status of ["open", "blocked"] as const) {
    const other = itemAt(dir, `Other ${status}`, status);
    assert.equal(activeClaim(dir, stack, other, owner), `${stack} belongs to ${other}, which is ${status}; close it first`);
    assert.equal(activeClaim(dir, stack, other, null), `${stack} belongs to ${other}, which is ${status}; close it first`);
  }
});

test("no stacks file reads as no stacks", (t) => {
  assert.deepEqual(readStacks(root(t)), {});
});

test("recordStack adds or replaces one stack and keeps the others; dropStack removes only that one", (t) => {
  const dir = root(t);
  recordStack(dir, "picket-a", entry("a", "s1"));
  recordStack(dir, "picket-b", entry("b", null));
  recordStack(dir, "picket-a", entry("a", "s2"));
  assert.deepEqual(readStacks(dir), { "picket-a": entry("a", "s2"), "picket-b": entry("b", null) });
  dropStack(dir, "picket-a");
  assert.deepEqual(readStacks(dir), { "picket-b": entry("b", null) });
  dropStack(dir, "picket-zzz");
  assert.deepEqual(readStacks(dir), { "picket-b": entry("b", null) });
});
