Close the two Major findings the cumulative review of 20261115-in-place-guard-covers-more-interpreters left open (work/20261115-in-place-guard-covers-more-interpreters/reviews/cumulative.md).

1. The php, lua, awk and R rows of the in-place guard refuse a program flag only when it is a separate word. These pass today and must be refused: `php -r'file_put_contents("src/a.ts","x");'`, `lua -e'io.open("src/a.ts","w"):write("x")'`, `gawk -e'BEGIN { print "x" > "src/a.ts" }'`, `gawk --source='BEGIN { print "x" > "src/a.ts" }'`, `gawk --file=/dev/stdin` fed that program in a heredoc, and `R --no-save -f /dev/stdin` fed `writeLines("x", "src/a.R")` in a heredoc. Add php, lua and awk entries to the flag table that `programFlagSpellings` reads in `test/support/variants.mts`, so the closure test checks these rows; add the seeds first so the test fails on the current code, then fix the guard. Show the proof with `scripts/replay-rejected.mjs`.

2. No test covers the `deno eval` subcommand branch: the mutant `!==` to `===` at `src/lib/hooks/guard/bash/in-place.mts:16` survived `npm test`. Add a unit test that fails under that mutant, for example `deno eval "require('fs').writeFileSync('src/a.ts','x')" -p 1` yields `src/a.ts`.

No guard is removed or weakened, and no decision of the earlier item changes.

## Brief
purpose: The php, lua, awk and R rows of the in-place guard refuse a program given in an attached or equals-sign flag, and a test covers the deno eval branch
in scope: the in-place guard and its interpreter table, the closure helper's flag table, the guard's closure seeds and unit tests
out of scope: new interpreter rows, the limits CONTRIBUTING.md names (piped-in programs, interpreters with no row), any other guard
