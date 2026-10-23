---
name: probe-append-after-bad-line
description: For any JSONL "skip unreadable lines" fix, drive one append after a truncated last line and read the file bytes
metadata:
  type: feedback
---

When a change makes a JSONL reader skip unreadable lines, also drive a write after a truncated last line with no trailing newline. Then inspect the bytes with `cat -A`.

**Why:** on 2026-10-23 (item 04a, B4), the reader skipped the bad line correctly. But `appendJsonl` wrote straight onto `{"ts":"2026`, so the next verdict was joined to the broken line and lost silently. The warning still counted 1 line. No test caught it.

**How to apply:** drive the CLI in the scratchpad (`node dist/bin/picket.mjs ... --root <scratch>`). Use a fresh `mkdir` folder name, because `rm` is blocked by guard.bash. Related: [[dist-on-disk-can-be-stale]].
