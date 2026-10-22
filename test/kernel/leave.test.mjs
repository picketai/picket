import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verb } from "../../dist/lib/verbs/leave/index.mjs";
import { parseArgs, UsageError } from "../../dist/lib/util/args.mjs";
import { createWork, readState, writeState } from "../../dist/lib/shared/work/work.mjs";

const NOW = "2026-10-23T10:00:00.000Z";

async function withItem(fn) {
  const root = mkdtempSync(join(tmpdir(), "picket-leave-"));
  try {
    mkdirSync(join(root, ".picket"));
    const { id } = createWork({ lane: "fast", title: "Leave probe", root });
    return await fn(root, id);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function contextAt(root) {
  return { root, now: () => new Date(NOW), env: {}, home: root, session: null };
}

function leftRows(root, id) {
  return readFileSync(join(root, "work", id, "left.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

test("leave appends the entry stamped with the context's clock (T-1.3)", async () => {
  await withItem(async (root, id) => {
    const outcome = await verb.run({ id, command: "git branch -D old", why: null }, contextAt(root));
    const entry = { ts: NOW, command: "git branch -D old", why: null };
    assert.deepEqual(outcome, { status: "done", value: entry });
    assert.deepEqual(leftRows(root, id), [entry]);
  });
});

test("leave refuses a command longer than 300 characters, naming the item (T-1.3)", async () => {
  await withItem(async (root, id) => {
    const outcome = await verb.run({ id, command: "x".repeat(301), why: null }, contextAt(root));
    assert.equal(outcome.status, "refused");
    assert.deepEqual(outcome.details, { id });
  });
});

test("leave refuses a done item with its id and status (T-1.3)", async () => {
  await withItem(async (root, id) => {
    writeState({ ...readState(id, root), status: "done" }, root);
    const outcome = await verb.run({ id, command: "git branch -D old", why: null }, contextAt(root));
    assert.deepEqual(outcome, { status: "refused", message: `${id} is done; only an open or blocked item records what is left`, details: { id, status: "done" } });
  });
});

test("leave parses the id, the trimmed command and the reason (T-1.3)", () => {
  const input = verb.parse(parseArgs(["20261023-x", "--command", "  git branch -D old ", "--why", " cleanup "]));
  assert.deepEqual(input, { id: "20261023-x", command: "git branch -D old", why: "cleanup" });
  assert.equal(verb.parse(parseArgs(["20261023-x", "--command", "ls"])).why, null);
});

test("leave's parse throws a UsageError for no id, no command, a blank command and a path as id (T-1.3)", () => {
  for (const argv of [["--command", "ls"], ["20261023-x"], ["20261023-x", "--command", "  "], ["../etc", "--command", "ls"]]) {
    assert.throws(() => verb.parse(parseArgs(argv)), UsageError, argv.join(" "));
  }
});

test("leave renders the entry as the line close prints", () => {
  assert.equal(verb.render({ ts: NOW, command: "git branch -D old", why: "cleanup" }), "left for you: git branch -D old (cleanup)");
  assert.equal(verb.render({ ts: NOW, command: "git branch -D old", why: null }), "left for you: git branch -D old");
});
