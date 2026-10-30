# 18: Worktrees through the kernel

Status: approved (2026-10-30).

Step 5, second standalone item, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: D5 as approved on 2026-10-28. The developer creates a work item's worktrees through a new verb, `picket worktree`, after one user stop; a plan path maps into the item's worktree for verify, mutate, the phase commit and the review summary; route commits inside each touched nested repo; `branching` drops the claim that the developer reads it and calls the verb.

## Today

| Fact | Value |
|---|---|
| `branching` | `SKILL.md` 4,140 bytes, `steps/10-create.md` 3,975, `steps/20-remove.md` 2,559, `templates/manifest.example.yaml` 1,292; its description says "The developer reads it at a work item's first phase"; no shell names it, and in development the user typed `/picket:branching` in 28 of 45 sessions, the lead twice, agents never |
| Repos | `nestedRepos` reads `.picket/state/branching.yaml` or scans `src/*/.git`; `picket open` records each nested repo's HEAD in `work/<id>/repos.yaml`; the review summary diffs each nested repo against that base |
| Verify, mutate | read plan paths in the umbrella and run the root `package.json`'s tests, never a worktree's |
| Phase commit | `src/lib/shared/route/apply.mts` commits in the umbrella only; development's nested commits are made by hand (in one item, 13 s before route's own commit) |
| State | `branch` is a state field set by `picket set`; nothing records "no worktrees, use the main checkouts" |
| Next actions | `NEXT_ACTIONS` has no worktree step; `guard.bash` treats every `git worktree` subcommand but `list` as unknown, so each prompts |
| Unconverted | `branching` is one of the two skills left in `UNCONVERTED_SKILLS` (with `benchmarking`, D9) |

## Target

### `picket worktree <id>`

- `--record <name> [--from <base>]`: the lead records the gate reply, the branch in the state and the base per repo in `repos.yaml`; creates nothing.
- `--none`: records `worktrees: none` in `repos.yaml`; the item runs in the main checkouts.
- No flag (the developer, at phase 1): for every nested repo the plan's `files` touch, create the worktree on the recorded branch at `<repo>/.worktrees/<branch with / and spaces as ->`, or resume it when it exists; hydrate only `-` submodules; re-record each repo's base from the worktree's start commit; print the path map. It is idempotent, so an amendment that adds a repo is picked up by the next phase's call. A `+` submodule is reported; a `U` submodule stalls the phase.

### One path mapping

A plan path is project-root relative (`src/Webapp/src/...`), never a worktree path. One function maps it into the item's worktree when one exists for its repo, and `verify` (files, greps, the test tooling of each touched worktree), `mutate`, the phase commit and the review summary all use it.

### Commits

Route commits a phase inside each touched worktree with the phase message, then `work/` in the umbrella. The packet's commit line names one sha per repo.

### The user stop

A new `picket next` action, `create_worktrees`, by the user, comes before phase 1 when the project has nested repos, the plan touches one, no branch is recorded and `repos.yaml` does not say `worktrees: none`. The packet lists every touched repo with its base and the worktree path. `[y] create <KEY>` defaults the name from `state.source` when it is a ticket key; otherwise it shows only "reply: <name> [from <base>]". `[n]` runs `--none`. `picket reply` maps both. `action-text.mts` gains the action's text, so the band and `inject.state` show it.

### Text

- The order and design open steps run `picket next` after `ARTIFACT WRITTEN`; the design cross-check starts with phase 1, after the reply.
- `picket next` adds a `worktrees: picket worktree <id>` line to the developer's message for every phase of an item with a recorded branch. The developer's Entry gains two sentences: run that line first, and work in the printed paths.
- The architect's order and design sections gain one sentence: plan paths are project-root relative.
- `branching` takes bundle 2's shape: the developer claim goes, its create step calls `picket worktree`, it defaults to all touched repos, list and remove stay. `UNCONVERTED_SKILLS` is left with `benchmarking` only.

### Nice to have, in this item when the caps allow

`picket close --human` lists the item's worktrees and the remove command; `lint.schema` flags a plan path that is a worktree path; the fast lane offers worktrees in one line and runs `picket worktree <id> --repos <paths>`.

## Decisions

- **D-1 The kernel creates worktrees; the user names the branch.** Development shows the developer never read `branching`, and a branch name is the user's call (ticket keys, team conventions); one stop, then code does the git work.
- **D-2 Plan paths stay project-root relative.** The plan is written before any worktree exists, and every reader (verify, the reviewer, the summary) needs one shape; the mapping is one function, not a convention each reader repeats.
- **D-3 Route commits in every touched repo.** A nested commit made by hand is a commit no gate saw; the packet's per-repo sha makes it visible.
- **D-4 The stop exists only when it can matter.** No nested repos, or a plan that touches none, or a recorded branch or `none`, and `create_worktrees` never appears; the bench fixture has no nested repos, so its stop counts hold.
- **D-5 Only `-` submodules are hydrated.** A `+` submodule may hold work at a different commit; overwriting it silently loses work, so it is reported, and a `U` conflict stops the phase.

## Migration

1. `picket worktree` with `--record`, `--none` and the create path; the path mapping function; a two-repo test fixture.
2. Verify, mutate and the review summary read through the mapping.
3. Route commits per touched repo; the packet's per-repo sha line.
4. `create_worktrees` in `picket next`, `picket reply`, `picket packet` and `action-text.mts`.
5. Text: the open steps, the developer's Entry, the architect's sections, `branching` in bundle 2's shape, `UNCONVERTED_SKILLS`, the docs.
6. The nice-to-have items, if the caps allow.

## Risks

- Route committing in several repos can fail halfway (a hook in one nested repo). The phase stays unapproved, and the packet names the repo that refused; the umbrella's `work/` commit runs last.
- `verify` running each worktree's test tooling depends on finding it; a repo with no recognised tooling reports "no suite detected" for that repo rather than failing the phase.
- The bench has no nested repo task, so the new paths are tested only by unit tests and the two-repo fixture; development's next session is the first real use.

## Affects

`src/lib/verbs/worktree/` (new), `src/lib/shared/repos.mts`, `src/lib/shared/route/{apply,plan}.mts`, `src/lib/verbs/{verify,mutate,summary,reply,packet,close}/`, `src/lib/shared/work/{next-step,action-text,send}.mts`, `src/lib/shared/review-summary.mts`, `src/lib/hooks/guard/bash/rules.mts`, `src/agents/{developer,architect}.md`, `src/skills/{ordering,designing,branching}/`, `test/repo/skills.test.mjs`, `docs/reference/`, `docs/how-to.md`.

## Open questions

None.
