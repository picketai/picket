---
kind: order
lane: order
title: Branching into an existing worktree
date: 2026-09-24
audience: developer
sources: [request, .claude/skills/branching/SKILL.md, .claude/skills/branching/steps/10-create.md, .claude/skills/branching/steps/20-remove.md, .claude/hooks/guard.bash.mjs, .claude/settings.json, test/hooks/hooks.test.mjs, test/budgets.test.mjs]
phases:
  - n: 1
    files: [.claude/skills/branching/SKILL.md, .claude/skills/branching/steps/10-create.md, test/hooks/hooks.test.mjs]
    greps:
      - path: .claude/skills/branching/SKILL.md
        pattern: "--into"
      - path: .claude/skills/branching/steps/10-create.md
        pattern: "switch -c"
      - path: .claude/skills/branching/steps/10-create.md
        pattern: "--from"
      - path: test/hooks/hooks.test.mjs
        pattern: "switch -c"
    tests: true
    drive: false
---
# Order: Branching into an existing worktree

## Problem

The `branching` skill always creates a new worktree folder per (repo, branch) with `git worktree add`, which costs a fresh folder, its own `node_modules`, and its own submodule clones. The user wants an opt-in parameter that creates the new branch inside a worktree that already exists, from a base branch they name, while the default stays exactly as it is today. The skill is prose only (no scripts), so the work is a SKILL.md and step file change plus a guard regression test; the binding constraints are the budgets in `test/budgets.test.mjs` (SKILL.md at most 150 lines, description at most 1024 characters with "Use when", step file at most 80 lines) and the guard, which hard-denies `git checkout`.

## Decisions

### D-001: `--into` switches the existing worktree onto the new branch
**Decision:** `/branching <branch> --into <worktree> [--from <base>]` creates `<branch>` inside the named worktree and checks it out there, with `git -C <worktree> switch -c <branch> [<base>]`. No new folder, no `git worktree add`. The worktree folder keeps its original name (`<repo>/.worktrees/<old-safe-dir>`), so the SKILL.md invariant "worktree path derives from the explicit name" gets one stated exception for `--into`. The branch that was checked out there before (the displaced branch) is left checked out nowhere; its ref is untouched. This is the reading of "create branches under an already existing worktree" that avoids a new worktree, which is what makes the parameter different from the default.
**Instead of:** a nested worktree, `git worktree add <existing-worktree>/.worktrees/<branch> -b <branch> <base>`: it still pays the folder, dependency and submodule cost the parameter exists to avoid, and a worktree nested inside another worktree's tree shows up as untracked content in it.
**Risks:**
- **RISK-001** A later `/branching <displaced>` finds no worktree holding it, goes NEW, and `git worktree add <repo>/.worktrees/<displaced-safe>` fails because the folder still exists (now holding the new branch). Mitigation: the INTO report names the displaced branch per worktree and the command that switches back (`/branching <displaced> --into <branch>`); git's refusal is loud, never corruption.
- **RISK-002** A work item that recorded the displaced branch with `harness set <id> branch=...` no longer resumes in place. Mitigation: the same report line; the step records the new branch on the current work item as today.

### D-002: `--into` names a feature branch or a linked worktree path
**Decision:** The `--into` value resolves in this order. First, as a branch: the existing resume check (`git -C <repo> worktree list --porcelain`, `branch refs/heads/<value>`) across all mapped repos gives every worktree holding it; the user multi-selects which of them to branch in (never all by default, matching NEW). Second, as a path: it must equal the `worktree` line of a registered entry in one mapped repo. The main worktree (the first entry of `worktree list --porcelain`, the repo checkout itself) is refused with a one-line reason; only linked worktrees qualify. A value that resolves to nothing stops with the `--list` output.
**Instead of:** path only: the branch name is the feature's identity across repos, so a path would force one invocation per repo for a multi-repo feature. Excluding the main worktree gives up branching in the repo checkout itself, which a plain `git switch -c` already does, and it keeps `--remove` safe because `git worktree remove` on a main worktree is refused by git.

### D-003: `--from` is optional and defaults to the worktree's current HEAD
**Decision:** Without `--from`, the new branch starts at what the worktree has checked out now (`switch -c <branch>` with no start point), so it stacks on the displaced branch and no file in the worktree changes. With `--from <base>`, the same base applies to every selected worktree; a repo where `git -C <repo> rev-parse --verify --quiet refs/heads/<base>` fails is reported and the user gives that repo's base or drops the repo. `--from` without `--into` is refused with a one-line usage line, since NEW keeps using the manifest's `default_branch`.
**Instead of:** defaulting to the manifest `default_branch` like NEW: switching to a different base rewrites the working tree and can move submodule gitlinks, so the silent default would be the riskier command; stacking is also what "under an existing worktree" most plainly asks for.

### D-004: Guarded command shape and ordering inside `10-create.md`
**Decision:** INTO lives in `steps/10-create.md` as a branch of step 3, after the resume check: a hit on `<branch>` is still RESUME and `--into` is ignored with a note (resume before create). The command is `git -C <worktree> switch ...`, never `checkout`, because the guard denies `checkout` (`DENY_GIT_SUBCOMMANDS` in `.claude/hooks/guard.bash.mjs`) and classifies `switch` as unknown, which falls through to a prompt. Before the switch, a read-only `git -C <worktree> status --porcelain` is shown; a dirty worktree is reported and the user chooses carry the changes over or stop (no stash). If `<branch>` already exists locally, the command is `git -C <worktree> switch <branch>` and `--from` is ignored with a note. After the switch, step 5 (submodule hydration) runs unchanged on the worktree, because a different base can leave `+` or `-` submodule states. The guard itself is not changed; a test pins the two classifications this order relies on.
**Instead of:** a new `steps/30-into.md`: it would have to repeat or cross-reference step 5 (a second reference hop the authoring rule forbids), and the fork is five to eight lines.

## Scope

**In:**
- `--into <branch|path>` and `--from <base>` on the create operation, documented in SKILL.md and `steps/10-create.md`.
- A hooks test pinning that `git -C <wt> switch -c <b> <base>` is not denied and `git -C <wt> checkout -b <b>` stays denied.

**Out:**
- Any change to `guard.bash.mjs`, `settings.json` or `steps/20-remove.md`.
- Nested worktrees under an existing worktree (OQ-001).
- Per-repo different `--from` values in one invocation.
- Moving or renaming a worktree folder to match its new branch.

## Phase 1: `--into` and `--from` on branching create

**Touch set:**
- `.claude/skills/branching/SKILL.md`: operations row, invariant exception, description
- `.claude/skills/branching/steps/10-create.md`: INTO fork of step 3
- `test/hooks/hooks.test.mjs`: pin switch versus checkout
- `.claude/hooks/guard.bash.mjs`: read only, checkGit classification
- `test/budgets.test.mjs`: read only, line and description budgets

**Changes:**
- SKILL.md: add an Operations row `<branch> --into <branch|path> [--from <base>]` pointing at `steps/10-create.md`; add the usage form to the description's invocation list, keeping "Use when" and staying under 1024 characters; in Invariants, add the `--into` exception to feature-scoped naming (the folder keeps its original name, the displaced branch is checked out nowhere); in Report, add the INTO line (worktree path, new branch, base, displaced branch, the switch-back command).
- `steps/10-create.md`: after step 2's miss, `--into` given → INTO per D-002 (resolve and select, refuse the main worktree), D-003 (base check per repo), D-004 (status survey, `switch -c` or `switch`, confirmation, then step 5); otherwise NEW as today. The closing `harness set <id> branch=<branch>` line applies to both.
- `test/hooks/hooks.test.mjs`: one new `test(...)` using the existing `project()` and `run("guard.bash.mjs", ...)` helpers, asserting `permissionDecision` is `null` for `git -C src/Api/.worktrees/feat-a switch -c feat-b feat-a` and `"deny"` for `git -C src/Api/.worktrees/feat-a checkout -b feat-b`.

**Done when:**
- **T-1.1** `.claude/skills/branching/SKILL.md` has an Operations row naming `--into` and `--from`, and its Invariants section states the `--into` naming exception.
- **T-1.2** `.claude/skills/branching/steps/10-create.md` contains `git -C <worktree> switch -c <branch>` and no `checkout` command.
- **T-1.3** `steps/10-create.md` states that a resume hit wins over `--into`, that the main worktree is refused, and that step 5 runs after the switch.
- **T-1.4** The default path is unchanged: step 3's `git worktree add` commands in `steps/10-create.md` are byte-identical to trunk (`git diff trunk -- .claude/skills/branching/steps/10-create.md` shows no removed `worktree add` line).
- **T-1.5** `npm test` passes, including the budgets tests (SKILL.md at most 150 lines, description at most 1024 characters, step file at most 80 lines) and the new guard test.
- **T-1.6** The new test asserts `null` for the `switch -c` form and `"deny"` for the `checkout -b` form.

## Open questions

- **OQ-001** Does "create branches under an already existing worktree" mean switching that worktree to the new branch (D-001), or adding a separate worktree placed inside the existing worktree's folder? Owner: user. Fallback: Phase 1 ships the switch reading; the nested reading would be a second operation, not a change to this one.

## Revision log
