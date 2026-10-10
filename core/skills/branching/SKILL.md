---
name: branching
description: >
  Per-feature git worktrees across the nested repositories of a multi-repo umbrella: one
  isolated working folder per repo the feature touches, on a named branch, with submodules
  hydrated on the way in and released on the way out. Use when the user says "start a branch",
  "spin up a worktree", "resume work on <branch>", "set up branches for this feature", "list
  my worktrees", or "tear down the worktree for <branch>". Needs an explicit branch name and
  never invents one. `/picket:branching <branch>`, `/picket:branching <branch> --into <branch|path> [--from
  <base>]` (branch inside an existing worktree), `/picket:branching --list [branch]`, `/picket:branching --remove
  <branch>`. The developer reads it at a work item's first phase when the project has nested repos.
user-invocable: true
---

# Branching

Paths cited here and in this skill's step files, such as `branching/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

Scope: one branch per repo per feature, one worktree per (repo, branch). The branch name is the feature's identity across repos. No merge orchestration.

## Manifest

`.picket/state/branching.yaml` maps each nested repo (immediate children of `scan_root`, default `src`) to `path`, `git_dir` and `default_branch`. It records repos only; branches and worktrees are read live from git. On every invocation: absent → scan and write it; present → validate every entry (`path` is a work tree, `git_dir` resolves) and detect new children; any broken or new entry → rescan, rewrite, report `added/removed/repaired`.

Scan is read-only: for each child with a `.git` entry or a passing `git rev-parse --git-dir`, record `git -C <dir> rev-parse --absolute-git-dir` and the default branch by cascade: `symbolic-ref --short refs/remotes/origin/HEAD` minus `origin/`; else the current branch unless detached; else `main` or `master` if present; else `init.defaultBranch`. Deeper nesting: note it and ask before widening.

## Operations

| Input | Operation | Read |
|---|---|---|
| `<branch>` | create or resume | `steps/10-create.md` |
| `<branch> --into <branch\|path> [--from <base>]` | create inside an existing linked worktree (switch it onto `<branch>`), from `<base>` or its current HEAD | `steps/10-create.md` |
| `--list [branch]` | list, read-only: `git -C <repo> worktree list` per repo, filtered to the branch when given | none |
| `--remove <branch>` | scoped removal | `steps/20-remove.md` |

A branch name is mandatory for create and remove. Missing: print the operations and ask; stop.

## Invariants

Feature-scoped naming: branch and worktree path (`<repo>/.worktrees/<branch with / and spaces as ->`) derive from the explicit name, never random; a clash gives git's loud "already checked out", never corruption. One exception: with `--into` the worktree folder keeps its original name, and the branch it held before (the displaced branch) is checked out nowhere, its ref untouched. Resume before create. Scoped teardown: only the named worktree, prune only in that repo after listing its registrations. Submodules hydrated on entry and released on exit, each gated on `submodule status`, never with `--force` against unsurveyed content. No shared untracked state: each worktree owns its `node_modules`, build output and `.env`.

Every mutating `git worktree`, `git submodule` or deletion command is shown for confirmation before it runs. Deletion commands are guard-denied unless every operand names a path inside a `.worktrees/<name>` directory, quoted; a refusal means the path is wrong, not that another tool should be tried.

Runtime collisions between worktrees (ports, a shared dev database) are out of scope; flag the risk when the repo has a fixed-port or shared-DB test setup.

## Report

Manifest state (created, healed, unchanged); then per repo: resumed or created worktree with path and base, submodules hydrated or left alone; for INTO, the worktree path, new branch, base, displaced branch and the switch-back command `/picket:branching <displaced> --into <branch>`; or the listing; or what was removed, which rung cleared it, which submodules were released first, and that the branch ref itself still exists.
