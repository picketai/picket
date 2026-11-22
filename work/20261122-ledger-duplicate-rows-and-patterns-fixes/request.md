Fix four things left after work item 20261122-ledger-failed-tool-calls-and-patterns-report.

1. The ledger holds two or three subagent_stop rows for a single agent turn. Example: the developer's phase 2 of that item has rows at 2026-11-22T18:12:53.936Z (model "<synthetic>", failed_tool_calls 2), 18:12:59.376Z and 18:13:06.557Z, all with verdict PHASE DONE and tool_calls 136; the reviewer has two APPROVED rows at 18:17:23.843Z and 18:17:28.393Z. picket cost and picket patterns then count one turn more than once. Find why and make one agent turn give one turn row, or make the readers count it once.

2. In src/lib/verbs/patterns/index.mts the reason key splits on ". " inside "e.g. rm", so the 66-row guard.bash group is keyed "command contains a destructive sub-command (e.g". Do not split after a one-letter segment, and update the test in src/lib/verbs/patterns/index.test.mts that pins the cut.

3. patterns sits out of alphabetical order in src/lib/verbs.mts and src/lib/cli/registry.mts; move it after packet in both, and let docs/reference/cli.md follow.

4. The last test in src/lib/verbs/patterns/index.test.mts ends with "});});" on one line; put the closing "});" on its own line.

## Brief
purpose: Make the ledger counts reliable: one agent turn counted once, and the patterns report's keys and listing cleaned up after the cumulative review
in scope: duplicate subagent_stop turn rows and how picket cost and picket patterns count them; the reason key cut at e.g. in picket patterns; the alphabetical place of patterns in the verb tables and the CLI reference; the test file's closing line
out of scope: new report sections; changes to guards, routing or instructions; rewriting rows already in the ledger
