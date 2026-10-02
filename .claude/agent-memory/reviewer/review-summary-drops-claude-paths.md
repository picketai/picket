---
name: review-summary-drops-claude-paths
description: In the AISpec harness repo, harness review-summary omits .claude/ paths, so changed_files misses the actual product of harness changes
metadata:
  type: project
---

`harness review-summary` drops every `.claude/` path by design, but in this repo (the harness itself) the change usually lives under `.claude/` (lib, hooks, agents, rules, skills).

**Why:** the lead flagged it on the 2026-10-02 cumulative review of 20261002-near-zero-comments-ask-before-adding-one; the summary listed 6 files while the range had 35.

**How to apply:** for work items in this repo, review the full `git diff --stat <base> HEAD` range, not only `changed_files`; treat `.claude/**` files as in range.
