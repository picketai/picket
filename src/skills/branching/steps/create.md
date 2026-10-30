# Branching: create

1. Find the open work item with `picket next --latest`. None: say that worktrees belong to a work item, open one through its lane first, and stop.
2. Record the branch: `picket worktree <id> --record <branch>`, adding `--from <ref>` when the user gave one. A refusal names the bad name or the repo and ref; report it and stop.
3. Create or resume the worktrees: `picket worktree <id>`. It covers every nested repo the plan touches, resumes a worktree already on the branch, hydrates only uninitialised submodules and stops on a conflicted one.
4. Print the map it printed, verbatim. A nonzero exit names the repo; report it and stop.
