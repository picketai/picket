---
kind: order
lane: order
title: Tester reads shapes, doubts, asks edges
date: 2026-11-18
audience: developer
sources: [work/20261118-tester-reads-shapes-doubts-asks-edges/request.md, bench/results/plugin-2026-11-18.json, bench/.runs/events/test-01-negative-quantity-r1-mwlzjfvk.jsonl, bench/.runs/events/test-04-replay-returns-200-r1-mwlzngf5.jsonl, bench/.runs/events/test-06-credit-over-total-r1-mwlzq7fw.jsonl, bench/fixture/README.md, bench/lib/tester-grade.mjs, src/skills/testing/SKILL.md, src/skills/testing/steps/cases.md, src/skills/testing/steps/matrix.md, src/skills/testing/steps/results.md, src/agents/tester.md, src/lib/verbs/test/note.mts, src/lib/verbs/test/classify.mts, src/lib/verbs/test/ask.mts, src/lib/verbs/test/case.mts, src/lib/shared/testing/derive.mts, src/lib/hooks/guard/blackbox/index.mts, artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md]
phases:
  - n: 1
    files: [src/skills/testing/steps/matrix.md, src/skills/testing/steps/results.md, src/lib/verbs/test/skill-examples.test.mts]
    greps:
      - path: src/skills/testing/steps/matrix.md
        pattern: '--why "'
      - path: src/skills/testing/steps/matrix.md
        pattern: '--why <'
        absent: true
      - path: src/skills/testing/steps/results.md
        pattern: '--why "'
      - path: src/skills/testing/steps/results.md
        pattern: '--why <'
        absent: true
      - path: src/skills/testing/steps/results.md
        pattern: '--evidence "'
      - path: src/skills/testing/steps/results.md
        pattern: '--evidence <'
        absent: true
      - path: src/lib/verbs/test/skill-examples.test.mts
        pattern: 'shell-quote-parse'
      - path: src/lib/verbs/test/skill-examples.test.mts
        pattern: 'skills/testing/steps'
    tests: true
    drive: false
  - n: 2
    files: [src/skills/testing/steps/cases.md, src/skills/testing/steps/matrix.md, src/skills/testing/steps/results.md]
    greps:
      - path: src/skills/testing/steps/cases.md
        pattern: 'README'
      - path: src/skills/testing/steps/cases.md
        pattern: '\bGlob\b'
      - path: src/skills/testing/steps/results.md
        pattern: '\bdoubt'
      - path: src/skills/testing/steps/results.md
        pattern: '\band a case depends on the answer\b'
        absent: true
      - path: src/skills/testing/steps/matrix.md
        pattern: 'steps/results\.md'
      - path: src/skills/testing/steps/cases.md
        pattern: '\b(invoice|credit)'
        flags: i
        absent: true
      - path: src/skills/testing/steps/matrix.md
        pattern: '\b(invoice|credit)'
        flags: i
        absent: true
      - path: src/skills/testing/steps/results.md
        pattern: '\b(invoice|credit)'
        flags: i
        absent: true
    tests: true
    drive: false
---
# Order: Tester reads shapes, doubts, asks edges

## Problem

The first paid tester benchmark run (`bench/results/plugin-2026-11-18.json`) failed three of six tasks for reasons the testing skill can fix. In test-04 the tester guessed the POST /invoices body twice (`items`/`price`, then `lines`/`unitPrice` with no `currency`), got 500 each time, said in its block "I never saw the real body schema", and still classed all four cases `product`, while `bench/fixture/README.md:20` documents `{ customer, currency, lines: [{ description, quantity, unitPriceCents }] }` and `guard.blackbox` lets the tester read it (the item owns only `src/http/handlers.ts` and `test/idempotency.test.ts`). In test-06 it wrote "I did not run a case for a credit larger than the invoice total" in its block and asked nothing, because `steps/results.md:11` allows a question only when "a case depends on the answer". In test-01 and test-06 every `picket test note` ran twice: the step files show `--why <text>` unquoted, and `note.mts:43` refuses the extra words. The binding constraints: only the skill text and its tests change (the kernel verbs, the answer key and a paid run are out of scope), the trap tasks test-04 and test-05 fail on any question (`bench/lib/tester-grade.mjs:64`), and step files stay within 80 lines with no 25-word paragraph repeated across instruction files (`test/repo/skills.test.mjs`).

## Decisions

### D-001: Command examples are concrete and pinned by a round trip through the verbs' parsers
**Decision:** Every `picket test note`, `picket test classify` and `picket test ask` command the testing step files show is written with real values, `<id>` its only placeholder and every free text in double quotes. A unit test reads those lines from `src/skills/testing/steps/*.md`, tokenizes them with the vendored shell parser the guards already use (`src/lib/util/vendor/shell-quote-parse.mjs`), and feeds the words to each verb's own `parse`, so the prose is a writer whose output the reader is tested on, as `src/lib/hooks/lint/schema/report.test.mts:77` does for the report template. The classify example is quoted too: a one-off probe showed `--evidence POST /orders answered 201` parses to the evidence `POST` with no error, a silent loss worse than the note refusal. This gives up the generic placeholder lines (`<criterion> <kind>`), which a shell cannot parse.
**Instead of:** a test that only greps for `--why "`: it would pass a line with a placeholder the shell reads as a redirect, and it cannot see the classify truncation.
**Risks:**
- **RISK-001** The tester copies the kernel's own hint lines, which still print `--evidence <why>` and `--why <why>` unquoted (OQ-001). Mitigation: the step files say once why the quotes matter, and the kernel strings go to a separate item.

### D-002: A request's shape comes from the brief, the request or an unchanged document, and a passed normal case proves it
**Decision:** Before writing step lines, the tester takes each request's method, path and body fields from the brief, the request, or an unchanged project document (`README.md`, a `docs/` folder, an OpenAPI file) that it finds with Glob and opens with Read by path. It never writes a field name no source shows. The normal case of an endpoint runs first (`steps/matrix.md:13` already orders it first per criterion); once it passes, its body is the shape the later cases of that endpoint change one value of. This satisfies the black-box rule (`SKILL.md:29` already allows unchanged files) without a kernel change.
**Instead of:** the kernel copying the body shape into the brief: `picket test brief` is a kernel verb, out of scope, and it has no way to know which document describes the shape.
**Risks:**
- **RISK-002** A Grep from the project root is refused, because `guard.blackbox` denies a Grep whose path holds an item-owned file (`src/lib/hooks/guard/blackbox/index.mts`, `deniedHit`), and the tester may stop there. Mitigation: the step names Glob to find the documents and Read to open them.
- **RISK-003** A project documents no shape. Mitigation: D-003 classes a failure on an unsourced body `test`, so no product failure rests on a guess.

### D-003: Doubt has a checkable condition, and a doubtful failure is classed test with a corrected case
**Decision:** A failed case is classed `product` only when its request shape came from a D-002 source or from a passed case, and its expectation is the criterion's words. A failure the tester doubts (a shape no source showed, or an answer that points at the case's own input, such as a 500 or a 400 naming a field on a body it composed) is classed `test`, and a corrected case follows once the shape is found. The corrected case is the one exception to one case per kind (`steps/matrix.md:13`); the kernel already allows it, since `refuseCap` (`src/lib/verbs/test/case.mts:28`) counts only the round's total against `caseCap`. A `test`-classed failure blocks nothing on its own: `fixReasons` in `src/lib/shared/testing/derive.mts` counts `product` classes only, and a criterion left with no passed case still routes to the user.
**Instead of:** "class it `test` when unsure", a judgement with no condition: in test-04 the tester wrote that its class was uncertain and classed `product` anyway.
**Risks:**
- **RISK-004** A real defect answers 500 on a guessed body and is classed `test`. Mitigation: the corrected case on the sourced shape fails again and is then classed `product` with that evidence.
- **RISK-005** Corrected cases use up the round's cap. Mitigation: the step says the corrected case counts against the cap, and a cell the cap stops is recorded `not-covered` as today.

### D-004: A silent business edge of a tested criterion is a question, even with no case behind it
**Decision:** Step 4 of `steps/results.md` drops "and a case depends on the answer": the tester asks when the request gives no outcome for a business edge of a tested criterion, a value past a limit the request or its domain sets, even when no planned case depends on the answer, and never leaves such a gap only in the block's prose. A technical edge (a size of 0, a malformed value) stays a `negative` or `boundary` case with the answer the request implies, and a question about how the code works is still not asked. With no words of the request to rest on, the question carries no default (`--default` needs `--basis`, `src/lib/verbs/test/ask.mts`). The examples stay in the orders domain the step files already use (a discount code worth more than the order total), never the benchmark fixture's invoices or credits, so the benchmark measures the rule and not a memorised answer.
**Instead of:** a question for every edge the request is silent on: test-04 and test-05 are trap tasks that fail on any question (`bench/lib/tester-grade.mjs:64`).
**Risks:**
- **RISK-006** The tester still asks on a trap task. Mitigation: the business-versus-technical split above; only a paid run can show the rate (T-2.8).

## Scope

**In:**
- `src/skills/testing/steps/matrix.md`, `src/skills/testing/steps/results.md` and `src/skills/testing/steps/cases.md`.
- One new unit test, `src/lib/verbs/test/skill-examples.test.mts`, that pins the step files' command examples.

**Out:**
- `src/skills/testing/SKILL.md` and `src/agents/tester.md`: no step needs them; `SKILL.md:29` already lets the tester read unchanged files, and the tester shell already reads the steps the skill names.
- The kernel's `picket test` verbs and their printed hints (OQ-001), the test-01 answer key, any paid benchmark run, the `testing` setting, SDR 00004 items TF-006 to TF-009.

## Phase 1: Quoted, runnable note and classify examples

**Touch set:**
- `src/skills/testing/steps/matrix.md`: two note examples to quote
- `src/skills/testing/steps/results.md`: classify and note examples, quote sentence
- `src/lib/verbs/test/skill-examples.test.mts`: new round-trip test of examples
- `src/lib/verbs/test/note.mts`: parse refuses extra positional words
- `src/lib/verbs/test/classify.mts`: parse ignores extra positional words
- `src/lib/verbs/test/ask.mts`: parse of the ask example
- `src/lib/util/args.mts`: `parseArgs` takes one word per flag
- `src/lib/util/vendor/shell-quote-parse.mjs`: the shell tokenizer to reuse
- `src/lib/verbs/test/record.test.mts`: how verb parse tests import
- `src/lib/hooks/lint/schema/report.test.mts`: precedent for reading skill prose

**Changes:**
- `matrix.md` step 1: the untestable example becomes a concrete command, such as `picket test note <id> T-3.1 untestable --why "fast names no number"`. Step 4: `picket test note <id> T-2.1 permission not-run --why "the endpoint has no roles"`.
- `results.md` step 1: the classify form becomes the concrete example already given in prose, `picket test classify <id> C-03 product --evidence "POST /orders with an empty basket answered 201; T-2.1 says it is refused"`. Step 3: one concrete note command; the three outcome words stay listed in prose.
- `results.md` opening paragraph: one sentence saying the text after `--why`, `--evidence`, `--question`, `--choices` and `--basis` goes in double quotes, because unquoted words are refused by `note` and cut to the first word by `classify`.
- New `src/lib/verbs/test/skill-examples.test.mts`. It reads every `.md` file under `src/skills/testing/steps/` (resolved from the working directory, as `report.test.mts:77` does), collects each backtick span and fenced line that starts with `picket test note <id> `, `picket test classify <id> ` or `picket test ask <id> ` (bare verb names in prose, such as `picket test note`, are not commands), replaces `<id>` with a valid work id, tokenizes with `parse` from the vendored shell parser, and passes the words after `picket test <verb>` through `parseArgs` and that verb's `verb.parse`. For each command it asserts the parse succeeds and that the free-text field (`why`, `evidence`, `question`) equals the double-quoted text that follows the flag in the source line.

**Done when:**
- **T-1.1** `matrix.md` and `results.md` hold no `--why <` or `--evidence <` placeholder; every note and classify command in them has `<id>` as its only placeholder and its free text in double quotes.
- **T-1.2** `results.md` says once, in its opening paragraph, that free text after a flag goes in double quotes and what happens to unquoted words.
- **T-1.3** `skill-examples.test.mts` finds at least one `note`, one `classify` and one `ask` command in the step files, so it fails if the extraction finds nothing, and every found command passes the parse and free-text assertions.
- **T-1.4** The same file holds a test that runs the benchmark's failing forms through the same check: `picket test note <id> T-1.1 permission not-run --why the request names no roles or login` throws `UsageError`, and `picket test classify <id> C-01 product --evidence POST /orders answered 500` is reported because its parsed evidence is `POST`.
- **T-1.5** `npm test` passes, including `test/repo/skills.test.mjs`, `test/timing/budgets.test.mjs` and `test/repo/dashes.test.mjs`. Run it with `TMPDIR=/tmp`: on this machine the session's `TMPDIR` lies under the home folder, and `test/cli/init.test.mjs:104` then fails on the base too (checked 2026-11-18; it passes with `TMPDIR=/tmp`).

## Phase 2: Sourced shapes, checkable doubt and edge questions

**Touch set:**
- `src/skills/testing/steps/cases.md`: new shape step before step lines
- `src/skills/testing/steps/results.md`: doubt rule, edge question, example
- `src/skills/testing/steps/matrix.md`: silent boundary cell points to results
- `src/lib/hooks/guard/blackbox/index.mts`: what Read, Grep and Glob may reach
- `src/lib/verbs/test/case.mts`: cap counts the round's total cases
- `src/lib/shared/testing/derive.mts`: test class blocks nothing alone
- `src/lib/verbs/test/ask.mts`: default needs basis, three-question cap
- `bench/lib/tester-grade.mjs`: trap tasks fail on any question
- `src/lib/verbs/test/skill-examples.test.mts`: phase 1 test pins the new example

**Changes:**
- `cases.md`: a new step before the step lines (D-002). Take each request's method, path and body fields from the brief, the request, or an unchanged document of the project (`README.md`, a `docs/` folder, an OpenAPI file): find it with Glob and open it with Read by path, since a Grep from the project root is refused. Write no field name that no source shows. The normal case of an endpoint runs first; once it passes, later cases of that endpoint keep its body and change the one value they test. Renumber the later steps.
- `results.md` step 1 (D-003): `product` needs a sourced or proven shape and the criterion's words as the expectation. A failure the tester doubts (a shape no source showed, an answer pointing at the case's own input such as a 500 or a 400 naming a field on a body it composed) is classed `test`; a corrected case follows once the shape is found, is the one exception to one case per kind, and counts against the round's cap.
- `results.md` step 4 (D-004): ask when the request gives no outcome for a business edge of a tested criterion, even when no case depends on the answer, and never leave the gap only in the block. Technical edges stay `negative` or `boundary` cases. Add one example with no default, such as `picket test ask <id> T-2.1 --question "Is a discount code worth more than the order total accepted?" --choices "yes, the total becomes 0 | no, refuse it with a 400"`. Keep the existing example with its default and basis.
- `matrix.md` step 2, `boundary`: a boundary cell the request gives no outcome for gets no case; it becomes a question, as `steps/results.md` step 4 says.

**Done when:**
- **T-2.1** `cases.md` has a step before the step lines that sources each request's method, path and body from the brief, the request or an unchanged project document found with Glob and read by path, and forbids a field name no source shows.
- **T-2.2** `cases.md` says the normal case of an endpoint runs first and that later cases of that endpoint keep its passed body and change one value.
- **T-2.3** `results.md` step 1 names the condition for `product`, classes a doubtful failure `test` with a corrected case, and says the corrected case counts against the round's cap.
- **T-2.4** `results.md` step 4 no longer holds "and a case depends on the answer", asks on a silent business edge of a tested criterion even with no dependent case, keeps technical edges as cases, and shows an ask example without `--default`.
- **T-2.5** `matrix.md` sends a boundary cell with no stated outcome to `steps/results.md` step 4 instead of a case.
- **T-2.6** None of the three step files contains `invoice` or `credit`, in any case.
- **T-2.7** `npm test` passes, including the phase 1 examples test on the new ask example, the step budget of 80 lines and the 25-word repeat check in `test/repo/skills.test.mjs`, run with `TMPDIR=/tmp` as T-1.5 says.
- **T-2.8** [DEFERRED: product owner, the next paid tester benchmark run] test-04 records no product failure and no question, test-06 records a question on T-1.1, and no `picket test note` command runs twice in any tester task.

## Open questions

- **OQ-001** The kernel still prints unquoted forms the tester may copy: `--evidence <why>` in `src/lib/shared/testing/cases.mts:76`, `src/lib/verbs/test/report.mts:27` and `src/lib/shared/route/route.mts:64`, `--why <why>` in `src/lib/verbs/test/case.mts:30`, and `--why <text>` in the note usage (`src/lib/verbs/test/note.mts:14`); and `parseClassify` (`src/lib/verbs/test/classify.mts`) silently keeps only the first word of an unquoted `--evidence`. Should a separate kernel item quote the hints and refuse extra words? Owner: product owner. Fallback: this item quotes the skill's examples only, and the kernel strings stay as they are.

## Revision log
