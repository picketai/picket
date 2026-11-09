## Review: 20261108-fix-25-failing-status-mod-tests · cumulative

Approved: the 14-line test-only change fixes the shared root cause of all 25 failures, and the npm test blocker the developer reported (an unstaged architect memory citation) is gone on re-run.

Requirements: PASS (4)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Fix the 25 failing status tests" | request.md:1 | PASS | `claude plugin test dist`: 130 pass, 0 fail (before: 105/25) |
| S-2 | "Make every npm test step pass again" | request.md:4 | PASS | mods 130/0; test/repo/markdown-paths.test.mjs 6/0 re-run now |
| S-3 | "Find why the 25 tests ... fail ... and fix the cause, in the tests or in the status mod code." | request.md:5 | PASS | src/mods/status/hooks/index.test.tsx:216-220, handlers at :297, :313, :329, :336 |
| S-4 | "out of scope: Status mod behaviour changes beyond what the fix needs; the markdown mod; other mods or verbs." | request.md:6 | PASS | `git diff --name-only 8583b01 -- src` names only the test file |
Alignment: PASS (T-1.1 to T-1.5; T-1.6 DEFERRED: QA, release QA pass on a Windows host)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: dist test file matches src at HEAD (the only difference is the build's theme import depth). The T-1.4 expect/test diff grep prints nothing. CONFIG, PROJECT, START.cwd and session.root keep their base values (index.test.tsx:9, :19, :222-223, :311). `fixturePath` returns a path without the D:/ marker unchanged (Math.max(-1, 0)). No exported symbol changed. No comments or tests added. I did not run the full npm test: T-1.2 rests on the developer's step results plus my re-run of the one step that failed.

APPROVED
