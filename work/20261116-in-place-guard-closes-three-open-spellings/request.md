Follow-up to 20261115-guard-rows-refuse-attached-program-flags: close the three spellings the in-place guard still lets through, so a Bash command cannot write a code file through an interpreter in these forms.

1. A flag cluster that ends in an attached program, such as `php -nr'file_put_contents("src/a.ts","x");'` or `gawk -be'BEGIN { print "x" > "src/a.ts" }'`: the guard reads the program after the last program flag letter in the cluster and refuses the write.
2. A script path that is standard input, such as `python3 /dev/stdin` or `node /dev/stdin` fed by a heredoc: the guard treats `/dev/stdin` (and `/proc/self/fd/0`, `/dev/fd/0`) as an operand that reads the heredoc, for every interpreter row, and refuses the write.
3. A program piped in from another command, such as `echo "open('src/a.py','w').write('x')" | python3` or `printf '%s' "..." | node`: when an interpreter row reads standard input and the segment before the pipe is an `echo`, `printf` or `cat <<heredoc` whose text is visible in the command, the guard checks that text as the program and refuses the write.

The closure test of the in-place guard stays closed and gains these spellings as seeds or families. The limit bullet under `## Guards` in `CONTRIBUTING.md` is updated to name only what still passes after this change.

## Brief
purpose: Close the three interpreter spellings the in-place guard still lets through, so agents' code file changes go through the Edit tool
in scope: a flag cluster ending in an attached program, a script path that is standard input, a program piped in from a visible echo, printf or heredoc cat; closure test seeds; the limit bullet in CONTRIBUTING.md
out of scope: new interpreter rows, write APIs outside a row's forms, a piped-in program whose text is not visible in the command, shelling out from a program
