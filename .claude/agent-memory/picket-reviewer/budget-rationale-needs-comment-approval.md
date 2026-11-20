---
name: budget-rationale-needs-comment-approval
description: A plan asking for a budget rationale "beside the number" needs a picket comment approval; check work/<id>/comments.jsonl exists
metadata:
  type: project
---

budgets.test.mjs rationale lines are code comments, so guard.comments blocks them unless the user's approval is recorded with `picket comment` (work/<id>/comments.jsonl). A developer block that lists them on its `Comments:` line has only proposed them; the landed test then holds the numbers with no rationale.

**Why:** in 20261120-browser-adapter-for-scenario-steps, D-005 and T-1.8 required the rationale, no comments.jsonl existed, and the budgets landed bare.

**How to apply:** when a criterion mandates a comment, ls work/<id>/comments.jsonl and grep the line before grading it PASS. See [[probe-numeric-caps-to-consumer]].
