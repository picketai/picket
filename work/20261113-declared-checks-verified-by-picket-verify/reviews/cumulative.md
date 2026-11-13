## Review: 20261113-declared-checks-verified-by-picket-verify · cumulative

APPROVED: both earlier blockers are gone. The plan amendment scopes T-7.4 to steps that run here, and the code fix makes a malformed declared check fail closed and keeps each check's position in the record's list.

Requirements: PASS (8)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A declared check asserts method, path, expected status and an optional `contains` list ... `drive: true` stays valid" | request.md:5 | PASS | src/lib/shared/work/declared-checks.mts readPlacedChecks/readChecks |
| S-2 | "`picket drive` logs what verify needs to check `contains`" | request.md:6 | PASS | drive/server.mts containsOf; drive/run.mts runMode; drive/index.mts driveOnce |
| S-3 | "verify compares the logged responses with the declared checks, for this work item and phase only" | request.md:7 | PASS | declared-checks.mts phaseRows; verify/index.mts driveResults |
| S-4 | "A mismatch is shown at the phase gate ... as declared versus ran" | request.md:8 | PASS | packet.mjs checkLines |
| S-5 | "Under a run grant, a path prefix difference is carried ... A security phase keeps its own gate." | request.md:9 | PASS | gate.mts checkGate; route.mts gateOf (ownGate first) |
| S-6 | "Carried mismatches appear once, as a group ... correction into the record with a revision log line" | request.md:10 | PASS | route/plan.mts phaseApproved; route/apply.mts writeCorrections |
| S-7 | "The order and design templates, the schema lint and the architect and developer contracts describe the new shape." | request.md:11 | PASS | templates, lint/schema/index.mts driveProblems, architect.md, developer.md, implementing/SKILL.md |
| S-8 | "Out of scope: the test environment, saved scenarios, ... the tester." | request.md:13 | PASS | no such code in the diff |

Alignment: PASS (41 rows). T-7.4 now reads "`node scripts/test.mjs unit build product timing` passes", which `scripts/test.mjs:40-43` supports. The fix block reports unit 1209/1209, product 663 with 0 failed and timing 8/8.
Decisions: HONOURED. D-006 now matches the code: `phaseCheckResults` maps each result back to its position in the record, and a route test proves the correction lands on the check that ran.
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: a drive list whose only check is malformed, and `drive: []`, both fail verify as `drive_checks` and stop the grant with "has a drive list the record cannot read". Security gates still take precedence. The packet shows the problems on the `checks` line. The 4 test files I ran pass (129/129). The red test named in the fix block is not left in src. Mutation is `baseline red` (recorded before the fix), so no mutant was spot-checked.

APPROVED
