---
kind: design
lane: design
title: Hooks listed, generated, typed and split
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/05-hooks.md, artifacts/refactor/00-conventions.md, artifacts/refactor/06-tests.md, artifacts/refactor/08b-docs.md, work/20261022-refactor-item-01-layout-and-build/design.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, work/20261023-refactor-item-04a-work-item-model/design.md, work/20261023-refactor-item-04d-reading-and-reporting/design.md, scripts/build.mjs, scripts/watch.mjs, src/hooks (every file), src/lib/hooks (every file), src/lib/verbs.mts, src/lib/shared/context.mts, src/lib/shared/paths.mts, src/lib/shared/work/block.mts, test/hooks (every file), test/budgets.test.mjs, test/build.test.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/conventions.test.mjs, test/kernel/kernel-sources.mjs, test/kernel/extensions.test.mjs, test/kernel/type-rules.test.mjs, test/type-rules/mistakes.mts, Node 24.22.1 probe importing src/lib/verbs.mts directly]
phases:
  - n: 1
    files: [src/lib/hooks.mts, src/lib/hooks/hook-spec.mts, src/lib/hooks/output.mts, src/lib/hooks/run-hook.mts, src/lib/hooks/inject/state/index.mts, src/lib/hooks/inject/rules/index.mts, src/lib/hooks/inject/extensions/index.mts, src/lib/hooks/lint/schema/index.mts, src/lib/hooks/monitor/context/index.mts, src/lib/hooks/notify/user/index.mts, scripts/build.mjs, scripts/watch.mjs, test/hooks/hook-list.test.mjs, test/hooks/hook-context.mjs, test/hooks/handlers.test.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/conventions.test.mjs, test/kernel/type-rules.test.mjs, test/type-rules/mistakes.mts, test/budgets.test.mjs]
    greps:
      - path: src/lib/hooks.mts
        pattern: 'export const HOOKS = \{'
      - path: src/lib/hooks/run-hook.mts
        pattern: 'export async function runHook\(name'
      - path: src/lib/hooks/hook-spec.mts
        pattern: 'export type HookSpec<'
      - path: scripts/build.mjs
        pattern: 'export function hooksJson\('
    tests: true
    drive: true
    security: true
  - n: 2
    files: [src/lib/shared/work/block.mts, src/lib/hooks/guard/block/index.mts, src/lib/hooks/route/verdict/index.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/hooks/observe/drive/index.mts, src/lib/hooks/observe/drive/evidence.mts, src/lib/shared/shell/powershell.mts, src/lib/shared/shell/kernel-call.mts, src/lib/hooks/guard.bash.mjs, src/hooks/README.md, test/kernel/block-heading.test.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/hooks/powershell-text.test.mjs, test/kernel/conventions.test.mjs, test/kernel/extensions.test.mjs]
    greps:
      - path: src/lib/shared/work/block.mts
        pattern: 'export function readHeading\('
      - path: src/lib/hooks/guard/block/index.mts
        pattern: 'readHeading'
      - path: src/lib/hooks/observe/drive/index.mts
        pattern: 'shared/shell/powershell\.mts'
      - path: src/lib/shared/shell/powershell.mts
        pattern: 'export const CANONICAL_GROUPS'
    tests: true
    drive: true
    security: true
  - n: 3
    files: [src/lib/hooks/guard/edit-target.mts, src/lib/hooks/guard/scope/index.mts, src/lib/hooks/guard/comments/index.mts, src/lib/hooks/guard/silenced/index.mts, src/lib/shared/paths.mts, test/hooks/handlers.test.mjs]
    greps:
      - path: src/lib/hooks/guard/edit-target.mts
        pattern: 'export function quotedList\('
      - path: src/lib/hooks/guard/comments/index.mts
        pattern: 'from "\.\./edit-target\.mts"'
      - path: src/lib/hooks/guard/silenced/index.mts
        pattern: 'from "\.\./edit-target\.mts"'
    tests: true
    drive: true
    security: true
  - n: 4
    files: [src/lib/hooks/guard/bash/index.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/bash.mts, src/lib/hooks/guard/bash/powershell.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/kernel.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/sources.mts, src/lib/hooks/guard/bash/escalation.mts, test/hooks/handlers.test.mjs, .claude/agent-memory/picket-architect/statusline-contract.md, .claude/agent-memory/picket-reviewer/probe-guards-directly.md]
    greps:
      - path: src/lib/hooks/guard/bash/judge.mts
        pattern: 'export function judgeSegments\('
      - path: src/lib/hooks/guard/bash/judge.mts
        pattern: 'export function isEscalating\('
      - path: src/lib/hooks/guard/bash/kernel.mts
        pattern: 'VERB_NAMES'
      - path: src/lib/hooks/guard/bash/powershell.mts
        pattern: 'allows: false'
    tests: true
    drive: true
    security: true
  - n: 5
    files: [src/lib/hooks/README.md, scripts/build.mjs, scripts/watch.mjs, test/hooks/hook-list.test.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/kernel-sources.mjs, test/kernel/conventions.test.mjs, CONTRIBUTING.md, README.md, .claude/agent-memory/picket-reviewer/dist-on-disk-can-be-stale.md]
    greps:
      - path: test/kernel/conventions.test.mjs
        pattern: '"hooks\.mts": \[\]'
      - path: CONTRIBUTING.md
        pattern: 'src/lib/hooks\.mts'
      - path: test/kernel/kernel-sources.mjs
        pattern: '^(?![\s\S]*src/hooks)'
        flags: i
    tests: true
    drive: true
    security: true
  - n: 6
    files: [src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/bash.mts, src/lib/hooks/guard/bash/sources.mts, test/hooks/handlers.test.mjs, README.md, src/lib/hooks/README.md]
    greps:
      - path: src/lib/hooks/guard/bash/rules.mts
        pattern: 'export const ROOTS'
      - path: src/lib/hooks/guard/bash/rules.mts
        pattern: 'fprint0\?'
      - path: test/hooks/handlers.test.mjs
        pattern: 'find \. -fprint out\.txt'
    tests: true
    drive: true
    security: true
---
# Design: Hooks listed, generated, typed and split

## Problem

The user approved refactor item 05 (`artifacts/refactor/05-hooks.md`, decisions H-1 to H-12, its migration and evidence) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`, C-016 for hooks); this record carries them into phases and re-decides nothing except where the code read on 2026-10-23 contradicts the draft, which D-001 and D-003 name. Today 14 handlers in `src/lib/hooks/` sit behind 14 hand-written shells and a hand-written `src/hooks/hooks.json`, build their output JSON by hand in 11 places, and `guard.bash.mjs` (1498 lines) keeps facts twice, so `find . -fprint out.txt`, `find . -fls x`, `tree -o out.txt`, `rg --pre ./x foo` and `git log/diff/show --output=x` are auto-allowed (B1). Binding constraints from the lead: these hooks guard the session that builds them, which loads `dist/` and whose `npm test` deletes and rebuilds `dist/`, so every commit must leave a `dist/` that session can run, with the generated `hooks.json` proven equal to the hand-written one before that one goes; guard phases are `security: true`; each hook stays under the 200 ms cold budget (`test/budgets.test.mjs`). Items 06 (tests beside code) and 08b (generated hook docs) keep their scope; this item gives each list entry the one-line `summary` 08b needs.

## Decisions

### D-001: The list, and a build that generates the registration and entries
**Decision:** Infrastructural decision, carrying H-10 and C-016. `src/lib/hooks.mts` imports nothing and exports `HOOK_EVENTS` (the eight events, `as const`) with `type HookEvent` (C-009), `HOOKS`, an `as const` object in the draft's order whose entry is `{ summary: string; on: readonly { event: HookEvent; matcher?: string }[] }`, and `type HookName = keyof typeof HOOKS`. Each `summary` is one line taken from the "Does" column of `src/hooks/README.md` (08b G-2 generates `docs/reference/hooks.md` from it). `scripts/build.mjs` imports the list directly (Node 24 strips the types, C-004; probed by importing `src/lib/verbs.mts` the same way) and exports `hooksJson(hooks)`: events in order of first appearance, within an event one group per matcher in order of first appearance, hooks inside a group in list order, so same-event hooks run in list order. It writes `dist/hooks/hooks.json`, and for each name bundles one entry through esbuild `stdin` (`import { runHook } from "<src>/lib/hooks/run-hook.mts"; import { hook } from "<src>/lib/hooks/<kind>/<name>/index.mts"; await runHook("<name>", hook);`). The bundle keeps today's flat file name, `dist/hooks/<kind>.<name>.mjs`, which departs from the draft's Target section (`dist/hooks/<kind>/<name>.mjs`; no H-decision names it): with flat names the generated `hooks.json` equals today's with no path mapping, draft R-2 goes away, and the paths this session registered at start stay alive through every rebuild. While hooks move (phases 1 to 4) the build takes a name from its folder when `src/lib/hooks/<kind>/<name>/index.mts` exists and from today's shell `src/hooks/<name>.mjs` otherwise, and stops with an error naming any hook that has both or neither; `src/hooks/hooks.json` is no longer copied and stays only as the oracle the generated file is compared with until phase 5 removes it.
**Instead of:** the draft's nested `dist/hooks/<kind>/<name>.mjs`: a running session keeps the hook paths it read at start (whether Claude Code rereads a plugin's `hooks.json` mid-session is unverified, OQ-001), so the first rebuild after the switch would leave every guard of this session pointing at a deleted file, and a missing hook file fails open.
**Risks:**
- **RISK-001** The generated registration drops or reorders a hook, so a guard stops running. Mitigation: phase 1 deep-equals `hooksJson(HOOKS)` and the built file with the parsed `src/hooks/hooks.json` and checks every registered path exists; phase 5 replaces the oracle with an explicit list of (event, matcher, names) triples (draft R-3).
- **RISK-002** Two ways to build a hook exist for four phases. Mitigation: the both-or-neither error; phase 5 deletes the shell path, `hook.mjs` and `src/hooks/`.

### D-002: `HookSpec<E>`, one output module and one runner
**Decision:** Infrastructural decision, carrying H-5, H-6 and C-007. `output.mts` owns the output types `PermissionOutput`, `ContextOutput`, `BounceOutput` and is the only builder: `allow(reason)`, `ask(reason)`, `deny(reason)`, `fallThrough()` (returns `null`), `context(event, text)`, `bounce(reason)`; no handler writes `hookSpecificOutput` or `decision`. `hook-spec.mts` exports `PayloadOf<E>` (the fields the hooks read today: common `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `permission_mode`, `agent_type`; `tool_name` and `tool_input` on tool events; `stop_hook_active` on Stop events; `notification_type` and `message` on Notification), `OutputFor<E>` as the draft writes it (Notification: `never`), `HookContext = Context & { name: HookName }`, and `HookSpec<E> = { handler: (event: PayloadOf<E>, ctx: HookContext) => Promise<OutputFor<E> | null>; onBadInput?: "empty" }`; `onBadInput` replaces today's `runHook` option, set by the three inject hooks. `run-hook.mts` replaces `hook.mjs`: `runHook(name, hook)` checks the Node floor, reads stdin, finds the root with `projectRoot(event.cwd)`, builds `{ ...edgeContext(root), name }`, awaits the handler (a throw is `null`), prints, appends the denial row with `hook: name` and `ctx.now()`, and exits 0. Handlers read the process only through `ctx` (`env`, `cwd`, `home`, `now`, `platform`), so converted hooks pass the process-read scan, and `src/lib/hooks/run-hook.mts` joins that scan's exempt list as the hooks' edge. Each `index.mts` also exports its handler function for tests; a seam that is not on `Context` (notify.user's `spawn`, inject.rules' rules folder) stays an optional third parameter that the spec never passes. Converting a module to `.mts` fixes its `.mjs`-named imports (item 03 D-006).
**Instead of:** keeping handlers returning raw JSON and typing only the runner: the draft's guarantee that a `guard.block` returning `deny(...)` fails `tsc` needs the output type on the handler.
**Risks:**
- **RISK-003** Ledger `hook` values change. Mitigation: the list names equal the names `hook.mjs` derives today; the guard.scope ledger test (`test/hooks/hooks.test.mjs:189`) and phase 2's guard.block row pin them.
- **RISK-004** Tests call handlers with `{ root }` only, which lacks `env` and `now`. Mitigation: `test/hooks/hook-context.mjs` builds a full `HookContext`; only call sites change, never assertions.

### D-003: One folder per hook, and no hook imports another
**Decision:** Infrastructural decision, carrying H-7, H-8, H-9 and C-014. Each hook is `src/lib/hooks/<kind>/<name>/index.mts` exporting `hook`. Code used by one hook stays in its folder (`observe/drive/evidence.mts`, from `drive-evidence.mjs`); code used by one kind goes in the kind folder (`guard/edit-target.mts`: `editTarget(event, ctx)` returning `{ abs, rel, outside }` or `null` without a `file_path`, from `repoRelative` with `ctx.root`; `editTexts`; `quotedList`, the `"a"; "b"; "c" (+n more)` list both comment and silenced denials print, with silenced's kind as an optional label). guard.scope takes `file_path` and `abs` from `editTarget` but keeps its real-path relative path, because it decides on the resolved file through junctions. The draft puts `powershell-text` in `guard/bash/powershell.mts` and `kernel-call` in `guard/bash/kernel.mts`, but observe.drive reads both (`src/lib/hooks/observe.drive.mjs:4,8`); by the draft's own rule (wider than one kind goes to `shared/`) they become `src/lib/shared/shell/powershell.mts` (exporting `readPowerShell`, `canonicalRoot`, `CANONICAL_GROUPS`) and `src/lib/shared/shell/kernel-call.mts`, and `guard/bash/powershell.mts` holds only the Dialect. `shared/work/block.mts` gains `readHeading(text)`, returning `{ kind, id, phase, scope, index }` for the earliest block heading in the text through capture groups added to `BLOCK_HEADINGS`; it replaces `CONTRACT` (guard.block, which skips `expedited`), `HEADING` (emit.ledger) and `HEADINGS` (route.verdict, which routes a review only when it has a scope). Hooks reach verbs only through `verbs.mts` and `verbs/<verb>/index.mts` (item 03 D-007). Phase 5 puts all of this in the direction scan.
**Instead of:** the draft's placement of the two readers: observe.drive would import a guard's folder, which H-7 forbids.
**Risks:**
- **RISK-005** The earliest-heading rule changes route.verdict for a turn holding two different block headings (today it tries kinds in order). Mitigation: no agent contract emits two; the route.verdict, guard.block and emit.ledger tests pass unchanged, and a `readHeading` test pins the two-heading case.

### D-004: `guard.bash` becomes `guard/bash/` with one judge loop
**Decision:** Infrastructural decision on a guard, carrying H-2 and H-3. Nine modules in `src/lib/hooks/guard/bash/`: `index` (spec, `guardBash`, the `guard.log` trace, tool to dialect), `judge` (`judgeSegments(reading, ctx, dialect): Judgement`; `isEscalating(segments, ctx)` replaces the five copies of `ctx.depth === 0 && ctx.escalation && segments.some(carriesMarker)`), `bash` (heredocs, quoting, `$(...)`, variables, segment split, the Bash `Dialect`), `powershell` (the PowerShell `Dialect` over the shared reader), `rules` (root tables; git, sed, dotnet and npm-family checks; worktree teardown), `kernel` (D-005), `payloads` (`sh -c`, `eval`, `xargs`, `Invoke-Expression`, `pwsh -c`, `cmd /c` payloads, the lead-only refusal inside them, code-write targets), `sources` (the source rule), `escalation` (marker shape, verdict, ledger rows). `Dialect = { name; read; classify; cdTarget; allows; hints }`: `allows: false` keeps PowerShell never auto-allowed, and Bash's `classify` may end the loop with a `Judgement` (the recheck of `$(...)` bodies after a `cd`). The recursive evaluation that `$(...)` bodies and npm scripts need is passed in as a function, so the nine modules have no import cycle. Phase 4 moves behaviour unchanged with today's tables; phase 6 alone changes decisions (D-006, D-007). Comments in today's file are not carried over (guard.comments denies new comment lines); names and tests carry their content.
**Instead of:** the draft's single phase 2 doing the split and the rule table together: a decision change inside a 1500-line move cannot be reviewed, while a neutral split first lets a `guard.log` replay prove the move.
**Risks:**
- **RISK-006** A moved check silently changes a decision. Mitigation: every guard test passes with assertions unchanged, and every complete row of `.picket/state/guard.log` (10977 rows on 2026-10-23; rows cut at the 300-character trace cap are skipped) replays to the same decision and reason through a copy of the pre-phase `dist/` and the new guard.
- **RISK-007** Cold start grows. Mitigation: one bundle per hook (item 01); the budget test measures it each phase.

### D-005: The guard's verb classes come from `verbs.mts`
**Decision:** Infrastructural decision, carrying H-4 and C-012. `guard/bash/kernel.mts` imports `VERB_NAMES` from `src/lib/verbs.mts` (import-free, item 03) and exports `kernelClass(verb, subverb)`, `"safe"` when the verb or subverb entry is `readOnly` and `"kernel"` otherwise or when unknown, and `isLeadOnly(verb)` from `leadOnly`. `KERNEL_READ_VERBS`, `KERNEL_OTHER_VERBS`, `KERNEL_READ_SUBVERBS` and `LEAD_ONLY_VERBS` go; `WRAPPING_FLAGS` and verify's `--no-tests` and test-command rule stay, being facts about the guard. Item 03 copied the guard sets into `readOnly` and `leadOnly` and tested them equal, so no decision changes; the two set tests in `test/hooks/handlers.test.mjs` become one test of `kernelClass` and `isLeadOnly` on every `VERB_NAMES` entry that also lists today's read verbs by name.
**Instead of:** hand lists kept beside an agreement test: two places to edit per new verb.
**Risks:**
- **RISK-008** A new verb marked `readOnly` by mistake is auto-allowed. Mitigation: C-012 puts `readOnly` in review, and the test names today's read verbs explicitly, so a change to that list is visible.

### D-006: One rule table keyed by command root (fixes B1)
**Decision:** Infrastructural decision on a guard, carrying H-1 and H-11. `rules.mts` exports `ROOTS: Record<string, RootRule>` with `RootRule = { class: "safe" | "unknown" | "deny" | "meta" | "check"; check?; writeFlags?: RegExp; inert?: true; sourceReader?: true }`; a root not in the table is unknown. The general classifier, the `$(...)` inert test and the source rule all read it, replacing `SAFE_ROOTS`, `DENY_ROOTS`, `META_ROOTS`, `INERT_ROOTS`, `SOURCE_READERS`, `FIND_ACTIONS` and `READER_WRITE_FLAGS`. `writeFlags`: find `^-(delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)$`, rg `^--pre(=|$)`, tree `^(-o|--output)`, file `^(-C|--compile)$`; a segment carrying one is unknown, and inside a source it is denied. A safe git subcommand with `--output` (bare or with `=`) is unknown. One sed checker allows print-only scripts: flags only `-n`, `--quiet`, `--silent` and `-e <script>`, one quiet flag present, every script an optional address or range (a line number, `$`, `/re/`) followed by `p` or `=`; against today this also allows `$p`, a bare `p` and `-e` outside sources and `=` inside them, all print-only. `inert` and `sourceReader` copy today's sets exactly (the draft's sample marks rg `inert`, today's set does not, and the table keeps today's); `Get-Content` is an `unknown` source reader. Mixed-case keys are canonical names; `Select-Object`, `Sort-Object` and `Measure-Object` go, being dead (`canonicalRoot` lower-cases them, `src/lib/hooks/powershell-text.mjs:33-36`). Intended change: the seven B1 commands fall through to Claude Code's permission prompt.
**Instead of:** keeping both lists and adding the missing flags to the general classifier: fixes B1 today, and the lists drift apart again.
**Risks:**
- **RISK-009** The sed merge lets a writing script through. Mitigation: the grammar is a whitelist, and tests pin `s/a/b/w out`, `-i`, `w` and `e` forms as unknown.
- **RISK-010** A table typo turns a deny into a fall-through. Mitigation: phase 6's replay of `guard.log` must differ from phase 5's only on rows in the intended groups, counted in the block.

### D-007: Project tools ask, like `npm test`
**Decision:** Infrastructural decision on a guard, carrying H-12 (the user's Q-1 answer, option b). `tsc`, `eslint`, `prettier`, `jest`, `vitest`, `mocha`, `cypress`, `webpack`, `rollup`, `esbuild`, `vite`, `next`, `react-scripts`, `babel` and `playwright` leave the table and fall through. The same rule reaches npm scripts: `npm test` whose script is `vitest run` was allowed through package-script resolution and now falls through, as does `picket verify` when the project's test command uses one. `README.md`'s Status list gets one line saying so and that a project can allow them in its own Claude Code permission settings (draft R-4).
**Instead of:** keeping them `safe` (Q-1 option a): the allow reason "every sub-command is read-only/inspection" is false for tools that run project code or write files.
**Risks:**
- **RISK-011** Users who run `vitest` or `tsc` directly see new prompts. Mitigation: the release line, and their own permission settings.

### D-008: Six phases, each leaving a working `dist/`
**Decision:** Infrastructural decision, carrying the draft's migration and the lead's ordering constraint. Phase 1 the frame, the generated registration and the six context hooks; phase 2 the Stop hooks, observe.drive, the shared shell readers and `readHeading`; phase 3 the Write/Edit guards; phase 4 `guard/bash/` with no decision change; phase 5 the close-out (`src/hooks/`, `hook.mjs` and the shell build path go, the explicit-triples test, the direction scan, the docs); phase 6 the rule table and project tools. Hook tests stay in `test/` with imports repointed (item 06 moves them); new tests are `.mjs` files in `test/hooks/`. A phase that touches a guard or the registration is `security: true`.
**Instead of:** the draft's two phases: its phase 1 converts 13 hooks, three guards among them, in one commit, and its phase 2 mixes the move and the decision change that D-004 separates.
**Risks:**
- **RISK-012** A phase leaves this session's guards failing open mid-run. Mitigation: flat bundle names (D-001), each phase's `npm test` builds and spawns every bundle, and each phase drives its moved hooks through `dist/hooks/`.

## Scope

**In:**
- `src/lib/hooks.mts`, `hook-spec.mts`, `output.mts`, `run-hook.mts`; the build generating `dist/hooks/hooks.json` and the 14 entries (D-001, D-002).
- The 14 hooks in folders, `guard/edit-target.mts`, `observe/drive/evidence.mts`, `shared/shell/`, `readHeading` (D-003).
- `guard/bash/` split, verb classes from `verbs.mts`, the rule table, B1, H-11, H-12 (D-004 to D-007).
- Removal of `src/hooks/`, `src/lib/hooks/hook.mjs` and the shell build path; tests repointed; the direction scan; docs that cite moved paths.

**Out:**
- Moving tests beside the code and `#test/...` helpers (item 06).
- Generating `docs/reference/hooks.md` from `HOOKS` (item 08b); this item only writes the summaries.
- Mod hooks and their `hooks.json` (item 07a).
- Converting shared `.mjs` modules the hooks import (`comments.mjs`, `config.mjs`, `extensions.mjs`, `silenced.mjs`, `saved-rules.mjs`, `verdicts.mjs`).
- Any guard decision change beyond D-006 and D-007; nested `dist/hooks/` paths (OQ-001).

## Phase 1: The frame, the generated registration and the context hooks

**Touch set:**
- `src/lib/hooks.mts`: new, the list
- `src/lib/hooks/hook-spec.mts`, `src/lib/hooks/output.mts`, `src/lib/hooks/run-hook.mts`: new, the frame
- `src/lib/hooks/inject/state/index.mts`, `inject/rules/index.mts`, `inject/extensions/index.mts`, `lint/schema/index.mts`, `monitor/context/index.mts`, `notify/user/index.mts`: new, from the handlers
- `src/lib/hooks/inject.state.mjs`, `inject.rules.mjs`, `inject.extensions.mjs`, `lint.schema.mjs`, `monitor.context.mjs`, `notify.user.mjs`: deleted
- `src/hooks/inject.state.mjs`, `inject.rules.mjs`, `inject.extensions.mjs`, `lint.schema.mjs`, `monitor.context.mjs`, `notify.user.mjs`: deleted shells
- `src/lib/hooks/hook.mjs`: read only, the runner the remaining shells keep
- `src/hooks/hooks.json`: read only, the oracle
- `scripts/build.mjs`, `scripts/watch.mjs`: generation, mixed build
- `test/hooks/hook-list.test.mjs`, `test/hooks/hook-context.mjs`: new
- `test/hooks/handlers.test.mjs`: imports, `SHELLS`, handler scan
- `test/kernel/plugin-layout.test.mjs`: registration from `dist/hooks/hooks.json`
- `test/kernel/conventions.test.mjs`: `run-hook.mts` exempt from process reads
- `test/type-rules/mistakes.mts`, `test/kernel/type-rules.test.mjs`: Stop cannot deny
- `test/budgets.test.mjs`: `joinedRules` import path
- `test/kernel/node-floor.test.mjs`, `test/kernel/sources.test.mjs`, `test/hooks/hooks.test.mjs`: read only, spawn paths unchanged

**Changes:**
- `hooks.mts`, `hook-spec.mts`, `output.mts` and `run-hook.mts` as D-001 and D-002 describe. `run-hook.mts` is new beside `hook.mjs`, which the eight remaining shells keep until phase 5.
- The six hooks move to their folders as `HookSpec`s built with `output.mts`, converted to `.mts` under `strict`, reading the process only through `ctx`. Exported names stay for tests: `injectState`, `injectRules`, `INJECTED_RULES`, `joinedRules`, `injectExtensions`, `extensionContext`, `EXTENSION_CHARS`, `lintSchema`, `monitorContext`, `notifyUser`, `notificationCommand`. The three inject specs set `onBadInput: "empty"`.
- `scripts/build.mjs`: `hooksJson(hooks)`; one `stdin` bundle per moved hook to `dist/hooks/<name>.mjs` with the banner (C-005); shells still bundled for the other eight; the both-or-neither error; `src/hooks/hooks.json` excluded from copying. `scripts/watch.mjs` rebuilds the generated entries and `hooks.json` when `src/lib/hooks.mts` or a hook folder changes.
- `test/hooks/hook-list.test.mjs`: the oracle equality (T-1.1), every registered path exists in `dist/hooks/`, every name has exactly one of folder or shell, every `summary` is one non-empty line, and the Stop and SubagentStop lists are equal. `test/hooks/hook-context.mjs` exports `hookContext(root, overrides)` over `edgeContext` from `dist/`.
- `plugin-layout.test.mjs`: the registration tests read `dist/hooks/hooks.json` and check registered bundles exist in `dist/hooks/`; the eight-events and Notification tests keep their assertions.
- `mistakes.mts` gains one line declaring a `HookSpec<"Stop">` whose handler returns `deny("x")`; `type-rules.test.mjs` expects that line's error code.

**Done when:**
- **T-1.1** `hooksJson(HOOKS)` and the parsed `dist/hooks/hooks.json` after `npm run build` both deep-equal the parsed `src/hooks/hooks.json`: same event order, matcher groups, hook order, and `Stop` and `SubagentStop` lists.
- **T-1.2** The six moved names have a folder with `index.mts` and no file left in `src/hooks/` or as `src/lib/hooks/<name>.mjs`; the other eight still have their shell; every `${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs` in `dist/hooks/hooks.json` exists after the build.
- **T-1.3** `git grep -n hookSpecificOutput -- src/lib/hooks/inject src/lib/hooks/lint src/lib/hooks/monitor src/lib/hooks/notify` prints nothing.
- **T-1.4** `npm run typecheck` exits 0, and `test/kernel/type-rules.test.mjs` passes with exactly one more expected error, on the new `HookSpec<"Stop">` line of `test/type-rules/mistakes.mts`.
- **T-1.5** Driven: `node dist/hooks/inject.rules.mjs` given a SessionStart event prints `additionalContext` starting `# Writing rules`, and given `not json` on stdin exits 0 and still prints the rules; `node dist/hooks/notify.user.mjs` given a Notification event with `PICKET_NOTIFY=off` prints nothing and exits 0.
- **T-1.6** `test/kernel/node-floor.test.mjs` passes unchanged: the bundle under the preload faking Node 20.11.1 exits 0 with empty stdout and the floor line on stderr.
- **T-1.7** `npm test` passes; the hook cold-start test runs (not skipped) and every bundle in `dist/hooks/` starts under 200 ms, the slowest named with its time in the block.

## Phase 2: Stop hooks, observe.drive, the shared shell readers and block headings

**Touch set:**
- `src/lib/shared/work/block.mts`: `readHeading`, capture groups
- `src/lib/hooks/guard/block/index.mts`, `route/verdict/index.mts`, `emit/ledger/index.mts`, `observe/drive/index.mts`: new, from the handlers
- `src/lib/hooks/observe/drive/evidence.mts`: `git mv` from `src/lib/hooks/drive-evidence.mjs`
- `src/lib/shared/shell/powershell.mts`, `src/lib/shared/shell/kernel-call.mts`: `git mv` from `src/lib/hooks/powershell-text.mjs`, `src/lib/hooks/kernel-call.mjs`
- `src/lib/hooks/guard.block.mjs`, `route.verdict.mjs`, `emit.ledger.mjs`, `observe.drive.mjs` and the four `src/hooks/` shells of those names: deleted
- `src/lib/hooks/guard.bash.mjs`: the two reader imports repointed (built names, `../shared/shell/*.mjs`)
- `src/lib/shared/transcript/turn.mts`: read only, `detectBlock` keeps its kind order
- `src/lib/verbs/route/index.mts`: read only, imported by route.verdict
- `src/hooks/README.md`: the moved helper paths
- `test/kernel/block-heading.test.mjs`: new
- `test/hooks/handlers.test.mjs`: imports, `SHELLS`, the helper-location test (T-6.4)
- `test/hooks/hooks.test.mjs`: the guard.block ledger row
- `test/hooks/powershell-text.test.mjs`: import from `dist/lib/shared/shell/powershell.mjs`
- `test/kernel/conventions.test.mjs`: line 209's scanned route.verdict path
- `test/kernel/extensions.test.mjs`: lines 121 to 125, guard starts from `src/lib/hooks/guard/*/index.mts` plus any `src/lib/hooks/guard.*.mjs` left

**Changes:**
- `block.mts`: each `BLOCK_HEADINGS` regex gains capture groups (`detectBlock` unchanged); `readHeading(text): BlockHeading | null` with `BlockHeading = { kind: BlockKind; id: string; phase: number | null; scope: "crosscheck" | "phase" | "cumulative" | "checkpoint" | "pr" | null; index: number }`, the earliest heading in the text (D-003).
- guard.block is a `HookSpec<"Stop" | "SubagentStop">` returning `bounce(...)`; it checks from `heading.index` for every kind but `expedited`, and its developer checks run when the kind is `phase`. route.verdict returns `context(event.hook_event_name, text)`; the agent comes from the kind, and a review heading without a scope or an expedited heading counts as no heading, as today, so the transcript hints decide. emit.ledger takes `work_id` and `phase` from `readHeading`.
- observe.drive imports the readers from `shared/shell/` and `isDriveCommand` from `./evidence.mts`. `shared/shell/powershell.mts` exports `CANONICAL_GROUPS` for phase 6's test. All moved modules are `.mts` under `strict`.

**Done when:**
- **T-2.1** `test/kernel/block-heading.test.mjs`: `## Phase 3 of 20261023-x` gives kind `phase`, id `20261023-x`, phase 3; `## Review: 20261023-x · phase 2` gives scope `phase`, phase 2; `## Review: 20261023-x · cumulative` gives scope `cumulative`; `## Expedited: 20261023-x` gives kind `expedited`; a Review heading above a Phase heading gives the Review heading; text without a heading gives `null`.
- **T-2.2** `git grep -nE "Amendment|Expedited" -- src/lib/hooks` prints nothing.
- **T-2.3** Driven: `dist/hooks/guard.block.mjs` fed a SubagentStop whose agent transcript ends a `## Phase 1 of <id>` block without a verdict prints `"decision":"block"` and appends a ledger row with event `bounce` and hook `guard.block`.
- **T-2.4** The guard.block, route.verdict, emit.ledger and observe.drive tests in `test/hooks/handlers.test.mjs` and `test/hooks/hooks.test.mjs`, and every test in `test/hooks/powershell-text.test.mjs`, pass with only imports, call sites and file names changed.
- **T-2.5** `src/lib/hooks/powershell-text.mjs`, `kernel-call.mjs`, `drive-evidence.mjs` and the eight deleted handler and shell files do not exist; `git grep -n "hooks/guard" -- src/lib/hooks/observe src/lib/hooks/route src/lib/hooks/emit` prints nothing.
- **T-2.6** Driven in a temp project: a PostToolUse Bash event for `picket state x` piped into `dist/hooks/observe.drive.mjs` appends a drive-log row of kind `inspect`; a PreToolUse Bash event for `picket state x` piped into `dist/hooks/guard.bash.mjs` still answers `allow`.
- **T-2.7** `npm test` and `npm run typecheck` pass; every bundle starts under 200 ms, the slowest named in the block.

## Phase 3: The Write and Edit guards

**Touch set:**
- `src/lib/hooks/guard/edit-target.mts`: `git mv` from `src/lib/hooks/edit-texts.mjs`
- `src/lib/hooks/guard/scope/index.mts`, `guard/comments/index.mts`, `guard/silenced/index.mts`: new, from the handlers
- `src/lib/hooks/guard.scope.mjs`, `guard.comments.mjs`, `guard.silenced.mjs` and the three `src/hooks/` shells of those names: deleted
- `src/lib/shared/paths.mts`: `repoRelative` takes an optional root
- `src/lib/shared/comments.mjs`, `src/lib/shared/silenced.mjs`, `src/lib/shared/work/approvals.mts`: read only
- `test/hooks/handlers.test.mjs`: `guardScope` import, the `quotedList` test
- `test/hooks/hooks.test.mjs`: read only, spawn tests unchanged

**Changes:**
- `edit-target.mts` per D-003: `editTarget(event, ctx)`, `editTexts(event, abs)`, `quotedList(entries)` with entries `{ text; label? }`, at most three quoted, each cut at 80 characters, then ` (+n more)`.
- guard.comments and guard.silenced take their target, texts and quoted list from it; their dynamic imports of the approvals and config modules stay (cold start). guard.scope builds `deny` and `ask` through `output.mts` with its `guard.scope: ` prefix and keeps its real-path relative path. Every denial text stays byte-identical.

**Done when:**
- **T-3.1** Every guard.scope, guard.comments and guard.silenced test in `test/hooks/handlers.test.mjs` and `test/hooks/hooks.test.mjs` passes with assertions unchanged, including the ledger row with hook `guard.scope`.
- **T-3.2** `quotedList` of two entries gives `"a"; "b"`, of four gives `"a"; "b"; "c" (+1 more)`, cuts a 100-character text to 80, and with label `skip` gives `skip "x"`.
- **T-3.3** `git grep -nE "QUOTED_LIMIT|readFileSync" -- src/lib/hooks/guard/comments src/lib/hooks/guard/silenced` prints nothing; `src/lib/hooks/edit-texts.mjs` does not exist.
- **T-3.4** Driven in a temp project: `dist/hooks/guard.scope.mjs` denies a Write to `work/x/state.yaml`; `dist/hooks/guard.comments.mjs` denies a Write of `src/a.mjs` holding `// note`; `dist/hooks/guard.silenced.mjs` denies an Edit adding `it.skip(` to `test/a.test.mjs`; each reason starts with its hook's name.
- **T-3.5** `npm test` and `npm run typecheck` pass; every bundle starts under 200 ms, the slowest named in the block.

## Phase 4: `guard/bash/`, behaviour unchanged

**Touch set:**
- `src/lib/hooks/guard/bash/index.mts`, `judge.mts`, `bash.mts`, `powershell.mts`, `rules.mts`, `kernel.mts`, `payloads.mts`, `sources.mts`, `escalation.mts`: new, from `src/lib/hooks/guard.bash.mjs`
- `src/lib/hooks/guard.bash.mjs`, `src/hooks/guard.bash.mjs`: deleted, the last handler and shell
- `src/lib/verbs.mts`, `src/lib/shared/shell/powershell.mts`, `src/lib/shared/shell/kernel-call.mts`, `src/lib/shared/escalation.mts`, `src/lib/shared/sources/protection.mts`, `src/lib/util/vendor/shell-quote-parse.d.mts`: read only
- `test/hooks/handlers.test.mjs`: import from `dist/lib/hooks/guard/bash/index.mjs`, `hookContext` call sites, the verb-class test
- `test/hooks/hooks.test.mjs`, `test/kernel/sources.test.mjs`: read only, spawn path unchanged
- `.claude/agent-memory/picket-architect/statusline-contract.md`, `.claude/agent-memory/picket-reviewer/probe-guards-directly.md`: cite the deleted path; the lead edits them (developers do not edit `.claude/`)

**Changes:**
- Before the first change, copy `dist/` to the scratchpad: the replay's baseline.
- The nine modules per D-004 and D-005. Today's tables (`SAFE_ROOTS` and the rest) move into `rules.mts` unchanged, and both sed checkers stay as they are. Exports kept for tests: `guardBash`, `WRAPPING_FLAGS`, `kernelClass`, `isLeadOnly`.
- `ctx` replaces `process.env` (assignment check, source roots), `process.cwd()` (fallback cwd, trace), `new Date()` (trace, escalation rows) and `homedir()`.
- The two memory files cite `src/lib/hooks/guard/bash/index.mts` instead.

**Done when:**
- **T-4.1** Every guard.bash test in `test/hooks/handlers.test.mjs`, `test/hooks/hooks.test.mjs` and `test/kernel/sources.test.mjs` passes with assertions unchanged; the two verb-set tests are replaced by one asserting `kernelClass` gives `safe` for state, next, packet, list, summary, cost, preflight, admit, verify, source find, source grep and extension list, `kernel` for every other entry, and `isLeadOnly` is true for comment and waive only.
- **T-4.2** Replaying every row of `.picket/state/guard.log` whose command is under 300 characters through the baseline copy and the new guard, each with a scratch root, gives the same decision and reason for every row; the block gives the row count.
- **T-4.3** `git grep -nE "KERNEL_READ_VERBS|KERNEL_OTHER_VERBS|LEAD_ONLY_VERBS" -- src test` prints nothing; `git grep -n carriesMarker -- src/lib/hooks/guard/bash` names only `judge.mts`.
- **T-4.4** `src/lib/hooks/guard.bash.mjs` does not exist and `src/hooks/` holds only `hooks.json` and `README.md`.
- **T-4.5** Driven through `dist/hooks/guard.bash.mjs` in a temp project: Bash `git push origin main` denies; Bash `cat a.txt | head -5` allows; PowerShell `Remove-Item -Recurse build` denies; PowerShell `Get-ChildItem` prints nothing; `PICKET_ESCALATE="x" git push origin main` from agent type `picket:developer` in permission mode `default` asks.
- **T-4.6** `npm test` and `npm run typecheck` pass, the conventions scans included; `dist/hooks/guard.bash.mjs` starts under 200 ms, its time in the block.

## Phase 5: Close-out: `src/hooks/` goes, the scan enforces the layout

**Touch set:**
- `src/hooks/hooks.json`: deleted
- `src/lib/hooks/README.md`: `git mv` from `src/hooks/README.md`; the shells paragraph rewritten for the list, folders and generated entries
- `src/lib/hooks/hook.mjs`: deleted
- `scripts/build.mjs`, `scripts/watch.mjs`: the shell path and the oracle exclusion removed
- `test/hooks/hook-list.test.mjs`: explicit triples, one folder per name
- `test/hooks/handlers.test.mjs`: the `src/hooks` tests (T-7.1, T-6.1) become one test that `src/hooks/` does not exist
- `test/hooks/hooks.test.mjs`: lines 903 and 952 read `dist/hooks/hooks.json`
- `test/kernel/plugin-layout.test.mjs`: no shells on disk
- `test/kernel/kernel-sources.mjs`: `KERNEL_DIRS` without `src/hooks`
- `test/kernel/conventions.test.mjs`: hook zones
- `CONTRIBUTING.md`: lines 11 and 12; `README.md`: lines 38 and 42
- `.claude/agent-memory/picket-reviewer/dist-on-disk-can-be-stale.md`: cites `src/hooks/`; the lead edits it

**Changes:**
- The direction scan: `"hooks.mts"` imports nothing; a hook file may import `shared/`, `util/`, `verbs.mts` and `verbs/<verb>/index.mts`; inside `hooks/`, a file in `hooks/<kind>/<name>/` imports its own folder, a top-level file of its kind folder, `hook-spec.mts` and `output.mts`, never another hook's folder or `run-hook.mts`.
- `hook-list.test.mjs` replaces the oracle with the 13 (event, matcher, names) groups of today's `hooks.json` written out (draft R-3).

**Done when:**
- **T-5.1** `src/hooks/` and `src/lib/hooks/hook.mjs` do not exist; after `npm run build`, `dist/hooks/` holds exactly `hooks.json` and the 14 `<name>.mjs` bundles.
- **T-5.2** `hook-list.test.mjs` passes with the explicit groups, and asserts every `HOOKS` name has `src/lib/hooks/<kind>/<name>/index.mts` and every such `index.mts` has a `HOOKS` entry.
- **T-5.3** The direction scan passes on `src/`; its self-test reports `src/lib/hooks/observe/drive/index.mts` importing `../../guard/bash/powershell.mts`, `src/lib/hooks.mts` importing `node:fs`, and `src/lib/hooks/route/verdict/index.mts` importing `../../../verbs/route/route.mts`, and nothing for `../edit-target.mts` from `src/lib/hooks/guard/comments/index.mts`.
- **T-5.4** Driven: `claude --plugin-dir dist plugin details picket` (no model call) lists the eight hook events.
- **T-5.5** `test/markdown-paths.test.mjs` passes; `CONTRIBUTING.md` says a hook is a folder `src/lib/hooks/<kind>/<name>/` whose `index.mts` exports `hook`, listed in `src/lib/hooks.mts`, with entries and `hooks.json` generated by the build.
- **T-5.6** `npm test` and `npm run typecheck` pass; every bundle starts under 200 ms, the slowest named in the block.

## Phase 6: One rule table, B1 and project tools

**Touch set:**
- `src/lib/hooks/guard/bash/rules.mts`: `ROOTS`, one sed checker, git `--output`
- `src/lib/hooks/guard/bash/bash.mts`, `src/lib/hooks/guard/bash/sources.mts`: read `ROOTS` for the inert and source checks [INFERRED: wherever phase 4 put them]
- `src/lib/shared/shell/powershell.mts`: read only, `CANONICAL_GROUPS`
- `test/hooks/handlers.test.mjs`: B1, project tool, sed and canonical-name tests
- `README.md`: one Status line (draft R-4)
- `src/lib/hooks/README.md`: the guard.bash row

**Changes:**
- `ROOTS` per D-006 and D-007 replaces the seven tables; the general classifier, the inert test and the source rule read it. One sed checker serves both callers.
- Before the first change, copy `dist/` to the scratchpad: the replay's baseline.

**Done when:**
- **T-6.1** In a temp project `guardBash` returns `null` for `find . -fprint out.txt`, `find . -fls x`, `tree -o out.txt`, `rg --pre ./x foo`, `git log --output=x`, `git diff --output=x` and `git show --output=x HEAD`; with a protected source as cwd each is denied.
- **T-6.2** `guardBash` returns `null` for `prettier --write src`, `eslint --fix src`, `tsc` and `vitest run`, and for `npm test` in a project whose `test` script is `vitest run`.
- **T-6.3** Still allowed: `cat a.txt | head -5`, `find . -name x`, `rg foo src`, `tree -L 2`, `git log --oneline -5`, `sed -n '$p' a.txt`, `sed -n -e 1p a.txt`; `null`: `sed -n 's/a/b/w out' a.txt`, `sed -i 1p a.txt`, `sed -n 1p -i a.txt`.
- **T-6.4** A test asserts every `ROOTS` key holding an upper-case letter is the first name of a `CANONICAL_GROUPS` entry; `git grep -nE "SAFE_ROOTS|INERT_ROOTS|SOURCE_READERS|FIND_ACTIONS|READER_WRITE_FLAGS|Select-Object" -- src/lib` prints nothing.
- **T-6.5** Replaying the rows of T-4.2 through the baseline copy and the new guard, every row whose decision differs uses a B1 form, a project tool root, an npm script resolving to one, or a sed form of T-6.3; the block counts each group.
- **T-6.6** Every other guard test passes with assertions unchanged; `npm test` passes and `dist/hooks/guard.bash.mjs` starts under 200 ms, its time in the block.
- **T-6.7** `README.md`'s Status list says the guard now asks for the seven B1 forms and the project tools, and that a project can allow those tools in its Claude Code permission settings.

## Open questions

- **OQ-001** Should `dist/hooks/` use the draft's nested `<kind>/<name>.mjs` paths instead of D-001's flat `<kind>.<name>.mjs`? Whether Claude Code rereads a plugin's `hooks.json` mid-session is unverified, so the nested paths would need a session restart at the phase that switches them. Owner: the user, through the lead. Fallback: flat names as designed; switching later is a build-only change plus one restart.

## Revision log

- 2026-10-23: D-008: phase 5 marked security true, since it changes the registration; phase 6 files gain bash.mts and sources.mts from its touch set
