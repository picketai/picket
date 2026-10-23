---
name: route-commit-keeps-subject-only
description: picket route commits only the first line of a block's Commit field; a plan that asks for a commit body is met in the block, not in git log
metadata:
  type: project
---

`picket route … --verdict approved` commits with the block's `Commit:` field as parsed by `proposedCommit` (src/lib/shared/work/block.mts), which keeps one line. A multi-line body the developer wrote under `Commit:` (item 04b phase 6: the dropped-test mapping) never reaches `git log`; it survives only in `work/<id>/phases/N.block.md`, which the phase commit includes.

**Why:** item 04b's plan and draft R-2 said "the commit message names each dropped test"; git log showed the subject alone, observed 2026-10-23.

**How to apply:** when a criterion asks for content in a commit message, read both `git log -1 --format=%B <sha>` and the phase block before grading; report the gap as Minor, citing the block, since the text is kept in history there.
