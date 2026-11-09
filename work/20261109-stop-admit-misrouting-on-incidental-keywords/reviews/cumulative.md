## Review: 20261109-stop-admit-misrouting-on-incidental-keywords · cumulative

Approved: every request case is pinned and passes, and the 134 base corpus entries get the same lanes they got at 203be6b.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Words inside work item ids, paths and other hyphenated or dotted identifiers must not fire the signal." | request.md:2 | PASS | signals.mts:93 `isMigration` masks `IDENTIFIER`; signals.test.mts:49 |
| S-2 | "a JSON schema file edit is not a schema or data migration." | request.md:3 | PASS | signals.mts:27 `JSON_SCHEMA`; index.test.mts:114 |
| S-3 | "A request that asks to see, check or review whether something regressed, and asks for no change, answers research." | request.md:4 | PASS | signals.mts:82 to 91; index.test.mts:134 |
| S-4 | "The admit-labelled corpus and the lane tests pin each case." | request.md:5 | PASS | admit-labelled.test.json:136 to 143; index.test.mts:112 to 148 (D-003 puts the lane pins in the admit verb tests) |
Alignment: PASS (13)
Decisions: HONOURED
Regression: 1 unrequested behaviour change
Sources: none
Questions: none
Findings: 0 critical, 0 major, 2 minor
- [Minor] src/lib/shared/admission/signals.mts:82: a review-only request now gets research before `heavyReasons` runs. So "See if we can drop table legacy_users safely." (an irreversible step) and "Verify whether the migration backfill ran on all rows." (a migration) both moved from design to research. RISK-003 names only security words. Widen RISK-003's text to cover irreversible and migration words too. Leaving it is also fine, since research writes no code.
- [Minor] src/lib/shared/admission/signals.mts:31: the `CHANGE_VERBS` list behind `ASKED_CHANGE` lacks `create`. So "Check whether the CSV export works and create a test for it." now answers research; at base it answered order. RISK-004 covers this case. Add a corpus entry for it if the team wants the boundary pinned.
Classes: none
Checked: the refactored research rule matches the base logic case by case; on all 134 base corpus entries, base and head give the same lanes with the same 7 disagreements, and head agrees on 135 of 142; 63 targeted tests pass; the built CLI prints the T-1.6 and T-2.7 lines; no comments added; silenced is empty; the mutant at signals.mts:83 was killed; signalsOf's only consumer is admit.mts:22.

APPROVED
