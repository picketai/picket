## Review: 20261029-route-verdicts-on-continued-turns-drift-amends · cumulative

APPROVED: both routing gaps in the request are fixed. A test covers each one, and no unrequested behaviour shift turned up in the callers.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A verdict the turn carries must be routed whatever stop_hook_active says, as long as the same verdict for the same phase is not already the last row" | request.md:1 | PASS | src/lib/hooks/route/verdict/index.mts:66-69, 100-104; tests "a continued turn routes a new phase's PHASE DONE", "a continued turn that repeats the last row routes nothing" |
| S-2 | "stop_hook_active keeps only guard.block's bounce from looping." | request.md:1 | PASS | src/lib/hooks/guard/block/index.mts:71 unchanged (no diff in the range); route.verdict uses the flag only for the dedupe and the loop-guard nulls at index.mts:101, 111 |
| S-3 | "A cross-check drift always goes to the architect" | request.md:1 | PASS | src/lib/shared/route/route.mts:50-53, 70; test "a cross-check drift with no amendment line still goes to the architect" |
| S-4 | "next returns amend with the drift's Decisions: DRIFT line (or the review path) as the amend text, until the third round." | request.md:1 | PASS | index.mts:71-76, route.mts:52; next-step.mts:108-116 unchanged; next-step.test.mts:152 "a third drift with an amendment pending is a stall the user decides" passes |
Alignment: PASS (14)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: what I tried and could not break. route() callers: verbs/reply routes only user verdicts, so the drift fallback cannot reach it. A guard.block re-emit after a routed stop dedupes, because a run-grant approval writes a marker and no row, so the last row stays PHASE DONE N. Empty amend or reason falls back to the review path (route.mts:51-52). A headless reviewer turn (agent "picket:reviewer", index.mts:74) gets the review-path pointer, not the Decisions line, but it still goes to the architect. 71 tests in the three touched test files pass; the mutant at index.mts:68 was killed. One item for the user, outside the code: the phase 1 drive wrote C:/Users/vlad.apetre/work/chained-item. left.jsonl logs `rm -rf C:/Users/vlad.apetre/work`, but the directory still exists.

APPROVED
