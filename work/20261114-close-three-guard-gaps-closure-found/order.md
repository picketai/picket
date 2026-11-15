---
kind: order
lane: order
title: Close three guard gaps closure found
date: 2026-11-14
audience: developer
sources: [request, preflight, work/20261114-a-check-for-the-guard-bypass-class/design.md, src/lib/hooks/guard/bash/in-place.mts, src/lib/hooks/guard/bash/in-place.variants.test.mts, src/lib/hooks/guard/bash/in-place.test.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/lib/shared/comments.mjs, test/support/variants.mts, test/support/hook.mts, test/repo/variants.test.mjs, scripts/replay-rejected.mjs, bench/lib/spend.mjs, bench/lib/claude.mjs, bench/run.mjs, bench/probe-ask.mjs, bench/tasks, bench/test/spend.test.mjs, bench/test/spend.variants.test.mjs, bench/test/claude.test.mjs, CONTRIBUTING.md]
phases:
  - n: 1
    files:
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
    greps:
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '--check-hash-based-pycs'
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '--experimental-loader'
      - path: src/lib/hooks/guard/bash/in-place.variants.test.mts
        pattern: '\+<src/a\.pl'
      - path: src/lib/hooks/guard/bash/in-place.variants.test.mts
        pattern: '\./x\.js'
      - path: src/lib/hooks/guard/bash/payloads.test.mts
        pattern: 'src/a\.pl'
    tests: true
    drive:
      - covers: T-1.1
        command: node scripts/replay-rejected.mjs d961c546 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains: ['in-place guard is open under as written for:']
      - covers: T-1.2
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains: ['in-place guard stays closed under as written']
  - n: 2
    files:
      - bench/lib/spend.mjs
      - bench/lib/claude.mjs
      - bench/run.mjs
      - bench/test/spend.variants.test.mjs
      - bench/test/claude.variants.test.mjs
      - bench/test/spend.test.mjs
      - bench/test/claude.test.mjs
    greps:
      - path: bench/lib/spend.mjs
        pattern: 'budget_usd needs a positive number of dollars'
      - path: bench/lib/claude.mjs
        pattern: '--max-budget-usd needs a positive number of dollars'
      - path: bench/lib/claude.mjs
        pattern: 'if \(o\.maxBudgetUsd\)'
        absent: true
      - path: bench/run.mjs
        pattern: '\bplan\.rows\b'
      - path: bench/test/claude.variants.test.mjs
        pattern: '\bclaudeArgs\b'
    tests: true
    drive:
      - covers: T-2.1
        command: node scripts/replay-rejected.mjs d961c546 bench/test/spend.variants.test.mjs bench/test/claude.variants.test.mjs
        exit_code: 1
        contains: ['runRefusal task budget_usd is open under out-of-domain numbers for:', 'claudeArgs --max-budget-usd is open under out-of-domain numbers for:']
      - covers: T-2.2
        command: node --test bench/test/spend.variants.test.mjs bench/test/claude.variants.test.mjs
        exit_code: 0
        contains: ['runRefusal task budget_usd stays closed under out-of-domain numbers', 'claudeArgs --max-budget-usd stays closed under out-of-domain numbers']
      - covers: T-2.5
        command: node bench/run.mjs --harness plugin --tasks lane:fast --runs 0 --max-usd 10 --budget-usd abc --out tmp/bench-refusal.json
        exit_code: 1
        contains: ['refused: --budget-usd needs a positive number of dollars']
---
# Order: Close three guard gaps closure found

## Problem
The closure tests of 20261114-a-check-for-the-guard-bypass-class left three gaps open at the base `d961c546` (its OQ-001 to OQ-003), and a probe on 2026-11-14 confirmed each one. `inPlaceTargets` yields no target for a Perl `open` with a `>`, `>>` or `+<` mode, nor for `python3 -X utf8`, `python3 -W ignore` or `node --require ./x.js` fed a write program on standard input, and the full `guard.bash` decision for those commands is `null` where `python3 -X utf8 -` is `deny`. In the bench, a task `budget_usd` of `0`, `-0` or `-2` passes `runRefusal`, and `claudeArgs` drops `--max-budget-usd` for `0`, `-0` and `NaN` and passes `-2` and `Infinity` through. CONTRIBUTING.md C-020 binds the method: each guard's closure test gains the seeds and fails on the base before the guard changes.

## Decisions
### D-001: Perl write modes are a second write-call shape, and a mode prefix is stripped from each literal
**Decision:** `WRITE_CALL` in `src/lib/hooks/guard/bash/in-place.mts` gains one alternative: `open`, an optional `(`, then a quoted literal that starts with `>` or with `+<` or `+>`, all within one statement (no `;`, `)` or newline between `open` and the quote). That covers the three-argument modes (`'>'`, `'>>'`, `'+<'`, `'>:encoding(UTF-8)'`), the two-argument forms (`'>src/a.pl'`, `">>src/a.pl"`, `'+<src/a.pl'`) and the paren-less `open my $f, '>', 'src/a.pl'`, and leaves `'<'` and a bare path as reads. `programWrites` then strips a leading `+<`, `+>`, `>>`, `>` or `<` from each quoted literal and drops a literal left empty, so `open(F, '>src/a.pl')` yields `src/a.pl`, not `>src/a.pl`, which `codeWriteTarget` would not see as code. A one-off probe on 2026-11-14 ran this shape on eight write and seven read programs: all writes matched, and the only false match was a newline between `open` and the literal, which the one-statement bound excludes.
**Instead of:** parsing Perl's `open` argument list by position: the guard already treats every quoted literal of a writing program as a target, so a per-language parser adds code for the same targets.
**Risks:**
- **RISK-001** `\s*` after `open` crosses a newline and flags a Python program that reads with `open` and prints `'>'` on the next line. Mitigation: the bound uses spaces and tabs only, and T-1.4 pins a two-line read program as yielding nothing.

### D-002: `readsStdin` skips a value-taking flag with its value, from a table per interpreter
**Decision:** `readsStdin` takes the interpreter root as well as the arguments. A `-` operand anywhere still reads standard input, as today. Otherwise it walks the arguments: a word in the root's value-flag set skips itself and the next word, any other word starting with `-` is skipped, and the first other word is a script file, so standard input is not the program. The table holds only flags whose `--help` on this machine lists a value and whose space-separated form was probed on 2026-11-14 with a program on standard input: `python` and `python3`: `-W`, `-X`, `--check-hash-based-pycs`; `node`: `-r`, `--require`, `--import`, `--loader`, `--experimental-loader`, `-C`, `--conditions`, `--input-type`. `-m` is not in it: it names a module, so a heredoc is not the program.
**Instead of:** treating the word after any flag as that flag's value: `node --test test/cli/close.test.mjs` would then read standard input, which the pinned negative case in `in-place.test.mts` forbids.
**Risks:**
- **RISK-002** A value flag of `ruby`, `perl`, `bun` or `deno` stays open (ruby is not installed here, so none could be probed). Mitigation: named under Scope; the closure test asks for them when a seed is added.

### D-003: The new seeds join each closure test's as-written check; the families stay as they are
**Decision:** The Perl and value-flag seeds join the as-written check of `in-place.variants.test.mts` (its seed list may be renamed, since its seeds are no longer review probes only), each spelled out in full: the `-we` cluster and the `-` operand for Perl are seeds, not family output. `test/support/variants.mts` does not change.
**Instead of:** a `perl` row in `INTERPRETER_FLAGS` and a no-`-` spelling in `stdinSpellings`: both rewrite pinned family tests (`test/repo/variants.test.mjs` T-3.3 expects `perl` to have no row, T-3.4 pins the two stdin spellings), and the brief puts family changes out of scope.

### D-004: `runRefusal` refuses a plan row whose budget is not a positive number
**Decision:** `runRefusal({ maxUsd, budgetUsd, rows, total })` takes the plan's rows and returns, in order, the `--budget-usd` refusal, then `task <id>: budget_usd needs a positive number of dollars` for the first row whose `budget` is not a number, not finite or not above 0, then the spend refusal. `bench/run.mjs` passes `rows: plan.rows`. A row's budget is `taskBudget(task, budgetUsd)`, so the check reads exactly the value each call would be capped at, and it covers every loaded task, including one whose runs are already recorded.
**Instead of:** validating `budget_usd` in `loadTasks`: that lives in `bench/run.mjs`, which runs `main()` on import, so no closure test can call it.
**Risks:**
- **RISK-003** A bad `budget_usd` in a task file passes while `--budget-usd` overrides it. Mitigation: none needed for spend, since that value is never sent; every task file today holds a positive budget (probed: 18 files, values 2 to 22).

### D-005: `claudeArgs` throws on a present budget that is not a positive finite number
**Decision:** In `bench/lib/claude.mjs`, an absent `maxBudgetUsd` (`undefined`) adds no flag, as `claudeArgs({})` does today; any other value that is not a finite number above 0 (`0`, `-0`, `NaN`, `-2`, `Infinity`, `null`) throws `--max-budget-usd needs a positive number of dollars, got <value>`, so no call goes out uncapped; a positive value pushes `--max-budget-usd <value>`. This makes `claudeArgs` a guard, so it gets its own closure test, `bench/test/claude.variants.test.mjs`.
**Instead of:** pushing the flag for every value except `undefined`: the cap would then rest on how the `claude` CLI reads `0`, `NaN` or `-2`, a contract this item has not verified.
**Risks:**
- **RISK-004** A throw mid-run ends `bench/run.mjs` through `main().catch` with exit 1 and a half-made run folder. Mitigation: `runRefusal` (D-004) and `callLimit` keep every limit positive and finite, so the throw only backs them up; `bench/probe-ask.mjs` passes `0.05`.

## Scope
**In:**
- `WRITE_CALL`, the mode strip in `programWrites`, and `readsStdin` in `src/lib/hooks/guard/bash/in-place.mts`.
- The task budget refusal in `runRefusal`, its call in `bench/run.mjs`, and the per-call cap in `claudeArgs`.
- New seeds in `in-place.variants.test.mts` and `spend.variants.test.mjs`, and the new `claude.variants.test.mjs`, each failing on `d961c546`.

**Out:**
- Value flags of `ruby`, `perl`, `bun` and `deno`; Perl writes through `sysopen`, `IO::File` or a path held in a variable (no literal to target).
- Any change to `test/support/variants.mts` or its families.
- The env verbs and saved scenarios (TF-003).

## Phase 1: The in-place guard sees Perl write modes and skips value flags
**Touch set:**
- `src/lib/hooks/guard/bash/in-place.mts`: WRITE_CALL, mode strip, readsStdin
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: new as-written seeds
- `src/lib/hooks/guard/bash/in-place.test.mts`: exact targets and negatives
- `src/lib/hooks/guard/bash/payloads.test.mts`: full guard denial cases
- `src/lib/hooks/guard/bash/payloads.mts`: read only, codeWriteTarget
- `src/lib/shared/comments.mjs`: read only, `.pl` is code
- `test/support/variants.mts`: read only, asWritten and Invocation
- `test/support/hook.mts`: read only, guardOutput helper
- `scripts/replay-rejected.mjs`: read only, base replay

**Changes:** First add the seeds, then change the guard (D-003). The as-written check of `in-place.variants.test.mts` gains, as `inline("perl", "-e", …)` invocations, the three-argument programs with `'>'`, `">>"` and `'+<'`, the two-argument programs `'>src/a.pl'`, `">>src/a.pl"` and `'+<src/a.pl'`, the paren-less `open my $f, '>', 'src/a.pl'`, the same three-argument `'>'` program under `-we`, and that program fed on standard input to `perl -`; and, fed the existing write programs on standard input with no `-`, `python3 -X utf8`, `python3 -W ignore` and `node --require ./x.js`. Then apply D-001 and D-002 in `in-place.mts`; `programText` passes the root to `readsStdin`. `in-place.test.mts` and `payloads.test.mts` gain the cases in T-1.3 to T-1.5; their existing cases are not edited.

**Done when:**
- **T-1.1** `node scripts/replay-rejected.mjs d961c546 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 and prints `in-place guard is open under as written for:`, followed by the new seeds' labels: the seeds fail on the base.
- **T-1.2** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0, with the seeds listed in **Changes** in its as-written check and the program-flag and stdin checks unchanged.
- **T-1.3** `inPlaceTargets(["perl", "-e", "open(F, '>src/a.pl')"], [])` and `inPlaceTargets(["perl", "-e", "open(my $f, '+<', 'src/a.pl')"], [])` each return exactly `["src/a.pl"]`.
- **T-1.4** These return `[]`: a Perl `-e` program `open(my $f, '<', 'src/a.pl')`; one `open(F, 'src/a.pl')`; `python3 -` fed `s=open('src/a.py').read()` and `print('>')` on two lines; `python3 -m mod`, `node -r ./x.js script.js` and `node --test test/cli/close.test.mjs`, each fed a write program on standard input.
- **T-1.5** In `payloads.test.mts`, `guardOutput` denies, for the lead, naming the path in `CODE_WRITE_DENIAL`: `perl -e 'open(my $f, ">", "src/a.pl")'` and `perl -e "open(F, '>src/a.pl')"` (`src/a.pl`), `python3 -W ignore` with a quoted heredoc writing `src/a.py`, and `node --require ./x.js` with a quoted heredoc writing `src/a.ts`; each returns `null` on the base (probed 2026-11-14).
- **T-1.6** `npm test` exits 0.

## Phase 2: The bench refuses a non-positive task budget and never sends an uncapped call
**Touch set:**
- `bench/lib/spend.mjs`: task budget refusal in runRefusal
- `bench/lib/claude.mjs`: claudeArgs keeps or refuses cap
- `bench/run.mjs`: pass plan rows at line 321
- `bench/test/spend.variants.test.mjs`: task budget closure, new signature
- `bench/test/claude.variants.test.mjs`: new claudeArgs closure test
- `bench/test/spend.test.mjs`: task refusal unit cases
- `bench/test/claude.test.mjs`: cap flag unit cases
- `bench/probe-ask.mjs`: read only, passes 0.05
- `test/support/variants.mts`: read only, outOfDomainNumbers
- `scripts/replay-rejected.mjs`: read only, base replay

**Changes:** First the closure tests. `spend.variants.test.mjs` gains a closure `runRefusal task budget_usd`: its run plans the one task with the spelled `budget_usd` and no `--budget-usd` through `plannedSpend`, then calls `runRefusal` with `maxUsd: 100`, the plan's rows and total; closed when the result is a string; `outOfDomainNumbers` on seed 2. The two existing closures pass `rows` (the `--max-usd` one passes `rows: []`). The new `claude.variants.test.mjs` holds a closure `claudeArgs --max-budget-usd`, closed when `claudeArgs({ maxBudgetUsd })` throws, `outOfDomainNumbers` on seed 2. Then apply D-004 in `spend.mjs` and `run.mjs`, and D-005 in `claude.mjs`.

**Done when:**
- **T-2.1** `node scripts/replay-rejected.mjs d961c546 bench/test/spend.variants.test.mjs bench/test/claude.variants.test.mjs` exits 1 and prints `runRefusal task budget_usd is open under out-of-domain numbers for:` and `claudeArgs --max-budget-usd is open under out-of-domain numbers for:`.
- **T-2.2** `node --test bench/test/spend.variants.test.mjs bench/test/claude.variants.test.mjs` exits 0 with four tests: the two existing `runRefusal` closures, `runRefusal task budget_usd stays closed under out-of-domain numbers` and `claudeArgs --max-budget-usd stays closed under out-of-domain numbers`.
- **T-2.3** With no `--budget-usd`, `runRefusal` on the plan of `{ id: "fast-a", lane: "fast", budget_usd: 0 }` returns `task fast-a: budget_usd needs a positive number of dollars`, and the same for `budget_usd: "2"`; with `--budget-usd 3` the same task plan is not refused.
- **T-2.4** `claudeArgs({ maxBudgetUsd: 2 })` holds `--max-budget-usd` followed by `2`; `claudeArgs({})` holds no `--max-budget-usd`; `claudeArgs({ maxBudgetUsd: null })` throws `--max-budget-usd needs a positive number of dollars`.
- **T-2.5** `node bench/run.mjs --harness plugin --tasks lane:fast --runs 0 --max-usd 10 --budget-usd abc --out tmp/bench-refusal.json` exits 1 and prints `refused: --budget-usd needs a positive number of dollars`: the flag refusal still comes first.
- **T-2.6** `bench/run.mjs` decides a real run's refusal only through `runRefusal`, now passed `plan.rows`, and the existing tests of `bench/test/spend.test.mjs` and `bench/test/claude.test.mjs` pass with their assertions unedited.
- **T-2.7** `npm test` exits 0.

## Open questions
none

## Revision log
