---
kind: design
lane: design
title: Close the cumulative amendment loop
date: 2026-11-09
audience: developer
sources: request.md, preflight.txt, src/lib/shared/work/next-step.mts, src/lib/shared/route/route.mts, src/lib/shared/route/plan.mts, src/lib/hooks/route/verdict/index.mts, work/20261109-fix-budget-schema-session-admit-findings/verdicts.jsonl
phases:
  - n: 1
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts]
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: 'the cumulative review found plan wording and code findings'
      - path: src/lib/shared/work/next-step.mts
        pattern: '\bdeclinedAmendment\b'
        absent: true
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/work/amendment.mts, src/lib/shared/work/amendment.test.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/route/route.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/hooks/route/verdict/index.test.mts]
    greps:
      - path: src/lib/shared/work/amendment.mts
        pattern: 'createHash\("sha256"\)'
      - path: src/lib/shared/work/verdict-log.mts
        pattern: '\brecord\?: string'
      - path: src/lib/shared/route/route.mts
        pattern: 'recordDigest\('
      - path: src/lib/shared/route/plan.mts
        pattern: 'unchanged since the amendment was asked'
      - path: src/lib/shared/work/next-step.mts
        pattern: 'isUnchangedAmendment\('
      - path: src/lib/shared/work/next-step.mts
        pattern: 'returned AMENDED but'
    tests: true
    drive: true
    security: false
---
# Design: Close the cumulative amendment loop

## Problem
A cumulative review that returns `CHANGES REQUIRED` with an `AMENDMENT NEEDED:` line and a finding on code is routed without `plan_only` (`src/lib/hooks/route/verdict/index.mts:113-116`), so `planAmendStep` (`src/lib/shared/work/next-step.mts:132-140`) returns null and `amendStep` sends the architect a plain `amend` with no `reword:` line. The architect contract forbids touching an approved phase without that line, so the architect answers `AMENDED` with no edit, and `pendingAmend` (`next-step.mts:73-78`) treats any later `AMENDED` row as the answer. The incident is rows 7 and 8 of `work/20261109-fix-budget-schema-session-admit-findings/verdicts.jsonl` (10:16:14 and 10:16:38). The user's gate is the only grant to reword an approved phase, and the architect contract also allows a legitimate no-edit `AMENDED` (the `RECONCILE` reply), so the fix cannot simply refuse every unchanged amendment.

## Decisions

### D-001: Every cumulative amendment line goes through the user's gate
**Decision:** Infrastructural decision. `planAmendStep` opens `approve_amendment` for the newest cumulative reviewer row whenever it carries `amend`, whatever `plan_only` says. `plan_only` keeps its meaning (every finding cites the record) and now only decides what follows the user's `[a]`: a plan-only review goes straight back to `review_cumulative` after the amendment, a mixed review goes to `fix_findings` for the developer until a `PHASE DONE` after the amendment, then to `review_cumulative`. The gate detail names the kind: the plan-only text stays `the cumulative review found only plan wording: <amend>; review: <path>`, the mixed text is `the cumulative review found plan wording and code findings: <amend>; review: <path>`; the options stay the two the plan-only gate has today, so `picket reply` forms and the packet need no change. `pendingAmend` stops looking at cumulative-scoped rows, since the gate owns them, which makes `declinedAmendment` dead and it is removed.
**Instead of:** setting `plan_only` on mixed reviews too: the amendment would then send the item straight to a new cumulative review with the code findings still unfixed, which fails again and costs a reviewer run.
**Risks:**
- **RISK-001** A legacy item already holding a mixed review followed by an ungated `AMENDED` now shows the gate instead of `fix_findings`. Mitigation: that is the incident's shape and the gate is the correct stop; `[f]` gives the old route.

### D-002: The record digest decides whether an AMENDED changed anything
**Decision:** Infrastructural decision. `route` stamps `record: <sha256 hex of the artifact body>` on every row it writes that carries `amend` and on every `AMENDED` row, taken from the snapshot it already reads (`snap.artifact.body`). A new module `src/lib/shared/work/amendment.mts` holds `recordDigest(body)` and `isUnchangedAmendment(prior, record)`: true only when `record` is set and equals the `record` of the newest row in `prior` that carries `amend`. A row without `record` (every row written before this change) counts as changed. The `AMENDED` row is still recorded; the `amended` plan adds a note line `<artifact> unchanged since the amendment was asked` so the hook's reply says so. The verdict row gains one optional field; no existing row is rewritten, so there is no migration.
**Instead of:** comparing the artifact with git `HEAD`: once every phase is approved, a first real amendment stays uncommitted until close, so a later no-op `AMENDED` would still look changed.
**Risks:**
- **RISK-002** The body excludes frontmatter, so an amendment that edits only the frontmatter reads as unchanged. Mitigation: the `work-items` rule makes every amendment append a `## Revision log` line in the body, and an unchanged reading reopens the gate (D-003), never loses work.

### D-003: An unchanged AMENDED spends the user's answer only on the gate path
**Decision:** Infrastructural decision. After the user answers `[a]`, an `AMENDED` that `isUnchangedAmendment` marks unchanged does not count: it spends that answer and `planAmendStep` reopens `approve_amendment` with the detail `the architect returned AMENDED but <artifact> is unchanged: <amend>; review: <path>`. A fresh reply then decides again (`[a]` re-sends the amend with the reword grant, `[f]` sends the developer). Amendments asked by a phase review, a checkpoint or a cross-check drift keep counting every `AMENDED`, because there an unchanged record is the architect's legitimate `RECONCILE` answer and the next step (the cross-check rerun, the developer) already handles it.
**Instead of:** re-sending the amend with the reword grant after an unchanged `AMENDED`: the architect has already answered with no edit, so the loop has no bound, and the choice between amending and fixing the code is the user's.
**Risks:**
- **RISK-003** The rule applies to the cumulative path only, so a no-edit `AMENDED` on a phase-level amendment still counts. Mitigation: the request scopes the fix to cumulative routing and names the drift flow out of scope; that path never asks to reword an approved phase.

## Scope
**In:**
- `approve_amendment` for every cumulative review that carries an amendment line, and the routing after each answer (`next-step.mts`).
- The `record` digest on amendment rows and `AMENDED` rows, and the rule that an unchanged `AMENDED` does not answer a gated amendment (`route.mts`, `plan.mts`, `verdict-log.mts`, a new `amendment.mts`).
- Unit tests for each, and a round-trip test through the verdict hook.

**Out:**
- The admit lane rules, the cleanup tab liveness gap, audit wall time.
- The cross-check drift flow: `amendedDrift` and `recheckStep` keep counting every `AMENDED`; drift rows only gain the `record` stamp.
- How the hook decides `plan_only` (`isPlanOnly` stays as it is), the reviewer and architect contracts, the reply forms and the packet.

## Phase 1: Mixed cumulative reviews reach the amendment gate
**Touch set:**
- `src/lib/shared/work/next-step.mts`: gate, answer routing, pendingAmend
- `src/lib/shared/work/next-step.test.mts`: gate and routing tests
- `src/lib/hooks/route/verdict/index.mts`: read only, isPlanOnly stays
- `src/lib/verbs/reply/table.mts`: read only, gate forms unchanged

**Changes:**
- `planAmendStep` (`next-step.mts:132-140`): the guard becomes "the newest cumulative reviewer row carries `amend`"; `plan_only` no longer gates it.
- `amendmentGate` (`next-step.mts:117-121`) takes the review row and picks the detail text by `plan_only` (D-001); options unchanged.
- `answeredAmendment` (`next-step.mts:123-130`), choice `amend`: no `AMENDED` after the answer gives `amend` with `reword: true` (as now). With one: plan-only gives `review_cumulative` (as now); mixed gives `fix_findings` (developer, `review: "cumulative"`, detail `the plan wording was amended; fix the cumulative review's code findings`) until a `PHASE DONE` after that `AMENDED`, then `review_cumulative` with detail `the plan wording was amended and the code findings fixed; the cumulative review runs again`. Choice `fix` is unchanged.
- `pendingAmend` (`next-step.mts:73-78`) looks only at rows whose `scope` is not `"cumulative"`; delete `declinedAmendment` (`next-step.mts:69-71`).
- Tests: the third assertion of `a pending amendment goes to the architect` (`next-step.test.mts:142`) and the first of `after AMENDED, an open cumulative rejection is fixed` (`next-step.test.mts:148`) now expect `approve_amendment`; rename those tests to say so. Add the tests T-1.1 to T-1.3 name.

**Done when:**
- **T-1.1** A unit test: a cumulative `CHANGES REQUIRED` row with `amend` and no `plan_only`, with no reply after it, gives exactly `{ action: "approve_amendment", actor: "user", detail: "the cumulative review found plan wording and code findings: <amend>; review: work/20261023-probe/reviews/cumulative.md", options: <the plan-only gate's two options> }`.
- **T-1.2** A unit test on that mixed row with a later reply `a`: `amend` with `reword: true` and the amend line; after a later `AMENDED`, `fix_findings` with `review: "cumulative"` and `phase` equal to the phase count; after a `PHASE DONE` later still, `review_cumulative`.
- **T-1.3** A unit test on that mixed row with a later reply `f`: `fix_findings`; after a `PHASE DONE`, `review_cumulative`; a newer cumulative `CHANGES REQUIRED` without `amend` then gives `fix_findings`, never `amend`.
- **T-1.4** The plan-only tests named `(T-2.2)`, `(T-2.4)`, `(T-2.5)` and `a gate reply older than the plan-only rejection does not answer it` in `next-step.test.mts` pass with their assertions unchanged (they pin the plan-only gate as the base has it), and a phase-scoped or crosscheck-scoped `amend` row still gives a plain `amend` with no `reword` key.
- **T-1.5** Drive: in a scratch folder, copy from `work/20261109-fix-budget-schema-session-admit-findings/` the files `design.md`, `request.md`, `phases/*.done` and `phases/*.approved` (no `*.reviewed`), `state.yaml` with `status: open`, the first 7 lines of `verdicts.jsonl`, and an empty `replies.jsonl`; run `CLAUDE_PROJECT_DIR=<scratch> picket next 20261109-fix-budget-schema-session-admit-findings` after `npm run build`. Before-image, captured by the architect on base `0bd9df7`: `"action":"amend"` and a send message with no `reword:` line. After the phase it prints `"action":"approve_amendment"` with the mixed detail.
- **T-1.6** `npm test` passes.

## Phase 2: An unchanged AMENDED does not answer a gated amendment
**Touch set:**
- `src/lib/shared/work/amendment.mts`: new, digest and unchanged rule
- `src/lib/shared/work/amendment.test.mts`: new, rule unit tests
- `src/lib/shared/work/verdict-log.mts`: optional `record` on rows
- `src/lib/shared/route/route.mts`: stamp `record` in verdictRow
- `src/lib/shared/route/plan.mts`: PlannedVerdict field, amended note
- `src/lib/shared/route/plan.test.mts`: amended note tests
- `src/lib/shared/work/next-step.mts`: spent answer reopens gate
- `src/lib/shared/work/next-step.test.mts`: reopened gate tests
- `src/lib/hooks/route/verdict/index.test.mts`: hook round-trip test
- `src/lib/shared/work/snapshot.mts`: read only, `artifact.body`
- `src/lib/shared/work/stall.mts`: read only, block counting untouched
- `test/support/context.mts`: read only, `hookContext` `now` override
- `src/lib/shared/work/markers.mts`: read only, `setMarker` for fixtures
- `src/lib/shared/work/replies.mts`: read only, `appendReply` for fixtures

**Changes:**
- `amendment.mts` exports `recordDigest(body: string): string` (sha256 hex of the UTF-8 body, all 64 characters) and `isUnchangedAmendment(prior: readonly VerdictRow[], record: string | undefined): boolean` with the rule of D-002.
- `VerdictRow` (`verdict-log.mts:4`) gains `record?: string`. `PlannedVerdict` (`plan.mts:28`) gains `record?: string`; `RouteInput` does not, so the CLI cannot set it.
- `route()` (`route.mts:65-74`) sets `record` on the planned verdict when it carries `amend` or its verdict is `AMENDED` and `snap.artifact` exists; `verdictRow` (`route.mts:37-43`) copies it onto the row.
- The `amended` plan (`plan.mts:96-102`) puts a `note` change `<ARTIFACT_BY_LANE[lane]> unchanged since the amendment was asked` first when `isUnchangedAmendment(snap.verdicts, planned.record)`; its other changes stay as they are.
- `answeredAmendment` (`next-step.mts`), choice `amend`: the first `AMENDED` after the answer that is not unchanged (judged against all rows before it) counts as in phase 1. When none counts and an unchanged one exists, return the gate with the detail of D-003 and the same options. `planAmendStep` reads the answer only when it is newer than the review row, so a reply newer than the unchanged `AMENDED` decides again with no further change.
- `amendedDrift`, `recheckStep`, `pendingAmend` and `stall.mts` stay as they are (D-003).

**Done when:**
- **T-2.1** `amendment.test.mts`: `recordDigest` gives the same 64-character hex for equal bodies and a different one when one character changes; `isUnchangedAmendment` is true only when the newest prior row carrying `amend` has an equal `record`, and false with no such row, with a prior row lacking `record`, with an undefined `record`, and when an older amend row matches but the newest does not.
- **T-2.2** `plan.test.mts`: `AMENDED` on an open item whose newest amend row's `record` equals the planned `record` gives exactly `[{ kind: "note", line: "order.md unchanged since the amendment was asked" }]`; the existing `AMENDED` tests pass with their assertions unchanged.
- **T-2.3** `next-step.test.mts`: after reply `a` on a plan-only and on a mixed cumulative row, an `AMENDED` with the same `record` as the review row gives `approve_amendment` with detail `the architect returned AMENDED but design.md is unchanged: <amend>; review: work/20261023-probe/reviews/cumulative.md`; a reply `a` newer than it gives `amend` with `reword: true`, and a reply `f` gives `fix_findings`.
- **T-2.4** `next-step.test.mts`: after reply `a`, an `AMENDED` with a different `record` gives `review_cumulative` for the plan-only row and `fix_findings` for the mixed row; the phase 1 tests and `(T-2.4)` (rows without `record`) pass unchanged; a crosscheck drift row and an `AMENDED` with equal `record` on a blocked design item still give `review_crosscheck`.
- **T-2.5** Round trip in `src/lib/hooks/route/verdict/index.test.mts`, writer output fed to the reader with a fixed `now` per call: a two-phase order item with both phases marked done and approved; a mixed cumulative review routed through the hook stores a `record` equal to `recordDigest` of the order body; with a reply `a` appended after it, an architect `AMENDED` routed through the hook with `order.md` untouched carries the same `record`, its output contains `order.md unchanged since the amendment was asked` and `Next: approve_amendment by user`; after a newer reply `a` and an edit to `order.md`, a second `AMENDED` gives `Next: fix_findings by developer`.
- **T-2.6** Drive after `npm run build`: the scratch item of T-1.5 with the first 6 verdict rows; pipe a SubagentStop payload whose `last_assistant_message` is a mixed cumulative review block (one finding on `work/<id>/design.md`, one on `src/a.mts`, an `AMENDMENT NEEDED: T-2.4` line) into `node dist/hooks/route.verdict.mjs` with `CLAUDE_PROJECT_DIR` and `cwd` set to the scratch; append a reply row `{"action":"approve_amendment","phase":null,"reply":"a","choice":"amend"}` with a newer `ts` to the scratch `replies.jsonl` (`picket reply` is lead-only); run `picket route <id> --verdict AMENDED --agent architect`, then `picket next <id>`. Before-image, captured by the architect on base `0bd9df7` for the hook step: `Next: amend by architect` and a row with no `record`. After: the row has `record`, and `picket next` prints `"action":"approve_amendment"` with `returned AMENDED but design.md is unchanged`.
- **T-2.7** `npm test` passes.

## Open questions
none

## Revision log
