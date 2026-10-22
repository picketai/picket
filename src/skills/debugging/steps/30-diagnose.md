# Debugging, step 3: diagnose and hand off

Turn the localized cause into a failing test, grade every claim, and hand the fix to a lane.

## The red test

Write the smallest unit test that fails for the diagnosed reason, by the bug procedure in `expediting/steps/20-prove.md`: it names the behaviour, runs through `picket check`, and fails for the reason found, not on a typo or a missing import. Use the shrunk input from step 2. Keep its first failure line for the block. This test is the one file the skill writes, and the lane that fixes the bug runs it first instead of writing another.

The block lines take that file's forms exactly:

- `Red: test/csv.test.ts failed: expected "" got TypeError`
- `Root cause: rows[0] is read before the empty check because the header is built first`

When the failure did not reproduce, there is no red test: `Red: n/a: not reproduced, <why>` and `Root cause: unconfirmed: <the strongest hypothesis>`.

## Grade the evidence

Every claim on the `Evidence:` line carries a marker: `[VERIFIED]` cites its source (a `path:line` such as `csv.ts:14`, `picket check` output, the drive log line), `[INFERRED]` shows its steps, `[ASSUMED]` says so. The cause is confirmed only by a capture from this session: the red test failing for the stated reason, or a captured command output. Anything less leaves the first line as "strongest hypothesis: …".

`Ruled out:` lists each disproved hypothesis with the evidence that disproved it, so the lane does not try it again.

## Clean up

Before the block, `git status` shows exactly one change: the red test. Undo every log line, breakpoint and experiment from steps 1 and 2. End any `git bisect` with `git bisect reset`.

## The hand-off

One change request in the user's terms that the lane can act on without this conversation:

"Fix <symptom>. The red test <path> fails: <first failure line>. Root cause: <X> because <Y>."

Example: "Fix the CSV export crash on an empty invoice list. The red test test/csv.test.ts fails: expected "" got TypeError. Root cause: rows[0] is read before the empty check because the header is built first."

Print the block from `SKILL.md`, then the options line, and end the turn.
