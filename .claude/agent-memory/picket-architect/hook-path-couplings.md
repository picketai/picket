---
name: hook-path-couplings
description: Tests that go silently vacuous when hook files move (budget skip on a bundle path, extensions guard regex), and why moving built hook bundles breaks the running session's guards
metadata:
  type: reference
---

Read 2026-10-23 while designing work/20261023-refactor-item-05-hooks:

- `test/budgets.test.mjs` skips the hook cold-start test unless the route.verdict bundle exists under the built dist hooks folder by its exact file name, so renaming bundles turns the 200 ms budget off without a failure.
- `test/kernel/extensions.test.mjs` (lines 121 to 125) picks guard start files with `^guard\..+\.mjs$` in `src/lib/hooks`; once guards move into folders the list is empty and the test still passes.
- `test/kernel/kernel-sources.mjs` listed the old hook shells folder in `KERNEL_DIRS` and called `readdirSync` on it, so deleting that folder threw; item 05 phase 5 removed the entry.
- `test/kernel/conventions.test.mjs` line 209 asserts the scan list contains the route.verdict handler by its exact path.
- The process-read scan in `test/kernel/conventions.test.mjs` bites only `.mts` files, so converting a hook to `.mts` forces its `process.env`, `new Date(`, `homedir(` and `process.cwd(` reads through a context.

A running Claude Code session keeps the hook command paths it read from the plugin's `hooks.json` at start (whether it rereads mid-session is unverified), and `npm run build` deletes `dist/` whole. Renaming a bundle in `dist/hooks/` therefore leaves the session's guards pointing at a missing file, which fails open, until a restart.

**How to apply:** when a design moves hook files or bundles, list these tests in the touch set and keep bundle paths stable or plan a restart. Related: [[markdown-paths-facts]], [[mts-conversion-facts]], [[guard-log-replay]].
