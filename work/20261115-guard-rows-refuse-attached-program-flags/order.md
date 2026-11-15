---
kind: order
lane: order
title: Guard rows refuse attached program flags
date: 2026-11-15
audience: developer
sources: work/20261115-guard-rows-refuse-attached-program-flags/request.md; preflight.txt; work/20261115-in-place-guard-covers-more-interpreters/reviews/cumulative.md; work/20261115-in-place-guard-covers-more-interpreters/order.md; work/20261115-in-place-guard-covers-more-interpreters/mutation.json; src/lib/hooks/guard/bash/in-place.mts; src/lib/hooks/guard/bash/interpreters.mts; src/lib/hooks/guard/bash/in-place.test.mts; src/lib/hooks/guard/bash/in-place.variants.test.mts; src/lib/hooks/guard/bash/payloads.test.mts; src/lib/hooks/guard/bash/payloads.mts; src/lib/util/vendor/shell-quote-parse.mjs; src/lib/shared/comments.mjs; test/support/variants.mts; test/repo/variants.test.mjs; scripts/replay-rejected.mjs; CONTRIBUTING.md (## Guards); scratch probes of inPlaceTargets, guardOutput and a mutated export of 3ace7e50, run 2026-11-15
phases:
  - n: 1
    files:
      - src/lib/hooks/guard/bash/in-place.test.mts
    tests: true
    drive:
      - covers: T-1.1
        command: node --test src/lib/hooks/guard/bash/in-place.test.mts
        exit_code: 0
        contains:
          - "deno eval takes the word after the subcommand as the program"
      - covers: T-1.3
        command: git diff 3ace7e50 -- src/lib/hooks/guard/bash/in-place.test.mts | grep -c '^-[^-]'
        exit_code: 1
  - n: 2
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - src/lib/hooks/guard/bash/interpreters.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
    greps:
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\bexport function attachedValue\b'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\bprogramFlags\b'
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '\battachedValue\('
    tests: true
    drive:
      - covers: T-2.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under program flag spellings"
          - "in-place guard stays closed under as written"
      - covers: T-2.2
        command: node scripts/replay-rejected.mjs 3ace7e50 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under program flag spellings for:"
          - 'php -rfile_put_contents("src/a.ts", "x");'
          - 'lua -eio.open("src/a.ts","w"):write("x")'
          - 'awk --source=BEGIN { print "x" > "src/a.ts" }'
          - 'awk -eBEGIN { print "x" > "src/a.ts" }'
          - "in-place guard is open under as written for:"
          - 'Rscript -ewriteLines("x", "src/a.ts")'
          - "gawk -i inplace -e{ print } src/a.ts"
      - covers: T-2.7
        command: git diff 3ace7e50 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts test/repo/variants.test.mjs | grep -c '^-[^-]'
        exit_code: 1
  - n: 3
    files:
      - src/lib/hooks/guard/bash/interpreters.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
    greps:
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: 'programOperand\s*:\s*\{'
        absent: true
    tests: true
    drive:
      - covers: T-3.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under as written"
      - covers: T-3.2
        command: node scripts/replay-rejected.mjs 3ace7e50 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under as written for:"
          - 'gawk --file=/dev/stdin << BEGIN { print "x" > "src/a.ts" }'
          - 'gawk -f/dev/stdin << BEGIN { print "x" > "src/a.ts" }'
          - 'R --no-save -f /dev/stdin << writeLines("x", "src/a.ts")'
          - "gawk -i inplace --file=fix.awk src/a.ts"
      - covers: T-3.6
        command: git diff 3ace7e50 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts test/repo/variants.test.mjs | grep -c '^-[^-]'
        exit_code: 1
---
# Order: Guard rows refuse attached program flags

## Problem
The php, lua, R and awk rows of the in-place guard (`src/lib/hooks/guard/bash/interpreters.mts:90-100`) match a program flag only as a whole word (`exactly(...)`), and awk's script flags only as a whole word (`in-place.mts:37`). A probe of `inPlaceTargets` and `guardOutput` at `3ace7e50` confirmed every command the request names passes: `php -r'...'`, `lua -e'...'`, `gawk -e'...'`, `gawk --source='...'`, `gawk --file=/dev/stdin` and `R --no-save -f /dev/stdin` fed a write; the shell parser (`shell-quote-parse.mjs`) hands the guard `-rfile_put_contents(...)` as one word, and `.r` is a code extension in `LANGS`. Separately, the mutant `!==` to `===` in `inlineProgram`'s subcommand test survived because the only deno test is also caught by the here-string fallback. Binding constraints: C-020 (seeds fail first, the closure test stays closed), no guard removed or weakened, and the earlier item's decisions (D-001 table columns, D-003 the six older rows unchanged) stand.

## Decisions

### D-001: One flag list per row yields the separate and the attached spelling
**Decision:** `interpreters.mts` exports `attachedValue(word: string, flags: readonly string[]): string | undefined`: for a listed long flag `--x` it returns the text after `--x=`, for a listed two-character flag `-x` the text after `-x`, and `undefined` when nothing is attached. The php, lua, R and awk rows gain an optional `programFlags: readonly string[]` column, and their `takesProgram` is built from that same list, so one list per row holds the flags (`-r -B -R -E`, `-e`, `-e`, `-e --source`). `inlineProgram` takes the first attached value after today's `--eval=`/`--print=` check and before the separate-word scan; `awkFileOperands` counts an attached program flag as giving the program. The python, node, perl, ruby, bun and deno rows set no `programFlags` and behave as today (earlier D-003). The column is optional, as the earlier D-001's RISK-001 mitigation allows.
**Instead of:** dropping the `\b` from the php and lua write calls so the here-string fallback catches `-rfile_put_contents(`: awk returns before that fallback (`in-place.mts:47`), and R's `writeLines` would need the same edit, so each row would need its own workaround.
**Risks:**
- **RISK-001** A word that only begins with a listed flag letter is read as a program (`php -Rfoo` where `foo` was meant otherwise). Mitigation: the program must still hold the row's write call and a literal resolving to a code file, so the worst case is a refusal, never a pass.

### D-002: Script flags become a row column that awk and R both read
**Decision:** `scriptFlags?: readonly string[]` moves from `programOperand` to the row; `programOperand` becomes a marker (`true`) with the same meaning as before, "the first operand is the program". awk keeps `-f --file -E`; R gains `-f --file`. A script flag whose value, separate (`-f /dev/stdin`), attached (`-f/dev/stdin`) or after `=` (`--file=/dev/stdin`), is `-` or `/dev/stdin` makes the heredoc the program. Any other value keeps today's outcome, so no refusal is lost: `R --file=fix.R` fed a write stays refused, `R -f fix.R` fed a write stays allowed. `awkFileOperands` counts an attached script flag as giving the program.
**Instead of:** reading `/dev/stdin` anywhere in the arguments as standard input for every row: it changes the python and node rows, which the earlier D-003 keeps as they are, and `python3 /dev/stdin` is outside this brief.
**Risks:**
- **RISK-002** The hoist edits awk's operand path, which the earlier item's tests pin. Mitigation: no line of the base unit tests is removed (T-3.6), and the awk seeds of the earlier item stay in the closure test.

### D-003: The closure flag table opts a row into the attached spelling
**Decision:** In `test/support/variants.mts`, `InterpreterFlags` gains an optional `attached: true` and its `clusterLetter` becomes optional; `programFlagSpellings` spells, in order, the long form and `long=program`, then `flag+program` when `attached` is set, then the cluster when a letter is given, then the leading flags. New rows: `php: { long: {}, attached: true, leading: ["-c", "php.ini"] }`, `lua: { long: {}, attached: true, leading: ["-l", "mod"] }`, `awk: { long: { "-e": "--source" }, attached: true, leading: ["-F", ":"] }`. A run of these spellings against `3ace7e50` found exactly the four open ones T-2.2 names; every leading and separate spelling is closed today.
**Instead of:** spelling the attached form for every row: `test/repo/variants.test.mjs:107-118` pins the node and python3 lists exactly, so those base assertions would change, and node's attached `-e` form is not one this item needs.

### D-004: The deno test puts a program flag after the program
**Decision:** A unit test in `in-place.test.mts` asserts `inPlaceTargets(["deno", "eval", "require('fs').writeFileSync('src/a.ts','x')", "-p", "1"], [])` equals `["fs", "src/a.ts", "x"]`. With the subcommand test inverted, `-p` is read as the program flag and `1` as the program, so the result is `[]`; a run on a mutated export of `3ace7e50` gave `[]`, and the unmutated tree gave the three literals. It goes first so phase 2's edit of `inlineProgram` runs under it.
**Instead of:** a closure seed for `deno eval ... -p 1`: the request asks for a unit test, and the exact list pins more than "some target starts with `src/a.`".

## Scope
**In:**
- attached and `=` program flags for the php, lua, R and awk rows; attached and `=` script flags for awk and R
- awk in-place file operands after an attached program or script flag
- the closure helper's flag table (`attached`, optional cluster letter, php, lua, awk rows) and its helper tests
- closure seeds, unit tests in `in-place.test.mts`, end-to-end cases in `payloads.test.mts`

**Out:**
- new interpreter rows, and the limits `CONTRIBUTING.md` names (piped-in programs, interpreters with no row)
- flag clusters that end in an attached program (OQ-002), `python3 /dev/stdin` (OQ-002)
- the six older rows, `CONTRIBUTING.md`, any other guard

## Phase 1: Pin the deno eval branch
**Touch set:**
- `src/lib/hooks/guard/bash/in-place.test.mts`: add the deno subcommand test

**Changes:** Add one test named "deno eval takes the word after the subcommand as the program" with the assertion D-004 gives. No production file changes.

**Done when:**
- **T-1.1** `node --test src/lib/hooks/guard/bash/in-place.test.mts` exits 0 and runs a test named "deno eval takes the word after the subcommand as the program", which asserts `deepEqual` to `["fs", "src/a.ts", "x"]` for `deno eval "require('fs').writeFileSync('src/a.ts','x')" -p 1`.
- **T-1.2** In a scratch export of the phase tree with `family.subcommand !== undefined` changed to `family.subcommand === undefined` in `in-place.mts`, that test fails.
- **T-1.3** `git diff 3ace7e50 -- src/lib/hooks/guard/bash/in-place.test.mts | grep -c '^-[^-]'` exits 1 (no base line removed), and `npm test` passes.

## Phase 2: Attached program flags for php, lua, R and awk
**Touch set:**
- `test/support/variants.mts`: `attached`, optional cluster, three rows
- `test/repo/variants.test.mjs`: helper tests for the new spelling
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: red seeds first
- `src/lib/hooks/guard/bash/interpreters.mts`: `programFlags`, `attachedValue`, awk operands
- `src/lib/hooks/guard/bash/in-place.mts`: `inlineProgram` reads attached values
- `src/lib/hooks/guard/bash/in-place.test.mts`: attached writes and reads
- `src/lib/hooks/guard/bash/payloads.test.mts`: request's commands denied

**Changes:** First the helper and seeds, then the replay (T-2.2), then the guard.
- Helper per D-003. The `programFlagSpellings` check gains seeds `inline("php", "-r", PHP_WRITE)`, `inline("lua", "-e", LUA_WRITE)` and `inline("awk", "-e", AWK_WRITE)`. The as-written seeds gain `inline("Rscript", `-e${R_WRITE}`)` and `inline("gawk", "-i", "inplace", "-e{ print }", "src/a.ts")`.
- Guard per D-001: `attachedValue` and `programFlags` in `interpreters.mts`, the php, lua, R and awk rows build `takesProgram` and `programFlags` from one list (`exactly` goes if nothing else uses it), `inlineProgram` and `awkFileOperands` read attached values.

**Done when:**
- **T-2.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds above in the program flag spellings and as-written checks.
- **T-2.2** `node scripts/replay-rejected.mjs 3ace7e50 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming `php -rfile_put_contents(`, `lua -eio.open(`, `awk --source=BEGIN`, `awk -eBEGIN`, `Rscript -ewriteLines(` and `gawk -i inplace -e{ print } src/a.ts`.
- **T-2.3** `test/repo/variants.test.mjs` asserts the labels of `programFlagSpellings` for `awk -e P` are `["awk --source P", "awk --source=P", "awk -eP", "awk -F : -e P"]` and for `php -r P` are `["php -rP", "php -c php.ini -r P"]`.
- **T-2.4** A unit test asserts `inPlaceTargets` includes `src/a.ts` for `php -c php.ini -rfile_put_contents("src/a.ts","x");`, `lua -l mod -eio.open("src/a.ts","w"):write("x")` and `gawk -F : --source=BEGIN { print "x" > "src/a.ts" }`, and equals `["src/a.ts"]` for `gawk -i inplace -e{ print } src/a.ts`.
- **T-2.5** A unit test asserts `inPlaceTargets` returns `[]` for `php -recho file_get_contents("src/a.ts");`, `lua -eio.open("src/a.ts","r")` and `gawk -e{ print } src/a.ts`.
- **T-2.6** `payloads.test.mts` asserts `guardOutput` denies `php -r'file_put_contents("src/a.ts","x");'`, `lua -e'io.open("src/a.ts","w"):write("x")'`, `gawk -e'BEGIN { print "x" > "src/a.ts" }'` and `gawk --source='BEGIN { print "x" > "src/a.ts" }'` to the lead and to `picket:developer`, the reason starting with `CODE_WRITE_DENIAL("src/a.ts")`.
- **T-2.7** `git diff 3ace7e50 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts test/repo/variants.test.mjs | grep -c '^-[^-]'` exits 1, and `npm test` passes.

## Phase 3: Script flags that read standard input for awk and R
**Touch set:**
- `src/lib/hooks/guard/bash/interpreters.mts`: hoist `scriptFlags`, R row, awk operands
- `src/lib/hooks/guard/bash/in-place.mts`: stdin script in every spelling
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: red seeds first
- `src/lib/hooks/guard/bash/in-place.test.mts`: stdin, named script, kept refusal
- `src/lib/hooks/guard/bash/payloads.test.mts`: request's heredoc commands denied

**Changes:** Seeds first, replay red (T-3.2), then the guard per D-002. As-written seeds: `fedOnStdin(AWK_WRITE, "gawk", "--file=/dev/stdin")`, `fedOnStdin(AWK_WRITE, "gawk", "-f/dev/stdin")`, `fedOnStdin(R_WRITE, "R", "--no-save", "-f", "/dev/stdin")`, `inline("gawk", "-i", "inplace", "--file=fix.awk", "src/a.ts")`. In the guard: `scriptFlags` on the row, `programOperand: true` for awk, R's `-f` and `--file`; `operandProgram` and `readsStdin` take a script flag's value in all three spellings through `attachedValue`; `awkFileOperands` counts an attached script flag as giving the program.

**Done when:**
- **T-3.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds above in the as-written check.
- **T-3.2** `node scripts/replay-rejected.mjs 3ace7e50 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming `gawk --file=/dev/stdin`, `gawk -f/dev/stdin`, `R --no-save -f /dev/stdin` and `gawk -i inplace --file=fix.awk src/a.ts`.
- **T-3.3** A unit test asserts `inPlaceTargets` returns `[]` for `R -f fix.R` and `gawk --file=fix.awk`, each fed `writeLines("x", "src/a.ts")` or the awk write, and for `gawk -ffix.awk src/a.ts`; and includes `src/a.ts` for `R --file=fix.R` fed `writeLines("x", "src/a.ts")` (the kept refusal of D-002).
- **T-3.4** A unit test asserts `gawk -i inplace --file=fix.awk src/a.ts src/b.ts` yields `["src/a.ts", "src/b.ts"]`, and `R -f -` fed `writeLines("x", "src/a.ts")` includes `src/a.ts`.
- **T-3.5** `payloads.test.mts` asserts `guardOutput` denies `gawk --file=/dev/stdin` fed `BEGIN { print "x" > "src/a.ts" }` (naming `src/a.ts`) and `R --no-save -f /dev/stdin` fed `writeLines("x", "src/a.R")` (naming `src/a.R`), each in a quoted heredoc, to the lead and to `picket:developer`.
- **T-3.6** `interpreters.mts` holds no `programOperand: {`; `git diff 3ace7e50 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts test/repo/variants.test.mjs | grep -c '^-[^-]'` exits 1; `npm test` passes.

## Open questions
- **OQ-001** php, lua, gawk and R are not installed here, so their attached and `=` spellings (`php -r<code>`, `lua -e<code>`, `gawk -f/dev/stdin`, `R -f /dev/stdin`) come from the review's probe and the manuals, not a run; `Rscript` may reject `-e<code>`. Owner: QA. Fallback: refuse them all; refusing a spelling an interpreter rejects costs nothing.
- **OQ-002** Two spellings stay open after this item: a cluster ending in an attached program (`php -nr'file_put_contents("src/a.ts","x");'`, `gawk -be'...'`) and `python3 /dev/stdin` fed a write (probed open at `3ace7e50`). The brief names attached and `=` flags on four rows only. Owner: product owner. Fallback: left open and unnamed in `CONTRIBUTING.md`, which this brief puts out of scope; a later item can add cluster letters to the php and awk flag rows.

## Revision log
