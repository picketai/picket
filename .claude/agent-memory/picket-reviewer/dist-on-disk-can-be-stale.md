---
name: dist-on-disk-can-be-stale
description: Since refactor item 01 (2026-10-22) dist/ is generated; never trust dist on disk as evidence, build in memory with esbuild write:false
metadata:
  type: feedback
---

Do not grade build output from the `dist/` on disk. Import the option builders from `scripts/build.mjs` in `node --input-type=module -e` and call esbuild with `write: false`; this writes nothing and shows what the current source builds to.

**Why:** on the 2026-10-23 cumulative review of 20261022-refactor-item-01-layout-and-build, the `dist/` on disk was a leftover mutant build (unbundled hooks) from `picket mutate`, while the source bundled correctly. The same check found a Major finding (mutate did not rebuild after restoring).

**How to apply:** for any change to `scripts/build.mjs`, `src/lib/hooks.mts` or the bundling, build in memory and compare with disk. When a path moves, also grep for the bare word (e.g. ` core `), not only the folder name followed by a slash, because `bench/run.mjs` had a bare `core` in a git pathspec. Related: [[review-summary-drops-claude-paths]], [[probe-guards-directly]].
