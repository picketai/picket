---
kind: order
lane: order
title: Classify refuses unquoted evidence, hints quoted
date: 2026-11-18
audience: developer
sources: [work/20261118-classify-refuses-unquoted-evidence-hints-quoted/request.md, src/lib/verbs/test/classify.mts, src/lib/verbs/test/note.mts, src/lib/verbs/test/case.mts, src/lib/verbs/test/report.mts, src/lib/verbs/test/ask.mts, src/lib/shared/route/route.mts, src/lib/shared/testing/cases.mts, src/lib/util/args.mts, src/lib/verbs/test/record.test.mts, src/lib/verbs/test/case.test.mts, src/lib/shared/testing/cases.test.mts, src/lib/verbs/route/index.test.mts, src/lib/verbs/test/skill-examples.test.mts, src/skills/testing/steps/results.md, scripts/docs.mjs, test/repo/docs.test.mjs, docs/reference/cli.md]
phases:
  - n: 1
    files: [src/lib/verbs/test/classify.mts, src/lib/verbs/test/note.mts, src/lib/verbs/test/case.mts, src/lib/verbs/test/report.mts, src/lib/shared/route/route.mts, src/lib/shared/testing/cases.mts, src/lib/verbs/test/record.test.mts, src/lib/verbs/test/case.test.mts, src/lib/shared/testing/cases.test.mts, src/lib/verbs/route/index.test.mts, src/lib/verbs/test/skill-examples.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs/test/classify.mts
        pattern: '--evidence .?"<text>'
      - path: src/lib/verbs/test/classify.mts
        pattern: '--evidence <'
        absent: true
      - path: src/lib/verbs/test/note.mts
        pattern: '--why .?"<text>'
      - path: src/lib/verbs/test/note.mts
        pattern: '--why <'
        absent: true
      - path: src/lib/verbs/test/case.mts
        pattern: '--why .?"<why>'
      - path: src/lib/verbs/test/case.mts
        pattern: '--why <'
        absent: true
      - path: src/lib/verbs/test/case.mts
        pattern: '--intent <'
        absent: true
      - path: src/lib/verbs/test/report.mts
        pattern: '--evidence .?"<why>'
      - path: src/lib/verbs/test/report.mts
        pattern: '--evidence <'
        absent: true
      - path: src/lib/shared/route/route.mts
        pattern: '--evidence .?"<why>'
      - path: src/lib/shared/route/route.mts
        pattern: '--evidence <'
        absent: true
      - path: src/lib/shared/testing/cases.mts
        pattern: '--evidence .?"<why>'
      - path: src/lib/shared/testing/cases.mts
        pattern: '--evidence <'
        absent: true
      - path: docs/reference/cli.md
        pattern: '--evidence "<text>"'
      - path: docs/reference/cli.md
        pattern: '--why <'
        absent: true
    tests: true
    drive:
      - covers: T-1.2
        command: 'node dist/bin/picket.mjs test classify 20261118-classify-refuses-unquoted-evidence-hints-quoted C-01 product --evidence POST /orders answered 500'
        exit_code: 1
        contains: ['test classify <id> <case> <product|test|environment> --evidence "<text>"']
      - covers: T-1.5
        command: 'node dist/bin/picket.mjs test note 20261118-classify-refuses-unquoted-evidence-hints-quoted'
        exit_code: 1
        contains: ['--why "<text>", or test note <id> <criterion> untestable --why "<text>"']
      - covers: T-1.5
        command: 'node dist/bin/picket.mjs test case'
        exit_code: 1
        contains: ['--intent "<words>"']
---
# Order: Classify refuses unquoted evidence, hints quoted

## Problem

`picket test classify` reads its words with `parseArgs` (`src/lib/util/args.mts`), which takes the one word after `--evidence` as the value and pushes every later word into the positionals; `parseClassify` (`src/lib/verbs/test/classify.mts:28`) reads only the first three positionals, so `--evidence POST /orders answered 500` saves a class row whose evidence is `POST`. Run on the base, that command passes the parse and reaches the item check (`refused: ... declares no HTTP check`, exit 2), while `picket test note` with the same mistake already stops at its parse (`note.mts:43`, exit 1 with the usage). The kernel's own hints teach the mistake: `--evidence <why>` in `cases.mts:76`, `report.mts:27` and `route.mts:64`, `--why <why>` in `case.mts:30`, and the unquoted usages of classify, note and case. The binding constraints: the testing skill's step files, the bench grader and keys, saved rows and the setting `testing` stay as they are, and `docs/reference/cli.md` is written by the build from each verb's `usage` and checked against the git index (`test/repo/docs.test.mjs`, "the generated pages are what git has").

## Decisions

### D-001: classify refuses any word past the class, as note does
**Decision:** `parseClassify` takes the positionals as `[id, caseId, cls, ...rest]` and throws `new UsageError(USAGE)` when `rest` is not empty, the same shape as `parseNote`. The refusal happens in the parse, so the CLI exits 1 with the usage before the verb's `run` opens the item, and no row is appended. The usage it prints shows the quoted form (D-003), so the refusal names the fix. This gives up accepting a command a person types without quotes; it costs one rerun. The refusal is a verb's parse, not a module under `src/lib/hooks/guard/`, and note's identical refusal has no closure test, so none is added (C-020 covers the guard modules).
**Instead of:** joining the extra positionals back into the evidence: the shell has already removed what the quotes would have kept (a `>` became a redirect, a `*` a file list, two spaces one), so the joined text could differ from what the tester meant, and the row would look valid.
**Risks:**
- **RISK-001** A tester run in flight copies the old unquoted form and is now refused where it used to save. Mitigation: the refusal prints the quoted usage, and the step files already show quoted examples (`src/skills/testing/steps/results.md:5`).

### D-002: Each hint is quoted where it stands
**Decision:** The four hint strings keep their text and position and change only the placeholder: `--evidence <why>` becomes `--evidence "<why>"` in `caseLine` (`cases.mts:76`), `verdictText` (`report.mts:27`) and `testedRound` (`route.mts:64`), and `--why <why>` becomes `--why "<why>"` in `refuseCap` (`case.mts:30`). Each is pinned by an exact-string test.
**Instead of:** one shared builder for the classify command: its home would be `results.mts` beside `FAILURE_CLASSES`, a file outside the brief, or `cases.mts`, which would make `route.mts` import the env engine and scenario replay that `cases.mts` pulls in. Three copies stay, each with its own test.

### D-003: The usages show the quoted form too
**Decision:** The classify usage becomes `... --evidence "<text>"`, both forms of the note usage `--why "<text>"`, and the case usage `--intent "<words>"`, since a usage is what a refused parse prints and what `picket help` shows. The placeholder words stay (`<text>`, `<words>` in usages, `<why>` in hints). `docs/reference/cli.md` changes only by regeneration (`npm run docs` or the build), and the developer stages it. The ask usage (`src/lib/verbs/test/ask.mts:11`, `--question <text>`, `--basis <text>`) is outside the brief and stays (OQ-001).
**Instead of:** quoting only the four hints: the new classify refusal would then print the unquoted form that caused it.

## Scope

**In:**
- `parseClassify` refuses extra positionals with the classify usage.
- The hint strings in `cases.mts`, `report.mts`, `route.mts` and `case.mts`, and the usages of classify, note and case, print free text in double quotes.
- Their unit tests, including `skill-examples.test.mts`, and the regenerated `docs/reference/cli.md`.

**Out:**
- The testing skill's step files, including the now stale sentence in `results.md:3` (OQ-002).
- The bench grader and keys, any paid benchmark run, rows already saved with one-word evidence, the setting `testing`.
- `ask.mts`, and an extra-word refusal for `test case` or `test ask` (OQ-001).

## Phase 1: Classify refuses extra words; hints and usages quote free text

**Touch set:**
- `src/lib/verbs/test/classify.mts`: refuse rest, quote usage
- `src/lib/verbs/test/note.mts`: quote both usage forms
- `src/lib/verbs/test/case.mts`: quote cap hint, intent usage
- `src/lib/verbs/test/report.mts`: quote unclassified hint
- `src/lib/shared/route/route.mts`: quote unclassified refusal hint
- `src/lib/shared/testing/cases.mts`: quote classify-it hint line
- `src/lib/verbs/test/record.test.mts`: classify parse, usages, report text
- `src/lib/verbs/test/case.test.mts`: cap refusal exact text
- `src/lib/shared/testing/cases.test.mts`: case line exact text
- `src/lib/verbs/route/index.test.mts`: route refusal exact hint
- `src/lib/verbs/test/skill-examples.test.mts`: unquoted classify now refused
- `docs/reference/cli.md`: regenerated from the usages

**Changes:**
- `classify.mts`: `parseClassify` destructures `[id, caseId, cls, ...rest]` and adds `rest.length` to the condition that throws `UsageError(USAGE)` (D-001); `USAGE` ends `--evidence "<text>"` (D-003).
- `note.mts`: `USAGE` shows `--why "<text>"` in both forms.
- `case.mts`: `refuseCap` ends `--why "<why>"`; `USAGE` shows `--intent "<words>"`.
- `report.mts`, `route.mts`, `cases.mts`: the classify hint ends `--evidence "<why>"`; nothing else in the strings changes.
- `record.test.mts`: a new test feeds `classify.parse` the argv a shell gives for the unquoted line (`[id, "C-01", "product", "--evidence", "POST", "/orders", "answered", "500"]`) and the quoted one (`[id, "C-01", "product", "--evidence", "POST /orders answered 500"]`); the note usage assertion (line 103) and the report render assertion (line 154) take the quoted text; a classify usage assertion is added.
- `case.test.mts:98`, `cases.test.mts:60`: the exact strings take the quoted hint.
- `src/lib/verbs/route/index.test.mts:938`: the regex also requires the hint to end `--evidence "<why>"`.
- `skill-examples.test.mts:91`: the unquoted classify example is asserted to throw `UsageError`, like the note example at line 88, and the test name says it is refused.
- `docs/reference/cli.md`: run `npm run docs` and stage the result; no hand edit.

**Done when:**
- **T-1.1** `classify.parse` throws `UsageError` with the message equal to `classify.usage` for the unquoted argv, and returns `{ evidence: "POST /orders answered 500", case: "C-01", class: "product" }` with the item id for the quoted argv, both asserted in `record.test.mts`.
- **T-1.2** `node dist/bin/picket.mjs test classify <id> C-01 product --evidence POST /orders answered 500` exits 1 and prints the classify usage ending `--evidence "<text>"`; on the base the same command exits 2 with `refused: ... declares no HTTP check`.
- **T-1.3** `skill-examples.test.mts` asserts the unquoted classify example throws `UsageError`, and its test that every step file example parses whole and quoted passes with `git diff --quiet 54506702 -- src/skills bench` exiting 0 (54506702 is the item base).
- **T-1.4** The exact-string tests show `--evidence "<why>"` in the case line, the report's unclassified line and the route refusal, and `--why "<why>"` in the case cap refusal; no file in the touch set holds `--evidence <`, `--why <` or `--intent <`.
- **T-1.5** `picket test note <id>` and `picket test case` with missing arguments exit 1 printing usages with `--why "<text>"` in both note forms and `--intent "<words>"`; `record.test.mts` asserts the note and classify usages exactly.
- **T-1.6** `docs/reference/cli.md` in the git index holds the three quoted usages, and `test/repo/docs.test.mjs` "the generated pages are what git has" passes.
- **T-1.7** `TMPDIR=/tmp npm test` exits 0 (without `TMPDIR=/tmp`, `test/cli/init.test.mjs:104` fails on this machine on the base too).

## Open questions

- **OQ-001** `picket test case` and `picket test ask` cut unquoted free text the same way: `parseCase` reads only `args.pos[0]`, so `--intent an empty basket` saves the intent `an`, and `parseAsk` reads only two positionals, so `--question` and `--basis` lose all but their first word; the ask usage still shows `--question <text>` and `--basis <text>`. Should a follow-up item give both verbs the extra-word refusal and quote the ask usage? Owner: product owner. Fallback: this item quotes the case usage only and changes neither parse.
- **OQ-002** `src/skills/testing/steps/results.md:3` says unquoted, "`classify` keeps only the first one"; after phase 1 classify refuses the extra words, as note does. The step files are out of scope. Should a skill item reword that sentence? Owner: product owner. Fallback: the sentence stays; it still sends the tester to quote the text.

## Revision log
