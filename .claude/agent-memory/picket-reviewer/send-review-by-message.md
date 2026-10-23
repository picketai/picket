---
name: send-review-by-message
description: As a team agent, the final review text may not reach the lead; also send the full review with SendMessage
metadata:
  type: feedback
---

Send the full review to `team-lead` with SendMessage as well as ending the turn with it.

**Why:** on 2026-10-23 (cumulative review of 20261023-refactor-item-05-hooks) the lead got only the idle note, not the review text, and had to ask for the Findings, Questions and Checked lines again.

**How to apply:** in team sessions, after writing the review, send it to the lead in one message whose first line states the verdict. Related: [[probe-guards-directly]].
