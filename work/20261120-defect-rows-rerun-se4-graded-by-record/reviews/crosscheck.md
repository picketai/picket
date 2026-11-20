## Review: 20261120-defect-rows-rerun-se4-graded-by-record · crosscheck

The record is consistent: every decision has a criterion, every phase serves a decision, and no decision contradicts a ratified SDR. Two Minor rows are recorded.

scope: full
Alignment: PASS (D-001 to T-1.1, T-1.3, T-1.5; D-002 to T-1.1, T-1.2, T-1.4; D-003 to T-2.1 to T-2.4; D-004 to T-3.1 to T-3.5)
Decisions: HONOURED
Findings: 0 critical, 0 major, 2 minor
- [Minor] work/20261120-defect-rows-rerun-se4-graded-by-record/design.md#phase-1: Decision coverage: Phase 1 "keeps its case loop", but `rerunCases` returns early when the previous round has no cases (src/lib/verbs/test/rerun.mts:36). A round whose only rows are recorded defects would rerun none of them, against D-002. Say in the Changes that the early return tests cases and defects together, and add a criterion for it.
- [Minor] work/20261120-defect-rows-rerun-se4-graded-by-record/design.md#D-004: Driver-finding resolution: SDR 00005 TF-001 to TF-003 are [TACTICAL DESIGN NEEDED] and no phase implements them. TF-003 is named under Scope Out. TF-001 and TF-002 are built in 20261119-database-guards-and-confirmed-sql-runs (SDR 00005 TF-001), but the record never says so. Add one Out line naming them.
Checked: terminology (defect row, known defect) and RISK-001 to RISK-004, which are contiguous. I read SDR 00004 and 00005 against D-001 to D-004; a Major never blocks APPROVED (SKILL.md:60). The greps match the base files (tester.md:50, results.md step 6, cli.md:443, verbs.mts:88). No existing reader of `defectRows` breaks on a copied row, because defect.mts:28 refuses repeats as before.

ALIGNED
