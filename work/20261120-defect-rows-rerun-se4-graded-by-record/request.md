Close three small leftovers:
1. At close, a recorded defect row whose card no longer parses is dropped silently (src/lib/verbs/close/defects.mts:148). Print a line such as "K-01 not recorded: <problems>" in the closing block, as keep.mts does for a card that does not parse.
2. A defect the tester recorded in an earlier round becomes an open known defect at close even when a later fix round fixed it, because defect rows are never rerun (src/lib/verbs/close/defects.mts:156). The next item's replay then closes it as "fixed outside this item" with no failing run on record. Rerun the recorded defect rows with the round's rerun, and at close make a known defect only of a row that still fails.
3. SDR 00005 follow-up TF-004: the reviewing checklist row Se4 (guard bypass surface) and the close follow-up line say which records are held to the determined-bypass bar (SDR 00005 D-001: only an irreversible action outside the repository), so a new shell spelling that reaches a reversible record (a phase marker, a verdict, a comment, a waiver) is graded below Critical.

## Brief
purpose: Stop a recorded defect from turning into a misleading known defect, say when one could not be recorded, and make the Se4 review row grade a guard bypass by what the record it reaches can cause (SDR 00005 TF-004).
in scope: The closing block line for a defect row whose card does not parse; rerunning recorded defect rows with the round's rerun and recording at close only those that still fail; the Se4 row of the reviewing skill's security checklist and the close follow-up line, graded by SDR 00005 D-001
out of scope: A cap on picket test defect; the browser adapter (TF-009); the sandbox spike (SDR 00005 TF-003); any new guard.bash spelling; the setting testing
