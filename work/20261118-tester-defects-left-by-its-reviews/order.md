---
kind: order
lane: order
title: Tester defects left by its reviews
date: 2026-11-18
audience: developer
sources: work/20261118-tester-defects-left-by-its-reviews/request.md, work/20261117-the-tester-checks-finished-items/reviews/checkpoint.md, work/20261117-the-tester-checks-finished-items/reviews/cumulative.md, src/lib/shared/work/test-stage.mts, src/lib/shared/work/next-step.mts, src/lib/verbs/reply/index.mts, src/lib/hooks/guard/blackbox/index.mts, src/lib/shared/review-summary.mts, src/lib/shared/work/block.mts, src/lib/hooks/guard/scope/index.mts, src/lib/shared/testing/results.mts, src/lib/shared/testing/report.mts, src/lib/verbs/test/report.mts, src/lib/verbs/test/note.mts, src/lib/shared/scenarios/keep.mts, src/lib/shared/testing/keep-cases.mts, src/skills/testing/steps/cases.md
phases:
  - n: 1
    files:
      - src/lib/shared/work/test-stage.mts
      - src/lib/shared/work/test-stage.test.mts
    tests: true
    drive: false
  - n: 2
    files:
      - src/lib/shared/work/owned-paths.mts
      - src/lib/shared/review-summary.mts
      - src/lib/hooks/guard/blackbox/index.mts
      - src/lib/hooks/guard/blackbox/index.test.mts
      - src/lib/hooks/guard/blackbox/index.variants.test.mts
      - src/lib/hooks/guard/scope/index.variants.test.mts
    greps:
      - path: src/lib/shared/work/owned-paths.mts
        pattern: export function itemOwnedPaths\b
      - path: src/lib/shared/review-summary.mts
        pattern: \bfunction itemOwnedPaths\b
        absent: true
      - path: src/lib/hooks/guard/blackbox/index.mts
        pattern: \bitemOwnedPaths\b
      - path: src/lib/hooks/guard/blackbox/index.mts
        pattern: \bfunction ownedPaths\b
        absent: true
      - path: src/lib/hooks/guard/blackbox/index.mts
        pattern: review-summary
        absent: true
      - path: src/lib/hooks/guard/scope/index.variants.test.mts
        pattern: test/results\.jsonl
      - path: src/lib/hooks/guard/scope/index.variants.test.mts
        pattern: test\.md
    tests: true
    drive: false
  - n: 3
    files:
      - src/lib/shared/testing/results.mts
      - src/lib/shared/testing/results.test.mts
      - src/lib/shared/testing/report.mts
      - src/lib/verbs/test/report.mts
      - src/lib/verbs/test/note.mts
      - src/lib/verbs/test/record.test.mts
      - src/lib/shared/scenarios/keep.mts
      - src/lib/shared/scenarios/keep.test.mts
      - src/lib/shared/testing/keep-cases.test.mts
    greps:
      - path: src/lib/shared/testing/results.mts
        pattern: export const COUNTED_OUTCOMES\b
      - path: src/lib/shared/testing/report.mts
        pattern: \bnot covered\b
        absent: true
      - path: src/lib/verbs/test/report.mts
        pattern: \bnot covered\b
        absent: true
      - path: src/lib/verbs/test/report.mts
        pattern: \broundCounts\b
      - path: src/lib/verbs/test/note.mts
        pattern: \bnot-covered\b
        absent: true
    tests: true
    drive:
      - covers: T-3.3
        command: picket test note 20261118-tester-defects-left-by-its-reviews
        exit_code: 1
        contains:
          - "test note <id> <criterion> <kind> <blocked|not-run|not-covered> --why <text>"
          - "or test note <id> <criterion> untestable --why <text>"
---
# Order: Tester defects left by its reviews

## Problem
The checkpoint and cumulative reviews of `work/20261117-the-tester-checks-finished-items` left six defects open in the tester: two dead ends in the test stage's machine (`src/lib/shared/work/test-stage.mts:90-96` and `:140-146`), two hand-copied lists that drift silently (the black box's owned paths, the outcome words), a keep rule that never keeps an authenticated case, and a guard change without closure seeds. The binding constraint is the request's last paragraph: no behaviour changes outside these six points, and the setting `testing` stays `design`. The request's line numbers for the outcome lists come from the checkpoint tree; on base `5e083063` they are `src/lib/shared/testing/results.mts:7-8`, `src/lib/verbs/test/report.mts:14` and `src/lib/verbs/test/note.mts:13`.

## Decisions

### D-001: The test-stage stall stop holds only while nothing follows the tester
**Decision:** `rejectionsStep` in `test-stage.mts` returns null as soon as any verdict row follows the latest tester row in the stage, not only a developer row. The `[d]` reply already sends the architect `amend:` through `redesign()` (`src/lib/verbs/reply/index.mts:80-85`), exactly as at the other stall stops; the defect is only that `picket next` never leaves the stop afterwards. After the architect's `AMENDED`, `changesStep` runs as for any fix round: the developer fixes the tester's findings against the amended record, the cumulative reviewer re-reviews, the tester retests. This mirrors the main flow, whose `rejectionsStep` (`src/lib/shared/work/next-step.mts:64-69`) fires only while the rejection is the latest verdict and then falls through to the developer's fix. Between `[d]` and `AMENDED` the stop still prints, as in the main flow, because the reply itself prints the architect's send.
**Instead of:** sending the item straight to a retest after `AMENDED`: the third round failed on product failures, so a retest without a code change would fail the same cases and add a round for nothing; a developer with nothing to change ends `PHASE DONE` quickly.
**Risks:**
- **RISK-001** The architect returns `AMENDED` without changing the record and the developer fixes against the same record. Mitigation: fix rounds still count from the last fresh reply (the `[d]` reply is not fresh), so the stop returns at round 6.

### D-002: A rejected fix runs the same fix cycle as a tester fix route
**Decision:** At `approve_fixes`, the user's answer is the latest `user` row with scope `test` after the latest tester row (today: after the latest developer `PHASE DONE`, which forgets a rejection as soon as the developer answers it). A `rejected` answer sends the rows after it through `fixCycleStep`: no developer row gives the fix step with today's detail `the user rejected the test fixes; fix what the reason names`; a `PHASE DONE` gives `review_cumulative`; a cumulative `APPROVED` gives `test_item` for the next round; a cumulative `CHANGES REQUIRED` gives the cumulative fix step. The tester's next row becomes the new anchor, so after its `APPROVED` the `approve_fixes` stop repeats. `FixCycle` gains the fix detail so the rejection's wording reaches `fixStep`.
**Instead of:** a re-review without a retest: the reworked fix can break a case the tester passed, and the request asks for both.

### D-003: The item's owned paths live in one module with no extension loader
**Decision:** Infrastructural decision. `itemOwnedPaths(root, id, phases): string[] | null` moves unchanged into a new module, `src/lib/shared/work/owned-paths.mts`, which imports only `artifact.mts`, `block.mts` and `files.mts`. `review-summary.mts` drops its definition and re-exports it (`export { itemOwnedPaths } from "./work/owned-paths.mts"`, the pattern `next-step.mts` uses for `NEXT_ACTIONS`), so `verbs/mutate` and `verbs/summary` keep their imports. `guard.blackbox` deletes `ownedPaths` and calls `itemOwnedPaths(...) ?? []`.
**Instead of:** importing `itemOwnedPaths` from `review-summary.mts` in the hook: that module loads `extensions.mjs` and the git readers into a PreToolUse hook that runs on every tester Read and Grep, under the 200 ms cold budget. A test comparing the two copies lost too: it catches drift only for the fixture it builds.

### D-004: Outcome lists are derived from results.mts
**Decision:** `results.mts` exports `COUNTED_OUTCOMES`, the union of `CASE_OUTCOMES` then `CELL_OUTCOMES` without repeats, which gives today's order `passed, failed, blocked, not run, not covered` (checked with a one-off script on base). `shared/testing/report.mts` imports it in place of its literal. `verbs/test/report.mts` deletes `COUNTS_LINE` and takes its counts line from `roundCounts(facts.rows, facts.round)`, the function that already renders that line for the report and `picket close`; on base the regex finds the same line, since no line above it can match. `note.mts` derives its outcome words and the `<blocked|not-run|not-covered>` part of its usage from `CELL_OUTCOMES`, a space becoming a hyphen; the derived texts equal today's literals (same script).
**Instead of:** a test that compares the hand lists with `results.mts`: a new outcome would still need a second edit, which the request rules out.

### D-005: A login request is not a write of unowned data
**Decision:** `writesUnownedData(card)` skips the login request: the card's first request, whose body holds a `{user:` placeholder and which a `capture` step follows before the next request. That is the shape `src/skills/testing/steps/cases.md` step 4 teaches. Every other request keeps today's rule (a changing method with no `PKT-` in its target or body is unowned). The rule sits in `writesUnownedData` so the case keeper and the declared-check keeper share it; a declared check is one request with no capture, so its result never changes. Run on the skill's example card, the function returns `true` on base (probe in the scratchpad) and must return `false` after.
**Instead of:** exempting a request whose path names `login`: login paths differ by app (`/session`, `/token`, `/auth`), while the skill defines a login by its shape.
**Risks:**
- **RISK-002** A first request that creates something with `{user:` values and captures its id is kept as a login. Mitigation: `{user:` values come from the environment's fixed users, so a replay of such a create collides and fails visibly at replay; the case was also stable and passing when kept.

## Scope
**In:**
- The `[d]` reply at the test stage's three-round stop (D-001).
- The rejected fix at `approve_fixes` (D-002).
- One source for the item's owned paths (D-003) and the guard.scope closure seeds for `work/<id>/test/` and `work/<id>/test.md`.
- Outcome lists derived from `results.mts` (D-004) and keeping cases whose only write is their login (D-005).

**Out:**
- The per-round case cap (question S-4), the planted-defect benchmark (TF-005), the default of `testing`, and any new tester behaviour.
- The text of the `[d]` send to the architect (see OQ-001).

## Phase 1: The test stage leaves its stall and rejection stops
**Touch set:**
- `src/lib/shared/work/test-stage.mts`: rejectionsStep, approvedStep, fixCycleStep
- `src/lib/shared/work/test-stage.test.mts`: the machine's existing tests
- `src/lib/verbs/reply/index.mts`: redesign sends the amendment (read only)
- `src/lib/shared/work/next-step.mts`: main-flow stall to mirror (read only)

**Changes:** `rejectionsStep` returns null when `rowsAfterTester(stage, tester)` holds any row (D-001). `approvedStep` finds the user's answer among the stage rows after `tester`; on `rejected` it returns `fixCycleStep` over the rows after that rejection, with the rejection's fix detail (D-002). `userAnswerToFixes` goes or changes to that anchor. The existing T-8.4 line that expects `approve_fixes` right after the developer's rework changes to the new expectation; every other existing test stays as written. In the criteria, "three fix rounds" means the stage rows `cumulative APPROVED, tester r1 fix, developer PHASE DONE, cumulative APPROVED, tester r2 fix, developer PHASE DONE, cumulative APPROVED, tester r3 fix`, built with the test file's helpers.

**Done when:**
- **T-1.1** After three fix rounds, a `resolve_rejections` reply `d` (not fresh) and an `architect` `AMENDED` row, `nextStep` returns `{ action: "fix_findings", actor: "developer", phase: 1, review: "test", detail: "the tester found product failures; fix them" }`; with the `d` reply and no `AMENDED` row it still returns the `resolve_rejections` stop.
- **T-1.2** Continuing T-1.1: a developer `PHASE DONE` gives `review_cumulative` with `fixes: 3` and detail `the fixes of test round 3 are done; the cumulative review runs again`; a cumulative `APPROVED` after it gives `test_item` with `round: 4`.
- **T-1.3** The existing test "a third route fix round stops with the stall options until a fresh reply (T-7.4)" passes unchanged.
- **T-1.4** With the stage rows `cumulative APPROVED, tester r1 fix, developer PHASE DONE, cumulative APPROVED, tester r2 APPROVED, user rejected (scope test)`: no further row gives the fix step with detail `the user rejected the test fixes; fix what the reason names`; a developer `PHASE DONE` gives `review_cumulative` with `fixes: 2`; a cumulative `APPROVED` gives `test_item` with `round: 3`.
- **T-1.5** Continuing T-1.4: a tester `APPROVED` round 3 gives `approve_fixes` with detail `the tester approved round 3; the fixes of the test stage await your approval`, and a user `approved` row after it gives `close`.
- **T-1.6** Continuing T-1.4 after the developer's `PHASE DONE`: a cumulative `CHANGES REQUIRED` gives `fix_findings` with `review: "cumulative"`.
- **T-1.7** `npm test` fails no test that passes on base `5e083063` (on this machine base fails only `test/cli/init.test.mjs:91`, the home-folder case).

## Phase 2: One owned-path list and the guards' closure seeds
**Touch set:**
- `src/lib/shared/work/owned-paths.mts`: new home of itemOwnedPaths
- `src/lib/shared/review-summary.mts`: drop definition, re-export it
- `src/lib/hooks/guard/blackbox/index.mts`: delete ownedPaths, call shared
- `src/lib/hooks/guard/blackbox/index.test.mts`: fixes-file path is denied
- `src/lib/hooks/guard/blackbox/index.variants.test.mts`: seed for a fixes-file path
- `src/lib/hooks/guard/scope/index.variants.test.mts`: seeds for the tester's paths
- `src/lib/hooks/guard/scope/index.mts`: KERNEL_OWNED_ENTRIES, denial reason (read only)
- `src/lib/shared/work/block.mts`: saveBlock writes N.fixes.md (read only)
- `src/lib/verbs/mutate/index.mts`: importer stays unchanged (read only)
- `src/lib/verbs/summary/index.mts`: importer stays unchanged (read only)
- `test/repo/closures.test.mjs`: both entries already listed (read only)

**Changes:** Per D-003, `owned-paths.mts` holds `itemOwnedPaths` as it is today; `review-summary.mts` re-exports it and drops the imports only it used; `guard.blackbox` uses it with `?? []`. The blackbox tests write the fixes entry through the real writer: create the `1.approved` marker, then `saveBlock` a phase block whose `Files:` line names `src/orders/fix.mts`, which `saveBlock` appends to `phases/1.fixes.md`. The guard.scope closure gains the seeds Write `work/<id>/test/results.jsonl` and Edit `work/<id>/test.md` for a fixed valid work id; its fixture creates `work/<id>/test/`, each spelled form reaches the work seeds through its own spelling (the upper-case form upper-cases the work folders, the link forms go through a link to `work/`), and its `denied` predicate also accepts the kernel-owned reason (`is kernel-owned`), which guard.scope gives for these paths.

**Done when:**
- **T-2.1** `src/lib/shared/work/owned-paths.mts` exports `itemOwnedPaths`; `review-summary.mts` holds no definition of it and re-exports it; `src/lib/verbs/mutate/index.mts` and `src/lib/verbs/summary/index.mts` are unchanged.
- **T-2.2** `guard.blackbox` holds no `ownedPaths` function, calls `itemOwnedPaths`, and does not import `review-summary`.
- **T-2.3** `blackbox/index.test.mts`: a tester Read of `src/orders/fix.mts` gets no decision before the fixes entry is saved, and is denied with `black box` after it.
- **T-2.4** `blackbox/index.variants.test.mts` seeds a Read of the fixes-file path and its fixture saves that fixes entry through `saveBlock`; the closure passes in every form.
- **T-2.5** `scope/index.variants.test.mts` seeds `work/<id>/test/results.jsonl` and `work/<id>/test.md`, and the closure passes in all seven forms for every seed, the scenario seeds included.
- **T-2.6** The block reports a scratch check: with `test/` removed from `KERNEL_OWNED_ENTRIES` in a scratch copy, the scope closure fails naming the `test/results.jsonl` seed; with `test.md` removed, it fails naming the `test.md` seed.
- **T-2.7** `npm test` fails no test that passes on base `5e083063`, `test/repo/closures.test.mjs` and the 200 ms hook budget included.

## Phase 3: Outcome lists from results.mts and kept login cases
**Touch set:**
- `src/lib/shared/testing/results.mts`: export COUNTED_OUTCOMES
- `src/lib/shared/testing/results.test.mts`: pin the counted order
- `src/lib/shared/testing/report.mts`: use the shared list
- `src/lib/verbs/test/report.mts`: counts line from roundCounts
- `src/lib/verbs/test/note.mts`: derive words and usage
- `src/lib/verbs/test/record.test.mts`: pin usage and empty counts
- `src/lib/shared/scenarios/keep.mts`: login exemption in writesUnownedData
- `src/lib/shared/scenarios/keep.test.mts`: login cards both ways
- `src/lib/shared/testing/keep-cases.test.mts`: authenticated case is kept
- `src/lib/shared/testing/keep-cases.mts`: caller of writesUnownedData (read only)
- `src/skills/testing/steps/cases.md`: the login card example (read only)

**Changes:** Per D-004, `results.mts` exports `COUNTED_OUTCOMES`; `report.mts` imports it; `verbs/test/report.mts` drops `COUNTS_LINE` and returns `roundCounts(facts.rows, facts.round)` as `counts`; `note.mts` builds its words map and its usage from `CELL_OUTCOMES`. Per D-005, `writesUnownedData` skips the login request. Before the first edit, add the pinning tests of T-3.1 and T-3.3 on base and see them pass there; they are the before-images. The skill example card in T-3.4 is the step-4 card of `cases.md` verbatim.

**Done when:**
- **T-3.1** `results.test.mts` asserts `COUNTED_OUTCOMES` equals `["passed", "failed", "blocked", "not run", "not covered"]`, the literal at `src/lib/shared/testing/report.mts:6` on base.
- **T-3.2** `report.test.mts` and `record.test.mts` pass unchanged (`2 passed, 1 failed, 1 blocked, 1 not covered`; `1 failed` then the verdict line), and a new `record.test.mts` case renders a report with no rows in the round whose first line is `no cases recorded`.
- **T-3.3** `record.test.mts` asserts the note verb's usage equals the base text `test note <id> <criterion> <kind> <blocked|not-run|not-covered> --why <text>, or test note <id> <criterion> untestable --why <text>`, and that parse maps `blocked`, `not-run` and `not-covered` to `blocked`, `not run` and `not covered`; `picket test note <id>` with no criterion exits 1 printing that usage.
- **T-3.4** `keep.test.mts`: `writesUnownedData` is `false` for the skill example card (login, then a POST with `PKT-{run}`) and `true` for: the same card with the second body `{"reference": "a"}`; a first POST with a `{user:` body and no capture after it; a login shape that is the second request. Its three existing assertions hold.
- **T-3.5** `keep-cases.test.mts`: a passed, stable case with the skill example steps gives one candidate whose text holds `request POST {orders}/login`; the same login followed by `request DELETE {orders}/orders/1` gives none.
- **T-3.6** `npm test` fails no test that passes on base `5e083063`.

## Open questions
- **OQ-001** Should the `[d]` send at the test stage's stop also name the test report (`review: work/<id>/test.md`), so the architect reads what failed? Owner: product owner. Fallback: the send stays as at every other stall stop (`work:` and `amend:` with the stop's detail), since the request rules out other behaviour changes.

## Revision log
