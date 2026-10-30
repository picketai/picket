---
kind: design
lane: design
title: Worktrees through the kernel
date: 2026-10-30
audience: developer
sources: [request, artifacts/refactor/18-worktrees.md, src/lib/shared/repos.mts, src/lib/shared/git.mts, src/lib/shared/review-summary.mts, src/lib/shared/route/apply.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/plan.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/send.mts, src/lib/shared/work/snapshot.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/mutate/index.mts, src/lib/verbs/mutate/mutant.mts, src/lib/verbs/reply/index.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/close/close.mts, src/lib/hooks/guard/bash/kernel.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/lint/schema/index.mts, src/skills/branching/, src/agents/developer.md, src/agents/architect.md, test/repo/skills.test.mjs, test/repo/agents.test.mjs]
phases:
  - n: 1
    files: [src/lib/shared/repos.mts, src/lib/shared/checkouts.mts, src/lib/shared/checkouts.test.mts, src/lib/shared/work/snapshot.mts, test/support/snapshot.mts]
    greps:
      - path: src/lib/shared/checkouts.mts
        pattern: 'export function locate\b'
      - path: src/lib/shared/checkouts.mts
        pattern: 'export function planPathOf\b'
      - path: src/lib/shared/checkouts.mts
        pattern: 'export function recordBranch\b'
      - path: src/lib/shared/repos.mts
        pattern: 'export function readLayout\b'
      - path: src/lib/shared/work/snapshot.mts
        pattern: 'layout: ItemLayout'
    tests: true
    drive: false
    security: false
  - n: 2
    files: [src/lib/verbs/worktree/index.mts, src/lib/verbs/worktree/create.mts, src/lib/verbs/worktree/index.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, docs/reference/cli.md, test/support/git.mts, test/cli/worktree.test.mjs]
    greps:
      - path: src/lib/verbs.mts
        pattern: 'worktree: \{ summary'
      - path: src/lib/cli/registry.mts
        pattern: 'worktree: \(\) => import'
      - path: docs/reference/cli.md
        pattern: '^## picket worktree\b'
      - path: src/lib/verbs/worktree/index.mts
        pattern: 'worktree <id>'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/checkouts.mts, src/lib/shared/checkouts.test.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/verify/index.test.mts, src/lib/hooks/guard/bash/kernel.mts, src/lib/hooks/guard/bash/kernel.test.mts]
    greps:
      - path: src/lib/shared/checkouts.mts
        pattern: 'export function testRuns\b'
      - path: src/lib/verbs/verify/index.mts
        pattern: 'testRuns'
      - path: src/lib/verbs/verify/index.mts
        pattern: 'locate\('
      - path: src/lib/hooks/guard/bash/kernel.mts
        pattern: 'testRuns'
    tests: true
    drive: true
    security: true
  - n: 4
    files: [src/lib/verbs/mutate/index.mts, src/lib/verbs/mutate/mutant.mts, src/lib/verbs/mutate/index.test.mts, src/lib/shared/review-summary.mts, src/lib/verbs/summary/index.mts, test/cli/summary.test.mjs]
    greps:
      - path: src/lib/shared/review-summary.mts
        pattern: 'readLayout'
      - path: src/lib/shared/review-summary.mts
        pattern: 'planPathOf'
      - path: src/lib/verbs/mutate/index.mts
        pattern: 'readLayout'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/shared/route/commit.mts, src/lib/shared/route/apply.mts, src/lib/verbs/route/index.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/shared/route/commit.mts
        pattern: 'export function commitCheckouts\b'
      - path: src/lib/shared/route/apply.mts
        pattern: 'commitCheckouts'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'approval commits it in'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/action-text.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.mts, src/lib/verbs/reply/index.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, src/skills/resuming/SKILL.md]
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: 'create_worktrees'
      - path: src/lib/shared/work/action-text.mts
        pattern: 'create_worktrees:'
      - path: src/lib/verbs/reply/table.mts
        pattern: 'create_worktrees'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'create_worktrees'
      - path: src/skills/ordering/SKILL.md
        pattern: 'create_worktrees'
      - path: src/skills/designing/SKILL.md
        pattern: 'create_worktrees'
      - path: src/skills/resuming/SKILL.md
        pattern: 'create_worktrees'
    tests: true
    drive: true
    security: true
  - n: 7
    files: [src/lib/shared/work/send.mts, src/lib/shared/work/send.test.mts, src/agents/developer.md, src/agents/architect.md, test/repo/agents.test.mjs]
    greps:
      - path: src/lib/shared/work/send.mts
        pattern: 'worktrees: picket worktree'
      - path: src/agents/developer.md
        pattern: 'worktrees:'
      - path: src/agents/architect.md
        pattern: 'project-root relative'
    tests: true
    drive: true
    security: false
  - n: 8
    files: [src/skills/branching/SKILL.md, src/skills/branching/steps/create.md, src/skills/branching/steps/remove.md, test/repo/skills.test.mjs, test/repo/description-cases.json, docs/reference/skills.md, docs/how-to.md]
    greps:
      - path: test/repo/skills.test.mjs
        pattern: 'UNCONVERTED_SKILLS = \["benchmarking"\]'
      - path: src/skills/branching/SKILL.md
        pattern: '^## Steps\b'
      - path: src/skills/branching/SKILL.md
        pattern: '^(?![\s\S]*developer reads it)'
        flags: i
      - path: src/skills/branching/steps/create.md
        pattern: 'picket worktree'
      - path: src/skills/branching/steps/remove.md
        pattern: '^# Branching: '
      - path: docs/reference/skills.md
        pattern: 'picket worktree'
      - path: docs/how-to.md
        pattern: 'create_worktrees'
    tests: true
    drive: false
    security: false
  - n: 9
    files: [src/lib/hooks/lint/schema/index.mts, test/hooks/lint.schema.test.mjs, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, test/cli/close.test.mjs]
    greps:
      - path: src/lib/hooks/lint/schema/index.mts
        pattern: '[.]worktrees/'
      - path: src/lib/verbs/close/block.mts
        pattern: 'branching --remove'
    tests: true
    drive: true
    security: false
---
# Design: Worktrees through the kernel

## Problem

Development shows the developer never reads `branching` (the user typed `/picket:branching` in 28 of 45 sessions, agents never), and nested commits are made by hand outside any gate (in one item the nested commit landed 13 s before route's own); see `artifacts/refactor/18-worktrees.md`, D5 as approved on 2026-10-28. Today `verify` and `mutate` read plan paths and run tests only in the umbrella, `route` commits only in the umbrella, and only the review summary looks into a nested repo, by asking git for a worktree on `state.branch`. The binding constraints: the user names the branch (ticket keys, team rules); a plan is written before any worktree exists, so plan paths cannot be worktree paths; the bench fixture has no nested repos, so its stop counts must not change; a guard that lets `picket verify` run unprompted must keep classifying every test command verify runs.

## Decisions

### D-001 (r2): The kernel creates worktrees; the user names the branch
**Decision:** A new verb, `picket worktree <id>`, owns every git command: `--record <name> [--from <ref>]` records the branch and each touched repo's start point, `--none` records that the item runs in the main checkouts, and the bare form creates or resumes the worktrees and prints the path map. `picket reply` records the gate reply in-process through the same shared functions, so the lead never types `--record` by hand. The bare form is idempotent: the developer runs it at every phase, so an amendment that adds a repo is picked up by the next phase. Such a repo has no recorded `from`, so the bare form starts it from the chain `planWorktrees` uses (the manifest's `default_branch`, then the repo's default branch, then `HEAD`) and records that `from` with its base. Infrastructural decision.
**Instead of:** keeping `branching` as the developer's procedure: development shows no agent ever read it.
**Risks:**
- **RISK-001** `worktree` is not lead-only (the guard classes lead-only per verb, not per flag), so an agent could run `--record` and skip the user's naming. Mitigation: the developer's message names only the bare form, and the exposure equals today's `picket set <id> branch=<x>`; a per-flag lead-only class would be a new guard concept for one flag.
- **RISK-002** `git worktree add` runs with no per-command confirmation. Mitigation: the `create_worktrees` stop (D-005) shows each repo, start point and path before anything exists; the verb only adds worktrees and branches, never removes or resets.

### D-002: The item's layout lives in `work/<id>/repos.yaml`; `state.yaml` keeps `branch`
**Decision:** `repos.yaml` grows additively. Today `picket open` writes `repos: [{ path, base }]`; after this item an entry may also carry `from` (the start ref the reply chose) and `worktree` (the project-root relative worktree folder, written when the bare form creates or resumes it), and the file may carry a top-level `worktrees: none`. In code this is `ItemLayout = { nested: string[]; worktrees: "none" | null; repos: RepoLayout[] }` with `RepoLayout = { path; base: string | null; from?; worktree? }`; `nested` is `nestedRepos(root)`. The snapshot carries the layout, so `picket next` decides from files alone. `base` is re-recorded from the worktree's start commit when the bare form creates it, so the review diff covers this item's work only. Infrastructural decision.
**Instead of:** asking git on every read (`worktreeOnBranch`, as the review summary does today): the snapshot is read by hooks and the status line, a git spawn per read costs their budgets, and git cannot say "none".
**Risks:**
- **RISK-003** A worktree removed by hand leaves a stale `worktree` entry. Mitigation: the next bare `picket worktree` call finds no worktree on the branch, creates it again and re-records it; `verify` meanwhile fails its `file:` checks at the physical path it names.

### D-003: Every path lives in exactly one checkout; `locate` and `planPathOf` are the only translation
**Decision:** Plan paths stay project-root relative (`src/Orders/pricing.cs`). `locate(layout, path)` returns `{ dir, rel, repo }`: the repo's recorded worktree when there is one (`src/Orders/.worktrees/RMS-12`, `pricing.cs`), else the nested repo's main checkout (`src/Orders`, `pricing.cs`), else the umbrella (`""`, the path itself). A path already inside a recorded worktree locates to that worktree unchanged, so a block's `Files:` line works in either shape. `planPathOf` is the inverse. `verify`, `mutate`, the review summary, the route commit, the packet and the guard all go through these two functions. Kernel output that someone reads bytes from (verify detail, `mutation.json`, the summary's `changed_files` and `silenced`) names the physical path; plans, gate options, security-path and concern detection, and waiver matching use the plan shape.
**Instead of:** writing plans in worktree paths: the plan exists before the user names the branch, and every reader would need the branch to read it.
**Risks:**
- **RISK-004** A nested repo path with no worktree now belongs to that repo's own tooling and commits, not to the umbrella's root tests (today's behaviour). Mitigation: that is the point of D-004 and D-007; items with no nested repos locate everything to `""` and behave exactly as before, which the existing tests pin.
- **RISK-005** Waivers and silenced moves recorded in different shapes stop matching. Mitigation: `markWaived` compares in plan shape, through `planPathOf` on both sides.

### D-004 (r2): Route commits each touched nested checkout before the umbrella; a refusal leaves the phase unapproved
**Decision:** When an approval (or a run grant) commits phase N, route first commits, in each nested checkout the phase's paths and block files locate to (sorted by `dir`), the paths the developer staged there, with the phase message and no `git add`; then it writes the markers and commits `work/` in the umbrella as today. A nested commit that throws stops the approval: no `phases/N.approved`, no run grant, no umbrella commit, no verdict row (an `approved` row would reset the count of cumulative rejections `picket next` stalls on), and the route output names the checkout and git's first error line. Checkouts committed before the refusal stay committed; a retry finds nothing staged there and goes on. Route output names one sha per checkout (`committed src/Orders/.worktrees/RMS-12 1a2b3c4: <subject>`). The packet, printed before the commit exists, names the checkouts the approval commits in; a sha cannot exist yet, which is the one place this record departs from the draft's wording.
**Instead of:** the umbrella first, then the nested repos: a nested failure would leave an approved phase in history whose code is not committed.
**Risks:**
- **RISK-006** There is no atomic commit across repos; a refusal leaves some repos committed. Mitigation: the phase stays at `approve_phase`, the output names what committed and what refused, and the retry is idempotent.
- **RISK-007** With `worktrees: none`, route now commits on whatever branch the nested main checkout has. Mitigation: the user chose `none` at the stop, whose option text says "use the main checkouts".

### D-005 (r2): `create_worktrees` exists only when it can matter
**Decision:** A new user action, `create_worktrees`, comes before the developer's next phase when all four hold: the project has nested repos, a phase of the plan touches one (`files` or touch set), `state.branch` is unset, and `repos.yaml` does not say `worktrees: none`. It is computed purely from the snapshot. Options: `[y] create <KEY>` when `state.source` is a ticket key (`/^[A-Z][A-Z0-9]+-\d+$/`), `reply: <name> [from <ref>]`, and `[n] use the main checkouts`; `picket reply` maps `y`, a free name with an optional `from <ref>`, and `n`; a reply word (`y`, `yes`, `ok`, `a`, `n`, `no`, `none`) is never taken as a branch name, so `y` with no `[y]` offered is refused. In the design lane the reviewer's cross-check goes out with phase 1, after the reply, because it rides the `implement_phase` send.
**Instead of:** asking at `picket open`: the plan does not exist yet, so the touched repos are unknown and every umbrella item would stop, touching a repo or not.
**Risks:**
- **RISK-008** A stop the bench never sees. Mitigation: the bench fixture has no nested repos, so the action never fires there; unit tests cover each of the four conditions.

### D-006: Only uninitialised submodules are hydrated
**Decision:** After creating or resuming a worktree, the bare form reads `git submodule status --recursive`. `-` entries are hydrated with `git submodule update --init --recursive -- <those paths>`; `+` entries are listed as reported and left alone; a `U` entry makes the verb exit nonzero naming the repo and submodule, which the developer reports as `PHASE STALLED`. A space entry is left alone.
**Instead of:** `git submodule update --init --recursive` with no paths: it resets every `+` submodule to the recorded commit and silently drops work there.

### D-007: `verify` runs the tests of every checkout the phase touches, and the guard classifies each of them
**Decision:** `testRuns(root, id, n)` returns one `{ dir, command }` per distinct `locate(...).dir` of the phase's paths (the umbrella when the phase names none) with the test command `detectTooling` finds there. `verify` runs each; a nested checkout with no command passes with `no suite detected`, the umbrella keeps today's failure. The guard's `verify` special case calls the same function and answers `safe` only when every command classifies `safe` in its own folder; an unreadable item, phase or layout answers `unknown`. `testRuns` reads only `state.yaml`, the artifact and `repos.yaml`, never the full snapshot, to stay inside the hook budget.
**Instead of:** root tests only: an umbrella's root usually tests nothing of a nested repo, so a phase passed `verify` without its code ever being tested.
**Risks:**
- **RISK-009** The guard now parses the artifact on every `picket verify` call. Mitigation: `test/timing/budgets.test.mjs` holds the guard to its cold budget; a miss fails `npm test`.

### D-008: `branching` keeps list and remove, and its create step calls the verb
**Decision:** `branching` takes bundle 2's shape: `description` plus `when_to_use`, `## Steps` as one ordered list, `## Rules`, `## Output`, step files `steps/create.md` and `steps/remove.md` opening `# Branching: <name>`. The developer claim goes. Create resolves the open item and runs `picket worktree <id> --record <branch> [--from <ref>]`, then `picket worktree <id>`, which covers every repo the plan touches. List and remove keep their read-only survey and confirmed teardown. `--into` (switching an existing worktree onto a new branch by hand) is dropped; OQ-002 asks the user. `UNCONVERTED_SKILLS` is left with `benchmarking` only.
**Instead of:** retiring `branching`: teardown needs a survey of uncommitted and unpushed work and the user's confirmation, which the kernel does not own.

## Scope

**In:**
- `picket worktree <id>` with `--record`, `--none` and the bare create or resume form; the layout in `repos.yaml`; `locate` and `planPathOf`.
- `verify`, `mutate`, the review summary, the route commit, the packet and the guard's `verify` class through the mapping.
- Route commits per touched nested checkout, then `work/` in the umbrella.
- `create_worktrees` in `picket next`, `picket reply`, `picket packet` and `action-text.mts`; the gate lines of the ordering, designing and resuming skills.
- The developer's `worktrees:` line and Entry, the architect's plan-path sentence, `branching` in bundle 2's shape, the docs.
- Nice to have that fits the caps: `picket close --human` names the worktrees and the remove command; `lint.schema` flags a plan path that is a worktree path.

**Out:**
- Merge orchestration, runtime collisions between worktrees (ports, shared databases), benchmarking changes (the brief).
- The fast-lane offer (`picket worktree <id> --repos <paths>`): a fast item closes through `picket close --touched`, which commits only in the umbrella, so the offer needs per-repo commits in `close` too; that exceeds this record.
- `picket check` in worktrees (OQ-001).

## Phase 1: Item layout and path mapping

**Touch set:**
- `src/lib/shared/repos.mts`: layout read and write
- `src/lib/shared/checkouts.mts`: new; mapping, touched repos, recording
- `src/lib/shared/checkouts.test.mts`: new; unit tests
- `src/lib/shared/work/snapshot.mts`: snapshot carries the layout
- `test/support/snapshot.mts`: fixture default layout
- `src/lib/shared/git.mts`: `revParse`, `defaultBranch` reused
- `src/lib/shared/work/state.mts`: `writeState` for `branch`
- `src/lib/shared/work/artifact.mts`: `phasePaths` reused
- `src/lib/util/yaml-lite.mts`: `parse`, `stringify` reused
- `test/support/git.mts`: temp repos for the record tests

**Changes:**
- `repos.mts`: the types of D-002; `readLayout(root, id): ItemLayout` (a missing `repos.yaml` gives `repos: []`, `worktrees: null`); `writeLayout(root, id, layout)` writes only the keys that are set. `readBases` and `recordBases` keep their behaviour on the same file.
- `checkouts.mts`, pure: `Located = { dir: string; rel: string; repo: string | null }`; `locate(layout, path)`; `planPathOf(layout, path)`; `touchedRepos(layout, paths): string[]` (sorted repo paths with any path under `<repo>/`); `worktreeDirName(branch)` (`/` and whitespace to `-`); `ticketKey(source): string | null`.
- `checkouts.mts`, with git: `planWorktrees(root, snap, { name, from }): PlannedWorktree[]`, `PlannedWorktree = { repo; from; base; worktree }`, for the repos every phase's `phasePaths` touch; the start ref is `from`, else the manifest's `default_branch`, else `defaultBranch(repo)`, else `HEAD`. `recordBranch(root, id, { name, from }, now)` checks the name with `git check-ref-format --branch`, resolves every start ref, then writes `state.branch` and each touched repo's `from` and `base`, and drops `worktrees: none`; any failure throws `Refused` naming the name or the repo and ref, before writing anything. `recordNone(root, id, now)` writes `worktrees: none` and refuses once any repo has a `worktree` recorded.
- `WorkSnapshot` gains `layout: ItemLayout`, read by `readSnapshot`; `stateView` output is unchanged. `snapshotOf` defaults to `{ nested: [], worktrees: null, repos: [] }` and accepts a `layout` field.

**Done when:**
- **T-1.1** With `repos: [{ path: "src/Orders", worktree: "src/Orders/.worktrees/RMS-12" }]`, `locate` maps `src/Orders/pricing.cs` and `src/Orders/.worktrees/RMS-12/pricing.cs` both to `{ dir: "src/Orders/.worktrees/RMS-12", rel: "pricing.cs", repo: "src/Orders" }`, and `README.md` to `{ dir: "", rel: "README.md", repo: null }` (unit test).
- **T-1.2** With no `worktree` recorded, `src/Orders/pricing.cs` locates to `{ dir: "src/Orders", rel: "pricing.cs" }`, and `planPathOf` maps `src/Orders/.worktrees/RMS-12/pricing.cs` back to `src/Orders/pricing.cs`.
- **T-1.3** `worktreeDirName("feature/RMS 12")` is `feature-RMS-12`; `ticketKey("RMS-12")` is `RMS-12` and `ticketKey("story.md")` is null.
- **T-1.4** In a temp umbrella with nested repos `src/Orders` and `src/Billing` and a plan touching only `src/Orders`, `recordBranch` writes `branch: RMS-12` to the state and `from` and `base` for `src/Orders` only; `readBases` still returns both repos' bases.
- **T-1.5** `recordBranch` with the name `bad..name`, or with `from: nope`, refuses naming the problem and leaves `state.yaml` and `repos.yaml` byte-identical.
- **T-1.6** `recordNone` makes `readLayout` return `worktrees: "none"`, and refuses once a `worktree` is recorded.
- **T-1.7** `npm test` passes.

## Phase 2: The `picket worktree` verb

**Touch set:**
- `src/lib/verbs/worktree/index.mts`: new; parse, run, render
- `src/lib/verbs/worktree/create.mts`: new; create, resume, submodules, exclude
- `src/lib/verbs/worktree/index.test.mts`: new; submodule classifier, render
- `src/lib/verbs.mts`: register the verb
- `src/lib/cli/registry.mts`: register the loader
- `docs/reference/cli.md`: regenerated by `npm run docs`
- `test/support/git.mts`: two-repo umbrella fixture
- `test/cli/worktree.test.mjs`: new; end-to-end against the fixture
- `src/lib/shared/checkouts.mts`: `recordBranch`, `recordNone`, `planWorktrees`
- `src/lib/shared/git.mts`: `worktreeOnBranch`, `revParse` reused

**Changes:**
- `VERB_NAMES.worktree = { summary: "record the branch for a work item's worktrees, or create and resume them", readOnly: false }`; usage `worktree <id> [--record <name> [--from <ref>] | --none]`; output `json`.
- `--record` and `--none` call the phase 1 functions and print the planned map.
- The bare form refuses when no branch is recorded and `worktrees` is not `none` (the message names `create_worktrees`); with `none` it prints that the item works in the main checkouts and exits 0. Otherwise, for each repo `touchedRepos` gives:
  1. A worktree already on the branch (`worktreeOnBranch`) is resumed: its path is recorded, its `base` kept.
  2. Else the path is `<repo>/.worktrees/<worktreeDirName(branch)>`: `git worktree add <path> <branch>` when the branch exists locally, else `git worktree add -b <branch> <path> <from>`; `base` is re-recorded from the new worktree's `HEAD`. A repo with no recorded `from` (added to the plan after the reply) takes the start ref `planWorktrees` resolves, and that `from` is recorded with the base.
  3. `.worktrees/` is added to the repo's `info/exclude` (path from `git rev-parse --git-path info/exclude`) unless `git check-ignore -q` already ignores it.
  4. Submodules per D-006, only when `git ls-files --stage` holds a mode `160000` entry.
- Result: `{ id, branch, repos: [{ repo, worktree, state: "created" | "resumed", base, hydrated: string[], reported: string[], conflicted: string[] }] }`; exit nonzero (`failed`) when any repo has a conflicted submodule or a git command fails, naming the repo. Render one line per repo, `src/Orders -> src/Orders/.worktrees/RMS-12 · created · base 1a2b3c4d`, and one line per hydrated, reported or conflicted submodule.
- `test/support/git.mts` gains `umbrella(t, { repos })`: a host project whose `src/<name>` folders are git repos with one commit on `main`, for this and later phases.
- Every git command goes through the existing git utilities (no shell), so a branch name is an argument, never shell text.

**Done when:**
- **T-2.1** In the fixture with a plan touching only `src/Orders`, `picket worktree <id> --record RMS-12` then `picket worktree <id>` creates `src/Orders/.worktrees/RMS-12` on branch `RMS-12`, nothing under `src/Billing`, and prints `src/Orders -> src/Orders/.worktrees/RMS-12`.
- **T-2.2** A second bare call reports `resumed`, creates nothing, and leaves `repos.yaml`'s `base` for `src/Orders` equal to the worktree's start commit.
- **T-2.3** When a local branch `RMS-12` exists and is checked out nowhere, the worktree is created on it and its tip is the recorded base.- **T-2.4** The submodule classifier maps `submodule status` lines starting `-`, `+`, `U` and space to hydrate, report, conflict and leave (unit test); in the fixture a `-` submodule is initialised and a `+` submodule keeps its commit and is listed as reported.
- **T-2.5** After creation, `git -C src/Orders status --porcelain` lists no `.worktrees/` entry.
- **T-2.6** The bare form with no branch recorded exits nonzero naming `create_worktrees`; with `worktrees: none` it exits 0 and creates nothing.
- **T-2.7** `docs/reference/cli.md` has a `## picket worktree` section, and `npm test` passes.
- **T-2.8** When the plan gains `src/Billing` after `--record RMS-12`, the next bare call creates `src/Billing/.worktrees/RMS-12` from `src/Billing`'s default branch and records `from: main` and the base for it.

## Phase 3: Verify through the mapping, and the guard's verify class

**Touch set:**
- `src/lib/shared/checkouts.mts`: add `testRuns`
- `src/lib/shared/checkouts.test.mts`: `testRuns` cases
- `src/lib/verbs/verify/index.mts`: files, greps, tests per checkout
- `src/lib/verbs/verify/index.test.mts`: worktree cases
- `src/lib/hooks/guard/bash/kernel.mts`: `verifyRunsNoProjectCode` per checkout
- `src/lib/hooks/guard/bash/kernel.test.mts`: classification cases
- `src/lib/shared/tooling.mts`: `detectTooling` reused
- `src/lib/shared/checks.mts`: `runStep` log prefix
- `src/lib/shared/work/artifact.mts`: `parseArtifact` for `testRuns`
- `test/timing/budgets.test.mjs`: guard cold budget, read only

**Changes:**
- `testRuns(root, id, n): { dir: string; command: string | null }[]` per D-007, reading `state.yaml`, the artifact and `repos.yaml` only.
- `verify`: `file:` and `grep:` results keep the plan path in their name and read `locate(...)`'s physical path; the detail names the physical path when it differs. Tests run once per `testRuns` entry: the umbrella's result keeps the name `tests` and today's behaviour; a nested checkout's is `tests:<dir>`, passes with `no suite detected` when it has no command, and logs under `verify-<dir with / as ->`.
- Guard: `verifyRunsNoProjectCode` takes the id and phase from the tokens, calls `testRuns(hookRoot, id, n)`, and answers safe only when every command classifies `safe` with `classifyText(command, join(hookRoot, dir), depth)`. A missing id or phase, a throw, or any non-safe command gives `unknown`. `--no-tests` stays safe; the `cwd` and `--root` checks stay.

**Done when:**
- **T-3.1** In the fixture with a worktree recorded, a phase whose `files` names `src/Orders/pricing.cs` passes `file:src/Orders/pricing.cs` when only the worktree holds the file, and fails it when only the main checkout does.
- **T-3.2** A `greps` entry on `src/Orders/pricing.cs` matches the worktree copy's text, not the main checkout's.
- **T-3.3** A phase touching only `src/Orders` runs the worktree's `npm test` in the worktree and not the umbrella's; a nested checkout with no tooling reports `tests:<dir>` as passing with `no suite detected`.
- **T-3.4** A phase with no nested path gives the same results as before: the existing verify tests pass unchanged.
- **T-3.5** The guard classifies `picket verify <id> 1` as `unknown` when the worktree's test command is not safe though the umbrella's is, `safe` when every command is safe, and `safe` with `--no-tests`.
- **T-3.6** `picket verify nosuchitem 1` and a phase number with no frontmatter entry classify `unknown`.
- **T-3.7** `npm test` passes, the guard's cold budget in `test/timing/budgets.test.mjs` included.

## Phase 4: Mutate and the review summary through the mapping

**Touch set:**
- `src/lib/verbs/mutate/index.mts`: checkouts, bases, tooling per mutant
- `src/lib/verbs/mutate/mutant.mts`: pick in a checkout folder
- `src/lib/verbs/mutate/index.test.mts`: worktree mutant case
- `src/lib/shared/review-summary.mts`: layout worktree, physical paths, plan-shape detection
- `src/lib/verbs/summary/index.mts`: `markWaived` in plan shape
- `test/cli/summary.test.mjs`: worktree summary cases
- `src/lib/shared/work/approvals.mts`: waiver path shape, read only
- `src/lib/shared/mutation.mjs`: `mutation.json` reader, read only

**Changes:**
- `mutate`: the candidate checkouts are the umbrella (base `state.base`) and every nested checkout the plan's paths locate to (base from `repos.yaml`), in `dir` order; `pickMutant(checkoutRoot, base)` runs in each until one returns a mutant. The saved `mutant.path` is physical and project-root relative, so `restoreLeftover(root)` keeps working; the baseline, mutant and rebuild steps use `detectTooling` of the mutant's checkout.
- Review summary: `nestedChanges` takes each repo's checkout from the layout's `worktree`, else `worktreeOnBranch(state.branch)` for items recorded before this change, else the main checkout. `changed_files` and `silenced` paths become physical (`src/Orders/.worktrees/RMS-12/pricing.cs`); `security_path` and `concerns` are computed on `planPathOf` of those paths; each `repos[]` entry keeps `worktree` and `base`.
- `markWaived` gains a path mapper argument; the summary verb passes `planPathOf` for the item's layout, so a waiver in either shape matches.

**Done when:**
- **T-4.1** With a worktree recorded and a change in it, `picket summary <id>` lists `src/Orders/.worktrees/RMS-12/pricing.cs` in `changed_files`, and its `repos` entry names that worktree and the recorded base.
- **T-4.2** An uncommitted change in the main checkout of `src/Orders` does not appear while the worktree is recorded.
- **T-4.3** With `security_paths` holding `src/Orders/auth/`, a change to the worktree's `auth/login.cs` sets `security_path: true`.
- **T-4.4** A waiver recorded for `src/Orders/a.test.cs` marks the silenced move at `src/Orders/.worktrees/RMS-12/a.test.cs` waived (unit test).
- **T-4.5** `picket mutate <id>` plants its mutant in the worktree file, runs the worktree's test command, restores the file byte-identical, and `mutation.json` names the physical path.
- **T-4.6** An item with no nested repos gives the same summary and mutation as before: the existing summary and mutate tests pass, and `npm test` passes.

## Phase 5: Route commits in every touched checkout

**Touch set:**
- `src/lib/shared/route/commit.mts`: `commitCheckouts`
- `src/lib/shared/route/apply.mts`: nested commits before markers
- `src/lib/verbs/route/index.test.mts`: two-repo approval cases
- `src/lib/verbs/packet/packet.mjs`: commit line names the checkouts
- `test/kernel/packet.test.mjs`: commit line cases
- `src/lib/shared/route/plan.mts`: `Change` shapes, read only
- `src/lib/shared/git.mts`: `commitOwned`, `listedPathMatcher` reused

**Changes:**
- `commitCheckouts(root, snap, phase, env): { lines: string[]; refused: string | null }`: the phase's `phasePaths` and `blockFiles`, located; grouped by `dir`, skipping `""`; for each nested `dir` in order, `commitOwned(<root>/<dir>, message, { owns, env })` with no `add`, `owns` built from the `rel` paths. Lines per D-004; the first throw sets `refused` to `<dir> refused the commit: <git's first line>` and stops the loop. The message is `commitMessage`'s, shared with the umbrella commit.
- `applyChanges`: when the changes hold a `commit` for phase N, `commitCheckouts` runs before publish, markers and state. On a refusal, phase N's `approved` marker, its `commit` change and any `run_through` set are dropped, `run_through` is unset, and the refusal line is applied; no verdict row is appended, so `picket next`'s count of cumulative rejections since the last `approved` row is unchanged. Without a refusal, the umbrella commit runs as today.
- Packet: when phase N's paths locate to nested checkouts, the commit field reads `<message>  (staged; approval commits it in <dir>, <dir> and the umbrella)`; otherwise today's text.

**Done when:**
- **T-5.1** In the fixture, approving a phase whose files are staged in the `src/Orders` worktree commits them there with the phase message, then commits `work/<id>/` in the umbrella; the route output names both shas.
- **T-5.2** Unstaged edits in the worktree stay uncommitted, and a staged worktree path outside the phase is reported as left staged.
- **T-5.3** When the worktree has a `pre-commit` hook that exits 1, route writes no `phases/N.approved`, makes no umbrella commit, names `src/Orders/.worktrees/RMS-12` and the hook's message, appends no row to `verdicts.jsonl`, and `picket next` still says `approve_phase`.
- **T-5.4** Approving again after the hook is removed commits the worktree and the umbrella and writes `phases/N.approved`.
- **T-5.5** Under a run grant, the same refusal unsets `run_through` and leaves the phase at `approve_phase`.
- **T-5.6** The packet of such a phase reads `approval commits it in src/Orders/.worktrees/RMS-12 and the umbrella`; a phase with no nested path prints today's commit line.
- **T-5.7** `npm test` passes.

## Phase 6: The `create_worktrees` stop

**Touch set:**
- `src/lib/shared/work/next-step.mts`: the action and its four conditions
- `src/lib/shared/work/next-step.test.mts`: conditions; action count 14
- `src/lib/shared/work/action-text.mts`: both voices
- `src/lib/shared/work/action-text.test.mts`: covers every action, read only
- `src/lib/verbs/reply/table.mts`: reply forms
- `src/lib/verbs/reply/index.mts`: apply through `recordBranch`, `recordNone`
- `src/lib/verbs/reply/index.test.mts`: reply cases
- `src/lib/verbs/packet/packet.mjs`: the stop's packet
- `test/kernel/packet.test.mjs`: packet case
- `src/skills/ordering/SKILL.md`: gate step names the action
- `src/skills/designing/SKILL.md`: gate step names the action
- `src/skills/resuming/SKILL.md`: gate list names the action
- `src/lib/shared/checkouts.mts`: `planWorktrees`, `ticketKey` reused

**Changes:**
- `NextStep` gains `{ action: "create_worktrees"; actor: "user"; phase: number; detail: string; options: string[] }`; `NEXT_ACTIONS` appends `create_worktrees`. In `phasedStep`, when the current phase is not done and D-005's four conditions hold, it is returned before `startStep`. Detail: `phase <n> touches <repos>; name the branch for their worktrees`.
- `ACTION_TEXT.create_worktrees`: user voice `you name the worktree branch`, observer `waits for a worktree branch name`. `action-text.mts` keeps importing nothing (the status mod copies it).
- Reply: `GATE_ACTIONS` gains `create_worktrees`; `Matched` gains `{ kind: "worktrees"; name: string; from?: string }` and `{ kind: "no_worktrees" }`. Forms, in order: `y|yes` when `[y]` is offered gives the ticket key; `n|no|none`; `^(\S+)(?:\s+from\s+(\S+))?$` gives name and `from`, except that a name matching `y|yes|ok|a` (any case) matches nothing, so the reply is refused with the options when `[y]` is not offered. The apply calls `recordBranch` or `recordNone`; a `Refused` from them is the reply's refusal. The reply then prints `picket next`'s sends: the developer's phase, and in the design lane the cross-check.
- Packet: `▶ worktrees before phase <n> · <id>`, the detail, then one line per planned worktree: `<repo>  from <ref> @<base, 8 chars>  ->  <worktree>`, the worktree named after the key when one is offered, else `<name>`; then the options.
- Skills: ordering step 3 says `ARTIFACT WRITTEN` brings `create_worktrees` or `implement_phase`, and its gate step lists `create_worktrees`; designing step 3 says the same and that the cross-check goes out with phase 1 after the reply, and its gate step lists it; resuming's gate bullet lists it.

**Done when:**
- **T-6.1** `nextStep` on a snapshot with `nested: ["src/Orders"]`, phase 1 touching `src/Orders/pricing.cs`, no branch, no `none` and `source: RMS-12` gives `create_worktrees` with options `[y] create RMS-12`, `reply: <name> [from <ref>]`, `[n] use the main checkouts`; without a ticket source the `[y]` option is absent.
- **T-6.2** No nested repos, no nested path in the plan, a recorded branch, or `worktrees: none` each give `implement_phase` (unit tests).
- **T-6.3** `picket reply <id> y` on a design item records branch `RMS-12` and prints the developer's phase 1 send and the reviewer's cross-check send.
- **T-6.4** `picket reply <id> "feature/x from develop"` records branch `feature/x` and each touched repo's `from: develop`; `picket reply <id> n` records `worktrees: none` and prints the phase 1 send.
- **T-6.5** `picket packet <id>` at the stop lists every touched repo with its start ref, an 8-character base and its worktree path.
- **T-6.6** `NEXT_ACTIONS` has 14 entries ending with `create_worktrees`, and the action-text test passes for both voices.
- **T-6.7** The ordering, designing and resuming skills name `create_worktrees` as a gate, and `npm test` passes.
- **T-6.8** With no ticket source, `picket reply <id> y`, `yes`, `ok` and `a` are each refused and record no branch (unit test).

## Phase 7: The developer's `worktrees:` line and the plan-path sentence

**Touch set:**
- `src/lib/shared/work/send.mts`: the `worktrees:` line
- `src/lib/shared/work/send.test.mts`: line present and absent
- `src/agents/developer.md`: Entry sentences, staging per checkout
- `src/agents/architect.md`: plan paths are project-root relative
- `test/repo/agents.test.mjs`: developer Entry fixture with a branch
- `test/support/snapshot.mts`: `layout` input, read only

**Changes:**
- `implementSends` and the `fix_findings` send add `worktrees: picket worktree <id>` after `phase:` (after `review:` for findings) when `state.branch` is set, `layout.worktrees` is not `none`, and `touchedRepos` over the plan is not empty.
- Developer `## Entry` gains two sentences: when the message carries `worktrees: <command>`, run that command before anything else, and stop with `PHASE STALLED` when it exits nonzero; read, edit, test and stage in the paths it prints. Phase loop step 6 says a phase spanning checkouts stages in each with `git -C <checkout> add -A -- <paths inside it>`. The shell stays within 120 lines.
- Architect: the Order and Design sections each gain one sentence: plan paths are project-root relative (`src/Orders/pricing.cs`), never a worktree path, because the kernel maps them.
- The agents test's developer fixture gains a snapshot with a branch and a touched nested repo, so `worktrees:` is a sent key the Entry must name.

**Done when:**
- **T-7.1** `picket next <id>` on an item with branch `RMS-12` and a plan touching `src/Orders` prints `worktrees: picket worktree <id>` in the developer's message at phase 1, at a later phase, and at `fix_findings`.
- **T-7.2** No `worktrees:` line is sent when no branch is recorded, when `worktrees: none`, or when the plan touches no nested repo (unit tests).
- **T-7.3** `test/repo/agents.test.mjs` passes with the developer's Entry naming `worktrees:`.
- **T-7.4** `src/agents/architect.md` says plan paths are project-root relative in both its Order and Design sections.
- **T-7.5** `src/agents/developer.md` is at most 120 lines, and `npm test` passes.

## Phase 8: `branching` in bundle 2's shape, and the docs

**Touch set:**
- `src/skills/branching/SKILL.md`: frontmatter, Steps, Rules, Output
- `src/skills/branching/steps/create.md`: new name; calls the verb
- `src/skills/branching/steps/10-create.md`: removed by `git mv`
- `src/skills/branching/steps/remove.md`: new name; survey and ladder kept
- `src/skills/branching/steps/20-remove.md`: removed by `git mv`
- `src/skills/branching/templates/manifest.example.yaml`: manifest shape, read only
- `test/repo/skills.test.mjs`: `UNCONVERTED_SKILLS`, `PENDING` lists
- `test/repo/description-cases.json`: branching routing cases [INFERRED]
- `docs/reference/skills.md`: the `picket:branching` section
- `docs/how-to.md`: the worktree stop in the daily loop

**Changes:**
- `SKILL.md`: `description` says what it does; `when_to_use` carries `Use when` and the trigger phrasings ("start a branch", "spin up a worktree", "resume work on <branch>", "list my worktrees", "tear down the worktree for <branch>"); `argument-hint`; no `user-invocable: true`. One purpose paragraph. `## Steps` is one ordered list: no branch name for create or remove, ask and stop; create per `steps/create.md`; list, read-only, `git -C <repo> worktree list` per nested repo; remove per `steps/remove.md`. `## Rules`: naming and path rule, resume before create, guarded deletions, runtime collisions out of scope, the manifest is optional because the kernel scans `src/`. `## Output`: what create, list and remove report.
- `steps/create.md`, `# Branching: create`, an ordered list: find the open item (`picket next --latest`; none, say worktrees belong to a work item and stop), run `picket worktree <id> --record <branch> [--from <ref>]`, then `picket worktree <id>`, print its map. No `git worktree` or `git submodule` command.
- `steps/remove.md`, `# Branching: remove`: today's survey, release and ladder, with the manifest step replaced by the nested repos `picket worktree` printed or the `src/` scan.
- `skills.test.mjs`: `UNCONVERTED_SKILLS` becomes `["benchmarking"]`; `PENDING.names` and `PENDING.claims` lose the branching entries.
- `docs/reference/skills.md`: the section names `picket worktree`, drops the developer claim and `--into`. `docs/how-to.md`: a short subsection under the order and design lanes on the `create_worktrees` stop, its three replies, and that a project allowing only `Bash(git add *)` adds an allow rule for `git -C * add *`.

**Done when:**
- **T-8.1** `test/repo/skills.test.mjs` passes with `UNCONVERTED_SKILLS = ["benchmarking"]` and no branching path in any `PENDING` list.
- **T-8.2** No file under `src/skills/branching/` says the developer reads it; its steps are `create.md` and `remove.md`, and `10-create.md` and `20-remove.md` no longer exist.
- **T-8.3** `steps/create.md` holds no `git worktree` or `git submodule` command and runs `picket worktree`.
- **T-8.4** The description routing test passes with the branching cases.
- **T-8.5** `docs/reference/skills.md` and `docs/how-to.md` describe `picket worktree` and the `create_worktrees` stop, and `npm test` passes.

## Phase 9: Close names the worktrees; lint flags worktree plan paths

**Touch set:**
- `src/lib/hooks/lint/schema/index.mts`: worktree-path problem
- `test/hooks/lint.schema.test.mjs`: problem present and absent
- `src/lib/verbs/close/close.mts`: recorded worktrees in the result
- `src/lib/verbs/close/block.mts`: the remove line
- `test/cli/close.test.mjs`: closing block case
- `src/lib/shared/repos.mts`: `readLayout` reused

**Changes:**
- `lint.schema`: each phase's `files` entry and `greps` path holding a `.worktrees/` segment adds `phases[n=<n>] <path> is a worktree path; plan paths are project-root relative`.
- `CloseResult` gains `worktrees: string[]`, the recorded `worktree` entries; the closing block adds `Left for you: /picket:branching --remove <branch> (worktrees: <path>, <path>)` when the list is not empty.

**Done when:**
- **T-9.1** A design record whose phase `files` holds `src/Orders/.worktrees/RMS-12/pricing.cs` gets the lint problem naming that path; `src/Orders/pricing.cs` gets none.
- **T-9.2** `picket close <id> --human` on an item with recorded worktrees prints the remove line naming the branch and every worktree path.
- **T-9.3** An item with no recorded worktrees prints no such line: the existing close tests pass.
- **T-9.4** `npm test` passes.

## Open questions

- **OQ-001** `picket check` takes no item and runs only the umbrella's tooling, so a developer working in a worktree gets no `CHECK OK` from the repo it changed. Should `check` gain `--work <id>` and run per checkout? Owner: user. Fallback: the developer's `Tests:` line cites `picket verify`, which runs each checkout's tests from phase 3 on.
- **OQ-002** `branching --into` (switch an existing worktree onto a new branch, by hand) is dropped by D-008. Keep it as a confirmed manual step? Owner: user. Fallback: dropped; `picket worktree` covers create and resume.

## Revision log
- 2026-10-30: D-001 (r2): a repo added after the reply starts from the planWorktrees chain and records its from; cross-check Minor 3.
- 2026-10-30: D-004 (r2): a refused nested commit appends no verdict row, keeping the rejection count; cross-check Minor 1.
- 2026-10-30: D-005 (r2): reply words are never branch names, so y without [y] is refused; cross-check Minor 2.
