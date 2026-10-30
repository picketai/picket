## Review: 20261030-bench-out-of-the-product-capped · cumulative

CHANGES REQUIRED: the new spend cap fails open when `--budget-usd` is 0, negative or not a number, so a real run can start with no total cap and no per-call cap.

Requirements: PASS (10)

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "drop benchmarking from src/.claude-plugin/plugin.json" | request.md:1 | PASS | src/.claude-plugin/plugin.json:6 (entry removed) |
| S-2 | "remove src/skills/benchmarking/" | request.md:1 | PASS | deleted in 58bdcef; plugin-layout.test.mjs count 16 |
| S-3 | "move its docs entry from docs/reference/skills.md to CONTRIBUTING.md" | request.md:1 | PASS | CONTRIBUTING.md:158; row and section gone from docs/reference/skills.md |
| S-4 | "bench/run.mjs refuses a real run without --max-usd" | request.md:1 | PASS | bench/run.mjs:310, bench/lib/spend.mjs:23 |
| S-5 | "or with planned spend over it (budget times runs still to do, resumed runs not counted)" | request.md:1 | PASS | bench/lib/spend.mjs:7-16, :24 (valid budgets only; see the Major finding) |
| S-6 | "printing the dry list and total" | request.md:1 | PASS | bench/run.mjs:308 runs before both the dry return and the refusal |
| S-7 | "unit tests for refused, over cap, at cap and resumed" | request.md:1 | PASS | bench/test/spend.test.mjs:10, :15, :21, :26 |
| S-8 | "the routing case asserts no plugin skill claims a bench prompt" | request.md:1 | PASS | test/repo/descriptions.test.mjs:59 |
| S-9 | "UNCONVERTED_SKILLS becomes empty" | request.md:1 | PASS | test/repo/skills.test.mjs:23 |
| S-10 | "the budget test also scans .claude/skills/" | request.md:1 | PASS | test/timing/budgets.test.mjs:25, :58-59 |

Alignment: PASS (11)
Decisions: HONOURED
Regression: none (the `--dry` output shape and its read of `--out` are mandated by D-002 and listed as RISK-002; `taskBudget` keeps the base expression `budget ?? task.budget_usd ?? 10`)
Sources: none
Questions: request.md:5 "cap every real run": `maxBudgetUsd` applies to each `runClaude` call, and a run makes up to `max_stops + 1` calls (bench/run.mjs:171, bench/lib/claude.mjs:56). One gate-14 run ($22 budget, 10 stops) can therefore spend up to $242 while the plan counts $22. The request fixed the formula as budget times runs, so this is not a code finding. Is a planned cap, rather than a hard bound, what was meant? Line 54 of the refactor note says the total cap holds, and this contradicts it.
Findings: 1 major, 1 minor
- [Major] bench/lib/spend.mjs:4: `taskBudget` accepts any `--budget-usd` that `Number` produces (bench/run.mjs:32). I checked it with node. With `NaN`, `0` or `-5`, `plannedSpend` totals `NaN`, `0` or `-10`, and `spendRefusal(1, total)` and `spendRefusal(0, total)` both return `null`. Then `claudeArgs` drops `--max-budget-usd` for `0` and `NaN`, because bench/lib/claude.mjs:56 tests truthiness. Failure scenario: `node bench/run.mjs --tasks all --runs 5 --max-usd 10 --budget-usd` (the value was forgotten) passes the guard and runs every task five times with no per-call cap. That defeats D-3 ("the cap is code"). The fix: refuse a real run when `budgetUsd` is not a finite positive number, or when `total` is not finite, and add one test case for each. Likelihood: low. Leave it: a mistyped `--budget-usd` bypasses `--max-usd`; pass a positive number by hand.
- [Minor] bench/README.md:60: the README says a refused run stops "before anything is built or written". But `buildTemplate` (bench/run.mjs:303) runs first and can `npm install` into `bench/.cache`. D-002 names only `adapter.build`, `mkdirSync` and `save()`, and the code honours that. Fix: make the sentence say "before the harness is built or the results file is written".
Classes: Se4
Checked: `--max-usd` with no value (`NaN`, refused), a cap at the exact float total (passes, whole-cent compare), resume skip parity between `runsToDo` and the run loop's `existing.records.find`, leftover `benchmarking` references under src/, docs/ and test/ (none), and `bench/test/*.test.mjs` running in `npm test` through scripts/test.mjs:7. The mutation was killed.

CHANGES REQUIRED
