Check whether the Bash guard lets a write to a code file pass when it is made through an interpreter outside the in-place guard's list (python, python3, node, perl, ruby, bun, deno). Candidates: php (`php -r 'file_put_contents("src/a.ts", "x");'`), lua, awk and gawk (`awk 'BEGIN { print "x" > "src/a.ts" }'`), tclsh, Rscript, and any other interpreter commonly installed on Linux or macOS that runs an inline program or a heredoc and can write a file.

For each one that gets past the guard: first add its seeds to the guard's closure test (`src/lib/hooks/guard/bash/in-place.variants.test.mts`) so the test fails on the current code, then make the guard refuse it. Show the proof with `scripts/replay-rejected.mjs`.

Keep the change small: extend the existing lists and patterns where they fit. If the list of interpreters cannot be closed by naming them, say so in the order and name the limit in `CONTRIBUTING.md` under `## Guards`, instead of pretending the guard is complete. No guard is removed or weakened.

Found while reading the code: the guard matches the program name exactly, so a versioned or aliased name of a listed interpreter (`python3.14`, `pypy3`, `nodejs`, `ruby3.3`) also passes; awk takes its program as the first operand and writes with `>` inside the program, and `gawk -i inplace` edits its file operands; tclsh writes with `open <path> w` and an unquoted path. These need a table of interpreter families with their own program position and write forms.

## Brief
purpose: A write to a code file through an interpreter the in-place guard does not know (a versioned or aliased name, php, lua, awk, tclsh, Rscript) is refused like one through python or node
in scope: the in-place guard's interpreter list and write forms, its closure test seeds, its unit tests, the limit named in CONTRIBUTING.md
out of scope: programs that are not interpreters (cp, mv, dd, curl, editors), script files run by path, any other guard
