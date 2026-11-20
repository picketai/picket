---
kind: design
lane: design
title: Defect rows rerun, Se4 graded by record
date: 2026-11-20
audience: developer
sources:
  - work/20261120-defect-rows-rerun-se4-graded-by-record/request.md
  - artifacts/strategy/decisions/00005-irreversible-actions-are-confirmed-point.md
  - src/lib/verbs/close/defects.mts
  - src/lib/verbs/close/close.mts
  - src/lib/verbs/close/block.mts
  - src/lib/verbs/close/index.test.mts
  - src/lib/verbs/test/rerun.mts
  - src/lib/verbs/test/defect.mts
  - src/lib/verbs/test/defect.test.mts
  - src/lib/verbs/test/case.test.mts
  - src/lib/shared/testing/results.mts
  - src/lib/shared/testing/cases.mts
  - src/lib/shared/testing/brief.mts
  - src/lib/shared/scenarios/keep.mts
  - src/lib/verbs.mts
  - src/agents/tester.md
  - src/skills/testing/steps/results.md
  - src/skills/testing/steps/matrix.md
  - src/skills/reviewing/SKILL.md
  - src/skills/reviewing/checklists/patterns-security.md
phases:
  - n: 1
    files:
      - src/lib/shared/testing/results.mts
      - src/lib/shared/testing/results.test.mts
      - src/lib/shared/testing/derive.test.mts
      - src/lib/verbs/test/rerun.mts
      - src/lib/verbs/test/case.test.mts
      - src/lib/verbs/test/defect.mts
      - src/lib/verbs/test/defect.test.mts
      - src/lib/verbs/close/index.test.mts
      - src/lib/verbs.mts
      - docs/reference/cli.md
      - src/agents/tester.md
    greps:
      - path: src/lib/shared/testing/results.mts
        pattern: 'type: "defect";[^}]*outcome: CaseOutcome'
      - path: src/lib/shared/testing/results.mts
        pattern: 'export function latestDefects\('
      - path: src/lib/verbs/test/rerun.mts
        pattern: 'defectCard\('
      - path: src/lib/verbs/test/defect.mts
        pattern: 'outcome: "failed"'
      - path: src/lib/verbs.mts
        pattern: 'rerun: \{ summary: "[^"]*defect'
      - path: docs/reference/cli.md
        pattern: '### picket test rerun\r?\n\r?\n[^\r\n]*defect'
      - path: src/agents/tester.md
        pattern: '`picket test rerun <id>` runs[^\n]*recorded defect'
    tests: true
    drive: true
    security: false
  - n: 2
    files:
      - src/lib/verbs/close/defects.mts
      - src/lib/verbs/close/index.test.mts
      - src/lib/verbs/test/defect.mts
      - src/lib/verbs/test/defect.test.mts
      - src/skills/testing/steps/results.md
    greps:
      - path: src/lib/verbs/close/defects.mts
        pattern: 'latestDefects\('
      - path: src/lib/verbs/close/defects.mts
        pattern: 'not recorded: '
      - path: src/lib/verbs/close/defects.mts
        pattern: 'passed in round '
      - path: src/lib/verbs/close/defects.mts
        pattern: '"problems" in built\) return null'
        absent: true
      - path: src/lib/verbs/test/defect.mts
        pattern: 'unless a later rerun passes it'
      - path: src/skills/testing/steps/results.md
        pattern: 'known defect unless its latest rerun passed'
    tests: true
    drive: true
    security: false
  - n: 3
    files:
      - src/skills/reviewing/checklists/patterns-security.md
      - src/lib/verbs/close/block.mts
      - src/lib/verbs/close/index.test.mts
    greps:
      - path: src/skills/reviewing/checklists/patterns-security.md
        pattern: '\| Se4 \| Guard bypass surface \|[^\n]*\| Critical or Major \|'
      - path: src/skills/reviewing/checklists/patterns-security.md
        pattern: '^## Grading Se4\b'
      - path: src/skills/reviewing/checklists/patterns-security.md
        pattern: 'determined-bypass bar'
      - path: src/skills/reviewing/checklists/patterns-security.md
        pattern: 'phase marker, verdict, comment or waiver'
      - path: src/lib/verbs/close/block.mts
        pattern: 'REVERSIBLE_RECORDS'
      - path: src/lib/verbs/close/block.mts
        pattern: 'determined-bypass bar'
    tests: true
    drive: false
    security: true
---
# Design: Defect rows rerun, Se4 graded by record

## Problem

A defect the tester records with `picket test defect` is a `defect` row (`K-01`) in the item's `test/results.jsonl`, and `picket test rerun` reruns only case rows (`src/lib/verbs/test/rerun.mts:35`), so a defect a later fix round fixed still becomes an open known defect at close (`src/lib/verbs/close/defects.mts:156`), and the next item's replay closes it as "fixed outside this item" with no failing run on record. Close also drops a defect row whose card no longer parses without a word (`src/lib/verbs/close/defects.mts:148`), where `keepCandidates` prints a "not kept" line for the same case (`src/lib/shared/scenarios/keep.mts:177`). Separately, SDR 00005 D-001 (ratified) holds only a record whose forgery causes an irreversible action outside the repository to the determined-bypass bar, and its TF-004 asks the Se4 checklist row (`src/skills/reviewing/checklists/patterns-security.md:12`, always Critical today) and the close follow-up line (`src/lib/verbs/close/block.mts:86`) to grade by that. Binding constraints: the user's standing preference for light changes that reuse existing shapes, Picket's one-copy rule, and the reviewer verdict rule where only Critical blocks `APPROVED` (`src/skills/reviewing/SKILL.md:60`).

## Decisions

### D-001: A rerun of a defect rides the defect row
**Decision:** Infrastructural decision. `DefectRow` gains `outcome: CaseOutcome` (`passed | failed | blocked`). `picket test defect` writes `outcome: "failed"` (it refuses every other result already, `src/lib/verbs/test/defect.mts:40`). A rerun appends another `defect` row under the same `K-` id, copying `found`, `kind`, `intent`, `steps` and `evidence` and writing its own `round`, `outcome`, `detail`, `attempts` and `mocks`. A new `latestDefects(rows)` in `results.mts` returns the newest row of each `K-` id in first-seen order, the twin of `latestCases`. Every reader that keys on `found` (`nextFoundId`, `refuseRepeat`) is unchanged.
**Instead of:** a separate `recheck` row type: every reader would join two row types to learn one fact, and `ROW_TYPES` and the brief would grow for it.
**Risks:**
- **RISK-001** A row written before this item has no `outcome`, and a reader testing `=== "failed"` would drop it. Mitigation: D-003 tests "did not pass" and "is not passed or blocked", so a row with no `outcome` reads as the failure it was recorded as, and no reader branches on its absence.

### D-002: The rerun covers every recorded defect of the earlier rounds
**Decision:** Infrastructural decision. `picket test rerun` also takes `latestDefects` of the rows whose `round` is below the current round, builds each card with `defectCard(kind, intent, steps)` (the builder `picket test defect` used), checks it with `scenarioProblems` against the stack's services, and runs it with `runCase`. A card problem, a scenario problem or a run that meets a mock gap writes `outcome: "blocked"` with the problems or the gaps as `detail`; otherwise the row takes the run's outcome. `RerunResult` gains `defects: DefectRow[]`, and the render adds one line per defect, `K-01 negative passed` or `K-01 negative failed: <detail>`, after the case lines.
**Instead of:** only the rows of round N minus 1, as cases do: a round in which the tester skipped the rerun would drop every earlier defect from all later reruns.
**Risks:**
- **RISK-002** A defect found in the last round is never rerun. Mitigation: none needed; its one row failed, and close records it as today.

### D-003: Close decides from the newest run of each defect
**Decision:** Infrastructural decision. `foundDefects` walks `latestDefects(rows)`. A newest row whose `outcome` is `passed` records nothing and prints `K-01 passed in round 2, not recorded`. Any other newest row records the open entry and the known card from the newest row of that id whose `outcome` is neither `passed` nor `blocked` (its `detail`, `mocks` and `evidence`), with `opened` from the id's first row, so a blocked rerun keeps the failing evidence. A card that does not parse records nothing and prints `K-01 not recorded: <problems joined with ", ">`, as `keepCandidates` does for a candidate. The lines join the `Known defects:` line through `KeptFiles.lines`, as now.
**Instead of:** writing a passed row as a fixed `DF-` entry, counted like a fixed product case (`caseDefect`): a defect row lies outside the tested criteria, so nothing asked the item to fix it, and counting it would feed the escape learning a fix no one routed.
**Risks:**
- **RISK-003** A rerun blocked by the environment on a defect the fix round did fix still records a known defect, which the next replay closes as "fixed outside this item". Mitigation: the blocked line in the rerun output tells the tester, who records an environment note; the replay still closes the entry with its range, so it stays visible, not wrong.

### D-004: Se4 is graded by what the bypass reaches
**Decision:** Infrastructural decision. The Se4 row stays one row with one id, its severity cell becomes `Critical or Major`, and a `## Grading Se4` section under it says: Critical when the bypass reaches an action that cannot be undone outside the repository (an authorisation decision in the running product, a SQL run on a real database); Major when it reaches only a record whose forgery is reversible and visible in the history or the diff, a Picket phase marker, verdict, comment or waiver; only the first kind is held to the determined-bypass bar. A Major never blocks `APPROVED`, which is what SDR 00005 means by "no longer treated as blocking". The close follow-up line for a repeated `Se4` gets its own text naming both kinds, with the record names in one constant `REVERSIBLE_RECORDS` in `block.mts`; a test reads the checklist and fails when the joined names are missing from it. Maintenance cost: the record list lives in prose and in code, held together by that test.
**Instead of:** splitting Se4 into a Critical row and a Major row: the repeat counts and SDR 00005 name Se4, so a split would reset its history across nine reviews.
**Risks:**
- **RISK-004** A reviewer grades a product project's own guard (an auth filter) Major by reading "record" too widely. Mitigation: the section gives the running product's authorisation decision as the first Critical example and limits Major to the four named Picket records.

## Scope

**In:**
- `picket test rerun` reruns the recorded defect rows of earlier rounds and records each run on a defect row
- close records a known defect only from a row whose newest run did not pass, and prints a line for a passed one and for one whose card does not parse
- the Se4 checklist row and the close follow-up line for Se4, graded by SDR 00005 D-001

**Out:**
- a cap on `picket test defect`
- the browser adapter (SDR 00004 TF-009) and the sandbox spike (SDR 00005 TF-003)
- any new `guard.bash` spelling
- the setting testing
- the brief's `## Earlier rounds` section, which keeps listing cases only

## Phase 1: Rerun recorded defects
**Touch set:**
- `src/lib/shared/testing/results.mts`: `outcome` on DefectRow, `latestDefects`
- `src/lib/shared/testing/results.test.mts`: fixture gains outcome, latestDefects test
- `src/lib/shared/testing/derive.test.mts`: FOUND fixture gains outcome
- `src/lib/shared/testing/cases.mts`: read only, `defectCard` and `runCase`
- `src/lib/verbs/test/rerun.mts`: rerun defect rows, render lines
- `src/lib/verbs/test/case.test.mts`: rerun tests live here
- `src/lib/verbs/test/defect.mts`: writes `outcome: "failed"`
- `src/lib/verbs/test/defect.test.mts`: recorded row asserts outcome
- `src/lib/verbs/close/index.test.mts`: FOUND_ROW fixture gains outcome
- `src/lib/verbs.mts`: rerun summary names defects
- `docs/reference/cli.md`: regenerated by the build from verbs.mts
- `src/agents/tester.md`: round step 2 names defects
**Changes:** D-001 and D-002. `DefectRow` gains `outcome: CaseOutcome`; `latestDefects(rows: readonly TestRow[]): DefectRow[]` sits beside `latestCases`. `recordDefect` writes `outcome: "failed"`. `rerunCases` keeps its case loop and adds a defect loop over `latestDefects` of the rows below the current round, each run built and checked as D-002 says and appended with `appendTestRow` under the same `found`; `RerunResult` is `{ id, round, rows: CaseRow[], defects: DefectRow[] }`. The render prints the case lines, then `<found> <kind> <outcome>` with `: <detail>` when the outcome is not `passed`; with neither cases nor defects it prints `round N has no earlier cases` as now. The `rerun` summary in `src/lib/verbs.mts` becomes "run every case of the previous round and every recorded defect again under the same ids"; run `npm run build` and stage the regenerated `docs/reference/cli.md`. `src/agents/tester.md` round step 2 reads: `picket test rerun <id>` runs every case of the previous round and every recorded defect again under its id. Test fixtures that build a `DefectRow` or a defect `TestEntry` gain `outcome: "failed"`.
**Done when:**
- **T-1.1** A unit test records K-01 in round 1 on a stack answering 201, appends a tester verdict, reruns with the stack answering 400, and finds one round 2 `defect` row with `found: "K-01"`, the round 1 `kind`, `intent`, `steps` and `evidence`, `outcome: "passed"`, and the run's `detail`, `attempts` and `mocks`; the render holds the line `K-01 negative passed`.
- **T-1.2** A unit test reruns K-01 on a stack still answering 201 and finds `outcome: "failed"` with the run's detail, and the render holds `K-01 negative failed: step 2: expected status 400, got 201`.
- **T-1.3** A unit test reruns in round 3 an item whose K-01 has a round 1 and a round 2 row, and finds exactly one round 3 row for K-01; `latestDefects` of rows holding K-01 twice and K-02 once returns the newest K-01 row then K-02.
- **T-1.4** A unit test reruns a K-01 whose run meets a mock gap and finds `outcome: "blocked"` with the gap in `detail`.
- **T-1.5** `recordDefect` writes `outcome: "failed"` on the row, asserted in the existing K-01 and K-02 test of `src/lib/verbs/test/defect.test.mts`.
- **T-1.6** The existing tests "test rerun runs the previous round's cases again under the same ids" and "test rerun in round 1 has no earlier cases" in `src/lib/verbs/test/case.test.mts` pass unedited.
- **T-1.7** `npm test` passes, with `TMPDIR=/tmp` on this machine.

## Phase 2: Close records only defects still failing
**Touch set:**
- `src/lib/verbs/close/defects.mts`: `foundDefects` and `foundDefect` reshaped
- `src/lib/verbs/close/index.test.mts`: close tests for defect rows
- `src/lib/verbs/close/close.mts`: read only, Known defects wiring
- `src/lib/verbs/close/block.mts`: read only, Known defects line
- `src/lib/shared/scenarios/keep.mts`: read only, the not-kept line
- `src/lib/verbs/test/defect.mts`: `defectLine` names the rerun
- `src/lib/verbs/test/defect.test.mts`: pinned render text
- `src/skills/testing/steps/results.md`: step 6 names the rerun
**Changes:** D-003. `foundDefects(root, item, rows)` maps `latestDefects(rows)` and, for each newest row, the rows of its `found` id. `foundDefect` keeps its dedupe check (an entry with this `found_in` and `case` already exists: no line), then: newest `outcome` is `passed` gives `{ touched: [], line: "<found> passed in round <round>, not recorded" }`; otherwise it takes the newest row of the id whose `outcome` is neither `passed` nor `blocked`, builds the card from it, and a card with `problems` gives `{ touched: [], line: "<found> not recorded: <problems joined with \", \">" }`; a card that parses writes the entry and the card as now, with `actual`, `evidence` and the mocks from that row and `opened` from the first row of the id. `defectLine` in `src/lib/verbs/test/defect.mts` ends "it becomes a known defect at close unless a later rerun passes it". In `src/skills/testing/steps/results.md` step 6, the sentence "A recorded defect never blocks the item: at close it becomes a known defect." becomes "A recorded defect never blocks the item: from the next round `picket test rerun` runs it again, and at close it becomes a known defect unless its latest rerun passed."
**Done when:**
- **T-2.1** A close unit test with K-01 failing in round 1 and passing in round 2 writes no `DF-` entry and no card, and its block holds `Known defects: K-01 passed in round 2, not recorded`.
- **T-2.2** A close unit test with K-01 failing in round 1 and failing in round 2 with another detail writes one open entry whose `actual` is the round 2 detail, whose `opened` is the round 1 day, and one known card.
- **T-2.3** A close unit test with K-01 failing in round 1 and blocked in round 2 writes one open entry whose `actual` is the round 1 detail.
- **T-2.4** A close unit test with K-01 whose steps do not parse and K-02 whose steps do writes only K-02's entry and card, and `closing.defects` holds `K-01 not recorded: ` followed by the problems `defectCard` returns for K-01's steps, joined with ", ".
- **T-2.5** The existing tests "closing an item holding a recorded defect writes an open entry and a known card, commits both and names them", "a second close writes no second entry or card for a recorded defect" and "a close whose commit fails leaves neither the entry nor the card of a recorded defect on disk" pass with no edit beyond phase 1's `outcome` on `FOUND_ROW`.
- **T-2.6** The render test in `src/lib/verbs/test/defect.test.mts` asserts the line ending "it becomes a known defect at close unless a later rerun passes it".
- **T-2.7** `npm test` passes, with `TMPDIR=/tmp` on this machine.

## Phase 3: Se4 graded by what the bypass reaches
**Touch set:**
- `src/skills/reviewing/checklists/patterns-security.md`: Se4 cell and grading section
- `src/skills/reviewing/SKILL.md`: read only, the verdict rule
- `src/lib/verbs/close/block.mts`: Se4 follow-up line, constant
- `src/lib/verbs/close/close.mts`: read only, `Repeat` shape
- `src/lib/verbs/close/index.test.mts`: follow-up and coupling tests
**Changes:** D-004. In the checklist, the Se4 row's severity cell becomes `Critical or Major`, and a `## Grading Se4` section after the table says, in the checklist's own words: Critical when the bypass reaches an action that cannot be undone outside the repository, such as an authorisation decision in the running product or a SQL run on a real database, and only such a guard is held to the determined-bypass bar; Major when it reaches only a record whose forgery is reversible and visible in the history or the diff: a Picket phase marker, verdict, comment or waiver. It cites no path under `artifacts/`, which the reach table does not allow a checklist. In `block.mts`, `REVERSIBLE_RECORDS` is the exported list `["phase marker", "verdict", "comment", "waiver"]`, joined for prose as "phase marker, verdict, comment or waiver". `followUp` gives a `Repeat` whose `class` is `Se4` the line: "Follow-up: Se4 repeats in <items joined with \", \">. Only a guard whose bypass causes an irreversible action outside the repository (a SQL run on a real database) is held to the determined-bypass bar; a new spelling that reaches a phase marker, verdict, comment or waiver is a Major finding, fixed where a review finds it." Every other class keeps today's line. The phase runs no drive: `closingBlock` is a pure renderer, and its unit test shows the line the CLI prints.
**Done when:**
- **T-3.1** A unit test renders `closingBlock` with a `Se4` repeat over two items and asserts the exact Se4 follow-up line given in the changes.
- **T-3.2** The existing test "each repeat gets a Repeats line and a Follow-up line, after what is left and the warnings" passes unedited, so Sl1 and Ts4 keep today's line.
- **T-3.3** A unit test reads `src/skills/reviewing/checklists/patterns-security.md` and finds the `REVERSIBLE_RECORDS` names, joined as the follow-up line joins them, inside its `## Grading Se4` section.
- **T-3.4** The checklist's Se4 row reads `| Se4 | Guard bypass surface |` with the severity cell `Critical or Major`, and rows Se1 to Se3 are unchanged against the base (`git diff` on the file shows only the Se4 row and the added section).
- **T-3.5** The `## Grading Se4` section names the SQL run on a real database and the running product's authorisation decision as Critical, and the phase marker, verdict, comment and waiver as Major.
- **T-3.6** `npm test` passes, with `TMPDIR=/tmp` on this machine, its reference and budget tests included.

## Open questions

none

## Revision log
