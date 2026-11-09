Fix the kernel and template gaps seen on 2026-11-07 and 2026-11-08 while running 20261107-plugin-only-install and 20261105-kernel-blocks-run-sends-review-diffs:
1. `picket reply` refuses a bare `r` at approve_phase although the packet offers `[r] run through 7`; only `r 7` is accepted. A bare `r` should mean run through the last phase.
2. After a cross-check DRIFT DETECTED blocked the item while phase 1 was in flight, `picket next` still printed the implement_phase sends instead of the `amend` send to the architect. After AMENDED it printed no `review_crosscheck` send either; the lead had to write both.
3. A checkpoint reviewer's CHANGES REQUIRED was recorded with scope null, so `picket next` kept showing review_checkpoint as due instead of a fix step.
4. `picket summary` stored base HEAD and no changed files for an item opened while git was not on PATH (no base recorded at open); the review then had nothing to diff. A missing base should be found later (from the item's ledger accept rows or its first phase commit) or reported, never HEAD.
5. guard.bash denies read-only `git config --get` and `git config --list` as destructive.
6. route/verdict/index.mts:85: a developer block identical to the saved one is dropped even after a reviewer CHANGES REQUIRED or a user rejection, because the check reads only the newest developer row, and the developer gets no sign it was dropped. A repeat after a rejection should be routed, or bounced with a message.
7. The closing-block templates in the ordering, designing and researching skills do not show the `Audit:` line that `picket close` now prints.

## Brief
purpose: Fix seven kernel, guard and template gaps seen while running two work items on 2026-11-07 and 2026-11-08.
in scope: reply's bare r; next's amend and re-crosscheck sends after drift mid-phase; checkpoint verdict scope; summary base when none was recorded; guard.bash allowing read-only git config; repeated developer block after a rejection; Audit line in the lane skills' closing templates.
out of scope: Any other kernel behaviour; mods; install and packaging.
