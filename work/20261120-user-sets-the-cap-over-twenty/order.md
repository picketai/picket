---
kind: order
lane: order
title: User sets the cap over twenty
date: 2026-11-20
audience: developer
sources: work/20261120-user-sets-the-cap-over-twenty/request.md, artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, src/lib/shared/testing/derive.mts, src/lib/shared/testing/brief.mts, src/lib/shared/testing/facts.mts, src/lib/verbs/test/case.mts, src/lib/shared/work/test-stage.mts, src/lib/shared/work/next-step.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/replies.mts, src/lib/verbs/reply/index.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/packet/packet.mjs, src/skills/testing/steps/matrix.md
phases:
  - n: 1
    files: [src/lib/shared/testing/derive.mts, src/lib/shared/testing/derive.test.mts, src/lib/shared/testing/brief.mts, src/lib/shared/testing/brief.test.mts, src/lib/verbs/test/case.mts, src/lib/verbs/test/case.test.mts, src/lib/shared/work/replies.mts, src/lib/shared/work/action-text.mts, src/lib/shared/work/next-step.test.mts]
    greps:
      - path: src/lib/shared/testing/derive.mts
        pattern: 'export function roundCap\b'
      - path: src/lib/shared/testing/derive.mts
        pattern: 'CASE_CAP_ASK_ABOVE\s*=\s*20\b'
      - path: src/lib/shared/testing/brief.mts
        pattern: 'roundCap\('
      - path: src/lib/shared/testing/brief.mts
        pattern: '\bcaseCap\('
        absent: true
      - path: src/lib/verbs/test/case.mts
        pattern: 'roundCap\('
      - path: src/lib/verbs/test/case.mts
        pattern: '\bcaseCap\('
        absent: true
      - path: src/lib/shared/work/replies.mts
        pattern: 'default_cases\?: number'
      - path: src/lib/shared/work/action-text.mts
        pattern: '"set_case_cap"'
    tests: true
    drive: true
  - n: 2
    files: [src/lib/shared/work/next-step.mts, src/lib/shared/work/test-stage.mts, src/lib/shared/work/test-stage.test.mts, src/lib/verbs/reply/table.mts, src/lib/verbs/reply/index.mts, src/lib/verbs/reply/index.test.mts, src/lib/verbs/packet/packet.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: src/lib/shared/work/next-step.mts
        pattern: '"set_case_cap"'
      - path: src/lib/shared/work/test-stage.mts
        pattern: 'roundCap\('
      - path: src/lib/shared/work/test-stage.mts
        pattern: '"set_case_cap"'
      - path: src/lib/verbs/reply/table.mts
        pattern: '"set_case_cap"'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '"set_case_cap"'
    tests: true
    drive: true
---
# Order: User sets the cap over twenty

## Problem
`caseCap` in `src/lib/shared/testing/derive.mts:29` returns six (`CASE_KINDS.length`) times the tested criteria, the brief prints it as `cases per round: at most <n>` (`src/lib/shared/testing/brief.mts:48`), and `picket test case` refuses past it (`src/lib/verbs/test/case.mts:48`). Nothing asks the user, so four tested criteria give 6 × 4 = 24 cases with nobody asked. The request keeps six per criterion and keeps everything as it is at 20 or under (6 × 3 = 18 is the largest multiple of six at or under 20). Over 20, the test stage stops at the user before the tester starts, shows the total and its make-up, and the number the user gives is the one the brief prints and `picket test case` enforces. SDR 00004 D-008 asks for "a cap by item size" and binds nothing finer; `state.yaml` takes only its 12 fields, so the answer cannot live there.

## Decisions

### D-001: One function gives the round's cap, read by the brief and by test case
**Decision:** `derive.mts` gains `CASE_CAP_ASK_ABOVE = 20` and `roundCap(criteria, replies): CaseCap`, with `CaseCap = { cases: number; byDefault: number; source: "default" | "user" | "held" }`. `byDefault` is `caseCap(criteria)` (six each, unchanged). At or under 20 the cap is `byDefault` with source `default`. Over 20, the newest `set_case_cap` reply whose `default_cases` equals `byDefault` gives `cases` with source `user`; with no such reply the cap is 20 with source `held`, so a round never allows more than 20 cases without the user's number (fail closed). `compileBrief` and `recordCase` both call `roundCap` with `snap.replies`; neither calls `caseCap` directly any more. The brief line keeps its prefix: `cases per round: at most 6` stays byte for byte at 20 or under; over 20 it reads `cases per round: at most 12 (set by the user; six for each of 4 tested criteria gives 24)` or `cases per round: at most 20 (not set by the user yet; six for each of 4 tested criteria gives 24)`. The refusal text of `picket test case` is unchanged apart from the number. This gives up a per-criterion split of a user's total: the total is one number for the round, as the request asks.
**Instead of:** The default (24) while unanswered: it is the exact case the request removes, a round over 20 that nobody was asked about.
**Risks:**
- **RISK-001** Between phase 1 and phase 2 an item over 20 is held at 20 with no way to raise it. Mitigation: phase 2 adds the gate; `testing` ships as `design` (SDR 00004 D-012), so few items reach the stage meanwhile.

### D-002: The user's total is a reply row, held while its make-up holds
**Decision:** `ReplyRow` in `src/lib/shared/work/replies.mts` gains `cases?: number` (the user's total) and `default_cases?: number` (the six-each total the user was shown), written on a row with `action: "set_case_cap"`. `"set_case_cap"` is appended to `NEXT_ACTIONS` with `ACTION_TEXT` lines "you set the cases per round" and "waits for the cases per round". One answer covers every later round of the item: a fix retest has the same criteria, and asking again right after a `resolve_tests` answer would put two stops in a row. An amendment that changes the number of tested criteria changes `byDefault`, so the old answer no longer matches and the user is asked again.
**Instead of:** Asking before every round: round 2 often follows the `resolve_tests` gate directly, and CLAUDE.md rule 4 forbids two stops in a row.

### D-003: A `set_case_cap` gate in front of every tester send
**Decision:** In `src/lib/shared/work/test-stage.mts`, `testStep` returns `{ action: "set_case_cap", actor: "user", detail, options }` when `roundCap(testedCriteria(snap.phases), snap.replies).source === "held"`, and the `test_item` step otherwise. Every route to the tester goes through `testStep` (first round, after fixes, after answers, after an amendment), so no tester send can pass an unanswered cap. The action joins the user-gate variant of `NextStep` in `next-step.mts` and `GATE_ACTIONS` in `src/lib/verbs/reply/table.mts`. The detail reads `the round allows 24 cases, six for each of 4 tested criteria; reply with the total for each round, lower or higher`; the one option reads `reply: <total>, 24 keeps six for each criterion`. `picket packet` prints the heading, the wrapped detail, a `total` field (`24: six for each of 4 tested criteria`) and a `criteria` list, one line per criterion with its text and `: 6`, then the option.
**Instead of:** Letting the tester ask through `picket test ask`: the tester would already have started, which the request rules out, and those questions are per criterion and capped at three per item.
**Risks:**
- **RISK-002** The lane skills list their gates by name and name none of the test stage's (`resolve_tests`, `approve_fixes`), so the lead finds this one through CLAUDE.md rule 4 and the `user` actor alone. Mitigation: it behaves as the two existing test gates do; `picket next` prints `set_case_cap · user` with the option.

### D-004: The reply is a bare whole number of one or more
**Decision:** At `set_case_cap`, `matchReply` accepts `/^[1-9]\d*$/` and returns `{ kind: "case_cap", cases }`; `picket reply` records `{ action: "set_case_cap", phase: null, reply, cases, default_cases }`, prints `cases per round set: 12 (six for each of 4 tested criteria gives 24)`, and then sends the tester as `picket next` would. There is no upper bound, and no floor above one: a total below the number of criteria leaves a criterion without a passed case, which ends in `resolve_tests`, where `[n]` accepts it as not verified. Zero, words and gate letters match no option and are refused with the option list, writing no row.
**Instead of:** A floor at the number of tested criteria: the request says "lower or higher" with no floor, and the existing `[n]` path already handles a criterion the user chose not to prove.
**Risks:**
- **RISK-003** A user who sets 3 for 4 criteria gets a `CHANGES REQUIRED` round they could have foreseen. Mitigation: the packet lists the criteria and their count next to the total.

## Scope
**In:**
- `roundCap` and the brief line over 20; `picket test case` enforcing the set total
- the `set_case_cap` gate, its reply form, its reply row and its packet
**Out:**
- a cap on `picket test defect`; the questions limit (`MAX_QUESTIONS`); the six per criterion; the `testing` setting; any benchmark run
- `src/skills/testing/steps/matrix.md` and `src/agents/tester.md`: both already say to spend the cap the brief names

## Phase 1: The round's cap reads the user's total
**Touch set:**
- `src/lib/shared/testing/derive.mts`: `roundCap` and the threshold constant
- `src/lib/shared/testing/derive.test.mts`: the cap rule's cases
- `src/lib/shared/testing/brief.mts`: Limits line from `roundCap`
- `src/lib/shared/testing/brief.test.mts`: brief lines over twenty
- `src/lib/verbs/test/case.mts`: refusal uses `roundCap`
- `src/lib/verbs/test/case.test.mts`: set totals enforced
- `src/lib/shared/work/replies.mts`: `cases` and `default_cases` fields
- `src/lib/shared/work/action-text.mts`: the new action and its text
- `src/lib/shared/work/next-step.test.mts`: action count pin, 19
**Changes:** Add `CASE_CAP_ASK_ABOVE`, `CaseCap` and `roundCap` to `derive.mts` as D-001 says, keeping `caseCap` as the six-each helper. `compileBrief` passes `snap.replies` to the Limits lines and prints the three forms of D-001. `recordCase` passes `roundCap(criteria, snap.replies).cases` to `refuseCap`. Add the two optional fields to `ReplyRow`, append `"set_case_cap"` to `NEXT_ACTIONS` with its two `ACTION_TEXT` lines, and move the pin at `next-step.test.mts:89` to 19 actions ending in `set_case_cap`. Before the first edit, run `node --test src/lib/shared/testing/brief.test.mts src/lib/verbs/test/case.test.mts` on the base and keep its pass list: the tests at `brief.test.mts:61` (asserts `cases per round: at most 6`) and `case.test.mts:98` (the seventh case refused at 6) are the before-image of everything at 20 or under.
**Done when:**
- **T-1.1** A unit test of `roundCap` asserts every field: one criterion gives `{ cases: 6, byDefault: 6, source: "default" }`; three give 18 `default` even with a `set_case_cap` reply `{ cases: 5, default_cases: 18 }` present (no reply counts at 20 or under); four with no reply give `{ cases: 20, byDefault: 24, source: "held" }`; four with a reply `{ cases: 12, default_cases: 24 }` give 12 `user`; four with `{ cases: 30, default_cases: 24 }` give 30 `user`; five with `{ cases: 12, default_cases: 24 }` give 20 `held` with `byDefault` 30.
- **T-1.2** The base tests `brief.test.mts:61` and `case.test.mts:98` pass unchanged, so the line `cases per round: at most 6` and the cap-of-6 refusal text stay byte for byte at 20 or under.
- **T-1.3** A brief test with four tested criteria prints `cases per round: at most 20 (not set by the user yet; six for each of 4 tested criteria gives 24)` with no reply, and `cases per round: at most 12 (set by the user; six for each of 4 tested criteria gives 24)` with the reply `{ action: "set_case_cap", cases: 12, default_cases: 24 }`.
- **T-1.4** With four tested criteria and that reply of 12, `recordCase` refuses the 13th case of a round with `the cap of 12 cases this round is reached; record what is left with picket test note <id> <criterion> <kind> not-covered --why "<why>"` and the test rows hold 12 cases.
- **T-1.5** With four tested criteria and a reply `{ cases: 30, default_cases: 24 }`, `recordCase` records a 25th case of the round with status `done`.
- **T-1.6** `NEXT_ACTIONS` has 19 entries ending in `set_case_cap`, and `ACTION_TEXT.set_case_cap` reads `you set the cases per round` for the user and `waits for the cases per round` for an observer.
- **T-1.7** `npm test` run with `TMPDIR=/tmp` exits 0.

## Phase 2: The stop at the user before the tester
**Touch set:**
- `src/lib/shared/work/next-step.mts`: user-gate variant gains the action
- `src/lib/shared/work/test-stage.mts`: `testStep` returns the cap gate
- `src/lib/shared/work/test-stage.test.mts`: gate before every tester send
- `src/lib/verbs/reply/table.mts`: gate action and number form
- `src/lib/verbs/reply/index.mts`: records the total, sends tester
- `src/lib/verbs/reply/index.test.mts`: reply recorded and refused
- `src/lib/verbs/packet/packet.mjs`: total and make-up lines
- `test/kernel/packet.test.mjs`: packet text pinned
**Changes:** Add `"set_case_cap"` to the user-gate variant of `NextStep`. In `test-stage.mts`, `testStep` returns the gate of D-003 when `roundCap` says `held`. In `table.mts`, add the action to `GATE_ACTIONS`, a `{ kind: "case_cap"; cases: number }` member of `Matched`, and a form list for the action with the number pattern of D-004 and no letter. In `reply/index.mts`, apply it as D-004 says, taking `default_cases` from `roundCap(testedCriteria(snap.phases), snap.replies).byDefault`, and carry `cases` and `default_cases` onto the appended row as `answers` is carried today. In `packet.mjs`, add a `set_case_cap` branch printing the lines of D-003, the criterion text from `criterionText` in `src/lib/shared/scenarios/keep.mts`. The existing `test-stage.test.mts` cases, all on one tested criterion, are the before-image of "nothing asked at 20 or under" and must pass unchanged.
**Done when:**
- **T-2.1** A design item with testing on, four tested criteria and a cumulative `APPROVED` gives `nextStep` deep-equal to `{ action: "set_case_cap", actor: "user", detail: "the round allows 24 cases, six for each of 4 tested criteria; reply with the total for each round, lower or higher", options: ["reply: <total>, 24 keeps six for each criterion"] }`.
- **T-2.2** The same item with three tested criteria gives `test_item` round 1, and every test of `test-stage.test.mts` on the base passes unchanged.
- **T-2.3** With a reply `{ action: "set_case_cap", cases: 12, default_cases: 24 }`, the four-criterion item gives `test_item` round 1; after `tester CHANGES REQUIRED` (route `fix`), `developer PHASE DONE` and `reviewer APPROVED` (cumulative) it gives `test_item` round 2 with no second `set_case_cap`; with a fifth tested criterion added to the artifact it gives `set_case_cap` whose detail names 30 cases and 5 criteria.
- **T-2.4** `picket reply <id> 12` at `set_case_cap` appends a row with `action: "set_case_cap"`, `phase: null`, `reply: "12"`, `cases: 12`, `default_cases: 24`, prints `cases per round set: 12 (six for each of 4 tested criteria gives 24)`, returns one send to `<tag>-tester` (an `Agent` spawn on round 1) with the `first:` line `picket test brief <id> --save`, and the brief compiled after it holds `cases per round: at most 12`.
- **T-2.5** `picket reply <id> 0`, `twelve` and `a` at `set_case_cap` are each refused with `matches no option at set_case_cap; options: reply: <total>, 24 keeps six for each criterion`, and `replies.jsonl` gains no row.
- **T-2.6** `picket packet <id>` at `set_case_cap` prints `▶ set case cap by user · <id>`, a `total` line `24: six for each of 4 tested criteria`, one `criteria` line per tested criterion reading `T-N.x <its text>: 6`, and the option line.
- **T-2.7** `npm test` run with `TMPDIR=/tmp` exits 0.

## Open questions
none

## Revision log
