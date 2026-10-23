import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verb } from "./index.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { FIXED_NOW, fixedContext } from "#test/context.mts";
import { openItem, withProject } from "#test/project.mts";

const NOW = FIXED_NOW;

function withItem(t: TestContext): { root: string; id: WorkId } {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "fast", title: "Leave probe" });
  return { root, id };
}

function leftRows(root: string, id: WorkId): unknown[] {
  return readFileSync(join(root, "work", id, "left.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

test("leave appends the entry stamped with the context's clock (T-1.3)", async (t) => {
  const { root, id } = withItem(t);
  const outcome = await verb.run({ id, command: "git branch -D old", why: null }, fixedContext(root));
  const entry = { ts: NOW, command: "git branch -D old", why: null };
  assert.deepEqual(outcome, { status: "done", value: entry });
  assert.deepEqual(leftRows(root, id), [entry]);
});

test("leave refuses a command longer than 300 characters, naming the item (T-1.3)", async (t) => {
  const { root, id } = withItem(t);
  const outcome = await verb.run({ id, command: "x".repeat(301), why: null }, fixedContext(root));
  assert.equal(outcome.status, "refused");
  assert.deepEqual(outcome.details, { id });
});

test("leave refuses a done item with its id and status (T-1.3)", async (t) => {
  const { root, id } = withItem(t);
  writeState(root, { ...readState(root, id), status: "done" }, new Date());
  const outcome = await verb.run({ id, command: "git branch -D old", why: null }, fixedContext(root));
  assert.deepEqual(outcome, { status: "refused", message: `${id} is done; only an open or blocked item records what is left`, details: { id, status: "done" } });
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
