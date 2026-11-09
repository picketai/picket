## Review: 20261109-fix-budget-schema-session-admit-findings · cumulative

APPROVED: the amended T-2.4 matches the code and its test, and every requirement and criterion passes.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Trim CLAUDE.md (2352 bytes) and src/templates/claude-block.md in step by at least 304 bytes" | request.md:2 | PASS | CLAUDE.md went from 2352 to 2022 bytes and the template from 1927 to 1597; CLAUDE.md still starts with the template byte for byte (cmp) |
| S-2 | "set claude_md_bytes in test/timing/budgets.test.mjs to 2048" | request.md:2 | PASS | test/timing/budgets.test.mjs:15 |
| S-3 | "remove the stale cost_usd field from bench/schema/ledger-v2.schema.json" | request.md:3 | PASS | the parsed schema equals the base schema with properties.cost_usd deleted |
| S-4 | "one live-session rule in the kernel (liveSessionIds ...) and the status mod (liveSessions ...)" | request.md:4 | PASS | host-sessions.mts:33 and session-files.ts:43 both call isProjectSession |
| S-5 | "a session counts when its cwd is the project root or one of the project's worktrees; a session in any other directory does not count" | request.md:4 | PASS | live-session.mts:12-19 and its tests |
| S-6 | "picket admit answers fast when a request names 1 to 3 existing files (mentionedPaths) and passes no --touched, taking those files as the touch set" | request.md:5 | PASS | lane.mts:50; the T-3.1 cases in lane.test.mts |
| S-7 | "a request naming no file stays pending" | request.md:5 | PASS | lane.mts:49; the missing-file test in admit/index.test.mts |
| S-8 | "The numbered-items rule stays." | request.md:5 | PASS | lane.mts:71; the T-3.4 test in admit/index.test.mts |
| S-9 | "The admit-labelled corpus and lane tests pin both cases." | request.md:5 | PASS | the exact test in admit-labelled.test.mts; the corpus has 26 fast and 4 pending entries out of 134 |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-5: a worktree outside a `.worktrees/` folder does not count as live (OQ-001, fallback "no"). Please confirm with the user.
Findings: clean
Classes: none
Checked: T-2.4 at design.md:184 now matches the pane test: it expects the exact toast, no write to the worktree session's transcript, and an agent-name record appended for the session in D:/elsewhere. The revision log line at design.md:223 is 26 words. Since the last pass only design.md changed and the staged whitespace fix at index.test.tsx:821 stayed as it was. The silenced list is empty and the mutant was killed.

APPROVED
