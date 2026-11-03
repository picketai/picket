---
kind: order
lane: order
title: Commit message review follow-up fixes
date: 2026-11-03
audience: developer
sources: request.md, preflight.txt, src/lib/shared/commit-message.mts, src/lib/shared/route/commit.mts, src/lib/shared/route/apply.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/close/close.mts, src/lib/verbs/close/index.test.mts, src/lib/shared/commit-message.test.mts, test/kernel/packet.test.mjs, test/cli/close.test.mjs, src/lib/hooks/guard/block/index.mts, src/lib/hooks/route/verdict/index.mts
phases:
  - n: 1
    files:
      - src/lib/shared/commit-message.mts
      - src/lib/shared/commit-message.test.mts
      - src/lib/shared/route/commit.mts
    greps:
      - path: src/lib/shared/commit-message.mts
        pattern: 'export function checkBlockCommit\('
      - path: src/lib/shared/route/commit.mts
        pattern: 'checkBlockCommit\('
      - path: src/lib/shared/route/commit.mts
        pattern: '\bCOMMIT_SHAPE\b'
        absent: true
      - path: src/lib/shared/route/commit.mts
        pattern: '\bproposedCommit\b'
        absent: true
      - path: src/lib/shared/route/commit.mts
        pattern: 'no "Commit:" line'
        absent: true
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/verbs/packet/packet.mjs
      - test/kernel/packet.test.mjs
    greps:
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'cut\(subject'
        absent: true
    tests: true
    drive: true
  - n: 3
    files:
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/index.test.mts
      - test/cli/close.test.mjs
    greps:
      - path: src/lib/verbs/close/close.mts
        pattern: 'to(Locale)?LowerCase\('
    tests: true
    drive: true
---
# Order: Commit message review follow-up fixes

## Problem
Review of the shared commit shape left three rough edges. The gate packet cuts a repo's subject to the room left after the checkout dir (`src/lib/verbs/packet/packet.mjs:95`), so a long worktree path hides the subject the user approves. `phaseCommitMessage` (`src/lib/shared/route/commit.mts:48`) repeats the missing-line text and the parse-then-check steps that `blockCommitProblem` (`src/lib/shared/commit-message.mts:39`) already owns. The close subject keeps the title's capital (`chore: close Commit messages share one checked shape`), unlike every other subject. Nothing else about the commit shape, `guard.block` or `route.verdict` may change.

## Decisions
### D-001: One block check that returns the message
**Decision:** Add `checkBlockCommit(block: string): CheckedCommitMessage` to `src/lib/shared/commit-message.mts`: it parses the block, returns `{ problem }` with today's missing-line text when there is no `Commit:` line, and otherwise returns `checkCommitMessage(proposed)`. `blockCommitProblem` becomes a wrapper that returns the problem or `null`, so `guard.block` and `route.verdict` keep their call and their texts. `phaseCommitMessage` returns `checkBlockCommit(readBlock(...) ?? "")`. This is an infrastructural decision.
**Instead of:** having `phaseCommitMessage` call `blockCommitProblem` as the request words it: that returns only the problem, so the route would parse and check the block a second time to get the message, keeping the copy the request wants gone.

### D-002: Repo name on one line, its subject on the next
**Decision:** With nested checkouts, each repo (in commit order, then `main repo`) takes two lines: the dir at the commit column, then the subject indented two more spaces, never passed through `cut`. With one repo the subject stays alone on the `commit` line, also never cut. Body lines keep today's cut. A checked subject is at most 72 code points, so at the default width of 100 the longest subject line is 14 + 72 = 86 characters.
**Instead of:** the dir and subject on one line with the dir cut instead: a cut worktree path no longer names the checkout the commit lands in.
**Risks:**
- **RISK-001** A `--width` narrower than 86 lets a subject line run past it. Mitigation: accepted, the subject is the fact the user approves; no caller passes a narrower width today.

### D-003: Lowercase the close title unless its first word is an acronym
**Decision:** `defaultCloseMessage` lowercases the title's first character unless the first word is an acronym, read as: the second character is an uppercase letter (`/\p{Lu}/u`). Lowercasing runs on the trimmed title before `shortenedTitle` counts its room. A `--message` the user passes is never changed. Checked by script on base: `Commit messages share one checked shape` to `commit messages share one checked shape`, `Orders` to `orders`, `PR reviews read the linked ticket`, `PRs read tickets`, `API keys`, `RMS-12 pricing` and `iOS build` unchanged, `A note` to `a note`.
**Instead of:** an acronym as a first word whose letters are all uppercase: it lowercases `PRs` to `pRs`.
**Risks:**
- **RISK-002** A mixed-case name such as `McAfee` loses its capital (`mcAfee`). Mitigation: the user passes `--message` for such a title.

## Scope
**In:**
- `checkBlockCommit` in `commit-message.mts`, with `blockCommitProblem` and `phaseCommitMessage` built on it.
- Packet commit lines: each repo's subject on its own line, never cut.
- The default close subject lowercases the title's first letter unless the first word is an acronym.

**Out:**
- Any other change to the commit shape, `guard.block` or `route.verdict` behaviour.
- Body line cutting in the packet; a `--message` passed to `picket close`.

## Phase 1: One block commit check
**Touch set:**
- `src/lib/shared/commit-message.mts`: add checkBlockCommit, wrap blockCommitProblem
- `src/lib/shared/commit-message.test.mts`: tests for checkBlockCommit
- `src/lib/shared/route/commit.mts`: phaseCommitMessage uses checkBlockCommit
- `src/lib/shared/route/apply.mts`: caller of phaseCommitMessage, read only
- `test/kernel/packet.test.mjs`: pins the not committable rows
**Changes:** Add `checkBlockCommit` per D-001 and rewrite `blockCommitProblem` on it, keeping its signature. Replace the body of `phaseCommitMessage` with one call to `checkBlockCommit`, and drop the imports of `parseBlock`, `proposedCommit`, `checkCommitMessage` and `COMMIT_SHAPE` from `commit.mts` that no longer have a use there. Add unit tests for `checkBlockCommit`; leave the existing tests unedited.
**Done when:**
- **T-1.1** A unit test gets `{ message: "feat(x): y" }` from `checkBlockCommit` on a block whose line is ``**Commit:** `feat(x): y.` ``.
- **T-1.2** A unit test gets a `problem` matching `/^the block has no "Commit:" line; write .*\b72\b/` from `checkBlockCommit` on a block with no `Commit:` line, and it equals `blockCommitProblem` on the same block.
- **T-1.3** `src/lib/shared/route/commit.mts` calls `checkBlockCommit(` and holds no `COMMIT_SHAPE`, `proposedCommit` or `no "Commit:" line` text (the phase greps).
- **T-1.4** The before-image is base 2788aa4: the test `blockCommitProblem is null for a valid Commit: line and names a missing or bad one` (`src/lib/shared/commit-message.test.mts:42`) and the test `the commit line shows the checked message, or why the block's message cannot be committed` (`test/kernel/packet.test.mjs:67`) pass, and `git diff 2788aa4 -- test/kernel/packet.test.mjs` is empty.
- **T-1.5** `npm test` passes, and in a temporary project `picket packet <id>` on a phase block with no `Commit:` line prints `  commit    not committable: the block has no "Commit:" line; write ` followed by the shape.

## Phase 2: Each repo's subject on its own line
**Touch set:**
- `src/lib/verbs/packet/packet.mjs`: repoLines and commitLines layout
- `test/kernel/packet.test.mjs`: two-repo expectation and new cases
**Changes:** Rewrite `repoLines` per D-002 so it no longer takes a `room` and never cuts the subject; `commitLines` keeps cutting body lines to `room`. Update the two-repo expectation in the test at `test/kernel/packet.test.mjs:98` and add the cases below.
**Done when:**
- **T-2.1** The two-repo test expects exactly `"  commit    src/Orders/.worktrees/RMS-12"`, `"              fix(pricing): a"`, `"            main repo"`, `"              fix(pricing): a"`, then the two body lines at twelve spaces.
- **T-2.2** A test with the same two-repo layout and a 72-character subject finds that subject whole, after fourteen spaces, on two lines of the packet.
- **T-2.3** A test with one repo, a 72-character subject and `packet(id, root, { width: 60 })` finds the line `"  commit    "` followed by the whole subject.
- **T-2.4** The one-repo expectation at `test/kernel/packet.test.mjs:117` and the commit row test at `test/kernel/packet.test.mjs:67` pass with their assertions as on base 2788aa4.
- **T-2.5** `packet.mjs` holds no `cut(subject` (the phase grep), and `npm test` passes.
- **T-2.6** In a temporary project with a nested checkout, `picket packet <id>` prints the dir line and the indented subject line for that checkout and for `main repo`.

## Phase 3: Close subjects start lowercase
**Touch set:**
- `src/lib/verbs/close/close.mts`: defaultCloseMessage lowercases per D-003
- `src/lib/verbs/close/index.test.mts`: default message unit tests
- `test/cli/close.test.mjs`: subjects at lines 86, 118, 119, 291, 319
**Changes:** In `defaultCloseMessage`, lowercase the trimmed title's first character per D-003, then shorten it as today. Update the unit tests at `src/lib/verbs/close/index.test.mts:37` and `:41` and the CLI subjects `chore: close Csv export`, `chore: close Orders` and `chore: close Sub root` to their lowercase forms; rename test titles that quote the old subject.
**Done when:**
- **T-3.1** A unit test gets `chore: close commit messages share one checked shape` from `defaultCloseMessage("Commit messages share one checked shape")`.
- **T-3.2** A unit test keeps the first word as given for `PR reviews read the linked ticket`, `PRs read tickets`, `API keys` and `iOS build`, and gets `chore: close a note` for `A note`.
- **T-3.3** The 70-character title test expects `chore: close commit messages share one checked shape across every`, still at most 72 characters and passing `checkCommitMessage`.
- **T-3.4** A CLI test closes an order item titled `Orders` without `--message`: `git log -1 --format=%s` and the JSON `message` are `chore: close orders`.
- **T-3.5** A CLI test closes an item with `--message "chore: close Orders"` and the commit subject is `chore: close Orders`, unchanged.
- **T-3.6** `npm test` passes, and in a temporary repo `picket close <id>` on an item titled `Csv export` leaves `chore: close csv export` in `git log -1 --format=%s`.

## Open questions
none

## Revision log
