## Review: 20261114-purge-never-removes-another-item-s-stack · cumulative

Approved: every request sentence and every T-1.x and T-2.x criterion has code and a passing test, and I reproduced the T-1.1 red against the base close.mts.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "closing or purging an item must never remove a stack that stacks.json records for a different item" | request.md:1 | PASS | src/lib/verbs/close/close.mts:225-226; T-1.1 test |
| S-2 | "or whose item label names another item that is open or blocked" | request.md:1 | PASS | src/lib/shared/env/purge.mts:47-48, close.mts:230-231, src/lib/verbs/env/purge.mts:19-20; T-1.3, T-1.5 tests |
| S-3 | "`picket env start` must refuse a stack recorded for another open item, naming that item" | request.md:1 | PASS | src/lib/verbs/env/start.mts:32-35,97; T-2.1, T-2.4 tests |
| S-4 | "a test that fails on the current code: two open items from one ticket, B started after A, close A, and B's stack, volume and stacks.json entry remain" | request.md:1 | PASS | index.test.mts:233; fails at :238 with base close.mts, passes at HEAD (scratch run) |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/verbs/close/close.mts:226: D-002's "at any status" branch (fallback stack recorded for a different done item) has no test. T-1.1 covers only an open B, so narrowing the check to active items would pass every test (the crosscheck already raised this). Add a close case with the stack recorded for a done B, expecting the `is recorded for` warning and no `down`.
Classes: none
Checked: the T-1.1 and T-1.3 tests fail and T-1.4 passes with base close.mts swapped into a scratch copy of HEAD. All 45 tests in the 5 changed unit files pass at HEAD. The T-2.4 and T-5.6 CLI tests pass against the current dist. The guard removed from env purge (`refuseActive`) is replaced by `foreignClaim`, which checks the record and the label, so it is stricter. A failing `ps --format json` makes labelledItem return null, but purgeStack's `ps -q` then fails and nothing is removed. T-1.7 and T-2.5 hold: the only test-body changes are added lines plus the close stub's json answer. craft-lint finds 0 errors and 0 candidates. silenced is empty and the mutant was killed.

APPROVED
