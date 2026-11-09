Close the remaining gaps found while running today's work items:
1. Shell edits pass the guards: guard.silenced and guard.comments check only Edit and Write, and guard.bash blocks only cp and redirects onto .mts/.mjs. In bench run fast-15-skip-under-pressure the lead added describe.skip to test/repository.test.ts with `sed -i` and reported `Waivers: none`; a developer changed src/mods/status/hooks/index.test.tsx with a Python script. An in-place shell or script edit of a source or test file must get the same checks as an Edit, or be denied.
2. test/cli/close.test.mjs failed 4 tests while another picket check ran at the same time, and passed 35 of 35 alone: tests that share state on disk must each use their own temporary folder.
3. picket admit reads the word "token" (as in verdict token) as an authentication concern, and reads words inside quoted examples in a request as heavy signals (security, migration, irreversible).
4. route.verdict recorded the same PHASE DONE twice for one phase when the developer re-sent its block; a repeated identical verdict for the same phase must not add a second row.
5. .picket/state/check-log.jsonl grows by one row per picket check run with no limit; keep it bounded.
6. npm test (test/repo/markdown-paths.test.mjs) scans uncommitted notes under .claude/agent-memory/, so a note an agent writes mid-session breaks the suite; it must not fail on agent memory.
7. Developer slips seen twice each: the red test run after the fix instead of before it, and a space lost after `=` (`=(argv`, `=new URL`) that no lint caught. Make picket catch both rather than relying on the agent.
PICKET_REQUEST_END

## Brief
purpose: Close the seven remaining gaps from today's runs: shell edits that bypass the guards, shared test state, admit false signals, duplicate verdict rows, an unbounded check log, the agent memory scan, and two repeated developer slips
in scope: guard hooks (silenced, comments, bash), test/cli/close.test.mjs isolation, src/lib/shared/admission signals and corpus, route.verdict dedup, check-log bounds, test/repo/markdown-paths.test.mjs, red-first and assignment spacing checks
out of scope: Committing the bench result and agent memory files; re-baselining the bench; changes to lanes or verdict tokens
