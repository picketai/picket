---
kind: order
lane: order
title: Checkpoint changes required gets a fix step
date: 2026-11-01
audience: developer
sources: request.md, preflight.txt, src/lib/shared/work/next-step.mts, src/lib/shared/work/send.mts, src/lib/shared/work/reviews.mts, src/lib/shared/work/action-text.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/route.mts, src/lib/hooks/route/verdict/index.mts, src/lib/shared/transcript/entries.mts, src/mods/status/hooks/band.test.ts
phases:
  - n: 1
    files:
      - src/lib/shared/work/next-step.mts
      - src/lib/shared/work/next-step.test.mts
      - src/lib/shared/work/send.mts
      - src/lib/shared/work/send.test.mts
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: 'review: "checkpoint"'
      - path: src/lib/shared/work/send.mts
        pattern: 'reviewRel\('
      - path: src/lib/shared/work/send.mts
        pattern: 'reviews/cumulative\.md'
        absent: true
      - path: src/lib/shared/work/send.test.mts
        pattern: 'reviews/checkpoint\.md'
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/work/action-text.mts
      - src/lib/shared/work/action-text.test.mts
      - src/mods/status/hooks/band.test.ts
    greps:
      - path: src/lib/shared/work/action-text.mts
        pattern: 'developer fixes the review findings'
      - path: src/lib/shared/work/action-text.mts
        pattern: 'cumulative review findings'
        absent: true
      - path: src/mods/status/hooks/band.test.ts
        pattern: 'developer fixes the review findings'
    tests: true
    drive: false
---
# Order: Checkpoint changes required gets a fix step

## Problem
A mid-plan checkpoint review (scope `checkpoint`, design lane, six or more phases) that returns CHANGES REQUIRED leaves `picket next` printing `review_checkpoint` again, because `startStep` in `src/lib/shared/work/next-step.mts:126` only asks whether the previous phase carries a `reviewed` marker, and only the cumulative review has a findings step (`findingsOpen`, `findingsStep` at lines 91 to 99). The fix send in `src/lib/shared/work/send.mts:169` hardcodes `reviews/cumulative.md`, although the verdict hook already saves a checkpoint block to `reviews/checkpoint.md` (`reviewFileName` in `src/lib/shared/work/reviews.mts:11`). The cumulative review's routing and stall rules must not change.

## Decisions
### D-001: The fix step names the review that rejected
**Decision:** The `fix_findings` variant of `NextStep` gains a field `review: "checkpoint" | "cumulative"`. `findingsStep` sets `"cumulative"`, the new checkpoint branch sets `"checkpoint"`, and the send builds its `review:` line with `reviewRel(id, step.review, null)` from `reviews.mts` instead of the hardcoded file name. The routing judgement is made once, in `next-step.mts`, and the send only renders it. `nextView` copies named fields only (`src/lib/shared/work/next-view.mts:22`), so the wire `NextView` and the status mod see no new field.
**Instead of:** having `send.mts` find the last reviewer row itself: the same "which review is open" rule would live in two modules and could disagree.
**Risks:**
- **RISK-001** Existing tests that `deepEqual` a cumulative `fix_findings` step fail on the new field. Mitigation: phase 1 adds `review: "cumulative"` to those expected objects and step literals; no expected message text changes.

### D-002: The checkpoint findings check sits in front of the checkpoint review
**Decision:** `findingsOpen` takes the scope it looks for (`"checkpoint"` or `"cumulative"`): the last reviewer row of that scope is CHANGES REQUIRED and no PHASE DONE row follows it. `startStep`, at the midpoint with the previous phase not reviewed, returns `fix_findings` (actor developer, `phase: prev.n`, `review: "checkpoint"`, detail `the checkpoint review returned CHANGES REQUIRED; fix its findings`) when checkpoint findings are open, and `review_checkpoint` otherwise. A developer PHASE DONE closes the findings and sends the item back to `review_checkpoint`; the checkpoint APPROVED writes `phases/<prev>.reviewed` (`phaseReviewed` in the route plan module), and only then does `implement_phase` follow. `amendStep` and `recheckStep` still run first in `phasedStep`.
**Instead of:** a separate checkpoint branch at the top of `phasedStep`: it would repeat the midpoint test that `startStep` already makes and fire outside the midpoint.
**Risks:**
- **RISK-002** Checkpoint rejections never stop the lane, unlike the three-rejection cumulative stall. Mitigation: OQ-001; meanwhile the developer's PHASE STALLED still blocks the item.

### D-003: The checkpoint fix send carries the phase it fixes
**Decision:** For `review: "checkpoint"` the developer's message adds `phase: <n>` after the `review:` line. At the checkpoint the first unapproved phase is the unstarted midpoint phase, and `route` falls back to `currentPhase` when a PHASE DONE names no phase (`src/lib/shared/route/route.mts:69`), so a PHASE DONE landing there would mark that phase done and skip both its implementation and the re-review. The `phase:` line feeds the verdict hook's hints and the developer's block heading. The cumulative fix message stays byte for byte as it is.
**Instead of:** a `phase:` line on both fix sends: it changes the cumulative send, which is out of scope, and gains nothing there, because every phase is approved and `currentPhase` is null.
**Risks:**
- **RISK-003** A developer heading that still names the midpoint phase marks it done. Mitigation: T-1.4 pins the `phase:` line; a kernel refusal is not part of this order.

### D-004: One neutral action line for both reviews
**Decision:** `ACTION_TEXT.fix_findings` becomes `developer fixes the review findings`, the same in both voices. `ActionStep` and the copy of `action-text.mts` the status mod receives stay as they are.
**Instead of:** naming the review in the line (`fixes the checkpoint review findings`): `ActionStep` carries no scope, so the wire view and the mod copy would have to grow a field for a status band wording.

## Scope
**In:**
- `fix_findings` routing after a checkpoint CHANGES REQUIRED, and back to `review_checkpoint` after PHASE DONE
- the fix send naming the review file that rejected, plus the checkpoint phase line
- the neutral action text and its tests
- unit tests for the routing and the send

**Out:**
- the cumulative review's routing and stall rules
- a stall rule for checkpoint rejections (OQ-001)
- the skills' prose and the reviewer's checklists

## Phase 1: Route a checkpoint rejection to a fix
**Touch set:**
- `src/lib/shared/work/next-step.mts`: findingsOpen scope, startStep branch, type
- `src/lib/shared/work/next-step.test.mts`: checkpoint routing tests, cumulative field
- `src/lib/shared/work/send.mts`: review file from the step
- `src/lib/shared/work/send.test.mts`: checkpoint send test, cumulative literals
- `src/lib/shared/work/reviews.mts`: reviewRel, read only
- `src/lib/shared/route/plan.mts`: checkpoint APPROVED writes reviewed, read only

**Changes:** In `next-step.mts`, add `review: "checkpoint" | "cumulative"` to the `fix_findings` variant of `NextStep` (D-001), give `findingsOpen` a scope parameter, keep `findingsStep` for the cumulative scope with `review: "cumulative"`, and add the checkpoint branch in `startStep` (D-002). In `send.mts`, import `reviewRel` from `./reviews.mts` and build the fix message as `work:`, `review: <reviewRel>`, `phase: <n>` only for the checkpoint (D-003), the worktrees lines, then the artifact line for an `Agent` spawn, the same order as today. Add `review: "cumulative"` to every existing `fix_findings` step literal and expected step object in both test files. In `next-step.test.mts`, build the checkpoint fixtures as the existing test `phase 4 of a six-phase design starts with a checkpoint on phase 3` does, with a reviewer row whose scope is `checkpoint` and a developer PHASE DONE row.

**Done when:**
- **T-1.1** A unit test in `next-step.test.mts`: a six-phase design item with phases 1 to 3 done and approved and a last reviewer row `CHANGES REQUIRED` with scope `checkpoint` gives exactly `{ action: "fix_findings", actor: "developer", phase: 3, review: "checkpoint", detail: "the checkpoint review returned CHANGES REQUIRED; fix its findings" }`.
- **T-1.2** The same fixture with a later developer `PHASE DONE` row gives exactly `{ action: "review_checkpoint", actor: "reviewer", phase: 3, detail: "mid-plan checkpoint before phase 4" }`.
- **T-1.3** The same fixture with phase 3 also `reviewed` gives `implement_phase` for phase 4, rejection row or not.
- **T-1.4** A unit test in `send.test.mts`: the checkpoint `fix_findings` step for phase 3 on a design item with no rows of its own gives one `Agent` send to `<tag>-developer` whose message is exactly `work: <id>`, `review: work/<id>/reviews/checkpoint.md`, `phase: 3`, `artifact: work/<id>/design.md`, one per line.
- **T-1.5** Every existing cumulative `fix_findings` assertion in both test files keeps its expected `detail` and message text unchanged; the diff to them adds only `review: "cumulative"`.
- **T-1.6** `src/lib/shared/work/send.mts` no longer contains the text `reviews/cumulative.md`.
- **T-1.7** Driving `picket next <id>` on a scratch six-phase design item in a temporary project root, phases 1 to 3 approved and a routed reviewer `CHANGES REQUIRED --scope checkpoint`, prints a first line starting `fix_findings · developer · phase 3` and a send whose message carries `review: work/<id>/reviews/checkpoint.md`.
- **T-1.8** `npm test` passes.

## Phase 2: One action line for both reviews
**Touch set:**
- `src/lib/shared/work/action-text.mts`: fix_findings line
- `src/lib/shared/work/action-text.test.mts`: pin the new line
- `src/mods/status/hooks/band.test.ts`: expected band text

**Changes:** Change `ACTION_TEXT.fix_findings` to return `developer fixes the review findings` (D-004). Add an assertion to `action-text.test.mts` for both voices. Update the expected text in the band test `fixing findings and amending read as the agent at work`. `action-text.mts` keeps importing nothing, because the build copies it into the mods (`MOD_LIB_SHARED` in `scripts/build.mjs`).

**Done when:**
- **T-2.1** `ACTION_TEXT.fix_findings` returns `developer fixes the review findings` in the `user` and the `observer` voice, asserted in `action-text.test.mts`.
- **T-2.2** `src/lib/shared/work/action-text.mts` no longer contains the text `cumulative review findings`.
- **T-2.3** `src/mods/status/hooks/band.test.ts` expects `developer fixes the review findings ⋯` for a `fix_findings` step.
- **T-2.4** `npm test` passes; the block says whether its mods step ran or printed `mods: skipped, claude not on PATH`.

## Open questions
- **OQ-001** Should three checkpoint rejections in a row stop the lane with the stall options, as three cumulative rejections do? Owner: user. Fallback: no checkpoint stall in this order; the fix and re-review loop runs until APPROVED or the developer's PHASE STALLED blocks the item.

## Revision log
