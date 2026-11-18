Fix three Minor findings in the benchmark before the first paid tester run:
1. bench/run.mjs:118: a tester task on the trunk harness spends its budget, then fails with no record. Refuse it before any spend, or record the failure.
2. bench/lib/tester-stop-hook.mjs:28: the stop hook lets the run continue when its input does not parse. It must end the run instead.
3. bench/selfcheck.mjs:36: a key test that fails to load counts as a live defect. Report a load failure as its own outcome.

## Brief
purpose: Close three Minor findings in the benchmark before the first paid tester run, so a paid run cannot spend with no record, run past the tester's verdict, or misreport a test that failed to load.
in scope: bench/run.mjs (tester task on the trunk harness), bench/lib/tester-stop-hook.mjs (input that does not parse), bench/selfcheck.mjs (key test that fails to load), and their unit tests
out of scope: Any paid benchmark run; bench/README.md; the tester agent and skill; the setting testing; SDR 00004 items TF-006 to TF-009
