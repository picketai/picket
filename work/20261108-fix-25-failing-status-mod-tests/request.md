Fix the 25 failing status tests: `claude plugin test dist` fails 25 status pane and band tests in src/mods/status/hooks/index.test.tsx (T-2.x to T-6.5) on Claude Code 2.1.319. They also fail at 2646b20, before 20261107-plugin-only-install, so they predate it (OQ-008 in that item's design record; its deferred T-7.5 waits on this fix). Make every npm test step pass.

## Brief
purpose: Make every npm test step pass again by fixing the 25 status pane and band tests that fail on Claude Code 2.1.319.
in scope: Find why the 25 tests in src/mods/status/hooks/index.test.tsx fail on Claude Code 2.1.319 and fix the cause, in the tests or in the status mod code.
out of scope: Status mod behaviour changes beyond what the fix needs; the markdown mod; other mods or verbs.
