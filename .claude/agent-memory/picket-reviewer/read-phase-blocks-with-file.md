---
name: read-phase-blocks-with-file
description: a shell loop over work/<id>/phases/*.block.md (awk ... $f) is denied by guard.bash as a kernel-record write; read blocks with the REPL file() reader
metadata:
  type: reference
---

guard.bash reads an unexpanded `$f` in `for f in *.block.md; do awk ... $f; done` under work/<id>/phases/ as a write to a kernel record and denies the whole Bash call. Plain `grep -H` over the same files passes. To pull a field such as `Decisions:` out of every phase block, read each file with the REPL's `file(path).text()` and slice it in JavaScript. Related: [[bash-writes-to-approval-state]].
