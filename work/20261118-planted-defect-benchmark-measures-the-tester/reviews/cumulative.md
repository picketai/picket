## Review: 20261118-planted-defect-benchmark-measures-the-tester · cumulative

Approved: every story requirement and every T-N.x criterion is met with evidence I ran myself, and only Minor findings remain.

Requirements: PASS (8)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "It lives in Picket's own repository under bench/, never in a user's project." | request.md:1 | PASS | all new files are under bench/; the one product edit, src/lib/shared/env/instep.mts:19-30, is required by D-002 |
| S-2 | "The benchmark fixture (bench/fixture) grows to a small system with a test environment in the standard shape (.picket/env/, Compose)" | request.md:3 | PASS | bench/fixture/.picket/env/compose.yaml:1-23; `env check` prints "rules passed" (I ran it) |
| S-3 | "Each task holds a story (the request), a finished implementation with one known mistake, and a hidden answer key the tester cannot read. Three kinds of task" | request.md:4 | PASS | bench/seeds/*/item/request.md and repo/; bench/hidden/*/key.json is read only at grading (bench/run.mjs:119); selfcheck prints defect live x3, trap holds x2, seeded x1 |
| S-4 | "Code grades the report the kernel generates against the answer key, by request and status. No model grades anything." | request.md:5 | PASS | bench/lib/tester-grade.mjs:61-64, 115-126 grades the kernel's round-1 rows; OQ-002 records that it reads rows rather than test.md |
| S-5 | "planted defects found, false alarms, questions asked rightly, cost, time, and whether every run of a task gave the same result" | request.md:6 | PASS | bench/lib/tester-measures.mjs:24-29; report `## Tester` table |
| S-6 | "runs through the existing runner and report ... with a dry run that prints the planned total and a spending cap" | request.md:7 | PASS | `run.mjs --tasks kind:tester --dry` prints six rows and "planned $60.00" (I ran it); runRefusal and the ledger apply unchanged |
| S-7 | "the comparison against a saved baseline has a check that fails on a worse result" | request.md:8 | PASS | bench/report.mjs:212; baseline vs worse exits 1 with "defects found fell", baseline vs itself exits 0 (I ran both) |
| S-8 | "Out of scope: changing the default of the setting `testing` ... any change to the tester's behaviour. No paid run" | request.md:10 | PASS | no change to agents, skills or testing src; no results file added by this item |

Alignment: PASS (21 criteria; T-2.8 deferred as the plan says)
Decisions: HONOURED
Regression: 2 unrequested behaviour changes. (1) bench/selfcheck.mjs:12 now expects fast-18-router-refactor's hidden tests to pass on the unmodified fixture, because those tests pin today's behaviour. That expectation is correct and T-1.5 needs it. (2) test/repo/markdown-paths.test.mjs:9 no longer scans bench/seeds/, because the seed designs that D-001 requires cite fixture paths. Both are reported in the phase 1 block, and neither hides a defect.
Sources: none
Questions: none
Findings: 0 critical, 0 major, 5 minor
- [Minor] bench/run.mjs:118: the check that a plugin directory exists runs only after the paid session. `--harness trunk --tasks test-01-negative-quantity` spends up to the $10 task budget, then exits 1 with no record and no spend.log line. Refuse tester tasks without `adapter.pluginDir` in `main` before the loop.
- [Minor] bench/selfcheck.mjs:36: "defect live" is any key run that is not green. A key test that fails to load (suitesFailed > 0) is also counted as a live defect. Require `failed > 0 && suitesFailed === 0`.
- [Minor] bench/lib/tester-stop-hook.mjs:28: if stdin cannot be parsed, the hook gives no denial, so the run continues into the fix round (fail open). This copies the pattern of ask-probe-hook.mjs:31. Deny, or write to stderr, when the input is not JSON.
- [Minor] work/20261118-planted-defect-benchmark-measures-the-tester/order.md:178: the table says test-01 stores a negative quantity and answers 201. The seed actually stores it and then answers 500, because computeTotals throws (bench/fixture/src/domain/pricing.ts:16). The key's 400 still shows the defect, and showsDefect matches any case holding the POST, so grading is unaffected. Record the 500 in the plan.
- [Minor] test/repo/markdown-paths.test.mjs:9: this file is outside every phase's touch set. The change is needed and reported, but the plan did not list it.
Classes: none
Checked: ran the six changed bench test files and instep.test.mts (45 and 8 pass), `node bench/selfcheck.mjs` (exit 0, all six tester seeds as T-1.5 states), T-1.1 env check, the T-2.7 dry run, and the T-3.4/T-3.5 report checks (exit 1 and 0). The base a993b62b holds exactly the 18 ids pinned in T-1.6. The grader's step and row fields match src/lib/shared/scenarios/format.mts:27-28 and results.mts:19-36. RISK-006's limit recomputes to 0.222. Mutation killed; silenced empty.

APPROVED
