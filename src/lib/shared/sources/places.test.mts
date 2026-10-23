import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { candidates, contentHash, listWorktrees, localBranches, places } from "./places.mts";
import type { ReachableSource } from "./source.mts";
import { gitAt } from "#test/git.mts";
import { tempSource } from "#test/source.mts";

const reachable = (source: { name: string; root: string }) => source as ReachableSource;

test("listWorktrees and localBranches see the main and linked worktree and the unchecked-out branch", (t) => {
  const { main, source } = tempSource(t);
  const trees = listWorktrees(main);
  assert.deepEqual(trees.map((tree) => [tree.branch, tree.main]), [["main", true], ["feat-x", false]]);
  assert.deepEqual(localBranches(main).find((b) => b.branch === "old")?.checked_out, false);
  assert.deepEqual(candidates(reachable(source), "docs/pricing.md", places(main)).map((c) => c.label), ["main", "feat-x", "old"]);
});

test("the content hash ignores CRLF against LF", () => {
  assert.equal(contentHash(Buffer.from("a\r\nb\r\n")), contentHash(Buffer.from("a\nb\n")));
  assert.notEqual(contentHash(Buffer.from("a\n")), contentHash(Buffer.from("b\n")));
});

test("a working-copy edit is a candidate with its own hash and dirty: true", (t) => {
  const { feat, source } = tempSource(t);
  writeFileSync(join(feat, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 12.\n");
  const [main, featCandidate, old] = candidates(reachable(source), "docs/pricing.md", places(source.root));
  assert.equal(main.sha256, old.sha256);
  assert.notEqual(featCandidate.sha256, main.sha256);
  assert.deepEqual([main.dirty, featCandidate.dirty], [false, true]);
  assert.equal(featCandidate.commit, gitAt(feat)("rev-parse", "HEAD"), "a dirty copy records the worktree's HEAD");
});
