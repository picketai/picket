# Holding the bar (always loaded)

These rows check that the change did not lower the bar the project's checks set: no suppression, skipped or focused test, deleted test or weaker threshold went in without the user's waiver. They run at every size, and the cumulative review loads them with `10-alignment.md`'s floors, because a one-line `it.skip(` is enough to hide a broken feature.

The kernel computes the evidence. The summary's `silenced` list holds one entry per move since the work item's base: `{ path, kind, text, waived }`, with `kind` one of `suppression`, `skipped-test`, `focused-test`, `threshold`, `deleted-test`. It covers edits the `guard.silenced` hook never saw: a file written through Bash, a test file deleted. `waived: true` means `picket waive` recorded the user's approval for that path and line (or that deletion) on this item. A pull request range has no item, so every entry there is `waived: false`.

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Sl1 | Unwaived silenced check | The summary's `silenced` list has an entry with `waived: false` | Major |
| Pb1 | Bug or refactor without proof | The phase fixes a defect or reshapes code and its `Red:` line is `n/a`, or the named test does not exercise the changed code | Major |
| Mu1 | Surviving mutant | The summary's `mutation.outcome` is `survived` | Major |
| Pb2 | Symptom fix without cause | The diff adds a retry, null guard, skip or snapshot update and `Root cause:` is `none` | Major |

Report Sl1 as one aggregated Major finding listing each `path`, `kind` and `text`, so a phase with several moves costs one slot. The fix is to restore the check and fix its cause; when the user must accept a move, the developer proposes it on its block's `Waivers:` line. Mu1 cites the mutant's `path:line` and its `from -> to`, with the fix "add a test that fails when `<from>` becomes `<to>`": the tests passed with that operator inverted, so nothing pins the line. Any other outcome (`killed`, `no candidate`, `no test command`, `error`, or no `mutation`) is no finding. `baseline red` means the suite already failed before any mutant was written, so nothing was spot-checked: say so on the `Checked:` line. Pb1 and Pb2 read the developer's block (`work/<id>/phases/<n>.block.md`) against the diff. For Pb1, a refactor's characterization test must pin the behaviour the diff reshapes, and a bug's red test must call the changed code; open the test and check. Report each per phase. A waived entry is never a finding, but read it: a waiver for a line that hides a defect the phase introduced is still a Critical or Major under the row that defect breaks.
