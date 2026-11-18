Two small fixes before the tester benchmark is rerun:
1. src/skills/testing/steps/matrix.md:8 says every boundary the request gives no outcome for becomes a question, while results.md keeps a technical edge (such as a size of 0) as a boundary case. Say "A business boundary the request gives no outcome for" so the two files agree.
2. The answer key of bench task test-01-negative-quantity (bench/hidden/test-01-negative-quantity/key.json) names only T-1.1 with status 400, so the grader counts a true T-1.2 product failure caused by the same negative-quantity request (the refused invoice is stored) as a false alarm. Let that failure count as the planted defect.

## Brief
purpose: Remove two causes of wrong grades before the tester benchmark is rerun: a matrix line that turns technical edges into questions, and an answer key that counts a true consequence of the planted defect as a false alarm.
in scope: src/skills/testing/steps/matrix.md line 8; bench/hidden/test-01-negative-quantity/key.json; bench/lib/tester-grade.mjs and bench/test/tester-grade.test.mjs as far as the key needs
out of scope: Any paid benchmark run; the other five tester keys unless the key shape forces it; the kernel's picket test verbs; results.md and cases.md; the setting testing
