## Review: 20261122-ledger-failed-tool-calls-and-patterns-report · cumulative

Approved: the change does everything the request asks, every T-N.x criterion holds, and the three findings are all Minor.

Requirements: PASS (7)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Add the failed tool call count ... to the turn row" | request.md:3 | PASS | src/lib/hooks/emit/ledger/index.mts:62, src/lib/shared/transcript/turn.mts:68; test T-1.1 |
| S-2 | "and the tool names behind it" | request.md:3 | PASS | src/lib/hooks/emit/ledger/index.mts:63; tests T-1.1, T-1.4 |
| S-3 | "blocks, bounces and guard denials grouped by hook and reason" | request.md:5 | PASS | src/lib/verbs/patterns/index.mts:47 (guard denials are written to the ledger as block rows, src/lib/hooks/run-hook.mts:35) |
| S-4 | "the user's rejection reasons from the x replies in replies.jsonl" | request.md:5 | PASS | src/lib/verbs/patterns/index.mts:72; test T-2.3 |
| S-5 | "the failed tool calls of item 1 grouped by agent and tool" | request.md:5 | PASS | src/lib/verbs/patterns/index.mts:60; test T-2.2 |
| S-6 | "It changes no state" | request.md:5 | PASS | src/lib/verbs.mts:49 sets `readOnly: true`; test T-2.4 compares the files byte for byte |
| S-7 | "names the recurring patterns" | request.md:5 | PASS | src/lib/verbs/patterns/index.mts:12,39 (`MIN_ITEMS` is 2, counted over distinct work items) |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 3 minor
- [Minor] src/lib/verbs/patterns/index.test.mts:77: the reason key splits on ". " inside "e.g. rm". On this ledger the second largest group (66 rows) is therefore keyed "command contains a destructive sub-command (e.g", and the test pins that cut. RISK-003 covers it and the key is still readable. Not splitting after a one-letter segment would keep the whole clause.
- [Minor] src/lib/verbs.mts:49: `patterns` comes before `packet` here, and in src/lib/cli/registry.mts:29 it sits between `list` and `migrate`. Both tables are otherwise alphabetical, and docs/reference/cli.md takes its order from them. Move it after `packet` in both.
- [Minor] src/lib/verbs/patterns/index.test.mts:112: the last test ends with `});});` on one line. Put the final `});` on its own line.
Classes: none
Checked: the `turnFailures` turn boundary on user entries that carry tool results; a failed result whose tool use is outside the window counts as `unknown`; `REJECT_REPLY` is the same regex as at base; `test/cli/cost.test.mjs` and `src/lib/verbs/reply/index.test.mts` are unchanged and pass (54 tests over the changed and pinning files, exit 0); on the real ledger `picket patterns` prints JSON with all three sections and `--human` prints all three headers; every `replies.jsonl` row on disk has a string `reply`.

APPROVED
