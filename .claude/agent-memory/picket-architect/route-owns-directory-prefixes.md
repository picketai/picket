---
name: route-owns-directory-prefixes
description: picket route commits a phase's plan paths by exact match or, for an entry ending in a slash, by prefix; a directory in files or the touch set covers deletions and many new files
metadata:
  type: reference
---

`listedPathMatcher` in `src/lib/shared/git.mts` matches a listed entry that ends with `/` as a prefix and any other entry exactly (read 2026-10-24, item 09 design). `commitPhase` in `src/lib/verbs/route/commit.mts` builds it from the frontmatter `files` and the `**Touch set:**` paths, so `bench/results/` in a phase owns every staged deletion under it, and `.claude/agent-memory/` owns dozens of untracked memories without listing each. `picket verify` checks `files` with `existsSync`, which a directory passes.

**How to apply:** for a phase that deletes many files or commits a folder of new files, list the folder with a trailing slash instead of each path. Related: [[verify-grep-patterns]], [[record-edits-ride-phase-commits]].
