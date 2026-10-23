import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { restoreSideEffects, treeSnapshot } from "../../dist/lib/verbs/drive/side-effects.mjs";

function repoWith(files) {
  const root = mkdtempSync(join(tmpdir(), "picket-side-effects-"));
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { stdio: "ignore" });
  git("init", "-q");
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return root;
}

const read = (root, name) => readFileSync(join(root, name), "utf8");

test("a changed file whose name holds shell syntax is restored by its real name", () => {
  const name = "$(echo hi).txt";
  const root = repoWith({ [name]: "base" });
  try {
    const before = treeSnapshot(root);
    writeFileSync(join(root, name), "changed by the drive");
    const side = restoreSideEffects(root, before, false);
    assert.deepEqual(side.restored, [name]);
    assert.equal(read(root, name), "base");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("restoring [a].txt leaves the user's own change in a.txt alone", () => {
  const root = repoWith({ "a.txt": "base a", "[a].txt": "base bracket" });
  try {
    writeFileSync(join(root, "a.txt"), "the user's change");
    const before = treeSnapshot(root);
    writeFileSync(join(root, "[a].txt"), "changed by the drive");
    const side = restoreSideEffects(root, before, false);
    assert.deepEqual(side.restored, ["[a].txt"]);
    assert.equal(read(root, "[a].txt"), "base bracket");
    assert.equal(read(root, "a.txt"), "the user's change");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("outside a repository the snapshot is empty and nothing is restored", () => {
  const root = mkdtempSync(join(tmpdir(), "picket-side-effects-"));
  try {
    assert.deepEqual(treeSnapshot(root), { modified: [], untracked: [] });
    assert.deepEqual(restoreSideEffects(root, treeSnapshot(root), false), { dirtied: [], created: [], restored: [], removed: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
