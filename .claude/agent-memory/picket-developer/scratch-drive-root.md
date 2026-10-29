---
name: scratch-drive-root
description: picket run in a scratchpad repo resolves its root to the home folder; set CLAUDE_PROJECT_DIR first
metadata:
  type: feedback
---

A scratch drive of `picket open`/`route` or a built hook from the session scratchpad writes work items under the user's home folder (`work/` there), because projectRoot walks up to the first folder holding a picket or host marker folder, and the home folder has the host one.

**Why:** on 2026-10-30 a phase drive created `work/chained-item` in the home folder by accident; cleanup had to be recorded with `picket leave`.

**How to apply:** before any scratch drive, `export CLAUDE_PROJECT_DIR="$S"` and `mkdir -p "$S/.picket"`. See [[new-files-pass-check-then-fail]].
