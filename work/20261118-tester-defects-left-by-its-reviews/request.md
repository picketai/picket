Fix the defects the reviews left open in the tester (work item 20261117-the-tester-checks-finished-items), before the tester is used on a real project.

1. At the stop after three failed test rounds, the reply `d` (redesign) returns to the same stop (src/lib/shared/work/test-stage.mts:90-95). `d` must send the architect an amendment, as it does at the other stall stops.
2. A fix the user rejects at the approve_fixes stop returns without a re-review and a retest (src/lib/shared/work/test-stage.mts:140-145). A rejected fix goes back to the developer, and the reworked fix is reviewed and tested again before the stop repeats.
3. guard.blackbox keeps its own copy of the item's file list (ownedPaths, src/lib/hooks/guard/blackbox/index.mts:30) beside itemOwnedPaths (src/lib/shared/review-summary.mts:210-213). Keep one source for that list, or a test that fails when the two differ, so the tester can never read part of the change.
4. The outcome lists are repeated by hand: COUNTED_OUTCOMES (src/lib/shared/testing/report.mts:6), COUNTS_LINE (src/lib/verbs/test/report.mts:313) and OUTCOME_WORDS (src/lib/verbs/test/note.mts:193) repeat the lists of src/lib/shared/testing/results.mts:146-148. Derive them from results.mts, so a new outcome appears in the counts without a second edit.
5. A passing case that logs in first is never kept as a saved scenario, because the login request counts as a write (src/lib/shared/scenarios/keep.mts:80, src/lib/shared/testing/keep-cases.mts:11). A case whose only write is its login is kept; a case that writes anything else follows the rules it follows today.
6. The guard.scope closure test has no seeds for the tester's paths `test/` and `test.md` under a work item folder. Add them.

No behaviour changes outside these six points. The setting `testing` stays `design`.

## Brief
purpose: Fix the six defects the checkpoint and cumulative reviews left open in the tester, so it can be used on a real project.
in scope: The third-round redesign reply, the rejected fix path, one source for the item's file list in guard.blackbox, outcome lists derived from results.mts, keeping cases that only log in, and the guard.scope closure seeds for the tester's paths.
out of scope: The per-round case cap (question S-4), the planted-defect benchmark (TF-005), the testing setting's default, and any new tester behaviour.
