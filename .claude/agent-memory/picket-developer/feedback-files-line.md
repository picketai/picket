---
name: files-line-lists-every-staged-path
description: The block's Files line must name every staged path; "+k more" drops files from the phase commit
metadata:
  type: feedback
---

List every staged file explicitly on the developer block's `Files:` line, never folded into `(+k more)`.

**Why:** `picket route --verdict approved` commits only the phase's plan paths plus the files the block lists. On 2026-10-18 a file outside the touch set (`src/skills/explaining/steps/10-gather.md`) was folded into "+6 more", stayed staged, and the lead had to commit it separately (b6abd23).

The same holds for moves: name both halves of a rename (old path and new path). On 2026-10-23 (item 07a phase 1) only the new halves were listed, and 14 old-path deletions stayed staged for the lead to commit (2b23af5).

**How to apply:** Before emitting a block, compare `git diff --cached --name-status` with the Files line; any path not in the phase's frontmatter `files`, including the old side of each `R` line, must be named.
