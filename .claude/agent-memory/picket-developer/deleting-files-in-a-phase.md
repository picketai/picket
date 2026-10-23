---
name: deleting-files-in-a-phase
description: How a developer deletes a source file a phase removes; guard.bash denies rm and git rm inside compound commands
metadata:
  type: feedback
---

When a phase deletes a file (a `.mjs` moved into `.mts` modules), run `git rm` alone, marked: `PICKET_ESCALATE="<phase and criterion that delete it>" git rm -q <path>`. A plain `rm`, or `git rm` chained with other commands (a leading `cd <repo> &&` counts; use `git -C <repo> rm` instead), is denied. Then stage without the deleted path: `git add -A -- <path>` on a path already removed from the index fails, and `2>/dev/null` hides that failure.

**Why:** item 04c phases 3 to 6 each deleted a file; the escalated form ran each time, the unmarked compound form was denied.

**How to apply:** name the deleted path on the block's Files line with "(deleted)" and say in the block that it was an escalated delete. See [[feedback-files-line]].
