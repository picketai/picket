## Review: 20261118-boundary-wording-and-test-01-key-agree · cumulative

Approved: both requested fixes are in. The new tests run the case through the kernel's real case card reader, and keys without `consequences` grade exactly as they did before.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Say \"A business boundary the request gives no outcome for\" so the two files agree." | request.md:2 | PASS | /mnt/work/development/github/picket/src/skills/testing/steps/matrix.md:8; numstat against aed758de is 1 added, 1 removed |
| S-2 | "Let that failure count as the planted defect." | request.md:3 | PASS | /mnt/work/development/github/picket/bench/hidden/test-01-negative-quantity/key.json:4, /mnt/work/development/github/picket/bench/lib/tester-grade.mjs:43-52; test "the T-1.2 consequence alone finds the defect (T-2.3)" |
| S-3 | "in scope: ... bench/lib/tester-grade.mjs and bench/test/tester-grade.test.mjs as far as the key needs" | request.md:7 | PASS | the diff touches only showsDefect, showsConsequence and defectGrade; trap and silent grading are unchanged |
| S-4 | "out of scope: Any paid benchmark run; the other five tester keys ...; results.md and cases.md" | request.md:8 | PASS | `git diff --stat aed758de HEAD`: the only file changed under bench/hidden is the test-01 key.json; results.md, cases.md and bench/results are unchanged in the range |
Alignment: PASS (11)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: moving the shared check into isRequestTo leaves showsDefect behaving the same. A key with no consequences takes the `?? []` path, and the base DEFECT tests still pass. C09 goes through the dist caseCard with its header line, and request steps with a null body never match. `node --test bench/test/tester-grade.test.mjs bench/test/tasks.test.mjs` gives 20 pass, 0 fail, the T-1.7 key kinds test included. budgets.test.mjs gives 9 pass, which covers the 80-line step file budget. The mutation outcome is `baseline red`, so no mutant was checked. The order notes that `npm test` needs `TMPDIR=/tmp` on this machine, and this shell's TMPDIR is under HOME.

APPROVED
