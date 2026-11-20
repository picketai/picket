## Review: 20261120-three-routing-faults-after-a-stall · cumulative

APPROVED: all three faults are fixed as the request asks, each one is proven by a replay test and a before and after drive, and I found no defect that blocks.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A developer's PHASE STALLED was not recorded." | request.md:2 | PASS | src/lib/hooks/route/verdict/index.mts:189; test "a second developer's stall after the user's c reply is recorded and blocks the item (T-1.1)" |
| S-2 | "The two must agree until the architect answers AMENDED." | request.md:3 | PASS | src/lib/verbs/reply/index.mts:84, src/lib/shared/work/next-step.mts:97-110; tests T-2.1, T-2.2 |
| S-3 | "A PHASE DONE after a recorded PHASE STALLED left the item blocked." | request.md:4 | PASS | src/lib/shared/route/plan.mts:82-90; test "the PHASE DONE that follows a stall on the same phase reopens the item and the grant goes on (T-3.1)" |
| S-4 | "unit tests that replay the three sequences from the item's verdicts.jsonl and replies.jsonl" | request.md:8 | PASS | test/support/stall-replay.mts: all 11 verdict rows and 3 reply rows match the source item's logs byte for byte |
| S-5 | "out of scope: New verdict tokens or gate options" | request.md:9 | PASS | verdicts.mjs and reply/table.mts are not in the diff |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 1 minor
- [Minor] src/lib/verbs/reply/index.test.mts: T-2.1 asserts `next.send` deep-equals `result.send`, but after D-002 the reply returns `next.send` itself, so this check always passes. The architect message content is still pinned by the existing test "d at a design stall reopens the item and sends the architect the old blocked reason", so nothing is left unguarded. To make T-2.1 pin something, also assert the message text `work: <id>\namend: PHASE STALLED on phase 2`.
Classes: none
Checked: The fixture rows match the source logs verbatim. All 6 before and after files in /mnt/work/development/github/picket/.picket/state/scratch/20261120-three-routing-faults-after-a-stall/ show the claimed red and green. The 6 changed test files pass (232 tests). Craft lint is clean. The mutant at verdict/index.mts:190 was killed. Existing tests only gained lines. The new amendStep fallback now also runs in blockStep and allApprovedStep, and I checked it there: a redesign reply is only written at resolve_block and stops being pending at the next AMENDED. Dropping repeat rows that are older than a reply is the trade D-001 accepts as RISK-001, and an identical PHASE DONE is still stopped by repeatsSavedBlock.

APPROVED
