## Review: 20261118-mock-format-stub-server-data-catalog · checkpoint

Phases 1 to 5 are approved: every criterion has evidence, and I found no Critical or Major finding.

Alignment: PASS (T-1.1 to T-1.5, T-2.1 to T-2.6, T-3.1 to T-3.6, T-4.1 to T-4.5, T-5.1 to T-5.5; T-2.7 is DEFERRED to QA by the plan)
Decisions: HONOURED
Findings: 0 critical, 0 major, 2 minor
- [Minor] src/lib/shared/mocks/stub.mts:106: `readTraffic` reads an unreachable stub as an empty log. If the before-read fails and the after-read succeeds, `trafficBetween` counts the whole earlier log as that run's traffic, gaps included. A false gap then makes `classify` refuse `product`. Fix: when the before-read fails, skip the stub for that run rather than treating its log as empty. Likelihood is low.
- [Minor] src/lib/shared/mocks/stub-server.mjs:5 and src/lib/shared/mocks/definition.mts:11: the `/__picket/` prefix and the `*` whole-segment rule are copied in the standalone program and the reader, and must stay equal by hand (Rf8). Nothing pins the stub's own prefix. Fix: a test that fails when the two prefixes differ.

Checked:
- **Scratch build:** I ran tsc, the unit tests and the budgets test on `git archive HEAD` (df394fee), not the working tree. The working tree holds uncommitted phase 6 work (`6.idle`). tsc was clean and 450 of 450 unit tests passed. The budgets test failed only for lack of a `dist` build in the scratch copy, and passed after building there.
- **Line budgets:** `stub-server.mjs` is 81 lines against 100, and `stub.mts` is 128 against 150, both the next multiple of 50 as D-008 says.
- **Drives:** T-1.5 printed `E12 fraud-mock` and T-5.5 printed `E13 open-order`. I read the shell's `exit 0` as the exit of its `tail`, not the picket exit code, so exit 2 is not confirmed.
- **Removed guards:** the direct `staticFindings` calls in `check.mts`, `start.mts` and `trial.mts` now go through `environmentStubs`, which keeps them. `base-run.mts` gains a new refusal on E12 and static errors. No other caller of `staticFindings` remains.
- **Comments and silenced checks:** the added lines hold no comments, skipped or focused tests, or suppressions.
- **Old rows:** result rows written before these phases read as no mocks and no gaps. T-3.4's test compares case line, report and derived verdict for a row with and one without `gaps`.
- **Not checked:** no live-container behaviour, which the plan defers to QA.

APPROVED
