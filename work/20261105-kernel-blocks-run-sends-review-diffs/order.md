---
kind: order
lane: order
title: Kernel blocks, run sends, review diffs
date: 2026-11-05
audience: developer
sources: work/20261105-kernel-blocks-run-sends-review-diffs/request.md, src/lib/shared/work/block.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/plan.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/route/verdict/index.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/send.mts, src/lib/shared/work/next-view.mts, src/lib/shared/work/files.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/review-summary.mts, src/lib/shared/git.mts, src/lib/verbs/summary/index.mts, src/lib/verbs/packet/packet.mjs, work/20261103-pr-reviews-read-the-linked-ticket/, work/20261103-commit-message-review-follow-up-fixes/
phases:
  - n: 1
    files:
      - src/lib/shared/work/block.mts
      - src/lib/shared/work/block.test.mts
      - src/lib/hooks/guard/block/index.mts
      - test/hooks/guard.block.test.mjs
      - src/lib/verbs/route/index.test.mts
    greps:
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'parseBlock\('
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'startsWith\(`\$\{label\}:'
        absent: true
      - path: src/lib/shared/work/block.test.mts
        pattern: 'reads a bold label only for Commit'
        absent: true
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/work/files.mts
      - src/lib/shared/work/files.test.mts
      - src/lib/shared/work/snapshot.mts
      - test/support/snapshot.mts
      - src/lib/shared/work/send.mts
      - src/lib/shared/work/send.test.mts
      - src/lib/shared/work/next-view.mts
      - src/lib/shared/work/next-view.test.mts
      - src/lib/shared/work/block.mts
      - src/lib/hooks/route/verdict/index.mts
      - src/lib/hooks/route/verdict/index.test.mts
      - src/rules/work-items.md
    greps:
      - path: src/lib/shared/work/files.mts
        pattern: 'MARKERS = \[[^\]]*"idle"'
      - path: src/lib/shared/work/send.mts
        pattern: 'export function runHandOff\b'
      - path: src/lib/shared/work/block.mts
        pattern: 'export function latestSavedBlock\b'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '"idle"'
      - path: src/rules/work-items.md
        pattern: 'N\.idle'
    tests: true
    drive: true
  - n: 3
    files:
      - src/lib/shared/git.mts
      - src/lib/shared/git.test.mts
      - src/lib/shared/review-summary.mts
      - src/lib/shared/work/block.mts
      - src/lib/shared/work/block.test.mts
      - src/lib/verbs/summary/index.mts
      - src/lib/verbs/summary/index.test.mts
    greps:
      - path: src/lib/shared/git.mts
        pattern: 'export function commitsTouching\b'
      - path: src/lib/shared/review-summary.mts
        pattern: 'commitsTouching\('
      - path: src/lib/shared/work/block.mts
        pattern: 'export function fixesFiles\b'
    tests: true
    drive: true
---
# Order: Kernel blocks, run sends, review diffs

## Problem
Four kernel gaps cost gates and re-runs. Gap 1 is caused by gap 2: `parseBlock` reads a bold label only for `**Commit:**`, so a parse of `work/20261103-pr-reviews-read-the-linked-ticket/phases/1.block.md` and `2.block.md` gives only the `commit` field (probe run 2026-11-05), `blockFiles` is empty, and `commitPhase`'s `reported` matcher let `src/lib/shared/paths.test.mts` stay staged until phase 3's plain `Files:` line took it (078227e). Gap 3: under a run grant the route hook's context continues the developer into the next phase; `picket next`, run on another agent's notification, still printed a send for that phase, and the queued message made the developer re-emit its block, adding a second `PHASE DONE` row for phase 3 of `work/20261103-commit-message-review-follow-up-fixes` (16:03:10 and 16:03:28). Gap 4: `changesOfItem` diffs the whole tree from the item's base, so `picket summary 20261103-pr-reviews-read-the-linked-ticket` lists 28 files, +1369/-60, including the files of the other item's commits ba99e55, 62c2f05 and 7f9540b.

## Decisions
### D-001: One block reader for plain, bold and bulleted labels
**Decision:** `parseBlock` reads every block field in three label forms: plain `Files: x`, bold `**Files:** x` (and `**Files**: x`), and a bulleted label `- Files: x`. A label line may be followed by list items (`- `, `* `, `1. `); their texts join the inline value with `; `. Bold and bulleted labels are matched only against the known `BLOCK_FIELDS` names, so a list item such as `- T-1.5: ...` is never a label; the plain form keeps today's generic label pattern. `guard.block` stops scanning lines with `startsWith` and reads its fields through `parseBlock`, so the guard, the packet, the reply and the commit see the same values. This removes the cause of gap 1 without a commit-specific fix.
**Instead of:** bouncing the bold shape in `guard.block` with the plain one-line form: the bounce is skipped on a continued stop (`stop_hook_active`), which is exactly how the bold phase 1 block got saved, and each bounce costs a model turn.
**Risks:**
- **RISK-001** A free-text line in a block's headline that starts with a known label in bold now ends the headline early. Mitigation: only the ten phase labels and the other kinds' listed labels match, and T-1.3 pins every existing plain-form test.

### D-002: The run grant hand-off is derived, and an idle stop is recorded
**Decision:** `runHandOff(snap, session)` in `send.mts` returns the phase the run grant handed to the live developer, or null. It holds when the current phase `c` is not done, phase `c - 1` is approved, `run_through >= c`, the newest row the current developer instance owns is `PHASE DONE` for `c - 1` in `session`, no `user` row follows that row, and `phases/c.idle` does not exist. While it holds, `sendsFor` gives no send for `implement_phase` and the view's detail says the developer took the phase from the run grant. The route hook writes `phases/c.idle` when a continued `picket:developer` stop (`stop_hook_active`) ends with nothing routed while `runHandOff` holds: the developer stopped without phase `c`'s block, so the next `picket next` prints the send again.
**Instead of:** having the route hook tell the developer to end its turn after each auto-approved phase, so every phase goes through a lead send: Claude Code continues a subagent after any `SubagentStop` context, so the prose would be the only guard, and every phase would cost a lead round.
**Risks:**
- **RISK-002** The hand-off rests on Claude Code continuing a subagent after `SubagentStop` additional context (seen in the developer transcripts of both evidence items, not documented). Mitigation: OQ-001; the derivation is pure on the snapshot, so a change of platform shows as an `implement_phase` view whose detail names the hand-off.
- **RISK-003** The idle check adds a snapshot read to developer stops that route nothing, inside the 200 ms hook budget. Mitigation: the read runs only for `picket:developer` continued stops with a work id; `test/timing/budgets.test.mjs` still runs.

### D-003: An identical re-emitted block routes nothing
**Decision:** The route hook drops a developer block whose text, normalised as `saveBlock` normalises it, equals the newest saved block for its phase (`latestSavedBlock`: the last entry of `N.fixes.md`, else `N.block.md`) while the newest developer row is `PHASE DONE` for that phase. It appends no row, saves nothing and returns no context. A block that differs in any line still routes, so a fix after a review or a rejection keeps its row.
**Instead of:** collapsing repeated rows when the verdict log is read: every reader (`next`, `close`, the band, the cost report) would need the same rule, and `N.fixes.md` would still gain the copy.

### D-004 (r2): An item's summary covers its own commits and the paths its phases own
**Decision:** For an item with phases, `changesOfItem` lists the product files of the item's own commits plus the dirty paths (staged, unstaged or untracked) that the item owns: every phase's plan paths, the files on each phase's block `Files:` line, and those on each `N.fixes.md` entry. The own commits come from two sources: the commits in `<base>..HEAD` that touch `work/<id>/`, and the ledger's `accept` rows for the id whose commit resolves (`revParse`) to a commit in `<base>..HEAD`. Their union counts once. A phase commit can miss the folder: the approval of phase 1 here left `work/<id>/` out of d9d312a, and the folder landed in 595f05f, while the ledger row names d9d312a for phase 1. That add can no longer fail silently either: `commitOwned` runs each `add` path through `gitRun`, and a failure becomes a `warnings` line (`git add <path> failed: <last stderr line>`). The commit still runs, and `commitPhase` already prints its warnings. Line counts sum each own commit's numstat over its product files and the owned dirty paths' diff against HEAD. The silenced scan uses the parent of the oldest own commit as its before-image (HEAD when there is none) and only the item's files. An item with no phases (fast lane, no record yet) keeps today's base diff. Nested repositories keep their recorded-base diff.
**Instead of:** a `Picket-Work: <id>` trailer on every phase commit, found with `git log --grep`: it changes the commit message shape, which this item leaves out of scope.
**Risks:**
- **RISK-004** Another item's commit between two of this item's commits that edits a shared file leaks into the silenced before-image diff. Mitigation: accepted; `changed_files` and the line counts stay exact, and the reviewer grades only the changed files.
- **RISK-005** The ledger lives in `.picket/state/`, which git ignores, so on another machine a phase commit that missed `work/<id>/` drops out of the summary. Mitigation: the add failure now prints a warning at the approval, where the lead can commit the folder by path.

## Scope
**In:**
- Block label parsing in `block.mts` and its use by `guard.block`
- The run grant hand-off in `send.mts` and `next-view.mts`, the `idle` marker, and the route hook's idle and repeat handling
- The item summary's `changed_files`, line counts and silenced inputs for the root repository
- `commitOwned` reporting a failed `add` as a warning
**Out:**
- The commit message shape and `commit-message.mts`
- The Markdown mod
- Developer and reviewer prose; nested repository diffs; `picket summary --range`

## Phase 1: Every block label form is read
**Touch set:**
- `src/lib/shared/work/block.mts`: label forms, list items, Files split
- `src/lib/shared/work/block.test.mts`: label form tests, retire old one
- `src/lib/hooks/guard/block/index.mts`: read fields through parseBlock
- `test/hooks/guard.block.test.mjs`: bold block passes and bounces
- `src/lib/verbs/route/index.test.mts`: bulleted Files commit test
- `src/lib/shared/route/commit.mts`: read only, reported matcher
- `src/lib/verbs/packet/packet.mjs`: read only, field consumers
- `work/20261103-pr-reviews-read-the-linked-ticket/phases/1.block.md`: read only, fixture text

**Changes:** In `block.mts`, replace `BOLD_COMMIT`, `FIELD_START` and `FIELD_LINE` with one label matcher (D-001): an optional list marker, then `**Label:**`, `**Label**:` or plain `Label:`, where the bold and bulleted forms accept only names in `BLOCK_FIELDS` (all kinds) and the plain form keeps `Root cause|[A-Z][a-z]+`. After a label line, consume the following list-item lines (blank lines between items allowed, stopping at the next label or at a non-item line) and join the inline value and the item texts with `; `. `Commit` keeps its indented body. `blockFiles` also splits on `;` and backticks. In `guard.block`, `fieldValue` reads `blockField(parseBlock(block), label)`; the folded `+n more` check, the Red, Root cause and blocked checks keep their messages. Replace the test `parseBlock reads a bold label only for Commit` with the form tests below.

**Done when:**
- **T-1.1** A `block.test.mts` test parses the text of `work/20261103-pr-reviews-read-the-linked-ticket/phases/1.block.md` (inlined as a fixture) and asserts `blockField` gives `Red`, `Root cause`, `Files`, `Verified`, `Decisions`, `Comments`, `Waivers` and `Commit`, and that `blockFiles` on it returns the eight paths in order: `src/lib/verbs/pullrequest/tickets.mts`, `src/lib/verbs/pullrequest/tickets.test.mts`, `src/lib/verbs/pullrequest/prepare.mts`, `src/lib/verbs/pullrequest/remote.test.mts`, `src/lib/shared/paths.mts`, `src/lib/shared/paths.test.mts`, `src/lib/hooks/guard/scope/index.mts`, `src/lib/hooks/guard/scope/index.test.mts`.
- **T-1.2** A `block.test.mts` test asserts that for every label in `BLOCK_FIELDS.phase`, the plain, bold and bulleted forms with value `x` give the same `blockField` value `x`, and that a list item `- T-1.5: y` under `Verified:` stays part of the Verified value.
- **T-1.3** The existing plain-form tests in `block.test.mts`, `test/hooks/guard.block.test.mjs` and `src/lib/verbs/route/index.test.mts` pass unchanged (the before-image is the base copy of each test file; `git diff <base> -- <file>` shows only added tests and the one replaced title).
- **T-1.4** A `route/index.test.mts` test saves a block whose `**Files:**` label is followed by bulleted paths, stages one listed path that the plan does not list, routes `approved`, and asserts the path is in `git show --name-only HEAD` and not in `git diff --cached --name-only`.
- **T-1.5** A `guard.block.test.mjs` test asserts a PHASE DONE block with bold `**Red:** n/a: docs only`, `**Root cause:** none` and `**Commit:** docs(a): one line` returns `null`, and one with `**Red:** maybe` bounces with a reason matching `"Red: maybe" is none of`.
- **T-1.6** Drive: in a scratch git project, `picket open --lane order`, an order record with one phase listing `src/a.js`, the evidence block shape saved as `phases/1.block.md` with `src/b.test.js` only on its bulleted `**Files:**` list, and `picket route <id> --verdict "PHASE DONE" --agent developer --phase 1`: `picket packet <id>` prints a `verified` row and a `files` row with values, not `not reported`, and after staging both files `picket route <id> --verdict approved --agent user --phase 1` leaves `git diff --cached --name-only` empty.
- **T-1.7** `npm test` passes.

## Phase 2: A run grant's hand-off prints no send
**Touch set:**
- `src/lib/shared/work/files.mts`: `idle` in MARKERS
- `src/lib/shared/work/files.test.mts`: MARKERS pin
- `src/lib/shared/work/snapshot.mts`: `idle` on PhaseStatus
- `test/support/snapshot.mts`: `idle: false` default
- `src/lib/shared/work/send.mts`: runHandOff, implement send
- `src/lib/shared/work/send.test.mts`: hand-off send tests
- `src/lib/shared/work/next-view.mts`: hand-off detail note
- `src/lib/shared/work/next-view.test.mts`: detail and empty send
- `src/lib/shared/work/block.mts`: latestSavedBlock
- `src/lib/hooks/route/verdict/index.mts`: repeat drop, idle marker
- `src/lib/hooks/route/verdict/index.test.mts`: repeat and idle tests
- `src/rules/work-items.md`: marker list names `N.idle`
- `src/lib/shared/work/next-step.mts`: read only, implement step
- `src/lib/shared/route/plan.mts`: read only, run grant changes

**Changes:** Add `"idle"` to `MARKERS` (before `"block.md"`) and `idle: boolean` to `PhaseStatus` from `hasMarker(..., "idle")`. In `send.mts`, export `runHandOff(snap, session): number | null` with the D-002 conditions, using the developer instance's `owns` and the row's `session`; `implementSends` returns `[]` when it equals the step's phase (the cross-check send never coincides, since it needs phase 1). In `nextView`, when the step is `implement_phase` and `runHandOff` gives its phase, append `; the developer took it from the run grant, so there is no send: wait for its block` to `detail`. In `block.mts`, export `latestSavedBlock(root, id, n): string | null` (the last `## Phase` entry of `N.fixes.md`, else `N.block.md`). In the route hook's `routeTurn`, after `info` and `phase` are known and before the continued check, return `null` without saving when D-003 holds. Wrap `routeTurn` so that a `SubagentStop` with `agent_type` `picket:developer` and `stop_hook_active` that routed nothing reads the snapshot of `hints.work_id` and, when `runHandOff(snap, event.session_id)` gives `c`, writes `phases/c.idle` with `setMarker`. In `src/rules/work-items.md`, add `` `N.idle` (the developer stopped without the block of a phase the run grant handed it) `` to the marker sentence without adding a line.

**Done when:**
- **T-2.1** A `send.test.mts` test replays `work/20261103-commit-message-review-follow-up-fixes` at the lead's 15:57 `picket next`: phases 1 and 2 done and approved, phase 3 open, `run_through: 3`, rows developer `PHASE DONE` phase 2 in session S then architect `AMENDED`; `sendsFor` for `implement_phase` phase 3 in session S returns `[]`.
- **T-2.2** In the same file, the T-2.1 snapshot with a `user` `approved` row after the developer row, or with session `other`, or with phase 3 `idle: true`, each returns one send to the developer whose message ends `run through 3`.
- **T-2.3** A `next-view.test.mts` test asserts the T-2.1 view has `action` `implement_phase`, `send` `[]`, and a `detail` ending `wait for its block`.
- **T-2.4** A route hook test runs a continued `picket:developer` `SubagentStop` whose turn holds only the already routed phase 2 block while the T-2.1 hand-off holds, and asserts `phases/3.idle` exists and no row was added; the same stop with phase 1 awaiting the user writes no `idle` marker.
- **T-2.5** A route hook test sends, in a new (not continued) turn, a developer phase 3 block identical to the saved `3.block.md` while the newest developer row is `PHASE DONE` phase 3, and asserts the hook returns `null`, `verdicts.jsonl` keeps its row count and `3.fixes.md` does not exist; the same block with its headline changed adds one row.
- **T-2.6** `files.test.mts` pins `MARKERS` as `["done", "approved", "reviewed", "idle", "block.md"]`, and the existing tests in `send.test.mts`, `next-view.test.mts` and `src/lib/hooks/route/verdict/index.test.mts` pass unchanged (before-image: their base copies).
- **T-2.7** Drive: in a scratch git project with a three-phase order item and `CLAUDE_CODE_SESSION_ID` set to S, route developer `PHASE DONE` phase 1 `--session S`, user `approved` phase 1 `--through 3`, developer `PHASE DONE` phase 2 `--session S`; `picket next <id>` prints `implement_phase · developer · phase 3` with the hand-off detail and no fenced send, and after `phases/3.idle` is created it prints a `SendMessage` send for phase 3.
- **T-2.8** `npm test` passes.

## Phase 3: The item summary covers only its own changes
**Touch set:**
- `src/lib/shared/git.mts`: commitsTouching, path-limited diffStat
- `src/lib/shared/git.test.mts`: commitsTouching and empty path list
- `src/lib/shared/review-summary.mts`: owned changes for items with phases
- `src/lib/shared/work/block.mts`: fixesFiles
- `src/lib/shared/work/block.test.mts`: fixesFiles test
- `src/lib/verbs/summary/index.mts`: owned paths, pass to changesOfItem
- `src/lib/verbs/summary/index.test.mts`: scope tests
- `src/lib/shared/silenced.mjs`: read only, deletedTestMoves
- `src/lib/shared/work/artifact.mts`: read only, phasePaths

**Changes:** In `git.mts`, add `commitsTouching(root, base, path): string[]` (`git log --format=%H <base>..HEAD -- <path>`, oldest first) and an optional `paths` argument to `diffStat`, where an empty list returns `{ added: 0, removed: 0 }` and never the whole diff. In `block.mts`, add `fixesFiles(root, id, n)`: the paths on every entry's `Files:` field in `N.fixes.md`, split as `blockFiles` splits. In the summary verb, compute the owned list for an item with phases (plan paths of every phase, `blockFiles` and `fixesFiles` of every phase) and pass it to `changesOfItem(root, state, base, owned)`; `owned` is `null` when the item has no phases, which keeps today's code path. With `owned`, root files are the product files of `commitsTouching(root, base, workRel(id))` plus `dirtyPaths(root)` that `listedPathMatcher(root, owned)` accepts; line counts and the silenced input follow D-004, and `silencedIn` keeps only deleted paths that are in `files`.

**Done when:**
- **T-3.1** A `summary/index.test.mts` test builds a repo with item A (one phase owning `a.ts`), commits `b.ts` with a message of another item after A's base, then commits `a.ts` with `work/<A>/`; `itemSummary` for A gives `changed_files` `["a.ts"]` and line counts of A's commit only.
- **T-3.2** In the same repo, a staged `c.ts` that no phase of A owns is not in `changed_files`, and a staged change to `a.ts` and a staged path named only on A's `1.block.md` `Files:` line both are.
- **T-3.3** A staged path named only on an entry of A's `1.fixes.md` is in `changed_files`, and `fixesFiles` returns the paths of both entries of a two-entry `N.fixes.md` in order.
- **T-3.4** A test commits `it.only` into `b.ts`'s test file under the other item and asserts A's `silenced` is `[]`.
- **T-3.5** A `git.test.mts` test asserts `diffStat` with an empty path list returns zero while the tree has changes, and `commitsTouching` returns only the commits that touch the given folder, oldest first.
- **T-3.6** The existing tests in `src/lib/verbs/summary/index.test.mts` pass unchanged; their items have no phases (before-image: the base copy of the file).
- **T-3.7** Drive: on base before the first edit, capture `picket summary 20261103-pr-reviews-read-the-linked-ticket` (at 7891e26 it gave 28 files, +1369/-60). After the phase it gives exactly these 15 `changed_files`: `src/agents/reviewer.md`, `src/lib/hooks/guard/scope/index.mts`, `src/lib/hooks/guard/scope/index.test.mts`, `src/lib/shared/paths.mts`, `src/lib/shared/paths.test.mts`, `src/lib/verbs/pullrequest/azdo.mts`, `src/lib/verbs/pullrequest/azdo.test.mts`, `src/lib/verbs/pullrequest/prepare.mts`, `src/lib/verbs/pullrequest/remote.test.mts`, `src/lib/verbs/pullrequest/tickets.mts`, `src/lib/verbs/pullrequest/tickets.test.mts`, `src/skills/reviewing/checklists/alignment.md`, `src/skills/reviewing/steps/pr.md`, `src/skills/ticketing/SKILL.md`, `src/skills/ticketing/steps/jira.md`, with `lines_added` 207 and `lines_removed` 18.
- **T-3.8** `npm test` passes.

## Open questions
- **OQ-001** Is Claude Code's continuation of a subagent after `SubagentStop` additional context a behaviour Picket may rely on? Owner: product owner. Fallback: phase 2 ships on the observed behaviour (developer transcript `agent-anbaa-developer-456fb486df1cea5f.jsonl`, 2026-11-03 15:53:57, continued into phase 3 with no lead message).

## Revision log
- 2026-11-05: D-004 (r2): own commits also come from ledger accept rows, and a failed add warns; d9d312a missed work/<id>/
