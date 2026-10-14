---
kind: design
lane: design
title: Cut needless Bash guard fallthroughs
date: 2026-10-14
audience: developer
sources: request.md; D:/workspace/development/.picket/state/guard.log (read-only, replayed through a scratch copy of the guard); core/lib/hooks/guard.bash.mjs; core/lib/vendor/shell-quote-parse.mjs; core/lib/kernel-call.mjs; core/bin/picket.mjs; core/lib/verify.mjs; core/lib/preflight.mjs; core/lib/packet.mjs; core/lib/paths.mjs; test/hooks/handlers.test.mjs; test/hooks/hooks.test.mjs; test/budgets.test.mjs; work/20261008-tether-init-sets-up-a-project/design.md (D-006 r2)
phases:
  - n: 1
    files:
      - core/lib/hooks/guard.bash.mjs
      - test/hooks/handlers.test.mjs
    greps:
      - path: core/lib/hooks/guard.bash.mjs
        pattern: '"/dev/null"'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: '"\|&"'
    tests: true
    drive: true
    security: true
  - n: 2
    files:
      - core/lib/hooks/guard.bash.mjs
      - core/lib/tooling.mjs
      - core/lib/preflight.mjs
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
    greps:
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'export const KERNEL_READ_VERBS\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'export const KERNEL_OTHER_VERBS\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'export const KERNEL_READ_SUBVERBS\b'
      - path: core/lib/tooling.mjs
        pattern: 'export function detectTooling\b'
      - path: core/lib/preflight.mjs
        pattern: '\./tooling\.mjs'
    tests: true
    drive: true
    security: true
  - n: 3
    files:
      - core/lib/hooks/guard.bash.mjs
      - test/hooks/handlers.test.mjs
    greps:
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'function evaluateCommand\('
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'INERT_ROOTS\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'SUBSTITUTION_WORD\b'
    tests: true
    drive: true
    security: true
  - n: 4
    files:
      - core/lib/hooks/guard.bash.mjs
      - test/hooks/handlers.test.mjs
    greps:
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'VARIABLE_MARK\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'taintedNames\b'
    tests: true
    drive: true
    security: true
---
# Design: Cut needless Bash guard fallthroughs

## Problem

`guard.bash` sent 859 of 1627 commands in a week of real use to the permission prompt, and the project that produced the log (`D:/workspace/development`) has no `Bash(picket *)` allow rule, so each fallthrough there is a real prompt. Replaying the 862 log rows whose command is shorter than the 300-character trace cap through a scratch copy of the guard reproduces today's decisions exactly and shows where the prompts come from: a `2>/dev/null` counts as a write, a lone read-only `picket` call is left to a rule that project lacks, and any `$(...)` falls through, mostly in the shape `f=$(grep -rln ...); echo $f; cat -n $f`. Binding constraints: `guard.bash` is the permission guard, so every phase that changes what it allows takes its own gate (`security: true`); anything that still writes or runs unknown code keeps falling through; a hook starts cold under 200 ms (`test/budgets.test.mjs`); test fixtures taken from the log drop personal user paths (`C:/Users/<name>/...`), as `work/20261011-remove-personal-user-paths-from-tracked-files` requires. The replay also found a live hole: `cat x |& rm -rf y` is allowed today, because the tokenizer emits `|&` as an operator the guard ignores, so both commands land in one segment whose root is `cat`.

## Decisions

### D-001 (r2): a redirect into /dev/null is a discard, not a write
**Decision:** Infrastructural decision. In `splitIntoSegments`, a `>`, `>>` or `>&` whose target is exactly the string `/dev/null` sets no write flag and adds no redirect target; the target token is consumed as today. `&>` and `&>>` are not operators to the vendored tokenizer (it emits `&` then `>`, so `ls x &>/dev/null` reads today as a backgrounded `ls` plus a redirect); `shellText`, which already scans the raw text quote-aware, rewrites an unquoted `&>` that directly follows a non-`&`, non-`>` character to `>` and `&>>` to `>>`. The guard only needs the target, and `>` and `>>` always treat it as a file. Rewriting to `>&` instead would be unsafe: `ls x &>2` becomes `ls x >&2`, which the guard reads as descriptor duplication and allows, while bash writes a file named `2`. Example: `ls x >/dev/null 2>&1` becomes allowed; `ls x &> out.log` still falls through as `write-redirect` with target `out.log`; `ls x & >/dev/null` (with a space) still falls through as `background`.
**Instead of:** treating every `/dev/*` target, or Windows `NUL`, as a discard: `/dev/sda` and `/dev/tcp/host/port` write or connect, and `nul` under Git Bash is a device on some setups and a file on others; one exact string fails closed on everything else.
**Risks:**
- **RISK-001** The `&>` rewrite fires inside a quoted string such as `grep "a&>b" f`. Mitigation: the rewrite lives in the unquoted branch of `shellText`, after the quote branch, and a test pins `grep "a&>b" f` to `allow`.
- **RISK-002** A spelled variant (`/dev/../dev/null`, `"$N"` holding `/dev/null`) is still counted as a write. Mitigation: accepted; it falls through to the prompt, the safe direction.

### D-002: `|&` and `;;` separate segments
**Decision:** Infrastructural decision. `|&` and `;;` join the chain operators in `splitIntoSegments`, so `a |& b` splits into two segments, each classified. `cat x |& rm -rf y` turns from `allow` to `deny`; `npm test |& tail -20` is judged on `npm test` and `tail`. Splitting never hides a command, it only exposes more segments to classification.
**Instead of:** a separate fast-lane item for the hole: it sits on the same operator seam Phase 1 edits, and the Phase 1 tests exercise that seam anyway.
**Risks:**
- **RISK-003** Another ignored operator merges two commands the same way. Mitigation: the tokenizer's remaining operators are `<`, `<&`, `<(`, `<<<`, `(` and `)`; none of them separates commands except the parens, which are already transparent and leave both sides in the segment list. A test pins `cat x ;; rm -rf y` to `deny`.

### D-003 (r2): read-only kernel verbs are safe on their own
**Decision:** Infrastructural decision. `guard.bash.mjs` exports `KERNEL_READ_VERBS` (`state`, `next`, `packet`, `list`, `review-summary`, `cost`, `preflight`, `extensions`, `admit`, `find-verdict`, `verify`) and `KERNEL_OTHER_VERBS` (`init`, `extension`, `new`, `set`, `close`, `route`, `drive`, `comment`, `pr`, `migrate`, `check`, `source`). Every verb of the CLI's `Verbs:` list is in exactly one of the two. `source` sits in `KERNEL_OTHER_VERBS` because `add` and `pick` write snapshots; a third export, `KERNEL_READ_SUBVERBS` (`{ source: ["find", "grep"] }`), names the sub-verbs of an other-verb that only read. A sub-verb not listed there, including one added later, stays in the other class by default. A bare `picket` segment that wraps no command and names a read verb, or an other-verb with a listed read sub-verb, classifies `safe`, so it is allowed alone, piped into `tail`, or chained with other safe pieces. Every other bare `picket` segment keeps the `kernel` class and the rule of `work/20261008-tether-init-sets-up-a-project` D-006 (r2) unchanged: allowed only inside a compound. `verify` runs the project's test command unless `--no-tests` is given (`core/lib/verify.mjs:69`), so it is a read verb only when `--no-tests` is present, or no `--root` is given and the hook root's test command is absent or itself classifies `safe` through the guard, the same resolution `npm run <script>` already gets. To read that command without pulling `preflight.mjs`'s imports (work, git, sources, extensions) into a hook, `detectTooling` moves into a new `core/lib/tooling.mjs` that imports only `node:fs`, `node:path` and `config.mjs`; `preflight.mjs` re-exports it, so `check.mjs`, `drive.mjs` and `verify.mjs` keep their import. This supersedes D-006 (r2)'s lone-call clause for read verbs only: a project that dropped `Bash(picket *)` no longer gets a prompt for `picket state x`. Example: `picket verify 20261012-touring-deleteorder-blank-input-returns-500 1` in the development project (no test command detected) is allowed; `picket route x --verdict APPROVED --agent user` alone still falls through.
**Instead of:** relying on the `Bash(picket *)` rule `picket init` writes: the development project has no such rule and prompted on every read, and that rule also allows `route`, `set` and `close`, which is broader than a read.
**Risks:**
- **RISK-004** A new verb lands in neither set, or a read verb later gains a write. Mitigation: a test reads the `Verbs:` list in `core/bin/picket.mjs` and fails when a verb is in neither set or in both, so each new verb is placed on purpose; its failure message names the read set's contract (writes nothing, runs no project code).
- **RISK-005** `admit --request -` reads a heredoc whose body holds shell text. Mitigation: the body is already excluded from the command by `shellText`; the existing assertion at `test/hooks/handlers.test.mjs:386` changes from no decision to `allow`, and `picket admit --text "$(whoami)"` keeps no decision (`whoami` is not safe).

### D-004: one evaluator, called again for each `$(...)` body
**Decision:** Infrastructural decision. The per-command logic in `guardBash` (shell text, tokenize, split, the source rule, wrapped-command checks, classify, final verdict) moves into a pure `evaluateCommand(text, ctx)` returning `{ decision: "allow" | "deny" | null, reason }`, where `ctx` carries `cwd`, `root`, the protected source roots and `depth`; `guardBash` keeps only input checks, the call and the trace. Before tokenizing, a quote-aware scan finds each `$(` outside single quotes (not `$((`), finds its matching `)` and evaluates the body with `depth + 1`. A body that denies makes the whole command deny; a body with no `allow` makes it fall through as `hidden-execution`; an allowed body is replaced by one fixed word, `SUBSTITUTION_WORD`, that matches no root. Depth beyond 2, an unbalanced paren, backticks, `<(`, `>(`, `$((` and a `$(` inside an expanding heredoc body keep today's `hidden-execution` fallthrough. Example: `grep -rn "Headers" $(grep -rln "class AuthorizeApiKey" --include=*.cs . | grep -v /obj/) | head` is allowed; `echo $(rm -rf x)` turns from a fallthrough to `deny`.
**Instead of:** a second, lighter classifier for substitution bodies: it would skip the source rule and the wrapped-command check, so `$(git -C <source> tag v1)` would pass, and two copies of the verdict logic drift.
**Risks:**
- **RISK-006** The extraction changes a decision the current tests do not pin. Mitigation: Phase 3 lands the extraction with every existing guard test unchanged and green before any substitution is allowed, and replays a fixed list of real commands with expected decisions.
- **RISK-007** Recursion costs hook time. Mitigation: depth cap 2; `test/budgets.test.mjs` cold-start test stays under 200 ms.

### D-005: substituted output reaches only argument-inert roots
**Decision:** Infrastructural decision. The guard cannot see what a substitution prints, and the shell splits that output into words that can become flags. A segment carrying `SUBSTITUTION_WORD` in any token is `safe` only when its classification without the rule is `safe` and its root is in `INERT_ROOTS` (`cat`, `head`, `tail`, `wc`, `ls`, `dir`, `grep`, `echo`, `printf`, `stat`, `diff`, `pwd`): tools with no flag that writes a file or runs a command. The word in root position is `unknown`. A `deny` is never lowered. Excluded on purpose: `find` (`-delete`, `-exec`), `rg` (`--pre`), `git` (`--output`), `sed` (GNU sed reads `-i` after the script), `tree` (`-o`), `file` (`-C`) and `cd` (a computed directory hides a source from the source rule). Example: `cat "$(git rev-parse --show-toplevel)/package.json"` is allowed; `find . $(grep -l a b)` and `cd "$(git rev-parse --show-toplevel)" && ls` fall through.
**Instead of:** classifying the outer segment as if the word were a plain argument: `rg $(cat args.txt) x` with `--pre=./run.sh` in the file would run a script under an `allow`.
**Risks:**
- **RISK-008** The list is too narrow for real shapes (`sed -n 1,80p $f` was common). Mitigation: accepted; those keep the prompt, and widening the list is a one-line change with its own test.

### D-006: assignment-only segments set a tainted variable
**Decision:** Infrastructural decision. Most real substitutions are assigned first: `f=$(grep -rln "class X" --include=*.cs .); echo $f; cat -n $f`. A segment made only of `NAME=value` words runs nothing and classifies `safe`; its names join a per-command `taintedNames` set. The tokenizer is called with an env function that maps `$NAME` and `${NAME}` to a marker word (`VARIABLE_MARK` plus the name) instead of the empty string, so a later expansion is visible. A segment carrying a tainted name follows D-005 exactly as if it carried `SUBSTITUTION_WORD`; an untainted variable such as `$HOME` keeps today's treatment. `cd` with a target that carries any marker sets the effective cwd to unknown (`null`), which makes package-script resolution fail closed. `NAME=value cmd` (an env prefix on a command) stays `unknown`, as today. Example: `W=x; git -C $W merge y` stays `deny`; `c=rm; $c -rf x` falls through; `f=--pre=sh; rg $f x` falls through.
**Instead of:** leaving assignments `unknown`: Phase 3 alone recovers 2 of the 29 replayable `hidden-execution` rows, this decision 18 more. The cost is a taint concept in the guard (about 60 lines) that a reader must learn next to the placeholder word.
**Risks:**
- **RISK-009** Mapping every `$NAME` to a marker changes decisions that relied on the empty string (`cd $X` today keeps the old cwd). Mitigation: Phase 4 asserts that untainted expansions keep their current decisions on a list of real commands, and the `cd` change fails closed.
- **RISK-010** `export`, `read`, `local` and `for` assign variables without the `NAME=value` shape. Mitigation: their roots are `unknown`, so those commands keep falling through.

## Scope

**In:**
- `/dev/null` redirects and `&>` forms (D-001), the `|&` hole (D-002).
- Read-only kernel verbs alone or in pipes, with `verify` resolved against the test command (D-003).
- `$(...)` bodies classified by the same evaluator, their output limited to inert roots, assignment-only segments with variable taint (D-004 to D-006).

**Out:**
- Backticks, `<(...)`, `>(...)` and `$((...))`; `for`, `while` and `if` compound commands, which stay `unknown` (`for f in $(...); do ...; done` is the next largest shape).
- Narrowing the compound clause of 20261008 D-006 (r2) for mutating verbs (OQ-001).
- Raising the 300-character trace cap (OQ-002).

## Phase 1: /dev/null redirects and the |& hole

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: `shellText`, `splitIntoSegments`, `WRITE_REDIRECT_OPS`
- `test/hooks/handlers.test.mjs`: new guard decision test

**Changes:** In `shellText`'s unquoted branch, rewrite `&>>` to `>>` and `&>` to `>&` when the preceding character is not `&` or `>` (D-001). In `splitIntoSegments`, a `>`, `>>` or `>&` whose next token is the string `/dev/null` consumes that token and sets neither `sawWriteRedirect` nor a redirect target; add `|&` and `;;` to the chain operators (D-002). No change to the order of exits in `guardBash`. New test in `handlers.test.mjs` with the `withProject` helper and the decision lambda already used at line 257, fed real log commands with personal paths removed.

**Done when:**
- **T-1.1** `ls x 2>/dev/null`, `grep -n a f >/dev/null`, `ls x &>/dev/null`, `ls x >/dev/null 2>&1` and `ls .claude/settings.local.json 2>/dev/null && grep -n 'hooks' .claude/settings.local.json` each get `allow`.
- **T-1.2** `echo x > out.txt`, `echo x 2>/dev/null > out.txt`, `ls x &> out.log`, `ls x &>> out.log` and `echo x > /dev/sda` get no decision, and the last trace row's outcome is `fallthrough:write-redirect`.
- **T-1.3** `ls x & >/dev/null` gets no decision with outcome `fallthrough:background`; `grep "a&>b" f` gets `allow`.
- **T-1.4** `cat x |& rm -rf y` gets `deny`; `ls |& head` gets `allow`; `cat x ;; rm -rf y` gets `deny`.
- **T-1.5** `npm test` passes with every existing guard assertion unchanged.
- **T-1.6** The spawned hook `core/hooks/guard.bash.mjs`, fed `{"tool_input":{"command":"ls x 2>/dev/null"}}` on stdin with `CLAUDE_PROJECT_DIR` set to a temp project, prints `permissionDecision: "allow"` and appends an `allow` row to that project's `guard.log`.

## Phase 2: read-only kernel verbs stand alone

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: `classifySegment`, `BARE_KERNEL`, new verb sets
- `core/lib/tooling.mjs`: new, holds `detectTooling`
- `core/lib/preflight.mjs`: `detectTooling` moves out, re-exported
- `core/bin/picket.mjs`: read only, the `Verbs:` list the coverage test parses; it has unrelated uncommitted changes, never edit or stage it
- `test/hooks/handlers.test.mjs`: assertions at lines 260 and 386, new tests
- `test/hooks/hooks.test.mjs`: assertion at line 355

**Changes:** Move `detectTooling` and `detectedTooling` from `core/lib/preflight.mjs` into `core/lib/tooling.mjs` (imports `node:fs`, `node:path`, `./config.mjs` only); `preflight.mjs` re-exports `detectTooling`, so `check.mjs`, `drive.mjs` and `verify.mjs` stay untouched. In `guard.bash.mjs`, export `KERNEL_READ_VERBS`, `KERNEL_OTHER_VERBS` and `KERNEL_READ_SUBVERBS` with the members D-003 (r2) lists. In `classifySegment`, a segment whose first token is exactly `picket` and that wraps no command returns `safe` when its verb is in `KERNEL_READ_VERBS`, or when its verb and the next token form a pair in `KERNEL_READ_SUBVERBS` (`source find`, `source grep`), with `verify` held to D-003's condition: `--no-tests` present, or no `--root` and the hook root's `detectTooling(root).test` is null or classifies `safe` through the guard's own classification. Every other bare `picket` segment keeps returning `kernel`. `classifySegment` needs the hook `root` for `verify`; pass it the way `cwd` is passed today. Change the three assertions that pin a lone read call to no decision (`handlers.test.mjs:260`, `:386`; `hooks.test.mjs:355`) to expect `allow`, and add a no-decision assertion for a lone `picket route x --verdict APPROVED --agent user` next to each, so the mutating case stays pinned. Add the verb coverage test (RISK-004) in `handlers.test.mjs`, next to the `WRAPPING_FLAGS` test.

**Done when:**
- **T-2.1** In a temp project with no test command, `picket verify 20261012-touring-deleteorder-blank-input-returns-500 1`, `picket state x`, `picket next x`, `picket packet x`, `picket review-summary x` and `picket source grep analysis foo` each get `allow` alone, and `picket verify x 1 2>&1 | tail -20` gets `allow`.
- **T-2.2** Alone, `picket route x --verdict APPROVED --agent user`, `picket set x status=done`, `picket new --lane fast --title t`, `picket source add x ref` and `picket pr https://h/pr/1 --post f.md` get no decision; `picket drive --run "node .picket/state/scratch/drive-x.mjs" 2>&1 | tail -20` gets no decision; `picket next x; ls` keeps `allow`.
- **T-2.3** `picket verify x 1` gets no decision when the temp project's `package.json` test script is `node scripts/test.mjs`, and when `--root <other>` is given; `picket verify x 1 --no-tests` gets `allow` in that same project; it gets `allow` when `.picket/config.json` sets `commands.test` to `dotnet test`.
- **T-2.4** The coverage test fails when a verb from the `Verbs:` list in `core/bin/picket.mjs` is in neither `KERNEL_READ_VERBS` nor `KERNEL_OTHER_VERBS`, or in both, or when a key of `KERNEL_READ_SUBVERBS` is not in `KERNEL_OTHER_VERBS`; it passes on the current list, with `source` in `KERNEL_OTHER_VERBS`.
- **T-2.5** `npm test` passes, including the `test/budgets.test.mjs` cold-start test for `guard.bash.mjs` under 200 ms.
- **T-2.6** The spawned hook, fed `{"tool_input":{"command":"picket state x"}}` with `CLAUDE_PROJECT_DIR` set to a temp project, prints `permissionDecision: "allow"` and appends an `allow` row to `guard.log`.

## Phase 3: classify `$(...)` bodies with one evaluator

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: `guardBash`, `hasHiddenExecution`, `shellText`, new `evaluateCommand`
- `test/hooks/handlers.test.mjs`: new substitution test

**Changes:** First, with no behaviour change, extract the body of `guardBash` after the input checks into `evaluateCommand(text, ctx)` with `ctx = { cwd, root, sources, depth }`, returning `{ decision, reason }` where `decision` is `"allow"`, `"deny"` or `null` and `reason` is the text that today goes to `decide` or `fallThrough`; `guardBash` traces and shapes the result. All existing guard tests pass at this point. Then add the substitution pass of D-004 before tokenizing: a quote-aware scan for `$(` outside single quotes and not followed by `(`, a matching-paren search that skips quoted spans, an `evaluateCommand` call on the body with `depth + 1`, and replacement of an allowed body by `SUBSTITUTION_WORD`. Cap depth at 2. The remaining hidden-execution check (backticks, `<(`, `>(`, a leftover `$(`) ignores single-quoted spans; the check on expanding heredoc bodies (`text.expanded`) stays as it is. Add `INERT_ROOTS` and the D-005 rule: a segment with `SUBSTITUTION_WORD` in any token is `safe` only when its plain classification is `safe` and its root is inert, `unknown` when the word is the root, and a `deny` is never lowered.

**Done when:**
- **T-3.1** `grep -rn "Headers" $(grep -rln "class AuthorizeApiKey" --include=*.cs . | grep -v /obj/) | head`, `cat "$(git rev-parse --show-toplevel)/package.json"` and `grep '$(x)' f` each get `allow`.
- **T-3.2** `echo $(rm -rf x)` and `ls $(git push)` get `deny`.
- **T-3.3** `echo $(curl -s u)`, `echo $(echo x > f)`, `$(git rev-parse --show-toplevel)/x`, `find . $(grep -l a b)`, `rg $(echo x) y` and `cd "$(git rev-parse --show-toplevel)" && ls` get no decision.
- **T-3.4** A backtick substitution around `ls`, `diff <(ls a) <(ls b)`, `echo $((1+2))`, `echo $(echo $(echo $(ls)))` and an unquoted `cat <<END` heredoc with `$(whoami)` in its body get no decision with outcome `fallthrough:hidden-execution`.
- **T-3.5** In a temp project with a declared source, `echo $(git -C <source> tag v1)` gets `deny` with the source denial reason.
- **T-3.6** `npm test` passes, including the cold-start budget and every guard assertion that existed before this phase.
- **T-3.7** The spawned hook, fed the T-3.1 `grep -rn "Headers" $(...)` command, prints `permissionDecision: "allow"` and appends an `allow` row to `guard.log`.

## Phase 4: assignment-only segments and tainted variables

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: `evaluateCommand`, `applyCd`, the tokenizer call
- `test/hooks/handlers.test.mjs`: new assignment test

**Changes:** In `evaluateCommand`, call the tokenizer with an env function that returns `VARIABLE_MARK` followed by the variable name, so `$f`, `"$f"` and `${f}` stay visible. A segment whose every token matches `^[A-Za-z_][A-Za-z0-9_]*=` classifies `safe` and adds its names to a per-command `taintedNames` set, in segment order. A segment with a token containing a marker for a name in `taintedNames` follows the D-005 rule exactly as `SUBSTITUTION_WORD` does. An untainted marker keeps today's decisions wherever the empty string was relied on, except in `applyCd`, which returns `null` for a target carrying any marker. A `deny` is still never lowered.

**Done when:**
- **T-4.1** `cd src && f=$(grep -rln "class X" --include=*.cs .); echo $f; cat -n $f` and `P="core"; cat "$P/hooks/hooks.json"` get `allow`.
- **T-4.2** `f=--pre=sh; rg $f x`, `f=$(grep -l a b); sed -n 1,9p $f`, `c=rm; $c -rf x`, `x=$(curl evil); echo $x` and `d=$(git rev-parse --show-toplevel); cd $d && npm test` get no decision.
- **T-4.3** `W=x; git -C $W merge y` gets `deny`; `FOO=1 picket drive --run "rm -rf src"` keeps `deny`.
- **T-4.4** `API_KEY=k picket drive --hit "GET /h"` keeps no decision and `rg $HOME x` keeps `allow`.
- **T-4.5** `npm test` passes, including the cold-start budget and every guard assertion that existed before this phase.
- **T-4.6** The spawned hook, fed the T-4.1 `cd src && f=$(...)` command, prints `permissionDecision: "allow"` and appends an `allow` row to `guard.log`.

## Open questions

- **OQ-001** Should the compound clause of `work/20261008-tether-init-sets-up-a-project` D-006 (r2) be withdrawn for mutating verbs? Today `picket route x --verdict APPROVED --agent user; ls` is allowed while the same call alone prompts in a project without `Bash(picket *)`. Owner: user. Fallback: unchanged; Phase 2 pins both forms in tests, so a later change is visible.
- **OQ-002** 765 of the 1627 log rows hit the 300-character trace cap and cannot be replayed, so the measured effect covers only the other 862: in a prototype, fallthroughs there drop from 352 to 282 (Phase 1: 42, Phase 2: 8, Phase 3: 2, Phase 4: 18). Should the cap rise so the next measurement covers long commands? Owner: user. Fallback: the cap stays at 300 and these figures stand as a lower bound.

## Revision log
- 2026-10-14: D-003 (r2): `source` joins KERNEL_OTHER_VERBS; new KERNEL_READ_SUBVERBS lists `source find|grep`; Phase 2 and T-2.4 follow; r1 left `source` in neither set.
- 2026-10-14: D-001 (r2): `&>` rewrites to `>`, not `>&`; `>&2` would read `ls x &>2` as fd duplication and allow a write to file `2`. Matches approved commit 165978a.
