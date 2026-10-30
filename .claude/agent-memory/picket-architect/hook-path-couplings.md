---
name: hook-path-couplings
description: Tests that go silently vacuous when hook files move, why moving built hook bundles breaks the running session's guards, and the tests a new hook event must update
metadata:
  type: reference
---

Read 2026-10-23 while designing work/20261023-refactor-item-05-hooks:

- `test/timing/budgets.test.mjs` skips the hook cold-start test unless the route.verdict bundle exists under the built dist hooks folder by its exact file name, so renaming bundles turns the 200 ms budget off without a failure.
- `test/kernel/extensions.test.mjs` picks guard start files from the guard hook folders since item 05; its old `^guard\..+\.mjs$` filter still runs beside that and matches nothing.
- `test/support/kernel-sources.mts` listed the old hook shells folder in `KERNEL_DIRS` and called `readdirSync` on it, so deleting that folder threw; item 05 phase 5 removed the entry.
- `test/repo/conventions.test.mjs` line 259 asserts the scan list contains the route.verdict handler by its exact path.
- The process-read scan in `test/repo/conventions.test.mjs` bites only `.mts` files, so converting a hook to `.mts` forces its `process.env`, `new Date(`, `homedir(` and `process.cwd(` reads through a context.

A running Claude Code session keeps the hook command paths it read from the plugin's `hooks.json` at start (whether it rereads mid-session is unverified), and `npm run build` deletes `dist/` whole. Renaming a bundle in `dist/hooks/` therefore leaves the session's guards pointing at a missing file, which fails open, until a restart.

**How to apply:** when a design moves hook files or bundles, list these tests in the touch set and keep bundle paths stable or plan a restart. Related: [[markdown-paths-facts]], [[mts-conversion-facts]], [[guard-log-replay]].

Adding an event (checked 2026-10-30): `scripts/build.mjs` derives `hooks.json` from `HOOKS`, grouping events by first appearance in that object, so no build edit is needed; but `test/repo/hook-list.test.mjs` pins `EXPECTED_GROUPS` in order and `test/repo/plugin-layout.test.mjs` pins the sorted event list ("the eight events"), and `docs/reference/hooks.md` is build-written and checked against the git index. `hook-spec.mts` needs the event in `Payloads` and `OutputFor`.
