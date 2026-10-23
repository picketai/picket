import { test } from "node:test";
import assert from "node:assert/strict";
import { DESTRUCTIVE, destructiveCommand } from "./destructive.mts";

const ROOTS = ["sudo", "rm", "rmdir", "del", "erase", "Remove-Item", "ri", "dd", "mkfs", "shutdown", "reboot", "kill", "killall", "taskkill", "chmod", "chown", "chgrp"];
const GIT = ["git push", "git reset", "git rebase", "git checkout", "git restore", "git clean", "git stash drop", "git branch -d", "git branch -D", "git worktree remove"];

test("destructiveCommand names the matched words without the separator", () => {
  assert.equal(destructiveCommand("npm test && rm -rf x"), "rm");
  assert.equal(destructiveCommand("git push --force"), "git push");
  assert.equal(destructiveCommand("Remove-Item x"), "Remove-Item");
});

test("destructiveCommand is null for a harmless command", () => {
  for (const command of ["npm test", "git status", "echo firmware"]) assert.equal(destructiveCommand(command), null, command);
});

test("every alternative in DESTRUCTIVE is caught, alone and after a separator", () => {
  for (const words of [...ROOTS, ...GIT]) {
    assert.equal(destructiveCommand(`${words} target`), words, words);
    assert.equal(destructiveCommand(`npm test; ${words} target`), words, `after ; ${words}`);
  }
});

test("the sample list covers every alternative in the pattern", () => {
  const group = DESTRUCTIVE.source.match(/\(\?:sudo[^)]*\)/);
  assert.ok(group);
  const alternatives = group[0].slice(3, -1).split("|");
  assert.deepEqual(alternatives.sort(), [...ROOTS].sort());
});
