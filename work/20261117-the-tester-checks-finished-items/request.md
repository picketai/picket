Build step 4 of SDR 00004 (`artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md`), its tactical follow-up TF-004: the tester, Picket's fifth agent.

The tester runs after the cumulative review on order and design items that declare a check (D-008). It is a black box toward the change: it may not read the files the item changed, and it works from a brief the kernel compiles. It adds no verdict token and reuses `APPROVED`, `CHANGES REQUIRED` and `DRIFT DETECTED`. It tests a matrix of case kinds for each criterion, sized by one check for each risk with a cap by item size, and does no exploratory testing.

Results are data and code derives the verdict (D-009): each result is passed, failed, blocked, not run or not covered; a failure is classified as product, test or environment; the verdict cannot be `APPROVED` while a criterion has no passed check of its own; a silent story gives a question phrased as a choice; the kernel generates the report from recorded results. The tester records through the kernel, on the `picket env` verbs and saved scenarios of build steps 2 and 3.

The user approves what changes (D-010): fixes after testing are approved before they are committed; a fix outside the touch set is a plan amendment; a passing scenario that turns red trips a circuit breaker (a diagnosis first, then one stop). What was not proven is said plainly (D-011): a pass through a mock is flagged on the result and on the item's closing line.

In scope: the agent shell and the testing skill, the brief, recording through the kernel, the generated report, verdict routing, fix rounds, the circuit breaker, the setting `testing` (ships as `design`, D-012), and the floor text for "four lanes, five agents, one kernel".

Out of scope, each its own later item: the planted-defect benchmark (TF-005), the mock format, stub server and data catalog (TF-006), the database guards (TF-007), known defects (TF-008). If TF-004 does not fit one design record, the architect names the split.

## Brief
purpose: a fifth agent checks a finished order or design item as a black box against the request, with results recorded by the kernel and the verdict derived by code
in scope: the tester agent shell and testing skill, the brief, recording through the kernel, the generated report, verdict routing, fix rounds, the circuit breaker, the testing setting, the floor text for five agents
out of scope: the planted-defect benchmark (TF-005); the mock format, stub server and data catalog (TF-006); the database guards (TF-007); known defects (TF-008)

## Brief
purpose: a fifth agent checks a finished order or design item as a black box against the request, with results recorded by the kernel and the verdict derived by code
in scope: the tester agent shell and testing skill, the brief, recording through the kernel, the generated report, verdict routing, fix rounds, the circuit breaker, the testing setting, the floor text for five agents
out of scope: the planted-defect benchmark (TF-005); the mock format, stub server and data catalog (TF-006); the database guards (TF-007); known defects (TF-008)
