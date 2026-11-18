Tighten the tester skill after the first paid tester benchmark run (bench/results/plugin-2026-11-18.json):
1. Before writing a case, the tester finds a request's body and path shape in the project's unchanged documents (such as a README), not by guessing. In test-04 it guessed the body of POST /invoices twice and got 500 each time, while the fixture README documents the body.
2. A failed case whose own request or expectation the tester doubts is classed test, not product, and a corrected case follows. In test-04 four doubtful cases were classed product.
3. The tester asks a business question when the request is silent on an edge of a tested criterion, even when no planned case depends on the answer. In test-06 it named the gap (a credit larger than the invoice total) in prose and asked nothing.
4. The picket test note example quotes the --why text. In test-01 and test-06 every note ran twice, first unquoted.

## Brief
purpose: Raise the tester's benchmark result: no guessed request bodies, no doubtful case classed as a product failure, a question when the request is silent on an edge of a tested criterion, and no repeated note commands.
in scope: src/skills/testing/SKILL.md and src/skills/testing/steps/ (cases.md, matrix.md, results.md), the tester shell src/agents/tester.md only if a step needs it, and tests that pin the skill text
out of scope: The benchmark answer key for test-01 (a separate item); any paid benchmark run; the kernel's picket test verbs; the setting testing; SDR 00004 items TF-006 to TF-009
