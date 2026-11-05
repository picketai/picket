---
name: block-heading-names-the-id
description: The developer block heading must read "## Phase N of <work id>: <title>"; the route hook takes the text after "of" as the item id
metadata:
  type: feedback
---

The block heading is `## Phase <n> of <work id>: <phase title>`, never `## Phase 1 of 6:`. The SubagentStop hook reads the token after "of" as the work item id, so a phase count there leaves the verdict unapplied ("6" is not a work item id).

**Why:** phase 1 of 20261102-session-list-merges-into-picket-status-design was not routed until the heading was fixed and the block re-sent.

**How to apply:** every block, every phase. Also: `Red:` takes `pinned: <test>` / `<test> failed: <line>` / `n/a: <reason>`, and `Root cause:` takes `none` or `<X> because <Y>`; guard.block rejects free text there.
