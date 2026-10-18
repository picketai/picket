---
name: state-folder-facts
description: .picket/state/ is gitignored (git status criteria on it are vacuous); statusline CLI tests spawn with fixture cwd "." so any status line writer lands in this repo unless CLAUDE_PROJECT_DIR points at a temp root
metadata:
  type: reference
---

`.picket/state/` is listed in `.gitignore` (line 29, checked 2026-10-18), so a criterion like "`git status` shows no file under it" always passes. Check the file's existence instead.

`test/kernel/statusline.test.mjs` spawns `picket statusline` with `test/kernel/statusline-input.json`, whose `cwd` is `"."`. A status line change that writes state resolves its root to this repository unless the test sets `CLAUDE_PROJECT_DIR` to a temp folder.

**How to apply:** when a phase adds a writer under `.picket/state/` or to the status line, add a temp-root step for the existing spawn tests and write existence-based criteria. Related: [[statusline-contract]], [[verify-grep-patterns]].
