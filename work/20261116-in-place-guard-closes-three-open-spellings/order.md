---
kind: order
lane: order
title: In-place guard closes three open spellings
date: 2026-11-16
audience: developer
sources: work/20261116-in-place-guard-closes-three-open-spellings/request.md; preflight.txt; work/20261115-guard-rows-refuse-attached-program-flags/order.md (OQ-002); src/lib/hooks/guard/bash/in-place.mts; src/lib/hooks/guard/bash/interpreters.mts; src/lib/hooks/guard/bash/in-place.variants.test.mts; src/lib/hooks/guard/bash/in-place.test.mts (test names); src/lib/hooks/guard/bash/payloads.mts; src/lib/hooks/guard/bash/payloads.test.mts; src/lib/hooks/guard/bash/judge.mts; src/lib/hooks/guard/bash/bash.mts; src/lib/hooks/guard/bash/powershell.mts; src/lib/hooks/guard/bash/rules.mts; src/lib/shared/shell/powershell.mts; test/support/variants.mts; test/support/hook.mts; test/repo/variants.test.mjs; test/repo/markdown-paths.test.mjs; src/lib/util/yaml-lite.mts; CONTRIBUTING.md (## Guards); scratch probes of guardOutput, inPlaceTargets, readPowerShell and a cluster rule script at 4584e779, and python3, node, tclsh and mawk runs on stdin paths, 2026-11-16
phases:
  - n: 1
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/interpreters.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
    greps:
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\bexport function clusterFlag\('
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '\bclusterFlag\('
      - path: src/lib/hooks/guard/bash/interpreters.mts
        pattern: '\battachedValue\b'
        absent: true
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '\battachedValue\b'
        absent: true
    tests: true
    drive:
      - covers: T-1.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under program flag spellings"
          - "in-place guard stays closed under as written"
      - covers: T-1.2
        command: node scripts/replay-rejected.mjs 4584e779 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under program flag spellings for:"
          - 'php -nrfile_put_contents("src/a.ts", "x");'
          - 'awk -beBEGIN { print "x" > "src/a.ts" }'
          - "in-place guard is open under as written for:"
          - 'gawk -bf/dev/stdin << BEGIN { print "x" > "src/a.ts" }'
          - 'gawk -i inplace -be{ print } src/a.ts'
      - covers: T-1.7
        command: git diff 4584e779 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'
        exit_code: 1
  - n: 2
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
    greps:
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '/proc/self/fd/0'
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '/dev/fd/0'
    tests: true
    drive:
      - covers: T-2.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard stays closed under stdin spellings"
          - "in-place guard stays closed under as written"
      - covers: T-2.2
        command: node scripts/replay-rejected.mjs 4584e779 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under stdin spellings for:"
          - "python3 /dev/stdin << open('src/a.py','w').write('x')"
          - "node /dev/fd/0 << require('fs').writeFileSync('src/a.ts','x')"
          - "ruby /proc/self/fd/0 << File.write('src/a.rb','x')"
          - "tclsh /dev/stdin << set f [open src/a.ts w]"
          - 'gawk -f /proc/self/fd/0 << BEGIN { print "x" > "src/a.ts" }'
      - covers: T-2.6
        command: git diff 4584e779 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'
        exit_code: 1
  - n: 3
    files:
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/judge.mts
      - src/lib/hooks/guard/bash/payloads.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
      - CONTRIBUTING.md
    greps:
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: '\bexport function stdinTexts\('
      - path: src/lib/hooks/guard/bash/judge.mts
        pattern: '\bstdinTexts\('
      - path: src/lib/hooks/guard/bash/payloads.mts
        pattern: '\bstdinTexts\('
      - path: CONTRIBUTING.md
        pattern: 'cat fix\.py \| python3'
      - path: CONTRIBUTING.md
        pattern: 'echo "\.\.\." \| python3'
        absent: true
    tests: true
    drive:
      - covers: T-3.1
        command: node --test src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 0
        contains:
          - "in-place guard on piped programs stays closed under as written"
      - covers: T-3.2
        command: node scripts/replay-rejected.mjs 4584e779 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard on piped programs is open under as written for:"
          - 'echo ''open("src/a.py","w").write("x")'' | python3'
          - 'printf ''%s'' ''require("fs").writeFileSync("src/a.ts","x")'' | node'
          - 'printf ''require("fs").writeFileSync("src/a.ts","x")'' |& node'
          - 'echo ''BEGIN { print "x" > "src/a.ts" }'' | gawk -f /dev/stdin'
      - covers: T-3.7
        command: git diff 4584e779 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'
        exit_code: 1
---
# Order: In-place guard closes three open spellings

## Problem
The earlier item left three spellings open (its OQ-002, and the limit bullet in `CONTRIBUTING.md:151`). A probe of `guardOutput` at `4584e779` returned no decision for the request's commands: `php -nr'file_put_contents("src/a.ts","x");'` and `gawk -be'...'` (a cluster such as `-nr...` matches no listed flag in `attachedValue`, `interpreters.mts:31-37`), `python3 /dev/stdin`, `node /dev/stdin`, `tclsh /dev/stdin` and `perl /dev/stdin` fed a write heredoc (`namesScriptFile` takes `/dev/stdin` for a script file, `in-place.mts:34-54`), and `echo '<write>' | python3` and `printf '%s' '<write>' | node` (heredocs are the only standard input the guard reads, `judge.mts:47`). `cat <<'EOF' | python3` fed a write is already denied, because heredocs reach every segment of the command. Binding constraints: C-020 (seeds fail first on the base, the closure test stays closed), no refusal is lost, and the earlier items' decisions (one `programFlags` list per row, every flag value joins the program) stand.

## Decisions

### D-001 (r2): One cluster scanner reads program and script flags
**Decision:** `interpreters.mts` replaces `attachedValue` with `export function clusterFlag(word: string, flags: readonly string[], stops: ReadonlySet<string>): { flag: string; rest: string } | undefined`. A listed long flag matches as `--x` or `--x=value`. Otherwise a word starting with one dash is read as a getopt cluster, letter by letter: a letter whose `-x` is listed in `flags` ends the cluster and `rest` is the text after it; a letter in `stops` (a flag of the row that takes a value) or a character that is not an ASCII letter gives `undefined`; any other letter is a no-value flag and the scan goes on. `rest === ""` means the value is the next word. `stops` is the row's `valueFlags` with its `programFlags` and `scriptFlags`; `awkFileOperands` passes `AWK_VALUE_FLAGS` with `AWK_PROGRAM_FLAGS`. `everyFlagProgram`, `scriptAt` and `awkFileOperands` use it in place of their `includes` test and `attachedValue`. The rows without `programFlags` (python, node, perl, ruby, bun, deno) keep that shape and also read a program attached to a cluster: `in-place.mts` gains `attachedPrograms(family: Family, args: string[]): string[]`, which for every word starting with one dash walks its leading ASCII letters and, at each prefix `word.slice(0, i + 1)` that the row's own `takesProgram` accepts and that leaves text after it, takes that text as one reading. It returns `[]` for a row with `programFlags`, and tcl's `takesProgram` is always false. `programText` joins the readings, one per line, after the text it returns today, so today's text stays whole and a reading only adds text. A probe of `guardOutput` at HEAD (2026-11-16) gave no decision for `perl -we'open(F,">src/a.pl"); print F "x"'`, `ruby -we'open("src/a.rb","w"){|f| f.puts 1}'`, `python3 -c"open('src/a.py','w')"` and `python3 -Ec"open('src/a.py','w')"`: `WRITE_CALL`'s `\bopen` finds no word boundary in `-weopen(`. A scratch copy of `attachedPrograms` gave `open(F,">src/a.pl"); print F "x"` for perl, `open("src/a.rb","w"){|f| f.puts 1}` for ruby, `open('src/a.py','w')` among python's `-Ec` readings (each naming the target), and no write for `-cprint(open('src/a.py').read())`, `-Werror`, `-ne`, `-pi.bak` and `-Eutf-8`. A script run on 2026-11-16 gave `-r` with `file_put_contents("src/a.ts","x");` for `-nrfile_put_contents("src/a.ts","x");` and `-e` with `BEGIN { print "x" > "src/a.ts" }` for gawk's `-beBEGIN ...`, and `undefined` for `-F:`, `-Fe`, `-vr=1` and `-dmemory_limit=1`. The request's wording "the last program flag letter in the cluster" is this letter, the one that ends the cluster; read as the last such letter anywhere in the word, the php example yields `c/a.ts","x");`, because `src` holds an `r`.
**Instead of:** keeping `attachedValue` and adding a second helper for `-nr` followed by a separate program: two scanners would share one rule and could drift, and `scriptAt` would then still miss `-bf/dev/stdin`. For the rows without `programFlags`, `clusterFlag` over the `PROGRAM_CLUSTER` letters (the review's suggestion) lost because it stops at the first program letter: python's `-E` takes no value, so `-Ecopen(...)` reads `copen(...)` and `\bopen` fails again.
**Risks:**
- **RISK-001** A single-dash word the interpreter does not read as a cluster is read as one (gawk's `-Wsource=...` gives the program `=...`). Mitigation: the text still needs the row's write call and a code file literal, so a misread adds a refusal and never drops one, as in the earlier D-001's RISK-001.
- **RISK-002** Three call sites change at once under unit tests that pin the attached spellings (`in-place.test.mts:103-135`). Mitigation: no base line of `in-place.test.mts` or `payloads.test.mts` is removed (T-1.7).
- **RISK-004** Every accepted prefix gives a reading, so `-Werror` adds `rror` and perl's `-weopen(` adds `n(F,...)` beside `open(F,...)`. Mitigation: a reading still needs the row's write call and a code file literal, and today's text is kept, so a misread adds a refusal and never drops one (RISK-001).

### D-002: Standard input paths are one set every row reads
**Decision:** `in-place.mts` replaces `STDIN_OPERAND` and `STDIN_SCRIPTS` with one set `STDIN_PATHS` of `-`, `/dev/stdin`, `/dev/fd/0` and `/proc/self/fd/0`. `readsStdin` is true when any argument is in the set (today's rule for `-`, extended), and a script flag value in the set makes the heredoc the program, as `/dev/stdin` does today. This covers every row: python, node, perl, ruby, bun, php, lua, R and tcl through `readsStdin`, awk and R through their script flags. On this machine `python3`, `tclsh` and `mawk -f` ran a program from all three paths; Node 26 fails on `node /dev/stdin` fed a piped heredoc unless `--preserve-symlinks-main` is given, and the guard refuses both spellings.
**Instead of:** reading a stdin path only in the script position (the first operand): each row would need its own operand rule (deno's `run`, value flags), while `-` has always counted anywhere. The cost of "anywhere" is that `python3 fix.py /dev/stdin` fed a heredoc holding a write call is refused, as `python3 fix.py -` is today.

### D-003 (r2): Visible echo and printf text joins the command's standard input
**Decision:** `in-place.mts` exports `stdinTexts(segments: readonly Segment[], heredocs: readonly string[]): string[]`: the heredocs, then for every segment holding a string word that is `echo` or `printf` (through `normalizeRoot`, lower-cased), the segment's string words after the first such word joined by one space. The word may stand anywhere in the segment, so a wrapper or a brace group before it is read through: segments parsed on 2026-11-16 give `["command","echo","P"]`, `["builtin","echo","P"]`, `["env","-i","FOO=1","echo","P"]`, `["nice","-n","5","echo","P"]` and, for `{ echo 'P'; } | python3`, `["{","echo","P"]` then `["}"]`, each yielding `P`; a segment whose first word is `echo` or `printf` yields the same text as before this revision. `judge.mts:47` passes `stdinTexts(segments, reading.heredocs)` where it passes `reading.heredocs` today, and `codeWritesInside` (`payloads.mts:274`) passes `stdinTexts(parsed.segments, parsed.heredocs)`, so `bash -c "echo '...' | python3"` closes too. A row reads this text only when it reads standard input, so `echo '<write>' | python3 fix.py` and `... | node -e '<read>'` stay allowed. No flag of echo or printf is parsed and no escape is decoded: `-n` or `%s` only adds text. PowerShell segments go through the same judge, and `readPowerShell` gives `echo "<write>" | python3` as `["echo", ...]` and `["python3"]`, so PowerShell's `echo` closes as well. Worked example: `printf '%s' 'require("fs").writeFileSync("src/a.ts","x")' | node` gives the text `%s require("fs").writeFileSync("src/a.ts","x")`; it holds `writeFileSync(` and the literal `src/a.ts`.
**Instead of:** the pipe-aware reading the request describes (only the segment right before the pipe): `Split`, `Reading`, the PowerShell reading and `ParsedPayload` would all carry which segment a pipe feeds, five files for one gain in precision. Command-wide text matches how heredocs are read today. For wrapped writers, a named wrapper list (`command`, `builtin`, `env`, `exec`, `nice`, `nohup`, `timeout`, `{`) with each wrapper's own flags (`env -i`, `nice -n 5`, `timeout 5`) lost: it is a second flag table to keep in step with `ARGV_TAIL_ROOTS`, while the interpreter side already reads every suffix of a wrapper's tail (`codeWritesInTail`, `payloads.mts:258-265`).
**Risks:**
- **RISK-003** `echo '<write text>'; python3 -` with no pipe between them is refused. Mitigation: OQ-002 puts the choice to the product owner; the refusal names the file and the Edit tool.
- **RISK-005** A segment that only names the word, such as `grep echo fix.py | python3`, adds its later words (`fix.py`) as text. Mitigation: that text needs the row's write call and a code file literal to refuse, so a misread adds a refusal and never drops one.

### D-004 (r2): The new spellings join the existing families and a whole-command closure
**Decision:** In `test/support/variants.mts`, the php row of `INTERPRETER_FLAGS` gains `clusterLetter: "n"` and the awk row `clusterLetter: "b"`, and `programFlagSpellings` spells, after the separate cluster, the attached cluster `-<letter><flag letter><program>` when a row has both `attached` and `clusterLetter`. `stdinSpellings` spells `/dev/stdin`, `/dev/fd/0` and `/proc/self/fd/0` after `-` and before the leading-flag spelling. Piped programs get a second `closureTests` call in `in-place.variants.test.mts` with the guard name `in-place guard on piped programs`, the family `asWritten` over whole command strings, a `run` that calls `guardOutput(command, { root: withProject(t, { host: true, picket: false }), tool: "Bash" })`, and `closed` true when the decision is `deny` and the reason starts with `guard.bash: src/a.`. lua gets no cluster letter: lua.c rejects extra letters after `-E`, `-W`, `-i` and `-v`. For D-001 (r2) the python3 and ruby rows gain `attached: true`, so `programFlagSpellings` also spells `python3 -cP`, `python3 -BcP`, `ruby -eP` and `ruby -weP` (the python3 label pin at `test/repo/variants.test.mjs:108` becomes `["python3 -cP", "python3 -Bc P", "python3 -BcP", "python3 -X utf8 -c P"]`), and its seeds gain `inline("python3", "-c", "open('src/a.py','w')")` and `inline("ruby", "-e", "open('src/a.rb','w'){|f| f.puts 1}")`, programs with no `.write(` so the attached spellings are open on the base. The as-written seeds gain `inline("perl", "-weopen(F,\">src/a.pl\"); print F \"x\"")` and `inline("python3", "-Ecopen('src/a.py','w')")`. For D-003 (r2) `PIPED_PROGRAM_SEEDS` gains `command echo`, `builtin echo`, `env -i echo` and `{ echo ...; }` spellings of the python3 seed, each giving no decision at HEAD.
**Instead of:** a new pipe family, or piped seeds run through `inPlaceTargets` with `stdinTexts`: a family needs a line in the families list of `CONTRIBUTING.md`, outside this brief's one bullet, and a test importing `stdinTexts` fails to load on the base, so the replay could not name the open spellings.

## Scope
**In:**
- getopt clusters ending in a program or script flag for the php, lua, R and awk rows
- a program attached to a flag or cluster for the python, node, perl, ruby, bun and deno rows (D-001 r2)
- `/dev/stdin`, `/dev/fd/0` and `/proc/self/fd/0` as standard input for every row
- visible `echo` and `printf` text as standard input, in a command, a `bash -c` payload and PowerShell, including behind a wrapper word or a brace group (D-003 r2)
- closure seeds and families, unit tests, end-to-end cases, the limit bullet in `CONTRIBUTING.md`

**Out:**
- new interpreter rows, write APIs outside a row's forms, a program that shells out
- a program piped in from a command that does not show its text (`cat fix.py | python3`), PowerShell's `Write-Output`, printf escape decoding

## Phase 1: Clusters ending in a program or script flag
**Touch set:**
- `test/support/variants.mts`: cluster letters, attached cluster spelling
- `test/repo/variants.test.mjs`: php and awk label pins
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: red seeds first
- `src/lib/hooks/guard/bash/interpreters.mts`: `clusterFlag`, awk operands
- `src/lib/hooks/guard/bash/in-place.mts`: program and script flag readers
- `src/lib/hooks/guard/bash/in-place.test.mts`: cluster writes, reads, scanner
- `src/lib/hooks/guard/bash/payloads.test.mts`: request's commands denied

**Changes:** First the helper and seeds per D-004, then the replay (T-1.2), then the guard per D-001. As-written seeds: `fedOnStdin(AWK_WRITE, "gawk", "-bf/dev/stdin")` and `inline("gawk", "-i", "inplace", "-be{ print }", "src/a.ts")`; the existing `programFlagSpellings` seeds for php and awk spell the new clusters. The pinned php and awk label test in `test/repo/variants.test.mjs:121-129` changes on purpose.

**Done when:**
- **T-1.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds above.
- **T-1.2** `node scripts/replay-rejected.mjs 4584e779 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming `php -nrfile_put_contents(`, `awk -beBEGIN`, `gawk -bf/dev/stdin` and `gawk -i inplace -be{ print } src/a.ts`.
- **T-1.3** `test/repo/variants.test.mjs` asserts the labels of `programFlagSpellings` for `awk -e P` are `["awk --source P", "awk --source=P", "awk -eP", "awk -be P", "awk -beP", "awk -F : -e P"]` and for `php -r P` are `["php -rP", "php -nr P", "php -nrP", "php -c php.ini -r P"]`; the node pin is unchanged, the python3 pin is as D-004 (r2) states, and the ruby pin is `["ruby -eP", "ruby -we P", "ruby -weP", "ruby -w -e P"]`.
- **T-1.4** A unit test asserts `inPlaceTargets` includes `src/a.ts` for `php -nrfile_put_contents("src/a.ts","x");`, `gawk -beBEGIN { print "x" > "src/a.ts" }` and `gawk -bf/dev/stdin` fed `BEGIN { print "x" > "src/a.ts" }`, and equals `["src/a.ts"]` for `gawk -i inplace -be{ print } src/a.ts`.
- **T-1.5** A unit test asserts `clusterFlag` with flags `["-e", "--source"]` and stops `{-F, -v, -f}` gives `{ flag: "-e", rest: "X" }` for `-beX`, `{ flag: "-e", rest: "" }` for `-be`, `{ flag: "--source", rest: "X" }` for `--source=X`, and `undefined` for `-Fe`, `-vex=1` and `-b`; and `inPlaceTargets` returns `[]` for `php -nrecho file_get_contents("src/a.ts");`.
- **T-1.6** `payloads.test.mts` asserts `guardOutput` denies `php -nr'file_put_contents("src/a.ts","x");'` and `gawk -be'BEGIN { print "x" > "src/a.ts" }'` to the lead and to `picket:developer`, the reason starting with `CODE_WRITE_DENIAL("src/a.ts")`.
- **T-1.7** `git diff 4584e779 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'` exits 1, and `npm test` passes.

## Phase 2: Standard input paths for every row
**Touch set:**
- `test/support/variants.mts`: stdin path spellings
- `test/repo/variants.test.mjs`: stdinSpellings pin
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: red seeds first
- `src/lib/hooks/guard/bash/in-place.mts`: `STDIN_PATHS`, `readsStdin`
- `src/lib/hooks/guard/bash/in-place.test.mts`: path writes, kept reads
- `src/lib/hooks/guard/bash/payloads.test.mts`: request's commands denied

**Changes:** Helper per D-004, seeds, replay red (T-2.2), then the guard per D-002. As-written seeds: `fedOnStdin(TCL_WRITE, "tclsh", "/dev/stdin")`, `fedOnStdin(PERL_WRITE, "perl", "/dev/fd/0")`, `fedOnStdin(PHP_SCRIPT, "php", "/proc/self/fd/0")`, `fedOnStdin(LUA_WRITE, "lua", "/dev/stdin")`, `fedOnStdin(AWK_WRITE, "gawk", "-f", "/proc/self/fd/0")`. The pinned `stdinSpellings` test at `test/repo/variants.test.mjs:134` changes on purpose.

**Done when:**
- **T-2.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds and spellings above.
- **T-2.2** `node scripts/replay-rejected.mjs 4584e779 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming `python3 /dev/stdin`, `node /dev/fd/0`, `ruby /proc/self/fd/0`, `tclsh /dev/stdin` and `gawk -f /proc/self/fd/0`.
- **T-2.3** `test/repo/variants.test.mjs` asserts `stdinSpellings` for `python3` fed `P` gives the labels `["python3 - << P", "python3 /dev/stdin << P", "python3 /dev/fd/0 << P", "python3 /proc/self/fd/0 << P", "python3 -X utf8 - << P"]`, each input carrying `heredocs: ["P"]`.
- **T-2.4** A unit test asserts `inPlaceTargets` includes the target for `python3` with each of the three paths fed `open('src/a.py','w').write('x')`, and for `tclsh /dev/stdin`, `perl /dev/fd/0` and `gawk -f /dev/fd/0` fed their write.
- **T-2.5** A unit test asserts `inPlaceTargets` returns `[]` for `python3 fix.py` and `python3 /dev/stdin` fed `open('src/a.py').read()`, and includes `src/a.py` for `python3 fix.py /dev/stdin` fed `open('src/a.py','w').write('x')` (D-002's chosen cost).
- **T-2.6** `payloads.test.mts` asserts `guardOutput` denies `python3 /dev/stdin` fed `open('src/a.py','w').write('x')` (naming `src/a.py`) and `node /dev/stdin` fed `require('fs').writeFileSync('src/a.ts','x')` (naming `src/a.ts`), each in a quoted heredoc, to the lead and to `picket:developer`; `git diff 4584e779 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'` exits 1, and `npm test` passes.

## Phase 3: Echoed and printed programs, and the limit bullet
**Touch set:**
- `src/lib/hooks/guard/bash/in-place.mts`: export `stdinTexts`
- `src/lib/hooks/guard/bash/judge.mts`: pass the command's stdin texts
- `src/lib/hooks/guard/bash/payloads.mts`: wrapped payload stdin texts
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: piped closure, red first
- `src/lib/hooks/guard/bash/in-place.test.mts`: `stdinTexts` unit test
- `src/lib/hooks/guard/bash/payloads.test.mts`: denials and kept passes
- `CONTRIBUTING.md`: limit bullet under Guards

**Changes:** The second closure per D-004 first, with these seeds, and the replay red (T-3.2): `echo 'open("src/a.py","w").write("x")' | python3`, `echo -n 'open("src/a.py","w").write("x")' | python3 -`, `printf '%s' 'require("fs").writeFileSync("src/a.ts","x")' | node`, `printf 'require("fs").writeFileSync("src/a.ts","x")' |& node`, `echo 'BEGIN { print "x" > "src/a.ts" }' | gawk -f /dev/stdin`, `echo 'File.write("src/a.rb","x")' | ruby`, `bash -c "echo 'open(\"src/a.py\",\"w\").write(\"x\")' | python3"`, and `cat <<'EOF' | python3` with `open("src/a.py","w").write("x")` as its body (closed on the base, kept as a pin). Then the guard per D-003. The bullet at `CONTRIBUTING.md:151` keeps its first sentence and its other three examples, and names "a program piped in from anything but a visible `echo`, `printf` or heredoc (`cat fix.py | python3`)" in place of the `echo "..." | python3` example.

**Done when:**
- **T-3.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 0 with the seeds above.
- **T-3.2** `node scripts/replay-rejected.mjs 4584e779 src/lib/hooks/guard/bash/in-place.variants.test.mts` exits 1 naming the `echo ... | python3`, `printf '%s' ... | node`, `printf ... |& node` and `echo ... | gawk -f /dev/stdin` seeds.
- **T-3.3** A unit test asserts `stdinTexts` returns `["H", "-n P"]` for segments `[["echo", "-n", "P"], ["python3"]]` with heredocs `["H"]`, `["%s Q"]` for `[["printf", "%s", "Q"], ["node"]]` with none, `["P"]` for `[["/usr/bin/echo", "P"], ["python3"]]`, and `[]` for `[["cat", "fix.py"], ["python3"]]`.
- **T-3.4** `payloads.test.mts` asserts `guardOutput` denies, to the lead and to `picket:developer`, `echo 'open("src/a.py","w").write("x")' | python3` and the same text through `bash -c` (naming `src/a.py`), and `printf '%s' 'require("fs").writeFileSync("src/a.ts","x")' | node` (naming `src/a.ts`); and with the tool `PowerShell` denies `echo "open('src/a.py','w').write('x')" | python3`.
- **T-3.5** `payloads.test.mts` asserts `guardOutput` gives the lead no `deny` for `echo 'open("src/a.py","w").write("x")' | python3 fix.py` and `cat fix.py | python3`.
- **T-3.6** `CONTRIBUTING.md` holds `cat fix.py | python3` and no longer holds `echo "..." | python3`; `test/repo/markdown-paths.test.mjs` passes.
- **T-3.7** `git diff 4584e779 -- src/lib/hooks/guard/bash/in-place.test.mts src/lib/hooks/guard/bash/payloads.test.mts | grep -c '^-[^-]'` exits 1, and `npm test` passes.

## Open questions
- **OQ-001** php and gawk are not installed here, so php's `-nr<code>` (php_getopt clusters and attached values) and gawk's `-be<program>` and `-bf/dev/stdin` (getopt_long clusters) rest on the manuals, not a run. Owner: QA. Fallback: refuse them all; refusing a spelling an interpreter rejects costs nothing.
- **OQ-002** The request reads only the segment right before a pipe; D-003 reads every visible `echo` and `printf` in the command, so `echo '<write text>'; python3 -` with no pipe is refused too. Owner: product owner. Fallback: command-wide, as heredocs are read today.
- **OQ-003** [resolved] The code for D-001 (r2), D-003 (r2) and D-004 (r2) is carried by the phase 3 fix of the cumulative review; T-1.3 now names the changed python3 and ruby pins.

## Revision log
- 2026-11-16: D-001 (r2): rows without `programFlags` read attached cluster programs through `attachedPrograms`; the "closed today" premise was false for programs starting with `open(`.
- 2026-11-16: D-003 (r2): `stdinTexts` reads echo or printf at any word of a segment; wrapped writers (`command`, `env`, brace groups) passed.
- 2026-11-16: D-004 (r2): python3 and ruby spell attached programs; seeds for perl, python3 `-Ec`, and wrapped echo added.
- 2026-11-16: T-1.3 reworded: python3 pin follows D-004 (r2) and ruby pin named, replacing "node and python3 pins unchanged"; user approved at the amendment gate.
- 2026-11-16: OQ-003 resolved: the phase 3 fix carries the r2 code.
