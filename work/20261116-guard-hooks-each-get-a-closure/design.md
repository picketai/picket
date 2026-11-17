---
kind: design
lane: design
title: Every guard hook module gets a closure
date: 2026-11-16
audience: developer
sources: request.md; preflight.txt; CONTRIBUTING.md C-020 and Guards; test/support/variants.mts; test/repo/closures.test.mjs; src/lib/hooks/guard/**; src/lib/shared/comments.mjs, silenced.mjs, verdicts.mjs, paths.mts, shell/kernel-call.mts; work/20261116-guard-closure-checks-derive-their-spellings/design.md; work/20261031-lessons-from-a-consumer-project-s-memory/design.md D-006; probes run on fdd3a2fa with scratch scripts importing the guard modules
phases:
  - n: 1
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/hooks/guard/bash/judge.variants.test.mts
      - src/lib/hooks/guard/bash/bash.mts
      - src/lib/hooks/guard/bash/bash.test.mts
      - src/lib/hooks/guard/bash/rules.mts
    greps:
      - path: test/support/variants.mts
        pattern: "export const commandLines\\b"
      - path: src/lib/hooks/guard/bash/rules.mts
        pattern: "export const DENIED_NAMES\\b"
      - path: src/lib/hooks/guard/bash/judge.variants.test.mts
        pattern: "tableRows\\(\\w+, \"DENY_GIT_SUBCOMMANDS\"\\)"
      - path: test/repo/closures.test.mjs
        pattern: "guard.bash destructive roots"
    tests: true
    drive:
      - covers: T-1.3
        command: node --test src/lib/hooks/guard/bash/judge.variants.test.mts
        exit_code: 0
        contains:
          - "guard.bash destructive roots stays closed under command places"
          - "guard.bash destructive roots stays closed under word quotings"
          - "guard.bash destructive roots covers every row of DENIED_NAMES"
    security: true
  - n: 2
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/hooks/guard/bash/kernel.mts
      - src/lib/hooks/guard/bash/kernel.test.mts
      - src/lib/hooks/guard/bash/payloads.mts
      - src/lib/hooks/guard/bash/payloads.test.mts
      - src/lib/hooks/guard/bash/payloads.variants.test.mts
      - src/lib/hooks/guard/bash/kernel.variants.test.mts
    greps:
      - path: test/support/variants.mts
        pattern: "export const kernelCalls\\b"
      - path: src/lib/hooks/guard/bash/kernel.mts
        pattern: "export const LEAD_ONLY_VERBS\\b"
      - path: src/lib/hooks/guard/bash/payloads.variants.test.mts
        pattern: "tableRows\\(\\w+, \"LEAD_ONLY_VERBS\"\\)"
      - path: src/lib/hooks/guard/bash/kernel.variants.test.mts
        pattern: "tableRows\\(\\w+, \"WRAPPING_FLAGS\"\\)"
    tests: true
    drive:
      - covers: T-2.3
        command: node --test src/lib/hooks/guard/bash/payloads.variants.test.mts
        exit_code: 0
        contains:
          - "guard.bash lead-only verbs stays closed under kernel launchers"
          - "guard.bash lead-only verbs stays closed under command wrappers"
          - "guard.bash lead-only verbs covers every row of LEAD_ONLY_VERBS"
      - covers: T-2.4
        command: node --test src/lib/hooks/guard/bash/kernel.variants.test.mts
        exit_code: 0
        contains:
          - "guard.bash wrapped kernel commands covers every row of WRAPPING_FLAGS"
    security: true
  - n: 3
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/hooks/guard/bash/sources.variants.test.mts
      - src/lib/hooks/guard/bash/escalation.variants.test.mts
      - src/lib/hooks/guard/bash/powershell.variants.test.mts
    greps:
      - path: test/support/variants.mts
        pattern: "export const sourceCommands\\b"
      - path: test/support/variants.mts
        pattern: "export const powerShellCommands\\b"
      - path: src/lib/hooks/guard/bash/escalation.variants.test.mts
        pattern: "guard: \"guard.bash escalation of more than one command\""
      - path: src/lib/hooks/guard/bash/powershell.variants.test.mts
        pattern: "tableRows\\(\\w+, \"DENIED_NAMES\"\\)"
    tests: true
    drive:
      - covers: T-3.2
        command: node --test src/lib/hooks/guard/bash/sources.variants.test.mts
        exit_code: 0
        contains:
          - "guard.bash sources stays closed under source path spellings"
      - covers: T-3.3
        command: node --test src/lib/hooks/guard/bash/escalation.variants.test.mts
        exit_code: 0
        contains:
          - "guard.bash escalation outside an asking mode stays closed under command places"
          - "guard.bash escalation of more than one command stays closed under command places"
      - covers: T-3.4
        command: node --test src/lib/hooks/guard/bash/powershell.variants.test.mts
        exit_code: 0
        contains:
          - "guard.bash on PowerShell stays closed under PowerShell names"
          - "guard.bash on PowerShell covers every row of DENIED_NAMES"
    security: true
  - n: 4
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/hooks/guard/edit-target.mts
      - src/lib/hooks/guard/edit-target.test.mts
      - src/lib/hooks/guard/edit-target.variants.test.mts
      - src/lib/hooks/guard/scope/index.mts
      - src/lib/hooks/guard/scope/index.variants.test.mts
      - src/lib/hooks/guard/silenced/index.test.mts
    greps:
      - path: src/lib/hooks/guard/edit-target.mts
        pattern: "export function realPath\\b"
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: "\\bfunction realPath\\("
        absent: true
      - path: test/support/variants.mts
        pattern: "symbolic link from outside"
    tests: true
    drive:
      - covers: T-4.3
        command: node --test src/lib/hooks/guard/edit-target.variants.test.mts
        exit_code: 0
        contains:
          - "edit target stays closed under path spellings"
    security: false
  - n: 5
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/shared/comments.mjs
      - test/kernel/comments.test.mjs
      - src/lib/hooks/guard/comments/index.variants.test.mts
      - src/skills/reviewing/scripts/lint.craft.mjs
    greps:
      - path: test/support/variants.mts
        pattern: "\\bCOMMENT_SYNTAX\\b"
      - path: test/support/variants.mts
        pattern: "export const codeComments\\b"
      - path: src/lib/hooks/guard/comments/index.variants.test.mts
        pattern: "tableRows\\(\\w+, \"LANGS\"\\)"
    tests: true
    drive:
      - covers: T-5.4
        command: node --test src/lib/hooks/guard/comments/index.variants.test.mts
        exit_code: 0
        contains:
          - "guard.comments covers every row of LANGS"
          - "guard.comments stays closed under comment placements"
    security: false
  - n: 6
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/shared/silenced.mjs
      - test/kernel/silenced.test.mjs
      - src/lib/hooks/guard/silenced/index.variants.test.mts
    greps:
      - path: src/lib/shared/silenced.mjs
        pattern: "export const TEST_MOVES\\b"
      - path: test/support/variants.mts
        pattern: "\\bSKIP_APIS\\b"
      - path: src/lib/hooks/guard/silenced/index.variants.test.mts
        pattern: "tableRows\\(\\w+, \"TEST_MOVES\"\\)"
    tests: true
    drive:
      - covers: T-6.4
        command: node --test src/lib/hooks/guard/silenced/index.variants.test.mts
        exit_code: 0
        contains:
          - "guard.silenced covers every row of TEST_MOVES"
          - "guard.silenced stays closed under member spellings"
          - "guard.silenced stays closed under test file names"
    security: false
  - n: 7
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/shared/comments.mjs
      - test/kernel/comments.test.mjs
      - test/kernel/silenced.test.mjs
      - src/lib/hooks/guard/silenced/index.variants.test.mts
    greps:
      - path: test/support/variants.mts
        pattern: "\\bSUPPRESSIONS\\b"
      - path: src/lib/hooks/guard/silenced/index.variants.test.mts
        pattern: "tableRows\\(\\w+, \"LANGS\"\\)"
    tests: true
    drive:
      - covers: T-7.4
        command: node --test src/lib/hooks/guard/silenced/index.variants.test.mts
        exit_code: 0
        contains:
          - "guard.silenced covers every row of LANGS"
          - "guard.silenced stays closed under suppression places"
    security: false
  - n: 8
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/shared/silenced.mjs
      - test/kernel/silenced.test.mjs
      - src/lib/hooks/guard/silenced/index.variants.test.mts
    greps:
      - path: src/lib/hooks/guard/silenced/index.variants.test.mts
        pattern: "guard: \"guard.silenced thresholds\""
      - path: src/lib/hooks/guard/silenced/index.variants.test.mts
        pattern: "tableRows\\(\\w+, \"THRESHOLDS\"\\)"
    tests: true
    drive:
      - covers: T-8.4
        command: node --test src/lib/hooks/guard/silenced/index.variants.test.mts
        exit_code: 0
        contains:
          - "guard.silenced thresholds stays closed under threshold spellings"
          - "guard.silenced thresholds covers every row of THRESHOLDS"
    security: false
  - n: 9
    files:
      - test/support/variants.mts
      - test/repo/variants.test.mjs
      - test/repo/closures.test.mjs
      - src/lib/hooks/guard/block/index.mts
      - test/hooks/guard.block.test.mjs
      - src/lib/hooks/guard/block/index.variants.test.mts
    greps:
      - path: src/lib/hooks/guard/block/index.mts
        pattern: "export const BLOCKED_KINDS\\b"
      - path: test/support/variants.mts
        pattern: "export const agentBlocks\\b"
      - path: src/lib/hooks/guard/block/index.variants.test.mts
        pattern: "tableRows\\(\\w+, \"VERDICTS\"\\)"
    tests: true
    drive:
      - covers: T-9.4
        command: node --test src/lib/hooks/guard/block/index.variants.test.mts
        exit_code: 0
        contains:
          - "guard.block stays closed under fold spellings"
          - "guard.block covers every row of BLOCKED_KINDS"
    security: false
  - n: 10
    files:
      - test/repo/closures.test.mjs
      - CONTRIBUTING.md
    greps:
      - path: test/repo/closures.test.mjs
        pattern: "is a guard module with no GUARDS entry and no closure test"
      - path: test/repo/closures.test.mjs
        pattern: "\\bparts:"
      - path: CONTRIBUTING.md
        pattern: "A guard outside `src/lib/hooks/guard/` missing from the registry"
      - path: CONTRIBUTING.md
        pattern: "A guard missing from the registry\\."
        absent: true
      - path: CONTRIBUTING.md
        pattern: "\\bagentBlocks\\b"
    tests: true
    drive:
      - covers: T-10.4
        command: node --test test/repo/closures.test.mjs
        exit_code: 0
    security: false
---
# Design: Every guard hook module gets a closure

## Problem

`test/repo/closures.test.mjs` checks only the guards someone registered, so `guard.comments`, `guard.silenced`, `guard.block`, the edit target reading and every part of `guard.bash` except the in-place guard pass `npm test` with no closure test (CONTRIBUTING.md, Guards, first limit bullet). Each new closure must follow C-020 and the derived-closure record (`work/20261116-guard-closure-checks-derive-their-spellings/design.md`): it names a grammar, every family of that grammar runs on every seed, seeds come from the guard's own tables where it has them, and a family's vocabulary lists only spellings the real program accepts. A seed never comes from a spelling the guard's recorded decision leaves open; a spelling the decision covers and the guard misses at HEAD is closed in this item (request.md, last paragraph). The probes for this record ran the families below on fdd3a2fa and found 14 open spelling groups, each named in the phase that closes it.

## Decisions

### D-001: Every module under the guard folder answers to the registry
**Decision:** Infrastructural decision. `registryProblems` gains a module check: every `.mts` or `.mjs` file under `src/lib/hooks/guard/` that is not a `*.test.*` file must be the `module` of a `GUARDS` entry, one of its `parts`, or the module of one of its `tables`; otherwise the problem line is `<path> is a guard module with no GUARDS entry and no closure test`. An entry gains optional `parts: string[]` for the other guard modules whose decision its closure pins (the judge's entry lists `bash/index.mts` and `bash/bash.mts`), and a `module` or part that does not exist is a problem naming the guard. The unit is the module file, because the request names five parts of `guard.bash` by module and a folder-level rule would pass `guard.bash` on the in-place entries alone.
**Instead of:** counting a module as covered when a registered closure imports it, directly or through `#test/hook.mts`: one entry for `guardBash` would then cover all eleven bash modules.
**Risks:**
- **RISK-001** A new module listed as a part of an existing entry passes without a closure reaching its code. Mitigation: CONTRIBUTING.md names it as a limit; the reviewer sees the `parts` line in the diff.

### D-002: Shell grammars follow the guard's recorded decision
**Decision:** Infrastructural decision. `variants.mts` adds four grammars over command text (`Grammar<string, string>`), each closure's `closed` being a `deny`:
- `commandLines`: `word quotings` (each word as `'w'`, `"w"`, `\w`, `w0''rest`, `$'w'`, `$'\xHHrest'`, `$"w"`), `command paths` (`/bin/w`, `/usr/bin/w`, `w.exe`) and `command places` (after `&&`, `||`, `;`, `|`, `|&`, a newline and `&`; as `S &`; in `( )`, `$( )` and `"$( )"`; after an assignment, `2>/dev/null`, `</dev/null` and `>/dev/null`; after `!`, `time` and `time -p`; in `{ S; }`, `if true; then S; fi`, `if S; then :; fi`, `while S; do :; done`, `until S; do :; done` and `for i in 1; do S; done`).
- `sourceCommands`: the three `commandLines` families plus `source path spellings` (`{source}/./a`, `{source}/sub/../a`, a trailing slash, the path quoted, and `--target-directory={source}`), for seeds naming the placeholder `{source}`.
- `kernelCalls`: `kernel launchers` (`/usr/local/bin/picket`, `picket.cmd`, `picket.exe`, `node dist/bin/picket.mjs`, `node ./dist/bin/picket.mjs`, `dist/bin/picket.mjs`, `picket.mjs`, `npx picket`, `npx --yes picket`, `pnpx picket`, `bunx picket`, `npm exec -- picket`, `picket --human`, `picket --json`, `picket --root .`), `word quotings`, `command places` and `command wrappers` (`command`, `env`, `env -i`, `exec`, `nice`, `nohup`, `time`, `timeout 5`, `echo x | xargs`, `bash -c '…'`, `sh -c "…"`, `eval '…'`, `cmd /c`, `pwsh -c '…'`, `powershell -Command "…"`).
- `powerShellCommands`: `PowerShell names` (lower case, upper case, `& name`, `& 'name'`, `. name`, `Microsoft.PowerShell.Management\Verb-Noun` for a Verb-Noun name) and `PowerShell places` (`$true; S`, `S | Out-Null`, `(S)`, `$(S)`, `@(S)`, `if ($true) { S }`, `Write-Output 1 | S`, `1 | % { S }`).

`commandLines` has no wrapper family: D-006 of `work/20261031-lessons-from-a-consumer-project-s-memory/design.md` keeps a destructive root behind `env`, `sh -c`, `eval` or `xargs` at the prompt, while the lead-only refusal reads through wrappers (`leadOnlyInside`, `payloads.mts:156`), so only `kernelCalls` carries them. Backticks and `<( )` fall through as hidden execution, and a `case` arm, a function body and `coproc` are outside the families; CONTRIBUTING.md names all three.
**Instead of:** one shell grammar with every family for every `guard.bash` closure: its wrapper family would fail the destructive-root closure on a spelling the recorded decision leaves at the prompt, and its seeds would then rule against that decision.
**Risks:**
- **RISK-002** `variants.mts` grows past 1,000 lines. Mitigation: it stays one file because `scripts/replay-rejected.mjs` copies only it into a replayed tree (derived record, D-006); the grammars sit in sections in the order of this record.

### D-003: The bash reading reads a simple command the way bash does
**Decision:** Infrastructural decision. Two readings in `bash.mts` close the open `commandLines` spellings. `shellText` rewrites each `$'…'` word to a single-quoted word holding its decoded text (`\xHH`, `\NNN`, `\uHHHH`, `\n`, `\t`, `\\`, `\'`) and each `$"…"` to a double-quoted word. `splitIntoSegments` drops, from the front of a segment only, the reserved words `!`, `{`, `if`, `then`, `elif`, `else`, `do`, `while`, `until`, `time` (with a following `-p`) and a redirection with its target (`N>`, `N>>`, `<`, `N<`). Closing words (`}`, `fi`, `done`) stay as segments, so `{ ls; }` still falls through and no new `allow` appears except for read-only commands spelled with these words. Payload parsing and the in-place reading call the same functions, so they gain both readings.
**Instead of:** a check per root in `judge.mts` that looks past a leading keyword: the lead-only, source and in-place readings would each need the same skip.
**Risks:**
- **RISK-003** A first word `2` followed by `>` is read as a descriptor, where `2 >x rm` in bash runs a command named `2`. Mitigation: the error only denies; a pinning test in `bash.test.mts` names it.

### D-004: The kernel launcher includes the script and npm exec
**Decision:** Infrastructural decision. `asKernelLaunch` in `payloads.mts` reads a launcher whose name ends `.mjs` (`dist/bin/picket.mjs`, `picket.mjs`) as `picket`, as it reads `.cmd`, and `withoutPackageRunner` reads `npm exec` and `npm exec --` as runners next to `npx`, `pnpx` and `bunx`. `dist/bin/picket.mjs` carries a `#!/usr/bin/env node` line and the execute bit (read on fdd3a2fa), and `npm run claude` puts `dist/bin` on PATH, so both spellings run. `kernelVerbStart` in `src/lib/shared/shell/kernel-call.mts` is unchanged, because `observe.drive`, `check` and `mutate` read it too.
**Instead of:** widening `kernelVerbStart`: three readers outside the guard would change what they count as a kernel call.

### D-005 (r2): The edit target is the real path, unless that leaves the root
**Decision:** Infrastructural decision. `editTarget` computes `rel` and `outside` from the real paths of the root and the target, through the nearest existing ancestor, as `guard.scope` did at fdd3a2fa (`scope/index.mts:25`); `realPath` moves to `edit-target.mts` and `guard.scope` imports it. One exception: when the real path is outside the root and the event path (`repoRelative` on the event, as at fdd3a2fa) is inside it, `rel` and `outside` are the event path's. So a target is `outside` only when both readings are outside. Example: with `shared -> ../shared`, a Write to `shared/test/a.test.ts` reads `rel: shared/test/a.test.ts, outside: false`, and `guard.silenced` denies `it.skip(` there as it did at fdd3a2fa; a Write through `checks -> test` still reads `test/a.ts`. `editPaths` gains the form `symbolic link from outside` (a link outside the root to a folder inside it), and the `guard.scope` closure maps it. The probe found `it.skip(` written through a link `checks → test` passing `guard.silenced`, since `checks/a.ts` is no test path.
**Instead of:** the real path alone (r1): a write through a project link that points out of the root read as outside, so `guard.silenced` and `guard.comments` stopped checking a path they checked at fdd3a2fa (cumulative review, Major).
**Risks:**
- **RISK-006** `guard.scope` now reads such a write by its event path, where fdd3a2fa read `../…`. Mitigation: a `../` path matches no scope prefix, so scope can only gain a deny or an ask, never lose one; `underSource` and the unread check keep reading `abs`.

### D-006: Edit guards take their vocabularies per language row
**Decision:** Infrastructural decision. `variants.mts` holds, per `LANGS` extension, the comment forms the language defines (`COMMENT_SYNTAX`) and its checker suppressions (`SUPPRESSIONS`), and per test framework its skip and focus calls (`SKIP_APIS`); the closures read `LANGS`, `TEST_MOVES` and `THRESHOLDS` through `tableRows`, which also reads a plain object's own keys. `TEST_MOVES` becomes an export with no behaviour change. A `<script>` or `<style>` element counts as an embedded region of the markup rows. The guards close what the vocabularies find open: comment forms in phase 5, test moves in phase 6, suppressions in phase 7, threshold spellings in phase 8.
**Instead of:** deriving seeds from the `LANGS` row's own tokens: a seed built from the guard's table is closed by construction and finds nothing (derived record, D-004).
**Risks:**
- **RISK-004** A new suppression marker is also a directive (`DIRECTIVE_MARKERS` spreads `SUPPRESSION_MARKERS`), so `guard.comments` stops seeing it as a comment. Mitigation: intended, `guard.silenced` denies it instead; `test/kernel/comments.test.mjs` pins one marker per language.

### D-007: guard.block takes an agent block grammar
**Decision:** Infrastructural decision. `agentBlocks` (`Grammar<BlockSeed, string>`, `BlockSeed = { role: string; lines: string[] }`) has `line endings` (CRLF, trailing spaces), `field labels` (`**L:**`, `- L:`, `- **L:**`, `* L:`) and `fold spellings` (`(+3 more)`, `+ 3 more`, `and 3 more`, `(3 more)`, `…`); `closed` is a bounce. Seeds are one malformed block per problem `guardBlock` names; rows are `VERDICTS` (seed: the token with a full stop) and `BLOCKED_KINDS` (seed: `Verified: blocked: <kind>`), which becomes an export. `FOLDED_FILES` widens to the fold spellings, the only open group found.
**Instead of:** asserting that a passing block parses with `findVerdict`: the probe found the two in agreement on every token spelling, so the check would pin nothing new.

### D-008: An open spelling a closure finds at HEAD is closed in its phase
**Decision:** Infrastructural decision. The rule of the derived record's D-007 applies: the phase that adds a closure closes every open spelling of its families that the real program accepts, seeds it, and pins it in the module's unit test. The groups found by the probes are listed in each phase. A further open spelling found while building is closed the same way, or leaves the vocabulary when the real program refuses it, and the block lists it.
**Instead of:** a follow-up item for the fixes: the request asks this item to close them, and a closure merged red breaks `npm test`.
**Risks:**
- **RISK-005** Phases 5 to 8 close nine groups across some thirty languages and frameworks. Mitigation: OQ-001; each phase lists its groups, so a stall names what is left.

## Scope

**In:**
- Closure tests and registry entries for the destructive roots, lead-only verbs, wrapped kernel commands, sources, escalation and PowerShell parts of `guard.bash`, for the edit target reading, `guard.comments`, `guard.silenced` (two closures) and `guard.block`.
- The grammars and vocabularies they need in `test/support/variants.mts`, with unit tests in `test/repo/variants.test.mjs`.
- Exports of existing tables (`DENIED_NAMES`, `DENY_GIT_SUBCOMMANDS`, `NPM_DENY_SUBCOMMANDS`, `LEAD_ONLY_VERBS`, `TEST_MOVES`, `BLOCKED_KINDS`) and the guard changes that close the open spellings the closures find.
- The registry module check and `parts`; CONTRIBUTING.md C-020, the Guards grammar list and the limits list.

**Out:**
- Guards outside `src/lib/hooks/guard/`, new guards, new rows in `ROOTS`, `LANGS` or `interpreters.mts`.
- Destructive roots behind wrappers (recorded decision, OQ-002), hidden execution, `case` arms and function bodies.
- The awk operand reading, the Mu1 follow-up, build step 4 (the tester).

## Phase 1: Destructive roots get a closure

**Touch set:**
- `test/support/variants.mts`: `commandLines` grammar and three families
- `test/repo/variants.test.mjs`: exact spelling lists per family
- `src/lib/hooks/guard/bash/judge.variants.test.mts`: new destructive roots closure
- `src/lib/hooks/guard/bash/rules.mts`: export three deny tables only
- `src/lib/hooks/guard/bash/bash.mts`: ANSI-C quoting, leading words, redirections
- `src/lib/hooks/guard/bash/bash.test.mts`: pin the new readings
- `src/lib/hooks/guard/bash/judge.mts`: read only: deny path
- `src/lib/hooks/guard/bash/payloads.mts`: read only: payload parse reuse
- `test/support/hook.mts`: read only: `decision` helper
- `test/repo/closures.test.mjs`: entry `guard.bash destructive roots`

**Changes:** `variants.mts` adds `wordQuotings`, `commandPaths` and `commandPlaces` (`Family<string, string>`, names `word quotings`, `command paths`, `command places`) and `commandLines` (`written` and `label` verbatim), spelled as D-002 lists, in that order. A family splits a seed into words as the shell does (a quoted span is one word, respelled only by the other quote forms) and finds the command word after leading `NAME=value` assignments, so it applies to the wrapped kernel and escalation seeds of phases 2 and 3.

`rules.mts` exports `DENIED_NAMES`, `DENY_GIT_SUBCOMMANDS` and `NPM_DENY_SUBCOMMANDS` with no behaviour change. The closure, guard name `guard.bash destructive roots`, runs `decision(input, { root, tool: "Bash" })` in a project from `withProject` and is closed on `deny`. Rows: `DENIED_NAMES` (seed `<name> build`, `rm -rf build` for `rm`), `DENY_GIT_SUBCOMMANDS` (samples per subcommand, `git branch -D x` for `branch`, since a plain `git branch x` is not a delete), `NPM_DENY_SUBCOMMANDS` (`npm`, `yarn` and `pnpm` with the subcommand). Extra seeds: `git config user.name x`, `git -C sub push`.

`bash.mts` closes the groups the probes found open, per D-003:
- B1 `$'rm' -rf build`, `$'\x72m' -rf build`, `$"rm" -rf build`, `git $'push' origin` fall through as a variable mark.
- B2 `! S`, `time S`, `time -p S`, `2>/dev/null S`, `</dev/null S`, `{ S; }` and the four `if`, `while`, `until`, `for` forms fall through with the keyword or redirection read as the root.

Every other probed spelling of the three families is denied at fdd3a2fa.

**Done when:**
- **T-1.1** `test/repo/variants.test.mjs` asserts the exact spelling lists of the three families for the seed `rm -rf build` and the empty list of `command paths` for a seed whose first word is an assignment only.
- **T-1.2** `bash.test.mts` pins that `$'\x72m' -rf build`, `time -p rm -rf build`, `2>/dev/null rm -rf build` and `if true; then rm -rf build; fi` are denied, `{ ls; }` still gets no decision, and `time git status` is allowed.
- **T-1.3** `node --test src/lib/hooks/guard/bash/judge.variants.test.mts` exits 0 with every family test of `guard.bash destructive roots` and its three row tests passing (declared check).
- **T-1.4** `rules.mts` exports `DENIED_NAMES`, and the closure names `DENY_GIT_SUBCOMMANDS` in a `tableRows(` call (greps).
- **T-1.5** `registryProblems` on the repository returns an empty list with the new entry, whose tables are the three exports of `rules.mts`.
- **T-1.6** `npm test` passes.

## Phase 2: Kernel calls get closures

**Touch set:**
- `test/support/variants.mts`: `kernelCalls` grammar, launchers, wrappers
- `test/repo/variants.test.mjs`: exact launcher and wrapper lists
- `src/lib/hooks/guard/bash/kernel.mts`: export `LEAD_ONLY_VERBS`
- `src/lib/hooks/guard/bash/kernel.test.mts`: `isLeadOnly` matches the set
- `src/lib/hooks/guard/bash/payloads.mts`: `.mjs` launcher, `npm exec` runner
- `src/lib/hooks/guard/bash/payloads.test.mts`: pin the new launchers
- `src/lib/hooks/guard/bash/payloads.variants.test.mts`: lead-only verbs closure
- `src/lib/hooks/guard/bash/kernel.variants.test.mts`: wrapped kernel commands closure
- `src/lib/shared/shell/kernel-call.mts`: read only: `kernelVerbStart`
- `src/lib/verbs.mts`: read only: `leadOnly` entries
- `test/repo/closures.test.mjs`: two entries

**Changes:** `variants.mts` adds `kernelLaunchers` and `commandWrappers` (names `kernel launchers`, `command wrappers`) and `kernelCalls` with the four families of D-002. `kernel launchers` returns nothing for a seed whose command word is not `picket`; `command wrappers` leaves out `builtin`, which bash refuses for a program that is not a builtin.

`kernel.mts` exports `LEAD_ONLY_VERBS: ReadonlySet<string>`, the verbs of `VERB_NAMES` with `leadOnly: true`, and `isLeadOnly` reads it. The closure `guard.bash lead-only verbs` runs `decision(input, { root, tool: "Bash", agent: "abcd-developer" })`, closed on `deny`; rows `LEAD_ONLY_VERBS`, seed `picket <verb> 20261116-x --path a --text b`. The closure `guard.bash wrapped kernel commands` uses `commandLines` (wrappers stay at the prompt, D-002) and runs with no agent; rows `WRAPPING_FLAGS`, seeds `picket drive 20261116-x --run 'rm -rf build'`, the same with `--start`, and `picket check 20261116-x --only 'rm -rf build'`.

Open at fdd3a2fa and closed here (D-004), group B3: `dist/bin/picket.mjs comment x`, `./dist/bin/picket.mjs comment x`, `picket.mjs comment x` and `npm exec -- picket comment x` fall through for a developer. `$'picket'`, `time picket`, `! picket` and `{ picket …; }` were open too and close with phase 1's reading; every other probed launcher and wrapper spelling is denied.

**Done when:**
- **T-2.1** `test/repo/variants.test.mjs` asserts the exact `kernel launchers` and `command wrappers` lists for `picket comment x`, and an empty `kernel launchers` list for `rm -rf build`.
- **T-2.2** `payloads.test.mts` pins a `deny` for a developer running `dist/bin/picket.mjs waive x` and `npm exec -- picket reply x`, and no decision for the lead running either.
- **T-2.3** `node --test src/lib/hooks/guard/bash/payloads.variants.test.mts` exits 0 with every family and row test of `guard.bash lead-only verbs` passing (declared check).
- **T-2.4** `node --test src/lib/hooks/guard/bash/kernel.variants.test.mts` exits 0 with `guard.bash wrapped kernel commands covers every row of WRAPPING_FLAGS` passing (declared check).
- **T-2.5** `kernel.test.mts` asserts `LEAD_ONLY_VERBS` holds exactly `comment`, `reply`, `uninstall` and `waive`.
- **T-2.6** `npm test` passes.

## Phase 3: Sources, escalation and PowerShell get closures

**Touch set:**
- `test/support/variants.mts`: `sourceCommands`, `powerShellCommands` grammars
- `test/repo/variants.test.mjs`: exact lists for the new families
- `src/lib/hooks/guard/bash/sources.variants.test.mts`: sources closure
- `src/lib/hooks/guard/bash/escalation.variants.test.mts`: two escalation closures
- `src/lib/hooks/guard/bash/powershell.variants.test.mts`: PowerShell closure
- `src/lib/hooks/guard/bash/sources.test.mts`: read only: source project setup
- `src/lib/shared/escalation.mts`: read only: `ASKING_MODES`
- `src/lib/shared/shell/powershell.mts`: read only: PowerShell reading
- `test/repo/closures.test.mjs`: four entries

**Changes:** `variants.mts` adds `sourcePathSpellings` (name `source path spellings`, nothing for a seed without `{source}`), `sourceCommands`, `powerShellNames`, `powerShellPlaces` (names `PowerShell names`, `PowerShell places`) and `powerShellCommands`, as D-002 lists.

- `guard.bash sources`: the run makes a project whose config names a source folder through an env entry passed in `decision`'s `env`, replaces `{source}` with its path, and is closed on `deny`. Seeds: `touch {source}/a`, `cp a {source}/b`, `mkdir {source}/d`, `sed -i s/a/b/ {source}/a`, `echo x > {source}/a`, `echo x | tee {source}/a`, `git -C {source} commit -m x`, `cd {source} && touch a`. No table: a source write is any root that is not a source reader.
- `guard.bash escalation outside an asking mode`: `commandLines`; seeds `PICKET_ESCALATE="you asked" ` before `rm -rf build`, `git push origin trunk` and `npm publish`; the run judges each input in `bypassPermissions`, `dontAsk` and `plan`, the Claude Code modes outside `ASKING_MODES`, and is closed when all three deny.
- `guard.bash escalation of more than one command`: `commandLines`; seeds `PICKET_ESCALATE="you asked" rm a; rm b`, the same with `&&` and `|`; the run judges in every mode of `ASKING_MODES` and is closed when each denies.
- `guard.bash on PowerShell`: `powerShellCommands`, tool `PowerShell`, closed on `deny`; rows `DENIED_NAMES` (seed `<name> x`), extra seeds `git push origin trunk` and `git reset --hard`.

All probed spellings of these closures are denied at fdd3a2fa once phase 1 lands (`$'rm'` under an escalation was the one open form). `Invoke-Expression`, `iex`, `Start-Process` and `cmd /c` stay outside `PowerShell places`, as wrappers keep their class (D-002).

**Done when:**
- **T-3.1** `test/repo/variants.test.mjs` asserts the exact lists of `source path spellings`, `PowerShell names` and `PowerShell places` for one seed each, and an empty `source path spellings` list for a seed without `{source}`.
- **T-3.2** `node --test src/lib/hooks/guard/bash/sources.variants.test.mts` exits 0 (declared check).
- **T-3.3** `node --test src/lib/hooks/guard/bash/escalation.variants.test.mts` exits 0 with both escalation closures passing every family (declared check).
- **T-3.4** `node --test src/lib/hooks/guard/bash/powershell.variants.test.mts` exits 0 with `covers every row of DENIED_NAMES` passing (declared check).
- **T-3.5** `registryProblems` on the repository returns an empty list with the four new entries.
- **T-3.6** `npm test` passes.

## Phase 4: The edit target reads real paths

**Touch set:**
- `src/lib/hooks/guard/edit-target.mts`: real path `rel`, export `realPath`
- `src/lib/hooks/guard/edit-target.test.mts`: link and outside cases
- `src/lib/hooks/guard/edit-target.variants.test.mts`: edit target closure
- `src/lib/hooks/guard/scope/index.mts`: import `realPath`, drop copy
- `src/lib/hooks/guard/scope/index.variants.test.mts`: map the new form
- `src/lib/hooks/guard/silenced/index.test.mts`: skip through a linked folder
- `src/lib/shared/paths.mts`: read only: `repoRelative`
- `test/support/variants.mts`: `symbolic link from outside` form
- `test/repo/variants.test.mjs`: six path spellings
- `test/repo/closures.test.mjs`: entry `edit target`

**Changes:** per D-005. `editTarget` keeps its `EditTarget` shape; `rel` and `outside` come from `relative(realPath(root), realPath(abs))`, and `abs` stays the resolved event path that `editTexts` reads. `EditPathForm` gains `symbolic link from outside`, the sixth spelling of `path spellings`.

The closure `edit target` uses `editPaths`; seeds `{ tool: "Write", rel: "test/a.test.ts" }` and `{ tool: "Edit", rel: "src/a.ts" }`. Its run builds a project with a link inside the root to the seed's first folder and a link in a second temporary folder (removed in `t.after`) to the same folder, calls `editTarget`, and returns `rel` and `outside`; it is closed when `outside` is false and `rel` equals the seed's path, compared without case for `upper-case on win32`, because `repoRelative` reads the host's platform.

Open at fdd3a2fa, group E1: the inside link gives `linked/a.ts` and the outside link gives `outside: true`, so `guard.silenced` passes `it.skip(` written through `checks/a.ts` and `guard.comments` skips a file it should scan.

**Done when:**
- **T-4.1** `edit-target.test.mts` asserts `rel` `test/a.test.ts` and `outside` false for a Write through a linked folder inside the root and through a link from outside the root.
- **T-4.2** `silenced/index.test.mts` asserts a deny for `it.skip(` added to `checks/a.ts` where `checks` links to `test`.
- **T-4.3** `node --test src/lib/hooks/guard/edit-target.variants.test.mts` exits 0 (declared check).
- **T-4.4** `scope/index.mts` holds no `function realPath(` of its own, and `guard.scope stays closed under path spellings` passes with six spellings per seed.
- **T-4.5** `npm test` passes.

## Phase 5: guard.comments gets a closure

**Touch set:**
- `test/support/variants.mts`: `COMMENT_SYNTAX`, `codeComments`, plain-object `tableRows`
- `test/repo/variants.test.mjs`: placements list, object rows
- `src/lib/shared/comments.mjs`: language rows read the open forms
- `test/kernel/comments.test.mjs`: pin each new form
- `src/lib/hooks/guard/comments/index.variants.test.mts`: comments closure
- `src/skills/reviewing/scripts/lint.craft.mjs`: reads `LANGS`; follow a row shape change [INFERRED]
- `src/lib/hooks/guard/comments/index.mts`: read only: deny path
- `test/repo/closures.test.mjs`: entry `guard.comments`

**Changes:** `tableRows` reads a plain object's own keys as rows. `CommentSeed = { ext: string; text: string; trails: boolean }`, where `text` is a whole comment in the language and `trails` says it may follow a statement on its line. `COMMENT_SYNTAX: Record<string, { statement: string; forms: { text: string; trails: boolean }[] }>` per `LANGS` extension:
- JavaScript and TypeScript rows: `// note`, `/* note */`, `/** note */`, a three-line block; C-style rows the same, with `/// note` for `.cs`, `.rs`, `.dart`, `.swift` and `//! note` for `.rs`.
- `.php`: `// note`, `# note`, `/* note */`; `.py`: `# note`, `"""note"""`; `.rb`: `# note`, `=begin`/`=end`; `.pl`: `# note`, `=pod`/`=cut`; `.sh`, `.bash`, `.r`: `# note`; `.ps1`: `# note`, `<# note #>`; `.sql`: `-- note`, `/* note */`; `.vb`: `' note`, `REM note`.
- Markup rows: an HTML comment holding `note`; `.html`, `.htm`, `.vue`, `.svelte` also `// note` in a `<script>` element and `/* note */` in `<script>` and `<style>`; `.cshtml`, `.razor` also `@* note *@`.

`codeComments` (`Grammar<CommentSeed, CommentEdit>`, `CommentEdit = { tool: "Write" | "Edit"; rel: string; before: string; input: Record<string, string | boolean> }`) has one family, `comment placements`: indented by four spaces, by a tab, after the row's statement (trailing forms only), with CRLF line ends, added by an Edit to a file holding the statement, and by an Edit with `replace_all` over two equal statements. The closure writes `before` to `src/a<ext>` in a project, calls `guardComments` and is closed on `deny`; rows `LANGS` with `seedsOf(ext)` from `COMMENT_SYNTAX`. Samples in the closure file are one-line string literals with `\n` escapes, since `guard.comments` reads each line of a multi-line template literal as code when the file is written.

Open at fdd3a2fa and closed in `comments.mjs` (a row may carry more than one line token and block pair; `#[` stays a PHP attribute): C1 `REM note` in `.vb`; C2 `# note` in `.php`; C3 `=begin`/`=end` in `.rb` and `=pod`/`=cut` in `.pl` at line start; C4 `// note` inside `<script>` in `.vue` and `.svelte` (probed; `.html` unprobed, same reading); C5 `@* note *@` in `.razor` and `.cshtml`.

**Done when:**
- **T-5.1** `test/repo/variants.test.mjs` asserts the six `comment placements` for `{ ext: ".ts", text: "// note", trails: true }` and that `tableRows` gives the keys of a plain object.
- **T-5.2** `test/kernel/comments.test.mjs` asserts `commentLines` finds `REM note` in `.vb`, `# note` in `.php`, `=begin` blocks in `.rb`, a `<script>` comment in `.vue` and `@* note *@` in `.razor`, and finds no comment in the PHP line `#[Attribute]`.
- **T-5.3** `lint.craft.mjs` reports the same findings on its existing tests after the row change.
- **T-5.4** `node --test src/lib/hooks/guard/comments/index.variants.test.mts` exits 0 with `guard.comments covers every row of LANGS` passing (declared check).
- **T-5.5** `npm test` passes.

## Phase 6: guard.silenced gets a closure for test moves

**Touch set:**
- `test/support/variants.mts`: `SKIP_APIS`, `silencedLines`, two families
- `test/repo/variants.test.mjs`: exact member and file name lists
- `src/lib/shared/silenced.mjs`: export `TEST_MOVES`; read the open forms
- `test/kernel/silenced.test.mjs`: pin each new form
- `src/lib/hooks/guard/silenced/index.variants.test.mts`: silenced closure
- `test/repo/closures.test.mjs`: entry `guard.silenced`

**Changes:** `SilencedSeed = { rel: string; line: string }`; `silencedLines` (`Grammar<SilencedSeed, SilencedSeed>`) has `test file names` (the seed's file renamed by its language's test file conventions: `test/`, `tests/`, `__tests__/`, `spec/`, `.test.`, `.spec.`, `_test.`, `test_` and the `Tests` suffix, as each language uses them) and `member spellings` (for a JavaScript or TypeScript seed: `it .skip(`, `it?.skip(`, `it["skip"](`, `it['skip'](`, and a line starting `.skip(` that continues a chain). `SKIP_APIS` lists per framework: mocha, jest and vitest (`it.skip`, `it.only`, `describe.skip`, `describe.only`, `test.todo`, `it.skipIf(true)`), jasmine (`xit(`, `fit(`, `fdescribe(`), node:test (`{ skip: true }`, `{ skip: "why" }`, `{ todo: true }`, `{ only: true }`, `t.skip()`, `t.todo()`), pytest (`@pytest.mark.skip`, `@pytest.mark.xfail`, `pytest.skip("x")`), unittest (`@unittest.skip("x")`, `self.skipTest("x")`), NUnit `[Ignore("x")]`, xUnit `[Fact(Skip = "x")]`, JUnit 5 `@Disabled`, JUnit 4 `@Ignore`, Go `t.Skip()`, Rust `#[ignore]`.

The closure `guard.silenced` writes the line to the seed's path with `guardSilenced` and is closed on `deny`; rows `TEST_MOVES` keyed by `kind`, seeds from `SKIP_APIS`. `silenced.mjs` exports `TEST_MOVES` and closes:
- S1 `it .skip(`, `it?.skip(`, `it["skip"](` and a continuation line `.skip(` pass at fdd3a2fa.
- S2 `it.skipIf(true)`, the node:test option objects, `t.skip()`, `t.todo()`, `pytest.skip(`, `self.skipTest(`, JUnit 4 `@Ignore` and Rust `#[ignore]` pass at fdd3a2fa.

**Done when:**
- **T-6.1** `test/repo/variants.test.mjs` asserts the exact `member spellings` list for `it.skip("a", () => {});` and an empty list for a Python seed.
- **T-6.2** `test/kernel/silenced.test.mjs` asserts a `skipped-test` move for `it?.skip(`, `.skip(` on its own line, `test("a", { skip: true }, …)`, `self.skipTest("x")` and `#[ignore]` in `tests/a.rs`, and a `focused-test` move for `test("a", { only: true }, …)`.
- **T-6.3** `silenced.mjs` exports `TEST_MOVES` and the closure names it in a `tableRows(` call (greps).
- **T-6.4** `node --test src/lib/hooks/guard/silenced/index.variants.test.mts` exits 0 (declared check).
- **T-6.5** `npm test` passes.

## Phase 7: guard.silenced covers suppressions per language

**Touch set:**
- `test/support/variants.mts`: `SUPPRESSIONS`, `suppression places`
- `test/repo/variants.test.mjs`: exact placement list
- `src/lib/shared/comments.mjs`: new suppression markers
- `test/kernel/silenced.test.mjs`: pin each new marker
- `test/kernel/comments.test.mjs`: a marker line is a directive
- `src/lib/hooks/guard/silenced/index.variants.test.mts`: rows `LANGS`
- `test/repo/closures.test.mjs`: `guard.silenced` tables gain `LANGS`

**Changes:** `SUPPRESSIONS: Record<string, string[]>` per `LANGS` extension: `eslint-disable-next-line` and `@ts-expect-error` (JavaScript and TypeScript rows), `#pragma warning disable CS0168` (`.cs`), `@SuppressWarnings("unchecked")` (`.java`, `.groovy`), `@Suppress("UNUSED")` (`.kt`, `.kts`), `//nolint` (`.go`), `#[allow(dead_code)]` (`.rs`), `swiftlint:disable` (`.swift`), `@nowarn` (`.scala`), `NOLINT` (C and C++ rows), `phpcs:ignore` (`.php`), `ignore: unused_local_variable` (`.dart`), `noqa` and `pyright: ignore` (`.py`), `rubocop:disable Style/X` (`.rb`), `shellcheck disable=SC2086` (`.sh`, `.bash`), `SuppressMessageAttribute` (`.ps1`), `no critic` (`.pl`), `nolint` (`.r`), `noqa` (`.sql`), `#Disable Warning BC42024` (`.vb`), `eslint-disable` in a markup comment (markup rows). `suppression places` (in `silencedLines`) puts a comment-form seed on its own line, after a statement and in the language's block comment where it has one, and a statement form on its own line.

The closure gains rows `LANGS` with `seedsOf(ext)` from `SUPPRESSIONS`. Open at fdd3a2fa, group S3, closed by adding markers to `COMMENT_SUPPRESSION_MARKERS` or `STATEMENT_SUPPRESSION_MARKERS`: `@SuppressWarnings`, `@Suppress(`, `#[allow(`, `swiftlint:disable`, `@nowarn`, `phpcs:ignore`, the Dart `ignore:` form, `rubocop:disable`, `shellcheck disable`, `no critic`, `#Disable Warning` and `pyright: ignore` (RISK-004).

**Done when:**
- **T-7.1** `test/repo/variants.test.mjs` asserts the exact `suppression places` list for `{ rel: "src/a.ts", line: "// eslint-disable-next-line" }`.
- **T-7.2** `test/kernel/silenced.test.mjs` asserts a `suppression` move for one new marker of each language in group S3.
- **T-7.3** `test/kernel/comments.test.mjs` asserts `commentLines` returns nothing for `# rubocop:disable Style/X` in `.rb`.
- **T-7.4** `node --test src/lib/hooks/guard/silenced/index.variants.test.mts` exits 0 with `guard.silenced covers every row of LANGS` passing (declared check).
- **T-7.5** `npm test` passes.

## Phase 8: guard.silenced covers threshold spellings

**Touch set:**
- `test/support/variants.mts`: `thresholdEdits` grammar, one family
- `test/repo/variants.test.mjs`: exact spelling list
- `src/lib/shared/silenced.mjs`: fraction, negative, next-line readings
- `test/kernel/silenced.test.mjs`: pin each reading
- `src/lib/hooks/guard/silenced/index.variants.test.mts`: thresholds closure
- `test/repo/closures.test.mjs`: entry `guard.silenced thresholds`

**Changes:** `ThresholdSeed = { rel: string; before: string; after: string }`; `thresholdEdits` (`Grammar<ThresholdSeed, ThresholdSeed>`) has `threshold spellings`, which respells the new value as the row's tool parses it: `80.0` and `8e1` everywhere, a leading-dot fraction (`.5`) in JavaScript and TypeScript configs and Python config files, `key:value` with no space, the value on the line after its key in a JavaScript object, and `-1` for `--max-warnings`, which ESLint reads as no limit. The closure `guard.silenced thresholds` edits the seed's file in a project through `guardSilenced` and is closed on `deny`; rows `THRESHOLDS` keyed by `tool`, one lowering edit per row (vitest `lines: 90` to `80`, c8 `--lines 90` to `80`, `--cov-fail-under=90` to `80`, `fail_under = 90` to `80`, `<Threshold>90</Threshold>` to `80`, `--max-warnings 0` to `5`).

Open at fdd3a2fa, group S4, closed in `thresholdMoves`: `lines: .5`, a value on the next line, and `--max-warnings -1` or `=-1`, which reads as no number today and, once read, must count as weaker than any bar.

**Done when:**
- **T-8.1** `test/repo/variants.test.mjs` asserts the exact `threshold spellings` list for the vitest row's seed.
- **T-8.2** `test/kernel/silenced.test.mjs` asserts a `threshold` move for `lines: .5`, for `lines:` followed by `80` on the next line, and for `--max-warnings -1`.
- **T-8.3** `test/kernel/silenced.test.mjs` asserts no move for `--max-warnings 0` written over `--max-warnings 5`.
- **T-8.4** `node --test src/lib/hooks/guard/silenced/index.variants.test.mts` exits 0 with both thresholds tests passing (declared check).
- **T-8.5** `npm test` passes.

## Phase 9: guard.block gets a closure

**Touch set:**
- `test/support/variants.mts`: `agentBlocks` grammar, three families
- `test/repo/variants.test.mjs`: exact spelling lists
- `src/lib/hooks/guard/block/index.mts`: export `BLOCKED_KINDS`; widen `FOLDED_FILES`
- `test/hooks/guard.block.test.mjs`: pin the fold spellings
- `src/lib/hooks/guard/block/index.variants.test.mts`: block closure
- `src/lib/shared/verdicts.mjs`: read only: `VERDICTS`, `findVerdict`
- `test/repo/closures.test.mjs`: entry `guard.block`

**Changes:** per D-007. The closure `guard.block` calls `guardBlock` with a `SubagentStop` event whose `last_assistant_message` is the input and whose `agent_type` is `abcd-<role>`, and is closed on a bounce. Seeds, one per problem the guard names: a phase block whose last line is prose; one over 40 counted lines; `Files: src/a.ts, src/b.ts (+3 more)`; no `Red:` line; `Red: maybe`; no `Root cause:` line; `Root cause: flaky`; `Verified: blocked`; `Commit: did stuff`; and a developer turn with no block. Rows `VERDICTS` (the token with a full stop as last line) and `BLOCKED_KINDS`.

Open at fdd3a2fa, group K1: `Files: src/a.ts, + 3 more`, `src/a.ts and 3 more` and `src/a.ts, …` pass; `(3 more)` is unprobed. Every probed `line endings` and `field labels` spelling bounces.

**Done when:**
- **T-9.1** `test/repo/variants.test.mjs` asserts the exact lists of the three families for the `Red: maybe` seed, and an empty `fold spellings` list for a seed with no `Files:` line.
- **T-9.2** `test/hooks/guard.block.test.mjs` asserts a bounce for each fold spelling of D-007 and no bounce for `Files: src/a.ts, src/b.ts`.
- **T-9.3** `block/index.mts` exports `BLOCKED_KINDS` and the closure names `VERDICTS` in a `tableRows(` call (greps).
- **T-9.4** `node --test src/lib/hooks/guard/block/index.variants.test.mts` exits 0 (declared check).
- **T-9.5** `npm test` passes.

## Phase 10: The registry requires every guard module

**Touch set:**
- `test/repo/closures.test.mjs`: module check, `parts`, problem lines
- `CONTRIBUTING.md`: C-020 at line 101, Guards at 129 to 151
- `src/lib/hooks/guard/bash/judge.mts`: read only: parts list

**Changes:** per D-001. `GUARDS` entries take `parts?: string[]`; the destructive roots entry lists `src/lib/hooks/guard/bash/index.mts` and `src/lib/hooks/guard/bash/bash.mts`. `registryProblems` adds the module check and `<guard>: module <path> is missing` for a `module` or part that does not exist. At the end of phase 9 every module under `src/lib/hooks/guard/` is covered: `scope/index.mts`, `comments/index.mts`, `silenced/index.mts`, `block/index.mts` and `edit-target.mts` as modules; `bash/judge.mts`, `payloads.mts`, `kernel.mts`, `sources.mts`, `escalation.mts`, `powershell.mts` and `in-place.mts` as modules; `bash/index.mts` and `bash/bash.mts` as parts; `rules.mts` and `interpreters.mts` as table modules.

CONTRIBUTING.md: C-020 says every module under `src/lib/hooks/guard/` is an entry's module, part or table module. The Guards grammar list gains `commandLines`, `sourceCommands`, `kernelCalls`, `powerShellCommands`, `codeComments`, `silencedLines`, `thresholdEdits` and `agentBlocks`, and `editPaths` names its sixth spelling. The limits list rewrites its first bullet to open with "A guard outside", the guard folder in backticks, and "missing from the registry" (the T-10.5 grep), adds a module listed only as a part (RISK-001), and adds that a destructive root behind a wrapper, in hidden execution, a `case` arm or a function body stays at the prompt by decision; the other bullets keep their text.

**Done when:**
- **T-10.1** On a temporary tree, `src/lib/hooks/guard/x/index.mts` with no entry gives `src/lib/hooks/guard/x/index.mts is a guard module with no GUARDS entry and no closure test`.
- **T-10.2** On a temporary tree, a module named as a part, or as a table's module, gives no problem, and a missing part gives a problem naming the guard.
- **T-10.3** `registryProblems` on the repository returns an empty list.
- **T-10.4** `node --test test/repo/closures.test.mjs` exits 0 (declared check).
- **T-10.5** CONTRIBUTING.md holds the narrowed bullet and `agentBlocks`, and no longer holds `A guard missing from the registry.` (greps).
- **T-10.6** `npm test` passes, its Markdown and dash scans included.

## Open questions

- **OQ-001** Phases 5 to 8 close nine groups across some thirty languages and frameworks; close them all here, or move some to a follow-up? Owner: the user. Fallback: each phase closes the groups it lists; a further open spelling found while building follows D-008, and past three unlisted ones a phase stops with `PHASE STALLED` naming them.
- **OQ-002** Should a destructive root behind a wrapper (`env rm`, `sh -c 'rm …'`, `eval`, `xargs`) be denied, reversing D-006 of `work/20261031-lessons-from-a-consumer-project-s-memory/design.md`? Owner: the user. Fallback: it stays at the prompt; `commandLines` has no wrapper family and CONTRIBUTING.md names the limit.
- **OQ-003** The vocabularies of phases 2 and 5 to 8 rest on each tool's documentation (`npm exec --`, PHP, Ruby, Perl, Kotlin, Rust, Swift, Dart, VB, Razor, pytest, JUnit 4, vitest `skipIf`); php, ruby, R and most of these are not installed on this host, so their acceptance was not run here. Owner: the user. Fallback: the vocabularies list the documented forms; the developer runs any form whose tool the host has, and a form the tool refuses leaves the vocabulary and is named on the block.
- **OQ-004** Phase 6 S1 denies any line starting `.skip(` in a JavaScript or TypeScript test file, so a query chain such as `User.find()` followed by `  .skip(20)` reads as `skipped-test` (cumulative review, Minor). Narrow the continuation reading? Owner: the user. Fallback: keep it; the deny is the safe error and the user confirms that edit by hand.

## Revision log

- 2026-11-17: D-005 (r2): a target is outside only when both event and real paths are; in-root links pointing out keep the event path; cumulative review Major.
