## Review: 20261118-tester-reads-shapes-doubts-asks-edges · cumulative

APPROVED: all four request items and every T-1.x and T-2.x criterion are met in the step files, and a passing round-trip test pins them. The one finding is a Minor wording conflict.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Before writing a case, the tester finds a request's body and path shape in the project's unchanged documents (such as a README), not by guessing." | request.md:2 | PASS | /mnt/work/development/github/picket/src/skills/testing/steps/cases.md:6 |
| S-2 | "A failed case whose own request or expectation the tester doubts is classed test, not product, and a corrected case follows." | request.md:3 | PASS | /mnt/work/development/github/picket/src/skills/testing/steps/results.md:6-7 |
| S-3 | "The tester asks a business question when the request is silent on an edge of a tested criterion, even when no planned case depends on the answer." | request.md:4 | PASS | /mnt/work/development/github/picket/src/skills/testing/steps/results.md:11,17-21 |
| S-4 | "The picket test note example quotes the --why text." | request.md:5 | PASS | matrix.md:5,14; results.md:3,5,10; /mnt/work/development/github/picket/src/lib/verbs/test/skill-examples.test.mts:81-96 |
Alignment: PASS (12; T-2.8 DEFERRED: product owner, the next paid tester benchmark run)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/skills/testing/steps/matrix.md:8: "A boundary the request gives no outcome for gets no case: it becomes a question" applies to every boundary. But results.md:11 and D-004 keep a technical edge, such as a size of 0, as a boundary case with the answer the request implies. Also, matrix.md:3 still says each cell gets either a case or a note. A tester who reads matrix.md first can ask about a zero quantity on a trap task, and bench/lib/tester-grade.mjs fails a trap task on any question. The fix is to write "A business boundary the request gives no outcome for" (the T-2.5 wording allows it) and say how the cell is recorded.
Classes: none
Checked: the new test passes alone (4/4), and passes with the skills, dashes, references and budgets tests (41/41, run with TMPDIR=/tmp). A placeholder such as `--why <text>` makes the shell parser throw, so the test catches a return to the old form. guard.blackbox allows Glob from the project root, because index.mts:45-57 treats only Grep as a search over a parent path. No file cites a cases.md step by number except the new reference at results.md:6, and that number is right. The mutation result is baseline red, so no mutant was checked; the order's T-1.5 says init.test.mjs fails under this session's TMPDIR. `--choices` is missing from the test's free-text list, but both examples quote it.

APPROVED
