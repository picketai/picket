---
name: files-line-lists-every-staged-path
description: The block's Files line must name every staged path; "+k more" drops files from the phase commit
metadata:
  type: feedback
---

List every staged file explicitly on the developer block's `Files:` line, never folded into `(+k more)`.

**Why:** `picket route --verdict approved` commits only the phase's plan paths plus the files the block lists. On 2026-10-18 a file outside the touch set (`core/skills/explaining/steps/10-gather.md`) was folded into "+6 more", stayed staged, and the lead had to commit it separately (b6abd23).

**How to apply:** Before emitting a block, compare `git diff --cached --name-only` with the Files line; any path not in the phase's frontmatter `files` must be named.
