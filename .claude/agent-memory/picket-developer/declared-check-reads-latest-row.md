---
name: declared-check-reads-latest-row
description: picket verify grades a declared run check by the latest drive row with the same command, so a later failing drive of that command overrides an earlier pass
metadata:
  type: project
---

`picket verify` matches a declared `drive:` run check to the latest `picket drive --run` row whose command is exactly the declared command, whatever `--env` was passed. Seen 2026-11-14: driving `env check` with a bad PICKET_ENGINE after the passing drive turned check:T-1.6 into "declared exit 0, ran exit 2".

**Why:** declared-checks.mts `runResult` takes `latest(runs, row.run === check.command)`; env values are not part of the match.
**How to apply:** drive negative cases of a declared command first, or drive the passing case again last, before `picket verify`. See [[declared-run-checks-need-picket-drive]].
