import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentItem, listOpenWork, listWork, newId, readState, writeState, type Status, type WorkState } from "./state.mts";
import { appendVerdict } from "./verdict-log.mts";
import { workId } from "./files.mts";
import { openItem, withProject } from "#test/project.mts";

const OLDER = workId("20261022-zeta-older");
const NEWER = workId("20261022-alpha-newer");
const at = (time: string) => new Date(`2026-10-22T${time}:00.000Z`);

type Item = { id: string; time: string; session?: string };

function withItems(t: TestContext, items: Item[]): string {
  const root = withProject(t);
  for (const { id, time, session } of items) openItem(root, { lane: "fast", title: id, id, session }, at(time));
  return root;
}

const current = (root: string, session: string | null = null) => currentItem(root, { session })?.id ?? null;

test("the most recently updated open item is current, not the last id", (t) => {
  const root = withItems(t, [{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }]);
  assert.equal(current(root), NEWER);
});

test("a later verdict makes an older item current", (t) => {
  const root = withItems(t, [{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }]);
  appendVerdict(root, OLDER, { agent: "reviewer", verdict: "APPROVED", phase: 1, scope: null, through: null }, at("16:00"));
  assert.equal(current(root), OLDER);
});

test("an item stamped with this session is current for that session only", (t) => {
  const root = withItems(t, [{ id: OLDER, time: "08:00", session: "s1" }, { id: NEWER, time: "15:00" }]);
  assert.equal(current(root, "s1"), OLDER);
  assert.equal(current(root, "s2"), NEWER);
  assert.equal(current(root), NEWER);
});

test("a newer blocked item is current", (t) => {
  const root = withItems(t, [{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }]);
  writeState(root, { ...readState(root, OLDER), status: "blocked", blocked_reason: "waiting" }, at("17:00"));
  assert.equal(current(root), OLDER);
});

test("ties go to the larger id", (t) => {
  const root = withItems(t, [{ id: NEWER, time: "08:00" }, { id: OLDER, time: "08:00" }]);
  assert.equal(current(root), OLDER);
});

function hostRoot(t: TestContext): string {
  return withProject(t, { host: true, picket: false });
}

test("newId is date plus slug", () => {
  assert.equal(newId("Add GET /invoices/:id/summary!", new Date("2026-09-07T10:00:00Z")), "20260907-add-get-invoices-id-summary");
});

test("create, read, list", (t) => {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "order", title: "Summary endpoint" }, new Date("2026-09-07T10:00:00Z"));
  assert.equal(s.id, "20260907-summary-endpoint");
  assert.equal(readState(root, s.id).status, "open");
  assert.deepEqual(listWork(root), [s.id]);
  assert.throws(() => openItem(root, { lane: "order", title: "Summary endpoint" }, new Date("2026-09-07T10:00:00Z")), /already exists/);
  assert.throws(() => openItem(root, { lane: "huge", title: "x" }), /lane must be/);
});

test("listOpenWork keeps open and blocked ids in listWork order (T-4.1)", (t) => {
  const root = hostRoot(t);
  const now = new Date("2026-10-06T10:00:00Z");
  const withStatus = (title: string, status: Status) => {
    const s = openItem(root, { lane: "order", title }, now);
    if (status !== "open") writeState(root, { ...readState(root, s.id), status, ...(status === "blocked" ? { blocked_reason: "waiting" } : {}) }, new Date());
    return s.id;
  };
  const abandoned = withStatus("A abandoned", "abandoned");
  const blocked = withStatus("B blocked", "blocked");
  const done = withStatus("C done", "done");
  const open = withStatus("D open", "open");
  assert.deepEqual(listWork(root), [abandoned, blocked, done, open]);
  assert.deepEqual(listOpenWork(root), [blocked, open]);
});

test("createWork writes a non-empty session and ignores an empty one", (t) => {
  const root = hostRoot(t);
  assert.equal(readState(root, openItem(root, { lane: "fast", title: "A", session: "s1" }).id).session, "s1");
  assert.equal(readState(root, openItem(root, { lane: "fast", title: "B", session: "" }).id).session, undefined);
});

test("state validation refuses unknown fields and blocked without reason", (t) => {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "fast", title: "Fix" });
  assert.throws(() => writeState(root, { ...s, status: "blocked" }, new Date()), /blocked without blocked_reason/);
  assert.throws(() => writeState(root, { ...s, bogus: 1 } as WorkState, new Date()), /unknown field bogus/);
});

test("listWork skips a folder whose name is not a work item id", (t) => {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "fast", title: "Real" });
  mkdirSync(join(root, "work", "Bad_Name"));
  writeFileSync(join(root, "work", "Bad_Name", "state.yaml"), readFileSync(join(root, "work", s.id, "state.yaml")));
  assert.deepEqual(listWork(root), [s.id]);
});

test("a root with only done items has no current item", (t) => {
  const root = withItems(t, [{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }]);
  for (const id of [OLDER, NEWER]) writeState(root, { ...readState(root, id), status: "done" }, at("18:00"));
  assert.equal(currentItem(root, { session: null }), null);
});
