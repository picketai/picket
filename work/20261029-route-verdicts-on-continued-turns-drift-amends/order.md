---
kind: order
lane: order
title: Route verdicts on continued turns, drift amends
date: 2026-10-30
audience: developer
sources: [request.md, preflight.txt, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/output.mts, src/lib/shared/route/route.mts, src/lib/shared/route/plan.mts, src/lib/shared/verdicts.mjs, src/lib/shared/work/next-step.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/work/reviews.mts, src/lib/shared/work/send.mts, src/lib/shared/transcript/turn.mts, src/lib/verbs/route/index.mts, src/lib/verbs/route/index.test.mts, dist/agents/reviewer.md, dist/skills/designing/SKILL.md]
phases:
  - n: 1
    files: [src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts]
    greps:
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'readVerdicts'
      - path: src/lib/hooks/route/verdict/index.test.mts
        pattern: 'a continued turn routes a new phase.s PHASE DONE'
      - path: src/lib/hooks/route/verdict/index.test.mts
        pattern: 'a continued turn that repeats the last row routes nothing'
      - path: src/lib/hooks/route/verdict/index.test.mts
        pattern: 'a continued turn returns no context for a pull request review or a routing error'
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'if \(event\.stop_hook_active\) return null;'
    tests: true
    drive: true
  - n: 2
    files: [src/lib/hooks/route/verdict/index.mts, src/lib/hooks/route/verdict/index.test.mts, src/lib/shared/route/route.mts, src/lib/verbs/route/index.test.mts]
    greps:
      - path: src/lib/shared/route/route.mts
        pattern: 'reviewRel'
      - path: src/lib/hooks/route/verdict/index.mts
        pattern: 'Decisions:'
      - path: src/lib/verbs/route/index.test.mts
        pattern: 'a cross-check drift with no amendment line still goes to the architect'
      - path: src/lib/hooks/route/verdict/index.test.mts
        pattern: 'a cross-check drift with only a Decisions: DRIFT line amends with that line'
    tests: true
    drive: true
---
# Order: Route verdicts on continued turns, drift amends

## Problem

Two kernel routing gaps stalled 20261029-documenting-and-consulting-skills-picket-name. First, `routeVerdict` (`src/lib/hooks/route/verdict/index.mts:99`) returns null whenever `stop_hook_active` is true. Under a run grant the hook's own context continues the developer into the next phase, so that phase's `PHASE DONE` arrives on a continued turn and is dropped. Second, a cross-check `DRIFT DETECTED` with no `AMENDMENT NEEDED:` line leaves the verdict row without `amend`, so `blockStep` (`src/lib/shared/work/next-step.mts:114`) finds no pending amendment and returns `resolve_block` with `[c] continue · [x] abandon`. The binding constraints: a continued turn must never loop the hook, `guard.block` keeps its own `stop_hook_active` check, and the third drift stays a user stall (`isStalled`, `next-step.mts:108`).

## Decisions

### D-001: A continued turn routes unless it repeats the last row
**Decision:** `routeVerdict` stops returning null up front on `stop_hook_active`. On a continued turn only, after the work id and phase are known, the hook reads the item's last verdict row (`readVerdicts` from `src/lib/shared/work/verdict-log.mts`) and routes nothing when that row has the same `verdict` and the same `phase` (a hook phase of `undefined` matches any row phase). A turn that is not continued routes exactly as today, with no repeat check. This makes the run-grant chain route every phase while a block re-emitted after a `guard.block` bounce, which repeats the row the first stop already wrote, routes once.
**Instead of:** a repeat check inside the route core for every caller: it would also swallow a deliberate CLI `picket route` that repeats the last row, which today is recorded.
**Risks:**
- **RISK-001** A continued turn that legitimately repeats the last verdict for the same phase is dropped. Mitigation: no current flow produces two identical rows in a row without another verdict between them (a rejection, `AMENDED` or `PHASE DONE` always lands first), and a turn that is not continued is never deduplicated.

### D-002: A continued turn never answers with a pull request or error context
**Decision:** on a continued turn, a `· pr` review block returns null and writes no state file, and a routing error returns null in place of the `verdict not applied` context. Both paths write no verdict row, so the repeat check of D-001 cannot stop them; returning context there would continue the agent into the same stop again. On a turn that is not continued, both behave as today.
**Instead of:** reporting the error on a continued turn too: each report continues the agent into the same failing route, a loop bounded only by Claude Code.
**Risks:**
- **RISK-002** A routing error on a continued turn is silent. Mitigation: the phase stays undone, so `picket next` keeps naming the same step and the lead sees it at the next send.

### D-003: Every cross-check drift row carries amendment text
**Decision:** the route core (`route` in `src/lib/shared/route/route.mts`) gives a `DRIFT DETECTED` row with scope `crosscheck` an `amend` value whenever it has none: the input `reason` when present, else `AMENDMENT NEEDED: see work/<id>/reviews/crosscheck.md` built with `reviewRel(id, "crosscheck", null)` from `src/lib/shared/work/reviews.mts`. An empty string counts as absent. The verdict hook supplies the best text: the `AMENDMENT NEEDED:` line when the block has one, else, for a reviewer `DRIFT DETECTED` on a cross-check, the block's `Decisions: DRIFT…` line, passed as both `reason` and `amend`. `next-step.mts` is unchanged: `pendingAmend` already sends a row with `amend` to the architect, and `blockStep` already gives the stall options from the third drift on.
**Instead of:** having `nextStep` read `reviews/crosscheck.md` at read time when a drift row lacks `amend`: the snapshot does not load reviews today, and the text would change if a later review rewrote the file.
**Risks:**
- **RISK-003** A drift row written before this change still has no `amend` and still gets `resolve_block`. Mitigation: accepted; the one known item was amended by hand already.
- **RISK-004** A `DRIFT DETECTED` routed with another scope keeps today's behaviour. Mitigation: the reviewer contract (`dist/agents/reviewer.md:72` to 87) emits `DRIFT DETECTED` only from a cross-check; a test pins the scopeless case.

## Scope

**In:**
- `routeVerdict` on continued turns, the repeat check and the two null paths (Phase 1)
- amendment text on cross-check drift rows, in the hook and the route core (Phase 2)

**Out:**
- `guard.block` and its `stop_hook_active` check
- `next-step.mts`, the stall count, `send.mts` and the skills' prose
- repairing drift rows already written

## Phase 1: Route verdicts on continued turns
**Touch set:**
- `src/lib/hooks/route/verdict/index.mts`: drop the up-front null, add the repeat check
- `src/lib/hooks/route/verdict/index.test.mts`: continued-turn tests
- `src/lib/shared/work/verdict-log.mts`: `readVerdicts` source, read only
- `src/lib/hooks/guard/block/index.mts`: stays as it is, read only

**Changes:** `routeVerdict` no longer returns null on `event.stop_hook_active`. `routeTurn` gains the D-001 check after the id is resolved and before `applyVerdict`, using the same phase `applyVerdict` uses (`info?.phase ?? hints.phase ?? undefined`); it runs only when `event.stop_hook_active` is true. The pull request branch and `outcome`'s catch return null on a continued turn (D-002). The existing assertion at `index.test.mts:21` (a bare `{ stop_hook_active: true }` event returns null) keeps passing because that event carries no turn text. Add three tests with these names:
- `a continued turn routes a new phase's PHASE DONE`
- `a continued turn that repeats the last row routes nothing`
- `a continued turn returns no context for a pull request review or a routing error`

**Done when:**
- **T-1.1** A `SubagentStop` with `stop_hook_active: true` whose turn carries a `## Phase 2 of <id>` block ending `PHASE DONE`, on an item whose last row is `PHASE DONE` for phase 1, writes `phases/2.done`, appends one row with phase 2, and returns context matching `/PHASE DONE applied/`.
- **T-1.2** The same event on an item whose last row is already `PHASE DONE` for phase 2 returns null and leaves the row count of `verdicts.jsonl` unchanged.
- **T-1.3** A continued turn carrying a `## Review: pr-<n> · pr` block returns null and writes no `<id>.review.md` state file.
- **T-1.4** A continued turn whose routing throws returns null; the same turn with `stop_hook_active` false still returns context matching `/verdict not applied/`.
- **T-1.5** `git diff -- src/lib/hooks/guard/block/index.mts` is empty.
- **T-1.6** `npm test` passes.
- **T-1.7** Driving the built `dist/hooks/route.verdict.mjs` with a continued-turn `SubagentStop` payload on stdin, against a scratch item and transcript, prints `additionalContext` naming `PHASE DONE applied`.

## Phase 2: Every cross-check drift goes to the architect
**Touch set:**
- `src/lib/shared/route/route.mts`: D-003 fallback on the row's `amend`
- `src/lib/shared/work/reviews.mts`: `reviewRel` source, read only
- `src/lib/hooks/route/verdict/index.mts`: `Decisions: DRIFT` line as amend text
- `src/lib/hooks/route/verdict/index.test.mts`: hook drift tests
- `src/lib/verbs/route/index.test.mts`: route core drift tests
- `src/lib/shared/work/next-step.mts`: unchanged, read only

**Changes:** in `route`, the row's `amend` follows D-003 for a `drift` effect with scope `crosscheck`; every other row keeps today's `amend`. In the hook, the amendment text is the `AMENDMENT NEEDED:` line, else for a reviewer `DRIFT DETECTED` with scope `crosscheck` the line matching `^Decisions:\s*DRIFT\b.*` (multiline), passed as `reason` and `amend`. The test `wrong owner is refused, rejection clears the run grant, drift blocks` (`src/lib/verbs/route/index.test.mts:293`) now expects `amend`, not `resolve_block`, after its cross-check drift; keep its `blocked` status assertion. Add tests named:
- `a cross-check drift with no amendment line still goes to the architect` (route core)
- `a cross-check drift with only a Decisions: DRIFT line amends with that line` (hook)

**Done when:**
- **T-2.1** `route` with `DRIFT DETECTED`, agent `reviewer`, scope `crosscheck`, no `amend` and no `reason` writes a row whose `amend` is `AMENDMENT NEEDED: see work/<id>/reviews/crosscheck.md`, and returns `next` with action `amend`, actor `architect` and that detail.
- **T-2.2** The same call with `reason: "D-002 the port moved"` writes `amend: "D-002 the port moved"`.
- **T-2.3** `route` with `DRIFT DETECTED` and no scope writes a row with no `amend` key and returns `resolve_block`.
- **T-2.4** The hook, given a `## Review: <id> · crosscheck` block holding `Decisions: DRIFT: D-002 the port moved` and no `AMENDMENT NEEDED:` line, writes a row whose `amend` is that line, a `blocked_reason` containing `D-002 the port moved`, and context matching `/Next: amend by architect/`.
- **T-2.5** A cross-check block holding both lines writes the `AMENDMENT NEEDED:` line as `amend`.
- **T-2.6** `npm test` passes, including `a third drift with an amendment pending is a stall the user decides` in `src/lib/shared/work/next-step.test.mts`, unchanged.
- **T-2.7** Driving `dist/bin` `picket route <id> --verdict "DRIFT DETECTED" --agent reviewer --scope crosscheck` on a scratch design item, then `picket next <id>`, prints action `amend` with the review path as detail.

## Open questions

none

## Revision log
