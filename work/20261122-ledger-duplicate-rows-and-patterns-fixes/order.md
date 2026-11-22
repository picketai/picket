---
kind: order
lane: order
title: Count each agent turn once
date: 2026-11-22
audience: developer
sources: [work/20261122-ledger-duplicate-rows-and-patterns-fixes/request.md, .picket/state/ledger.jsonl rows 3453 to 3460, developer transcript agent-aohmh-developer-39f7bc58ac087fb6.jsonl lines 162 to 380, reviewer transcript agent-aohmh-cumulative-reviewer-a667aded0b6865ab.jsonl lines 0 to 162, src/lib/hooks/emit/ledger/index.mts, src/lib/shared/transcript/turn.mts, src/lib/shared/ledger.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/patterns/index.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, scripts/docs.mjs]
phases:
  - n: 1
    files: [src/lib/verbs/patterns/index.mts, src/lib/verbs/patterns/index.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs.mts
        pattern: 'packet: \{[^\n]*\n\s*patterns: \{'
      - path: src/lib/cli/registry.mts
        pattern: 'packet: \(\) => import[^\n]*\n\s*patterns: \(\) => import'
      - path: docs/reference/cli.md
        pattern: '## picket packet\b[\s\S]*## picket patterns\b[\s\S]*## picket preflight\b'
      - path: src/lib/verbs/patterns/index.test.mts
        pattern: 'destructive sub-command \(e\.g\. rm'
      - path: src/lib/verbs/patterns/index.test.mts
        pattern: 'sub-command \(e\.g"'
        absent: true
      - path: src/lib/verbs/patterns/index.test.mts
        pattern: '\}\);\}\);'
        absent: true
    tests: true
    drive: true
  - n: 2
    files: [src/lib/shared/transcript/turn.mts, src/lib/shared/ledger.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/hooks/emit/ledger/index.test.mts]
    greps:
      - path: src/lib/shared/ledger.mts
        pattern: '\bturn_id\?: string \| null'
      - path: src/lib/hooks/emit/ledger/index.mts
        pattern: '\bturn_id\b'
      - path: src/lib/shared/transcript/turn.mts
        pattern: '\bisMeta\b'
    tests: true
    drive: true
  - n: 3
    files: [src/lib/shared/ledger.mts, src/lib/shared/ledger.test.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/cost/index.test.mts, src/lib/verbs/patterns/index.mts, src/lib/verbs/patterns/index.test.mts]
    greps:
      - path: src/lib/shared/ledger.mts
        pattern: 'export function agentTurns\b'
      - path: src/lib/verbs/cost/index.mts
        pattern: '\bagentTurns\('
      - path: src/lib/verbs/patterns/index.mts
        pattern: '\bagentTurns\('
    tests: true
    drive: true
---
# Order: Count each agent turn once

## Problem

Every Stop and SubagentStop writes a turn row, and Claude Code runs the hooks of one event in parallel, so `emit.ledger` cannot know that `guard.block` bounces the stop or that `route.verdict`'s `additionalContext` continues the agent. The developer's phase 2 turn of the earlier item gave three rows (a bounce, the re-emitted block, the continuation) and the reviewer's cumulative review two (the block, the continuation), and `picket cost` and `picket patterns` count every row. The rows also measure the turn badly: the span stops at the `Stop hook feedback` entry, so the developer's last two rows cover only 5 to 7 seconds, and the 512 KiB span window is shorter than either turn (796,040 bytes for the developer from its request, 944,237 for the reviewer), so the request is never found. Rows already in the ledger stay as they are.

## Decisions

### D-001: A turn row names its agent turn, and readers keep the last row of each
**Decision:** `emit.ledger` writes `turn_id` on every turn row: the `uuid` of the request entry that started the agent's turn, so every stop of one turn (bounced, re-emitted, continued) carries the same id. A shared reader `agentTurns(rows)` in `src/lib/shared/ledger.mts` returns the turn rows with one row per `session` and `turn_id`, the last in ledger order, and every row without a `turn_id` as it is. `picket cost` and `picket patterns` read turns only through it. Because every row of a turn spans from the same request (D-002), the last row holds the most of the turn: the reviewer's second row is the first plus exactly one entry (output 15153 = 13927 + 1226, cache read 1093691 = 1013482 + 80209). What it gives up: a run-grant continuation that does two phases in one turn puts all of its tokens on the last phase in `by_work.by_phase`.
**Instead of:** each row counting only the entries since the previous stop, so readers sum rows: the final assistant entry is not yet in the transcript when the stop hooks run (the developer's first row saw a `<synthetic>` entry as its last, the reviewer's first row lacked its block), so a segment that starts after the previous stop loses every bounced or continued response, where the last of nested spans loses only the final one (OQ-002).
**Risks:**
- **RISK-001** A lead message queued during a bounce arrives as a new request mid-turn, so that turn counts twice. Mitigation: the two spans are disjoint, so tokens and failures are still counted once; only the turn count is one too high.

### D-002: The ledger's turn span starts at the request and reads up to 4 MiB
**Decision:** `turnSpan` and `turnFailures` in `src/lib/shared/transcript/turn.mts`, whose only caller is `emit.ledger`, treat a `user` entry with `isMeta: true` as part of the turn, not its start; the request is the newest `user` entry that is neither a tool result nor `isMeta`. `turnSpan` returns that entry's `uuid` as `request` and reads with the 4 MiB `TURN_BYTES` window that `turnFailures` already uses. All 64 `Stop hook feedback` entries in this project's transcripts are `isMeta`. `currentTurnAssistantEntries` and `readTurn`, which routing and `guard.block` use, stay as they are. What it gives up: the stop hook reads up to 4 MiB of tail when a turn is long.
**Instead of:** `promptId` as the turn key, which every user entry carries: it changes mid-turn at a tool result (4 of the 64 bounces had a different `promptId` from their request) and a new lead message can carry the old one (`agent-ajedk-developer` line 628).
**Risks:**
- **RISK-002** A request more than 4 MiB back gives `request: null`. Mitigation: such a row has `turn_id: null` and counts on its own, as every row does today.

### D-003: Rows written before this item count as written
**Decision:** `agentTurns` collapses only rows that carry a `turn_id`; older rows keep counting one turn each. What it gives up: history stays inflated (459 of the 1593 `subagent_stop` rows in this ledger repeat the previous row of the same session, agent, item and phase with the same verdict and `tool_calls` within 60 seconds).
**Instead of:** collapsing older rows by that match: `tool_calls` is cumulative per transcript, so two text-only turns of one agent would merge, and older bounce rows start at the feedback entry, so keeping the last row would drop the turn's earlier tokens.

### D-004: The reason key does not cut at a full stop after a one-letter segment
**Decision:** `reasonKey` in `src/lib/verbs/patterns/index.mts` ends the clause at `; `, `: ` or a `. ` whose segment before the full stop is not a single letter (A to Z, a to z) standing at the start or after a non-letter. On this ledger's 450 denial rows only the 66-row `guard.bash` group changes, to `command contains a destructive sub-command (e.g. rm, sudo, git <path>`; there are 24 groups before and after.
**Instead of:** a list of abbreviations (`e.g.`, `i.e.`, `etc.`): the request names the one-letter rule, and a list needs upkeep for every new reason text.

## Scope

**In:**
- the reason key cut at `e.g.`, the place of `patterns` in `src/lib/verbs.mts`, `src/lib/cli/registry.mts` and the generated `docs/reference/cli.md`, and the closing line of the patterns test file
- a `turn_id` on new turn rows, the span from the request, and `picket cost` and `picket patterns` counting one row per agent turn

**Out:**
- rewriting rows already in the ledger, or collapsing rows that carry no `turn_id`
- the final response missing from each row (OQ-002), the double usage of split entries (OQ-003), summed cumulative `tool_calls` (OQ-004)
- new report sections, and any change to guards, routing or instructions

## Phase 1: Patterns key and listing cleanup

**Touch set:**
- `src/lib/verbs/patterns/index.mts`: `CLAUSE_END` used by `reasonKey`
- `src/lib/verbs/patterns/index.test.mts`: pinned key, closing line
- `src/lib/verbs.mts`: `VERB_NAMES` order
- `src/lib/cli/registry.mts`: `REGISTRY` order
- `docs/reference/cli.md`: generated from `listCommands`
- `scripts/docs.mjs`: read only, writes `cli.md`

**Changes:** Change the clause split in `reasonKey` as D-004 says. In the test at `src/lib/verbs/patterns/index.test.mts:72` to 77 the expected key becomes `command contains a destructive sub-command (e.g. rm)`; add the two keys below. Move the `patterns` entry to right after `packet` in `VERB_NAMES` and in `REGISTRY` (it now sits before `packet`, and in `REGISTRY` between `list` and `migrate`). Run `npm run docs` so `docs/reference/cli.md` follows; never edit that page by hand. Put the closing `});` of the last test (line 112) on its own line.

**Done when:**
- **T-1.1** `reasonKey("guard.bash", "guard.bash: command contains a destructive sub-command (e.g. rm, sudo, git push/reset). If the user asked for this action, run it alone")` returns `command contains a destructive sub-command (e.g. rm, sudo, git <path>`, pinned by a test.
- **T-1.2** `reasonKey("guard.scope", "guard.scope: the file is missing. Read it first")` still returns `the file is missing`, pinned by a test.
- **T-1.3** The test file pins the key `command contains a destructive sub-command (e.g. rm)` and holds no `sub-command (e.g"`.
- **T-1.4** In `src/lib/verbs.mts` and `src/lib/cli/registry.mts` the `patterns` entry is the line right after the `packet` entry.
- **T-1.5** `docs/reference/cli.md` has `## picket packet`, then `## picket patterns`, then `## picket preflight`, and running `npm run docs` again leaves `git diff -- docs/reference/cli.md` empty.
- **T-1.6** `src/lib/verbs/patterns/index.test.mts` holds no `});});`, and its last line is `});`.
- **T-1.7** `npm test` passes with `TMPDIR=/tmp`.

## Phase 2: Turn rows carry their agent turn

**Touch set:**
- `src/lib/shared/transcript/turn.mts`: `turnSpan`, `turnFailures`, window constants
- `src/lib/shared/transcript/tail.mts`: read only, `TAIL_WINDOWS`
- `src/lib/shared/ledger.mts`: `TurnRow` gains `turn_id`
- `src/lib/hooks/emit/ledger/index.mts`: writes `turn_id`
- `src/lib/hooks/emit/ledger/index.test.mts`: span and id tests
- `test/support/hook.mts`: read only, `writeTranscript`

**Changes:** `TurnSpan` gains `request: string | null`. `turnSpan` walks back over assistant entries, tool results and `isMeta` user entries, stops at the request (D-002), sets `startedAt` and `request` from it, and reads with `TURN_BYTES`; drop `SPAN_BYTES` once nothing uses it. `turnFailures` passes over `isMeta` user entries the same way. `TurnRow` gains an optional `turn_id?: string | null`, written by `emitLedger` from `span.request` on every stop, gate and subagent_stop row. The tests write entries with `uuid` and `isMeta` fields; a bounce is `{ type: "user", isMeta: true, message: { content: "Stop hook feedback:\n..." } }`.

**Done when:**
- **T-2.1** On a transcript holding a request (uuid `r1`), an assistant entry, a `Stop hook feedback` entry with `isMeta: true`, and a second assistant entry, the row has `turn_id` `r1`, usage summing both assistant entries, and `duration_ms` from the request to the second entry.
- **T-2.2** A tool result with `is_error: true` before that feedback entry is counted in the row's `failed_tool_calls` and `failed_tools`.
- **T-2.3** Two stops on one transcript with assistant entries added between them and no new request write the same `turn_id`; a stop after a new user entry that is not `isMeta` writes that entry's uuid.
- **T-2.4** A request more than 524,288 bytes before the transcript's end still gives its uuid as `turn_id` and `duration_ms` from that request.
- **T-2.5** A transcript with no request entry writes `turn_id: null`.
- **T-2.6** `git diff f15edd94 -- src/lib/hooks/route src/lib/hooks/guard` prints nothing, and the bodies of `currentTurnAssistantEntries` and `readTurn` are byte-identical to `f15edd94`.
- **T-2.7** `npm test` passes with `TMPDIR=/tmp`.

## Phase 3: Cost and patterns count each agent turn once

**Touch set:**
- `src/lib/shared/ledger.mts`: `agentTurns` beside `isTurn`
- `src/lib/shared/ledger.test.mts`: `agentTurns` rule tests
- `src/lib/verbs/cost/index.mts`: `summarizeLedger` turn rows
- `src/lib/verbs/cost/index.test.mts`: round trip from `emitLedger`
- `src/lib/verbs/patterns/index.mts`: `groupFailedTools` turn rows
- `src/lib/verbs/patterns/index.test.mts`: round trip from `emitLedger`
- `src/lib/hooks/emit/ledger/index.mts`: read only, the writer

**Changes:** Add `agentTurns(rows: readonly LedgerRow[]): TurnRow[]` as D-001 and D-003 say, returning the kept rows in ledger order. `summarizeLedger` takes its turn rows from `agentTurns(scoped)` instead of `scoped.filter(isTurn)`; everything it derives from them (`rows`, `turns`, `stops`, usage, `by_agent`, `by_work`, `first_reviewable_ms`) follows. `groupFailedTools` reads `agentTurns(rows)`. The round-trip tests write rows with the real `emitLedger` (the patterns test already imports it), never hand-written rows: one transcript grown in three steps (request, a failed Bash call, a block; then a `Stop hook feedback` entry and the re-emitted block; then a continuation reply), with a stop after each step.

**Done when:**
- **T-3.1** `agentTurns` keeps the last of two rows sharing `session` and `turn_id`, keeps a row with the same `turn_id` in another session, and keeps two otherwise identical rows that have no `turn_id`, in ledger order.
- **T-3.2** For the three rows of the round trip, `summarizeLedger` gives `turns` 1, `by_agent.developer.turns` 1 and `tokens_total` equal to `turnTokens` of the last row, and `renderCost` starts `1 turns`.
- **T-3.3** For the same rows, `groupFailedTools` gives one group `developer` `Bash` with `count` 1.
- **T-3.4** Two turn rows without `turn_id` count as 2 turns in `summarizeLedger` and both of their failed calls in `groupFailedTools`.
- **T-3.5** Every test in `src/lib/verbs/cost/index.test.mts` and `src/lib/shared/ledger.test.mts` present at `f15edd94` passes with its assertions unchanged.
- **T-3.6** `npm test` passes with `TMPDIR=/tmp`.

## Open questions

- **OQ-001** Should the readers also collapse rows written before this item, by a match on session, agent, item, phase, verdict and `tool_calls` (459 of 1593 `subagent_stop` rows match within 60 seconds)? Owner: the user. Fallback: D-003, those rows count as written.
- **OQ-002** The final assistant entry is not in the transcript when the stop hooks run (3 of 3 rows checked), so each turn's last row misses its final response. Fix it in a later item? Owner: the lead. Fallback: not in this item.
- **OQ-003** A response split into thinking and text entries repeats one `message.id` and its usage, and `turnSpan` adds both (developer transcript lines 369 and 370), so tokens inside one row are over-counted. Fix it in a later item? Owner: the user. Fallback: not in this item.
- **OQ-004** `summarizeLedger` adds each row's `tool_calls` and `rereads` into `by_agent`, but both are cumulative per transcript. Fix it in a later item? Owner: the user. Fallback: not in this item.

## Revision log
