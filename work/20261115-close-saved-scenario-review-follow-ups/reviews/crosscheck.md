## Review: 20261115-close-saved-scenario-review-follow-ups · crosscheck

Every decision has a phase that implements it and no citation dangles, so the record is consistent. One Minor row concerns a shared seed list with no stated home. scope: full

Alignment: PASS (D-001 to T-1.x, D-002 to T-2.x, D-003 to T-3.1/3.2, D-004 to T-4.x, D-005 to T-5.x, D-006 to T-6.x; every phase implements at least one decision)
Decisions: HONOURED (no contradiction of SDR 00004, Ratified)
Findings: clean, 0 critical, 0 major, 1 minor
- [Minor] work/20261115-close-saved-scenario-review-follow-ups/design.md#D-001: Reference integrity and coverage: Phase 1 says the new `rules.variants.test.mts` seeds are "the `maskedBody` seeds". Those seeds are local consts (`SEEDS`, `SECRET_WORDS`) in `src/lib/shared/drive-log.variants.test.mts:5-7`, and only the families move to `test/support/variants.mts`. The families also need the local helpers `onlyPair` and `spelled` (lines 9-17), and no phase says to move them. A test file cannot import another `.test.mts` without running that file's tests. Name where the seed list lives (export it from `test/support/variants.mts`) and say that the two helpers move with the families.
Classes: none
Checked: all 28 cited sources exist (`stack-start.mts` and `rules.variants.test.mts` are new in the plan); the Problem's line citations (`test/repo/conventions.test.mjs:141`, `config-entries.test.mts:44`) match; RISK-001 to 007 and OQ-001 to 004 have no gaps; the cited SDR and prior-design decision ids say what the record claims; C-020 exists; the phase and decision caps hold.

ALIGNED
