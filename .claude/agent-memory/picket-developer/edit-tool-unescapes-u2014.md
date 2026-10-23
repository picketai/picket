---
name: edit-tool-unescapes-u2014
description: Edit and Write sometimes turn a typed `—` escape into the literal em dash; `\u{2014}` with the u flag survives
metadata:
  type: feedback
---

Edit and Write can write a literal U+2014 where `—` was typed (seen in `src/lib/shared/work/artifact.mts`, 2026-10-23; the same edit in `threads.mts` kept the escape). Check the bytes with a one-line node print after the edit. `\u{2014}` in a regex with the `u` flag survived.

**Why:** the dash checks (item 08a, D-003 and D-007) fail on the literal, and the file looks right in Read output.

**How to apply:** after writing any dash escape, confirm it with `JSON.stringify` of the line; switch to `\u{...}` plus `u` when it turns literal. Related: [[scans-read-agent-memory]].
