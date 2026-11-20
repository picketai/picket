---
name: drive-wrapped-fallthrough-is-unprompted
description: in this repo a guard.bash "no decision" on picket drive --run text runs with no prompt, because settings allow Bash(picket *)
metadata:
  type: project
---

`.claude/settings.json` allows `Bash(picket *)`, so when guard.bash gives no decision (fall through) on `picket drive --run "<text>"`, the text runs with no permission prompt. A plan risk saying a run-time path "falls through to the prompt" does not hold inside picket-wrapped text.

**Why:** on 2026-11-19 (20261119-agents-cannot-forge-picket-state-by-bash) `picket drive --run "cp /tmp/a .picket/state/data/appr*"`, `cd ~` and `cd -` spellings got no decision at the fix round.
**How to apply:** for any guard change, probe the denied writes again wrapped in `picket drive --run` with a glob, `cd -`, `cd ~` and `$PWD`; see [[probe-guards-from-node-e]].
