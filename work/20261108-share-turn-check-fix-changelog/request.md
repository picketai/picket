Fix two minor findings from the cumulative review of 20261107-plugin-only-install:
1. src/lib/verbs/close/audit.mts:6: TURN_EVENTS and isTurn copy the set and guard from src/lib/verbs/cost/index.mts:33; export them once from src/lib/shared/ledger.mts beside turnTokens and use them in both.
2. CHANGELOG.md:21: the unreleased alpha.6 section says M↓ works "while picket-markdown is installed"; after D-003 (r3) it is hidden when mods.markdown is false. Remove the blank line at CHANGELOG.md:20 that splits the Added list.
The third finding (dist/README.md has no marketplace install line for validate --strict) is left as it is, by the user's choice.

## Brief
purpose: Fix two minor cumulative review findings from 20261107-plugin-only-install.
in scope: Export TURN_EVENTS and isTurn from src/lib/shared/ledger.mts and use them in close/audit.mts and cost/index.mts; fix the stale M↓ wording and the stray blank line in CHANGELOG.md's alpha.6 section.
out of scope: The dist/README.md install line advisory; any other change.
