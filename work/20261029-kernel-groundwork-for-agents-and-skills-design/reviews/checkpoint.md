## Review: 20261029-kernel-groundwork-for-agents-and-skills-design · checkpoint (phase 4)

Phase 4 passes, and the code of phases 1 to 3 holds up at the checkpoint. Typecheck is clean, craft-lint is clean, and 178 unit tests across the changed areas pass.

Alignment: PASS
| ID | Criterion | Result | Evidence | Note |
|---|---|---|---|---|
| T-4.1 | `NEXT_ACTIONS` has 12 entries ending `fix_findings`, `amend`, and `npm run typecheck` passes | PASS | action-text.mts:1; tsc -p . gave no errors; test "twelve in all" | |
| T-4.2 | all approved + cumulative CHANGES REQUIRED last gives `fix_findings` at the last phase; a PHASE DONE after it gives `review_cumulative` | PASS | next-step.mts:64-76; test "an open cumulative rejection sends the developer..." | |
| T-4.3 | a third cumulative CHANGES REQUIRED still gives `resolve_rejections` with `STALL_OPTIONS` | PASS | next-step.mts:76 (rejectionsStep first); test "a third cumulative rejection..." | |
| T-4.4 | a row with `amend` and no later AMENDED gives `amend`, open or blocked after one DRIFT | PASS | next-step.mts:89-92, 124-125; test "a pending amendment goes to the architect..." | |
| T-4.5 | after AMENDED: open gives `fix_findings`, blocked gives `resolve_block` | PASS | next-step.mts:53-57; test "after AMENDED, ..." | |
| T-4.6 | a third DRIFT with an amendment pending gives `resolve_block` with `STALL_OPTIONS` | PASS | next-step.mts:90-91; test "a third drift with an amendment pending..." | |
| T-4.7 | Drive: `picket next` prints `fix_findings` | PASS | block Verified line cites the drive; the logic is covered by the T-4.2 test | I did not re-run the drive |
| T-4.8 | `npm test` passes | PASS | block reports it; I ran the unit tests of the changed areas: 178 pass | |
Decisions: HONOURED
Findings: 0 critical, 0 major, 2 minor
- [Minor] src/lib/hooks/route/verdict/index.mts:77: the hook passes `amend` for every agent, but D-002 says the reviewer's line. `pendingAmend` (next-step.mts:53) takes the latest row carrying `amend` and clears it only on a later AMENDED row. If an architect's AMENDED block ever has a line starting `AMENDMENT NEEDED:`, that row is itself the latest amend row with nothing after it, so `next` says `amend` again after every amendment. Only pass `amend` when `info?.agent === "reviewer"`. Likelihood: low.
- [Minor] src/lib/verbs/preflight/index.mts:50: `saveWarnings` is unguarded, so a work folder that cannot be written (read only mount) makes `picket preflight` throw instead of reporting, though it was read only before. Wrap the write like `saveDeveloperBlock` does, or let it fail on purpose. Likelihood: low.
Classes: none
Checked: removed guards (none removed). Consumers of the new actions in `close.mts:58`, `packet.mjs:100-153`, `inject/state` and the band either handle them or fall through to `detail`. `isStalled` still wins over amend in a blocked item. `summary --range --save` is a UsageError (exit 1, `EXIT.usage`), as T-3.5 says. `summary`/`preflight` stay `readOnly`, and the existing `READ_VERBS` test in `kernel.test.mts` covers T-3.7. The preflight `tree` check ignores `work/`, so the saved files do not dirty it. One band wording shift: the `none` action in the own session used to read "lead <detail>" and now reads `<detail>`. That is unrequested but cosmetic.

APPROVED
