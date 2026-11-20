---
kind: order
lane: order
title: Tester records defects, fixed ones counted
date: 2026-11-20
audience: developer
sources:
  - work/20261120-tester-records-defects-fixed-ones-counted/request.md
  - work/20261120-known-defects-watched-learning-counted/order.md
  - work/20261120-known-defects-watched-learning-counted/reviews/cumulative.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - artifacts/strategy/drafts/testing-and-test-environment.md
  - src/lib/verbs/test/case.mts
  - src/lib/verbs/test/escape.mts
  - src/lib/verbs/test/skill-examples.test.mts
  - src/lib/shared/testing/results.mts
  - src/lib/shared/testing/cases.mts
  - src/lib/shared/testing/keep-cases.mts
  - src/lib/shared/testing/escapes.mts
  - src/lib/shared/testing/learning.mts
  - src/lib/shared/testing/report.mts
  - src/lib/shared/testing/facts.mts
  - src/lib/shared/scenarios/format.mts
  - src/lib/shared/scenarios/keep.mts
  - src/lib/shared/scenarios/files.mts
  - src/lib/shared/scenarios/defects.mts
  - src/lib/shared/scenarios/known.mts
  - src/lib/shared/route/route.mts
  - src/lib/verbs/close/close.mts
  - src/lib/verbs/close/defects.mts
  - src/lib/verbs/env/replay.mts
  - src/lib/verbs.mts
  - src/lib/cli/registry.mts
  - src/lib/hooks/guard/bash/payloads.mts
  - src/agents/tester.md
  - src/agents/developer.md
  - src/skills/testing/SKILL.md
  - src/skills/testing/steps/results.md
  - src/skills/ordering/SKILL.md
  - src/skills/expediting/SKILL.md
phases:
  - n: 1
    files:
      - src/lib/shared/testing/results.mts
      - src/lib/shared/testing/results.test.mts
      - src/lib/shared/testing/cases.mts
      - src/lib/shared/testing/derive.test.mts
      - src/lib/verbs/test/defect.mts
      - src/lib/verbs/test/defect.test.mts
      - src/lib/verbs/test/skill-examples.test.mts
      - src/lib/verbs.mts
      - src/lib/cli/registry.mts
      - src/lib/verbs/close/defects.mts
      - src/lib/verbs/close/index.test.mts
      - src/lib/shared/scenarios/format.test.mts
      - src/skills/testing/SKILL.md
      - src/skills/testing/steps/results.md
      - src/agents/tester.md
      - docs/reference/cli.md
    greps:
      - path: src/lib/shared/testing/results.mts
        pattern: 'type: "defect"'
      - path: src/lib/verbs.mts
        pattern: '\bdefect: \{ summary:'
      - path: src/lib/cli/registry.mts
        pattern: '"test defect"'
      - path: src/lib/verbs/close/defects.mts
        pattern: 'covers: \[\]'
      - path: src/skills/testing/steps/results.md
        pattern: 'picket test defect <id> --kind'
      - path: src/skills/testing/SKILL.md
        pattern: 'picket test defect'
      - path: src/skills/testing/SKILL.md
        pattern: "goes into a question or the block's sentence"
        absent: true
      - path: src/agents/tester.md
        pattern: 'picket test defect'
      - path: docs/reference/cli.md
        pattern: '^### picket test defect\b'
    tests: true
    drive:
      - covers: T-1.1
        command: node dist/bin/picket.mjs test defect
        exit_code: 1
        contains:
          - 'test defect <id> --kind <kind> --intent'
  - n: 2
    files:
      - src/lib/shared/testing/escapes.mts
      - src/lib/shared/testing/escapes.test.mts
      - src/lib/verbs/test/escape.mts
      - src/lib/verbs/test/record.test.mts
      - src/lib/verbs.mts
      - src/lib/shared/route/route.mts
      - src/lib/verbs/route/index.test.mts
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/defects.mts
      - src/lib/verbs/close/index.test.mts
      - src/agents/developer.md
      - src/skills/expediting/SKILL.md
      - docs/reference/cli.md
    greps:
      - path: src/lib/shared/testing/escapes.mts
        pattern: '\bmissingDefectEscapes\b'
      - path: src/lib/verbs/test/escape.mts
        pattern: 'only a known defect the item fixes on purpose takes an escape point'
      - path: src/lib/shared/route/route.mts
        pattern: '\bmissingDefectEscapes\b'
      - path: src/lib/verbs/close/close.mts
        pattern: '\bmissingDefectEscapes\b'
      - path: src/lib/verbs.mts
        pattern: 'fixed product case or known defect'
      - path: docs/reference/cli.md
        pattern: 'fixed product case or known defect'
      - path: src/agents/developer.md
        pattern: 'picket test escape <id> DF-'
      - path: src/skills/expediting/SKILL.md
        pattern: 'picket test escape <id> DF-'
    tests: true
    drive: true
---
# Order: Tester records defects, fixed ones counted

## Problem
Draft section 3.10 says "A defect outside the item's criteria, or one that the base shows too, does not block the item. It is recorded as a known defect" (`artifacts/strategy/drafts/testing-and-test-environment.md:199`), and section 7 says "Each defect keeps its entry after the fix, with scenario, expected, actual, evidence, root cause and `Escaped:`" (line 261). The cumulative review of 20261120-known-defects-watched-learning-counted left both open (S-1, S-9): `picket test case` refuses a criterion that is not tested (`src/lib/verbs/test/case.mts:25`), so the tester has no recorder, and `fixed()` in `src/lib/verbs/close/defects.mts:69` closes a scenario defect with no `root_cause` or `escaped`, so `escapeCounts` (`src/lib/shared/testing/learning.mts:23`) never counts it. The binding constraints are the brief: no exploratory mode, no new verdict token or route, the setting `testing` untouched; SDR 00004 (Ratified) D-008 keeps the tester a black box and D-011 keeps a defect outside the criteria from blocking.

## Decisions

### D-001: The tester records a defect by running its steps, as a row of its own
**Decision:** Infrastructural decision. `picket test defect <id> --kind <kind> --intent "<the correct answer>" --evidence "<words>"`, the step lines on stdin, runs the steps on the item's stack exactly as `recordCase` does (`openTestItem`, `openItemStack`, `runCase`) and appends a `defect` row to `work/<id>/test/results.jsonl` with its own id (`K-01`, `K-02`). The steps assert the correct answer, so the runner, not the tester, supplies the actual answer: a run that fails is recorded with its `detail`, and a run that passes, is blocked, meets a mock gap, writes data it did not create, or repeats an earlier row's steps is refused and records nothing. The request is the steps, the expected answer is the intent, the actual answer is the run's detail, and the evidence is the tester's text. No criterion is named, nothing counts against the case cap, and `deriveVerdict`, `roundCounts`, `rerun` and `latestCases` read only their own row types, so the row is outside the verdict and the breaker.
**Instead of:** a record-only verb taking expected, actual and evidence as text: draft section 4.4 says "Every finding needs runtime evidence", and a text-only actual answer is the tester's word, not the stack's.
**Risks:**
- **RISK-001** The verb becomes an outlet for exploratory testing. Mitigation: the testing skill says a recorded defect is one met on the way, never a planned case (the brief's out-of-scope line), and the planted-defect benchmark of SDR 00004 D-012 measures every change to the testing skill.

### D-002: At close a recorded defect becomes an open entry and a saved card labelled known
**Decision:** `recordKnownDefects` gains a third source: each `defect` row of the item that no entry names (`found_in` the item and `case` the row id) writes a saved card `S-<next>` with `kind` the row's kind, `covers: []`, `intent` the row's intent, `known: DF-<next>`, `status: active` and the row's steps, and an open entry with `scenario` that card, `expected` the intent, `actual` the detail, `evidence` the row's evidence (plus `through a mock: <names>` when the run used one) and `case` the row id. The card follows draft line 200 ("Its scenario asserts the correct behaviour and carries `known: DF-xxxx`"), so every later replay lists it, classes its failure `known defect` (never blamed) and states why it stopped failing, as the earlier item built. Both files join the kept paths, so `commitClose` commits them and `restoreKept` removes them when the commit fails. The block line is `DF-0004 recorded from K-01 (S-0031)`; it names `recorded`, so the ordering, designing and expediting skills already offer `picket:ticketing --create --bug` for it, which asks the user first.
**Instead of:** an entry with `scenario: none` and no card: nothing would ever replay it, so a later item that fixes it could never be told apart from one that did not, and the entry would stay open for good.
**Risks:**
- **RISK-002** A card with no `covers` reads oddly in the tester's brief (`S-0031 negative : <intent>`, `src/lib/shared/testing/brief.mts:26`). Mitigation: the format accepts an empty list (`covers: []` parses and keeps its fingerprint, probed 2026-11-20); the brief's wording is a follow-up, not a fault.
- **RISK-003** A defect the item itself caused, outside its criteria, becomes a known defect rather than a fix. Mitigation: this is the draft's rule; the user sees it on the closing block with the ticket offer.

### D-003: A known defect fixed on purpose takes its escape point through `picket test escape` with its defect id
**Decision:** `picket test escape <id> DF-0001 --root-cause "<text>" --escaped "<point>"` takes a defect id in place of a case id. For an id of the form `DF-` and four or more digits it opens the item with `readSnapshot` (open or blocked; no tested criteria needed, since an item can fix a known defect without declaring an HTTP check), requires an open entry with that id and a whole-word mention of it in the item's `request.md` or record (`namesDefect`, the same test that classes a pass `fixed by this item`), and appends an `escape` row whose `case` is the defect id. At close, `fixed()` copies `root_cause` and `escaped` from the newest such row onto an entry it closes as `fixed by this item`; `learnFromDefects` then counts it with the others, unchanged. The usage line stays as it is; the summary becomes "record the root cause of a fixed product case or known defect and the check it got past".
**Instead of:** a new verb such as `picket defect escape`: two verbs would write the same row and the escape points would be checked in two places.

### D-004: The last phase and the fast close refuse while a named known defect has no escape point
**Decision:** `missingDefectEscapes(root, snap)` lists the open entries the request or record names that no `escape` row names. The route refuses a developer `PHASE DONE` for the item's last phase (or with no current phase) while it is not empty, beside the existing `refuseUnrecordedEscapes`, with `record where DF-0001 escaped first: picket test escape <id> DF-0001 --root-cause "<text>" --escaped "<point>"`. In the fast lane, where the lead implements and no `PHASE DONE` is routed, `picket close` refuses the same way before it commits. Both are refusals of an existing step, not routes.
**Instead of:** no enforcement, the developer shell's sentence alone: the earlier item enforced the tester's product cases the same way, and a missed escape is exactly the uncounted entry this item closes.
**Risks:**
- **RISK-004** A request that names a defect without fixing it (`DF-0001 stays out of scope`) still asks for an escape point. Mitigation: OQ-002; the earlier item already reads any mention as on purpose.

## Scope
**In:**
- `picket test defect`, its `defect` row and the testing skill's step for it (phase 1)
- an open entry and a `known` card from each recorded defect at close, and the ticket offer the lead skills already make (phase 1)
- `picket test escape` for a known defect, its refusals at the last phase and the fast close, and the count at close (phase 2)

**Out:**
- exploratory testing as a mode; the browser adapter (TF-009)
- new verdict tokens or routes; the setting `testing`
- the tester's brief listing recorded defects, and its wording for a card with no `covers`
- the testing skill for the escape step: the developer records it, so its step goes to the developer shell and the expediting skill (OQ-001)

## Phase 1: The tester records a defect outside the criteria, and close makes it known
**Touch set:**
- `src/lib/shared/testing/results.mts`: `DefectRow`, row type, next id
- `src/lib/shared/testing/results.test.mts`: row round trip, id
- `src/lib/shared/testing/cases.mts`: `defectCard` beside `caseCard`
- `src/lib/shared/testing/derive.mts`: reads only its row types, read only
- `src/lib/shared/testing/derive.test.mts`: verdict ignores defect rows
- `src/lib/shared/testing/report.mts`: `roundCounts`, read only
- `src/lib/shared/catalog/resolve.mts`: `catalogOf`, read only
- `src/lib/shared/scenarios/keep.mts`: `writesUnownedData`, `restoreKept`, read only
- `src/lib/shared/scenarios/files.mts`: `nextScenarioId`, `writeScenarioFile`, read only
- `src/lib/shared/scenarios/defects.mts`: entries, ids, read only
- `src/lib/shared/scenarios/format.test.mts`: empty covers with known
- `src/lib/verbs/test/case.mts`: the verb pattern, read only
- `src/lib/verbs/test/defect.mts`: new verb
- `src/lib/verbs/test/defect.test.mts`: new; record and refusals
- `src/lib/verbs/test/skill-examples.test.mts`: parse the defect example
- `src/lib/verbs.mts`: register `test defect`
- `src/lib/cli/registry.mts`: load `test defect`
- `src/lib/verbs/close/defects.mts`: card and entry per row
- `src/lib/verbs/close/index.test.mts`: close records, commits, once
- `src/skills/testing/SKILL.md`: rule for a defect met
- `src/skills/testing/steps/results.md`: the recording step
- `src/agents/tester.md`: verb list, step 6
- `docs/reference/cli.md`: regenerated by `npm run docs`

**Changes:**
`results.mts`: `DefectRow = Stamped & { type: "defect"; found: string; kind: CaseKind; intent: string; steps: string; evidence: string; detail: string; attempts: number; mocks: string[] }` joins `TestRow` and `ROW_TYPES`; `nextFoundId(rows)` gives `K-01` above the highest `found`, as `nextCaseId` does for cases. `cases.mts` exports `defectCard(kind, intent, steps)`: `caseCard`'s build with `covers: []`.

`test/defect.mts`, usage `test defect <id> --kind <kind> --intent "<the correct answer>" --evidence "<words>", with the step lines on stdin` (the id is checked before stdin is read, so the bare verb prints the usage). It opens the item with `openTestItem`, builds the card, refuses its `scenarioProblems`, then refuses, recording nothing: steps equal to an earlier `defect` row's (`K-01 already records these steps`); `writesUnownedData` with the catalog's `create` entries (`the steps change data they did not create; create it with a PKT- prefix`); a run that passed (`the steps passed: a defect's steps assert the correct answer, so a pass records nothing`); a blocked run (`the steps were blocked: <detail>`); a gap (`the run met a gap in a mock (<gaps>); a gap is never a product defect`). Otherwise it appends the row in the current round and prints `K-01 recorded: <intent>; the stack answered <detail>; it becomes a known defect at close`. `verbs.mts` registers `defect` under `test`, not read-only (the guard lets the tester run any `test` subverb, `TESTER_VERBS` in `src/lib/hooks/guard/bash/payloads.mts:32`); `registry.mts` loads it; `npm run docs` rewrites `cli.md`.

`close/defects.mts`: `foundDefects(root, item, today, rows)` follows D-002 for every `defect` row of every round, after `caseDefects`; each card and entry is a `KeptBefore` with `text: null`, and each line is `DF-0004 recorded from K-01 (S-0031)`. `opened` is the row's date.

`skill-examples.test.mts` adds `defect` to its verbs and patterns and `intent` to the free-text flags, parsing with one step line as stdin. `SKILL.md`'s rule "A defect seen on the way goes into a question or the block's sentence" becomes: a defect seen on the way, outside every tested criterion, is recorded with `picket test defect` (step 5), never turned into a planned case. `steps/results.md` gains a step before the report: when a request on the way answers against the request, an unchanged document or the base, write steps that assert the correct answer and run `picket test defect <id> --kind negative --intent "an order with a negative quantity is refused" --evidence "POST /orders with quantity -1 answered 201; the API description says quantity is at least 1"` with them on stdin in a quoted heredoc; it never blocks the item. `tester.md` names `picket test defect` among the recording verbs and in step 6.

**Done when:**
- **T-1.1** `picket test defect` with no arguments exits 1 with its usage (the declared check).
- **T-1.2** In `defect.test.mts`, steps expecting 400 on a stack answering 201 append a `defect` row `K-01` carrying the kind, intent, steps, evidence, the run's detail and its mocks, and a second record with other steps is `K-02`.
- **T-1.3** The same verb records nothing and refuses, with the texts above, steps the stack passes, steps whose run meets a mock gap, a POST whose body has no `PKT-`, and the steps of `K-01` again.
- **T-1.4** `deriveVerdict` and `roundCounts` give the same verdict, route, reasons and counts line for a passing round with and without a `defect` row, and `nextCaseId` still gives `C-02` after `C-01` and `K-01`.
- **T-1.5** Closing an item holding `K-01` writes an open `DF-0001` (`scenario` `S-0001`, `expected` the intent, `actual` the detail, `evidence`, `case: K-01`, `found_in` the item) and the card `S-0001` with `known: DF-0001`, `covers: []` and the row's steps, commits both, and prints `Known defects: DF-0001 recorded from K-01 (S-0001)`.
- **T-1.6** A second close writes no second entry or card; a close whose commit fails leaves neither file on disk.
- **T-1.7** `parseScenario` reads that card with no problems and a matching fingerprint, and `classify` of its confirmed failure with `DF-0001` gives `known defect`, which `isBlamed` does not list.
- **T-1.8** `skill-examples.test.mts` parses the `picket test defect` example of `steps/results.md` with its `--intent` and `--evidence` whole, and `npm test` passes with `TMPDIR=/tmp`.

## Phase 2: A known defect fixed on purpose keeps its escape point and is counted
**Touch set:**
- `src/lib/shared/testing/escapes.mts`: `missingDefectEscapes`
- `src/lib/shared/testing/escapes.test.mts`: named, fixed, unnamed cases
- `src/lib/shared/scenarios/known.mts`: `namesDefect`, read only
- `src/lib/shared/scenarios/defects.mts`: `readDefects`, read only
- `src/lib/shared/work/snapshot.mts`: `currentPhase`, read only
- `src/lib/verbs/test/escape.mts`: defect id path
- `src/lib/verbs/test/record.test.mts`: defect escape and refusals
- `src/lib/verbs.mts`: escape summary
- `src/lib/shared/route/route.mts`: last-phase refusal
- `src/lib/verbs/route/index.test.mts`: refusal test [INFERRED]
- `src/lib/verbs/close/close.mts`: fast-close refusal
- `src/lib/verbs/close/defects.mts`: escape onto fixed entry
- `src/lib/verbs/close/index.test.mts`: fixed entry, Learned, refusal
- `src/lib/shared/testing/learning.mts`: counts, read only
- `src/agents/developer.md`: line 21, defect escape
- `src/skills/expediting/SKILL.md`: step 5, defect escape
- `docs/reference/cli.md`: regenerated by `npm run docs`

**Changes:**
`escapes.mts` exports `missingDefectEscapes(root, snap): string[]`: the open entries of `readDefects` whose id `namesDefect` finds in `request.md` or `snap.artifact.body` (the two texts `src/lib/verbs/env/replay.mts:150` reads) and that `newestEscape` finds no row for, sorted by id.

`escape.mts`: a case argument matching `DF-` and four or more digits takes D-003's path, refusing `DF-0009 is no open known defect` and `<id> does not name DF-0001; only a known defect the item fixes on purpose takes an escape point`, and a done or abandoned item with `openTestItem`'s wording; a `C-` id keeps today's path. `verbs.mts` changes only the summary; `npm run docs` rewrites `cli.md`.

`route.mts`: `refuseUnrecordedEscapes` also refuses a developer `PHASE DONE` whose phase (`input.phase`, else `currentPhase`) is the last phase or none, while `missingDefectEscapes` is not empty, with the D-004 text naming the first id. `close.mts`: a fast item not yet done is refused the same way, after `refuseUnreplayedFastClose`.

`close/defects.mts`: `scenarioDefects` receives the test rows; `fixed()` adds `root_cause` and `escaped` from `newestEscape(rows, entry.id)` when the class is `fixed by this item` and a row exists, and adds neither for `fixed outside this item`.

`developer.md` line 21 gains: when the request or the record names a known defect (`DF-0001`) that the item fixes, record where it escaped with `picket test escape <id> DF-0001 --root-cause "<text>" --escaped "<point>"` before the last phase's `PHASE DONE`. `expediting/SKILL.md` step 5 gains the same sentence with "before you print the block".

**Done when:**
- **T-2.1** In `record.test.mts`, `test escape <id> DF-0001` on an order item with no HTTP check, whose request says `fixes DF-0001` and whose `DF-0001` is open, appends an `escape` row with `case: DF-0001`; `DF-0009` (no entry), `DF-0002` (open, not named) and a fixed `DF-0003` are refused with the texts above.
- **T-2.2** `missingDefectEscapes` returns `["DF-0001"]` for an open named entry, leaves out a fixed named entry and an open unnamed one, and returns `[]` once an `escape` row names `DF-0001`.
- **T-2.3** A developer `PHASE DONE` for phase 2 of a two-phase item whose request names open `DF-0001` is refused with `record where DF-0001 escaped first: picket test escape <id> DF-0001 --root-cause "<text>" --escaped "<point>"`; `PHASE DONE` for phase 1 routes, and phase 2 routes once the row exists.
- **T-2.4** `picket close` of a fast item whose request names open `DF-0001` with no escape row is refused with that text and writes nothing; with the row it closes.
- **T-2.5** Closing an item whose run classed `S-0002` `fixed by this item` and that holds an escape row for `DF-0001` writes `root_cause` and `escaped` on the fixed `DF-0001`; a `fixed outside this item` row with an escape row present writes neither.
- **T-2.6** When another item's fixed entry escaped `unit test` too, that close prints `Learned: unit test in 2 items (DF-0001, DF-0002) to .claude/agent-memory/picket-developer/escaped-defects.md` and the memory file lists `DF-0001` with its root cause.
- **T-2.7** The existing `C-` escape tests and the tester fix-round refusal tests pass unchanged, and `npm test` passes with `TMPDIR=/tmp`.

## Open questions
- **OQ-001** The brief puts "the testing skill's steps for both" in scope, but the tester records no escape point; the developer does (request item 2). Owner: product owner. Fallback: the escape step goes to `developer.md` and `expediting/SKILL.md`; the testing skill gains only the recording step.
- **OQ-002** Should a known defect the request names only to leave it out (`DF-0001 stays out of scope`) be exempt from D-004's refusal? Owner: product owner. Fallback: any whole-word mention counts, as `namesDefect` already reads it for `fixed by this item`.
- **OQ-003** Should `picket test defect` have a cap per round, as cases do? Owner: product owner. Fallback: no cap; the skill's rule and the benchmark (RISK-001) hold it.

## Revision log
