# Branching: remove

1. Ensure the manifest; a missing branch name is asked for, then stop.
2. Locate the branch's worktrees with the resume check across all repos. None → report nothing to remove; stop.
3. Survey each worktree before proposing anything, all read-only: `git -C <wt> status --porcelain` (uncommitted or untracked content); `git -C <wt> ls-files --stage` for mode `160000` entries, then `git -C <wt> submodule status --recursive` to learn which are populated (any line not prefixed `-`); for each populated submodule `git -C <wt>/<sub> status --porcelain` and `git -C <wt>/<sub> log --branches --not --remotes --oneline` (commits that exist nowhere else). This is the only pass that can still save that work.
4. Release populated submodules before removing the worktree. Report what step 3 found in each (uncommitted, unpushed, or neither) and ask before releasing anything that is not "neither". On confirmation: `git -C <wt> submodule deinit --all --force` (plain `deinit` refuses on the modified case you just surfaced). `deinit` writes to the repo's shared `.git/config`, so it unregisters `submodule.<name>.url` for every worktree of that repo; say so. No populated submodules → skip.
5. Walk the ladder, each rung shown for confirmation, stopping at the first that succeeds:

   | Rung | Command | When |
   |---|---|---|
   | 1 | `git -C <repo> worktree remove <path>` | always first; clears a clean worktree that never initialised a submodule |
   | 2 | `git -C <repo> worktree remove --force <path>` | rung 1 refused; ask first and list what step 3 found would be discarded; also the expected rung after a deinit, because `<repo>/.git/worktrees/<safe_dir>/modules/` outlives `deinit` |
   | 3 | delete `<path>`, then `git -C <repo> worktree prune` | rung 2 refused; two commands, both shown |

   Out of bounds: `git rm --cached <submodule>` (dirties the branch), and any deletion tool the guard does not cover.
6. Prune is scoped: before `git -C <repo> worktree prune`, run `git -C <repo> worktree list` and report which registrations it will clear (only those whose directory is gone, only in this repo). Note the one hazard: a concurrent `worktree add` in the same repo. If the listing shows only the main worktree and the one being torn down, say so.
7. After a rung-3 deletion, report any directory left empty (`.worktrees/`, intermediate dirs) and offer removal; never delete silently.
8. Report per repo: rung, what was discarded at rung 2, what prune cleared, and that the branch ref itself still exists.
