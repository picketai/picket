---
kind: order
lane: order
title: tether close commits the closing state
date: 2026-10-08
audience: developer
sources: request; core/lib/route.mjs; core/lib/git.mjs; core/bin/tether.mjs; core/skills/ordering/SKILL.md; core/skills/designing/SKILL.md; core/skills/researching/SKILL.md; core/skills/ordering/steps/40-review.md; core/skills/expediting/steps/30-check.md; test/kernel/names.test.mjs; test/kernel/route.test.mjs; test/kernel/cli.test.mjs
phases:
  - n: 1
    files:
      - core/lib/close.mjs
      - core/bin/tether.mjs
      - test/kernel/close.test.mjs
      - test/kernel/names.test.mjs
    greps:
      - path: core/bin/tether.mjs
        pattern: case "close"
      - path: core/lib/close.mjs
        pattern: commitStaged
    tests: true
    drive: true
  - n: 2
    files:
      - core/skills/ordering/SKILL.md
      - core/skills/designing/SKILL.md
      - core/skills/researching/SKILL.md
      - core/skills/ordering/steps/40-review.md
      - core/skills/expediting/steps/30-check.md
    greps:
      - path: core/skills/ordering/SKILL.md
        pattern: tether close <id>
      - path: core/skills/designing/SKILL.md
        pattern: tether close <id>
      - path: core/skills/researching/SKILL.md
        pattern: tether close <id>
      - path: core/skills/ordering/steps/40-review.md
        pattern: tether close <id>
      - path: core/skills/expediting/steps/30-check.md
        pattern: tether close <id> --message
    tests: true
    drive: false
---
# Order: tether close commits the closing state

## Problem

The order, design and research lanes close with `tether set <id> status=done`, which writes `state.yaml` and commits nothing. The closing state, the cumulative review's `N.reviewed` markers and a research lane's `research.md` stay uncommitted until someone notices. The fast lane fixed this in prose (2398df5: set, `git add -- work/<id>`, commit), so two lanes now close two different ways and three still leave the tree dirty. The kernel already knows how to commit staged work with the work item riding along: `commitStaged(root, message, alsoAdd)` in `core/lib/git.mjs`, which `commitPhase` in `core/lib/route.mjs` calls on approval.

## Decisions

### D-001: closing is one kernel verb that reuses commitStaged
**Decision:** New verb `tether close <id>` backed by `close(id, root, { message })` in a new `core/lib/close.mjs`. It sets `status: done` and deletes `blocked_reason` through `readState`/`writeState`, as the `set` case in `core/bin/tether.mjs` does, then calls `commitStaged(root, message, [\`work/${id}\`])`, the same call `commitPhase` makes, so `work/<id>` is staged with `git add -A` and the index is committed in one step. It prints JSON `{ ...state, commit, message, committed, dirty }` where `commit` is the short sha or `null` when nothing was staged, `committed` is the list of staged paths taken by the commit, and `dirty` is `dirtyPaths(root)` after the commit; `--human` prints `<id>: closed · committed <sha> <message>` plus the same `WARNING: uncommitted changes: …` line `tether set` prints today. Example: an order item whose last cumulative review left `phases/1.reviewed` untracked ends with one commit `chore: close <id>` holding `state.yaml`, `verdicts.jsonl` and `phases/1.reviewed`.
**Instead of:** every lane spelling out `tether set`, `git add -- work/<id>` and `git commit` in its skill text: three prose steps per lane are how three lanes ended up leaving the state uncommitted; code decides what code can decide.

### D-002: one verb, two commit shapes, chosen by --message
**Decision:** Without `--message`, the message is `chore: close <id>` and the verb refuses (exit 2, nothing written) when the index already holds a staged path outside `work/<id>/`, naming those paths, so a forgotten staged change never lands under a chore message. With `--message "<m>"`, the whole index is committed under `<m>`: that is the fast lane's single commit, where the developer has already staged the touch set and the proposed message describes it. The fast lane keeps its one-commit shape; only `30-check.md` names `--message`.
**Instead of:** the fast lane keeping its prose sequence, or closing with a second `chore: close` commit: the first leaves two ways to close a work item, the second splits a one-commit fast change into two commits, which the lead ruled out.
**Risks:**
- **RISK-001** An order-lane close run with `--message` would sweep a stray staged file into the closing commit. Mitigation: the `committed` list in the output names every path the commit took, and only the fast-lane step file uses the flag.

### D-003: state first, commit second; re-running close retries
**Decision:** `close` writes `status: done` before it commits. When `git commit` fails (a hook refuses, no identity), the verb exits 2 with the git error from `commitStaged`, and the state stays `done` and staged. Running `tether close <id>` again stages `work/<id>` and commits; an item already `done` with nothing staged prints `commit: null` and exits 0. An item whose status is `abandoned` is refused with exit 2.
**Instead of:** rolling `state.yaml` back on a failed commit: a rollback that can itself fail leaves a worse state than a staged `done`, and a retry needs nothing but the same command.

## Scope

**In:** the `close` verb, its tests, and the five skill lines the request names.
**Out:** removing or changing `tether set status=done` (it stays for manual use); the other `tether set` uses (`status=abandoned`, `status=open`, `branch=`); any change to `commitStaged` or `commitPhase`.

## Phase 1: The close verb

**Touch set:**
- `core/lib/close.mjs`: close(): state, guard, commit
- `core/bin/tether.mjs`: `close` case, unknown-verb list
- `test/kernel/close.test.mjs`: close in a temp git repo
- `test/kernel/names.test.mjs`: add close to CLI_VERBS

**Changes:** Create `core/lib/close.mjs` per D-001 to D-003, importing `commitStaged`, `stagedFiles` and `dirtyPaths` from `./git.mjs` and `readState`, `writeState` from `./work.mjs`. Add `case "close"` to `core/bin/tether.mjs` (`close needs <id>` on a missing id, exit 2 on a refusal or a failed commit) and add `close` to the verb list in the `default:` error. Add `"close"` to `CLI_VERBS` in `test/kernel/names.test.mjs`. The tests build a temp repo the way `test/kernel/route.test.mjs:92` does (`-c user.email=t@t -c user.name=t`) and run the CLI with `--root`.

**Done when:**
- **T-1.1** In a temp repo with an open item and an untracked `work/<id>/phases/1.reviewed`, `tether close <id>` exits 0, `git log -1 --format=%s` prints `chore: close <id>`, `git show --stat HEAD` lists `state.yaml` and `phases/1.reviewed`, and `git status --porcelain -- work/<id>` prints nothing.
- **T-1.2** With `src/a.ts` staged, `tether close <id>` exits 2, names `src/a.ts`, and leaves `state.yaml` at `status: open` and HEAD unchanged.
- **T-1.3** With `src/a.ts` staged, `tether close <id> --message "fix: a"` exits 0 and the one new commit, subject `fix: a`, holds both `src/a.ts` and `work/<id>/state.yaml`.
- **T-1.4** Running `tether close <id>` a second time exits 0 with `commit: null` and adds no commit; on an `abandoned` item it exits 2.
- **T-1.5** With a commit-msg hook that exits 1, `tether close <id>` exits 2, `state.yaml` reads `status: done`, and it is staged; after removing the hook, `tether close <id>` commits it.
- **T-1.6** `--human` prints `<id>: closed · committed <sha> chore: close <id>`, plus the `WARNING: uncommitted changes:` line when a path outside `work/` is dirty.
- **T-1.7** `npm test` passes.

## Phase 2: Lanes close with tether close

**Touch set:**
- `core/skills/ordering/SKILL.md`: close row uses the verb
- `core/skills/designing/SKILL.md`: close row uses the verb
- `core/skills/researching/SKILL.md`: close row uses the verb
- `core/skills/ordering/steps/40-review.md`: on close, run the verb
- `core/skills/expediting/steps/30-check.md`: commit reply, one commit

**Changes:** In the three SKILL.md `close` rows and in `40-review.md` line 33, replace `tether set <id> status=done` with `tether close <id>`; nothing else in those lines changes. In `30-check.md` line 32, the commit reply becomes: `tether close <id> --message "<the proposed message>"`, which commits the staged change and the closing state together; print `committed <sha>` and stop. The `x <why>` row and its `status=abandoned` stay.

**Done when:**
- **T-2.1** `grep -rn "status=done" core/skills` prints nothing.
- **T-2.2** Each of the five files contains `tether close <id>`, and `30-check.md` contains `tether close <id> --message`.
- **T-2.3** `git diff --stat` for the phase shows one changed line in each of the five files.
- **T-2.4** `npm test` passes, including `test/budgets.test.mjs` and `test/kernel/names.test.mjs`.

## Open questions

none

## Revision log
