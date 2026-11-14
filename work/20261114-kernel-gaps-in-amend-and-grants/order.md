---
kind: order
lane: order
title: Kernel gaps in amend and grants
date: 2026-11-14
audience: developer
sources: work/20261114-kernel-gaps-in-amend-and-grants/request.md; preflight.txt; src/lib/shared/work/next-step.mts; src/lib/shared/work/send.mts; src/lib/shared/work/amendment.mts; src/lib/shared/work/check-correction.mts; src/lib/shared/work/reviews.mts; src/lib/shared/work/verdict-log.mts; src/lib/shared/work/artifact.mts; src/lib/shared/work/snapshot.mts; src/lib/shared/route/route.mts; src/lib/shared/route/plan.mts; src/lib/shared/route/apply.mts; src/lib/shared/findings.mts; src/lib/hooks/route/verdict/index.mts; src/lib/verbs/route/index.mts; src/agents/architect.md; src/skills/reviewing/checklists/crosscheck.md; test/repo/agents.test.mjs; work/20261114-standard-test-environment-and-env-verbs (verdicts, reviews/crosscheck.md); work/20261114-env-verbs-pass-on-real-engine (verdicts, replies, design.md); scratch replays of both items run 2026-11-14
phases:
  - n: 1
    files:
      - src/lib/hooks/route/verdict/index.mts
      - src/lib/hooks/route/verdict/index.test.mts
      - src/lib/shared/route/plan.mts
      - src/lib/shared/route/route.mts
      - src/lib/shared/work/verdict-log.mts
      - src/lib/shared/work/next-step.mts
      - src/lib/shared/work/next-step.test.mts
      - src/lib/shared/work/send.mts
      - src/lib/shared/work/send.test.mts
      - src/agents/architect.md
      - test/repo/agents.test.mjs
    greps:
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'blocking\?: string\[\]'
      - path: src/lib/shared/work/next-step.mts
        pattern: '\bblocking\b'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: '\bblocking\b'
      - path: src/agents/architect.md
        pattern: '`review: '
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/route/route.mts
      - src/lib/verbs/route/index.test.mts
      - src/lib/shared/work/send.mts
      - src/lib/shared/work/send.test.mts
      - src/lib/shared/work/next-view.test.mts
    tests: true
    drive: true
  - n: 3
    files:
      - src/lib/shared/work/amendment.mts
      - src/lib/shared/work/amendment.test.mts
      - src/lib/shared/work/verdict-log.mts
      - src/lib/shared/route/route.mts
      - src/lib/verbs/route/index.test.mts
      - src/lib/shared/work/next-step.mts
      - src/lib/shared/work/next-step.test.mts
      - src/lib/shared/work/send.mts
      - src/lib/shared/work/send.test.mts
      - src/agents/architect.md
      - test/repo/agents.test.mjs
    greps:
      - path: src/lib/shared/work/verdict-log.mts
        pattern: 'frame\?: string'
      - path: src/lib/shared/work/amendment.mts
        pattern: 'export function frameDigest\('
      - path: src/lib/shared/work/amendment.mts
        pattern: 'export function namedChecks\('
      - path: src/lib/shared/work/send.mts
        pattern: 'checks: '
      - path: src/agents/architect.md
        pattern: '`checks: '
    tests: true
    drive: true
---
# Order: Kernel gaps in amend and grants

## Problem

Three kernel paths sent the lead off the printed sends on 2026-11-14. The verdict hook keeps one `AMENDMENT NEEDED:` line on a drift row (`amendmentText`, `src/lib/hooks/route/verdict/index.mts:107`), the amend send carries only that line (`src/lib/shared/work/send.mts:205`), and the re-check narrows to the decisions revised since the drift (`recheckStep`, `src/lib/shared/work/next-step.mts:88`), so two Major findings of the 20261114-standard-test-environment-and-env-verbs cross-check were never re-read; the saved `reviews/crosscheck.md` now holds the ALIGNED re-check, which names them "outside this delta". `runHandOff` (`send.mts:121`) treats any session-matching PHASE DONE of the previous phase with no later user row as a hand-off, so a run grant set after that row suppresses the send; a scratch replay of the same item (first 19 verdict rows, `run_through: 10`) prints the hand-off note and no send. A reword send forbids frontmatter edits (`src/agents/architect.md:81`), so a wrong declared `contains` in an approved phase has no route; a replay of 20261114-env-verbs-pass-on-real-engine (8 rows, 3 replies) prints the reword send with nothing naming the T-1.5 check.

## Decisions

### D-001: Every amend send names the saved review
**Decision:** The `amend` next step gains a `review` field and its send a `review: <path>` line after `amend:`, the review file of the row that asked: `reviews/crosscheck.md` or `reviews/checkpoint.md` for those scopes, `reviews/phase-<n>.md` for a reviewer row with a null scope and a phase, `reviews/cumulative.md` for the gated reword. The architect shell treats every Critical and Major finding in that file as part of the amendment, not only the amend line. This gives the architect every finding without changing the one-line `amend` field the gate, stall and packet code already read.
**Instead of:** Joining every finding into the `amend` line: the reviewer writes one `AMENDMENT NEEDED:` line and puts the findings on finding rows with anchors, and a multi-finding line would break the one-line `amend:` field the gate detail prints.
**Risks:**
- **RISK-001** The next review of the same scope overwrites the file (crosscheck.md was overwritten by the re-check). Mitigation: the amend send is printed only while the asking row is the newest of its scope, so the architect reads the file before the next review runs.

### D-002: A drift row records its blocking anchors, and the re-check narrows only when they are all covered
**Decision:** On a cross-check `DRIFT DETECTED`, the verdict hook passes `blocking`, the location of each Critical and Major finding row as `parseFindings` returns it (`work/<id>/design.md#phase-9`), through `RouteInput` onto the row (`VerdictRow.blocking?: string[]`). `recheckStep` keeps the revised-decision `delta` only when `blocking` is non-empty and every entry carries a `#D-###` anchor that is in the delta; otherwise the delta is empty, the send has no `delta:` line, and the reviewer runs the full pass, whose rule already turns a remaining Major into `DRIFT DETECTED`. A row without the field, written before this change, keeps today's delta. Gives up: a full pass costs more than a delta on multi-finding drifts.
**Instead of:** The kernel refusing an ALIGNED re-check while an earlier Major is open: whether a finding was addressed is a judgement code cannot make, and the full pass hands it to the checklist that already decides it.
**Risks:**
- **RISK-002** A reviewer anchors a decision finding on a phase (`#phase-8` for a D-007 issue), so a drift a delta could cover gets a full pass. Mitigation: cost only; the result is never weaker than today.

### D-003: The hand-off reads the grant stamp on the PHASE DONE row
**Decision:** When a `PHASE DONE` routes while the run grant approves its phase (`runGrantChanges` in `src/lib/shared/route/plan.mts:56` returns the approval marker), the route writes the row's existing `through` field as `state.run_through`; otherwise it stays null. `developerHandedOn` in `send.mts` also requires that stamp to be a number not below the current phase. A grant set by `picket set` after the row leaves it unstamped, so `picket next` keeps the send. This reuses a field every row already has; no code reads `through` on a developer row today.
**Instead of:** Comparing when the grant was set with the row's time: `state.yaml` keeps only `updated`, which every route rewrites, and a grant time would be a thirteenth state field against the `work-items` rule's twelve.
**Risks:**
- **RISK-003** An item mid hand-off when this ships has an unstamped row, so the lead gets a send for a phase the developer already took. Mitigation: the send is a SendMessage to the same live developer, which already works the phase; ship with no run grant in flight.

### D-004: A reword send names the declared checks it may correct, and a frame digest guards the rest
**Decision:** `namedChecks(phases, amend)` returns the `T-N.x` ids in the amend line that a declared drive check covers. A reword send adds `checks: <ids>` after `reword:` when that list is non-empty, and the architect shell lets a reword change only those checks' `contains`, `exit_code` or `command`, with the revision log line it already writes. `frameDigest(phases, named)` is the sha256 of the canonical JSON of every phase's frontmatter entry with only the named checks' three keys removed. The route stamps `frame` wherever it stamps `record`, naming checks from the row's own amend line, or, for `AMENDED`, from the newest prior row with an amend line. At the gated answer, an `AMENDED` whose `frame` differs from the asking row's is not counted, and the gate returns with the detail `the architect's amendment changed the frontmatter beyond the declared checks it names`. Rows without `frame` count as today. Gives up: title, date and sources sit outside the frame; `picket verify` reads only the phase entries.
**Instead of:** A kernel verb that writes the corrected value, as `correctCheckPath` does for a path at approval: the drive log keeps only a true or false per declared `contains` string, not the output, so the right string is a reading of real output that only the architect, citing the review, can make.
**Risks:**
- **RISK-004** Reordering keys inside a phase entry changes the frame and returns the gate. Mitigation: the detail names the cause; the architect restores the order and answers again.

## Scope
**In:**
- the amend send's `review:` line and the re-check's delta rule after a cross-check drift
- the run grant stamp on PHASE DONE rows and the hand-off check that reads it
- the reword send's `checks:` line, the frame stamp and its check at the amendment gate
- the architect shell's Entry and Amendment wording for `review:` and `checks:`
- a test that fails on the base for each gap, written first

**Out:**
- the Se4 class follow-up, the env verbs, saved scenarios (TF-003)
- any new gate, verdict token, state field or `picket route` flag
- the reviewer shell and the cross-check checklist, whose full-pass rule is unchanged

## Phase 1: Every finding reaches the amendment and the re-check

**Touch set:**
- `src/lib/hooks/route/verdict/index.mts`: pass blocking anchors on drift
- `src/lib/hooks/route/verdict/index.test.mts`: round trip through the hook
- `src/lib/shared/route/plan.mts`: `RouteInput` gains `blocking`
- `src/lib/shared/route/route.mts`: `verdictRow` carries `blocking`
- `src/lib/shared/work/verdict-log.mts`: `VerdictRow.blocking` field
- `src/lib/shared/work/next-step.mts`: amend review, re-check delta rule
- `src/lib/shared/work/next-step.test.mts`: failing tests, two expectations updated
- `src/lib/shared/work/send.mts`: `review:` line on amend sends
- `src/lib/shared/work/send.test.mts`: amend send lines
- `src/agents/architect.md`: Entry and Amendment name `review:`
- `test/repo/agents.test.mjs`: fixture and architect sent keys

**Changes:** Per D-001 and D-002. In the hook's `applyVerdict`, a reviewer `DRIFT DETECTED` with scope `crosscheck` passes `blocking` (the `path` of each Critical and Major `parseFindings` row, in block order) into `route`; `verdictRow` writes it only when present. `pendingAmend` returns the row so `amendStep` can set `review` (D-001's mapping, through `reviewRel`); a row of another scope gets no `review`. `amendAnswerStep` sets `review` to the cumulative review. `sendsFor`'s `amend` case prints `review:` between `amend:` and `reword:`. `recheckStep` applies D-002's rule to the drift row. The deepEqual expectations at `next-step.test.mts:140` and `:171` gain the crosscheck `review`. The architect Entry names `review: <path>`; the Amendment section's first paragraph reads the review and every Critical and Major finding in it before the cited sections. `agents.test.mjs` passes `review` in the architect fixture and adds `review` to the expected architect keys.

**Done when:**
- **T-1.1** A `next-step.test.mts` test, failing on the base, holds a design item whose drift row carries `blocking` `work/<id>/design.md#D-007`, `#phase-9` and `#phase-6`, then an `AMENDED` whose record logs only D-007 on the drift's day: `nextStep` returns `review_crosscheck` with `delta: []`.
- **T-1.2** In the same file, `blocking` of only `design.md#D-003` with D-003 revised keeps `delta: ["D-003"]`, an empty `blocking` gives `[]`, and the existing tests "an amended drift sends the reviewer instance to re-check the decisions revised since the drift's day" and "the plugin-only replay re-checks after the amendment, then offers the stall options once aligned (T-1.2)" pass with their delta expectations unedited.
- **T-1.3** A `send.test.mts` test, failing on the base, feeds `nextStep` of a snapshot with a pending amend row to `sendsFor` and shows the architect message is `work:`, `amend:`, `review: work/<id>/reviews/crosscheck.md` for a cross-check drift, `review: work/<id>/reviews/phase-2.md` for a reviewer row with scope null and phase 2, and `review: work/<id>/reviews/cumulative.md` followed by the `reword:` line for the gated reword.
- **T-1.4** A hook test routes a cross-check `DRIFT DETECTED` block with three Major rows and one Minor row through `routeVerdict`; the new row's `blocking` equals the three Major paths in block order, and an `ALIGNED` cross-check row has no `blocking` key.
- **T-1.5** `src/agents/architect.md` names `review: <path>` in `## Entry`, stays at most 120 lines, and `test/repo/agents.test.mjs` passes with `review` in the architect's sent keys.
- **T-1.6** On a scratch item, a drift block with three Major rows piped into `dist/hooks/route.verdict.mjs`, then an `AMENDED` revising one decision, makes `picket next` print first the architect send with the `review:` line and then the reviewer send with no `delta:` line.
- **T-1.7** `npm test` exits 0.

## Phase 2: A run grant set before the send keeps the send

**Touch set:**
- `src/lib/shared/route/route.mts`: stamp `through` on grant approval
- `src/lib/verbs/route/index.test.mts`: stamp written by the route
- `src/lib/shared/work/send.mts`: `developerHandedOn` reads the stamp
- `src/lib/shared/work/send.test.mts`: incident test, fixture stamp
- `src/lib/shared/work/next-view.test.mts`: hand-off fixture stamp

**Changes:** Per D-003. `verdictRow` (or its caller in `route`) sets `through` on a `PHASE DONE` row to `snap.state.run_through` when the planned changes hold the grant's approval marker for that phase, and null when the grant stops at a gate or is absent. `developerHandedOn` also requires the row's `through` to be a number at least the current phase. The hand-off fixtures (`send.test.mts:105`, `next-view.test.mts:91`) gain `through: 3` on the PHASE DONE row, because a real hand-off row now carries it.

**Done when:**
- **T-2.1** A `send.test.mts` test, failing on the base, holds phases 1 and 2 approved, phase 3 open, `run_through: 3`, and a session-matching developer `PHASE DONE` of phase 2 with `through: null` and no later user row: `sendsFor` for phase 3 returns one developer send whose last line is `run through 3`.
- **T-2.2** A route test shows a `PHASE DONE` of phase 2 routed with `run_through: 3` and phase 1 approved writes a row with `through: 3`; one routed with no grant, and one whose grant stops at a security path gate, write `through: null`.
- **T-2.3** The hand-off tests "a phase the run grant handed to the live developer gets no send (T-2.1)", "the hand-off ends with a user row, another session or an idle marker, and the send returns (T-2.2)" and "a phase the run grant handed to the live developer shows the hand-off detail and no send (T-2.3)" pass with the stamped fixtures.
- **T-2.4** The hook tests that build the hand-off through `route` ("a continued developer stop that routes nothing while the run grant hands it phase 3 marks 3.idle (T-2.4)" and "a continued stop of a developer teammate named by instance marks 3.idle like picket:developer (T-1.4)") pass unedited.
- **T-2.5** A scratch copy of `20261114-standard-test-environment-and-env-verbs` (its first 19 verdict rows, phases 1 to 5 done and approved, `5.reviewed`, `status: open`, `run_through: 10`) run with `CLAUDE_CODE_SESSION_ID=d09e885b-38d7-46ab-90a1-fca179743a5f picket next <id>` prints `implement_phase` for phase 6 with a send to `pllp-developer` holding `phase: 6` and `run through 10`; the base prints the hand-off note and no send.
- **T-2.6** `npm test` exits 0.

## Phase 3: The amendment gate corrects the declared check it names

**Touch set:**
- `src/lib/shared/work/amendment.mts`: `namedChecks`, `frameDigest`, frame comparison
- `src/lib/shared/work/amendment.test.mts`: frame digest rules
- `src/lib/shared/work/verdict-log.mts`: `VerdictRow.frame` field
- `src/lib/shared/route/route.mts`: stamp `frame` beside `record`
- `src/lib/verbs/route/index.test.mts`: frame round trip
- `src/lib/shared/work/next-step.mts`: uncounted out-of-frame amendment
- `src/lib/shared/work/next-step.test.mts`: gate detail tests
- `src/lib/shared/work/send.mts`: `checks:` line on reword
- `src/lib/shared/work/send.test.mts`: reword send lines
- `src/agents/architect.md`: reword may correct named checks
- `test/repo/agents.test.mjs`: fixture and architect sent keys

**Changes:** Per D-004. `amendment.mts` exports `namedChecks(phases, amend)`, `frameDigest(phases, named)` and a check that the newest prior amend row's `frame` differs from an `AMENDED` row's, both present. `stampedRecord` in `route.mts` adds `frame` with D-004's choice of amend line. In `next-step.mts`, `isCountedAmended` also requires the frame to match, and `amendAnswerStep` returns the gate with D-004's detail when an uncounted `AMENDED` differs only by frame. `sendsFor` prints `checks: <ids, comma separated>` after the `reword:` line when `namedChecks` is non-empty. The architect shell's reword sentence allows each check on `checks:` to change its `contains`, `exit_code` or `command`, and nothing else in the frontmatter; Entry names `checks: <T-N.x ids>`. `agents.test.mjs` gives the reword fixture a phase entry with a check covering the amend line's id and adds `checks` to the expected architect keys.

**Done when:**
- **T-3.1** A `send.test.mts` test, failing on the base, shows a reword amend for `AMENDMENT NEEDED: T-1.5 the drive check expects # pass 1` on a record whose phase 1 declares a check covering T-1.5 ends with `checks: T-1.5`; with no check covering the named id, or without `reword`, no `checks:` line appears.
- **T-3.2** `amendment.test.mts` shows `frameDigest` with T-1.5 named is equal when only T-1.5's `contains`, `exit_code` or `command` differ, and different when another check's `contains`, a grep pattern, a `files` entry or T-1.5's `covers` differ.
- **T-3.3** A route test routes a cumulative `CHANGES REQUIRED` with the T-1.5 amend line, rewrites T-1.5's `contains` and appends a revision log line on disk, routes `AMENDED`, and finds equal `frame` values on both rows.
- **T-3.4** A `next-step.test.mts` test shows an answered gate whose `AMENDED` row has a new `record` and a `frame` unlike the asking row's returns `approve_amendment` with the detail `the architect's amendment changed the frontmatter beyond the declared checks it names`; with matching frames it moves past the gate, and rows without `frame` behave as on the base.
- **T-3.5** `src/agents/architect.md` names `checks: <T-N.x ids>` in `## Entry`, stays at most 120 lines, and `test/repo/agents.test.mjs` passes with `checks` in the architect's sent keys.
- **T-3.6** A scratch copy of `20261114-env-verbs-pass-on-real-engine` (its first 8 verdict rows and 3 reply rows, phases 1 to 3 done and approved, `status: open`) run with `picket next <id> --human` prints the reword send to `ofao-architect` ending `checks: T-1.5`; the base ends at the `reword:` line.
- **T-3.7** `npm test` exits 0.

## Open questions

none

## Revision log
