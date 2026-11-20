---
kind: order
lane: order
title: Known defects watched, learning counted
date: 2026-11-20
audience: developer
sources:
  - work/20261120-known-defects-watched-learning-counted/request.md
  - artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md
  - artifacts/strategy/drafts/testing-and-test-environment.md
  - work/20261115-saved-scenarios-and-kernel-replay/design.md
  - src/lib/shared/scenarios/format.mts
  - src/lib/shared/scenarios/compare.mts
  - src/lib/shared/scenarios/results.mts
  - src/lib/shared/scenarios/files.mts
  - src/lib/shared/scenarios/keys.mts
  - src/lib/shared/scenarios/keep.mts
  - src/lib/verbs/env/replay.mts
  - src/lib/verbs/close/close.mts
  - src/lib/verbs/close/block.mts
  - src/lib/shared/testing/derive.mts
  - src/lib/shared/testing/facts.mts
  - src/lib/shared/testing/results.mts
  - src/lib/shared/testing/keep-cases.mts
  - src/lib/shared/work/test-stage.mts
  - src/lib/shared/route/route.mts
  - src/lib/hooks/guard/scope/index.mts
  - src/lib/hooks/route/verdict/index.mts
  - src/lib/shared/git.mts
  - src/lib/shared/paths.mts
  - src/lib/verbs/verify/index.mts
  - src/lib/verbs.mts
  - src/agents/developer.md
  - src/skills/ordering/SKILL.md
  - src/skills/designing/SKILL.md
  - src/skills/expediting/SKILL.md
  - test/timing/budgets.test.mjs
phases:
  - n: 1
    files:
      - src/lib/shared/scenarios/format.mts
      - src/lib/shared/scenarios/format.test.mts
      - src/lib/shared/scenarios/compare.mts
      - src/lib/shared/scenarios/compare.test.mts
      - src/lib/shared/scenarios/defects.mts
      - src/lib/shared/scenarios/defects.test.mts
      - src/lib/verbs/env/replay.mts
      - src/lib/verbs/env/replay.test.mts
      - src/lib/verbs/close/defects.mts
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/block.mts
      - src/lib/verbs/close/index.test.mts
      - src/skills/ordering/SKILL.md
      - src/skills/designing/SKILL.md
      - src/skills/expediting/SKILL.md
    greps:
      - path: src/lib/shared/scenarios/format.mts
        pattern: 'HEADER_KEYS = \[[^\]]*"known"'
      - path: src/lib/shared/scenarios/format.mts
        pattern: 'HEADER_KEYS = \[[^\]]*"defect"'
      - path: src/lib/shared/scenarios/compare.mts
        pattern: '"known defect"'
      - path: src/lib/shared/scenarios/defects.mts
        pattern: '\bSCENARIO_DIR\b'
      - path: src/lib/verbs/env/replay.mts
        pattern: 'known defects open'
      - path: src/lib/verbs/close/block.mts
        pattern: 'Known defects: '
      - path: src/skills/ordering/SKILL.md
        pattern: 'Known defects:.*picket:ticketing --create --bug'
      - path: src/skills/designing/SKILL.md
        pattern: 'Known defects:.*picket:ticketing --create --bug'
      - path: src/skills/expediting/SKILL.md
        pattern: 'Known defects:.*picket:ticketing --create --bug'
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/scenarios/known.mts
      - src/lib/shared/scenarios/known.test.mts
      - src/lib/shared/scenarios/compare.mts
      - src/lib/shared/scenarios/results.mts
      - src/lib/shared/scenarios/results.test.mts
      - src/lib/verbs/env/replay.mts
      - src/lib/verbs/env/replay.test.mts
      - src/lib/shared/testing/derive.mts
      - src/lib/shared/testing/derive.test.mts
      - src/lib/shared/testing/facts.mts
      - src/lib/verbs/close/defects.mts
      - src/lib/verbs/close/index.test.mts
    greps:
      - path: src/lib/shared/scenarios/compare.mts
        pattern: '"fixed outside this item"'
      - path: src/lib/shared/scenarios/compare.mts
        pattern: '"possibly masked"'
      - path: src/lib/shared/scenarios/known.mts
        pattern: '\bchangedSince\b'
      - path: src/lib/shared/scenarios/known.mts
        pattern: '\bMOCK_DIR\b'
      - path: src/lib/shared/scenarios/known.mts
        pattern: '\bCATALOG_DIR\b'
      - path: src/lib/shared/testing/derive.mts
        pattern: '\bunexplained\b'
    tests: true
    drive: true
  - n: 3
    files:
      - src/lib/shared/testing/results.mts
      - src/lib/shared/testing/escapes.mts
      - src/lib/shared/testing/escapes.test.mts
      - src/lib/shared/testing/learning.mts
      - src/lib/shared/testing/learning.test.mts
      - src/lib/shared/testing/keep-cases.mts
      - src/lib/verbs/test/escape.mts
      - src/lib/verbs/test/record.test.mts
      - src/lib/verbs.mts
      - src/lib/shared/route/route.mts
      - src/lib/verbs/route/index.test.mts
      - src/lib/verbs/close/defects.mts
      - src/lib/verbs/close/close.mts
      - src/lib/verbs/close/block.mts
      - src/lib/verbs/close/index.test.mts
      - src/agents/developer.md
      - docs/reference/cli.md
    greps:
      - path: src/lib/shared/testing/escapes.mts
        pattern: '"none: not checkable earlier"'
      - path: src/lib/shared/testing/learning.mts
        pattern: 'escaped-defects\.md'
      - path: src/lib/verbs.mts
        pattern: '\bescape: \{ summary:'
      - path: src/lib/verbs/close/block.mts
        pattern: 'Learned: '
      - path: src/agents/developer.md
        pattern: 'picket test escape'
      - path: docs/reference/cli.md
        pattern: '^### picket test escape\b'
    tests: true
    drive:
      - covers: T-3.1
        command: node dist/bin/picket.mjs test escape
        exit_code: 1
        contains:
          - 'test escape <id> <case> --root-cause "<text>" --escaped "<point>"'
---
# Order: Known defects watched, learning counted

## Problem
SDR 00004 (Ratified) D-011 says a defect outside an item's criteria does not block the item, stays visible as a known defect, and states its reason when it stops failing; TF-008 asks for that watching and for the learning count of draft section 7. Today a saved scenario that fails at the base too is classed `failing before the item` (`src/lib/shared/scenarios/compare.mts:10`) and forgotten after the replay: the card format has no `known` or `defect` key (`src/lib/shared/scenarios/format.mts:5`), nothing stores a defect, a passing scenario is never asked why, and `picket close` counts review classes (`src/lib/verbs/close/close.mts:193`) but no escaped defect. The binding constraints are the brief: no new verdict token or route, no pipeline run, the setting `testing` untouched, and every change approved by the user as SDR 00004 D-010 requires.

## Decisions

### D-001: Defect entries are kernel-written files inside the saved scenario folder
**Decision:** Infrastructural decision. Each defect is one file `.picket/env/scenarios/defects/DF-<4 digits>.md`, a yaml-lite frontmatter block and no body, with the fields `id`, `status` (`open` or `fixed`), `opened` (YYYY-MM-DD), `found_in` (item id), `scenario` (an `S-` id or `none`), `expected`, `actual`, `evidence`, and when known `case`, `root_cause`, `escaped`, `fixed`, `fixed_in`, `reason`, `range`. Ids follow draft section 2.8 (`DF-0012`) and are never reused; a fixed entry stays (draft section 7). Three facts of the code make this folder the cheap one: `guard.scope` already denies every agent's Edit and Write under `SCENARIO_DIR` (`src/lib/hooks/guard/scope/index.mts:47`), the environment content key skips `scenarios/` (`src/lib/shared/scenarios/keys.mts:45`), so writing an entry invalidates no stored result, and `listScenarios` reads only files directly in the folder (`src/lib/shared/scenarios/files.mts:78`), so the subfolder is never read as a card.
**Instead of:** `.picket/defects/`: it needs a new `guard.scope` prefix with its closure test (CONTRIBUTING C-020) for the same protection; `.picket/env/defects/` would change the environment key and force base runs on every item.
**Risks:**
- **RISK-001** The `guard.scope` denial for an entry says it is a saved scenario. Mitigation: no agent has a reason to write an entry; the text is wrong only in its noun, and a follow-up can split the message with its closure seeds.

### D-002: A known scenario's failure is its own class and is never blamed
**Decision:** A card may carry `known: DF-0001` (the defect is open) and `defect: DF-0001` (the card reproduced that defect); both are optional format 1 keys, as the saved-scenarios design proposed in its OQ-005. `classify` takes the card's `known` label: a confirmed failure of a labelled card is `known defect`, which `isBlamed` does not list, so it reaches neither the fix route nor the breaker (`src/lib/shared/testing/derive.mts:41` and `:49` read only blamed scenarios), and the replay builds no base for it. Every `picket env replay` prints the open entries with their age in whole days, so the regression run is where they stay visible.
**Instead of:** keeping the known list outside the card, keyed by scenario id: draft section 3.10 puts the label on the card, and a card carrying it keeps the fact next to the steps a person reads.
**Risks:**
- **RISK-002** Adding the label rewrites the card, which changes its fingerprint, so its stored results no longer match `lastKnown` (`src/lib/shared/scenarios/results.mts:50`). Mitigation: a failing known card needs no base result, and a passing one costs at most one base run, after which results match again.

### D-003: Recording and resolving happen at close, inside the close commit
**Decision:** `picket close` reads the item's latest `full` or `affected` run that has no `reason`. Each result classed `failing before the item` on an active card that has no `known` label and no open entry becomes an open entry, and its card gains `known`. From phase 2, each result whose stated reason explains the pass resolves its entry. The written paths join the kept-scenario paths, so `commitClose` commits them with the close and `restoreKept` undoes them when the commit fails (`src/lib/verbs/close/close.mts:216`). The closing block names each one on a `Known defects:` line, and the lead offers `picket:ticketing --create --bug` for each recorded entry; the ticketing skill shows every create for confirmation first, which is the user's confirmation draft section 3.10 asks for.
**Instead of:** recording during `env replay`: an abandoned item would leave tracked files behind, and each replay of the item would rewrite cards the gate has not seen.
**Risks:**
- **RISK-003** A saved scenario that fails at the base and on the item because of the environment (a dependency down in both runs) is recorded as a defect. Mitigation: the ticket needs the user's yes, and the next replay that passes at the base resolves the entry as fixed outside the item.

### D-004: The reason a known defect stopped failing is derived by code, in a fixed order
**Decision:** A confirmed pass of a `known` card gets one of four classes, checked in this order: the base passed too, `fixed outside this item`, with the commit range from the versions of the scenario's last failing run to the base versions; the item's changed files include a file under `MOCK_DIR` or `CATALOG_DIR` or the card itself, `possibly masked`; the base failed and the item's request or record names the id as a word, `fixed by this item`; otherwise, a missing base result included, `side effect`, with the changed files. The last two are unexplained: the test stage puts them on the user's stop as derive reasons of the existing `user` route, and otherwise the gate's `scenarios:` line and the closing block name them. An unexplained entry stays open and keeps its label; once the item merges, the next item's base passes and resolves it as fixed outside, with this item's commits in the range.
**Instead of:** a gate reply that lets the user close an entry by hand: it is a new route, which the brief rules out, and the merge already settles the case.
**Risks:**
- **RISK-004** A run grant passes the phase gate without a stop, so outside the test stage the user first reads a side effect in the closing block. Mitigation: OQ-002 asks whether it should give the phase its own gate.

### D-005: The developer records where a fixed defect escaped; close counts escape points by item
**Decision:** `picket test escape <id> <case> --root-cause "<text>" --escaped "<point>"` records the root cause and the escape point of a case classed `product`, from the closed list of draft section 7: `unit test`, `declared check`, a review row id (the verdict hook's shape `^[A-Z][A-Za-z]*\d+$`, `src/lib/hooks/route/verdict/index.mts:34`) or `none: not checkable earlier`. The developer knows the root cause after the fix, so the route refuses its `PHASE DONE` in a test fix round until each product case of that tester round has one. At close each fixed product case becomes a `fixed` entry. Close then counts entries by escape point across all entries; a point named in two or more distinct items writes one line to the memory of its role (`unit test` the developer, `declared check` the architect, a review row id the reviewer, `none` no role) in `.claude/agent-memory/picket-<role>/escaped-defects.md`, the folder Claude Code gives a plugin agent with `memory: project` (this repository's `.claude/agent-memory/picket-architect/`). The memory file is written, not committed: `.claude/` is a bookkeeping prefix (`src/lib/shared/paths.mts:45`), so no dirty warning follows. A project rule stays a change the user requests.
**Instead of:** the reviewer naming the escape point at the re-review of the fix: it can name a review row but not the root cause the developer just found, and a second recorder doubles the refusals.
**Risks:**
- **RISK-005** A review row id is checked by shape only, so a misspelled id counts as its own point. Mitigation: OQ-003; the count then stays below two and writes nothing.

## Scope
**In:**
- the `known` and `defect` card keys, defect entries, the `known defect` class and the open list on every replay (phase 1)
- recording at close and the ticket offer in the lead skills (phase 1)
- the four stated reasons, the user's stop for the unexplained ones, and resolving at close (phase 2)
- `picket test escape`, the route refusal, fixed entries for the tester's product defects, the count and the memory line (phase 3)

**Out:**
- a tester verb for a defect outside every tested criterion (OQ-001)
- storing a ticket key on an entry
- the browser adapter (TF-009); SDR 00005 TF-003 and TF-004
- new verdict tokens or routes; a pipeline run of scenarios; the setting `testing`
- project rules written from the count

## Phase 1: Known defects are recorded, listed with their age, and not counted
**Touch set:**
- `src/lib/shared/scenarios/format.mts`: header keys, field rules
- `src/lib/shared/scenarios/format.test.mts`: label parse and round trip
- `src/lib/shared/scenarios/compare.mts`: known defect class
- `src/lib/shared/scenarios/compare.test.mts`: class and blame cases
- `src/lib/shared/scenarios/defects.mts`: new; entries, ids, age, labels
- `src/lib/shared/scenarios/defects.test.mts`: new; entry tests
- `src/lib/shared/scenarios/results.mts`: `latestRun`, read only
- `src/lib/shared/scenarios/files.mts`: listing and writing cards, read only
- `src/lib/shared/scenarios/keep.mts`: `KeptFiles`, `restoreKept`, read only
- `src/lib/util/yaml-lite.mts`: `frontmatter`, `stringify`, read only
- `src/lib/verbs/env/replay.mts`: label to classify, open list
- `src/lib/verbs/env/replay.test.mts`: replay with known cards
- `src/lib/verbs/close/defects.mts`: new; record at close
- `src/lib/verbs/close/close.mts`: call it, merge written paths
- `src/lib/verbs/close/block.mts`: Known defects line
- `src/lib/verbs/close/index.test.mts`: close records an entry
- `src/skills/ordering/SKILL.md`: step 7 ticket offer
- `src/skills/designing/SKILL.md`: step 8 ticket offer
- `src/skills/expediting/SKILL.md`: close row ticket offer
- `test/timing/budgets.test.mjs`: scenario core 600 lines, read only

**Changes:**
`format.mts`: `HEADER_KEYS` gains `known` and `defect`; both take a defect id (`DF-` and four or more digits), with the messages `known must be a defect id such as DF-0001` and `defect must be a defect id such as DF-0001`. `ScenarioHeader` gains optional `known` and `defect`; `toHeader` and `headerMap` carry them (after `superseded_by`). The four core files stay within the 600-line budget (560 today).

`defects.mts` exports `DEFECT_DIR` (`${SCENARIO_DIR}/defects`), `DefectEntry` with the fields of D-001, `readDefects(root)` (sorted by id; a file that does not parse is skipped), `writeDefect(root, entry): string` (the repo-relative path), `nextDefectId(root)` (highest file number plus one, four digits), `ageDays(opened, now: Date)` (whole UTC days) and `labelCard(text, labels: { known?: string | null; defect?: string }): string` (parses, sets or removes the keys, and writes the card again through `writeScenario`, so it is signed and never reads as changed by hand).

`compare.mts`: `RESULT_CLASSES` gains `known defect` after `failing before the item`; `classify` takes a fourth argument, the card's `known` id or `null`, and a confirmed failure with an id is `known defect` (after the unstable, passed, blocked, not run and replaced checks). `isBlamed` does not change.

`replay.mts`: `resultRow` passes the card's `known`, and `null` for base rows; `needsBase` is false for a labelled card. `ReplayReport` gains `open: { id: string; scenario: string; days: number }[]` from the open entries and `ctx.now()`, on the `not replayed` path too. `renderReplay` ends with `known defects open: DF-0001 (S-0002) 41 days` (several joined by `, `) or `known defects open: none`.

`close/defects.mts` exports `recordKnownDefects(root, snap, now): KeptFiles`: for the run D-003 names, it writes an open entry per new `failing before the item` result, with `opened` today, `found_in` the item, `expected` the card's `intent`, `actual` the result's `detail`, `evidence` `run <run> on <app> <version>, ...`, and labels the card; each write is a `KeptBefore`, and `lines` hold `DF-0001 recorded from S-0002`. `close.mts` calls it in the repository path after `keptCases`, merges its paths and `before` into the files given to `commitClose`, and `Closing` gains `defects: string[]`. `block.mts` prints `Known defects: <lines joined by "; ">` after the `Kept:` line, when there are any.

Ordering step 7, designing step 8 and the expediting close row each gain one sentence: when the block names `recorded` on its `Known defects:` line, offer `picket:ticketing --create --bug` for each recorded defect, drafted from its entry file; nothing is created without the user's yes.

**Done when:**
- **T-1.1** `parseScenario` reads `known: DF-0003` and `defect: DF-0003` into the header and `writeScenario` writes them back with a matching fingerprint; `known: 3` gives `header: known must be a defect id such as DF-0001`.
- **T-1.2** An entry with every D-001 field written by `writeDefect` reads back equal through `readDefects`; `nextDefectId` gives `DF-0003` beside `DF-0001.md` and `DF-0002.md`; `ageDays("2026-10-10", new Date("2026-11-20T09:00:00Z"))` is 41.
- **T-1.3** `classify` gives `known defect` for a confirmed failure with `DF-0001` whatever the base row says, `failing before the item` for the same failure with `null`, and `isBlamed("known defect")` is false.
- **T-1.4** A replay in `replay.test.mts` whose labelled card fails twice with no stored base row never calls the `base` dependency, stores the class `known defect`, and reports `ok: true`.
- **T-1.5** With `DF-0001` open since 2026-10-10 for `S-0002` and the clock at 2026-11-20, `renderReplay` ends with `known defects open: DF-0001 (S-0002) 41 days`, and with no open entry with `known defects open: none`.
- **T-1.6** Closing an item whose latest full run classed `S-0002` `failing before the item` writes `DF-0001` open with `found_in` the item, labels `S-0002` `known: DF-0001`, commits both in the close commit, and prints `Known defects: DF-0001 recorded from S-0002`.
- **T-1.7** Closing the item again, or closing a second item whose run holds the same row for `S-0002`, writes no second entry.
- **T-1.8** The three lead skills carry the ticket offer (the frontmatter greps), and `npm test` passes with `TMPDIR=/tmp`, the budgets test included.

## Phase 2: A known defect that stops failing gets its stated reason
**Touch set:**
- `src/lib/shared/scenarios/known.mts`: new; reason, range, masked, named
- `src/lib/shared/scenarios/known.test.mts`: new; the four reasons
- `src/lib/shared/scenarios/compare.mts`: four classes, unexplained set
- `src/lib/shared/scenarios/results.mts`: summary names unexplained
- `src/lib/shared/scenarios/results.test.mts`: summary text
- `src/lib/shared/git.mts`: `changedSince`, read only
- `src/lib/shared/env/standard.mts`: `MOCK_DIR`, `CATALOG_DIR`, read only
- `src/lib/verbs/env/replay.mts`: base run for passing known cards
- `src/lib/verbs/env/replay.test.mts`: base call and classes
- `src/lib/verbs/verify/index.mts`: `changedPaths` pattern, read only
- `src/lib/shared/testing/derive.mts`: unexplained user reasons
- `src/lib/shared/testing/derive.test.mts`: user route case
- `src/lib/shared/testing/facts.mts`: fills unexplained
- `src/lib/shared/work/test-stage.mts`: user stop text, read only
- `src/lib/verbs/close/defects.mts`: resolve explained entries
- `src/lib/verbs/close/index.test.mts`: resolve and keep open

**Changes:**
`compare.mts`: `RESULT_CLASSES` gains `fixed outside this item`, `fixed by this item`, `side effect` and `possibly masked`; `isUnexplained(cls)` is true for the last two. A confirmed pass of a labelled card takes its class from `known.mts`; every other path of `classify` stays.

`known.mts` exports `commitRange(from: Versions, to: Versions): string` (for each app in both whose commit, the part before `-t`, differs: `<app> <from>..<to>`, joined by `, `; none: `no app commit changed`), `itemChanges(root, layout, base)` (`changedSince` for the root and each layout repo, as `changedPaths` in `src/lib/verbs/verify/index.mts:115` does, without plan paths), `maskedBy(changes, cardPath)` (the changes under `MOCK_DIR/` or `CATALOG_DIR/`, or equal to the card path), `namesDefect(texts, id)` (the id as a whole word in the request or the lane artifact), and `stoppedFailing({ base, lastFailing, masked, named, changes }): { class: ResultClass; detail: string }` in D-004's order. Details: the range, or `no failing run recorded`; `changed: <masked files>`; empty; `changed: <files>`, prefixed `no base result; ` when the base row is missing.

`replay.mts`: a confirmed pass of a labelled card with no stored base row joins the cards `runBase` replays; its row is classed by `stoppedFailing`, with `lastFailing` the newest `failed` row of that scenario in a `full`, `affected` or `base` run. `ResultRow` gains optional `defect`. `summaryText` in `results.mts` names the scenarios of an unexplained class as it names blamed ones, so `picket verify`'s `scenarios` detail and the gate's `scenarios:` line show them, and `ReplaySummary` gains `unexplained` rows (scenario, class, detail, defect).

`derive.mts`: `DeriveInput.replay` gains `unexplained: string[]`; `userReasons` appends each, so an otherwise passing round routes `user` and the existing `resolve_tests` stop names it. `facts.mts` fills it as `S-0002 (DF-0001) side effect: changed: src/orders/cart.ts`.

`close/defects.mts`: a row of the run D-003 names classed `fixed outside this item` or `fixed by this item` whose entry is open sets `status: fixed`, `fixed` today, `fixed_in` the item, `reason` the class and `range` the detail when there is one, and relabels the card (`known` removed, `defect` set). Lines: `DF-0001 fixed outside this item (orders 1a2b3c4..5d6e7f8)`, `DF-0001 fixed by this item`, and for an unexplained row `DF-0001 side effect (changed: src/orders/cart.ts); still open`.

**Done when:**
- **T-2.1** `stoppedFailing` returns `fixed outside this item` for a passed base row even when `masked` is not empty, `possibly masked` for a failed base row with `.picket/env/mocks/payments-mock.yaml` masked and `named` true, `fixed by this item` for a failed base row, nothing masked and `named` true, and `side effect` with `no base result; changed: src/orders/cart.ts` for no base row and `named` false.
- **T-2.2** `commitRange({ orders: "1a2b3c4" }, { orders: "5d6e7f8-t9a8b7c6", web: "0f0f0f0" })` is `orders 1a2b3c4..5d6e7f8`, and equal commits give `no app commit changed`.
- **T-2.3** `namesDefect` finds `DF-0001` in `fixes DF-0001.` and not in `DF-00012`; `maskedBy` keeps `.picket/env/catalog/customer.md` and the card's own path and drops `src/orders/cart.ts`.
- **T-2.4** In `replay.test.mts` a labelled card that passes with no stored base row calls `base` once with that card, and with a stored passed base row calls it zero times and stores `fixed outside this item`.
- **T-2.5** `summaryText` for a run holding one `passed` and one `side effect` row of `S-0002` is `2 replayed: 1 passed, 1 side effect (S-0002)`.
- **T-2.6** `deriveVerdict` with every criterion passed and `unexplained: ["S-0002 (DF-0001) side effect: changed: src/orders/cart.ts"]` gives `CHANGES REQUIRED`, route `user`, with that reason; with an empty list it gives `APPROVED`.
- **T-2.7** Closing an item whose run classed `S-0002` `fixed outside this item` sets `DF-0001` fixed with its range, replaces `known` by `defect: DF-0001` on the card, commits both, and prints `Known defects: DF-0001 fixed outside this item (orders 1a2b3c4..5d6e7f8)`; a `side effect` row leaves the entry open and the label in place.

## Phase 3: Fixed defects keep their escape point, and close counts them
**Touch set:**
- `src/lib/shared/testing/results.mts`: escape row type
- `src/lib/shared/testing/escapes.mts`: new; points, roles, missing escapes
- `src/lib/shared/testing/escapes.test.mts`: new; point and missing tests
- `src/lib/shared/testing/learning.mts`: new; counts, memory text
- `src/lib/shared/testing/learning.test.mts`: new; count and file tests
- `src/lib/shared/testing/keep-cases.mts`: kept id per covers
- `src/lib/verbs/test/escape.mts`: new verb
- `src/lib/verbs/test/classify.mts`: verb pattern, read only
- `src/lib/verbs/test/record.test.mts`: escape verb tests
- `src/lib/verbs.mts`: register `test escape`
- `src/lib/shared/route/route.mts`: refuse PHASE DONE without escapes
- `src/lib/verbs/route/index.test.mts`: refusal test [INFERRED]
- `src/lib/shared/work/test-stage.mts`: stage rows, read only
- `src/lib/verbs/close/defects.mts`: fixed entries, learning call
- `src/lib/verbs/close/close.mts`: `Closing.learned`
- `src/lib/verbs/close/block.mts`: Learned line
- `src/lib/verbs/close/index.test.mts`: entries and memory line
- `src/agents/developer.md`: line 21, record the escape
- `docs/reference/cli.md`: regenerated by `npm run docs`

**Changes:**
`results.mts` (testing): `EscapeRow = Stamped & { type: "escape"; case: string; root_cause: string; escaped: string }` joins `TestRow` and `ROW_TYPES`. `escapes.mts` exports `NOT_CHECKABLE` (`none: not checkable earlier`), `isEscapePoint(text)` (`unit test`, `declared check`, `NOT_CHECKABLE`, or `REVIEW_ROW`, the shape D-005 quotes), `escapeRole(point)` (developer, architect, reviewer or `null`), and `missingEscapes(rows, round)`: the failed cases of that round whose latest class is `product` and that no `escape` row names.

`test/escape.mts`, usage `test escape <id> <case> --root-cause "<text>" --escaped "<point>"`, opens the item as `classify` does and appends an `escape` row in the current tester round. It refuses a case no round holds, `C-02 is not classed product; only a product failure takes an escape point`, and a point outside the list (`--escaped must be unit test, declared check, a review row id such as Ts4, or none: not checkable earlier`). `verbs.mts` registers `escape` under `test`, not read-only; `npm run docs` rewrites `cli.md`.

`route.mts`: a developer `PHASE DONE` that follows a tester `CHANGES REQUIRED` with `test_route` `fix` or `breaker`, after the cumulative `APPROVED`, is refused while `missingEscapes(rows, tester.round)` is not empty, with `record where C-03 escaped first: picket test escape <id> C-03 --root-cause "<text>" --escaped "<point>"`. `developer.md` line 21 gains that sentence for the test report case.

`keep-cases.mts`: `KeptCases` gains `scenarios: { covers: string; id: string }[]`. `close/defects.mts` writes, for each case whose latest class is `product` and whose latest outcome is `passed`, a `fixed` entry unless one names this item and case: `case`, `opened` the date of its class row, `fixed` today, `found_in` and `fixed_in` the item, `reason: fixed by this item`, `scenario` the kept id for `<criterion> <kind>` or `none`, `expected` the case intent, `actual` the detail of its last failed row, `evidence` the class evidence, and the `root_cause` and `escaped` of its newest escape row.

`learning.mts` exports `escapeCounts(entries)`: per `escaped` value, the distinct `found_in` items and the entry ids, kept when two or more items; and `writeLearning(root, counts): string[]`, which writes for each role `.claude/agent-memory/picket-<role>/escaped-defects.md` whole (frontmatter `name: escaped-defects`, a description, `metadata: type: feedback`, then one line per point: `- Defects escaped a unit test in 2 items: DF-0004 (<item>): <root cause>; DF-0009 (<item>): <root cause>.`) and appends `- [Escaped defects](escaped-defects.md): defects that got past this role's check, counted by picket close` to that folder's `MEMORY.md` when no line links the file. A point with no role is counted, never written. Close calls both after the commit; `Closing` gains `learned`, and `block.mts` prints `Learned: unit test in 2 items (DF-0004, DF-0009) to .claude/agent-memory/picket-developer/escaped-defects.md`.

**Done when:**
- **T-3.1** `picket test escape` with no arguments exits 1 with its usage (the declared check); in `record.test.mts` it appends an `escape` row for a product case and refuses a `test` case and the point `code review` with the texts above, while `Ts4` and `none: not checkable earlier` are taken.
- **T-3.2** `missingEscapes` returns `C-03` for a round where `C-03` failed classed `product` and `C-04` failed classed `environment`, and nothing once an `escape` row names `C-03`.
- **T-3.3** A developer `PHASE DONE` after a tester `CHANGES REQUIRED` with route `fix` is refused with the text above while `C-03` has no escape row, and routes once the row exists.
- **T-3.4** Closing an item whose `C-03` was classed `product` in round 1 and passed in round 2 writes a `fixed` entry carrying every D-001 field, its `root_cause` and `escaped`; a second close writes no second one.
- **T-3.5** `escapeCounts` keeps `unit test` for two entries from two items, drops it for two entries from one item, and keeps `none: not checkable earlier` from two items with role `null`.
- **T-3.6** `writeLearning` in a temp root writes the developer's `escaped-defects.md` with the frontmatter and line above and one `MEMORY.md` index line; a second call leaves one index line, and no file is written for `none: not checkable earlier`.
- **T-3.7** The closing block prints the `Learned:` line for two items that escaped a unit test, `docs/reference/cli.md` holds `### picket test escape`, and `npm test` passes with `TMPDIR=/tmp`.

## Open questions
- **OQ-001** Should the tester gain a verb that records a failing request outside every tested criterion as a known defect? `picket test case` refuses a criterion that is not tested (`src/lib/verbs/test/case.mts:24`), so today the tester cannot record one. Owner: product owner. Fallback: known defects come from saved scenarios the base fails too (D-003); the tester's skill is unchanged.
- **OQ-002** Should an unexplained stop (`side effect`, `possibly masked`) give its phase its own gate, so a run grant cannot pass it? Owner: product owner. Fallback: the test stage's user stop, the gate's `scenarios:` line and the closing block show it (D-004).
- **OQ-003** Should `picket test escape` check a review row id against the reviewing checklists rather than by shape? Owner: product owner. Fallback: shape only (D-005).
- **OQ-004** Draft section 7 says "At two or more" without naming what is counted. Owner: product owner. Fallback: two or more distinct items per escape point, as the mistake-class count of `picket close` reads items (D-005).

## Revision log
