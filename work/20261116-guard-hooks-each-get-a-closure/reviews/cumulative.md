## Review: 20261116-guard-hooks-each-get-a-closure · cumulative

APPROVED: both blockers from the last review are gone. Writes through a project link that points out of the root are checked again (D-005 r2), and `npm test` passes again because the Claude Code 2.1.326 breakage was fixed on trunk at 271dd9d8.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "This item gives every guard hook that has none its closure test, built with `#test/variants.mts` as C-020 says: `guard.comments`, `guard.silenced`, `guard.block`, the edit target reading in `edit-target.mts`, and the parts of `guard.bash` outside the in-place guard (the judge, the kernel-call rules, the sources rule, the escalation and the PowerShell reading)." | request.md:3 | PASS | ten `*.variants.test.mts` files under src/lib/hooks/guard/; test/repo/closures.test.mjs:33-56 |
| S-2 | "Each closure names its grammar and takes its seeds from the guard's own tables where it has them; a guard over an input grammar no family covers adds the family." | request.md:3 | PASS | `tableRows(` calls in the closures over tables; eight new grammars in test/support/variants.mts |
| S-3 | "every guard hook module under `src/lib/hooks/guard/` has a registry entry and a closure test, and `npm test` fails naming a guard module that has neither." | request.md:5 | PASS | test/repo/closures.test.mjs:113-127 and :173 |
| S-4 | "The limit bullet in `CONTRIBUTING.md` that names a guard missing from the registry is narrowed to what still passes after this change." | request.md:5 | PASS | CONTRIBUTING.md:160 |
| S-5 | "A spelling a new closure finds open at HEAD is closed in this item when the real program or tool accepts it, seeded as C-020 requires." | request.md:7 | PASS | groups B1 to K1 closed; the closure tests pass |
Alignment: PASS (54; the ten "`npm test` passes" rows now pass: I reran `claude plugin validate --strict dist` and it passes, and the summary's mutation ran from a green baseline with outcome `killed`)
Decisions: HONOURED (D-005 r2: /mnt/work/development/github/picket/src/lib/hooks/guard/edit-target.mts:32-35 uses the event path's `rel` and `outside` only when the real path leaves the root and the event path does not; pinned at /mnt/work/development/github/picket/src/lib/hooks/guard/edit-target.test.mts:44)
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] /mnt/work/development/github/picket/src/lib/shared/silenced.mjs:30: in a JS or TS test file, a line that starts with `.skip(` is denied as a skipped test, even in a database query chain such as mongoose's `.skip(20)`. Phase 6 S1 and T-6.2 asked for this reading, so the note is for the architect.
Classes: none
Checked: I reran my earlier probe. With `shared -> ../shared`, a write to `repo/shared/test/a.test.ts` reads `shared/test/a.test.ts, outside: false`. The same file by its own path stays outside, and `repo/../repo/shared/x.ts` reads `shared/x.ts`. `abs` stays the event path for `underSource` and `editTexts`. The edit target, scope, silenced, comments and registry tests pass (47 pass, 0 fail). The edit-target fix is staged, not yet committed.

I also updated the reviewer memory file /mnt/work/development/github/picket/.claude/agent-memory/picket-reviewer/mods-tests-red-on-2-1-319.md: it now records that the 2.1.326 failure was fixed at 271dd9d8.

APPROVED
