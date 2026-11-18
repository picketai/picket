## Review: 20261118-tester-defects-left-by-its-reviews · cumulative

Approved: all six defects in the request are fixed with tests that pin them, and nothing outside those six points changed.

Requirements: PASS (7)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "`d` must send the architect an amendment, as it does at the other stall stops." | request.md:3 | PASS | test-stage.mts:94; reply/index.mts:80-85; test T-1.1 |
| S-2 | "A rejected fix goes back to the developer, and the reworked fix is reviewed and tested again before the stop repeats." | request.md:4 | PASS | test-stage.mts:139-145; tests T-1.4, T-1.5, T-1.6 |
| S-3 | "Keep one source for that list, or a test that fails when the two differ" | request.md:5 | PASS | owned-paths.mts:5; blackbox/index.mts:6,32; review-summary.mts:18 |
| S-4 | "Derive them from results.mts, so a new outcome appears in the counts without a second edit." | request.md:6 | PASS | results.mts:9; report.mts:2; verbs/test/report.mts:22; note.mts:12-14 |
| S-5 | "A case whose only write is its login is kept; a case that writes anything else follows the rules it follows today." | request.md:7 | PASS | keep.mts:78-97; keep-cases.test.mts login tests |
| S-6 | "Add them." | request.md:8 | PASS | scope/index.variants.test.mts:20-21 |
| S-7 | "No behaviour changes outside these six points. The setting `testing` stays `design`." | request.md:10 | PASS | no config or other source file in the range |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean, 0 critical, 0 major, 1 minor
- [Minor] /mnt/work/development/github/picket/work/20261118-tester-defects-left-by-its-reviews/phases/1.block.md:8: a defect fix gives `Red: n/a`. I reproduced the red myself: with base test-stage.mts swapped into a scratch copy of HEAD, T-1.1, T-1.4, T-1.6 and the changed T-8.4 line fail. So the proof exists, but the block does not record it.
Classes: none
Checked: Before T-1.1 I confirmed that the `[d]` reply writes only to replies.jsonl and adds no verdict row. I also checked that a second tester round after a rejection re-anchors, that `?? []` matches the old ownedPaths, that the counts from roundCounts match renderReport's, and that a declared-check card stays outside the login exemption. tsc is clean, the 8 changed test files pass 73 of 73, the T-2.6 scratch logs fail as expected, and the mutation at keep.mts:79 was killed.

APPROVED
