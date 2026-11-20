## Review: 20261120-defect-rows-rerun-se4-graded-by-record · cumulative

Approved: every request sentence and every criterion from T-1.x to T-3.x has code and a passing test behind it, and nothing outside the plan changed behaviour.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Print a line such as "K-01 not recorded: <problems>" in the closing block" | request.md:2 | PASS | src/lib/verbs/close/defects.mts:154; test "a recorded defect whose steps no longer parse is named with its problems..." |
| S-2 | "Rerun the recorded defect rows with the round's rerun" | request.md:3 | PASS | src/lib/verbs/test/rerun.mts:48-62; tests T-1.1 to T-1.4 in src/lib/verbs/test/case.test.mts |
| S-3 | "at close make a known defect only of a row that still fails" | request.md:3 | PASS | src/lib/verbs/close/defects.mts:151,163-166; tests T-2.1 to T-2.3 |
| S-4 | "the reviewing checklist row Se4 (guard bypass surface) ... say which records are held to the determined-bypass bar" | request.md:4 | PASS | src/skills/reviewing/checklists/patterns-security.md:12,14-16 |
| S-5 | "and the close follow-up line" (Se4 repeat graded by record) | request.md:4 | PASS | src/lib/verbs/close/block.mts:91-97; test "a repeated Se4 gets its own Follow-up line..." |
Alignment: PASS (20)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: rows with no `outcome` (RISK-001) are read as failing at close, and rerun never reads that field. A rerun that fails and meets a mock gap becomes `blocked`, and close then keeps the earlier failing detail. No reader outside rerun and close (report, derive, brief, escapes) uses defect rows, so the extra rerun rows are counted nowhere. `nextFoundId` and `refuseRepeat` still key on `found` and on the steps. The diff leaves the tests named in T-1.6, T-2.5 and T-3.2 unedited. The checklist diff changes only the Se4 row and adds the new section (T-3.4). The 4 changed test files pass (89/89, `TMPDIR=/tmp`). `lint.craft` is clean, `silenced` is empty, and the mutant at src/lib/verbs.mts:88 was killed. Removed-guard check: lowering Se4 from Critical to "Critical or Major" is required by D-004 and T-3.4. In close, the old `problems` branch that returned null now reports a line instead, so no check got weaker.

APPROVED
