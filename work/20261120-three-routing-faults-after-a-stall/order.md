---
kind: order
lane: order
title: Three routing faults after a stall
date: 2026-11-20
audience: developer
sources: work/20261120-three-routing-faults-after-a-stall/request.md, work/20261119-database-guards-and-confirmed-sql-runs/verdicts.jsonl, work/20261119-database-guards-and-confirmed-sql-runs/replies.jsonl, the lpon-developer-2 subagent transcript of 2026-11-19 (agent-alpon-developer-2-fcbda1658ccb6878), src/lib/hooks/route/verdict/index.mts, src/lib/shared/route/plan.mts, src/lib/shared/route/route.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/replies.mts, src/lib/shared/work/send.mts, src/lib/verbs/reply/index.mts
phases:
  - n: 1
    files: [src/lib/shared/work/replies.mts, src/lib/shared/work/replies.test.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, test/support/stall-replay.mts]
    greps:
      - path: src/lib/shared/work/replies.mts
        pattern: 'export function rowsSinceLastReply\b'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'rowsSinceLastReply\('
      - path: test/support/stall-replay.mts
        pattern: '2026-11-19T18:58:10\.853Z'
    tests: true
    drive: true
  - n: 2
    files: [src/lib/shared/work/replies.mts, src/lib/verbs/reply/index.mts, src/lib/shared/work/next-step.mts, src/lib/verbs/reply/index.test.mts, src/lib/shared/work/next-step.test.mts]
    greps:
      - path: src/lib/shared/work/replies.mts
        pattern: '"redesign"'
      - path: src/lib/verbs/reply/index.mts
        pattern: 'messageTo\(snap, "architect"'
        absent: true
    tests: true
    drive: true
  - n: 3
    files: [src/lib/shared/route/plan.mts, src/lib/shared/route/plan.test.mts, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/route/plan.mts
        pattern: 'done after its stall'
    tests: true
    drive: true
---
# Order: Three routing faults after a stall

## Problem
Around the phase 2 stall of work/20261119-database-guards-and-confirmed-sql-runs, the kernel's state fell behind what the agents and the user did three times, and the lead had to route a verdict by hand or got a stale gate. Each fault was replayed on the current build (scratch copies of the item with the first N rows of its logs): the verdict hook answers "is already recorded" for the second developer's stall, `picket next` answers `implement_phase` after a redesign reply, and `picket next` answers `resolve_block` after the PHASE DONE that followed a stall. The fixes stay inside the verdict hook, the route plan, `picket reply` and `picket next`, with no new verdict token or gate option.

## Decisions

### D-001: The hook's repeat check reads only verdict rows newer than the newest reply
**Decision:** The request names the numbered instance name as the first suspect; it is not the cause. `bareAgentName("lpon-developer-2")` already returns `developer`, the block's heading sets the agent anyway, and the same payload replayed with `agent_type: "picket:developer"` gives the same answer. The transcript shows the hook's reply at 2026-11-19T18:59:58.179Z: "PHASE STALLED for 20261119-database-guards-and-confirmed-sql-runs phase 2 is already recorded". `repeatsPhaseVerdict` compared the new stall with the last row, the first developer's stall at 18:32:42, and the user's `c` reply at 18:58:10 sits in replies.jsonl where the check never looks. So `routeTurn` passes `repeatsPhaseVerdict` and `repeatsLastRow` only the rows newer than the newest reply row, through a new `rowsSinceLastReply(rows, replies)` in `src/lib/shared/work/replies.mts`; a user answer always ends a repeat. `repeatsPhaseVerdict` keeps its signature. This gives up nothing the dedupe was for: a re-emitted block with no reply between still lands once.
**Instead of:** Telling the two developers apart by instance or session: a verdict row stores neither the instance name, and both developers ran in the lead's one session, so no row field separates them.
**Risks:**
- **RISK-001** An agent that re-emits an old verdict right after a reply records a second, identical row. Mitigation: the row's effect is the same as the first (a stall blocks, a PHASE DONE marks the same marker), and `repeatsSavedBlock` still drops an identical PHASE DONE block.

### D-002: A redesign is recorded on its reply row, and `picket next` serves the amendment until AMENDED
**Decision:** `redesign` in `picket reply` reopens a design item and today builds its own architect send, but nothing `nextStep` reads says an amendment is pending, so `next` falls through to `implement_phase`. The reply row now carries `choice: "redesign"` and `amend: <the old blocked reason>` (`ReplyChoice` and `ReplyRow` in `src/lib/shared/work/replies.mts` gain them). `amendStep` in `next-step.mts` returns `{ action: "amend", actor: "architect", detail: <amend> }` when the newest redesign reply has no AMENDED verdict row after it, after the existing pending-amend check. `redesign` returns no send of its own, so the reply prints `next.send`, and the two cannot disagree. An order item's `d` still abandons and writes no `choice`.
**Instead of:** Keeping the item blocked with the reason until AMENDED: the AMENDED plan keeps a blocked item blocked while its newest block row is a PHASE STALLED ("the developer's stall waits for the user"), so the item would never reopen.
**Risks:**
- **RISK-002** Reply rows written before this change (the item's own `d` at 19:02:56) have no `choice`, so they are not read as pending. Mitigation: only closed items hold such rows; the replay test writes the reply through the verb.

### D-003: A PHASE DONE on the stalled phase reopens the item
**Decision:** The `phase_done` plan in `src/lib/shared/route/plan.mts` adds a state change `{ set: { status: "open" }, unset: ["blocked_reason"], line: "status=open (phase <n> done after its stall)" }` right after the done marker, when the item is blocked and `newestBlockRow(snap.verdicts)` is a PHASE STALLED row for the same phase. The run grant changes follow as today. On 2026-11-20 the developer continued from the hook's context after its 06:59 stall and finished at 07:05; the run grant approved and committed phase 2, but nothing cleared `blocked`.
**Instead of:** Reopening on any PHASE DONE while blocked: a block whose newest row is a DRIFT DETECTED waits for an amendment, which a PHASE DONE does not answer.
**Risks:**
- **RISK-003** The user never sees a gate for a stall the developer resolved itself. Mitigation: the stall row stays in verdicts.jsonl, and the phase still passes its own gate or the run grant the user gave.

### D-004: The replays read the item's rows from a test support module
**Decision:** `test/support/stall-replay.mts` exports the 11 first rows of work/20261119-database-guards-and-confirmed-sql-runs/verdicts.jsonl (through the PHASE DONE at 2026-11-20T07:05:08.855Z) and its first 3 reply rows, copied verbatim with their `ts`, plus `seedReplay(root, id, verdictCount, replyCount)`, which writes the first N of each through `appendVerdict` and `appendReply` with each row's own `ts` as `now`. Each replay test passes the next event's real timestamp as the context's `now`.
**Instead of:** Reading the work item's log files at test time: a unit test reads no file outside its temporary folder, and the tests would break if that work folder moves.

## Scope
**In:**
- The verdict hook's repeat check, the `phase_done` route plan, `picket reply`'s redesign and `picket next`'s amend step
- Unit tests replaying the three sequences from the item's rows
**Out:**
- New verdict tokens or gate options; the session.append mod hook; the design lane's steps; the data guards
- A `d` at `resolve_rejections` (OQ-001)

## Phase 1: Record a stall that follows a gate reply
**Touch set:**
- `src/lib/shared/work/replies.mts`: add `rowsSinceLastReply`
- `src/lib/shared/work/replies.test.mts`: pin the helper's three cases
- `src/lib/hooks/route/verdict/index.mts`: repeat checks read filtered rows
- `src/lib/hooks/route/verdict/index.test.mts`: replay test for fault 1
- `test/support/stall-replay.mts`: new; the item's verbatim rows
- `src/lib/shared/agent-name.mts`: read only; role parsing confirmed
- `test/support/hook.mts`: read only; transcript helpers
**Changes:** `rowsSinceLastReply<R extends { ts: string }>(rows: readonly R[], replies: readonly ReplyRow[]): R[]` returns the rows whose `ts` is later than the newest reply's, or every row when there is no reply. In `routeTurn`, read the snapshot's verdicts and replies once and pass the filtered rows to `repeatsPhaseVerdict`; `repeatsLastRow` reads the same filtered rows. Add the fixture module of D-004.
**Done when:**
- **T-1.1** A test seeds a design item of 5 phases with phase 1 done and approved, the first 7 rows and the first 2 replies of the fixture, and status open, then routes the phase 2 PHASE STALLED block through `routeVerdict` with `agent_type: "<tag>-developer-2"` and `now` 2026-11-19T18:59:58.179Z: verdicts.jsonl holds 8 rows, the 8th is `developer`, `PHASE STALLED`, phase 2, state.yaml says `status: blocked`, and the context contains `Next: resolve_block`.
- **T-1.2** The same replay with `agent_type: "picket:developer"` gives the same 8th row and status.
- **T-1.3** With no reply between them, a second identical stall routed from the same item still answers `is already recorded` and leaves the row count unchanged.
- **T-1.4** `rowsSinceLastReply` returns every row when there are no replies, only the rows later than the newest reply otherwise, and an empty list when the newest reply is later than every row; each case asserts the whole returned array.
- **T-1.5** Before-image: on the base, before the first edit, pipe a SubagentStop payload with the stall block (`agent_type: "lpon-developer-2"`) into `node dist/hooks/route.verdict.mjs` with `CLAUDE_PROJECT_DIR` set to a scratch copy holding the item's record, `phases/1.done`, `phases/1.approved`, its first 7 rows, first 2 replies and `status: open` (markers written with Write, not shell), and save the output, which says `is already recorded`. After `npm run build`, the same drive on a fresh copy says `PHASE STALLED applied` and the copy holds 8 rows.
- **T-1.6** The existing `repeatsPhaseVerdict` test passes unchanged, and `npm test` passes with `TMPDIR=/tmp`.

## Phase 2: Serve the amendment a redesign reply asked for
**Touch set:**
- `src/lib/shared/work/replies.mts`: `"redesign"` choice, `amend` field
- `src/lib/verbs/reply/index.mts`: redesign records, sends nothing itself
- `src/lib/shared/work/next-step.mts`: amendStep reads the redesign reply
- `src/lib/verbs/reply/index.test.mts`: replay test for fault 2
- `src/lib/shared/work/next-step.test.mts`: pin the pending-redesign cases
- `src/lib/shared/work/send.mts`: read only; amendSend and messageTo
- `test/support/stall-replay.mts`: read only; seeds the replay
**Changes:** `ReplyChoice` gains `"redesign"` and `ReplyRow` an optional `amend: string`. In `redesign`, a design item sets status open and returns an effect with `choice: "redesign"`, `amend` set to the reason it computes today, and no send; `applyReply` writes `amend` onto the reply row beside `choice`. An order item's redesign is unchanged. In `next-step.mts`, `amendStep` falls back, when `pendingAmend` finds nothing, to the newest reply row with `choice: "redesign"` that no AMENDED verdict row follows by `ts`, and returns the amend step with that row's `amend` as detail and no `review`.
**Done when:**
- **T-2.1** A test seeds a design item of 5 phases with phase 1 done and approved, the first 8 rows and first 2 replies of the fixture, and `status: blocked` with `blocked_reason: PHASE STALLED on phase 2`, then replies `d` with `now` 2026-11-19T19:02:56.040Z: state.yaml says `status: open`, the new reply row carries `choice: "redesign"` and `amend: "PHASE STALLED on phase 2"`, `readNext` returns action `amend`, actor `architect`, detail `PHASE STALLED on phase 2`, and its `send` deep-equals the reply's `send`.
- **T-2.2** In the same test, routing `AMENDED` from `architect` with `now` 2026-11-19T19:05:23.346Z makes `readNext` return `implement_phase`, phase 2, with one send to `<tag>-developer-2`.
- **T-2.3** `nextStep` on an open design item returns the amend step for a redesign reply with no later AMENDED row, `implement_phase` once an AMENDED row is later than the reply, and `implement_phase` for a `d` reply row with no `choice` (the shape older rows have).
- **T-2.4** The existing reply tests "d at a design stall reopens the item and sends the architect the old blocked reason" and "at a stall, c reopens for developer-2, d abandons an order item, x abandons" pass unchanged, and the order item's reply row has no `choice` key.
- **T-2.5** `src/lib/verbs/reply/index.mts` no longer calls `messageTo` for the architect.
- **T-2.6** Before-image: on the base, before the first edit, `node dist/bin/picket.mjs next 20261119-database-guards-and-confirmed-sql-runs` with `CLAUDE_PROJECT_DIR` on a scratch copy holding the first 8 rows, the first 2 replies plus a third reply row `{"action":"resolve_block","phase":null,"reply":"d","choice":"redesign","amend":"PHASE STALLED on phase 2"}` and `status: open` prints `"action":"implement_phase"`; save it. After `npm run build` the same command prints `"action":"amend"`. The row is written by hand because `picket reply` is lead-only.
- **T-2.7** `npm test` passes with `TMPDIR=/tmp`.

## Phase 3: Reopen an item when the stalled phase is done
**Touch set:**
- `src/lib/shared/route/plan.mts`: phase_done plan reopens after a stall
- `src/lib/shared/route/plan.test.mts`: pin the reopen and its limits
- `src/lib/verbs/route/index.test.mts`: replay test for fault 3
- `src/lib/shared/work/stall.mts`: read only; `newestBlockRow`
- `test/support/stall-replay.mts`: read only; seeds the replay
**Changes:** In `phaseDone`, when `snap.state.status` is `blocked` and `newestBlockRow(snap.verdicts)` is a `PHASE STALLED` row whose `phase` equals the done phase, insert the D-003 state change after the done marker and before the run grant changes.
**Done when:**
- **T-3.1** A test seeds a design item of 5 phases with phase 1 done and approved, the first 10 rows and first 3 replies of the fixture, and state `status: blocked`, `blocked_reason: PHASE STALLED on phase 2`, `run_through: 5`, saves a phase 2 block with a `Commit:` line, and routes `PHASE DONE` from `developer` for phase 2 with `now` 2026-11-20T07:05:08.855Z: state.yaml says `status: open` with no `blocked_reason` and `run_through: 5`, `phases/2.approved` exists, the new row's `through` is 5, and `readNext` returns `implement_phase`, phase 3.
- **T-3.2** The plan for `PHASE DONE` on phase 2 of a blocked item whose newest block row is a phase 2 `PHASE STALLED` equals, as a whole array, the done marker followed by `{ kind: "state", set: { status: "open" }, unset: ["blocked_reason"], line: "status=open (phase 2 done after its stall)" }`.
- **T-3.3** The plan has no state change when the newest block row is a `DRIFT DETECTED`, when the stall row names phase 1 and the PHASE DONE phase 2, and when the item is open; each case asserts the whole array.
- **T-3.4** Before-image: on the base, before the first edit, a scratch copy holding the first 10 rows, the first 3 replies, `status: blocked`, `blocked_reason: PHASE STALLED on phase 2`, `run_through: 5`, `phases/1.done`, `phases/1.approved` and a `phases/2.block.md` with a `Commit:` line (written with Write) gets `node dist/bin/picket.mjs route 20261119-database-guards-and-confirmed-sql-runs --verdict "PHASE DONE" --agent developer --phase 2`; save what `picket next` prints then, `"action":"resolve_block"`. After `npm run build` the same drive on a fresh copy prints `"status":"open"` and `"action":"implement_phase"`.
- **T-3.5** The existing plan tests for PHASE DONE pass unchanged, and `npm test` passes with `TMPDIR=/tmp`.

## Open questions
- **OQ-001** A `d` at `resolve_rejections` (three cumulative rejections) has the same gap: `picket reply` sends the architect, while `rejectionsStep` runs before `amendStep` and `next` repeats `resolve_rejections`. Should this item cover that gate too? Owner: the product owner. Fallback: left as it is; the request names only `resolve_block`.

## Revision log
