import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dropStack, readStacks, recordStack, type StackEntry } from "./stacks.mts";

function root(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), "picket-stacks-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function entry(item: string, session: string | null): StackEntry {
  return { item, session, files: ["/u/.picket/env/compose.yaml", `/u/.picket/state/env/picket-${item}/compose.picket.yaml`], engine: { name: "docker", program: "docker", prefix: [] }, started: "2026-11-14T10:00:00.000Z" };
}

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
