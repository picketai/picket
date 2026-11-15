## Review: 20261115-in-place-guard-covers-more-interpreters · cumulative

Approved: every request sentence and every T-N.x criterion has code and test evidence, and the replay at 845a1408 fails on each named seed. Two Majors do not block: the new rows miss the attached and `=` flag spellings, and a mutant survived.

Requirements: PASS (10)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Check whether the Bash guard lets a write to a code file pass ... php, lua, awk and gawk ..., tclsh, Rscript, and any other interpreter commonly installed" | request.md:1 | PASS | order.md Problem (probe), CONTRIBUTING.md:151 |
| S-2 | "first add its seeds to the guard's closure test ... so the test fails on the current code, then make the guard refuse it" | request.md:3 | PASS | in-place.variants.test.mts:39-57,68; replay at 845a1408 fails |
| S-3 | "Show the proof with `scripts/replay-rejected.mjs`" | request.md:3 | PASS | replay exit 1, names all T-1.2/T-2.2/T-3.2 seeds (ran it) |
| S-4 | "Keep the change small: extend the existing lists and patterns where they fit" | request.md:5 | PASS | interpreters.mts:83-108 |
| S-5 | "name the limit in `CONTRIBUTING.md` under `## Guards`" | request.md:5 | PASS | CONTRIBUTING.md:151 |
| S-6 | "No guard is removed or weakened" | request.md:5 | PASS | old rows keep WRITE_CALL and flags, interpreters.mts:84-89; no base test line removed |
| S-7 | "a versioned or aliased name of a listed interpreter (`python3.14`, `pypy3`, `nodejs`, `ruby3.3`) also passes" | request.md:7 | PASS | interpreters.mts:24,112-115; in-place.test.mts T-1.3 test |
| S-8 | "awk takes its program as the first operand ... and `gawk -i inplace` edits its file operands" | request.md:7 | PASS | in-place.mts:35-42; interpreters.mts:49-66 |
| S-9 | "tclsh writes with `open <path> w` and an unquoted path" | request.md:7 | PASS | interpreters.mts:21-22,106; in-place.mts:58 |
| S-10 | "These need a table of interpreter families with their own program position and write forms" | request.md:7 | PASS | interpreters.mts:1-10 |
Alignment: PASS (T-1.1 to T-3.6, 19 rows)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 2 major
- [Major] src/lib/hooks/guard/bash/in-place.mts:47: the new php, lua and awk rows miss the attached and `=` spellings of their program flags. All six of these commands pass the guard for the lead and for picket:developer (probed through guardBash): `gawk --source='BEGIN { print "x" > "src/a.ts" }'`, `gawk -e'...'`, `gawk --file=/dev/stdin` fed the same program, `lua -e'io.open("src/a.ts","w"):write("x")'`, `php -r'file_put_contents("src/a.ts","x");'`, and `R --no-save -f /dev/stdin` fed `writeLines`. The older families catch the attached form through the here-string fallback at in-place.mts:48, but awk returns at line 47 before it. php and lua lose the fallback because `\bfile_put_contents\(` and `\bio\.open\(` (interpreters.mts:17-18) have no word boundary after `-r` or `-e`. The plan's own awk row reads the program from "the value of `-e` or `--source`". No closure family checks these rows, because `programFlagSpellings` has no flag-table entry for php, lua or awk. The CONTRIBUTING limit bullet does not name this gap either. Fix: read `--source=`, `--file=` and attached short values in `operandProgram` and `inlineProgram`, and add php, lua and awk entries to `INTERPRETER_FLAGS` so `programFlagSpellings` checks them. Likelihood: low (gawk, php and lua are not installed here, and an agent would have to pick this spelling). Leave it: the new rows refuse only the separate-word flag spelling; `--source=`, `-e<prog>` and `--file=/dev/stdin` pass.
- [Major] src/lib/hooks/guard/bash/in-place.mts:16: the mutant `!==` to `===` survived `npm test` (Mu1). The only deno test (in-place.test.mts:18) is also caught by the here-string fallback, so nothing tests the subcommand branch. Fix: add a test that fails when `!==` becomes `===`, for example `deno eval "require('fs').writeFileSync('src/a.ts','x')" -p 1` yields `src/a.ts`; the mutant reads `-p 1` as the program and yields nothing. Likelihood: low. Leave it: no test covers the deno `eval` subcommand branch.
Classes: Se4, Mu1
Checked: no comments added, `silenced` is empty, no line of the base tests was removed (0), the phase 1 seed line was only extended as T-2.1 and T-3.1 require. Probed versioned names (pypy3.10, PYTHON3, tclsh9.0 resolve; python3.14-dbg does not, as D-002 specifies), gawk inplace with `-iinplace`, `inplace.awk`, `--`, `-F` and `-f`, awk reads and `getline <` (no target), tcl two opens, quoted and access-list modes, `-encoding`. The plan sets lua and php modes to exclude `r+` and the tcl regex misses a braced `{w}` mode: both are plan wording, not code findings. npm test was green at HEAD per the kernel's mutation run.

APPROVED
