---
name: node22-local-runs-on-windows
description: npx node@22 on this Windows machine fails 2 CLI tests for environment reasons (EBUSY temp dir, npx node placeholder in PATH); not type stripping
metadata:
  type: project
---

Running `npx -y node@22.23.4 --test "test/cli/**/*.test.mjs" "test/hooks/**/*.test.mjs"` here (2026-10-23) gave 210/212. The two failures are machine artifacts: `test/cli/drive.test.mjs` timeout test hits EBUSY on temp-dir cleanup (orphaned grandchild holds it; Node 24 passes), and `test/cli/lane-check.test.mjs` heredoc runs the npx node placeholder script from PATH.

**Why:** OQ-002 of item 06 asked whether Node 22 strips types; it does. CI's `build-on-22` runs on ubuntu, where neither cause applies.

**How to apply:** report these two as Windows-only when a phase drives Node 22 locally; do not chase them as regressions. See [[new-files-pass-check-then-fail]] for other local-check quirks.
