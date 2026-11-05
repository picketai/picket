---
name: recompute-summary-totals-by-numstat
description: Recompute a plan's changed-file and line totals for an item from git show --numstat, dropping the bookkeeping prefixes, without running picket summary
metadata:
  type: reference
---

A plan or drive that claims "N changed_files, +A/-R" for an item's commits can be recomputed without running `picket summary` (which writes `work/<id>/summary.json`):

`git show --numstat --format= <sha1> <sha2> ... | grep -v -E "\s(work/|\.claude/|\.picket/)" | awk '{a+=$1;r+=$2;f[$3]=1} END {print length(f), a, r}'`

The three prefixes are `BOOKKEEPING_PREFIXES` in `src/lib/shared/paths.mts`; check it still lists only those before trusting the filter. Matched the kernel's figure exactly (21 files, +492/-54) on 2026-11-05.

Related: [[review-summary-drops-claude-paths]], [[changed-files-includes-foreign-staged]].
