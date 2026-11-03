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
      - src/lib/hooks/route/verdict/index.mts
      - src/lib/hooks/route/verdict/index.test.mts
      - src/lib/verbs/reply/table.mts
      - src/lib/verbs/reply/index.test.mts
    greps:
      - path: src/lib/verbs/close/close.mts
        pattern: 'to(Locale)?LowerCase\('
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '\blast_assistant_message\b'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '\bBLOCK_HEADINGS\b'
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

### D-004: route.verdict routes the newest block of the turn
**Decision:** `routeTurn` first picks the turn's text: the hook payload's `last_assistant_message` when it carries a contract heading, otherwise `readTurn(...).text` as today. It then cuts that text at its last contract heading (the last match of any `BLOCK_HEADINGS` pattern from `src/lib/shared/work/block.mts:12`; `readHeading` returns the earliest), and the verdict, `blockInfo`, `isBouncedForCommit`, `saveDeveloperBlock`, `route` and `writtenNotice` all read the cut text. Both steps are local functions in `src/lib/hooks/route/verdict/index.mts`; `readTurn` and `readHeading` stay as they are. Which text the hook read at the phase 1 bounce is not proven. In the developer transcript the bounced text (prose, then the block) and the corrected block are separate assistant entries, and the verdict row was written 120 ms after the corrected entry's timestamp. So the decision covers both readings: a transcript tail not yet flushed (the payload is newer) and one text holding both blocks (the cut). This is an infrastructural decision.
**Instead of:** putting `last_assistant_message` first in `readTurn` for every caller: guard.block and emit.ledger read `readTurn` too, and their behaviour is out of scope.
**Risks:**
- **RISK-003** A handback turn whose final text quotes an older block heading would route that text over the handback payload. Mitigation: the payload text wins only when it carries a heading; a handback's final text is a paraphrase without one (`src/lib/shared/transcript/turn.mts:47`).
- **RISK-004** A block body holding a line that starts with a contract heading is cut at that line. Mitigation: the headings are line-anchored `## Phase <n> of <id>`, `## Review: <id>` and similar forms that a block body does not repeat.

### D-005: A gate accepts `x: <why>`
**Decision:** The reject form in `APPROVE_FORMS` (`src/lib/verbs/reply/table.mts:64`) becomes `/^(?:x:?|reject:)\s+(\S.*)$/i`, the form the gate prints as `[x] reject: <why>`. Checked by script on base: `x: too long` and `X: Why` reject with `too long` and `Why`; `x too long` and `reject: too long` keep their reason; `xylophone`, `x:` and `x:why` match nothing. The `x` abandon form in `BLOCK_FORMS` is unchanged.
**Instead of:** `/^(?:x|reject):?\s*(\S.*)$/i`: it reads `xylophone` as a reject with the reason `ylophone`.

## Scope
**In:**
- `checkBlockCommit` in `commit-message.mts`, with `blockCommitProblem` and `phaseCommitMessage` built on it.
- Packet commit lines: each repo's subject on its own line, never cut.
- The default close subject lowercases the title's first letter unless the first word is an acronym.
- `route.verdict` saves and routes the newest, last block of the turn (D-004).
- `picket reply` accepts `x: <why>` as a reject (D-005).

**Out:**
- Any other change to the commit shape, `guard.block` or `route.verdict` behaviour; `readTurn` and `readHeading`.
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

## Phase 3: Close subjects, the routed block and the reject reply
**Touch set:**
- `src/lib/verbs/close/close.mts`: defaultCloseMessage lowercases per D-003
- `src/lib/verbs/close/index.test.mts`: default message unit tests
- `test/cli/close.test.mjs`: subjects at lines 86, 118, 119, 291, 319
- `src/lib/hooks/route/verdict/index.mts`: routeTurn picks and cuts the text
- `src/lib/hooks/route/verdict/index.test.mts`: bounce helper at line 142
- `src/lib/shared/work/block.mts`: BLOCK_HEADINGS and readHeading, read only
- `src/lib/shared/transcript/turn.mts`: readTurn candidate order, read only
- `src/lib/verbs/reply/table.mts`: reject form at line 64
- `src/lib/verbs/reply/index.test.mts`: reject reply test at line 100
**Changes:** In `defaultCloseMessage`, lowercase the trimmed title's first character per D-003, then shorten it as today. Update the unit tests at `src/lib/verbs/close/index.test.mts:37` and `:41` and the CLI subjects `chore: close Csv export`, `chore: close Orders` and `chore: close Sub root` to their lowercase forms; rename test titles that quote the old subject. In `routeTurn`, pick and cut the turn's text per D-004 before `findVerdict`, and pass the cut text everywhere `text` goes today. Change the reject form per D-005. In the tests below, the bounced subject is the 76-character `refactor(commit-message): one block check returns the message or the problem` and the valid one is the 68-character `refactor(commit-message): one block check returns message or problem`.
**Done when:**
- **T-3.1** Unit tests get `chore: close commit messages share one checked shape` and `chore: close a note` from those titles, and keep the first word as given for `PR reviews read the linked ticket`, `PRs read tickets`, `API keys` and `iOS build`.
- **T-3.2** The 70-character title test expects `chore: close commit messages share one checked shape across every`, still at most 72 characters and passing `checkCommitMessage`.
- **T-3.3** A CLI test closes an order item titled `Orders` without `--message`: `git log -1 --format=%s` and the JSON `message` are `chore: close orders`; with `--message "chore: close Orders"` the subject is `chore: close Orders`, unchanged.
- **T-3.4** A hook test runs `route.verdict` with `stop_hook_active: true` on a transcript whose last assistant text holds a prose line, the bounced phase 1 block, then the valid block: one `PHASE DONE` row is appended and `phases/1.block.md` starts with `## Phase 1 of`, holds the valid `Commit:` subject and not the bounced one. It fails on base 2788aa4.
- **T-3.5** A hook test runs `route.verdict` with `stop_hook_active: true` on a transcript ending at the bounced block, with the valid block in `last_assistant_message`: `phases/1.block.md` holds the valid subject and not the bounced one. It fails on base 2788aa4.
- **T-3.6** The existing route.verdict tests pass unedited against base 2788aa4, and with `stop_hook_active` false the bounced block alone still appends no verdict row.
- **T-3.7** A reply test at a phase gate applies `x: Tests are flaky`: the last verdict is `rejected` and the send to the developer ends `rejected: Tests are flaky`; `x Tests are flaky` still does the same, and `xylophone` is refused as matching no option.
- **T-3.8** `npm test` passes. In a temporary repo `picket close <id>` on an item titled `Csv export` leaves `chore: close csv export` in `git log -1 --format=%s`, and `picket reply <id> "x: too long"` at a phase gate prints a send ending `rejected: too long`.

## Open questions
- **OQ-001** Does Claude Code's `last_assistant_message` on a continued SubagentStop carry the re-emitted text, and which text did the hook read at the phase 1 bounce? Owner: the lead, at the next live bounce. Fallback: D-004 covers both readings; T-3.4 and T-3.5 pin them with fixtures, and when the payload field is absent `readTurn` decides as today.

## Revision log
- 2026-11-03: D-004 added: route.verdict routes the newest, last block; the user ruled at the phase 1 gate after a bounced block was saved.
- 2026-11-03: D-005 added: a gate accepts `x: <why>`; the user ruled at the phase 1 gate after `picket reply` refused it.
