## Review: 20261108-share-turn-check-fix-changelog · cumulative

Approved: both requested fixes land exactly as D-001 and D-002 specify, and neither `picket close` nor `picket cost` changes behaviour.

Requirements: PASS (3)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | Export TURN_EVENTS and isTurn from ledger.mts, use them in audit.mts and cost/index.mts | request.md item 1 | PASS | src/lib/shared/ledger.mts:55-59; audit.mts:2,30; cost/index.mts:4,84; grep finds no local copies left |
| S-2 | Fix the M↓ wording to follow D-003 (r3), remove the blank line that splits Added | request.md item 2 | PASS | CHANGELOG.md:20 now reads "hidden when `mods.markdown` is false in `.picket/config.json`"; the blank line is gone; the diff holds only those two changes |
| S-3 | Leave the dist/README.md install line as it is | request.md, out of scope | PASS | dist/README.md is not in the diff |

Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: no code in src or test (mods included) uses TURN_EVENTS or isTurn other than these files. In cost, the set's type changes from `Set<string>` to `ReadonlySet<LedgerRow["event"]>`, which changes types only. TurnRow has 3 events and LedgerRow has 8, and the new test covers all 8. audit.test.mts and cost/index.test.mts are unchanged since a6d2315 and pass (17/17). The dashes and names repo tests pass (12/12), and `tsc --noEmit` exits 0. I did not rerun the full `npm test`: its mods step already fails at base (the summary records "baseline red"), and the developer's block reports the same 25 failures there.

APPROVED
