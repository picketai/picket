---
name: generated-tracked-files
description: npm test builds before the product tests, so a test comparing a build-written tracked file with its generator is vacuous; compare the git index blob
metadata:
  type: project
---

`scripts/test.mjs` runs the steps unit, build, product, timing, mods in that order (read 2026-10-24). `scripts/build.mjs` already rewrites the tracked `.claude-plugin/marketplace.json`, and item 08b (work/20261023-refactor-item-08b-docs/design.md, D-003) makes it write the tracked docs/reference/cli.md, hooks.md and mods.md too. A product test that compares such a file on disk with the generator's output can therefore never fail inside `npm test`.

**Why:** the build step overwrites the working file before the product step reads it, so only git's copy shows a forgotten commit.

**How to apply:** for any file the build writes and git tracks, check staleness against `git show :<path>` (the index; equals HEAD in a CI checkout) with CRLF read as LF, and tell the developer to stage the regenerated file before running `npm test`. Related: [[verify-grep-patterns]], [[markdown-paths-facts]].
