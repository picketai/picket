---
name: lead-only-verbs-denied-to-reviewer
description: guard.bash denies picket uninstall (and waive, comment) to the reviewer even via node dist/bin/picket.mjs in a scratch folder; verify those from code and unit tests
metadata:
  type: feedback
---

`picket uninstall`, `waive` and `comment` are lead-only: guard.bash denies them to the reviewer in every form, including `node dist/bin/picket.mjs uninstall --dry-run --root <scratch>`. `rm -rf` of a scratch folder is denied too, so make a fresh scratch folder name instead of cleaning one.

**Why:** item 08b's lead asked to drive the CLI examples; the uninstall dry run was denied with "it is the user's to run".

**How to apply:** when a doc review needs uninstall behaviour, read `src/lib/verbs/uninstall/` and its tests, drive `init --no-install` in a new scratch folder, and say in the report that the uninstall drive was left to the user. A closer drive that works (2026-11-12): a scratchpad `.mts` probe importing `src/lib/verbs/uninstall/index.mts` `verb`, `parseArgs` from `src/lib/util/args.mts` and `edgeContext` from `src/lib/shared/context.mts`, then `verb.render((await verb.run(verb.parse(parseArgs(["--dry-run"])), edgeContext(root))).value)`, run with `HOME=<scratch>` and `node --experimental-strip-types`. `chmod` is denied too, so a fake `claude` on PATH cannot be made executable; rely on the unit test's recording runner. See [[probe-guards-directly]].
