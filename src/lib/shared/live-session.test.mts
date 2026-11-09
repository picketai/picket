import { test } from "node:test";
import assert from "node:assert/strict";
import { isProjectSession } from "./live-session.mts";

test("a session in the root, a root worktree or a nested repo's worktree belongs to the project (T-2.1)", () => {
  for (const cwd of ["/p", "/p/", "/p/.worktrees/fix-a", "/p/src/Orders/.worktrees/fix-a"]) {
    assert.equal(isProjectSession(cwd, "/p"), true, cwd);
  }
});

test("a Windows root matches a worktree written with forward slashes (T-2.1)", () => {
  assert.equal(isProjectSession("D:/repo/.worktrees/fix-a", "D:\\repo"), true);
});

test("a subfolder, the bare worktrees folder, a folder inside a worktree, a dotdot path and other folders do not (T-2.1)", () => {
  for (const cwd of ["/p/src", "/p/.worktrees", "/p/.worktrees/fix-a/src", "/p/src/../.worktrees/fix-a", "/p2", "/q"]) {
    assert.equal(isProjectSession(cwd, "/p"), false, cwd);
  }
});

test("a cwd that is not a string belongs to no project (T-2.1)", () => {
  assert.equal(isProjectSession(null, "/p"), false);
  assert.equal(isProjectSession(42, "/p"), false);
});
