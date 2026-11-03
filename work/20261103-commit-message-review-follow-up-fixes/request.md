Three small fixes to the commit-message change: 1. the gate packet puts each repo's commit subject on its own line instead of cutting it to the room left after the checkout dir (src/lib/verbs/packet/packet.mjs:95); 2. phaseCommitMessage in src/lib/shared/route/commit.mts:50 uses blockCommitProblem from src/lib/shared/commit-message.mts instead of its own copy of the missing-line text and parse-then-check steps; 3. the close subject lowercases the first letter of the item title (`chore: close commit messages share one checked shape`).

## Brief
purpose: The gate shows each commit subject whole, one copy of the block commit check, and close subjects read like the rest.
in scope: Packet commit lines: each repo's subject on its own line, never cut; phaseCommitMessage built on a shared block check in commit-message.mts; close subject lowercases the title's first letter unless the first word is an acronym.
out of scope: Any other change to the commit shape, guard.block or route.verdict behaviour.
