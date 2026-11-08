---
kind: order
lane: order
title: Share turn check, fix changelog
date: 2026-11-08
audience: developer
sources: work/20261108-share-turn-check-fix-changelog/request.md, src/lib/shared/ledger.mts, src/lib/shared/ledger.test.mts, src/lib/verbs/close/audit.mts, src/lib/verbs/close/audit.test.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/cost/index.test.mts, src/mods/status/hooks/band.ts, CHANGELOG.md, work/20261107-plugin-only-install/design.md (D-003 r3)
phases:
  - n: 1
    files:
      - src/lib/shared/ledger.mts
      - src/lib/shared/ledger.test.mts
      - src/lib/verbs/close/audit.mts
      - src/lib/verbs/cost/index.mts
      - CHANGELOG.md
    greps:
      - path: src/lib/shared/ledger.mts
        pattern: 'export const TURN_EVENTS\b'
      - path: src/lib/shared/ledger.mts
        pattern: 'export function isTurn\('
      - path: src/lib/verbs/close/audit.mts
        pattern: 'import \{[^}]*\bisTurn\b[^}]*\} from "\.\./\.\./shared/ledger\.mts"'
      - path: src/lib/verbs/cost/index.mts
        pattern: 'import \{[^}]*\bisTurn\b[^}]*\} from "\.\./\.\./shared/ledger\.mts"'
      - path: src/lib/verbs/close/audit.mts
        pattern: 'new Set\(\["stop"'
        absent: true
      - path: src/lib/verbs/cost/index.mts
        pattern: 'new Set\(\["stop"'
        absent: true
      - path: src/lib/verbs/close/audit.mts
        pattern: '\bfunction isTurn\b'
        absent: true
      - path: src/lib/verbs/cost/index.mts
        pattern: '\bfunction isTurn\b'
        absent: true
      - path: src/lib/shared/ledger.test.mts
        pattern: '\bisTurn\b'
      - path: CHANGELOG.md
        pattern: 'while picket-markdown is installed'
        absent: true
      - path: CHANGELOG.md
        pattern: 'hidden when `mods\.markdown` is false'
      - path: CHANGELOG.md
        pattern: 'carries it\.\r?\n\r?\n- The picket-status band'
        absent: true
    tests: true
    drive: false
---
# Order: Share turn check, fix changelog

## Problem
The cumulative review of 20261107-plugin-only-install found two minor faults. `src/lib/verbs/close/audit.mts:6` and `src/lib/verbs/cost/index.mts:33` each define the same `TURN_EVENTS` set and `isTurn` guard, so a fourth turn event added to `TurnRow["event"]` in `src/lib/shared/ledger.mts:13` would have to be added in two places. In `CHANGELOG.md`, the unreleased alpha.6 Added list is split by a blank line at line 20, and line 21 says `M↓` works "while picket-markdown is installed", which D-003 (r3) of that item replaced: `M↓` is hidden when `mods.markdown` is false. The behaviour of `picket close` and `picket cost` must not change.

## Decisions
### D-001: The turn check lives in ledger.mts beside turnTokens
**Decision:** Infrastructural decision. `src/lib/shared/ledger.mts` exports `TURN_EVENTS`, typed `ReadonlySet<LedgerRow["event"]>` and holding `"stop"`, `"subagent_stop"` and `"gate"`, and `isTurn(row: LedgerRow): row is TurnRow`, which returns `TURN_EVENTS.has(row.event)`. The module already owns `TurnRow` and `turnTokens`, and both verbs already import from it, so no new import edge appears. The set is typed with `LedgerRow["event"]`, not `TurnRow["event"]`, because `has` is called with any row's event; this is the typing `audit.mts:6` uses today. Both verbs delete their local copies and import `isTurn`. Neither verb reads `TURN_EVENTS` outside the guard, so they import only `isTurn`; the set is still exported because the request names both.
**Instead of:** a new `src/lib/shared/turns.mts` module: it adds a file and an import for two lines that belong with the row type they narrow.
**Risks:**
- **RISK-001** `TURN_EVENTS` drifts from the `TurnRow["event"]` union when an event is added. Mitigation: the new test in `ledger.test.mts` lists every `LedgerRow` event and its expected `isTurn` result, so a new turn event that is left out of the set fails it.

### D-002: The changelog wording follows D-003 (r3)
**Decision:** In the `M↓` sentence at `CHANGELOG.md:21`, the parenthesis reads ``(which opens or closes the Markdown pane, hidden when `mods.markdown` is false in `.picket/config.json`)``, backticks included. This matches the code: `src/mods/status/hooks/band.ts:77` draws `M↓` only when a `picket-markdown` command is listed, and the Markdown mod registers none when `mods.markdown` is false (`src/mods/markdown/hooks/index.test.tsx:207`). The blank line at `CHANGELOG.md:20` is deleted so the Added list is one list. No other changelog line changes.
**Instead of:** dropping the condition and saying only that `M↓` opens or closes the pane: a user who turned the pane off would then look for a control that is not drawn.

## Scope
**In:**
- Export `TURN_EVENTS` and `isTurn` from `src/lib/shared/ledger.mts` and use them in `close/audit.mts` and `cost/index.mts`.
- Fix the stale `M↓` wording and delete the stray blank line in the alpha.6 section of `CHANGELOG.md`.

**Out:**
- The `dist/README.md` install line advisory (third review finding, left by the user's choice).
- Any other change.

## Phase 1: Share the turn check and fix the changelog
**Touch set:**
- `src/lib/shared/ledger.mts`: export TURN_EVENTS and isTurn
- `src/lib/shared/ledger.test.mts`: test isTurn per event
- `src/lib/verbs/close/audit.mts`: drop local copy, import isTurn
- `src/lib/verbs/cost/index.mts`: drop local copy, import isTurn
- `src/lib/verbs/close/audit.test.mts`: existing audit line pins
- `src/lib/verbs/cost/index.test.mts`: existing turn count pins
- `CHANGELOG.md`: alpha.6 wording and blank line

**Changes:**
- `ledger.mts`: add the exported `TURN_EVENTS` constant and `isTurn` guard (D-001), placed after `turnTokens`.
- `audit.mts`: delete the `TURN_EVENTS` constant (line 6) and the `isTurn` function (lines 9 to 11); add `isTurn` to the existing import from `../../shared/ledger.mts`. `LedgerRow` and `TurnRow` stay imported, since other functions use them.
- `cost/index.mts`: delete the `TURN_EVENTS` constant (line 33) and the `isTurn` function (lines 37 to 39); add `isTurn` to the existing import from `../../shared/ledger.mts`.
- `ledger.test.mts`: add one test, for example `isTurn holds for stop, subagent_stop and gate rows and for no other event`, that calls `isTurn` on one row of each of the eight `LedgerRow` events (`stop`, `subagent_stop`, `gate`, `accept`, `block`, `bounce`, `escalation`, `repeat`) and asserts true for the first three and false for the rest.
- `CHANGELOG.md`: D-002.

**Done when:**
- **T-1.1** `src/lib/shared/ledger.mts` exports `TURN_EVENTS` and `isTurn`, and neither `src/lib/verbs/close/audit.mts` nor `src/lib/verbs/cost/index.mts` defines its own `TURN_EVENTS` set or `isTurn` function; both import `isTurn` from `../../shared/ledger.mts` (the phase greps).
- **T-1.2** The new `ledger.test.mts` test passes and asserts `isTurn` true for `stop`, `subagent_stop` and `gate` and false for `accept`, `block`, `bounce`, `escalation` and `repeat`.
- **T-1.3** The `picket close` audit line and the `picket cost` summary are unchanged. Before-image: the three tests in `src/lib/verbs/close/audit.test.mts` and the test `turns count stop, subagent_stop and gate rows only, and escalations are summarized beside them` in `src/lib/verbs/cost/index.test.mts`, all present on the base `a6d2315`. Comparison: those tests pass with their assertions unedited, which `git diff a6d2315 -- src/lib/verbs/close/audit.test.mts src/lib/verbs/cost/index.test.mts` showing no change confirms.
- **T-1.4** `CHANGELOG.md` no longer holds `while picket-markdown is installed`, holds ``hidden when `mods.markdown` is false``, and its alpha.6 Added list has no blank line between the `picket close` bullet and the picket-status band bullet (the phase greps).
- **T-1.5** `git diff a6d2315 -- CHANGELOG.md` shows only those two changes: the deleted blank line and the reworded parenthesis on the `M↓` line.
- **T-1.6** In `npm test`, the typecheck and the `unit`, `build`, `product` and `timing` steps exit 0, including `test/repo/dashes.test.mjs` and `test/repo/names.test.mjs`, which scan `CHANGELOG.md`. The `mods` step (`claude plugin test dist`) fails 25 status pane and band tests on the base `a6d2315` on this machine (Claude Code 2.1.319). This phase touches no mod, so it must leave the same 25 failing and no others.

## Open questions
none

## Revision log
