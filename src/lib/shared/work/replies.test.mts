import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { appendReply, freshReplies, readReplies } from "./replies.mts";
import { readSnapshot } from "./snapshot.mts";
import { openItem, withProject } from "#test/project.mts";

const NOW = new Date("2026-10-29T10:00:00.000Z");

test("an appended reply reads back with its timestamp", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Replies" });
  appendReply(root, id, { session: "S", action: "resolve_block", phase: 2, reply: "c", fresh: true }, NOW);
  assert.deepEqual(readReplies(root, id), { rows: [{ ts: NOW.toISOString(), session: "S", action: "resolve_block", phase: 2, reply: "c", fresh: true }], skipped: 0 });
});

test("a garbled reply line is skipped, counted and reported by the snapshot", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Replies" });
  appendReply(root, id, { action: "approve_phase", phase: 1, reply: "a" }, NOW);
  appendFileSync(join(root, "work", id, "replies.jsonl"), '{"ts":"2026\n');
  assert.equal(readReplies(root, id).skipped, 1);
  const snap = readSnapshot(root, id);
  assert.deepEqual(snap.replies.map((r) => r.reply), ["a"]);
  assert.deepEqual(snap.warnings, ["replies.jsonl: 1 unreadable line skipped"]);
});

test("freshReplies keeps only the continue-with-a-fresh-developer rows", () => {
  const rows = [
    { ts: "1", action: "resolve_block", phase: 1, reply: "c", fresh: true },
    { ts: "2", action: "approve_phase", phase: 1, reply: "a" },
  ] as const;
  assert.deepEqual(freshReplies([...rows]).map((r) => r.ts), ["1"]);
});
