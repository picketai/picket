Fix the open gaps found while running today's three work items:
1. A teammate that stops without a valid verdict token alone on its last line is not caught: route.verdict records nothing and the kernel waits silently (seen twice in 20261109-stop-admit-misrouting-on-incidental-keywords: a crosscheck reply with ALIGNED on the first line, and a cumulative reply with a sentence after APPROVED). The stop must be bounced back to the agent naming the expected token, so no lane stalls without a sign.
2. picket admit: CHANGE_VERBS in src/lib/shared/admission/signals.mts lacks "create", so "Check whether the CSV export works and create a test for it." answers research instead of order. A review-only request that names an irreversible step or a migration ("See if we can drop table legacy_users safely.") must keep the heavy lane it had before the research rule. The admit-labelled corpus pins both.
3. The status pane's Cleanup tab (cleanupOf in src/mods/status/hooks/work-pane.ts) lists sessions that are still live; it must leave out a live session using the shared isProjectSession rule.
4. The gate packet shows tests and lint as "not reported" when the developer's block has no Tests: or Lint: line even though picket check passed; the packet must show the logged check result for the phase in that case.
5. Restore the space in src/lib/hooks/route/verdict/index.test.mts:453 (`REVIEWING_SKILL =new URL` to `REVIEWING_SKILL = new URL`).

## Brief
purpose: Fix the gaps found while running today's three work items: unbounced missing verdicts, two admit misroutes, live sessions in the Cleanup tab, blank tests and lint in the packet, and one whitespace slip
in scope: route.verdict and guard hooks for missing verdict tokens; src/lib/shared/admission signals and corpus; cleanupOf in src/mods/status/hooks/work-pane.ts; gate packet rendering of tests and lint; src/lib/hooks/route/verdict/index.test.mts:453
out of scope: R-016 close order, R-017 wall time, worktrees outside .worktrees/, the bench run (all await the user's decision); admit reading quoted examples and the word token as heavy signals; developer agent habits
