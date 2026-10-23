---
name: claude-dir-edits-via-lead
description: When a plan's touch set names a file under .claude/, send the lead the exact line to change instead of editing it
metadata:
  type: feedback
---

When a phase's touch set names a `.claude/` file (for example `.claude/rules/harness-authoring.md`), do not edit it. Send the lead the exact path, line and new text, and the lead makes and stages the edit. Then list the path on the block's Files line so the route commits it.

**Why:** the developer contract forbids edits under `.claude/`, but plans still name such files. The lead offered this route on 2026-10-23 (item 03, phase 2).

**How to apply:** message the lead early in the phase, not only at the end, so the edit is staged before `picket verify`. See also [[feedback-files-line]].
