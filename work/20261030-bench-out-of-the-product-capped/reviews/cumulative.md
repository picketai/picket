## Review: 20261030-bench-out-of-the-product-capped · cumulative

APPROVED: the earlier Major is fixed, and the new ledger caps actual spend on every `claude -p` call without a hole I could find.

Requirements: PASS (10)
Alignment: PASS (17)
Decisions: HONOURED
Regression: none (`runOnce` now returns `{ record, ledger }`, and its only caller is bench/run.mjs:344)
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: these probes all held.
- **Budget refusal.** `--budget-usd` set to `NaN`, `0`, `-5` or `Infinity` is now refused at bench/run.mjs:321 (`budgetRefusal`, tests at bench/test/spend.test.mjs:21). `--max-usd Infinity` is refused, and a non-finite planned total is refused.
- **Ledger.** `callLimit` returns `null` at 9.996 spent of a $10 cap (it compares whole cents) and returns `0` only when the task budget is 0. No tracked task under bench/tasks/ has a zero budget.
- **Call without a result event.** It is charged its whole limit (bench/run.mjs:195).
- **Cap reached mid-run.** The run breaks out with `terminal = "cap"`, cleanup and the orphan sweep still run, and nothing is recorded (bench/run.mjs:347).
- **Pre-run check.** The check at bench/run.mjs:342 stops the suite before `materializeRun`.
- **README.** The fix for the earlier Minor is in: bench/README.md now says "before the harness is built or the results file is written".

The summary's mutation entry is from 12:59, so it ran before phase 3. It killed a mutant in `runsToDo`, and no mutation covers the ledger code. The ledger is covered only by the three new unit tests.

APPROVED
