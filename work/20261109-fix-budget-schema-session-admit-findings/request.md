Fix four findings from research 20261109-consistency-determinism-performance-since-alpha-:
1. R-001: the CLAUDE.md budget is 2048 bytes. Trim CLAUDE.md (2352 bytes) and src/templates/claude-block.md in step by at least 304 bytes, and set claude_md_bytes in test/timing/budgets.test.mjs to 2048.
2. R-014: remove the stale cost_usd field from bench/schema/ledger-v2.schema.json; the ledger no longer writes it.
3. R-009: one live-session rule in the kernel (liveSessionIds in src/lib/shared/host-sessions.mts) and the status mod (liveSessions in src/mods/status/hooks/session-files.ts): a session counts when its cwd is the project root or one of the project's worktrees; a session in any other directory does not count.
4. R-015: picket admit answers fast when a request names 1 to 3 existing files (mentionedPaths) and passes no --touched, taking those files as the touch set; a request naming no file stays pending. The numbered-items rule stays. The admit-labelled corpus and lane tests pin both cases.

## Brief
purpose: Fix the four accepted findings R-001, R-014, R-009 and R-015 from research 20261109-consistency-determinism-performance-since-alpha-
in scope: CLAUDE.md and src/templates/claude-block.md, test/timing/budgets.test.mjs, bench/schema/ledger-v2.schema.json, liveSessionIds and liveSessions, picket admit fast/pending rule with corpus and lane tests
out of scope: R-010, R-012, R-013 (no change); R-016, R-017 (undecided); the bench run
