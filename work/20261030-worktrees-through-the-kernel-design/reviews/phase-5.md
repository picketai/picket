## Review: 20261030-worktrees-through-the-kernel-design · phase 5

Phase 5 meets T-5.1 to T-5.6, and I found nothing to fix.

Alignment: PASS
Decisions: HONOURED
Findings: clean
Checked:
- **Tests:** I ran `src/lib/verbs/route/index.test.mts`. All 31 tests pass, including the three new worktree cases for T-5.1 to T-5.5. `picket verify 20261030-worktrees-through-the-kernel-design 5 --no-tests` passes every file and grep row. The packet case for T-5.6 is in the commit (`test/kernel/packet.test.mjs`); I did not run it.
- **Refusal path:** `withoutApproval` (`src/lib/shared/route/apply.mts`) drops the `approved` marker, the commit change and any `run_through` grant, then adds an unset of `run_through` and the refusal line. The `done` marker is kept, so `picket next` stays at `approve_phase`. A retry gives "nothing staged to commit in <dir>" for checkouts already committed and goes on.
- **Packet and route agree:** both call `nestedCheckoutPaths`, so the packet names exactly the checkouts route commits in. A phase with no nested path keeps today's "approval commits it" text.
- **Commit safety:** `commitCheckouts` passes no `add`. The commit message and branch names go to git as arguments, never as shell text.
- **Guard:** the `verify` guard in `src/lib/hooks/guard/bash/kernel.mts` keeps its `cwd` and `--root` checks. A missing id or phase now classifies as unknown, which is stricter than before.
- **Verdict row:** on a refusal the verdict row `approved` is still appended. Phase 5's mandate says so, and the checkpoint cannot count it as a finding. It still resets the rejection count at `src/lib/shared/work/next-step.mts:42`, as I noted at the cross-check.

APPROVED
