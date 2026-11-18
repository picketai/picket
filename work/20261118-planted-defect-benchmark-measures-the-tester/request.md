Add the planted-defect benchmark that measures the tester (SDR 00004, D-012 and TF-005; artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md). It lives in Picket's own repository under bench/, never in a user's project.

1. The benchmark fixture (bench/fixture) grows to a small system with a test environment in the standard shape (.picket/env/, Compose), so the tester runs against a real stack.
2. Each task holds a story (the request), a finished implementation with one known mistake, and a hidden answer key the tester cannot read. Three kinds of task: a planted defect; a trap, where a correct implementation looks suspicious and the right result is no failure; and a silent story, where the request leaves a business rule open and the right result is a question.
3. Code grades the report the kernel generates against the answer key, by request and status. No model grades anything.
4. The benchmark reports: planted defects found, false alarms, questions asked rightly, cost, time, and whether every run of a task gave the same result.
5. It runs through the existing runner and report (bench/run.mjs, bench/report.mjs) with a dry run that prints the planned total and a spending cap, as the other benchmark tasks do.
6. A change to the testing skill is kept only if the numbers are not worse: the comparison against a saved baseline has a check that fails on a worse result.

Out of scope: changing the default of the setting `testing` (it stays `design`; the user decides after reading the first measured results), the mock format and stub server (TF-006), the database guards (TF-007), known defects (TF-008), the browser adapter (TF-009), and any change to the tester's behaviour. No paid run is part of this item: a real run happens only on the user's word with the cap they name.

## Brief
purpose: Measure the tester's catch rate, false alarms and cost with tasks whose answers are known, so the default of the testing setting rests on numbers.
in scope: A benchmark fixture system with a standard test environment, planted-defect, trap and silent-story tasks with hidden answer keys, a code grader over the kernel's report, the measures in the runner and report, and a comparison check against a saved baseline.
out of scope: Changing the testing setting's default, any paid run, the mock format and stub server (TF-006), database guards (TF-007), known defects (TF-008), the browser adapter (TF-009), and any change to the tester's behaviour.
