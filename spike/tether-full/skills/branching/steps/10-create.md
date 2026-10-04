# Branching: create or resume

1. Ensure the manifest (SKILL.md, Manifest). `--from` without `--into` → print `/branching <branch> --into <branch|path> [--from <base>]` and stop.
2. Resume check: for each mapped repo, parse `git -C <repo> worktree list --porcelain` for `branch refs/heads/<branch>`. Any hit → RESUME: report each path and repo, create nothing, go to step 5.
   - A resume hit wins over `--into`: ignore it with a note (resume before create).
   - No hit and `--into <value>` given → INTO, below; steps 3 and 4 do not run.

   INTO switches an existing linked worktree onto `<branch>`; no new folder, no `worktree add`.
   - Resolve `<value>` first as a branch: the same porcelain parse across all mapped repos; every worktree holding it is a candidate, and the user multi-selects (never all by default). Else as a path: it must equal the `worktree` line of a registered entry in one mapped repo. Nothing resolves → print the `--list` output and stop.
   - The main worktree (the first porcelain entry, the repo checkout itself) is refused with a one-line reason; only linked worktrees qualify.
   - Base: no `--from` → the new branch starts at the worktree's current HEAD, so no file changes. `--from <base>` → per selected repo, `git -C <repo> rev-parse --verify --quiet refs/heads/<base>`; a failure is reported and the user gives that repo's base or drops the repo.
   - Survey, read-only: `git -C <worktree> status --porcelain`. Dirty → report it; the user chooses carry the changes over or stop (no stash).
   - Command: `<branch>` exists locally (`show-ref` as in step 3) → `git -C <worktree> switch <branch>`, `--from` ignored with a note; else `git -C <worktree> switch -c <branch> [<base>]`. Always `switch`: the guard denies the older subcommand.
   - Show the command(s) for confirmation, run them, then report per worktree: path, new branch, base, the displaced branch (checked out there before, now checked out nowhere) and the way back, `/branching <displaced> --into <branch>`. Then step 5 runs on the switched worktree, since a different base can leave `+` or `-` submodules.
3. None → NEW. Ask which mapped repos the feature touches (multi-select; never all by default). For each: `safe_dir` = branch with `/` and whitespace replaced by `-`; path = `<repo>/.worktrees/<safe_dir>`. Branch exists locally but is checked out nowhere (`git -C <repo> show-ref --verify --quiet refs/heads/<branch>`) → `git -C <repo> worktree add <path> <branch>`; else `git -C <repo> worktree add <path> -b <branch> <default_branch>`.
4. Show the exact `git worktree add` command(s) for confirmation, run them, report path, repo and base per worktree.
5. Hydrate submodules only where required, for every worktree just created, resumed or switched:
   - Detect: `git -C <worktree> ls-files --stage` has a mode `160000` entry. None → skip silently.
   - Classify with `git -C <worktree> submodule status --recursive`; the first character decides:

   | Prefix | State | Action |
   |---|---|---|
   | `-` | not initialized (the empty dir `worktree add` leaves) | hydrate |
   | space | populated at the recorded commit | nothing; do not run `update` "to be sure" |
   | `+` | populated at a different commit | ask, naming the submodule and both commits; also report `git -C <worktree>/<sub> status --porcelain` if dirty; never hydrate silently |
   | `U` | merge conflicts inside | stop and report |

   - Hydrate only `-` lines: `git -C <worktree> submodule update --init --recursive`, shown for confirmation, then report each submodule path and commit.
   - Say the disk cost once: each worktree gets its own submodule clone under `<repo>/.git/worktrees/<safe_dir>/modules/<sub>`; worktrees share the superproject's history, not their submodules'.

For NEW, RESUME and INTO alike, record the worktree path(s) in the work item (`harness set <id> branch=<branch>`) so later phases resume in place.
