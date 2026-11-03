## Review: 20261103-commit-message-review-follow-up-fixes · cumulative

APPROVED: the lead's drive in a temporary repo closes T-3.8, and the staged fixes only retitle tests and restore whitespace.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "the gate packet puts each repo's commit subject on its own line instead of cutting it to the room left after the checkout dir" | request.md:1 | PASS | src/lib/verbs/packet/packet.mjs:93-95; test/kernel/packet.test.mjs T-2.1 to T-2.3 |
| S-2 | "phaseCommitMessage ... uses blockCommitProblem from src/lib/shared/commit-message.mts instead of its own copy of the missing-line text and parse-then-check steps" | request.md:1 | PASS | src/lib/shared/route/commit.mts:49 calls checkBlockCommit; blockCommitProblem wraps it at commit-message.mts:45 (D-001) |
| S-3 | "the close subject lowercases the first letter of the item title" | request.md:1 | PASS | src/lib/verbs/close/close.mts:57,72; test/cli/close.test.mjs:113 |
| S-4 | "close subject lowercases the title's first letter unless the first word is an acronym" | request.md:5 | PASS | close.mts:51-54; close/index.test.mts:43 |
| S-5 | "out of scope: Any other change to the commit shape, guard.block or route.verdict behaviour." | request.md:6 | PASS | The scope grew by user ruling: the order.md revision log records D-004 and D-005, and the lead reports the user's main-session answer "yes, include the x: fix too" |
Alignment: PASS (all criteria of phases 1 to 3). T-3.8 rests on .picket/state/scratch/x-reject-drive.log: `picket reply 20261103-drive-reply "x: too long"` exited 0, and the send to picket:developer ends `rejected: too long`. The drive script builds a phase 1 done item in a temporary repo and runs dist/bin/picket.mjs.
Decisions: HONOURED
Regression: 1 unrequested behaviour change
Sources: none
Questions: none
Findings: 0 critical, 0 major, 2 minor
- [Minor] src/lib/hooks/route/verdict/index.mts:122: every agent's stop now routes from the last contract heading, and a `last_assistant_message` that has a heading wins over SendMessage and SubagentHandback payloads (index.mts:103-109). This is the change the Regression line counts, and D-004 asked for it (RISK-003, RISK-004 accepted).
- [Minor] work/20261103-commit-message-review-follow-up-fixes/phases/2.block.md: phase 2 has `Red: n/a` (Pb1). It is demoted because the rewritten T-2.1 expectation cannot pass on base 2788aa4.
Classes: none
Checked: the staged fixes change only titles and spaces: index.mts:9, packet.mjs:105, close/index.test.mts:43 and :49, test/cli/close.test.mjs:113 and :122 now cite T-3.1, T-3.2 and T-3.3 to match the plan. The behaviour checks from the first pass still hold. src/mods/status/hooks/pane-actions.test.ts is staged but belongs to none of this item's commits or fixes, so keep it out of the phase 3 fix commit.

APPROVED
