---
kind: order
lane: order
title: In-place guard covers more interpreters
date: 2026-11-15
audience: developer
sources: work/20261115-in-place-guard-covers-more-interpreters/request.md; preflight.txt; src/lib/hooks/guard/bash/in-place.mts; src/lib/hooks/guard/bash/in-place.test.mts; src/lib/hooks/guard/bash/in-place.variants.test.mts; src/lib/hooks/guard/bash/payloads.mts; src/lib/hooks/guard/bash/payloads.test.mts; src/lib/shared/shell/kernel-call.mts; test/support/variants.mts; test/support/hook.mts; scripts/replay-rejected.mjs; src/lib/verbs/drive/run.mts; CONTRIBUTING.md (## Guards); scratch probes of guardBash and closureTests run 2026-11-15
phases:
  - n: 1
    files:
      - src/lib/hooks/guard/bash/interpreters.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
      - test/support/variants.mts
      - CONTRIBUTING.md
    greps:
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\bnodejs\b'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\bpypy\b'
      - path: test/support/variants.mts
        pattern: 'export const interpreterNames\b'
      - path: src/lib/hooks/guard/bash/in-place.variants.test.mts
        pattern: '\binterpreterNames\b'
      - path: CONTRIBUTING.md
        pattern: '\binterpreterNames\b'
    tests: true
    drive:
      - covers: T-1.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under interpreter names"
      - covers: T-1.2
        command: node scripts/replay-rejected.mjs 845a1408 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under interpreter names for:"
          - "python3.14 -c open("
          - "pypy3 -c open("
          - "nodejs -e require("
          - "ruby3.3 -e File.write("
      - covers: T-1.6
        command: git diff 845a1408 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'
        exit_code: 1
  - n: 2
    files:
      - src/lib/hooks/guard/bash/interpreters.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
      - test/support/variants.mts
    greps:
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: 'file_put_contents'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: 'io.?\.open'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: 'writeLines'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\brscript\b'
    tests: true
    drive:
      - covers: T-2.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under as written"
          - "in-place guard stays closed under interpreter names"
      - covers: T-2.2
        command: node scripts/replay-rejected.mjs 845a1408 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under as written for:"
          - "php -r file_put_contents("
          - "lua -e io.open("
          - "Rscript -e writeLines("
          - "php8.3 -r file_put_contents("
  - n: 3
    files:
      - src/lib/hooks/guard/bash/interpreters.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
      - test/support/variants.mts
      - CONTRIBUTING.md
    greps:
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\bgawk\b'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\btclsh\b'
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\binplace\b'
      - path: CONTRIBUTING.md
        pattern: 'in-place guard'
    tests: true
    drive:
      - covers: T-3.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under as written"
          - "in-place guard stays closed under interpreter names"
      - covers: T-3.2
        command: node scripts/replay-rejected.mjs 845a1408 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "awk BEGIN { print \"x\" > \"src/a.ts\" }"
          - "gawk -i inplace"
          - "tclsh << set f [open src/a.ts w]"
---
# Order: In-place guard covers more interpreters

## Problem
The in-place guard (`src/lib/hooks/guard/bash/in-place.mts`) names seven interpreters by exact program name, gives them one shared write regex, and finds the program only behind a flag or on standard input. A probe of `guardBash` on base `845a1408` confirmed every case the request names passes for the lead and for `picket:developer` alike: `php -r`, a php heredoc, `lua -e`, `lua5.4 -e`, `awk`, `gawk`, `mawk` with `>` or `>>` inside the program, `gawk -i inplace`, a tclsh heredoc with `open src/a.ts w`, `Rscript -e writeLines(...)`, and `python3.14 -c`, `pypy3 -c`, `py -3 -c`, `nodejs -e`, `ruby3.3 -e`; `env python3 -c` is already denied. The binding constraints are the brief's scope, C-020 (each new guard input gets closure seeds that fail first), and "no guard is removed or weakened".

## Decisions

### D-001: A table of interpreter families
**Decision:** A new module `src/lib/hooks/guard/bash/interpreters.mts` exports one `Family` row per interpreter family and a `familyOf(root)` lookup; `in-place.mts` keeps the extraction and reads every per-language fact from the row. A row carries: `names` (base names and aliases), `takesProgram(word)` (the flags that carry an inline program), `programOperand` (the first operand is the program, for awk), `subcommand` (deno's `eval`), `valueFlags` (flags whose next word is a value, not a script), `inPlace(args)` (file operands an in-place flag edits, for perl, ruby and gawk), `writeCall` (a regex whose match makes every quoted literal of the program a candidate target, today's rule) and `namedTarget` (an optional global regex whose group 1 is the target, for tcl's unquoted path). `INTERPRETERS`, `IN_PLACE_EDITORS` and `VALUE_FLAGS` fold into the rows. This is the table the request asks for: awk's program sits in an operand and tcl's path is unquoted, so neither fits a name list.
**Instead of:** adding names to `INTERPRETERS` and alternatives to the shared `WRITE_CALL`: awk's `> "path"` form would then apply to every language, and awk's operand program and tcl's unquoted path still need special cases outside any list.
**Risks:**
- **RISK-001** The table grows a column only one row uses. Mitigation: a column is optional and absent means "none"; only `programOperand`, `subcommand`, `inPlace` and `namedTarget` are optional.

### D-002: Names resolve by base name plus an optional version suffix
**Decision:** `familyOf` lowercases the normalised root, matches it against `^([a-z]+?)(?:-?\d+(?:\.\d+)*[a-z]?)?$`, and looks the captured base up in the rows' `names`. A one-off run of that rule gave: `python3`, `python3.14`, `python3.14t` to `python`; `pypy3` to `pypy`; `ruby3.3` to `ruby`; `perl5.40` to `perl`; `lua5.4` to `lua`; `php8.3` to `php`; `tclsh8.6` to `tclsh`; `nodejs`, `luajit`, `py`, `gawk`, `rscript` to themselves; `python3-config`, `node-gyp` to no match; `nodemon`, `pydoc` to bases no row names. Aliases are explicit names: python lists `python`, `pypy`, `py`; node lists `node`, `nodejs`; awk lists `awk`, `gawk`, `mawk`, `nawk`; lua lists `lua`, `luajit`.
**Instead of:** listing every versioned name: the set is unbounded (each minor release, free-threaded `t` builds), so a list is stale on the next Python release.
**Risks:**
- **RISK-002** A non-interpreter whose name is a base plus digits resolves to a family (`r2`, radare2, resolves to `r`). Mitigation: a family match alone denies nothing; the program must also hold the row's write form and a literal that `codeWriteTarget` resolves to a code file.

### D-003: The seven existing families keep today's decisions
**Decision:** python, node, perl, ruby, bun and deno rows carry today's `WRITE_CALL`, `PROGRAM_CLUSTER`, `EDITOR_PROGRAM_CLUSTER`, `PROGRAM_LONG_FLAGS`, `ATTACHED_PROGRAM` and value flag sets as they are; only php, lua, R, awk and tcl rows get new write forms. The before-image is `in-place.test.mts`, `in-place.variants.test.mts` and `payloads.test.mts` at base `845a1408`: their existing tests keep passing with no line removed.
**Instead of:** a precise write form per language for all rows: it changes decisions the earlier guard items recorded and widens the item past the brief.

### D-004: The interpreter list stays open, and CONTRIBUTING names the limit
**Decision:** The guard refuses only interpreters its table names, and only through the write forms each row lists. Phase 3 adds a bullet under `## Guards` in `CONTRIBUTING.md` saying so and naming what passes: an interpreter with no row (`julia -e 'write("src/a.ts", "x")'` passed the probe), a write API outside a row's forms (`shutil.copy('x.txt', 'src/a.py')` passed), a program piped in from another command (`echo "..." | python3` passed), and a program that shells out.
**Instead of:** refusing any command that carries an inline program flag and a quoted code path: `grep -e 'src/a.ts'` and `jq -e` match that shape, so reads would be denied.

### D-005: An interpreter names family in the closure helper
**Decision:** `test/support/variants.mts` gains `interpreterNames: Family<Invocation>`, which spells a seed's `argv[0]` from a table of real names: its row of versioned names and aliases, `/usr/bin/<name>`, and `<name>.exe`. It throws for a name with no row, as `flagsOf` does. Rows: `python3` (`python3.14`, `python3.14t`, `pypy3`, `py`), `node` (`nodejs`), `ruby` (`ruby3.3`), `perl` (`perl5.40`); phase 2 adds `php` (`php8.3`), `lua` (`lua5.4`, `luajit`); phase 3 adds `awk` (`gawk`, `mawk`, `nawk`), `tclsh` (`tclsh8.6`). C-020 asks a guard over a grammar no family covers to add the family, and the program name is that grammar.
**Instead of:** versioned names as `asWritten` seeds only: each new interpreter seed would need its own name seeds written by hand, and a forgotten one stays open.

## Scope
**In:**
- the family table and name lookup, the in-place guard's use of it
- php, lua, R and Rscript, awk (gawk, mawk, nawk), tclsh rows
- closure seeds, the `interpreterNames` family, unit tests in `in-place.test.mts` and `payloads.test.mts`
- the `## Guards` family list line and the limit bullet in `CONTRIBUTING.md`

**Out:**
- cp, mv, dd, curl, editors, and any other guard
- script files run by path, and programs piped in from another command (named as a limit, not closed)
- new write forms for the seven existing families

## Phase 1: Family table and versioned names
**Touch set:**
- `src/lib/hooks/guard/bash/interpreters.mts`: new family table, `familyOf`
- `src/lib/hooks/guard/bash/in-place.mts`: read facts from the row
- `src/lib/hooks/guard/bash/in-place.test.mts`: name resolution unit tests
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: red seeds, new family check
- `src/lib/hooks/guard/bash/payloads.test.mts`: end-to-end denial cases
- `test/support/variants.mts`: add `interpreterNames` family
- `CONTRIBUTING.md`: family list names `interpreterNames`

**Changes:** First, add `interpreterNames` (D-005) and a check `{ family: interpreterNames, seeds: [...] }` in the variants test with seeds `python3 -c PYTHON_WRITE`, `node -e NODE_WRITE`, `ruby -e RUBY_WRITE`, `perl -e PERL_WRITE`, and run the replay (T-1.2) before touching the guard. Then create `interpreters.mts` with rows for python, node, perl, ruby, bun and deno per D-001 and D-003, and `familyOf` per D-002; `inPlaceTargets` calls `familyOf(normalizeRoot(first).toLowerCase())` and returns `[]` on no row. Add the python alias `py` (its `-3` and `-3.12` flags start with `-`, so the existing scan skips them). In `CONTRIBUTING.md`, the "interpreter arguments" bullet names `interpreterNames` beside `programFlagSpellings` and `stdinSpellings`.

**Done when:**
- **T-1.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 and runs a test named "in-place guard stays closed under interpreter names".
- **T-1.2** `node scripts/replay-rejected.mjs 845a1408 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 and names `python3.14 -c`, `pypy3 -c`, `nodejs -e` and `ruby3.3 -e` under "interpreter names".
- **T-1.3** A unit test asserts `inPlaceTargets` includes `src/a.py` for `python3.14 -c`, `python3.14t -c`, `pypy3 -c` and `py -3 -c` with `open('src/a.py','w').write('x')`, and `["src/a.rb"]` for `ruby3.3 -i fix.rb src/a.rb`.
- **T-1.4** A unit test asserts `inPlaceTargets` returns `[]` for `nodemon -e ts src/a.ts`, `python3-config --cflags`, and `pydoc` with a write heredoc.
- **T-1.5** `payloads.test.mts` asserts `guardOutput` denies `python3.14 -c "open('src/a.py','w').write('x')"` and `nodejs -e "require('fs').writeFileSync('src/a.ts','x')"` to the lead and to `picket:developer`, the reason starting with `CODE_WRITE_DENIAL` of the path.
- **T-1.6** `git diff 845a1408 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'` exits 1 (no line of the base tests removed), and `npm test` passes.
- **T-1.7** `CONTRIBUTING.md` names `interpreterNames` in the `## Guards` family list.

## Phase 2: php, lua and R rows
**Touch set:**
- `src/lib/hooks/guard/bash/interpreters.mts`: php, lua, R rows
- `src/lib/hooks/guard/bash/in-place.test.mts`: reads and value flags
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: php, lua, R seeds
- `src/lib/hooks/guard/bash/payloads.test.mts`: end-to-end denial cases
- `test/support/variants.mts`: `php` and `lua` name rows

**Changes:** Seeds first, replay red (T-2.2), then the rows. All three rows take the program behind a flag or on standard input, so they reuse the existing program and stdin logic with their own values:
- php: names `php`; program flags exactly `-r`, `-B`, `-R`, `-E`; value flags `-c`, `-d`, `-z`; write call `file_put_contents\(` or `fopen\(` with a quoted mode starting `w`, `a`, `x` or `c`.
- lua: names `lua`, `luajit`; program flag `-e`; value flag `-l`; write call `io\.open\(` with a quoted mode starting `w` or `a`, or `io\.output\(`.
- R: names `r`, `rscript`; program flag `-e`; write call `writeLines\(`, `writeChar\(`, `writeBin\(`, `write(?:\.\w+)?\(`, `sink\(`, `cat\([^)]*\bfile\s*=`, or `file\(` with a quoted `w` or `a` mode.

As-written seeds: `php -r 'file_put_contents("src/a.ts", "x");'`, `php -r '$f = fopen("src/a.ts", "w");'`, `php` fed `<?php file_put_contents('src/a.ts', 'x');`, `php -c php.ini` fed the same, `lua -e 'io.open("src/a.ts","w"):write("x")'`, `lua -e 'io.output("src/a.ts")'`, `lua -` fed the first lua program, `Rscript -e 'writeLines("x", "src/a.ts")'`, `Rscript -e 'cat("x", file = "src/a.ts")'`, `R --vanilla` fed the writeLines program. The `interpreterNames` check gains the `php -r` and `lua -e` seeds.

**Done when:**
- **T-2.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds above in the as-written and interpreter names checks.
- **T-2.2** `node scripts/replay-rejected.mjs 845a1408 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming `php -r file_put_contents(`, `lua -e io.open(`, `Rscript -e writeLines(` and `php8.3 -r`.
- **T-2.3** A unit test asserts `inPlaceTargets` returns `[]` for `php -r 'echo file_get_contents("src/a.ts");'`, `lua -e 'io.open("src/a.ts","r")'`, `Rscript -e 'readLines("src/a.ts")'`, and `php fix.php` and `lua fix.lua` each with a write heredoc.
- **T-2.4** A unit test asserts `inPlaceTargets` includes `src/a.ts` for `php -c php.ini -r 'file_put_contents("src/a.ts","x");'` and for `lua -l mod -` fed `io.open("src/a.ts","w")`.
- **T-2.5** `payloads.test.mts` asserts `guardOutput` denies `php -r 'file_put_contents("src/a.ts", "x");'`, `lua -e 'io.open("src/a.ts","w"):write("x")'` and `Rscript -e 'writeLines("x", "src/a.ts")'` to the lead and to `picket:developer`, naming `src/a.ts`.
- **T-2.6** Phase 1's tests stay unedited and `npm test` passes.

## Phase 3: awk and tclsh rows, and the named limit
**Touch set:**
- `src/lib/hooks/guard/bash/interpreters.mts`: awk and tcl rows
- `src/lib/hooks/guard/bash/in-place.mts`: operand program, named targets
- `src/lib/hooks/guard/bash/in-place.test.mts`: awk and tcl unit tests
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: awk and tcl seeds
- `src/lib/hooks/guard/bash/payloads.test.mts`: end-to-end denial cases
- `test/support/variants.mts`: `awk` and `tclsh` name rows
- `CONTRIBUTING.md`: limit bullet under Guards

**Changes:** Seeds first, replay red (T-3.2), then the rows.
- awk: names `awk`, `gawk`, `mawk`, `nawk`; program is the value of `-e` or `--source`, else the first operand after value flags unless `-f`, `--file` or `-E` names a script; a `-f` value of `-` or `/dev/stdin` makes the heredoc the program; value flags `-F`, `-v`, `-f`, `-i`, `-l`, `-E`, `--field-separator`, `--assign`, `--file`, `--include`, `--load`; write call `>>?[ \t]*"`. `inPlace`: when `-i inplace`, `-iinplace`, `--include inplace` or `--include=inplace` (also with `.awk`) is present, the file operands after the program are targets.
- tcl: names `tclsh`, `wish`; no inline program flag, so the program is the heredoc when no script operand is named; value flag `-encoding`; `namedTarget` captures the path of `open <path> <mode>` where the path is bare, double-quoted or braced and the mode is `w`, `a`, `w+`, `a+`, `r+` or an access list holding `WRONLY` or `RDWR`. A run of tclsh 8.6 and mawk 1.3.4 on this machine wrote files through `open t1.txt w`, `open "t2.txt" a`, `open t3.txt {WRONLY CREAT}`, `print "x" > "a1.txt"` and `awk -f -` with a heredoc.

As-written seeds: `awk 'BEGIN { print "x" > "src/a.ts" }'`, `awk -F: -v n=1 'BEGIN { print n >> "src/a.ts" }'`, `gawk -e 'BEGIN { printf "x" > "src/a.ts" }'`, `awk -f -` fed the first program, `gawk -i inplace '{ print }' src/a.ts`, `gawk --include=inplace '{ print }' src/a.ts`, `tclsh` fed `set f [open src/a.ts w]`, `tclsh` fed `set f [open "src/a.ts" a]`, `tclsh` fed `set f [open src/a.ts {WRONLY CREAT}]`. The names check gains the first awk seed and the first tclsh seed.

The `CONTRIBUTING.md` bullet goes in the "No check covers these" list: the in-place guard refuses only interpreters its family table names, through the write forms each row lists; an interpreter with no row, a write API outside a row's forms, a program piped in from another command, and a program that shells out pass (D-004).

**Done when:**
- **T-3.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds above.
- **T-3.2** `node scripts/replay-rejected.mjs 845a1408 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming `awk BEGIN { print "x" > "src/a.ts" }`, `gawk -i inplace` and `tclsh << set f [open src/a.ts w]`.
- **T-3.3** A unit test asserts `inPlaceTargets` returns `[]` for `awk '{ print $1 }' src/a.ts`, `awk -f fix.awk src/a.ts`, `tclsh` fed `set f [open src/a.ts r]` and fed `set f [open src/a.ts]`, and `tclsh fix.tcl` with a write heredoc.
- **T-3.4** A unit test asserts `gawk -i inplace '{ print }' src/a.ts src/b.ts` yields `["src/a.ts", "src/b.ts"]` and `gawk -i inplace -e '{ print }' src/a.ts` yields `["src/a.ts"]`.
- **T-3.5** `payloads.test.mts` asserts `guardOutput` denies `awk 'BEGIN { print "x" > "src/a.ts" }'`, `gawk -i inplace '{ print }' src/a.ts` and a tclsh heredoc opening `src/a.ts w` to the lead and to `picket:developer`, naming `src/a.ts`.
- **T-3.6** `CONTRIBUTING.md` `## Guards` holds a bullet naming the in-place guard's table limit and the four escapes of D-004; `npm test` passes.

## Open questions
- **OQ-001** A program piped in from another command (`echo "open('src/a.py','w').write('x')" | python3`) passes the guard today for every family, python included; the brief covers interpreter names and write forms only. Owner: product owner. Fallback: named as a limit in phase 3, not closed; a later item can read the pipe's left side as the program.
- **OQ-002** php, lua, R, Rscript and gawk are not installed on this machine, so their program flags, their reading of standard input and `gawk -i inplace` come from their manuals, not a run. Owner: QA. Fallback: the rows follow the manuals; a spelling the real interpreter rejects but the guard refuses costs nothing.

## Revision log
