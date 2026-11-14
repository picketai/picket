---
kind: design
lane: design
title: A check for the guard bypass class
date: 2026-11-14
audience: developer
sources: [work/20261114-a-check-for-the-guard-bypass-class/request.md, work/20261114-a-check-for-the-guard-bypass-class/preflight.txt, work/20261030-bench-out-of-the-product-capped/verdicts.jsonl, work/20261109-close-guard-test-admit-ledger-gaps/verdicts.jsonl, work/20261113-declared-checks-verified-by-picket-verify/reviews/checkpoint.md, work/20261114-standard-test-environment-and-env-verbs/verdicts.jsonl, src/skills/reviewing/checklists/patterns-security.md, src/lib/shared/env/config-entries.mts, src/lib/hooks/guard/bash/in-place.mts, src/lib/shared/admission/signals.mts, src/lib/shared/work/declared-checks.mts, src/lib/verbs/verify/index.mts, bench/lib/spend.mjs, bench/run.mjs, bench/lib/claude.mjs, test/support/project.mts, test/support/git.mts, scripts/test.mjs, package.json, tsconfig.json, CONTRIBUTING.md, .claude/rules/harness-authoring.md]
phases:
  - n: 1
    files: [test/support/variants.mts, test/repo/variants.test.mjs, scripts/replay-rejected.mjs, test/repo/replay-rejected.test.mjs]
    greps:
      - path: test/support/variants.mts
        pattern: export function closureTests\b
      - path: test/support/variants.mts
        pattern: from ["'][.#]
        absent: true
      - path: scripts/replay-rejected.mjs
        pattern: \barchive\b
    tests: true
    drive:
      - covers: T-1.6
        command: node scripts/replay-rejected.mjs no-such-rev test/repo/variants.test.mjs
        exit_code: 2
        contains: ['no-such-rev']
      - covers: T-1.7
        command: node scripts/replay-rejected.mjs HEAD test/repo/variants.test.mjs
        exit_code: 0
    security: false
  - n: 2
    files: [test/support/variants.mts, test/repo/variants.test.mjs, src/lib/shared/env/config-entries.variants.test.mts]
    greps:
      - path: test/support/variants.mts
        pattern: \bpairPlaces\b
      - path: test/support/variants.mts
        pattern: \bpairNames\b
      - path: src/lib/shared/env/config-entries.variants.test.mts
        pattern: client_secret=K3
    tests: true
    drive:
      - covers: T-2.5
        command: node scripts/replay-rejected.mjs c63c2ddc src/lib/shared/env/config-entries.variants.test.mts
        exit_code: 1
        contains: ['redis://h:6379?password=zzz', 'https://a.example.com/x?client_secret=K3']
      - covers: T-2.6
        command: git diff --quiet 5d23e0c2 -- src/lib/shared/env/config-entries.mts
        exit_code: 0
    security: false
  - n: 3
    files: [test/support/variants.mts, test/repo/variants.test.mjs, src/lib/hooks/guard/bash/in-place.variants.test.mts]
    greps:
      - path: test/support/variants.mts
        pattern: \bprogramFlagSpellings\b
      - path: test/support/variants.mts
        pattern: \bstdinSpellings\b
    tests: true
    drive:
      - covers: T-3.5
        command: node scripts/replay-rejected.mjs d7011a32 src/lib/hooks/guard/bash/in-place.variants.test.mts
        exit_code: 1
        contains: ['node --eval=require', 'python3 -Bc open']
      - covers: T-3.6
        command: git diff --quiet 5d23e0c2 -- src/lib/hooks/guard/bash/in-place.mts
        exit_code: 0
    security: false
  - n: 4
    files: [test/support/variants.mts, test/repo/variants.test.mjs, src/lib/shared/admission/signals.variants.test.mts]
    greps:
      - path: test/support/variants.mts
        pattern: \bdistractorSentences\b
      - path: test/support/variants.mts
        pattern: \bquotedSpans\b
    tests: true
    drive:
      - covers: T-4.4
        command: node scripts/replay-rejected.mjs 2f702e9a src/lib/shared/admission/signals.variants.test.mts
        exit_code: 1
        contains: ['Rename the verdict token constant, and store the token in a cookie after login.']
      - covers: T-4.5
        command: node scripts/replay-rejected.mjs fe18d1fc src/lib/shared/admission/signals.variants.test.mts
        exit_code: 1
        contains: ['Implement "the session token expires after 15 minutes" from the ticket in the login flow.']
      - covers: T-4.6
        command: git diff --quiet 5d23e0c2 -- src/lib/shared/admission/signals.mts
        exit_code: 0
    security: false
  - n: 5
    files: [test/support/variants.mts, test/repo/variants.test.mjs, src/lib/verbs/verify/index.variants.test.mts]
    greps:
      - path: test/support/variants.mts
        pattern: \blistPlacements\b
    tests: true
    drive:
      - covers: T-5.4
        command: node scripts/replay-rejected.mjs d40b21ab src/lib/verbs/verify/index.variants.test.mts
        exit_code: 1
        contains: ['path orders, alone', 'drive: []']
      - covers: T-5.5
        command: git diff --quiet 5d23e0c2 -- src/lib/verbs/verify/index.mts src/lib/shared/work/declared-checks.mts
        exit_code: 0
    security: false
  - n: 6
    files: [test/support/variants.mts, test/repo/variants.test.mjs, bench/lib/spend.mjs, bench/run.mjs, bench/test/spend.variants.test.mjs]
    greps:
      - path: bench/lib/spend.mjs
        pattern: export function runRefusal\b
      - path: bench/run.mjs
        pattern: \brunRefusal\(
      - path: bench/run.mjs
        pattern: \bbudgetRefusal\(args\.budget\)
        absent: true
      - path: test/support/variants.mts
        pattern: \boutOfDomainNumbers\b
    tests: true
    drive:
      - covers: T-6.4
        command: node bench/run.mjs --tasks lane:fast --runs 0 --max-usd 10 --budget-usd abc --out tmp/bench-refusal.json
        exit_code: 1
        contains: ['refused: --budget-usd needs a positive number of dollars']
    security: false
  - n: 7
    files: [CONTRIBUTING.md, .claude/rules/harness-authoring.md]
    greps:
      - path: CONTRIBUTING.md
        pattern: \bC-020\b
      - path: CONTRIBUTING.md
        pattern: ^## Guards\b
      - path: CONTRIBUTING.md
        pattern: replay-rejected\.mjs
      - path: .claude/rules/harness-authoring.md
        pattern: \bC-020\b
    tests: true
    drive: false
    security: false
---
# Design: A check for the guard bypass class

## Problem
Four items repeated reviewer row Se4 ("a changed guard leaves an input uncovered"): a `--budget-usd` of `NaN`, `0` or `-5` passed the bench spend refusal (20261030, cumulative review at `83ac0811`); the admit security signal dropped a credential sentence beside "verdict token" or inside quotes, and the in-place guard missed `--eval=`, `-pe` and `-Bc` (20261109, phase 4 checkpoint and cumulative); a drive list holding only unreadable checks let `picket verify` pass on nothing (20261113, checkpoint at `c7d4b0be`); and `masked` left `?apikey=`, then `?client_secret=` and `&sslpassword=`, in clear (20261114, two phase 5 checkpoint rounds). In every case the guard was right for the spelling the plan named and the reviewer found a sibling spelling the code had not enumerated (another separator, a flag cluster, a quoted span, an out-of-range number, a malformed list item) by probing. The developer's tests pinned the named spelling only, so nothing before review asked for the siblings. The binding constraints are the brief's: the check must fail on the code those reviews rejected, it sits at the highest level that works, it may change a guard only as far as the check needs, and what no check covers is said plainly.

## Decisions

### D-001: The check is a closure test, not a type, a lint rule or a probe table
**Decision:** Infrastructural decision. Each guard gets a closure test: a unit test that takes seed inputs the guard must close on (refuse, deny, mask, fail, flag), spells each seed in every way a named family of spellings produces, runs the guard on every spelling, and fails listing each spelling that came out open. This is the reviewer's probing written down once per input grammar and run by `npm test` before review. A test is the highest level that covers all four findings: no TypeScript type can say a regular expression or a name list covers every spelling of a pair or a flag, two guards take plain strings, the bench guard is untyped JavaScript, and a lint rule that flags exact-name lists cannot tell a guard's list from any other constant while two of the four findings (the `NaN` budget, the unread `problems` list) hold no list at all.
**Instead of:** a probe table holding the literal inputs the four reviews ran: it fails on the rejected code, but it pins only those literals, so the next sibling spelling (`?refresh_token=` after `?access_token=`) slips through exactly as each review round's did. The literals stay, as seeds (D-006).
**Risks:**
- **RISK-001** A closure test proves only the families someone wrote, so a guard over an input grammar with no family is still unchecked. Mitigation: the plain statement in `## Scope` and CONTRIBUTING.md (phase 7) names this; a new grammar adds a family in the phase that adds the guard.
- **RISK-002** A type change would have caught the 20261113 finding alone (a result the caller cannot read without its problems). Mitigation: none needed now; that guard already fails closed (`src/lib/verbs/verify/index.mts:102`), and changing its result type is a guard rewrite the brief rules out.

### D-002: One helper module, families by input grammar
**Decision:** Infrastructural decision. `test/support/variants.mts`, imported as `#test/variants.mts`, holds the closure helper and every family. A family is a pure function from one seed to named spellings, grouped by the grammar it spells: key and value pairs in addresses, interpreter argument lists, request prose, declared lists, numbers. The module imports only `node:` modules, so a replay (D-004) can drop it into any older revision. The data shapes:
- `Spelling<T> = { label: string; input: T }`: `label` is the input written out literally, so a failure message and a drive's `contains` can quote it.
- `Family<T> = { name: string; spell: (seed: T) => Spelling<T>[] }`.
- `ClosureCheck<T> = { family: Family<T>; seeds: T[] }`.
- `Closure<T, R> = { guard: string; run: (input: T, t: TestContext) => R; closed: (output: R) => boolean; checks: ClosureCheck<T>[] }`: `run` gets the test's context so a guard that reads a project (verify) can make a temp folder that `t.after` removes.
**Instead of:** each guard's test writing its own spelling lists: nothing carries over, so the next guard over the same grammar (a second masker, a second interpreter guard) starts from the plan's one spelling again, which is how the class recurred four times.
**Risks:**
- **RISK-003** One module grows with every grammar. Mitigation: split it by grammar into `test/support/variants/` the day it passes 200 lines; the import path of the helper core stays.

### D-003: One test per guard and family, beside the guard, naming every open spelling
**Decision:** Infrastructural decision. `closureTests(closure)` registers one `node:test` test per check, named `<guard> stays closed under <family>`, whose failure message lists every open spelling's label, one per line. The test file is `<module>.variants.test.mts` beside the guard (`<module>.variants.test.mjs` in `bench/test/`), so `npm test` runs it through the existing globs (`scripts/test.mjs:7` and the product roots) and a replay can copy it alone.
**Instead of:** one test per spelling: the pair families alone give hundreds of spellings, which floods the `npm test` output; one per family keeps the output short and still names every escape.

### D-004: The proof on rejected code is a replay of the rejected git revision
**Decision:** Infrastructural decision. `scripts/replay-rejected.mjs <rev> <test-file>...` exports the tree at `<rev>` with `git archive` into a new temporary folder, copies `test/support/variants.mts` and each named test file from the working tree into it, runs `node --test` on those files there, prints the output, removes the folder, and exits with the test run's status (2 for a usage error or an unknown revision). Each guard phase declares a drive check that replays its closure test at the revision the review rejected and expects exit 1 with the review's probe in the output. The revisions, each probed on 2026-11-14 with the families of this record: `c63c2ddc` (`masked`, round 1), `d7011a32` (`in-place.mts`), `2f702e9a` and `fe18d1fc` (`signals.mts`, checkpoint and cumulative), `d40b21ab` (`verify`).
**Instead of:** keeping the rejected functions as test fixtures: they are copies of dead code that the type check and the convention scans read and that drift from the modules they imitate, while a git revision is the exact code the reviewer saw.
**Risks:**
- **RISK-004** A replay can fail for the wrong reason (an import the old tree lacks), which looks like a pass of the proof. Mitigation: every replay check's `contains` is a probe label that only a failed closure assertion prints.
- **RISK-005** A history rewrite would drop the named revisions. Mitigation: they are on `trunk`, which is never rewritten; a missing revision exits 2, not 1, so the check reports it.

### D-005: The bench refusal gets one exported seam and no replay
**Decision:** Infrastructural decision. `bench/lib/spend.mjs` exports `runRefusal({ maxUsd, budgetUsd, total })`, returning the refusal text or `null`, and `bench/run.mjs:321` calls it in place of the inline `budgetRefusal(...) ?? spendRefusal(...)`. The closure test runs the numbers family through it. The rejected rule lived inline in `main()` of `bench/run.mjs` at `ee6bb6a5:bench/run.mjs:310`, with no function to call, so no closure test can be replayed against it: a replay fails only on the missing export, which proves nothing (RISK-004). This finding is covered for today's code and stated as not replayable.
**Instead of:** driving the rejected `bench/run.mjs` itself: when its refusal fails open, the runner starts paid model calls, and `--runs 0` makes the drive safe only by giving it nothing to refuse.

### D-006: Seeds come from the review probes and the guard's own decision, never further
**Decision:** Infrastructural decision. A closure test's seeds are the literal inputs the reviews probed, run through an as-written family, and seeds the guard's recorded decision says it closes, run through the grammar's families. Every family and seed in this record was run against the base `5d23e0c2` and is closed there; a spelling the guard leaves open on purpose (the verdict-token rule of 20261109 D-004 (r2)) is never a seed. Two spellings that are open at the base and outside every reviewed decision became `OQ-001` and `OQ-002`, not seeds, because closing them is a guard rewrite.
**Instead of:** seeding every spelling a reviewer might try: an open seed turns the check red on day one and forces a guard change the brief puts out of scope.
**Risks:**
- **RISK-006** A developer adds a seed that is open at the base. Mitigation: each phase's first criterion is that its closure test passes on the working tree, and a new open spelling goes to the block's open questions, not into the guard.

### D-007: Docs last: one convention, one rule line, one plain statement
**Decision:** Infrastructural decision. CONTRIBUTING.md gains convention C-020 (a guard keeps a closure test beside it; a guard change adds its seeds; a new input grammar adds a family) and a `## Guards` section with the replay command and the plain statement of what no check covers. `.claude/rules/harness-authoring.md`, loaded by path for `src/**`, gains one line pointing at C-020, so the developer sees it while editing a guard.
**Instead of:** a line in the product's Se4 checklist row: that row serves every project's reviewer, and the helper, the families and the replay exist only in this repository.

## Scope
**In:**
- The closure helper and the replay script (phase 1).
- Closure tests for the five guards the four reviews rejected, each with its family: `masked` (phase 2), `inPlaceTargets` (phase 3), `signalsOf` security (phase 4), `verify` on declared drive lists (phase 5), the bench run refusal (phase 6).
- The `runRefusal` seam in `bench/lib/spend.mjs`, the only guard change (D-005).
- C-020, the `## Guards` section and the rule line (phase 7).

**Out:**
- Changing any guard's behaviour, including the two open spellings in `OQ-001` and `OQ-002`.
- Closure tests for guards no review rejected (`guard.comments`, `guard.silenced`, `guard.scope`, the PowerShell reader); C-020 asks for one when each is next changed.
- The env verbs, saved scenarios (TF-003), verdict tokens, gates, and the product's reviewing checklists.

**Left to prose, because no check covers it:**
- Recognising that a function is a guard. Nothing marks one: the bench refusal sat in a benchmark script and the declared-check reader was a parser, so a new guard without a closure test passes every check until a reviewer sees it.
- Naming the spellings of a grammar no family covers yet, such as a new config format or PowerShell's `-Command`. A family checks only the spellings someone wrote down.
- The other half of Se4, a guard that reads state a lower-trust actor can change. None of the four findings was of this kind, and whether a caller may trust a piece of state is a judgement per caller.
- A decision that is itself wrong. A closure test pins the guard's decision as written, so a spelling the decision leaves open stays open.
- Two rejected texts that cannot be replayed: the bench rule (D-005) and the second `masked` round of 20261114, which was never committed. Its five probe values are seeds of the phase 2 test, so the test fails on any text that leaves one of them open.

## Phase 1: Closure helper and replay script
**Touch set:**
- `test/support/variants.mts`: new closure helper module
- `test/repo/variants.test.mjs`: tests of the helper
- `scripts/replay-rejected.mjs`: new replay script
- `test/repo/replay-rejected.test.mjs`: tests of the replay script
- `test/support/git.mts`: temp repository helpers to reuse
- `test/support/project.mts`: `withProject` temp folder pattern
- `package.json`: `#test/*` import alias, read only
- `scripts/test.mjs`: product step runs `test/repo`
- `scripts/build.mjs`: script import and spawn conventions

**Changes:** Create `test/support/variants.mts` with the four types of D-002, `asWritten<T>(show: (input: T) => string): Family<T>` (one spelling per seed, labelled by `show`), `openSpellings(closure, check, t): Spelling<T>[]` (the spellings whose output `closed` rejects, in family order), `closureFailure(guard, familyName, labels): string` (a header line naming the guard and family, then one label per line), and `closureTests(closure): void` (registers the tests of D-003). It imports only `node:test` and `node:assert/strict`.

Create `scripts/replay-rejected.mjs`: arguments `<rev> <test-file>...`; resolve the repository with `git rev-parse --show-toplevel` from the working directory; check the revision with `git rev-parse --verify <rev>^{commit}`; create a folder with `mkdtempSync` under `os.tmpdir()`; extract `git archive <rev>` into it; copy `test/support/variants.mts` (when present) and each named file from the working tree to the same relative paths; run `process.execPath --test <files>` with that folder as the working directory and inherited output; remove the folder in `finally`; exit with the run's status. A missing revision or no test file exits 2 with a one-line message naming the problem, before any folder is created. It imports only `node:` modules.

**Done when:**
- **T-1.1** `openSpellings` returns exactly the open spellings in family order: a closure with `run: (n) => (n > 0 ? null : "refused")`, `closed: (r) => r !== null` and `asWritten` seeds `[-1, 0, 2]` gives the labels `["2"]`.
- **T-1.2** `closureFailure("g", "f", ["a", "b"])` returns a header naming `g` and `f` followed by the lines `a` and `b`, and a test asserts the whole text.
- **T-1.3** A temp test file that calls `closureTests` with one open seed, run with `node --test`, exits 1 and its output holds `g stays closed under as written` and the open label; with no open seed it exits 0.
- **T-1.4** `test/support/variants.mts` holds no relative or `#` import.
- **T-1.5** In a temp git repository with commit A whose guard leaves `-1` open and commit B that closes it, and an uncommitted closure test in the working tree, the replay at A exits 1 and prints `-1`, at B exits 0, and the `TMPDIR` the test sets is empty after both runs.
- **T-1.6** `node scripts/replay-rejected.mjs no-such-rev test/repo/variants.test.mjs` exits 2 and names `no-such-rev`; with no test file it exits 2 with the usage line.
- **T-1.7** `node scripts/replay-rejected.mjs HEAD test/repo/variants.test.mjs` exits 0, which shows the working-tree helper and test run inside an exported tree.

## Phase 2: Pair families and the masking closure test
**Touch set:**
- `test/support/variants.mts`: add the two pair families
- `test/repo/variants.test.mjs`: pin the families' spellings
- `src/lib/shared/env/config-entries.variants.test.mts`: new closure test for `masked`
- `src/lib/shared/env/config-entries.mts`: `masked(key, value)` under test, unchanged
- `src/lib/shared/env/config-entries.test.mts`: existing seeds, read only

**Changes:** Add two families on a seed `name=value`:
- `pairPlaces`: the pair placed in five addresses, in this order: `https://a.example.com/x?<pair>`, `https://a.example.com/x?a=1&<pair>`, `Server=h;<pair>`, `jdbc:postgresql://h/db?user=a&<pair>`, `redis://h:6379?<pair>`.
- `pairNames`: the name prefixed with `ssl`, `client_`, `access_` and `X-Amz-`, then upper-cased, each placed as `https://a.example.com/x?<name>=<value>`.

The closure test: guard `masked`, `run: (value) => masked("Url", value)`, `closed`: the output is not null and holds none of the test's secret values. Three checks:
- as written, on the nine values the two 20261114 reviews probed: `https://pay.example.com/hook?apikey=abc123`, `jdbc:mysql://h:3306/db?user=a&password=hunter2`, `redis://h:6379?password=zzz`, `SharedAccessSignature=sv=2020&sig=SECRETSIG`, `https://a.example.com/x?api_key=K1`, `https://a.example.com/x?access_token=K2`, `https://a.example.com/x?client_secret=K3`, `https://a.example.com/x?X-Amz-Signature=K4`, `jdbc:postgresql://h/db?user=a&sslpassword=K5`;
- `pairPlaces` and `pairNames`, each on `<word>=Kval9` for the eleven words `password`, `pwd`, `secret`, `token`, `api_key`, `apikey`, `signature`, `sig`, `credential`, `accountkey`, `sharedaccesskey`.

Probed on 2026-11-14: all nine values and every spelling of the eleven words across the five prefixes, upper case and five places (330) are masked at the base; at `c63c2ddc` all nine values and 318 of the 330 come back in clear.

**Done when:**
- **T-2.1** `node --test src/lib/shared/env/config-entries.variants.test.mts` passes with three tests: `masked stays closed under as written`, `under pair places` and `under pair names`.
- **T-2.2** The as-written check holds exactly the nine probe values above.
- **T-2.3** `pairPlaces` on `password=K` returns the five labels above in order, and `pairNames` on `password=K` returns `https://a.example.com/x?sslpassword=K`, `?client_password=K`, `?access_password=K`, `?X-Amz-password=K` and `?PASSWORD=K` forms in that order.
- **T-2.4** A guard that masks only after `;` (a test double in `test/repo/variants.test.mjs`) leaves `https://a.example.com/x?password=K` open under `pairPlaces`, so the family has teeth without the replay.
- **T-2.5** The replay at `c63c2ddc` exits 1 and its output holds `redis://h:6379?password=zzz` and `https://a.example.com/x?client_secret=K3`.
- **T-2.6** `src/lib/shared/env/config-entries.mts` is byte-identical to the base `5d23e0c2` (`git diff --quiet 5d23e0c2 --` on it exits 0).

## Phase 3: Argument families and the in-place closure test
**Touch set:**
- `test/support/variants.mts`: add `Invocation` and two families
- `test/repo/variants.test.mjs`: pin the families' spellings
- `src/lib/hooks/guard/bash/in-place.variants.test.mts`: new closure test for `inPlaceTargets`
- `src/lib/hooks/guard/bash/in-place.mts`: `inPlaceTargets(seg, heredocs)` under test, unchanged
- `src/lib/hooks/guard/bash/in-place.test.mts`: existing seeds, read only

**Changes:** Add `Invocation = { argv: string[]; heredocs: string[] }` and two families on it, driven by one table keyed by interpreter; an interpreter missing from the table throws, so a new one adds a row:

| Interpreter | Long form | Cluster letter | Leading flags |
|---|---|---|---|
| `node` | `-e` to `--eval` | `p` | `--no-warnings` |
| `python3` | none | `B` | `-X utf8` |
| `ruby` | none | `w` | `-w` |

- `programFlagSpellings`, on a seed `[interpreter, flag, program]` with no heredoc: the long form as two words and as `--long=<program>` (when the table has one), the cluster `-<letter><flag letter>`, and the leading flags before the flag. For `node -e P` that is `node --eval P`, `node --eval=P`, `node -pe P`, `node --no-warnings -e P`.
- `stdinSpellings`, on a seed `[interpreter]` with the program as its heredoc: `[interpreter, "-"]` and `[interpreter, ...leading, "-"]`.

Labels are the argument list joined by spaces, followed by ` << <program>` when a heredoc carries it. The closure test: guard `in-place guard`, `run: ({ argv, heredocs }) => inPlaceTargets(argv, heredocs)`, `closed`: a target starts with `src/a.`. Checks: as written on the four inputs the 20261109 reviews probed (`node --eval=require('fs').writeFileSync('src/a.ts','x')`, `node -pe` with the same program, `python3 -Bc open('src/a.py','w').write('x')`, and `python3 -X utf8 -` with that program as heredoc); `programFlagSpellings` on `node -e`, `python3 -c` and `ruby -e` with those write programs (`File.write('src/a.rb','x')` for ruby); `stdinSpellings` on `node`, `python3` and `ruby`. Probed on 2026-11-14: every spelling is closed at the base, and at `d7011a32` `--eval=`, `-pe`, `-Bc` and `-X utf8 -` are open.

**Done when:**
- **T-3.1** `node --test src/lib/hooks/guard/bash/in-place.variants.test.mts` passes with three tests: as written, program flag spellings, stdin spellings.
- **T-3.2** `programFlagSpellings` on `node -e P` returns exactly the four labels above, and on `python3 -c P` returns `python3 -Bc P` and `python3 -X utf8 -c P`.
- **T-3.3** `programFlagSpellings` on a seed whose interpreter is not in the table throws an error naming the interpreter.
- **T-3.4** `stdinSpellings` on `python3` with heredoc `P` returns `python3 - << P` and `python3 -X utf8 - << P`.
- **T-3.5** The replay at `d7011a32` exits 1 and its output holds `node --eval=require` and `python3 -Bc open`.
- **T-3.6** `src/lib/hooks/guard/bash/in-place.mts` is byte-identical to the base `5d23e0c2`.

## Phase 4: Prose families and the admit security closure test
**Touch set:**
- `test/support/variants.mts`: add the two prose families
- `test/repo/variants.test.mjs`: pin the families' spellings
- `src/lib/shared/admission/signals.variants.test.mts`: new closure test for the security signal
- `src/lib/shared/admission/signals.mts`: `signalsOf` under test, unchanged
- `src/lib/shared/admission/signals.test.mts`: existing seeds, read only

**Changes:** Add two families on a seed sentence `S` that ends with a period, where `s` is `S` with a lower-case first letter and `s'` is `s` without the period:
- `distractorSentences(distractor)`: a family factory. With distractor `D`: `D. S`, `S D.`, `D, and s`, and `D` then a newline then `S`.
- `quotedSpans`: `Implement "s'" from the ticket.`, the same with backticks, with curly quotes (U+201C, U+201D) and with single quotes, and `Make the API match the spec: "s'".`

The closure test: guard `admit security`, `run: (text) => signalsOf(text, [], [], ["src/auth/"])`, `closed`: `security` is true. Checks: as written on the seven requests the 20261109 reviews probed (`Rename the verdict token constant, and store the token in a cookie after login.`, `Log the verdict token. Then store the token in the cookie for login.`, `Implement "the session token expires after 15 minutes" from the ticket in the login flow.`, `Make the API match the spec: "every request carries a bearer token in the header".`, `Implement "rotate the refresh token on every login" from the ticket.`, `Fix "the login password check" in the form.` and ``Fix the bug in `password reset` flow.``); `distractorSentences("Rename the verdict token constant")` and `quotedSpans` on six seeds, each holding a credential word as 20261109 D-004 (r2) requires: `Store the token in a cookie after login.`, `The session token expires after 15 minutes.`, `Every request carries a bearer token in the header.`, `Rotate the refresh token on every login.`, `Fix the login password check in the form.`, `Hash the api key before saving it.` Probed on 2026-11-14: all closed at the base; at `2f702e9a` 34 of the 60 seeds and family spellings and all seven probe texts are open, at `fe18d1fc` 20 of 60 and three of seven.

**Done when:**
- **T-4.1** `node --test src/lib/shared/admission/signals.variants.test.mts` passes with three tests: as written, distractor sentences, quoted spans.
- **T-4.2** `distractorSentences("D")` on `Store it.` returns `D. Store it.`, `Store it. D.`, `D, and store it.` and `D` newline `Store it.`, in that order.
- **T-4.3** `quotedSpans` on `Store it.` returns the five spellings above for `store it`, in that order.
- **T-4.4** The replay at `2f702e9a` exits 1 and its output holds `Rename the verdict token constant, and store the token in a cookie after login.`
- **T-4.5** The replay at `fe18d1fc` exits 1 and its output holds `Implement "the session token expires after 15 minutes" from the ticket in the login flow.`
- **T-4.6** `src/lib/shared/admission/signals.mts` is byte-identical to the base `5d23e0c2`.

## Phase 5: List family and the declared drive list closure test
**Touch set:**
- `test/support/variants.mts`: add the list family
- `test/repo/variants.test.mjs`: pin the family's spellings
- `src/lib/verbs/verify/index.variants.test.mts`: new closure test for `verify`
- `src/lib/verbs/verify/index.mts`: `verify(root, id, n, options)` under test, unchanged
- `src/lib/verbs/verify/index.test.mts`: `checkSetup` and the drive-log row shape
- `src/lib/shared/work/declared-checks.mts`: the check rules malformations break
- `test/support/project.mts`: `withProject`, `openItem`, `writeArtifact`

**Changes:** Add `ListSeed = { label: string; lines: string[] }` and the factory `listPlacements(valid: string[]): Family<ListSeed>`: a seed holding one malformed item's lines spells three `drive:` blocks, labelled `<label>, alone`, `<label>, before a valid check` and `<label>, after a valid check`.

The closure test: guard `verify`, `run` writes an order record whose phase 1 carries the spelled `drive:` block, logs one drive row (the `checkSetup` row shape at `src/lib/verbs/verify/index.test.mts:105`) that passes the valid check `POST /orders` 201 covering `T-1.2`, and returns `verify(root, id, 1, { runTests: false, env: process.env })`; `closed`: `ok` is false. Checks: as written on `{ label: "drive: []", lines: ["    drive: []"] }`; `listPlacements` on eight malformed items labelled `method post`, `path orders`, `status "201"`, `status 999`, `no status`, `empty command`, `exit_code "0"` and `scalar item`. Probed on 2026-11-14 without the logged row: all 25 spellings fail verify at the base, and at `d40b21ab` the empty list and all eight `alone` spellings pass it.

**Done when:**
- **T-5.1** `node --test src/lib/verbs/verify/index.variants.test.mts` passes with two tests: as written, list placements.
- **T-5.2** `listPlacements(["V"])` on `{ label: "x", lines: ["M"] }` returns the labels `x, alone`, `x, before a valid check` and `x, after a valid check` with blocks `drive:` then `M`, then `M` and `V`, then `V` and `M`.
- **T-5.3** With the valid check alone and its row logged, the run's `verify` report is `ok: true`, so the closed outcome comes from the malformed item and not from a missing row.
- **T-5.4** The replay at `d40b21ab` exits 1 and its output holds `path orders, alone` and `drive: []`.
- **T-5.5** `src/lib/verbs/verify/index.mts` and `src/lib/shared/work/declared-checks.mts` are byte-identical to the base `5d23e0c2`.
## Phase 6: Number family and the bench refusal seam
**Touch set:**
- `test/support/variants.mts`: add the number family
- `test/repo/variants.test.mjs`: pin the family's spellings
- `bench/lib/spend.mjs`: export `runRefusal`
- `bench/run.mjs`: call `runRefusal` at line 321
- `bench/test/spend.variants.test.mjs`: new closure test for `runRefusal`
- `bench/test/spend.test.mjs`: existing refusal tests, read only

**Changes:** Add `outOfDomainNumbers: Family<number>`: on a positive seed `n`, the spellings `NaN`, `0`, `-0`, `-n`, `Infinity` and `-Infinity`, labelled so that `-0` reads `-0`. Add `runRefusal({ maxUsd, budgetUsd, total })` to `bench/lib/spend.mjs`, returning `budgetRefusal(budgetUsd) ?? spendRefusal(maxUsd, total)`; `bench/run.mjs:321` calls it with `args.maxUsd`, `args.budget` and `plan.total`, and nothing else in `main()` changes. The closure test holds two closures, closed when the result is a string: `runRefusal --budget-usd`, whose run plans one task of `budget_usd: 2` with the spelled budget through `plannedSpend` and refuses at `maxUsd: 100`; and `runRefusal --max-usd`, whose run refuses a total of 5 at the spelled cap with no budget flag. Each has one check, `outOfDomainNumbers` on seed 2 and 100. Probed on 2026-11-14: all twelve spellings are refused at the base; the rejected composition at `ee6bb6a5:bench/run.mjs:310` lets six of nine budget values through. That composition cannot be replayed (D-005).

**Done when:**
- **T-6.1** `node --test bench/test/spend.variants.test.mjs` passes with two tests, `runRefusal --budget-usd stays closed under out-of-domain numbers` and the same for `--max-usd`.
- **T-6.2** `outOfDomainNumbers` on 2 returns the labels `NaN`, `0`, `-0`, `-2`, `Infinity`, `-Infinity`, in that order.
- **T-6.3** `bench/run.mjs` decides a real run's refusal only through `runRefusal`, and `bench/test/spend.test.mjs` passes unchanged.
- **T-6.4** `node bench/run.mjs --tasks lane:fast --runs 0 --max-usd 10 --budget-usd abc --out tmp/bench-refusal.json` exits 1 and prints `refused: --budget-usd needs a positive number of dollars`; `--runs 0` keeps the drive free of model calls even if the refusal were open.
## Phase 7: Convention, rule line and the plain statement
**Touch set:**
- `CONTRIBUTING.md`: C-020 and a `## Guards` section
- `.claude/rules/harness-authoring.md`: one line pointing at C-020
- `test/repo/dashes.test.mjs`: dash scan over Markdown, read only
- `test/repo/markdown-paths.test.mjs`: path mentions must exist, read only
- `test/timing/budgets.test.mjs`: rule at most 60 lines, read only

**Changes:** In `### Lists, tests and instructions`, add C-020: a guard (a function whose closed outcome other code trusts: a refusal, a denial, a mask, a failed check) keeps a closure test `<module>.variants.test.mts` beside it, built with `#test/variants.mts`; a change to a guard adds its new seeds; a guard over an input grammar no family covers adds the family. Add `## Guards` after `## Hooks`: the closure helper and its families by grammar (one line each: pairs, interpreter arguments, request prose, declared lists, numbers); the replay, with `node scripts/replay-rejected.mjs <rev> <test-file>` and what its exit codes mean; the rule that seeds come from the review's probes and the guard's decision; and the plain statement of what no check covers, the first four items of this record's `**Left to prose**` list in that order. Add to `.claude/rules/harness-authoring.md` one sentence: a change to a guard keeps its closure test closed and adds its seeds (CONTRIBUTING.md C-020).

**Done when:**
- **T-7.1** CONTRIBUTING.md holds C-020 under `### Lists, tests and instructions`, naming `#test/variants.mts` and `<module>.variants.test.mts`.
- **T-7.2** CONTRIBUTING.md has a `## Guards` section that names the five families, the replay command and its exit codes 0, 1 and 2.
- **T-7.3** The `## Guards` section states the four things no check covers: recognising a guard, a grammar with no family, a guard reading state a lower-trust actor can change, and a wrong decision.
- **T-7.4** `.claude/rules/harness-authoring.md` names C-020 and stays within the 60-line rule budget.
- **T-7.5** `node --test test/repo/dashes.test.mjs test/repo/markdown-paths.test.mjs test/timing/budgets.test.mjs` passes.

## Open questions
- **OQ-001** Perl's three-argument `open(my $f, '>', 'src/a.pl')` is not a write call to `WRITE_CALL` (`src/lib/hooks/guard/bash/in-place.mts:11` wants a quoted mode holding `w`, `a` or `+`), so `perl -e` with it yields no target at the base (probed 2026-11-14). No review named it. Should a follow-up item close it? Owner: the user. Fallback: perl programs are not seeds of the phase 3 test.
- **OQ-002** A task file's `budget_usd` of 0 or below is not refused: `runRefusal` checks only the `--budget-usd` flag, the plan totals $0, and `claudeArgs` then drops `--max-budget-usd` (`bench/lib/claude.mjs:56` tests truthiness); probed 2026-11-14. Task files live in the repository, not in user input. Should a follow-up item refuse them? Owner: the user. Fallback: the number family seeds the two flags only.
- **OQ-003** A flag that takes a value before a heredoc program is open at the base: `python3 -X utf8`, `python3 -W ignore` and `node --require ./x.js`, each fed a write program on standard input, yield no target, because `readsStdin` (`src/lib/hooks/guard/bash/in-place.mts:31`) wants a `-` or flags only; the 20261109 review probed only `python3 -X utf8 -`. This is the same Se4 class, found by this record's families. Should a follow-up item fix `readsStdin`? Owner: the user. Fallback: `stdinSpellings` spells `-` after the leading flags only.

## Revision log
