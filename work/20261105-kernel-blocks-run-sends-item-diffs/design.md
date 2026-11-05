---
kind: design
lane: design
title: Kernel blocks, run sends, item diffs
date: 2026-11-05
audience: developer
sources: work/20261105-kernel-blocks-run-sends-item-diffs/request.md, work/20261105-kernel-blocks-run-sends-review-diffs/order.md, work/20261105-kernel-blocks-run-sends-review-diffs/reviews/cumulative.md, work/20261105-kernel-blocks-run-sends-review-diffs/phases/3.fixes.md, src/lib/shared/git.mts, src/lib/util/git.mts, src/lib/shared/review-summary.mts, src/lib/verbs/summary/index.mts, src/lib/shared/ledger.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/apply.mts, src/lib/verbs/close/close.mts, src/lib/shared/paths.mts
phases:
  - n: 1
    files:
      - src/lib/shared/git.mts
      - src/lib/shared/git.test.mts
      - src/lib/shared/review-summary.mts
      - src/lib/verbs/summary/index.test.mts
    greps:
      - path: src/lib/shared/git.mts
        pattern: 'export function commitsBetween\b'
      - path: src/lib/shared/review-summary.mts
        pattern: 'readLedger\('
      - path: src/lib/shared/review-summary.mts
        pattern: 'commitsBetween\('
    tests: true
    drive: true
    security: false
  - n: 2
    files:
      - src/lib/shared/git.mts
      - src/lib/shared/git.test.mts
      - src/lib/verbs/route/index.test.mts
    greps:
      - path: src/lib/shared/git.mts
        pattern: 'gitRead\([^)]*"add"'
        absent: true
      - path: src/lib/shared/git.mts
        pattern: 'index not updated after'
    tests: true
    drive: true
    security: false
---
# Design: Kernel blocks, run sends, item diffs

## Problem
Three of the four fixes of abandoned order `20261105-kernel-blocks-run-sends-review-diffs` landed (d9d312a, 595f05f, fb187cc) and its cumulative review passed S-1 to S-4 and S-6, but failed S-5: `rootOwned` (`src/lib/shared/review-summary.mts:177`) finds an item's commits only by `git log <base>..HEAD -- work/<id>/`, and d9d312a, the phase 1 commit, holds no `work/<id>/` path, so `picket summary` for that item lists 18 files, +323/-26, where its three commits hold 21 product files, +492/-54 (derived from `git show --numstat` of the three commits, bookkeeping left out; the review's +490/-52 is off by two). The folder went missing because `commitOwned` stages its `add` paths in the shared index through `gitRead` (`src/lib/shared/git.mts:210`), which discards a failed `git add`, while the commit itself runs on a temporary index and succeeds. A held `.git/index.lock` reproduces it: `git add -A -- work/x/` exits 128 with `Unable to create '.../index.lock': File exists`, and a commit through `GIT_INDEX_FILE` with the same lock held takes the folder (probes run 2026-11-05). The ledger's accept rows (`.picket/state/ledger.jsonl`, rows 5268, 5272, 5274) name all three commits, including the close commit's kind (`phase: null`) that `close.mts:199` records.

## Decisions
### D-001: An item's own commits are its work folder commits plus its ledger accept commits
**Decision:** For an item with phases, the summary's own commits are the union of two sources, kept only when the commit is in `<base>..HEAD` and counted once: the commits that touch `work/<id>/` (today's `commitsTouching`), and the commits named by the ledger's `accept` rows whose `work_id` is the item, resolved to a full sha with `revParse`. Accept rows cover both phase commits (`phase: N`) and the close commit that carries review fixes (`phase: null`), which is what the request calls "the phase commits and fix commits recorded for the item". The union is ordered as `git rev-list --reverse <base>..HEAD` orders it, so the silenced scan's before-image stays the parent of the oldest own commit. Everything else in `rootOwned` (owned dirty paths, per-commit numstat over product files) is unchanged. Infrastructural decision.
**Instead of:** taking every commit in the range whose files a phase owns: a commit of another item that edits a shared file (here `src/lib/shared/work/block.mts` is in all three phases) would join the item's summary, which is the leak S-5's sibling S-6 forbids.
**Risks:**
- **RISK-001** The ledger lives in `.picket/state/`, which git ignores, so on another machine or in a fresh clone a phase commit that missed the folder is invisible again. Mitigation: D-002 makes the folder part of every phase and close commit, so the ledger is the second source only for history such as d9d312a.
- **RISK-002** A ledger row whose short sha no longer resolves (a rewritten branch) is dropped silently. Mitigation: accepted; the range filter already drops commits outside `<base>..HEAD`, and the work folder source still finds a rewritten commit that holds the folder.

### D-002: The commit's add paths are staged in the temporary index, not the shared one
**Decision:** `commitOwned` stops running `git add` on the shared index. After `buildTemporaryIndex`, it runs `git add -A -- <path>` for each `add` path against the temporary index (`GIT_INDEX_FILE`, through `gitStrict`, so a failure throws before any commit and leaves HEAD as it was). The commit's paths are then the temporary index's diff against HEAD, and no commit is made when that diff is empty. The shared index sync after the commit (`git reset -q` over the committed paths) no longer throws: a failure becomes a `warnings` line `index not updated after <sha>: <last stderr line>; run git reset -q -- <paths>`, where `<paths>` are the `add` paths plus the committed paths outside them, and the result still carries the sha, so `commitPhase` records the accept row. Both callers (`commitPhase`, `commitClose`) gain this; nested checkouts pass no `add` paths and keep today's path. This keeps the rule in `work-items` that `git log -1 --format=%h -- work/<id>/phases/N.approved` names the phase commit, and `close.mts`'s commit range, which reads the same marker. Infrastructural decision. Maintenance cost: `commitOwned` now writes two indexes in a fixed order, and a reader has to know that the shared index is only synced afterwards.
**Instead of:** keeping the shared index add and reporting its failure as a warning (the abandoned order's D-004 r2): the commit would still miss the folder, the approval marker rule and the close range would still break, and the lead would have to commit the folder by hand.
**Risks:**
- **RISK-003** After a sync warning the shared index lacks the committed work folder entries, so `git status` shows them as staged deletions plus untracked files until the lead runs the named reset. Mitigation: the warning names the exact command; T-2.1 pins it.
- **RISK-004** The add now always takes the working tree copy of `work/<id>/`, even when the shared index holds a different staged copy of a file there. Mitigation: this is today's behaviour too (`add -A` on the shared index ran first); the existing route and close tests pin it.
- **RISK-005** An `add` path that matches nothing (never tracked and absent) now fails the commit, where the silent add skipped it. Mitigation: both callers write their add paths just before the commit (`applyChanges` writes the markers, `commitClose` publishes the reports), and the throw happens before `git commit`, so HEAD is unchanged and the error reaches the caller's existing catch.

## Scope
**In:**
- How the item summary finds an item's own commits: the work folder, the ledger's accept rows (phase and close commits), the base range
- `commitOwned`'s add paths and the failure of the shared index sync, for phase and close commits
- The gap S-5 of the abandoned order's cumulative review; the other request points are met by d9d312a, 595f05f and fb187cc (S-1 to S-4, S-6 PASS in `work/20261105-kernel-blocks-run-sends-review-diffs/reviews/cumulative.md`)
**Out:**
- Block label parsing, the run grant hand-off, the idle marker, the repeat drop and the owned dirty path filter, which already meet the request
- The commit message shape and `commit-message.mts`; the Markdown mod
- Nested repository diffs, `picket summary --range`, and rewriting d9d312a or any other published commit

## Phase 1: The summary finds commits from the ledger too
**Touch set:**
- `src/lib/shared/git.mts`: add commitsBetween
- `src/lib/shared/git.test.mts`: commitsBetween order test
- `src/lib/shared/review-summary.mts`: own commits from two sources
- `src/lib/verbs/summary/index.test.mts`: ledger-only commit tests
- `src/lib/shared/ledger.mts`: read only, AcceptRow, readLedger, recordAccept
- `src/lib/verbs/summary/index.mts`: read only, ownedPaths caller
- `src/lib/shared/paths.mts`: read only, CLAUDE_PROJECT_DIR wins

**Changes:** In `git.mts`, add `commitsBetween(root, base): string[]`, the full shas of `<base>..HEAD` oldest first (`rev-list --reverse`), `[]` when git fails. In `review-summary.mts`, `rootOwned` takes its commit list from a new private `ownCommits(root, id, base): string[]` (D-001): the range from `commitsBetween`; the union of `commitsTouching(root, base, workRel(id))` and the `revParse` of every `readLedger(root)` row with `event === "accept"` and `work_id === id`; kept when in the range; in range order. `rootOwned`'s per-commit files, numstat, dirty paths and `before` read that list unchanged. Tests write accept rows with `recordAccept`.

**Done when:**
- **T-1.1** A `summary/index.test.mts` test builds an item with one phase owning `a.ts`, commits `a.ts` alone (no `work/<id>/` path), records an accept row for that commit with `recordAccept`, then commits `work/<id>/` alone; `itemSummary` gives `changed_files` `["a.ts"]` and the line counts of the `a.ts` commit.
- **T-1.2** In the same file, an accept row for the item whose commit is the base itself, and an accept row of another work id naming a commit in the range that holds `b.ts`, both leave `b.ts` and the base commit's files out of `changed_files`.
- **T-1.3** A commit that both touches `work/<id>/` and has an accept row is counted once: `lines_added` equals that commit's product lines, not twice them.
- **T-1.4** An `it.only` focus committed in a test file the phase owns, in a commit found only through its accept row, is listed in `silenced` (the before-image is that commit's parent).
- **T-1.5** A `git.test.mts` test asserts `commitsBetween` returns the full shas after the base, oldest first, and `[]` for a base that does not resolve.
- **T-1.6** The existing tests in `src/lib/verbs/summary/index.test.mts` and `src/lib/shared/git.test.mts` pass unchanged (before-image: their copies at base fb187cc; `git diff fb187cc -- <file>` shows only added lines).
- **T-1.7** Drive: `git clone -q` this repository into a scratch folder, copy `.picket/state/ledger.jsonl` into the clone's `.picket/state/`, and run `node <repo>/dist/bin/picket.mjs summary 20261105-kernel-blocks-run-sends-review-diffs` with the clone as working directory and `CLAUDE_PROJECT_DIR` set to the clone. Before the first edit (base dist) it gives 18 `changed_files`, +323/-26. After the phase and `npm run build` it gives 21 `changed_files` (the 18 plus `src/lib/hooks/guard/block/index.mts`, `src/lib/verbs/route/index.test.mts`, `test/hooks/guard.block.test.mjs`), `lines_added` 492 and `lines_removed` 54.
- **T-1.8** `npm test` passes.

## Phase 2: The phase commit always carries the work folder
**Touch set:**
- `src/lib/shared/git.mts`: temporary index add, sync warning
- `src/lib/shared/git.test.mts`: held lock and sync tests
- `src/lib/verbs/route/index.test.mts`: approval under a held lock
- `src/lib/util/git.mts`: read only, gitRun, GitFailed lastLine
- `src/lib/shared/route/commit.mts`: read only, commitPhase, recordAccept
- `src/lib/shared/route/apply.mts`: read only, markers before commit
- `src/lib/verbs/close/close.mts`: read only, commitClose add paths
- `src/lib/verbs/close/index.test.mts`: read only, close commit tests

**Changes:** In `commitOwned` (D-002), drop the shared index `add` loop. Build the temporary index as today from the owned staged paths, then run `git add -A -- <path>` for each `add` path through `gitStrict` with `withIndex(env, index)`. Take the commit's path list from the temporary index's `diff --cached --name-only --no-renames` against HEAD (the empty tree when there is no HEAD); when it is empty, remove the temporary index and return `sha: null` with today's `left_staged`. `committed` in the result is that list. After `git commit`, the shared index `reset` over `committed` runs in a `try`: a `GitFailed` adds the warning `index not updated after <sha>: <lastLine>; run git reset -q -- <paths>` (the `add` paths, then the committed paths not under an `add` path, space separated) and the function still returns the sha. The `HEAD moved` warning stays. `commitPhase` and `commitClose` keep their signatures and catches.

**Done when:**
- **T-2.1** A `git.test.mts` test with an untracked `work/x/state.yaml`, a staged owned `src/a.js` and a `.git/index.lock` file present calls `commitOwned` with `add: ["work/x/"]`: `sha` equals HEAD, `git show --name-only HEAD` lists exactly `src/a.js` and `work/x/state.yaml`, `warnings` is one line that starts `index not updated after <sha>: ` and ends `; run git reset -q -- work/x/ src/a.js`, and the lock file still exists.
- **T-2.2** The same setup without the lock commits the same two paths with `warnings` `[]`, and afterwards `git status --porcelain` prints nothing.
- **T-2.3** With only `work/x/` changed and nothing owned staged, `commitOwned` commits `work/x/state.yaml` alone; with `work/x/` unchanged and nothing owned staged, it returns `sha: null` and HEAD is unchanged.
- **T-2.4** A `route/index.test.mts` test (`repoWithPhasedOrder`) stages `src/a.js`, routes developer `PHASE DONE` phase 1, creates `.git/index.lock`, routes user `approved` phase 1, and asserts `git log -1 --format=%h -- work/<id>/phases/1.approved` equals `git rev-parse --short HEAD`, `applied` has a line starting `index not updated after`, and the ledger holds an `accept` row for phase 1 whose `commit` is that HEAD.
- **T-2.5** The existing tests in `src/lib/shared/git.test.mts` (the failed commit test included), `src/lib/verbs/route/index.test.mts` and `src/lib/verbs/close/index.test.mts` pass unchanged (before-image: their copies at base fb187cc; `git diff fb187cc -- <file>` shows only added lines).
- **T-2.6** Drive: in a scratch git project, `picket open --lane order`, a record with one phase listing `src/a.js`, a saved block, developer `PHASE DONE` phase 1 routed, `src/a.js` staged, and an empty `.git/index.lock` created; `picket route <id> --verdict approved --agent user --phase 1`. With the base dist (before-image, before the first edit) it prints `committed <sha>` with no warning and `git show --name-only HEAD` has no `work/<id>/` path. After the phase and `npm run build`, it prints `committed <sha>` and an `index not updated after` line, and `git show --name-only HEAD` lists `work/<id>/phases/1.approved`; after `mv` moves the lock away and `git add -A -- work/<id>/` runs, `git status --porcelain -- work/<id>/` prints nothing.
- **T-2.7** `npm test` passes.

## Open questions
- **OQ-001** What held the shared index when d9d312a was committed at 2026-11-05 11:17:54Z? `gitRead` discarded the error, so no record names it; a held `index.lock` reproduces the miss, and the status line's or another session's `git status` are the likely holders. Owner: operations. Fallback: D-002 removes the shared index from the commit path, so the phases do not depend on the answer.

## Revision log
