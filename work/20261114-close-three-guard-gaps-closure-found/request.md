Close the three guard gaps that the closure tests of 20261114-a-check-for-the-guard-bypass-class found in today's code (its design.md, Open questions OQ-001 to OQ-003). The user approved this follow-up on 2026-11-14.

1. OQ-001: Perl's three-argument `open(my $f, '>', 'src/a.pl')` is not seen as a file write by `WRITE_CALL` in src/lib/hooks/guard/bash/in-place.mts (it wants a quoted mode holding `w`, `a` or `+`), so `perl -e` with it yields no target and the in-place guard does not see the write. Make the guard see Perl's write modes (`>`, `>>`, `+<` and the two-argument forms) as writes.

2. OQ-002: a bench task file's `budget_usd` of 0 or below is not refused. `runRefusal` in bench/lib/spend.mjs checks only the `--budget-usd` flag, the plan then totals $0, and `claudeArgs` in bench/lib/claude.mjs drops `--max-budget-usd` because it tests truthiness, so a real run goes out with no per-call spending cap. Refuse a task whose `budget_usd` is not a positive number, and never drop the per-call cap for a falsy budget.

3. OQ-003: a flag that takes a value before a heredoc program gets past the in-place guard. `python3 -X utf8`, `python3 -W ignore` and `node --require ./x.js`, each fed a write program on standard input, yield no target, because `readsStdin` in src/lib/hooks/guard/bash/in-place.mts wants a `-` or flags only. Make `readsStdin` skip a value-taking flag together with its value.

For each, first add the seeds to the guard's closure test (C-020 in CONTRIBUTING.md) so it fails on the current code, then fix the guard.

## Brief
purpose: Close the three live guard gaps the closure tests found: Perl write modes, a non-positive task budget, and a value-taking flag before a heredoc
in scope: WRITE_CALL and readsStdin in the in-place guard; the task budget refusal and the per-call cap in the bench; new seeds in each guard's closure test, failing first
out of scope: new spelling families; other interpreters' write calls no test names; the env verbs; saved scenarios (TF-003)
