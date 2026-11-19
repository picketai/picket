## Review: 20261119-database-guards-and-confirmed-sql-runs · crosscheck

ALIGNED: D-004 (r2) now binds the confirmation to a nonce that only the hook-rewritten, accepted command carries, so a refused dialog leaves nothing a script can take.

scope: delta (D-004)
Alignment: PASS (D-004 r2 is implemented by T-3.3 to T-3.7 and T-4.1 to T-4.8; Phase 2 implements D-004's RISK-006 and OQ-004 through T-2.1 to T-2.5; the frontmatter lists five phases and its drive entries cover T-1.6, T-3.1, T-3.2, matching the renumbered body and `picket state`)
Decisions: HONOURED
Findings: 0 critical, 0 major, 1 minor
- [Minor] work/20261119-database-guards-and-confirmed-sql-runs/design.md#phase-4: Done when T-4.1 reads "are each `runSqlEntry` is refused", which has two verbs and cannot be read as one rule. Reword to "`runSqlEntry` is refused in each case, naming `PICKET_ESCALATE`".
Classes: none
Checked: the prior Major (refused dialog leaving a takeable row) is closed by the nonce in `updatedInput` plus T-4.1's refused-dialog case; RISK-005 to RISK-007 and OQ-001 to OQ-004 have no id gap; the revision log line and the (r2) marker are present; the unproven host behaviour (rewritten command runs under `ask`) is gated by OQ-004, with Phase 3 blocked on T-2.4 and a fallback that returns D-004 for amendment. The earlier Minor on glossary entries is outside this delta.

ALIGNED
