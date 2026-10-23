import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { canonicalPath, sourceRoots, underSource } from "./protection.mts";
import { listWorktrees } from "./places.mts";
import { gitAt } from "#test/git.mts";
import { withProject } from "#test/project.mts";
import { tempProject, tempSource } from "#test/source.mts";

const PLATFORM = process.platform;

test("sourceRoots lists the same worktrees as git worktree list, also from a linked worktree (T-6.6)", (t) => {
  const { base, main, feat } = tempSource(t);
  const second = join(base, "analysis-second");
  gitAt(main)("worktree", "add", "-q", "-b", "feat-y", second);
  const root = tempProject(t);
  const expected = listWorktrees(main).map((w) => canonicalPath(w.path, PLATFORM)).sort();
  assert.equal(expected.length, 3);
  const fromFs = (sourceRoot: string) => sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: sourceRoot }, PLATFORM)[0].paths.slice().sort();
  assert.deepEqual(fromFs(main), expected);
  assert.deepEqual(fromFs(feat), expected, "a root that is itself a linked worktree still finds the others");
  assert.equal(underSource(join(second, "docs", "new.md"), sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: main }, PLATFORM), PLATFORM), "analysis");
  assert.equal(underSource(join(root, "a.md"), sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: main }, PLATFORM), PLATFORM), null);
  assert.deepEqual(sourceRoots(root, {}, PLATFORM), [], "no root, nothing protected");
  assert.deepEqual(fromFs(join(main, "docs")), expected, "a subfolder root protects the whole repository and its worktrees");
});

test("canonicalPath keeps the case on linux and lowercases it on win32", (t) => {
  const dir = withProject(t, { picket: false });
  const folder = join(dir, "Docs");
  mkdirSync(folder);
  const linux = canonicalPath(folder, "linux");
  assert.match(linux, /\/Docs$/);
  assert.equal(canonicalPath(folder, "win32"), linux.toLowerCase());
});
