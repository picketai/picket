import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeArgs, stopTree } from "../lib/claude.mjs";

test("settingSources passes --setting-sources with its value, and is absent when unset", () => {
  const args = claudeArgs({ settingSources: "project,local" });
  assert.deepEqual(args.slice(args.indexOf("--setting-sources"), args.indexOf("--setting-sources") + 2), ["--setting-sources", "project,local"]);
  assert.equal(claudeArgs({}).includes("--setting-sources"), false);
});

test("settings passes --settings with its file, and is absent when unset (T-2.6)", () => {
  const args = claudeArgs({ settings: "s.json" });
  assert.deepEqual(args.slice(args.indexOf("--settings"), args.indexOf("--settings") + 2), ["--settings", "s.json"]);
  assert.equal(claudeArgs({}).includes("--settings"), false);
});

test("a positive maxBudgetUsd passes --max-budget-usd with its value", () => {
  const args = claudeArgs({ maxBudgetUsd: 2 });
  assert.deepEqual(args.slice(args.indexOf("--max-budget-usd"), args.indexOf("--max-budget-usd") + 2), ["--max-budget-usd", "2"]);
});

test("an absent maxBudgetUsd adds no --max-budget-usd", () => {
  assert.equal(claudeArgs({}).includes("--max-budget-usd"), false);
});

test("a null maxBudgetUsd throws instead of sending an uncapped call", () => {
  assert.throws(() => claudeArgs({ maxBudgetUsd: null }), /^Error: --max-budget-usd needs a positive number of dollars, got null$/);
});

function fakeChild() {
  const child = { pid: 4242, killed: 0, kill: () => child.killed++ };
  return child;
}

test("on Windows a timeout stops the wrapper's whole process tree, not the wrapper alone", () => {
  const child = fakeChild();
  const calls = [];
  stopTree(child, { platform: "win32", exec: (command, args) => calls.push([command, ...args]) });
  assert.deepEqual(calls, [["taskkill", "/PID", "4242", "/T", "/F"]]);
  assert.equal(child.killed, 0);
});

test("when taskkill fails, the timeout still kills the child", () => {
  const child = fakeChild();
  stopTree(child, { platform: "win32", exec: () => { throw new Error("access denied"); } });
  assert.equal(child.killed, 1);
});

test("off Windows the timeout kills the child directly", () => {
  const child = fakeChild();
  const calls = [];
  stopTree(child, { platform: "linux", exec: (command, args) => calls.push([command, ...args]) });
  assert.deepEqual(calls, []);
  assert.equal(child.killed, 1);
});
