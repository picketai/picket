---
name: zone-and-root-facts
description: shared/ cannot import src/lib/mods.mts (type imports count); projectRoot resolves to the home folder outside a project and obeys CLAUDE_PROJECT_DIR first (drives in a scratch clone set it); lead-only verb list is pinned in a guard test
metadata:
  type: project
---

Seen 2026-10-23 while designing item 07b (work/20261023-refactor-item-07b-styling-and-uninstall):

- The import-zone test in `test/repo/conventions.test.mjs` lets `shared` import only `shared` and `util`, and its specifier regex catches `import type` too. A shared module that needs mod plugin ids takes them as input; the verbs read `src/lib/mods.mts`.
- `projectRoot()` in `src/lib/shared/paths.mts` walks up to a folder holding `.picket` or `.claude`. The home folder holds `.claude`, so a verb run under the home outside any project gets the home as its root. Any verb that edits "project" settings must refuse the home.
- `projectRoot()` returns `CLAUDE_PROJECT_DIR` before any walk (seen 2026-11-05), so a drive that runs the built CLI under dist/bin inside a scratch clone or project must set `CLAUDE_PROJECT_DIR` to it, or it reads this repository. The ledger is under ignored `.picket/state/`, so a clone carries none; copy `ledger.jsonl` in when the drive needs it.
- `src/lib/hooks/guard/bash/kernel.test.mts` asserts the exact lead-only verb list (comment, uninstall, waive since item 07b, 2026-10-23); adding `leadOnly: true` to a verb in `src/lib/verbs.mts` must update it.

**How to apply:** check these before designing a shared helper, a destructive verb or a new lead-only verb. Related: [[mts-conversion-facts]], [[verify-grep-patterns]].
