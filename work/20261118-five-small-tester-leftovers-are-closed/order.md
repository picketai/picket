---
kind: order
lane: order
title: Five small tester leftovers are closed
date: 2026-11-18
audience: developer
sources: work/20261118-five-small-tester-leftovers-are-closed/request.md, src/skills/testing/steps/matrix.md, src/skills/testing/steps/cases.md, src/skills/testing/steps/results.md, src/lib/verbs/test/ask.mts, src/lib/verbs/test/record.test.mts, src/lib/verbs/test/skill-examples.test.mts, src/lib/verbs/test/case.test.mts, docs/reference/cli.md, scripts/docs.mjs, test/repo/docs.test.mjs, bench/report.mjs, bench/lib/tasks.mjs, bench/test/fixtures/tester-baseline.json, bench/test/fixtures/tester-worse.json
phases:
  - n: 1
    files:
      - src/skills/testing/steps/matrix.md
      - src/skills/testing/steps/cases.md
      - src/lib/verbs/test/ask.mts
      - src/lib/verbs/test/record.test.mts
      - docs/reference/cli.md
      - src/lib/verbs/test/case.test.mts
      - bench/report.mjs
    greps:
      - path: src/skills/testing/steps/matrix.md
        pattern: '^The matrix has one row per tested criterion.*\bquestion\b'
      - path: src/skills/testing/steps/matrix.md
        pattern: 'Each cell gets a case, or a note that says why it has none\.'
        absent: true
      - path: src/skills/testing/steps/cases.md
        pattern: '--intent "<words>"'
      - path: src/skills/testing/steps/cases.md
        pattern: '--intent <words>'
        absent: true
      - path: src/lib/verbs/test/ask.mts
        pattern: '\[--default "<choice>" --basis "<text>"\]'
      - path: src/lib/verbs/test/ask.mts
        pattern: '--default <choice>'
        absent: true
      - path: src/lib/verbs/test/record.test.mts
        pattern: '\[--default "<choice>" --basis "<text>"\]'
      - path: docs/reference/cli.md
        pattern: '\[--default "<choice>" --basis "<text>"\]'
      - path: docs/reference/cli.md
        pattern: '--default <choice>'
        absent: true
      - path: src/lib/verbs/test/case.test.mts
        pattern: 'import \{ parseArgs, UsageError \} from "\.\./\.\./util/args\.mts"'
      - path: src/lib/verbs/test/case.test.mts
        pattern: '^import \{ UsageError \} from "\.\./\.\./util/args\.mts"'
        absent: true
      - path: bench/report.mjs
        pattern: 'import \{[^}]*\bTESTER_KIND\b[^}]*\} from "\./lib/tasks\.mjs"'
      - path: bench/report.mjs
        pattern: '\bconst TESTER_KIND\b'
        absent: true
    tests: true
    drive:
      - covers: T-1.3
        command: node dist/bin/picket.mjs test ask
        exit_code: 1
        contains:
          - '--question "<text>" --choices "<a> | <b>" [--default "<choice>" --basis "<text>"]'
      - covers: T-1.6
        command: node bench/report.mjs bench/test/fixtures/tester-baseline.json
        exit_code: 0
        contains:
          - '## Tester · bench/test/fixtures/tester-baseline.json'
          - 'suite: catch rate 100%'
---
# Order: Five small tester leftovers are closed

## Problem
The three tester reviews of 2026-11-18 left five small mismatches: `src/skills/testing/steps/matrix.md:3` promises every cell a case or a note while step 2 of the same file sends a business boundary with no stated outcome to a question; `src/skills/testing/steps/cases.md:5` shows `--intent <words>` unquoted although its own example at line 30 quotes it; the usage of `picket test ask` (`src/lib/verbs/test/ask.mts:11`) shows `--default <choice>` unquoted although a choice such as `yes, refuse it` holds spaces; `src/lib/verbs/test/case.test.mts:16-17` imports from `../../util/args.mts` twice; and `bench/report.mjs:74` declares its own `TESTER_KIND` while `bench/lib/tasks.mjs:5` exports the same constant. The binding constraint is the brief: no verb accepts or refuses anything new, the bench grader and keys stay as they are, and no paid benchmark runs.

## Decisions

### D-001: One phase for the five edits
**Decision:** All five edits ship in one phase. Each is a line or two, none changes behaviour a user can see except the printed usage of `picket test ask`, and one review reads them together in a few minutes.
**Instead of:** a second phase for `bench/report.mjs`: the bench edit is one import line, and a second gate costs the user a stop that buys no separate risk.

### D-002: The ask usage changes text only; cli.md follows by regeneration
**Decision:** Only the `USAGE` string in `ask.mts` changes, to `test ask <id> <criterion> --question "<text>" --choices "<a> | <b>" [--default "<choice>" --basis "<text>"]`. `parseAsk` and `defaultOf` stay byte for byte, so what the verb accepts and refuses is unchanged (`skill-examples.test.mts` already parses `--default "yes, refuse it"` from `steps/results.md:14`). `docs/reference/cli.md` is rewritten by `npm run docs` (`scripts/docs.mjs` reads the usage from the registry) and staged, never edited by hand, because `test/repo/docs.test.mjs` "the generated pages are what git has" compares the generated page with the index.
**Instead of:** hand-editing the one line in `cli.md`: it would pass today but hides a generator drift the next `npm run docs` would show.
**Risks:**
- **RISK-001** The regenerated page carries other drift from earlier verbs. Mitigation: T-1.4 requires the `cli.md` diff to be the one usage line; any other hunk goes on the block, not into this phase.

### D-003: The matrix line names the question and points at step 2
**Decision:** Line 3 of `matrix.md` becomes: "The matrix has one row per tested criterion and one column per case kind. Each cell gets a case, a note that says why it has none, or a question when it is a business boundary the request gives no outcome for (step 2)." Step 2 already points at step 4 of `steps/results.md`, which owns the procedure, so line 3 restates no rule and adds no second copy.
**Instead of:** repeating the question rule from `steps/results.md` step 4 in line 3: two copies of one procedure drift, which is the defect this item closes.

### D-004: report.mjs imports the constant from tasks.mjs
**Decision:** `bench/report.mjs` adds `TESTER_KIND` to an import from `./lib/tasks.mjs` and deletes its `const TESTER_KIND = "tester";` line. `tasks.mjs` reads the task folder only inside `readTasks()`, so the import runs no file read when the report starts.
**Instead of:** moving the constant to a new shared module both import: `tasks.mjs` already exports it and `bench/run.mjs` imports it from there.

## Scope
**In:**
- `src/skills/testing/steps/matrix.md` line 3 and `src/skills/testing/steps/cases.md` line 5
- the `USAGE` string of `src/lib/verbs/test/ask.mts`, its pin in `src/lib/verbs/test/record.test.mts`, and `docs/reference/cli.md` by `npm run docs`
- the duplicate import in `src/lib/verbs/test/case.test.mts`
- the `TESTER_KIND` constant in `bench/report.mjs`

**Out:**
- any change in what a verb accepts or refuses (`parseAsk`, `defaultOf`, `choicesOf`)
- the bench grader, the keys and every bench task file
- any paid benchmark run
- the setting `testing`
- other wording in the step files

## Phase 1: Step files, ask usage, one import and one constant agree with the code
**Touch set:**
- `src/skills/testing/steps/matrix.md`: line 3 names the question
- `src/skills/testing/steps/cases.md`: line 5 quotes the intent
- `src/lib/verbs/test/ask.mts`: line 11 usage quotes default
- `src/lib/verbs/test/record.test.mts`: line 143 to 145 usage pin
- `docs/reference/cli.md`: line 404 regenerated usage
- `scripts/docs.mjs`: generator, read only
- `test/repo/docs.test.mjs`: generated page check, read only
- `src/lib/verbs/test/skill-examples.test.mts`: parses step examples, read only
- `src/lib/verbs/test/case.test.mts`: lines 16 to 17 merge
- `bench/report.mjs`: lines 8 to 10 and 74
- `bench/lib/tasks.mjs`: exports `TESTER_KIND`, read only
- `bench/test/fixtures/tester-baseline.json`: report drive input, read only
- `bench/test/fixtures/tester-worse.json`: report drive input, read only

**Changes:**
Before the first edit, on the base, capture the before-image outside the repository: `node bench/report.mjs bench/test/fixtures/tester-baseline.json bench/test/fixtures/tester-worse.json --check > <scratch>/report-before.txt 2>&1; echo $? >> <scratch>/report-before.txt` (today it ends `REGRESSION:` with two lines and exit 1).

Replace line 3 of `matrix.md` with the text D-003 gives. In `cases.md` line 5, write `--intent "<words>"` in place of `--intent <words>`; the rest of the line stays. In `ask.mts` set `USAGE` to the string D-002 gives; in `record.test.mts` change the pinned string to match and rename the test to "ask's usage shows the question, the default and the basis in double quotes". Run `npm run docs` and stage `docs/reference/cli.md`.

In `case.test.mts` replace the two imports from `../../util/args.mts` with one: `import { parseArgs, UsageError } from "../../util/args.mts";`.

In `bench/report.mjs` add `import { TESTER_KIND } from "./lib/tasks.mjs";` beside the other `./lib/` imports and delete line 74 (`const TESTER_KIND = "tester";`). Nothing else in the file changes.

**Done when:**
- **T-1.1** Line 3 of `src/skills/testing/steps/matrix.md` says a cell gets a case, a note, or a question for a business boundary the request gives no outcome for, and the sentence "Each cell gets a case, or a note that says why it has none." is gone (the two `matrix.md` greps).
- **T-1.2** Line 5 of `src/skills/testing/steps/cases.md` shows `--intent "<words>"` and no line of the file shows `--intent <words>` unquoted.
- **T-1.3** `node dist/bin/picket.mjs test ask` exits 1 and prints the usage with `[--default "<choice>" --basis "<text>"]`; the renamed test in `src/lib/verbs/test/record.test.mts` pins that string and passes.
- **T-1.4** `docs/reference/cli.md` shows the quoted default under `### picket test ask`, `git diff --cached docs/reference/cli.md` changes that one line only, and `test/repo/docs.test.mjs` "the generated pages are what git has" passes.
- **T-1.5** `src/lib/verbs/test/case.test.mts` imports from `../../util/args.mts` in one statement holding `parseArgs` and `UsageError`, and its tests pass.
- **T-1.6** `bench/report.mjs` imports `TESTER_KIND` from `./lib/tasks.mjs` and declares none of its own; `node bench/report.mjs bench/test/fixtures/tester-baseline.json` exits 0 and prints the `## Tester · bench/test/fixtures/tester-baseline.json` table.
- **T-1.7** The output and exit code of `node bench/report.mjs bench/test/fixtures/tester-baseline.json bench/test/fixtures/tester-worse.json --check`, captured the same way after the edit, match the before-image: `diff <scratch>/report-before.txt <scratch>/report-after.txt` prints nothing.
- **T-1.8** `TMPDIR=/tmp npm test` passes, `src/lib/verbs/test/skill-examples.test.mts` and `bench/test/*.test.mjs` included.

## Open questions
none

## Revision log
