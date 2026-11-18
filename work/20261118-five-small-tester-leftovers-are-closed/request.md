Fix five small leftovers from today's tester reviews:
1. src/skills/testing/steps/matrix.md line 3 says each cell gets a case or a note, while step 2 sends a business boundary with no stated outcome to a question. Say that such a cell gets a question.
2. src/skills/testing/steps/cases.md line 5 names the flag as --intent <words> unquoted; show it quoted, as its example does.
3. The usage of picket test ask (src/lib/verbs/test/ask.mts) shows --default <choice> unquoted; show it quoted, since a choice with spaces needs quotes.
4. src/lib/verbs/test/case.test.mts imports UsageError on its own line from the module the line above already imports from; merge the two imports.
5. bench/report.mjs keeps its own copy of the tester kind constant; import the one bench/lib/tasks.mjs exports.

## Brief
purpose: Close the small wording and duplication leftovers the three tester reviews of 2026-11-18 named, so the step files, the ask usage and the bench report agree with the code.
in scope: src/skills/testing/steps/matrix.md line 3 and cases.md line 5; the usage in src/lib/verbs/test/ask.mts and docs/reference/cli.md by regeneration; the import in src/lib/verbs/test/case.test.mts; the constant in bench/report.mjs; tests that pin these
out of scope: Any change in what a verb accepts or refuses; the bench grader and keys; any paid benchmark run; the setting testing
