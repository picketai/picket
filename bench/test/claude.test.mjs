import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeArgs, stopTree } from "../lib/claude.mjs";

test("settingSources passes --setting-sources with its value, and is absent when unset", () => {
  const args = claudeArgs({ settingSources: "project,local" });
  assert.deepEqual(args.slice(args.indexOf("--setting-sources"), args.indexOf("--setting-sources") + 2), ["--setting-sources", "project,local"]);
  assert.equal(claudeArgs({}).includes("--setting-sources"), false);
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
