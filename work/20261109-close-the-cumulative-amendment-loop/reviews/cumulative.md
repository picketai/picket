## Review: 20261109-close-the-cumulative-amendment-loop · cumulative

Approved: both request sentences are met on the cumulative path, all T-1.x and T-2.x criteria have code and test evidence, and the only finding is a whitespace Nit.

Requirements: PASS (2)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A mixed review must reach the user's amendment gate" | request.md:1 | PASS | `/mnt/work/development/github/picket/src/lib/shared/work/next-step.mts:160` (the gate opens on any cumulative row with `amend`), `:115` gives the mixed detail; test `(T-1.1)` |
| S-2 | "an AMENDED verdict that leaves the record unchanged must not count as an amendment" | request.md:1 | PASS | `/mnt/work/development/github/picket/src/lib/shared/route/route.mts:48` stamps `record`; `next-step.mts:125-133` skips an unchanged AMENDED and reopens the gate; tests `(T-2.3)` and the `(T-2.5)` round trip. D-003 limits this to the gate path, which the brief's scope line supports |
Alignment: PASS (13)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 0 minor, 1 nit
- [Nit] /mnt/work/development/github/picket/src/lib/hooks/route/verdict/index.test.mts:453: phase 2 changed `REVIEWING_SKILL = new URL` to `REVIEWING_SKILL =new URL`, losing the space. Put the space back.
Classes: none
Checked: `pendingAmend` now skips cumulative rows (`next-step.mts:70`), so an older phase, checkpoint or drift amend row could come back once a later cumulative review has no `amend`. It cannot: `phasedStep` (`:243`) and `blockStep` (`:191`) call `amendStep` before any progress, so every non-cumulative amend row already has an AMENDED after it. `isCountedAmended` uses `indexOf` on the same row objects that `after` slices. The unchanged note also shows on a drift RECONCILE, as D-002 allows. Legacy rows without `record` count as changed. The 4 touched test files pass 108 of 108. The mutation at `route.mts:49` was killed, and `silenced` is empty.

APPROVED
