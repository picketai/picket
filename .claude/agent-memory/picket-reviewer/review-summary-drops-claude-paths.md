---
name: review-summary-drops-claude-paths
description: picket summary omits .claude/, work/, .picket/ and artifacts/ paths, so changed_files misses settings, rule and agent-memory edits in this repo
metadata:
  type: project
---

Since refactor item 01 the product lives in `src/`, but `picket summary` still drops every path under `.claude/`, `work/`, `.picket/` and `artifacts/` by design (`isNonProduct` in `src/lib/shared/git.mts`), so this repo's settings, rule and agent-memory edits never reach `changed_files`.

**Why:** the lead flagged it on the 2026-10-02 cumulative review of 20261002-near-zero-comments-ask-before-adding-one; the summary listed 6 files while the range had 35.

**How to apply:** for work items in this repo, review the full `git diff --stat <base> HEAD` range, not only `changed_files`; treat `.claude/**` files as in range.
