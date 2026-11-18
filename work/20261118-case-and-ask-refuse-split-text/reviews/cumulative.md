## Review: 20261118-case-and-ask-refuse-split-text · cumulative

Approved: both parsers now refuse extra words before any read or write. The four new tests fail on the base and pass at the head, and nothing outside the request changed behaviour.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Make both answer a usage error and save nothing." (case, unquoted --intent) | request.md:1 | PASS | src/lib/verbs/test/case.mts:64-65; run from src, the CLI exits 1 with the case usage |
| S-2 | the same sentence for ask, unquoted --question or --basis | request.md:1 | PASS | src/lib/verbs/test/ask.mts:45-46; record.test.mts "ask's parse refuses a question or a basis the shell split into words" |
| S-3 | "Change the ask usage ... to show --question "<text>" and --basis "<text>" in double quotes." | request.md:1 | PASS | src/lib/verbs/test/ask.mts:11; docs/reference/cli.md:404 |
| S-4 | "Reword src/skills/testing/steps/results.md line 3" | request.md:1 | PASS | src/skills/testing/steps/results.md:3 |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 1 minor
- [Minor] src/lib/verbs/test/case.test.mts:17: `UsageError` has its own import line from `../../util/args.mts`, but line 16 already imports `parseArgs` from that module. Merge them into one import.
Classes: none
Checked: In a scratch copy with the base `case.mts` and `ask.mts`, 4 of the 33 tests in the three test files fail; all 33 pass at dc4007cb. So the block's `Red: n/a` is not a Pb1 finding. Run from src, the unquoted `test case` and `test ask` exit 1 with their usage, and the quoted forms still pass the parse and stop at the item check (exit 2). numstat shows only `results.md` changed under src/skills (1 added, 1 removed), and the docs.test "what git has" passes. Every other caller of `test case` and `test ask` passes one word or quoted text. `dist/bin` on disk is stale, so I ran the verbs from src. The mutation check found no candidate.

APPROVED
