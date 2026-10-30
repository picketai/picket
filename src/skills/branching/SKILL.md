---
name: branching
description: >
  Per-feature git worktrees across the nested repositories of a multi-repo umbrella: records the
  branch for the open work item and lets `picket worktree` create or resume one worktree per
  repo the plan touches, switches an existing worktree onto a branch, lists the worktrees, and
  tears one down after a survey of unsaved work.
when_to_use: >
  Use when the user says "start a branch", "spin up a worktree", "resume work on <branch>",
  "set up branches for this feature", "list my worktrees", or "tear down the worktree for
  <branch>".
argument-hint: "<branch> [--from <ref>] | <branch> --into <branch|path> [--from <base>] | --list [branch] | --remove <branch>"
---

# Branching

One branch per feature, one worktree per (repo, branch), named by the user and never invented; the kernel's `picket worktree` creates and resumes them for the open work item, and this skill adds the manual switch, the listing and the guarded teardown.

## Steps

1. Create, `--into` and `--remove` need a branch name. Missing: print the four forms of the argument hint, ask for the name and stop.
2. `<branch> [--from <ref>]`: create or resume per `steps/create.md`.
3. `<branch> --into <branch|path> [--from <base>]`: switch an existing linked worktree onto `<branch>` per `steps/into.md`.
4. `--list [branch]`: read-only, run `git -C <repo> worktree list` in each nested repo and keep the lines of `<branch>` when one is given.
5. `--remove <branch>`: survey, release and remove per `steps/remove.md`.

## Rules

The branch and the worktree path derive from the explicit name: `<repo>/.worktrees/<branch with / and spaces as ->`. A clash gives git's loud "already checked out", never corruption. With `--into` the folder keeps its name, and the branch it held before is checked out nowhere, its ref untouched.

Resume before create: a worktree already on the branch is reused, in every form.

Every mutating `git worktree`, `git switch`, `git submodule` or deletion command this skill runs by hand is shown for confirmation before it runs. Deletion commands are guard-denied unless every operand names a path inside a `.worktrees/<name>` directory, quoted; a refusal means the path is wrong, not that another tool should be tried.

Each worktree owns its untracked state: `node_modules`, build output, `.env`. Runtime collisions between worktrees (ports, a shared dev database) are out of scope; flag the risk when the repo has a fixed-port or shared-database test setup.

The nested repos are the entries of `.picket/state/branching.yaml` when the file exists (shape in `templates/manifest.example.yaml`), else every immediate child of `src/` holding a `.git` entry. The manifest is optional: the kernel scans `src/` without it.

## Output

Create prints the map `picket worktree` printed: per repo the worktree path, created or resumed, its base, and the submodules hydrated, reported or conflicted. `--into` reports per worktree the path, the new branch, its base, the displaced branch and the way back, `/picket:branching <displaced> --into <branch>`. `--list` prints the listing. Remove reports per repo the rung that cleared the worktree, what was discarded, which submodules were released first, what prune cleared, and that the branch ref itself still exists.
