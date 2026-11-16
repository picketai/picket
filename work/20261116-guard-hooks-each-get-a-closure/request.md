Follow-up to 20261116-guard-closure-checks-derive-their-spellings: finish the sentence of its request that stayed only partly met, "it fails when a guard or a row has no closure test".

Today the guard registry in `test/repo/closures.test.mjs` sees only guards that already have a closure test, so a guard with no closure test at all passes `npm test`. This item gives every guard hook that has none its closure test, built with `#test/variants.mts` as C-020 says: `guard.comments`, `guard.silenced`, `guard.block`, the edit target reading in `edit-target.mts`, and the parts of `guard.bash` outside the in-place guard (the judge, the kernel-call rules, the sources rule, the escalation and the PowerShell reading). Each closure names its grammar and takes its seeds from the guard's own tables where it has them; a guard over an input grammar no family covers adds the family.

Then the registry check requires it: every guard hook module under `src/lib/hooks/guard/` has a registry entry and a closure test, and `npm test` fails naming a guard module that has neither. The limit bullet in `CONTRIBUTING.md` that names a guard missing from the registry is narrowed to what still passes after this change.

A spelling a new closure finds open at HEAD is closed in this item when the real program or tool accepts it, seeded as C-020 requires.

## Brief
purpose: Finish the derived closure request: a guard with no closure test at all fails npm test, so no guard hook reaches review untested for sibling spellings
in scope: closure tests for guard.comments, guard.silenced, guard.block, the edit target reading and the parts of guard.bash outside the in-place guard; a registry check that requires an entry and a closure for every guard hook module under src/lib/hooks/guard/; open spellings those closures find at HEAD; the limit bullet in CONTRIBUTING.md
out of scope: guards outside src/lib/hooks/guard/, new guards, the awk operand reading, the Mu1 follow-up, build step 4 (the tester)
