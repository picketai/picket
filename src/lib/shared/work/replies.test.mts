import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { appendReply, freshReplies, readReplies, rowsSinceLastReply } from "./replies.mts";
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

const rowsAt = (...stamps: string[]) => stamps.map((ts, i) => ({ ts, n: i + 1 }));
const replyAt = (ts: string) => ({ ts, action: "resolve_block", phase: null, reply: "c" }) as const;

test("rowsSinceLastReply keeps every row when there is no reply", () => {
  const rows = rowsAt("2026-11-19T18:30:10.691Z", "2026-11-19T18:32:42.543Z");
  assert.deepEqual(rowsSinceLastReply(rows, []), [{ ts: "2026-11-19T18:30:10.691Z", n: 1 }, { ts: "2026-11-19T18:32:42.543Z", n: 2 }]);
});

test("rowsSinceLastReply keeps only the rows later than the newest reply", () => {
  const rows = rowsAt("2026-11-19T18:30:10.691Z", "2026-11-19T18:32:42.543Z", "2026-11-19T19:02:08.034Z");
  const replies = [replyAt("2026-11-19T18:58:10.853Z"), replyAt("2026-11-19T18:30:11.176Z")];
  assert.deepEqual(rowsSinceLastReply(rows, replies), [{ ts: "2026-11-19T19:02:08.034Z", n: 3 }]);
});

test("rowsSinceLastReply keeps nothing when the newest reply is later than every row", () => {
  const rows = rowsAt("2026-11-19T18:30:10.691Z", "2026-11-19T18:32:42.543Z");
  assert.deepEqual(rowsSinceLastReply(rows, [replyAt("2026-11-19T18:58:10.853Z")]), []);
});
