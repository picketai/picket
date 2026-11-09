Fix the three minor findings from the cumulative review of 20261107-plugin-only-install:
1. src/lib/verbs/close/audit.mts:6: TURN_EVENTS and isTurn copy the set and guard from src/lib/verbs/cost/index.mts:33; export them once from src/lib/shared/ledger.mts beside turnTokens and use them in both.
2. CHANGELOG.md:21: the unreleased alpha.6 section says M↓ works "while picket-markdown is installed"; after D-003 (r3) it is hidden when mods.markdown is false. Remove the blank line at CHANGELOG.md:20 that splits the Added list.
3. dist/README.md: the README copied into dist makes `claude plugin validate --strict dist` print an advisory about a missing marketplace install line; make the advisory go away.
