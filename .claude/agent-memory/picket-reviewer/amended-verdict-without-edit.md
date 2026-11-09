---
name: amended-verdict-without-edit
description: an architect AMENDED verdict can be recorded with no edit to design.md; on a re-review check the criterion text, the revision log and the file mtime
metadata:
  type: project
---

On 2026-11-09 (item 20261109-fix-budget-schema-session-admit-findings) the kernel recorded the architect's `AMENDED` verdict, but design.md was left unchanged: T-2.4 was the same and `## Revision log` was empty. Nothing in routing checks that the artifact changed.

**Why:** the re-review would have passed the old wording if it had trusted the AMENDED row in verdicts.jsonl.

**How to apply:** on a re-review after an amendment, grep the amended `T-N.x` or `D-###` in the artifact, read `## Revision log`, and compare `stat -c %y` of the artifact with the review timestamp in verdicts.jsonl (verdicts are UTC, stat prints local time). Related: [[recompute-summary-totals-by-numstat]].
