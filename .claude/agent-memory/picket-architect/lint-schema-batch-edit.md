---
name: lint-schema-batch-edit
description: lint.schema reports "a decision changed but no line was appended to ## Revision log" mid-batch when a REPL edit() batch changes a decision before it appends the log line
metadata:
  type: reference
---

A REPL `edit(path, [[...], ...])` batch reaches the PostToolUse lint.schema hook as separate Edit calls, so a batch that bumps a `### D-###` marker before appending the revision log line gets "a decision changed but no line was appended to ## Revision log" even though the final file is correct (seen 2026-11-20).

**How to apply:** put the revision log edit first in the batch, or confirm by piping a PostToolUse payload into `dist/hooks/lint.schema.mjs` (see [[verdict-hook-drive]]); silent output means the record is clean.
