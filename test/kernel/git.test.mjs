import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { dirtyPaths, head, isRepo } from "../../.claude/lib/git.mjs";

function gitIn(root, ...args) {
  execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { stdio: "ignore" });
}

function writeIn(root, rel, text) {
  const path = join(root, ...rel.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function withModifiedRepo(rel, fn) {
  const root = mkdtempSync(join(tmpdir(), "harness-git-"));
  try {
    gitIn(root, "init", "-q");
    writeIn(root, rel, "one\n");
    gitIn(root, "add", "-A");
    gitIn(root, "commit", "-q", "-m", "init");
    writeIn(root, rel, "two\n");
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("dirtyPaths keeps the first character of a path whose status column starts with a space (T-3.1)", () => {
  withModifiedRepo("src/a.txt", (root) => assert.deepEqual(dirtyPaths(root), ["src/a.txt"]));
});

test("dirtyPaths leaves a modified file under the host folder out (T-3.2)", () => {
  withModifiedRepo(".claude/x.mjs", (root) => assert.deepEqual(dirtyPaths(root), []));
});

test("isRepo and head still read a trimmed answer (T-3.3)", () => {
  withModifiedRepo("src/a.txt", (root) => {
    assert.equal(isRepo(root), true);
    assert.match(head(root), /^[0-9a-f]{7,}$/);
  });
});
