---
kind: order
lane: order
title: Order-free repeats, no audit wall time
date: 2026-11-09
audience: developer
sources: work/20261109-order-free-repeats-no-audit-wall-time/request.md, work/20261109-consistency-determinism-performance-since-alpha-/research.md (R-016, R-017), src/lib/verbs/close/close.mts, src/lib/verbs/close/audit.mts, src/lib/verbs/close/audit.test.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts, test/cli/close.test.mjs, src/lib/shared/ledger.mts, src/lib/shared/work/state.mts, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, src/skills/researching/SKILL.md, docs/how-to.md, .claude/MEMORY.md
phases:
  - n: 1
    files: [src/lib/verbs/close/close.mts, test/cli/close.test.mjs]
    greps:
      - path: src/lib/verbs/close/close.mts
        pattern: '\breportedAtOtherCloses\b'
        absent: true
      - path: src/lib/verbs/close/close.mts
        pattern: 'event\s*===\s*"repeat"'
        absent: true
      - path: src/lib/verbs/close/close.mts
        pattern: 'readVerdicts\('
    tests: true
    drive: true
  - n: 2
    files: [src/lib/verbs/close/audit.mts, src/lib/verbs/close/audit.test.mts, src/lib/verbs/close/index.test.mts, test/cli/close.test.mjs, src/skills/ordering/SKILL.md, src/skills/designing/SKILL.md, src/skills/researching/SKILL.md, docs/how-to.md]
    greps:
      - path: src/lib/verbs/close/audit.mts
        pattern: '\bwall\b'
        absent: true
      - path: src/lib/verbs/close/audit.test.mts
        pattern: '\bwall\b'
        absent: true
      - path: src/lib/verbs/close/index.test.mts
        pattern: '\bwall\b'
        absent: true
      - path: test/cli/close.test.mjs
        pattern: '\bwall\b'
        absent: true
      - path: src/skills/ordering/SKILL.md
        pattern: '^Audit: <lane> · phases <n> · tokens <agent> <n>, \.\.\. · bounces <n> · blocks <n>\s*$'
      - path: src/skills/designing/SKILL.md
        pattern: '^Audit: <lane> · phases <n> · tokens <agent> <n>, \.\.\. · bounces <n> · blocks <n>\s*$'
      - path: src/skills/researching/SKILL.md
        pattern: 'bounces <n> · blocks <n>`, and the'
      - path: src/skills/researching/SKILL.md
        pattern: '\bwall <duration>'
        absent: true
      - path: docs/how-to.md
        pattern: '\bwall time\b'
        absent: true
    tests: true
    drive: true
---
# Order: Order-free repeats, no audit wall time

## Problem

The user decided R-016 and R-017 of work/20261109-consistency-determinism-performance-since-alpha-/research.md. Today `newRepeats` (`src/lib/verbs/close/close.mts:142`) drops every repeat whose class and item set a `repeat` ledger row from another close already holds, so which item reports a repeat depends on which closes first, and an item whose own reviews never named the class can report it. The audit line's `wallPart` (`src/lib/verbs/close/audit.mts:19`) takes last minus first ledger row of the item, so idle days count as work. Binding: repeats come from the verdict logs only, and the other audit parts, old ledger rows and the ledger schema stay as they are.

## Decisions

### D-001: A close reports the repeated classes its own reviews named
**Decision:** `close` returns every entry of `repeatedClasses(root)` (`close.mts:126`, unchanged) whose `items` include the closing item's id. Since `items` lists exactly the items whose `CHANGES REQUIRED` rows named the class, this is "every class from this item's reviews that appears in two or more reviews across work items", read from the verdict logs only. `reportedAtOtherCloses` and `repeatKey` go; `close` reads the ledger only for the audit line. The count stays what it is: reviews (verdict rows), so two reviews within one item count, which matches the glossary entry "`picket close` reports a class named in two or more reviews" (`.claude/MEMORY.md`, Mistake class). The result is a function of the verdict logs alone: closing A then B and closing B then A give each item the same repeats, and a re-close repeats them.
**Instead of:** every repeated class in the project at every close, without the own-reviews filter: an item whose reviews never named the class would print a follow-up it had no part in, and the request limits the list to this item's reviews.
**Risks:**
- **RISK-001** A class shared by several items prints its `Follow-up:` line at the close of each of them. Mitigation: that is the user's decision on R-016; the line names every item, so the reader sees one class, not several.

### D-002: Close keeps appending repeat rows to the ledger
**Decision:** `recordRepeats` (`close.mts:147`) stays as it is, one `repeat` row per reported repeat with the closing item's `work_id`. Nothing reads these rows after phase 1. The ledger schema and the rows already written are out of scope, and stopping the writes is a change to what the ledger records that R-016's decision did not cover.
**Instead of:** stop writing `repeat` rows: it would leave `RepeatRow` in the schema with no writer, a schema question the brief puts out of scope.
**Risks:**
- **RISK-002** With D-001 every close of a sharing item appends a row, so counting `repeat` rows no longer counts distinct repeats. Mitigation: no code outside `close.mts` reads them (`grep -rn '"repeat"' src` finds only the type in `src/lib/shared/ledger.mts:29` and a fixture in `src/lib/shared/ledger.test.mts:77`); a later reader dedupes by `class` and `items`.

### D-003: The audit line drops wall time with no replacement
**Decision:** `auditLine` returns five parts, `<lane> · phases <n> · tokens ... · bounces <n> · blocks <n>`; `wallPart` and the `minutes` import in `audit.mts` go. `minutes` stays in `src/lib/shared/format.mts`, which `src/lib/verbs/statusline/layout.mts:105` still uses. The three lane skills and `docs/how-to.md:240` describe the five parts.
**Instead of:** an active-time part summed from turn `duration_ms`: the user chose to drop the part, and a new measure needs its own definition and tests.

## Scope

**In:**
- `src/lib/verbs/close/close.mts` repeat selection, with `test/cli/close.test.mjs`
- `src/lib/verbs/close/audit.mts` and its tests, `src/lib/verbs/close/index.test.mts`
- the `Audit:` format in the ordering, designing and researching `SKILL.md` files and `docs/how-to.md:240`

**Out:**
- the tokens, bounces and blocks parts; the `Repeats:` and `Follow-up:` line formats in `block.mts`
- `repeat` rows already in ledgers, `RepeatRow` and the ledger schema
- the other half of R-016 (close reads the whole ledger for the audit line and every verdict log)
- `audit.txt` of items already closed; a re-close rewrites it in the new form

## Phase 1: Repeats from this item's reviews

**Touch set:**
- `src/lib/verbs/close/close.mts`: repeat selection, ledger dedupe removed
- `test/cli/close.test.mjs`: repeat tests rewritten, new cases

**Changes:** In `close.mts`, replace `newRepeats` with a selection that keeps the `repeatedClasses(root)` entries naming the closing id (D-001), and delete `reportedAtOtherCloses` and `repeatKey`. `recordRepeats` and the `Repeat` type stay (D-002). In `test/cli/close.test.mjs`, rewrite the T-9.4 test (line 187) so the within-one case sits on the closing item, and replace the "reported at one close per set of items" test (line 203) with the cases below. Items whose close a test runs are opened in the fast lane, as the existing tests do, so no phase gate refuses the close.

**Done when:**
- **T-1.1** In one project, items A and B each carry one `CHANGES REQUIRED` row naming `Rf2`; closing A then B returns `repeats` equal to `[{ class: "Rf2", items: [A, B] }]` at both closes, and a second project that closes B then A returns the same at both closes.
- **T-1.2** An item with no review rows closes with `repeats: []` while A and B share `Rf2`, and a third item whose one `CHANGES REQUIRED` row names `Rf2` closes with `items: [A, B, third]`.
- **T-1.3** A class named in two `CHANGES REQUIRED` rows of the closing item only is returned with `items` equal to that id alone; a class named in two `CHANGES REQUIRED` rows of another item and only in an `APPROVED` row of the closing item is not returned.
- **T-1.4** When the ledger already holds a `repeat` row from another item's close with the same class and items, close still returns that repeat; a re-close of the same item returns it again.
- **T-1.5** Each returned repeat appends one ledger row with `event: "repeat"`, the closing item's `work_id`, its `class` and its `items`.
- **T-1.6** `close.mts` contains no `reportedAtOtherCloses` and no read of `repeat` ledger rows (the phase 1 greps), and `close --human` still prints `Repeats: Rf2 (` and `Follow-up: Fix the Rf2 mistake class ` lines for a returned repeat.
- **T-1.7** Drive: in a scratch git project under the scratchpad with the T-1.1 setup, `picket close <A> --human --root <scratch>` and then the same for B, run with `CLAUDE_PROJECT_DIR=<scratch>`, both print `Repeats: Rf2 (<A>, <B>)`.
- **T-1.8** `npm test` passes.

## Phase 2: Audit line without wall time

**Touch set:**
- `src/lib/verbs/close/audit.mts`: remove `wallPart` and `minutes`
- `src/lib/verbs/close/audit.test.mts`: expected lines lose wall
- `src/lib/verbs/close/index.test.mts`: `AUDIT` fixtures lose wall
- `test/cli/close.test.mjs`: audit.txt expectation loses wall
- `src/skills/ordering/SKILL.md`: closing block `Audit:` format
- `src/skills/designing/SKILL.md`: closing block `Audit:` format
- `src/skills/researching/SKILL.md`: closing block `Audit:` sentence
- `docs/how-to.md`: Audit line description, line 240

**Changes:** Drop the last part of `auditLine` and its helper and import (D-003). Update the expected strings in `audit.test.mts` (lines 21 to 41, including test names that say "wall"), the `AUDIT` constant and the T-2.4 fixture in `index.test.mts` (lines 14 and 104), and the audit.txt match in `test/cli/close.test.mjs:102`. In the ordering and designing `SKILL.md` code blocks and the researching sentence, end the `Audit:` format at `blocks <n>`. In `docs/how-to.md:240`, the parenthesis reads `(lane, phases, tokens per agent, bounces and blocks)`.

**Done when:**
- **T-2.1** `auditLine` on the fixture rows of `audit.test.mts` returns exactly `design · phases 2 · tokens developer <compactTokens(3500)>, reviewer <compactTokens(500)> · bounces 1 · blocks 1`, and on no rows returns `design · phases 0 · tokens none · bounces 0 · blocks 0`.
- **T-2.2** `audit.mts`, `audit.test.mts`, `index.test.mts` and `test/cli/close.test.mjs` contain no word `wall` (the phase 2 absent greps).
- **T-2.3** `picket close` on a fresh fast item writes `work/<id>/audit.txt` equal to `fast · phases 0 · tokens none · bounces 0 · blocks 0` and a newline, and `--human` prints it as line 3 after `Audit: `.
- **T-2.4** The `Audit:` format line in the ordering and designing `SKILL.md` files reads `Audit: <lane> · phases <n> · tokens <agent> <n>, ... · bounces <n> · blocks <n>`, the researching sentence ends that format the same way, and none of the three contains `wall <duration>`.
- **T-2.5** `docs/how-to.md` no longer contains `wall time`.
- **T-2.6** Drive: in a scratch git project under the scratchpad, `picket open` a fast item and `picket close <id> --human --root <scratch>` with `CLAUDE_PROJECT_DIR=<scratch>`; line 3 is `Audit: fast · phases 0 · tokens none · bounces 0 · blocks 0`.
- **T-2.7** `npm test` passes.

## Open questions

- **OQ-001** `docs/how-to.md:240` is not in the brief's in-scope list, but its `Audit:` description names wall time. Owner: the user. Fallback: phase 2 edits that one parenthesis, so the guide matches the line.

## Revision log
