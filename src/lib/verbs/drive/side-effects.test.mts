import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { restoreSideEffects, treeSnapshot } from "./side-effects.mts";
import { gitRepo } from "#test/git.mts";
import { withProject } from "#test/project.mts";

const read = (root: string, name: string) => readFileSync(join(root, name), "utf8");

test("a changed file whose name holds shell syntax is restored by its real name", (t) => {
  const name = "$(echo hi).txt";
  const root = gitRepo(t, { files: { [name]: "base" }, message: "base" });
  const before = treeSnapshot(root);
  writeFileSync(join(root, name), "changed by the drive");
  const side = restoreSideEffects(root, before, false);
  assert.deepEqual(side.restored, [name]);
  assert.equal(read(root, name), "base");
});

test("restoring [a].txt leaves the user's own change in a.txt alone", (t) => {
  const root = gitRepo(t, { files: { "a.txt": "base a", "[a].txt": "base bracket" }, message: "base" });
  writeFileSync(join(root, "a.txt"), "the user's change");
  const before = treeSnapshot(root);
  writeFileSync(join(root, "[a].txt"), "changed by the drive");
  const side = restoreSideEffects(root, before, false);
  assert.deepEqual(side.restored, ["[a].txt"]);
  assert.equal(read(root, "[a].txt"), "base bracket");
  assert.equal(read(root, "a.txt"), "the user's change");
});

test("outside a repository the snapshot is empty and nothing is restored", (t) => {
  const root = withProject(t, { picket: false });
  assert.deepEqual(treeSnapshot(root), { modified: [], untracked: [] });
  assert.deepEqual(restoreSideEffects(root, treeSnapshot(root), false), { dirtied: [], created: [], restored: [], removed: [] });
});
