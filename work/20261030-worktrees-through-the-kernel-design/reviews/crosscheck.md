## Review: 20261030-worktrees-through-the-kernel-design · crosscheck

The design record is aligned with the request and the draft, and I found no critical or major issue; it needs three small clarifications.

Alignment: PASS
Decisions: HONOURED
Findings: 0 critical, 0 major, 3 minor
- [Minor] `work/20261030-worktrees-through-the-kernel-design/design.md:341` (Phase 5 Changes: "the verdict row is still appended"): after a refused nested commit the row recorded is still `approved`. `src/lib/shared/work/next-step.mts:42` counts cumulative rejections from `lastIndexOf("approved")`, so a refused approval resets that count and can hide the `resolve_rejections` stall. Say in Phase 5 that the row is not appended on refusal, or that it carries a distinct verdict. Likelihood: low.
- [Minor] `work/20261030-worktrees-through-the-kernel-design/design.md:373` (Phase 6 reply forms): the free-name form `^(\S+)(?:\s+from\s+(\S+))?$` accepts any single word. With no ticket source, `[y]` is not offered, so `y`, `yes` or `ok` is recorded as the branch name. The existing forms in `src/lib/verbs/reply/table.mts:36-43` guard each letter with `offered(...)`. Add a criterion that `y`, `yes`, `ok` and `a` are refused as names when `[y]` is absent.
- [Minor] `work/20261030-worktrees-through-the-kernel-design/design.md:259` (Phase 2 step 2, `git worktree add -b <branch> <path> <from>`): D-001 promises that the bare form picks up a repo added by a later amendment. That repo has no recorded `from`, because `recordBranch` writes `from` only for the repos touched at record time (line 228). State that the bare form falls back to the `planWorktrees` start-ref chain for such a repo, and add a criterion for it.

Checked:
- **Code facts:**
  - `applyChanges` runs the umbrella commit last, at `apply.mts:69`.
  - `commitOwned` uses a temporary index, which works in a linked worktree.
  - `needsCrosscheck` rides the `implement_phase` send, so the cross-check does go out with phase 1 after the reply.
  - The status mod imports `action-text.mts` rather than copying it.
  - `UNCONVERTED_SKILLS` is currently `["benchmarking", "branching"]`.
  - `branching` and its steps are 46, 31 and 18 lines, and `developer.md` is 71 lines, so the design's budget claims hold.
  - Every file named in the touch sets exists, except those marked new.
  - The caps hold: 9 phases, 8 decisions, at most 7 criteria per phase.
- **Draft alignment:** the one change from the draft is the packet naming checkouts instead of shas. The record states it openly (D-004). The fast-lane offer is cut out with a reason.
- **Removed guards:** none. The guard's `verify` check keeps its `cwd` and `--root` rules and only changes which test commands it classifies.

ALIGNED
