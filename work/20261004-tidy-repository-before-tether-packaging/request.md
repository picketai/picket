Tidy the repository: step 1 of the Tether packaging plan (https://claude.ai/artifact/QyPJqATUoenwE4Cdc3R5km, roadmap). Done when `npm test` is green, including a new test that every backticked path in Markdown exists.

1. Fix `package.json`: it points at a missing `index.js` and three missing scripts.
2. Remove stale references, for example `output-styles/custom.md` describing `inject.prose.mjs`, a hook that does not exist.
3. Correct the README counts: it says nine hooks and four rules where there are ten and five.
4. Write the repository conventions down.
5. Add a test that every backticked path in Markdown exists.
6. `test/kernel/review.test.mjs:94` asserts that the gitignored `.claude/branching/manifest.yaml` exists, so `npm test` fails in any fresh worktree.
7. `harness admit` sent a request that named itself "a research work item" to the order lane: the research pattern at `.claude/lib/admit.mjs:18` does not match the word "research".
8. `harness admit` sent a one-line heading rename to the design lane because the request said "verdict token": the security pattern at `.claude/lib/admit.mjs:19` matches any "token".
