import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentItem, readState, writeState } from "../../dist/lib/shared/work/state.mjs";
import { appendVerdict } from "../../dist/lib/shared/work/verdict-log.mjs";
import { createWork } from "./work-fixture.mjs";

const OLDER = "20261022-zeta-older";
const NEWER = "20261022-alpha-newer";
const at = (time) => new Date(`2026-10-22T${time}:00.000Z`);

function withItems(items, body) {
  const root = mkdtempSync(join(tmpdir(), "picket-current-"));
  try {
    for (const { id, time, session } of items) createWork({ lane: "fast", title: id, id, now: at(time), session, root });
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const current = (root, session = null) => currentItem(root, { session })?.id ?? null;

test("the most recently updated open item is current, not the last id", () => {
  withItems([{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }], (root) => {
    assert.equal(current(root), NEWER);
  });
});

test("a later verdict makes an older item current", () => {
  withItems([{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }], (root) => {
    appendVerdict(root, OLDER, { agent: "reviewer", verdict: "APPROVED", phase: 1, scope: null, through: null }, at("16:00"));
    assert.equal(current(root), OLDER);
  });
});

test("an item stamped with this session is current for that session only", () => {
  withItems([{ id: OLDER, time: "08:00", session: "s1" }, { id: NEWER, time: "15:00" }], (root) => {
    assert.equal(current(root, "s1"), OLDER);
    assert.equal(current(root, "s2"), NEWER);
    assert.equal(current(root), NEWER);
  });
});

test("a newer blocked item is current", () => {
  withItems([{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }], (root) => {
    writeState(root, { ...readState(root, OLDER), status: "blocked", blocked_reason: "waiting" }, at("17:00"));
    assert.equal(current(root), OLDER);
  });
});

test("ties go to the larger id", () => {
  withItems([{ id: NEWER, time: "08:00" }, { id: OLDER, time: "08:00" }], (root) => {
    assert.equal(current(root), OLDER);
  });
});

test("a root with only done items has no current item", () => {
  withItems([{ id: OLDER, time: "08:00" }, { id: NEWER, time: "15:00" }], (root) => {
    for (const id of [OLDER, NEWER]) writeState(root, { ...readState(root, id), status: "done" }, at("18:00"));
    assert.equal(currentItem(root, { session: null }), null);
  });
});
