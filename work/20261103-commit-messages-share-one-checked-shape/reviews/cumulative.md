## Review: 20261103-commit-messages-share-one-checked-shape · cumulative

Approved: every Picket commit path now goes through checkCommitMessage, and tests pin the bounce, the refusal and the title-based close message. Two minor findings remain.

Requirements: PASS (6)
Alignment: PASS (23)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 2 minor
- [Minor] src/lib/verbs/packet/packet.mjs:95: repoLines cuts the subject to the room left after the checkout dir, so with a nested dir like `src/Orders/.worktrees/RMS-12` (58 characters of room) a 68-character subject shows as `feat(pricing): read the rate from the tariff table for ev…`. S-3 asks for "the exact message the approval will commit". Fix: wrap the subject or put it on its own line instead of cutting it.
- [Minor] src/lib/shared/route/commit.mts:50: phaseCommitMessage repeats the "no Commit: line" problem text and the parse-then-check steps of blockCommitProblem (src/lib/shared/commit-message.mts:41). The packet and the approval therefore have their own copy, apart from the hooks' copy that D-004 shares.
Classes: none
Checked: route.verdict skips only when guard.block bounces (same readHeading index, same stop_hook_active gate). Approval with a bad or missing Commit: line drops the marker, the verdict row and the commit in every repo. close checks the message before markDone. An empty title still gives the valid `chore: close`. CRLF bodies normalise. Mutation was killed. silenced is empty. The summary's src/mods/status/hooks/pane-actions.test.ts is staged by another item and is not in 3b7f862..HEAD.

APPROVED
