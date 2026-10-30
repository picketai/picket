Implement artifacts/refactor/18-worktrees.md: a new verb picket worktree (record the branch, record none, create or resume the worktrees of every nested repo the plan touches, hydrate only uninitialised submodules, print the path map); one mapping from plan paths into the item's worktrees used by verify, mutate, the phase commit and the review summary; route commits each phase inside every touched nested repo, then work/ in the umbrella; a create_worktrees user action in picket next, reply and packet before phase 1; the branching skill drops its developer claim and calls the verb.

Escalated from the order lane (20261030-worktrees-through-the-kernel): the architect counted 5 phases and 7 decisions, and route starts committing inside nested repos, a repo boundary.

## Brief
purpose: the developer works in per-item worktrees of nested repos without hand-made git commands or commits
in scope: everything artifacts/refactor/18-worktrees.md lists under Target, nice-to-have items only when the caps allow
out of scope: merge orchestration, runtime collisions between worktrees (ports, shared databases), benchmarking changes
