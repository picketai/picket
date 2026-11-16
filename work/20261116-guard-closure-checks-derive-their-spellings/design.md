---
kind: design
lane: design
title: Closure checks derive spellings from guards
date: 2026-11-16
audience: developer
sources: request.md; CONTRIBUTING.md C-020 and Guards; test/support/variants.mts; the nine closure test files; scripts/replay-rejected.mjs; src/lib/hooks/guard/bash/interpreters.mts and in-place.mts; verdicts.jsonl and phases/*.fixes.md of the seven named items; work/20261114-a-check-for-the-guard-bypass-class/design.md; probes run on the eight rejected trees and on 29346d5b
phases:
  - n: 1
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/replay-rejected.test.mjs
      - bench/test/claude.variants.test.mjs
      - bench/test/spend.variants.test.mjs
      - src/lib/shared/drive-log.variants.test.mts
      - src/lib/shared/admission/signals.variants.test.mts
      - src/lib/shared/env/config-entries.variants.test.mts
      - src/lib/shared/scenarios/rules.variants.test.mts
      - src/lib/verbs/verify/index.variants.test.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/scope/index.variants.test.mts
    greps:
      - path: test/support/variants.mts
        pattern: "export type Grammar<"
      - path: test/support/variants.mts
        pattern: "\\bClosureCheck\\b"
        absent: true
      - path: src/lib/hooks/guard/bash/in-place.variants.test.mts
        pattern: "\\bchecks:"
        absent: true
      - path: src/lib/hooks/guard/scope/index.variants.test.mts
        pattern: "closureTests\\("
    tests: true
    drive:
      - covers: T-1.6
        command: node scripts/replay-rejected.mjs 2f702e9a src/lib/shared/admission/signals.variants.test.mts
        exit_code: 1
        contains:
          - "admit security is open under distractor sentences for:"
      - covers: T-1.6
        command: node scripts/replay-rejected.mjs e4addfe2 src/lib/shared/admission/signals.variants.test.mts
        exit_code: 1
        contains:
          - "admit security is open under quoted spans for:"
    security: false
  - n: 2
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - src/lib/shared/env/config-entries.mts
      - src/lib/shared/work/declared-checks.mts
      - src/lib/shared/env/config-entries.variants.test.mts
      - src/lib/shared/drive-log.variants.test.mts
      - src/lib/shared/scenarios/rules.variants.test.mts
      - src/lib/verbs/verify/index.variants.test.mts
      - bench/test/spend.variants.test.mjs
    greps:
      - path: test/support/variants.mts
        pattern: "\\btableRows\\b"
      - path: test/support/variants.mts
        pattern: "\\bloadGuard\\b"
      - path: src/lib/shared/env/config-entries.mts
        pattern: "export const SECRET_WORDS\\b"
      - path: src/lib/shared/work/declared-checks.mts
        pattern: "export const HTTP_KEYS\\b"
      - path: src/lib/shared/work/declared-checks.mts
        pattern: "export const RUN_KEYS\\b"
      - path: src/lib/shared/env/config-entries.variants.test.mts
        pattern: "const SECRET_WORDS = \\["
        absent: true
      - path: bench/test/spend.variants.test.mjs
        pattern: "spendRefusal --max-usd"
    tests: true
    drive:
      - covers: T-2.5
        command: node scripts/replay-rejected.mjs ae51e16c src/lib/shared/env/config-entries.variants.test.mts
        exit_code: 1
        contains:
          - "masked is open under pair places for:"
          - "https://a.example.com/x?password=Kval9"
      - covers: T-2.6
        command: node scripts/replay-rejected.mjs f281b6ad src/lib/verbs/verify/index.variants.test.mts
        exit_code: 1
        contains:
          - "verify is open under list placements for:"
          - "method post, after a valid check"
      - covers: T-2.7
        command: node scripts/replay-rejected.mjs ee6bb6a5 bench/test/spend.variants.test.mjs
        exit_code: 1
        contains:
          - "spendRefusal --max-usd is open under out-of-domain numbers for:"
          - "Infinity"
    security: false
  - n: 3
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.test.mts
    greps:
      - path: test/support/variants.mts
        pattern: "perl open modes"
      - path: test/support/variants.mts
        pattern: "\\bsplitAlternatives\\b"
      - path: test/support/variants.mts
        pattern: "\\bdeno\\b"
      - path: src/lib/hooks/guard/bash/in-place.variants.test.mts
        pattern: "\"FAMILIES\""
    tests: true
    drive:
      - covers: T-3.6
        command: node scripts/replay-rejected.mjs 2f702e9a src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under program flag spellings for:"
          - "node --eval="
      - covers: T-3.6
        command: node scripts/replay-rejected.mjs e4addfe2 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under stdin spellings for:"
          - "-X utf8 - <<"
      - covers: T-3.6
        command: node scripts/replay-rejected.mjs affc4412 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under perl open modes for:"
          - "open F, '> src/a.pl'"
      - covers: T-3.6
        command: node scripts/replay-rejected.mjs 9bebfab7 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard is open under program flag spellings for:"
          - "-r1"
    security: true
  - n: 4
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - src/lib/hooks/guard/bash/in-place.mts
      - src/lib/hooks/guard/bash/in-place.variants.test.mts
    greps:
      - path: src/lib/hooks/guard/bash/in-place.mts
        pattern: "export const VISIBLE_WRITERS\\b"
      - path: test/support/variants.mts
        pattern: "writer wrappers"
      - path: src/lib/hooks/guard/bash/in-place.variants.test.mts
        pattern: "\"VISIBLE_WRITERS\""
    tests: true
    drive:
      - covers: T-4.4
        command: node scripts/replay-rejected.mjs 49c9d9fe src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains:
          - "in-place guard on piped programs is open under writer wrappers for:"
          - "nohup echo"
    security: false
  - n: 5
    files:
      - test/repo/closures.test.mjs
    greps:
      - path: test/repo/closures.test.mjs
        pattern: "claudeArgs --max-budget-usd"
      - path: test/repo/closures.test.mjs
        pattern: "in-place guard on piped programs"
      - path: test/repo/closures.test.mjs
        pattern: "\\bregistryProblems\\b"
    tests: true
    drive:
      - covers: T-5.5
        command: node --test test/repo/closures.test.mjs
        exit_code: 0
    security: false
  - n: 6
    files:
      - CONTRIBUTING.md
    greps:
      - path: CONTRIBUTING.md
        pattern: "test/repo/closures\\.test\\.mjs"
      - path: CONTRIBUTING.md
        pattern: "\\btableRows\\b"
      - path: CONTRIBUTING.md
        pattern: "writer wrappers"
      - path: CONTRIBUTING.md
        pattern: "perl open modes"
      - path: CONTRIBUTING.md
        pattern: "a program piped in from anything but a visible `echo`"
    tests: true
    drive: false
    security: false
---
# Design: Closure checks derive spellings from guards

## Problem

Se4 reached review in seven items because a closure test (CONTRIBUTING.md:101) runs only the families and seeds its author picked: `in-place.variants.test.mts:105` applies `stdinSpellings` to three of eleven interpreter rows, and the families carry hand copies of guard tables (`INTERPRETER_FLAGS` in `test/support/variants.mts` has rows for 6 of the 11 rows of `FAMILIES` in `interpreters.mts:119`; `config-entries.variants.test.mts:20` copies `SECRET_WORDS`). The check must run in `npm test`, must fail on each rejected tree by naming a spelling the review found without help from the review probes, and may add no guard or interpreter row. `scripts/replay-rejected.mjs:7` copies only `test/support/variants.mts` and the named test files into a replayed tree, and most rejected trees predate the tables the derivation reads (`interpreters.mts` is absent at affc4412 and earlier).

## Decisions

### D-001: Families belong to a grammar, and a closure names its grammar
**Decision:** Infrastructural decision. `test/support/variants.mts` exports a closed set of grammars: `numbers`, `pairs`, `jsonBodies`, `requestProse(distractor)`, `declaredLists(valid)`, `interpreterArgv`, `shellCommands` and `editPaths`. Each grammar owns its families, its as-written form and its label function. A closure declares `grammar`, `seeds` and optional `probes`; `closureTests` runs every seed as written and through every family of the grammar, and runs probes (the literal review inputs) as written only. A family returns no spellings for a seed outside its shape (a stdin family given a seed with no program to feed) and throws when it lacks vocabulary for the seed, as `programFlagSpellings` does today. The per-check choice of families, through which the reviewed spellings went untried, is gone.
**Instead of:** a lint over closure files that requires every family of a grammar to appear in `checks`: it checks text, and each family added later would need every closure edited by hand.
**Risks:**
- **RISK-001** Applying every family to every seed opens a spelling at HEAD on day one. Mitigation: D-007 applies; the probes for this record ran the widened in-place, secret and declared-check sets at 29346d5b and found one open spelling (D-007).

### D-002: The guard's own tables feed the seeds and define coverage
**Decision:** Infrastructural decision. A closure declares `rows`: a table its guard module exports, a `key` per row and `seedsOf(row)`. Row seeds join every family run, and `closureTests` adds `<guard> covers every row of <table>`, which fails naming a row with no seed and a row whose seeds no family spells. For interpreter rows it also requires each top-level alternative of each write pattern to be matched, alone, by a write sample of a row that uses the pattern, so `open('src/a.py','w')` without `.write(` is a seed: the sample that exposed the 49c9d9fe hole. Four tables become exports with no behaviour change: `SECRET_WORDS` (`config-entries.mts:11`), `HTTP_KEYS` and `RUN_KEYS` (`declared-checks.mts:12`), `VISIBLE_WRITERS` (`in-place.mts:108`); `FAMILIES` is already exported.
**Instead of:** test-side copies of the tables, as today: a copy drifts, which is how 5 of 11 interpreter rows have no flag vocabulary.
**Risks:**
- **RISK-002** Splitting a regex source at its top-level `|` is a small parser (groups, classes, escapes) to maintain. Mitigation: unit tests over the alternatives of every current write pattern; a source it cannot split fails the row test naming the row, never a silent pass.
- **RISK-003** An alternative no program matches alone. Mitigation: the one overlap today, `File\.write` inside `\.write\(`, is isolated by `File.write "src/a.rb", "x"`, which the guard closes at HEAD (probed).

### D-003: Guard modules and tables load at test time
**Decision:** Infrastructural decision. `loadGuard(() => import(...), path)` and `tableRows(loaded, name)` in `variants.mts` turn a missing module or export into one failing row test that names it (`FAMILIES is not exported by src/lib/hooks/guard/bash/interpreters.mts`), while the family tests still run. A closure therefore keeps seeds that do not depend on the table (the family vocabulary, the shared secret names, its malformed items), and the rows only add seeds and check coverage. Replaying `bench/test/spend.variants.test.mjs` at 83ac0811 today ends in a SyntaxError naming `runRefusal` and no spelling; a closure that reads a table, or a guard export absent from a rejected tree, loads it this way.
**Instead of:** copying today's guard modules into the replayed tree: the replay would then test today's code, not the rejected code.

### D-004 (r2): Families own the program's grammar; three new spellings
**Decision:** Infrastructural decision. How a program spells flags, names, standard input, wrappers, Perl modes and secret names describes the program the guard reads, so it stays in the family vocabulary; the guard table decides which rows must be reached. Every `FAMILIES` row gets a vocabulary entry: flag rows for perl, bun, deno, Rscript and tclsh, name rows for bun, deno and Rscript, and standard input through the `run` subcommand for bun and deno (`bun run -`, `deno run -`, `deno run -A -`), on the user's ruling at the phase 3 gate. New spellings: `programFlagSpellings` adds a repeated program flag after the program (`-e1` and `-e 1`, the 20261115 hole `gawk -e W -e1`); `perlOpenModes` spells the modes `>`, `>>`, `+<`, `+>` in both quotes with no gap, a space or a tab, in `open(F, M)`, `open F, M` and `open(my $f, M, P)` (the 20261114 hole `open(F, "> src/a.pl")`); `writerWrappers` puts a visible writer behind `command`, `builtin`, `env`, `env -i`, `exec`, `nice`, `nohup`, `time`, a brace group and a subshell, piped with `|` and `|&` (the 20261116 hole). A vocabulary lists only spellings the real program accepts: `awk - << W` stays out, because awk reads `-` as program text.
**Instead of:** deriving spellings from the guard's regexes: a regex says what the guard already matches, so spellings built from it are closed by construction and find nothing.

### D-005: A registry names every guard, its closure and its tables
**Decision:** Infrastructural decision. `test/repo/closures.test.mjs` holds `GUARDS`, one entry per closure guard name (13 after phase 2): the name, the guard module, the closure file and the tables `{ module, name }`. It fails when a `*.variants.test.*` file is in no entry, an entry's closure file is missing or holds no `guard:` field with the name, or a listed table is not exported by its module or not named in a `tableRows(` call of the closure file. The checks are functions of a root and a registry, tested on temporary trees.
**Instead of:** recognising guards from code (callers of `refuse(`, hooks that deny): 13 modules call `refuse(` today, most of them verbs refusing bad usage, so day one would demand closure tests for usage errors.
**Risks:**
- **RISK-004** A guard nobody registers still passes every check. Mitigation: OQ-001; CONTRIBUTING.md keeps it among the named limits.

### D-006: The proof is one declared replay per rejected tree
**Decision:** Infrastructural decision. The phase whose derivation catches a review declares a drive check: `node scripts/replay-rejected.mjs <tree> <closure file>` exits 1 and prints the family's failure header and a label the review found that no probe holds. Seven reviews rejected eight trees, each the parent of the commit that carried the fix:

| Review | Tree | Family | Label |
|---|---|---|---|
| 20261030 cumulative | ee6bb6a5 | out-of-domain numbers (`spendRefusal --max-usd`) | `Infinity` |
| 20261109 checkpoint, phase 4 | 2f702e9a | distractor sentences; program flag spellings | `node --eval=` |
| 20261109 cumulative | e4addfe2 | quoted spans; stdin spellings | `-X utf8 - <<` |
| 20261113 cumulative | f281b6ad | list placements | `method post, after a valid check` |
| 20261114 close-three cumulative | affc4412 | perl open modes | `open F, '> src/a.pl'` |
| 20261114 environment checkpoint, phase 5 | ae51e16c | pair places | `https://a.example.com/x?password=Kval9` |
| 20261115 cumulative | 9bebfab7 | program flag spellings | `-r1` |
| 20261116 cumulative | 49c9d9fe | writer wrappers | `nohup echo` |

The environment review's second round rejected code that never reached a commit; ae51e16c fails the same families (`client_secret` under pair names, probed). At ee6bb6a5 the `--budget-usd` refusal lived inline in `bench/run.mjs:310`, so the check catches that review through the `--max-usd Infinity` half of its fix. `replay-rejected.mjs` stays unchanged, because everything a closure imports from support stays in `variants.mts`.
**Instead of:** a test in `npm test` that replays the eight trees: every run would export eight full trees and run their tests, and a shallow clone holds none of them.

### D-007: An open spelling the derivation finds at HEAD is closed in this item
**Decision:** Infrastructural decision. The probes for this record found one: `deno eval --quiet <program>` passes the in-place guard at HEAD, because `inlineProgram` reads only the word after the subcommand (`in-place.mts:32`). Phase 3 reads every word after the subcommand that is not a flag as program text and seeds the spelling, as C-020 requires of an open seed. A further open spelling a phase meets follows the same rule when the real program accepts it, and leaves the vocabulary when it does not.
**Instead of:** leaving deno's options out of the vocabulary: that picks seeds to keep the check green, the habit this item removes.
**Risks:**
- **RISK-005** More open spellings than a phase can close. Mitigation: OQ-002.

## Scope

**In:**
- Grammar-bound families, table rows and test-time loading in `test/support/variants.mts`; every closure test moved onto them.
- Exports of four existing guard tables; the deno subcommand read in the in-place guard (D-007).
- Vocabulary for every interpreter row the guard has; the repeated-flag, Perl mode and writer wrapper spellings.
- The guard registry check; replays of the eight rejected trees; CONTRIBUTING.md C-020 and its Guards section.

**Out:**
- New guards, new rows in `interpreters.mts`, and the spellings CONTRIBUTING.md names as limits (`cat fix.py | python3`, interpreters with no row).
- Closure tests for `guard.comments`, `guard.silenced`, `guard.block` and the rest of `guard.bash` (OQ-001).
- Build step 4 (the tester); changes to `scripts/replay-rejected.mjs`.

## Phase 1: Families bind to grammars

**Touch set:**
- `test/support/variants.mts`: grammars, closure shape, families
- `test/repo/variants.test.mjs`: helper tests on the new shape
- `test/repo/replay-rejected.test.mjs`: its generated closure uses grammar
- `bench/test/claude.variants.test.mjs`: numbers grammar
- `bench/test/spend.variants.test.mjs`: numbers grammar
- `src/lib/shared/drive-log.variants.test.mts`: JSON bodies grammar
- `src/lib/shared/admission/signals.variants.test.mts`: request prose grammar
- `src/lib/shared/env/config-entries.variants.test.mts`: pairs grammar
- `src/lib/shared/scenarios/rules.variants.test.mts`: JSON bodies grammar
- `src/lib/verbs/verify/index.variants.test.mts`: declared lists grammar
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: interpreter and shell grammars
- `src/lib/hooks/guard/scope/index.variants.test.mts`: edit paths grammar, onto `closureTests`

**Changes:** `variants.mts` replaces `ClosureCheck`, `checks` and the exported `asWritten` with these shapes:
- `Family<S, I> = { name: string; spell: (seed: S) => Spelling<I>[] }`
- `Grammar<S, I> = { name: string; written: (seed: S) => I; label: (input: I) => string; families: readonly Family<S, I>[] }`
- `Closure<S, I, R> = { guard: string; grammar: Grammar<S, I>; seeds: S[]; probes?: I[]; run: (input: I, t: TestContext) => R; closed: (output: R) => boolean }`

The grammars of D-001 wrap today's families unchanged in name and spelling order; `requestProse` and `declaredLists` take the distractor and the valid check as today's family factories do. `shellCommands` has no family yet (phase 4 adds one). `editPaths` holds the five spellings `guard.scope` builds today (absolute, `./`, `services/../`, upper-case folder on win32, symbolic link) as a family whose inputs name the form and the path, which the closure's `run` resolves in a project it creates. `closureTests` registers `<guard> stays closed as written` over the seeds' written forms then the probes, and `<guard> stays closed under <family>` for every family of the grammar over every seed, dropping repeated labels; the failure text stays `closureFailure`'s. `programFlagSpellings` returns nothing for a seed whose second word is not a program flag in the vocabulary, `stdinSpellings` nothing for a seed with no heredoc; both still throw for an interpreter with no vocabulary row. The vocabulary gains rows for perl (leading `-w`, cluster letter `w`, attached) and tclsh (leading `-encoding utf-8`), the two interpreters today's seeds name without one; their spellings are closed at HEAD (probed).

Each closure moves its review probes to `probes` and every other seed, from all of today's checks, to `seeds`.

**Done when:**
- **T-1.1** `test/repo/variants.test.mjs` runs a child closure test whose grammar has two families and two seeds: it reports one as-written test and one test per family, and each family test names the open spellings of both seeds.
- **T-1.2** A probe that a family would spell into an open input fails only the as-written test, and the family tests pass (child run in `test/repo/variants.test.mjs`).
- **T-1.3** `programFlagSpellings` and `stdinSpellings` return an empty list for a seed outside their shape and still throw `no flag table row for the interpreter <name>` for an interpreter with no vocabulary row (unit tests).
- **T-1.4** `test/support/variants.mts` holds no `ClosureCheck`, and `in-place.variants.test.mts` holds no `checks:` key (greps).
- **T-1.5** `guard.scope` runs through `closureTests` with the `editPaths` grammar, and `node --test src/lib/hooks/guard/scope/index.variants.test.mts` reports `guard.scope stays closed under` with the five spellings of each seed tried.
- **T-1.6** The replays declared in the frontmatter exit 1 at 2f702e9a naming `distractor sentences` and at e4addfe2 naming `quoted spans`.
- **T-1.7** `npm test` passes with every closure closed at HEAD.

## Phase 2: Guard tables feed the seeds

**Touch set:**
- `test/support/variants.mts`: loader, table rows, row coverage test
- `test/repo/variants.test.mjs`: row and loader tests
- `src/lib/shared/env/config-entries.mts`: export `SECRET_WORDS` only
- `src/lib/shared/work/declared-checks.mts`: export `HTTP_KEYS`, `RUN_KEYS` only
- `src/lib/shared/env/config-entries.variants.test.mts`: rows from `SECRET_WORDS`
- `src/lib/shared/drive-log.variants.test.mts`: rows from `SECRET_WORDS`
- `src/lib/shared/scenarios/rules.variants.test.mts`: rows from `SECRET_WORDS`
- `src/lib/verbs/verify/index.variants.test.mts`: rows from the check keys
- `bench/test/spend.variants.test.mjs`: loader, `spendRefusal` closure

**Changes:** `variants.mts` adds:
- `Loaded<M> = { path: string; module: Partial<M> | null; missing: string | null }` and `loadGuard<M>(load: () => Promise<M>, path: string): Promise<Loaded<M>>`; a rejected import sets `missing` to `<path> does not load: <message>`.
- `TableRows<Row> = { table: string; path: string; rows: readonly Row[]; missing: string | null }` and `tableRows<Row>(loaded, name)`, which reads an array, a `Set` or a `Map`'s keys; an absent export gives `<name> is not exported by <path>`.
- `RowSource<Row, S> = { table: TableRows<Row>; key: (row: Row) => string; seedsOf: (row: Row) => S[] }` and `Closure.rows?: RowSource<any, S>[]`.

`closureTests` adds row seeds to the seeds of every test and registers one `<guard> covers every row of <table>` per source. It fails listing the `missing` line, each row key with no seed, and each row key whose seeds every family of the grammar spells into nothing.

The closures:
- `masked`: rows `SECRET_WORDS` give `<word>=Kval9`; its seeds are the shared secret names (`JSON_SECRET_KEYS`) as `<key>=Kval9`, so a tree without the export still runs the families; the local word list goes; the review inputs become probes.
- `maskedBody` and `scenarioProblems`: rows `SECRET_WORDS` give `{"<word>":"Kval9"}`; seeds stay `jsonSecretSeeds`. All three sets are closed at HEAD (probed).
- `verify`: rows `HTTP_KEYS` and `RUN_KEYS`; `seedsOf(key)` picks the malformed items keyed by that field. Today's eight keep their labels; new ones cover `covers` (`T-2.1`), `contains` (`5`), `service` (`Orders!`), `replaces` (`S-1`) and `command` (`5`), all refused at HEAD in every placement (probed).
- spend: `bench/lib/spend.mjs` loads through `loadGuard`; a new closure `spendRefusal --max-usd` runs `spendRefusal(maxUsd, 5)` over the numbers seed 100. A closure whose function is absent fails naming it.

**Done when:**
- **T-2.1** A child closure whose table holds a row with no seed fails `covers every row of <table>` naming the row key; with a seed for every row it passes.
- **T-2.2** A child closure whose import rejects, or whose table export is absent, fails only its row test, naming the module or `<name> is not exported by <path>`, and its family tests still run and name their open spellings.
- **T-2.3** A child closure with a row whose seeds no family spells fails the row test naming the row.
- **T-2.4** `config-entries.mts` exports `SECRET_WORDS`, `declared-checks.mts` exports `HTTP_KEYS` and `RUN_KEYS`, and `config-entries.variants.test.mts` holds no literal word array (greps).
- **T-2.5** Replaying ae51e16c with the `masked` closure exits 1 and names `https://a.example.com/x?password=Kval9` under pair places.
- **T-2.6** Replaying f281b6ad with the `verify` closure exits 1 and names `method post, after a valid check` under list placements.
- **T-2.7** Replaying ee6bb6a5 with the spend closures exits 1 and names `Infinity` under out-of-domain numbers for `spendRefusal --max-usd`.
- **T-2.8** `npm test` passes.

## Phase 3: Interpreter rows feed the in-place closure

**Touch set:**
- `test/support/variants.mts`: vocabulary rows, new spellings, alternative split
- `test/repo/variants.test.mjs`: family and split tests
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: `FAMILIES` rows, write samples
- `src/lib/hooks/guard/bash/in-place.mts`: deno reads every word after `eval`
- `src/lib/hooks/guard/bash/in-place.test.mts`: pin the deno spellings
- `src/lib/hooks/guard/bash/interpreters.mts`: read only: `FAMILIES`, `familyOf`

**Changes:** The in-place closure's seed becomes `ProgramSeed = { interpreter: string; flag: string | null; program: string }`, spelled into today's `Invocation`. `WRITES: Record<string, string[]>` in the closure holds the write samples per vocabulary interpreter (python3, node, perl, ruby, bun, deno, php, lua, Rscript, awk, tclsh): today's write constants, `open(F, '>src/a.pl')` for perl, and one sample isolating each write pattern alternative. Seeds are every vocabulary interpreter's program flags crossed with its samples, plus a stdin seed (flag `null`) for every interpreter whose vocabulary reads standard input. Today's `AS_WRITTEN_SEEDS` become probes.

`variants.mts` adds:
- vocabulary rows for bun (long `--eval`, `--print`; leading `--smol`), deno (subcommand `eval`; `-q` before it, `--quiet` after it), Rscript (attached; leading `--vanilla`) and the awk stdin forms `-f -` and `-f /dev/stdin`; name rows for bun, deno and Rscript (`R`).
- `programFlagSpellings` appends `[interpreter, flag, program, flag + "1"]` and `[interpreter, flag, program, flag, "1"]`.
- `perlOpenModes` (family name `perl open modes`) in `interpreterArgv`: for a perl seed whose program opens a quoted path, the 4 modes by 2 quotes by 3 gaps by 3 call forms of D-004 on the seed's path, 72 spellings, all closed at HEAD (probed).
- `splitAlternatives(source: string): string[]`, the top-level alternatives of a regex source, and `interpreterRowSource(table, familyOf, writes)`, a `RowSource` over `FAMILIES` keyed by `names[0]`. A row fails when no vocabulary interpreter maps to it through `familyOf`, when a flag in its `programFlags` or `scriptFlags` or its `subcommand` has no spelling in that vocabulary, or when an alternative of its write pattern is matched alone by no sample of a row sharing the pattern. It takes the table and `familyOf` as arguments, so the module still imports only `node:` modules.

`in-place.mts`: the subcommand branch of `inlineProgram` returns every word after the subcommand that does not start with `-`, joined by newlines (D-007).

**Done when:**
- **T-3.1** `covers every row of FAMILIES` passes at HEAD, and `interpreterRowSource` over a fake table with a row no vocabulary interpreter maps to fails naming that row (unit test).
- **T-3.2** `splitAlternatives` returns the 8 alternatives of the shared write pattern, 2 of PHP's, 2 of Lua's and 7 of R's (unit tests against the sources copied as literals).
- **T-3.3** `programFlagSpellings` lists the two repeated-flag spellings last for node, php and awk (exact lists in unit tests).
- **T-3.4** `perlOpenModes` gives 72 spellings for `open(F, '>src/a.pl')`, the first three exact in a unit test, and nothing for a non-perl seed.
- **T-3.5** `inPlaceTargets` returns `src/a.ts` for `deno eval --quiet <write>` and `deno eval --ext ts <write>`, and still for `deno eval <write>` (unit tests in `in-place.test.mts`).
- **T-3.6** The four replays declared in the frontmatter exit 1 naming their family and label (2f702e9a, e4addfe2, affc4412, 9bebfab7).
- **T-3.7** `npm test` passes.

## Phase 4: Piped writers come from the guard's writer table

**Touch set:**
- `src/lib/hooks/guard/bash/in-place.mts`: export `VISIBLE_WRITERS` only
- `test/support/variants.mts`: `writerWrappers`, piped seed shape, bun and deno stdin
- `test/repo/variants.test.mjs`: wrapper and stdin spelling tests
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: piped closure rows

**Changes:** `PipedSeed = { writer: string; program: string; interpreter: string }`; `shellCommands` writes it as `<writer> '<program>' | <interpreter>` and gains `writerWrappers` (family name `writer wrappers`): the writer behind `command`, `builtin`, `env`, `env -i`, `exec`, `nice`, `nohup` and `time`, inside a brace group and a subshell, and piped with `|&`, eleven spellings in that order. The piped closure seeds `echo` with today's python3 program, takes rows from `VISIBLE_WRITERS` (each writer gives the same program), and keeps `PIPED_PROGRAM_SEEDS` as probes.

The bun and deno vocabulary rows gain standard input readings behind the `run` subcommand (D-004 r2): `bun run -`, `deno run -` and `deno run -A -`, so the in-place closure gets stdin seeds for both. Bare `bun` and `bun -` stay out, because bun does not read a program from them. All five readings the lead and the architect probed (`bun run -`, `bun run --smol -`, `deno run -`, `deno run -A -`, `deno -q run -`, each fed a `writeFileSync` heredoc) are refused at aa4b8c7d.

**Done when:**
- **T-4.1** `writerWrappers` spells exactly the eleven forms, in order, for `{ writer: "echo", program: "P", interpreter: "python3" }` (unit test).
- **T-4.2** `in-place.mts` exports `VISIBLE_WRITERS` and the piped closure names it in a `tableRows(` call (greps).
- **T-4.3** `in-place guard on piped programs stays closed under writer wrappers` and `covers every row of VISIBLE_WRITERS` pass at HEAD for `echo` and `printf`.
- **T-4.4** Replaying 49c9d9fe exits 1 and names `nohup echo` under writer wrappers.
- **T-4.5** `npm test` passes.
- **T-4.6** `stdinSpellings` spells exactly `bun run - << P` for a bun seed and `deno run - << P` then `deno run -A - << P` for a deno seed (unit tests), and `in-place guard stays closed under stdin spellings` passes at HEAD.

## Phase 5: The guard registry

**Touch set:**
- `test/repo/closures.test.mjs`: new registry and its checks
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: read: guard names, tables
- `bench/test/spend.variants.test.mjs`: read: four guard names

**Changes:** `GUARDS: { guard: string; module: string; closure: string; tables: { module: string; name: string }[] }[]` with the 13 entries: `in-place guard` (table `FAMILIES` of `interpreters.mts`), `in-place guard on piped programs` (`VISIBLE_WRITERS` of `in-place.mts`), `guard.scope` and `admit security` (no tables), `maskedBody`, `masked` and `scenarioProblems` (`SECRET_WORDS` of `config-entries.mts`), `verify` (`HTTP_KEYS`, `RUN_KEYS` of `declared-checks.mts`), the four spend guards and `claudeArgs --max-budget-usd`. `registryProblems(root, guards): Promise<string[]>` scans `src/`, `bench/` and `test/` for `*.variants.test.mts` and `*.variants.test.mjs` and returns one line per problem of D-005; a table counts as exported when importing the module gives a defined value under its name.

**Done when:**
- **T-5.1** `registryProblems` on the repository returns an empty list.
- **T-5.2** On a temporary tree, an unregistered `x.variants.test.mts` gives a problem naming the file.
- **T-5.3** On a temporary tree, a guard whose closure file is missing, and one whose closure holds no `guard: "<name>"`, each give a problem naming the guard.
- **T-5.4** On a temporary tree, a listed table its module does not export, and one no `tableRows(` call of the closure names, each give a problem naming the table and the file.
- **T-5.5** `node --test test/repo/closures.test.mjs` exits 0.
- **T-5.6** `npm test` passes.

## Phase 6: CONTRIBUTING describes derived closures

**Touch set:**
- `CONTRIBUTING.md`: C-020 at line 101, Guards at 129 to 151

**Changes:** C-020 says a guard's closure test declares its grammar, its seeds and the guard tables it reads through `tableRows`, and the guard has an entry in `test/repo/closures.test.mjs`; a guard over a grammar no family covers adds the grammar. The Guards section lists the grammars with their families, adds `perl open modes` and `writer wrappers`, states the row coverage rule and the test-time loading, and keeps the replay paragraph. The limits list rewrites its first bullet as a guard missing from the registry, adds the choice of which constants count as a guard's tables, and keeps the other bullets as they are.

**Done when:**
- **T-6.1** CONTRIBUTING.md names `test/repo/closures.test.mjs` and `tableRows` (greps).
- **T-6.2** The Guards section names `perl open modes` and `writer wrappers` (greps).
- **T-6.3** The in-place limit bullet keeps its text: its phrase `a program piped in from anything but a visible` still matches (grep).
- **T-6.4** `npm test` passes, its Markdown and dash scans included.

## Open questions

- **OQ-001** Should every `guard.*` hook (`guard.comments`, `guard.silenced`, `guard.block`, the rest of `guard.bash`) get a registry entry and a closure test, which would fail `npm test` until each has one? Owner: the user. Fallback: the registry covers the 13 closure guards and CONTRIBUTING.md names an unregistered guard as a limit.
- **OQ-002** If a phase finds more open spellings at HEAD than the deno one, close them all in this item or move some to a follow-up? Owner: the user. Fallback: the phase closes each one the real program accepts, seeded per C-020, lists them on its block, and stops with `PHASE STALLED` past three.
- **OQ-003** The brief puts "new interpreter rows" out of scope; this record reads that as rows of `FAMILIES` in `interpreters.mts`, not vocabulary rows in `variants.mts`. Owner: the user. Fallback: vocabulary rows are added (D-004) and `FAMILIES` is unchanged.

## Revision log

- 2026-11-16: D-004 (r2): bun and deno read standard input through `run -`; phase 4 adds the readings and T-4.6; user ruling at the phase 3 gate.
