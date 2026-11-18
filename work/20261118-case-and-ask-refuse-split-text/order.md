---
kind: order
lane: order
title: Case and ask refuse split text
date: 2026-11-18
audience: developer
sources: [work/20261118-case-and-ask-refuse-split-text/request.md, src/lib/verbs/test/case.mts, src/lib/verbs/test/ask.mts, src/lib/verbs/test/classify.mts, src/lib/verbs/test/note.mts, src/lib/util/args.mts, src/lib/verbs/test/case.test.mts, src/lib/verbs/test/record.test.mts, src/lib/verbs/test/skill-examples.test.mts, src/skills/testing/steps/results.md, src/skills/testing/steps/cases.md, scripts/docs.mjs, docs/reference/cli.md, work/20261118-classify-refuses-unquoted-evidence-hints-quoted/order.md]
phases:
  - n: 1
    files: [src/lib/verbs/test/case.mts, src/lib/verbs/test/ask.mts, src/skills/testing/steps/results.md, src/lib/verbs/test/case.test.mts, src/lib/verbs/test/record.test.mts, src/lib/verbs/test/skill-examples.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs/test/ask.mts
        pattern: '--question .?"<text>'
      - path: src/lib/verbs/test/ask.mts
        pattern: '--basis .?"<text>'
      - path: src/lib/verbs/test/ask.mts
        pattern: '--question <'
        absent: true
      - path: src/lib/verbs/test/ask.mts
        pattern: '--basis <'
        absent: true
      - path: docs/reference/cli.md
        pattern: '--question "<text>"'
      - path: docs/reference/cli.md
        pattern: '--basis "<text>"'
      - path: docs/reference/cli.md
        pattern: '--question <'
        absent: true
      - path: src/skills/testing/steps/results.md
        pattern: 'each of these verbs refuses the extra words and saves nothing'
      - path: src/skills/testing/steps/results.md
        pattern: 'keeps only the first'
        absent: true
    tests: true
    drive:
      - covers: T-1.3
        command: 'echo request | node dist/bin/picket.mjs test case 20261118-case-and-ask-refuse-split-text --criterion T-1.1 --kind boundary --intent an empty basket'
        exit_code: 1
        contains: ['picket: test case <id> --criterion <T-N.x> --kind <kind> --intent "<words>"']
      - covers: T-1.4
        command: 'node dist/bin/picket.mjs test ask 20261118-case-and-ask-refuse-split-text T-1.1 --question Is an empty basket an error --choices "yes | no"'
        exit_code: 1
        contains: ['--question "<text>"', '--basis "<text>"']
---
# Order: Case and ask refuse split text

## Problem

`parseArgs` (`src/lib/util/args.mts`) takes the one word after a flag as its value and pushes every later word into the positionals. `parseCase` (`src/lib/verbs/test/case.mts:64`) reads only `args.pos[0]` and `parseAsk` (`src/lib/verbs/test/ask.mts:45`) only the first two, so `--intent an empty basket` saves the intent `an`, and an unquoted `--question` or `--basis` keeps its first word; `parseClassify` and `parseNote` already refuse such extra words (commit daeae237). Run on the base f89d608a, `echo request | node dist/bin/picket.mjs test case 20261118-case-and-ask-refuse-split-text --criterion T-1.1 --kind boundary --intent an empty basket` and `node dist/bin/picket.mjs test ask 20261118-case-and-ask-refuse-split-text T-1.1 --question Is an empty basket an error --choices "yes | no"` both pass the parse and reach the item check (`refused: ... declares no HTTP check`, exit 2). The ask usage still shows `--question <text>` and `--basis <text>`, and `src/skills/testing/steps/results.md:3` still says unquoted `classify` "keeps only the first one". Binding constraints: classify, note, the bench grader and keys, saved rows and the setting `testing` stay as they are, and `docs/reference/cli.md` is written by `npm run docs` from each verb's `usage` and checked against the git index (`test/repo/docs.test.mjs`).

## Decisions

### D-001: case and ask refuse any extra positional in the parse, as classify does
**Decision:** `parseCase` destructures `[id, ...rest]` and `parseAsk` `[id, criterion, ...rest]`, and each throws `new UsageError(USAGE)` when `rest` is not empty, in the same condition as its existing missing-argument check and before any other check (in case, before `--kind` and the stdin read; in ask, before `--question` and `--choices`). The refusal is in the parse, so the CLI exits 1 with the usage before `run` opens the item, and no row is appended. Because every free-text flag of ask spills into the same positionals, the one check covers `--question`, `--basis` and an unquoted `--default` alike. This gives up accepting a command typed without quotes; it costs one rerun. The refusal is a verb's parse, not a guard module, so no closure test is added, as with classify.
**Instead of:** joining the extra positionals back into the text: the shell has already dropped what quotes would keep (a `>` became a redirect, two spaces one), so the joined text could differ from what the tester meant while the row looks valid.
**Risks:**
- **RISK-001** A tester copies the old unquoted form and is now refused where it used to save. Mitigation: the refusal prints the usage, which shows the quoted form (D-002 for ask; the case usage is already quoted), and the step files' examples are quoted (`cases.md:30`, `results.md:14`, `results.md:20`).

### D-002: The ask usage quotes the two free-text flags the request names
**Decision:** `USAGE` in `ask.mts` becomes `'test ask <id> <criterion> --question "<text>" --choices "<a> | <b>" [--default <choice> --basis "<text>"]'`: only `--question` and `--basis` change, as the request names them; `--choices` is already quoted and `--default <choice>` stays (OQ-002). `docs/reference/cli.md` changes only by `npm run docs`, and the developer stages it.
**Instead of:** quoting `--default` too: a default with spaces needs quotes, but the request names only the two flags, and the D-001 refusal already stops an unquoted multi-word default.

### D-003: results.md line 3 names the refusal for every verb it lists
**Decision:** The sentence after the colon on `src/skills/testing/steps/results.md:3` becomes `unquoted, each of these verbs refuses the extra words and saves nothing.` The line keeps its first two sentences and its flag list word for word; no other line of the step file changes. The new text holds no `picket test <verb> <id>` command in backticks, so `skill-examples.test.mts` reads no new example from it. This line is the tester's instruction, a product file, not a code comment.
**Instead of:** naming each verb (`note`, `classify` and `ask` refuse the extra words): longer, and it would need another edit when a verb is added to the list.

## Scope

**In:**
- `parseCase` and `parseAsk` refuse extra positionals with their usage.
- The ask usage shows `--question "<text>"` and `--basis "<text>"`.
- The last clause of `results.md:3`.
- Unit tests in `case.test.mts`, `record.test.mts` and `skill-examples.test.mts`, and `docs/reference/cli.md` by regeneration.

**Out:**
- classify and note, the bench grader and keys, any paid benchmark run, rows already saved with cut text, the setting `testing`.
- Any other line of the testing step files, including `cases.md:5` (OQ-001).

## Phase 1: case and ask refuse extra words; ask usage and results step say so

**Touch set:**
- `src/lib/verbs/test/case.mts`: refuse extra positionals in parseCase
- `src/lib/verbs/test/ask.mts`: refuse rest, quote usage
- `src/skills/testing/steps/results.md`: reword line 3 last clause
- `src/lib/verbs/test/case.test.mts`: case parse split and whole
- `src/lib/verbs/test/record.test.mts`: ask parse split, usage exact
- `src/lib/verbs/test/skill-examples.test.mts`: unquoted ask example refused
- `docs/reference/cli.md`: regenerated from the ask usage

**Changes:**
- `case.mts`: `parseCase` takes `[id, ...rest]` and throws `UsageError(USAGE)` when `!id` or `rest` is not empty, before the `--kind` check (D-001). `USAGE` is unchanged.
- `ask.mts`: `parseAsk` takes `[id, criterion, ...rest]` and adds `rest.length` to the condition that throws `UsageError(USAGE)` (D-001); `USAGE` is the D-002 string.
- `results.md`: line 3 ends with the D-003 clause in place of the one saying that `note` refuses the extra words and `classify` keeps only the first one.
- `case.test.mts`: a new test feeds `caseVerb.parse` the argv a shell gives for the unquoted line (`["20261117-orders", "--criterion", "T-1.1", "--kind", "boundary", "--intent", "an", "empty", "basket"]`, stdin `STEPS`) and the quoted one (`..., "--intent", "an empty basket"`).
- `record.test.mts`: a new test feeds `ask.parse` an unquoted question (`["x-12", "T-1.1", "--question", "Is", "an", "empty", "basket", "an", "error?", "--choices", "yes | no"]`) and an unquoted basis (`["x-12", "T-1.1", "--question", "q", "--choices", "yes | no", "--default", "no", "--basis", "the", "request", "says", "nothing"]`); a second test asserts `ask.usage` equals the D-002 string.
- `skill-examples.test.mts`: a test asserts `exampleProblems` throws `UsageError` for `picket test ask <id> T-2.1 --question Is an order with an empty basket an error? --choices "yes, refuse it | no, store it as a draft"`, beside the note and classify ones.
- `docs/reference/cli.md`: run `npm run docs` and stage the result; no hand edit.

**Done when:**
- **T-1.1** `case.test.mts` asserts that `caseVerb.parse` throws a `UsageError` whose message equals `caseVerb.usage` for the unquoted argv, and returns `{ id: "20261117-orders", spec: { criterion: "T-1.1", kind: "boundary", intent: "an empty basket" }, steps: STEPS }` for the quoted argv.
- **T-1.2** `record.test.mts` asserts that `ask.parse` throws a `UsageError` whose message equals `ask.usage` for the unquoted question argv and for the unquoted basis argv, and that `ask.usage` equals the D-002 string; the existing quoted-parse test (`record.test.mts:123`) passes unchanged.
- **T-1.3** `echo request | node dist/bin/picket.mjs test case 20261118-case-and-ask-refuse-split-text --criterion T-1.1 --kind boundary --intent an empty basket` exits 1 and prints `picket: test case <id> --criterion <T-N.x> --kind <kind> --intent "<words>"`; on the base f89d608a the same command exits 2 with `refused: 20261118-case-and-ask-refuse-split-text declares no HTTP check, so it has no tested criteria`.
- **T-1.4** `node dist/bin/picket.mjs test ask 20261118-case-and-ask-refuse-split-text T-1.1 --question Is an empty basket an error --choices "yes | no"` exits 1 and prints the ask usage holding `--question "<text>"` and `--basis "<text>"`; on the base it exits 2 with the same refusal as T-1.3.
- **T-1.5** `results.md:3` ends `unquoted, each of these verbs refuses the extra words and saves nothing.`, `git diff --numstat f89d608a -- src/skills` lists only `src/skills/testing/steps/results.md`, with 1 line added and 1 removed, and every test in `skill-examples.test.mts` passes, including the new unquoted ask refusal.
- **T-1.6** `docs/reference/cli.md` in the git index holds the D-002 ask usage, and `test/repo/docs.test.mjs` "the generated pages are what git has" passes.
- **T-1.7** `TMPDIR=/tmp npm test` exits 0 (without `TMPDIR=/tmp`, `test/cli/init.test.mjs:104` fails on this machine on the base too).

## Open questions

- **OQ-001** `src/skills/testing/steps/cases.md:5` still names the flag as `--intent <words>` in prose, unquoted, while its example at line 30 is quoted; the brief limits the step file change to `results.md:3`. Should a later item quote it? Owner: product owner. Fallback: the line stays; the case usage the refusal prints shows the quoted form.
- **OQ-002** The ask usage keeps `--default <choice>` unquoted, as the request names only `--question` and `--basis`, though a choice with spaces needs quotes (`results.md:14` quotes it). Should the usage quote it too? Owner: product owner. Fallback: unquoted in the usage; D-001 refuses an unquoted multi-word default.

## Revision log
