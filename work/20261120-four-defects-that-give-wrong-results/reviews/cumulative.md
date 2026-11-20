## Review: 20261120-four-defects-that-give-wrong-results · cumulative

Approved: all four requested fixes are in the code, every T-N.x criterion has a passing test, and the new tests fail on the base code, so they do prove each fix.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "After such a reply the next step is the developer's fix_findings again." | request.md:2 | PASS | src/lib/shared/work/next-step.mts:146; next-step.test.mts:373, reply/index.test.mts:187 |
| S-2 | "A failed read must not turn earlier traffic into the run's own." | request.md:3 | PASS | src/lib/shared/mocks/stub.mts:105,114,126; stub.test.mts:117, replay.test.mts:126 |
| S-3 | "Refuse a total that is not a safe integer." | request.md:4 | PASS | src/lib/verbs/reply/table.mts:114-116; reply/index.test.mts:468,476 |
| S-4 | "Give it a cap per round, shown in the brief and enforced by the verb" | request.md:5 | PASS | src/lib/shared/testing/derive.mts:7, src/lib/verbs/test/defect.mts:38-40,66, src/lib/shared/testing/brief.mts:56 |
| S-5 | "unit tests for each" | request.md:9 | PASS | the 12 new or rewritten tests above; 137 of 137 pass in the six changed test files |
Alignment: PASS (16 of 17; T-3.6 DEFERRED to the product owner, at the next testing-stage round on a design item)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 2 minor, 1 nit
- [Minor] work/20261120-four-defects-that-give-wrong-results/phases/1.block.md:9: `Red: n/a` on a bug fix (bar.md Pb1). Phase 2's block (2.block.md:9) has the same gap. I swapped the base next-step.mts, stub.mts and table.mts into a scratch copy of HEAD: T-1.1, T-1.3, T-1.4, T-1.5 and T-2.1 to T-2.4 all fail there. The proof exists, it is just not on the block, so this is demoted from Major.
- [Minor] src/lib/verbs/test/defect.mts:66: refuseCap now runs before refuseRepeat. At the cap, replaying K-01's steps gets the cap message instead of "K-01 already records these steps". Nothing wrong is recorded. The developer named this order on the block's Decisions line.
- [Nit] src/lib/verbs/test/defect.test.mts:20-22: the new imports come after the local import, the blank line before the constants is gone, and results.mts is imported twice (lines 11 and 21).
Classes: none
Checked: findingsOpen's only callers are findingsStep and checkpointStep (next-step.mts:150,267). The checkpoint fix keeps T-1.3's DONE-alone path and the existing checkpoint tests (327, 337, 346) pass. readTraffic and trafficBetween have one caller (replay.mts:61-63), and an undefined before-entry still reads as [] (stub.mts:126). newDefectIds leaves out rerun rows: rerun.mts:36 reuses the earlier found id. tsc -p . exits 0. lint.craft finds 0 errors and 0 candidates. silenced is empty. The mutant at stub.mts:114 (=== to !==) was killed.

APPROVED
