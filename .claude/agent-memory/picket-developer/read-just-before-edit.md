---
name: read-just-before-edit
description: guard.scope read-before-edit reads the session transcript, so a Read made in the same REPL call as the edit does not count; Read in an earlier call
metadata:
  type: project
---

`wasRead` (src/lib/shared/transcript/entries.mts) scans the recent transcript for a Read of the path. A REPL call's inner tool uses land in the transcript only after the call ends, so Read-then-edit inside one REPL script is denied ("read <path> with the Read tool before editing it"), even with a pause between them (seen 2026-11-20).

**Why:** cost several denied edit batches in one phase.

**How to apply:** Read every file a step will edit in one REPL call, then edit in the next call. The scan is bounded (RECENT_BYTES), so re-Read files read long ago.
