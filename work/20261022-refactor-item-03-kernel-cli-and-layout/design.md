---
kind: design
lane: design
title: Refactor item 03, kernel CLI and layout
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/03-kernel-cli.md, artifacts/refactor/00-conventions.md, artifacts/refactor/01-layout-and-build.md, artifacts/refactor/02-code-conventions.md, artifacts/refactor/04a-work-item-model.md, artifacts/refactor/04b-sources-and-intake.md, artifacts/refactor/04c-running-things.md, artifacts/refactor/04d-reading-and-reporting.md, artifacts/refactor/05-hooks.md, artifacts/refactor/07b-styling.md, artifacts/refactor/08b-docs.md, work/20261022-refactor-item-02-code-conventions/design.md, tsconfig.json, package.json, scripts/build.mjs, scripts/watch.mjs, scripts/test.mjs, src/bin/picket.mts, src/bin/dispatch.mjs, src/lib (every module), src/lib/hooks/guard.bash.mjs, src/hooks/README.md, README.md, CONTRIBUTING.md, docs/how-to.md, test/kernel/kernel-sources.mjs, test/kernel/conventions.test.mjs, test/kernel/cli.test.mjs, test/kernel/close.test.mjs, test/kernel/names.test.mjs, test/hooks/handlers.test.mjs, test/build.test.mjs, test/type-rules/mistakes.mts, esbuild 0.28.2 probe of the import plugin (2026-10-23)]
phases:
  - n: 1
    files: [tsconfig.json, scripts/build.mjs, src/bin/picket.mts, src/lib/cli/main.mts, src/lib/cli/registry.mts, src/lib/cli/legacy.mjs, src/lib/verbs.mts, src/lib/verbs/leave/index.mts, src/lib/shared/verb-spec.mts, src/lib/shared/action.mts, src/lib/shared/context.mts, src/lib/shared/work/files.mts, src/lib/shared/work/left.mts, src/lib/util/args.mts, src/lib/util/io.mts, src/lib/util/process.mts, src/lib/git.mts, src/lib/close.mjs, src/lib/hooks/guard.bash.mjs, test/kernel/leave.test.mjs, test/kernel/args.test.mjs, test/kernel/cli.test.mjs, test/kernel/close.test.mjs, test/kernel/action.test.mjs, test/kernel/context.test.mjs, test/kernel/io.test.mjs, test/kernel/process.test.mjs, test/kernel/work-files.test.mjs, test/kernel/conventions.test.mjs, test/kernel/paths.test.mjs, test/type-rules/mistakes.mts, test/build.test.mjs, test/hooks/handlers.test.mjs, CONTRIBUTING.md, README.md]
    greps:
      - path: tsconfig.json
        pattern: '"allowImportingTsExtensions": true'
      - path: scripts/build.mjs
        pattern: 'packages: "external"'
      - path: src/bin/picket.mts
        pattern: 'import\("\.\./lib/cli/main\.mts"\)'
      - path: src/lib/verbs.mts
        pattern: '^(?![\s\S]*\bimport\b)'
        flags: i
      - path: src/lib/cli/registry.mts
        pattern: 'leave: \(\) => import\("\.\./verbs/leave/index\.mts"\)'
      - path: src/lib/util/args.mts
        pattern: 'export class UsageError extends Error'
      - path: src/lib/shared/action.mts
        pattern: '^(?![\s\S]*UsageError)'
        flags: i
      - path: src/lib/verbs/leave/index.mts
        pattern: 'export const verb: VerbSpec<'
      - path: src/lib/cli/legacy.mjs
        pattern: 'export async function legacyMain\('
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/paths.mts, src/lib/shared/git.mts, src/lib/util/git.mts, src/lib/shared/config.mjs, src/lib/shared/config.schema.json, src/lib/shared/extensions.mjs, src/lib/shared/extension.schema.json, src/lib/shared/comments.mjs, src/lib/shared/silenced.mjs, src/lib/shared/saved-rules.mjs, src/lib/shared/escalation.mjs, src/lib/shared/repos.mjs, src/lib/shared/tooling.mjs, src/lib/shared/agent-name.mjs, src/lib/shared/ledger.mjs, src/lib/shared/destructive.mjs, src/lib/shared/checks.mjs, src/lib/shared/review-summary.mjs, src/lib/shared/verdicts.mjs, src/lib/shared/mutation.mjs, src/lib/shared/work/work.mjs, src/lib/shared/work/gate.mjs, src/lib/shared/work/next-step.mjs, src/lib/shared/sources/sources.mjs, src/lib/shared/sources/source-paths.mjs, src/lib/shared/transcript/transcript.mjs, src/lib/shared/transcript/turn-block.mjs, src/lib/shared/styling/font.mjs, src/lib/shared/styling/host.mjs, src/lib/shared/styling/manifest.mjs, src/lib/shared/styling/nerd-font.json, src/lib/shared/styling/palette.mjs, src/lib/shared/styling/setup.mjs, src/lib/shared/styling/statusline-setting.mjs, src/lib/shared/styling/terminal.mjs, src/lib/shared/styling/theme.mjs, src/lib/shared/styling/uninstall.mjs, src/lib/shared/styling/zip.mjs, src/lib/shared/styling/terminals/gnome-terminal.mjs, src/lib/shared/styling/terminals/ini.mjs, src/lib/shared/styling/terminals/konsole.mjs, src/lib/shared/styling/terminals/manual.mjs, src/lib/shared/styling/terminals/plist.mjs, src/lib/shared/styling/terminals/ptyxis.mjs, src/lib/shared/styling/terminals/terminal-app.mjs, src/lib/shared/styling/terminals/windows-terminal.mjs, src/lib/util/yaml-lite.mjs, src/lib/util/node-floor.mjs, src/lib/util/vendor/jsonc-parser.d.mts, src/lib/util/vendor/jsonc-parser.mjs, src/lib/util/vendor/shell-quote-parse.d.mts, src/lib/util/vendor/shell-quote-parse.mjs, src/lib/hooks/hook.mjs, src/lib/hooks/edit-texts.mjs, src/lib/hooks/kernel-call.mjs, src/lib/hooks/powershell-text.mjs, src/lib/hooks/drive-evidence.mjs, src/lib/route.mjs, src/lib/cost.mjs, src/lib/init.mjs, src/lib/mutate.mjs, src/lib/preflight.mjs, src/lib/admit.mjs, src/lib/close.mjs, src/lib/drive.mjs, src/lib/migrate.mjs, src/lib/packet.mjs, src/lib/pr.mjs, src/lib/statusline.mjs, src/lib/verify.mjs, src/lib/hooks/emit.ledger.mjs, src/lib/hooks/guard.bash.mjs, src/lib/hooks/guard.block.mjs, src/lib/hooks/guard.comments.mjs, src/lib/hooks/guard.scope.mjs, src/lib/hooks/guard.silenced.mjs, src/lib/hooks/inject.extensions.mjs, src/lib/hooks/inject.rules.mjs, src/lib/hooks/inject.state.mjs, src/lib/hooks/lint.schema.mjs, src/lib/hooks/monitor.context.mjs, src/lib/hooks/notify.user.mjs, src/lib/hooks/observe.drive.mjs, src/lib/hooks/route.verdict.mjs, src/hooks/emit.ledger.mjs, src/hooks/guard.bash.mjs, src/hooks/guard.block.mjs, src/hooks/guard.comments.mjs, src/hooks/guard.scope.mjs, src/hooks/guard.silenced.mjs, src/hooks/inject.extensions.mjs, src/hooks/inject.rules.mjs, src/hooks/inject.state.mjs, src/hooks/lint.schema.mjs, src/hooks/monitor.context.mjs, src/hooks/notify.user.mjs, src/hooks/observe.drive.mjs, src/hooks/route.verdict.mjs, src/lib/cli/main.mts, src/lib/cli/legacy.mjs, src/lib/shared/work/files.mts, src/lib/verbs/leave/index.mts, src/bin/picket.mts, src/skills/documenting/scripts/filename.mjs, src/skills/reviewing/scripts/lint.craft.mjs, CONTRIBUTING.md, README.md, src/hooks/README.md, docs/design/README.md, docs/design/picketai-design-system/project/README.md, .claude/rules/harness-authoring.md, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/hooks/powershell-text.test.mjs, test/kernel/admit-labelled.test.mjs, test/kernel/check.test.mjs, test/kernel/close.test.mjs, test/kernel/comments.test.mjs, test/kernel/config-fixture.mjs, test/kernel/config.test.mjs, test/kernel/conventions.test.mjs, test/kernel/cost.test.mjs, test/kernel/drive.test.mjs, test/kernel/extensions.test.mjs, test/kernel/gate.test.mjs, test/kernel/git.test.mjs, test/kernel/migrate.test.mjs, test/kernel/mutate.test.mjs, test/kernel/next.test.mjs, test/kernel/node-floor.test.mjs, test/kernel/packet.test.mjs, test/kernel/paths.test.mjs, test/kernel/preflight.test.mjs, test/kernel/review.test.mjs, test/kernel/route.test.mjs, test/kernel/saved-rules.test.mjs, test/kernel/silenced.test.mjs, test/kernel/sources.test.mjs, test/kernel/statusline.test.mjs, test/kernel/verify.test.mjs, test/kernel/work.test.mjs, test/kernel/yaml-lite.test.mjs, test/kernel/styling/font.test.mjs, test/kernel/styling/linux-terminals.test.mjs, test/kernel/styling/setup.test.mjs, test/kernel/styling/terminal-app.test.mjs, test/kernel/styling/terminal.test.mjs, test/kernel/styling/theme.test.mjs, test/kernel/styling/uninstall.test.mjs, test/kernel/styling/zip.test.mjs]
    greps:
      - path: src/lib/util/git.mts
        pattern: 'export function gitRun\('
      - path: src/lib/shared/git.mts
        pattern: 'from "\.\./util/git\.mts"'
      - path: src/lib/shared/verdicts.mjs
        pattern: 'export const VERDICTS'
      - path: src/lib/shared/ledger.mjs
        pattern: 'export function readLedger\('
      - path: src/lib/shared/styling/statusline-setting.mjs
        pattern: 'export const STATUS_LINE'
      - path: src/lib/shared/mutation.mjs
        pattern: 'export function readMutation\('
      - path: src/lib/shared/styling/font.mjs
        pattern: '"lib", "shared", "styling", "nerd-font\.json"'
      - path: src/hooks/guard.bash.mjs
        pattern: 'from "\.\./lib/hooks/hook\.mjs"'
      - path: test/kernel/conventions.test.mjs
        pattern: 'src/lib/shared/paths\.mts'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/verbs/admit/admit.mjs, src/lib/verbs/close/close.mjs, src/lib/verbs/cost/cost.mjs, src/lib/verbs/drive/drive.mjs, src/lib/verbs/init/init.mjs, src/lib/verbs/migrate/migrate.mjs, src/lib/verbs/mutate/mutate.mjs, src/lib/verbs/packet/packet.mjs, src/lib/verbs/preflight/preflight.mjs, src/lib/verbs/route/route.mjs, src/lib/verbs/statusline/statusline.mjs, src/lib/verbs/verify/verify.mjs, src/lib/verbs/pullrequest/pr.mjs, src/lib/shared/work/block.mjs, src/lib/shared/ledger.mjs, src/lib/cli/legacy.mjs, src/lib/hooks/route.verdict.mjs, test/kernel/conventions.test.mjs, test/kernel/admit.test.mjs, test/kernel/admit-labelled.test.mjs, bench/test/tasks.test.mjs, test/kernel/cost.test.mjs, test/kernel/drive.test.mjs, test/kernel/git.test.mjs, test/kernel/init.test.mjs, test/kernel/migrate.test.mjs, test/kernel/mutate.test.mjs, test/kernel/packet.test.mjs, test/kernel/pr.test.mjs, test/kernel/route.test.mjs, test/kernel/statusline.test.mjs, test/kernel/verify.test.mjs, test/kernel/styling/terminal.test.mjs, test/hooks/handlers.test.mjs, test/kernel/extensions.test.mjs, CONTRIBUTING.md]
    greps:
      - path: src/lib/shared/work/block.mjs
        pattern: 'export function blockFiles\('
      - path: src/lib/shared/ledger.mjs
        pattern: 'export function recordAccept\('
      - path: src/lib/verbs/packet/packet.mjs
        pattern: '^(?![\s\S]*PATH_TOKEN)'
        flags: i
      - path: test/kernel/conventions.test.mjs
        pattern: 'function importViolations\('
      - path: test/kernel/packet.test.mjs
        pattern: '\.gitattributes'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/verbs/state/index.mts, src/lib/verbs/list/index.mts, src/lib/verbs/next/index.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/admit/index.mts, src/lib/verbs/preflight/index.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/packet/index.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/legacy.mjs, test/kernel/verb-parse.test.mjs, test/kernel/cost.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: src/lib/cli/registry.mts
        pattern: 'packet: \(\) => import\("\.\./verbs/packet/index\.mts"\)'
      - path: src/lib/verbs/packet/index.mts
        pattern: 'output: "text"'
      - path: src/lib/verbs/cost/index.mts
        pattern: 'str\(args, "session"\)'
      - path: src/lib/cli/legacy.mjs
        pattern: '^(?![\s\S]*case "cost":)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/verbs/set/index.mts, src/lib/verbs/close/index.mts, src/lib/verbs/comment/index.mts, src/lib/verbs/waive/index.mts, src/lib/verbs/route/index.mts, src/lib/verbs/migrate/index.mts, src/lib/verbs/init/index.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/legacy.mjs, test/kernel/verb-parse.test.mjs, test/kernel/close.test.mjs, test/kernel/init.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: src/lib/cli/registry.mts
        pattern: 'route: \(\) => import\("\.\./verbs/route/index\.mts"\)'
      - path: src/lib/verbs.mts
        pattern: 'waive: \{[^}]*leadOnly: true'
      - path: src/lib/cli/legacy.mjs
        pattern: '^(?![\s\S]*case "route":)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/verbs/drive/index.mts, src/lib/verbs/check/index.mts, src/lib/verbs/mutate/index.mts, src/lib/verbs/statusline/index.mts, src/lib/verbs/statusline/statusline.mjs, src/lib/verbs/source/find.mts, src/lib/verbs/source/grep.mts, src/lib/verbs/source/pick.mts, src/lib/verbs/source/add.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/legacy.mjs, test/kernel/verb-parse.test.mjs, test/kernel/sources.test.mjs, test/kernel/drive.test.mjs, test/kernel/statusline.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: src/lib/cli/registry.mts
        pattern: '"source find": \(\) => import\("\.\./verbs/source/find\.mts"\)'
      - path: src/lib/verbs/statusline/index.mts
        pattern: 'output: "text"'
      - path: src/lib/verbs/statusline/index.mts
        pattern: '^(?![\s\S]*projectRoot\()'
        flags: i
      - path: src/lib/verbs/drive/index.mts
        pattern: 'pairs\(args, "env"\)'
    tests: true
    drive: true
    security: false
  - n: 7
    files: [src/lib/verbs/open/index.mts, src/lib/verbs/summary/index.mts, src/lib/verbs/extension/add.mts, src/lib/verbs/extension/list.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/main.mts, src/lib/cli/legacy.mjs, src/lib/hooks/guard.bash.mjs, src/lib/hooks/guard.scope.mjs, src/skills/designing/steps/10-design.md, src/skills/expediting/SKILL.md, src/skills/ordering/steps/10-order.md, src/skills/researching/steps/10-outline.md, src/skills/ordering/steps/40-review.md, docs/how-to.md, test/kernel/verb-parse.test.mjs, test/kernel/cli.test.mjs, test/kernel/work.test.mjs, test/kernel/sources.test.mjs, test/kernel/extensions.test.mjs, test/kernel/names.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: src/lib/cli/main.mts
        pattern: '"review-summary": '
      - path: src/skills/ordering/steps/40-review.md
        pattern: 'picket summary <id>'
      - path: src/skills/designing/steps/10-design.md
        pattern: 'picket open --lane design'
      - path: src/lib/hooks/guard.bash.mjs
        pattern: '^(?![\s\S]*"(review-summary|find-verdict|extensions)")'
        flags: i
      - path: src/lib/hooks/guard.bash.mjs
        pattern: 'extension: \["list"\]'
    tests: true
    drive: true
    security: false
  - n: 8
    files: [src/lib/verbs/style/apply.mts, src/lib/verbs/style/remove.mts, src/lib/verbs/pullrequest/prepare.mts, src/lib/verbs/pullrequest/post.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/main.mts, src/lib/hooks/guard.bash.mjs, src/lib/shared/styling/terminals/gnome-terminal.mjs, src/lib/shared/styling/terminals/windows-terminal.mjs, src/skills/reviewing/SKILL.md, src/rules/untrusted.md, README.md, docs/how-to.md, docs/style-checklist.md, docs/design/picketai-design-system/project/README.md, test/kernel/verb-parse.test.mjs, test/kernel/cli.test.mjs, test/kernel/names.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: src/rules/untrusted.md
        pattern: 'picket pullrequest post <url> --file <file>'
      - path: src/skills/reviewing/SKILL.md
        pattern: 'picket pullrequest prepare <url> --human'
      - path: src/lib/cli/main.mts
        pattern: '^(?![\s\S]*legacy)'
        flags: i
      - path: src/lib/cli/registry.mts
        pattern: '"style apply": \(\) => import\("\.\./verbs/style/apply\.mts"\)'
      - path: docs/style-checklist.md
        pattern: 'picket style apply --dry-run'
    tests: true
    drive: true
    security: false
  - n: 9
    files: [test/kernel/conventions.test.mjs, test/kernel/registry.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: test/kernel/conventions.test.mjs
        pattern: '\^\[a-z\]\+\$'
      - path: test/kernel/registry.test.mjs
        pattern: 'REGISTRY'
      - path: test/hooks/handlers.test.mjs
        pattern: 'VERB_NAMES'
    tests: true
    drive: true
    security: false
---
# Design: Refactor item 03, kernel CLI and layout

## Problem

`src/bin/dispatch.mjs` (424 lines) reads flags by hand, holds kernel logic and about ten inline renderers in one `switch`, loads all 28 modules on every call, and `src/lib` is flat with verb modules importing each other. The user approved item 03 (`artifacts/refactor/03-kernel-cli.md`: X-1 to X-11, its migration and its revision log, which brings in 04a W-2, 04b S-10, 04c E-8, 04d P-3, 05 H-4, 07b Y-6 and 08b G-2) and the conventions C-001 to C-019; this record carries them into phases and re-decides none. Binding constraints: item 02 hands this item the folder moves, the `.mts` import names and scan 4 (`work/20261022-refactor-item-02-code-conventions/design.md` D-001, D-007, D-008); the insides of moved modules belong to items 04a to 04d, 05 and 07b; every phase leaves `npm test` green and the CLI working, because this session drives the harness through `dist/`; an instruction file that names a verb changes in the phase that renames it. Because `picket verify` checks that each `files` path exists, a phase's must_haves name only paths that exist afterwards, and every path a phase deletes or moves away from goes on its block's Files line so `picket route` commits the deletion.

## Decisions

### D-001: The CLI parses, runs and prints; a legacy fallback carries unconverted verbs
**Decision:** Infrastructural decision, carrying X-1, X-6, X-7, X-9 and C-008, with item 02 D-002's `describeExit`. `src/bin/picket.mts` keeps its Node floor check (`checkNodeFloor`, its one static import, equal to X-9's inline check), then `const { main } = await import("../lib/cli/main.mts")` and `process.exitCode = await main(process.argv.slice(2))`. `cli/main.mts` parses with `parseArgs`, handles the global flags (`--root`, `--human`, `--pretty`, `--json`, `--version`, `--help`, `help [<verb>]`), resolves the verb, loads its spec through `REGISTRY`, runs `spec.run(spec.parse(args), edgeContext(root))` with `root` from `--root` or `projectRoot()`, prints, and returns `describeExit(outcome).code`. Printing: a `"json"` verb prints JSON (`--pretty` indents) and `render(value)` under `--human`; a `"text"` verb prints `render(value)` and JSON under `--json`; a refusal prints `{ ok: false, error, ...details }` as JSON and `refused: <message>` as text. A `UsageError` prints `picket: <message>` on stderr and returns 1; any other error does the same, as `dispatch.mjs:418-424` does today. Until the last verb converts, `dispatch.mjs` lives on as `cli/legacy.mjs`, exporting `LEGACY_VERBS` (today's `VERBS` minus converted names) and `legacyMain(argv): Promise<number>` with no `process.exit`; `main` hands it the raw `argv` for a name in `LEGACY_VERBS`. The help block keeps today's first line `usage: picket <verb> [args] [--pretty | --human]` and its `verbs:` line (converted names plus `LEGACY_VERBS`), then each converted spec's `usage` and `summary`; `--help` anywhere prints the whole block, `help <verb>` one verb or every subverb of a group. An unknown verb is a `UsageError`: `unknown verb "<x>". Verbs: <the same list>`.
**Instead of:** converting every verb in one phase and deleting `dispatch.mjs` at once: one red verb would block the rest, and this session's harness breaks with it (draft R-1).
**Risks:**
- **RISK-001** `process.exitCode` waits for open handles where `process.exit` cut them, so a verb that leaves a socket or timer open hangs the CLI. Mitigation: each conversion phase drives its verbs through `dist/bin/picket.mjs` in tests that time out; a verb that hangs closes its handle in its own module.

### D-002: Names in `verbs.mts`, loaders in `cli/registry.mts`, one file per subverb
**Decision:** Infrastructural decision, carrying X-4, X-10, C-012, and the revision-log fields `leadOnly` (05 H-4) and `summary` (08b G-2). `src/lib/verbs.mts` imports nothing and exports `VERB_NAMES`, an `as const` object whose entry is `{ summary, readOnly, leadOnly? }` for a verb or `{ summary, subverbs: { <sub>: { summary, readOnly } } }` for a group, with `type Verb = keyof typeof VERB_NAMES` and `type Command`, the union of plain verb names and `"<group> <sub>"` strings derived from it. `cli/registry.mts` exports `REGISTRY`, one dynamic `import()` per `Command`, `satisfies Record<Command, () => Promise<{ verb: VerbSpec<any, any> }>>`, so a name without a loader fails `tsc`. A plain verb's loader imports `verbs/<verb>/index.mts`; a subverb's imports `verbs/<group>/<sub>.mts` (`source/find.mts`, `pullrequest/prepare.mts`, as the draft and 04d name them); a group folder has no `index.mts`. `readOnly` and `leadOnly` copy today's guard sets (`guard.bash.mjs:420-423`), a renamed verb keeping its old value, so item 05 can swap the lists for `verbs.mts` without changing a decision. `statusline` stays a plain verb (X-10). Entries are added as verbs convert, so `VERB_NAMES` and `REGISTRY` always hold exactly the converted names.
**Instead of:** one `index.mts` per group exporting every subverb spec: `picket source find` would load `add` and `pick` with their intake code, and 04b and 04d already name one file per subverb.
**Risks:**
- **RISK-002** `Command` is a mapped template-literal type, the most clever code here. Mitigation: phase 9 adds a runtime test that the registry's keys equal the commands listed from `VERB_NAMES` and that each loads a spec whose `usage` starts with its command.

### D-003: `VerbSpec` and typed argument getters
**Decision:** Infrastructural decision, carrying X-3, X-5 and C-006. `shared/verb-spec.mts` exports `VerbSpec<I, O> = { usage: string; output: "json" | "text"; parse: (args: Args) => I; run: Action<I, O>; render: (value: O) => string }`. `util/args.mts` replaces `cli-args.mjs` and takes `UsageError` from `action.mts` (X-5). `Args = { pos: string[]; opt: Record<string, string | true | (string | true)[]>; stdin: () => string }`; `parseArgs(argv, stdin)` keeps today's tokenising (a `--flag` takes the next token unless it starts with `--`; a repeated flag collects an array), so `guard.bash.mjs` reads commands as before. `main` passes `parse` the `Args` with the verb and subverb removed from `pos`. Getters: `str` (absent: `undefined`; bare or repeated: `UsageError` naming the flag, which fixes `cost --session`), `need` (absent: `UsageError` naming the flag), `list` (`"a, b,,c"` gives `["a", "b", "c"]`), `many` (every occurrence), `int` and `seconds` (not a whole number: `UsageError`; `seconds` returns milliseconds), `flag` (present without a value: `true`; with one: `UsageError`), `pairs` (`NAME=VALUE`, `NAME` matching `^[A-Za-z_][A-Za-z0-9_]*$`, else `UsageError`, today's `envFromFlags` rule). `stdin()` reads only when called. `parse` throws only `UsageError`; a check that needs the disk belongs in the action.
**Instead of:** a declared flag schema per verb, as `node:util` `parseArgs` takes: a second place naming every flag, while a getter sits where its value is used, and the guard needs the schema-free tokeniser anyway.
**Risks:**
- **RISK-003** Stricter getters turn silent misreads into usage errors (`--session` with no value, `--timeout abc`, `--human state x`). Mitigation: each is a bug today; every conversion phase keeps the existing tests passing and lists the assertions it changes.

### D-004: A verb folder is a typed adapter over its moved module
**Decision:** Infrastructural decision, carrying X-3 within L-4 and the draft's line "the insides of the large modules are item 04". Each converted verb gets a new `verbs/<verb>/index.mts` (or `<group>/<sub>.mts`) holding its input and output types, `parse`, the action, `render` and `verb`. The action is `action(async (input, ctx) => ...)` calling today's helper with `ctx.root` (and `ctx.now`, `ctx.env`, `ctx.home`, `ctx.session` where the helper takes them); it returns `failed(value)` where today's code exits 2 on a result (`preflight`, `verify`, `drive`, `check`, `init` with a failed step, `mutate` with `outcome: "error"`, a styling change that failed), and throws `Refused` for today's refusal classes (`CloseRefused` with its `next`, `InitRefused`, `IntakeError` with its `failures`, `LookupError`, an unreachable source). The helper's body stays `.mjs` where D-005 puts it; items 04a to 04d, 05 and 07b convert and reshape it. `leave` alone converts fully, as the draft shows, with `LeftEntry`, `readLeft(root, id)` and `leftLine(entry)` in a new `shared/work/left.mts`. The renderers in `dispatch.mjs` move into each `render` (K-12), and the logic in the draft's table "Logic that leaves the CLI" moves into the actions.
**Instead of:** converting every moved module to strict `.mts` now: 04a turns `route` into plan and apply, `next` into a pure `nextStep` and splits `work.mjs`, and 04b to 04d and 07b rewrite the rest, so typing them here is done twice.
**Risks:**
- **RISK-004** An `index.mts` importing a `.mjs` helper sees the types `tsc` infers from JavaScript (the `{}` types L-4 warns of), a narrow exception to C-003 at the adapter boundary. Mitigation: the adapter declares its own input and output types, so specs and renderers stay strict; where `tsc` rejects a call, a `.d.mts` beside the moved module declares that export, as `vendor/` already does.

### D-005: Where each module lands
**Decision:** Infrastructural decision, carrying the draft's tree and table with the revision-log changes (04a: `block`, `gate`, `next-step` under `shared/work/`; no barrels, C-015). Files move with `git mv` and keep their base name unless the table renames them; an extraction moves named exports unchanged into the target and repoints their importers.

| Phase | Today | Target |
|---|---|---|
| 1 | `src/bin/dispatch.mjs` | `src/lib/cli/legacy.mjs` (deleted in phase 8) |
| 1 | `cli-args.mjs` | `util/args.mts` (converted, D-003) |
| 1 | `action.mts`, `context.mts`, `work-files.mts` | `shared/action.mts`, `shared/context.mts`, `shared/work/files.mts` |
| 1 | `io.mts`, `process.mts` | `util/io.mts`, `util/process.mts` |
| 1 | `leave.mjs` | `verbs/leave/index.mts`; `readLeft`, `leftLine` to `shared/work/left.mts` |
| 2 | `paths.mts`; `git.mts` | `shared/paths.mts`; `gitRead`, `gitRun` to `util/git.mts`, the rest to `shared/git.mts` |
| 2 | `config.mjs`, `config.schema.json`, `extensions.mjs`, `extension.schema.json`, `comments.mjs`, `silenced.mjs`, `saved-rules.mjs`, `escalation.mjs`, `repos.mjs`, `tooling.mjs`, `agent-name.mjs`, `ledger.mjs` | `shared/` |
| 2 | `unsafe.mjs`; `check.mjs`; `review.mjs` | `shared/destructive.mjs`; `shared/checks.mjs`; `shared/review-summary.mjs` |
| 2 | `work.mjs`, `gate.mjs`, `next.mjs` | `shared/work/work.mjs`, `shared/work/gate.mjs`, `shared/work/next-step.mjs` |
| 2 | `sources.mjs`, `source-paths.mjs`; `transcript.mjs`, `turn-block.mjs`; `styling/**` | `shared/sources/`; `shared/transcript/`; `shared/styling/**` |
| 2 | `yaml-lite.mjs`, `node-floor.mjs`, `vendor/` | `util/` |
| 2 | `hook.mjs`, `edit-texts.mjs`, `kernel-call.mjs`, `powershell-text.mjs`, `drive-evidence.mjs` | `hooks/` |
| 2 | extracted: `VERDICTS`, `findVerdict` (`route.mjs`); `readLedger` (`cost.mjs`); `STATUS_LINE` (`init.mjs`); `readMutation` (`mutate.mjs`) | `shared/verdicts.mjs`; `shared/ledger.mjs`; `shared/styling/statusline-setting.mjs`; `shared/mutation.mjs` |
| 2 | `preflight.mjs` re-export of `detectTooling` | removed; importers use `shared/tooling.mjs` |
| 3 | `admit`, `close`, `cost`, `drive`, `init`, `migrate`, `mutate`, `packet`, `preflight`, `route`, `statusline`, `verify` (`.mjs`) | `verbs/<name>/<name>.mjs` |
| 3 | `pr.mjs` | `verbs/pullrequest/pr.mjs` |
| 3 | extracted: `recordAccept` (`close.mjs`); `blockPath`, `saveBlock`, `readBlock`, `blockFiles`, `parseBlock` (`packet.mjs`) | `shared/ledger.mjs`; `shared/work/block.mjs` |

`src/lib/hooks/<kind>.<name>.mjs` handlers stay where they are. Verbs with no module of their own (`state`, `list`, `set`, `comment`, `waive`, `open`, `next`, `check`, `summary`, `source`, `extension`, `style`) get only their adapter files.
**Instead of:** moving each verb's module in the phase that converts it: the direction scan could only land at the end, and every conversion phase would mix moves with new code, which hides behaviour changes in rename noise.
**Risks:**
- **RISK-005** Moves break imports in skill scripts (`documenting/scripts/filename.mjs`, `reviewing/scripts/lint.craft.mjs`), hook shells, tests and Markdown paths (draft R-2). Mitigation: each move phase lists every importer and Markdown file in its touch set; `npm test` (including `test/markdown-paths.test.mjs` and the hook spawns) catches the rest; the scripts are repointed, not converted.

### D-006: Source imports name `.mts`; the build keeps every relative import a separate file
**Decision:** Infrastructural decision, carrying X-11, C-002 (r2) and L-2 as X-11 amends it. `tsconfig.json` gains `"allowImportingTsExtensions": true`. `moduleOptions` in `scripts/build.mjs` gains `bundle: true`, `packages: "external"` and the plugin `runtime-extension`, whose `onResolve` filter is every relative path (`/^\.\.?\//`), not only `.mts`: for anything but an entry point it returns `{ path: <the path, .mts replaced by .mjs>, external: true }`. The probe of 2026-10-23 (esbuild 0.28.2) showed why: with the draft's `.mts`-only filter, `main.mts` importing `../b/old.mjs` got `old.mjs`'s code inlined; with the widened filter both imports stayed `from "../b/*.mjs"`. An inlined copy would give a `.mts` module its own `InitRefused` or `IntakeError` class, so `instanceof` fails across it. `hookOptions` is unchanged. A `.mts` file names a `.mts` target `.mts` and a `.mjs` target `.mjs`; a `.mjs` file, copied verbatim (L-2), names the built file, `.mjs`.
**Instead of:** passing `.mjs` sources through esbuild with the plugin so they too could name `.mts`: it changes L-2's verbatim copy for files the next items convert anyway.
**Risks:**
- **RISK-006** An import the plugin misses leaves `.mts` in `dist/` and fails at runtime (draft R-4). Mitigation: a build test fails on any `.mts"` or `.mts'` in a `dist/` `.mjs`; a conventions scan fails on a `.mts` file that names `X.mjs` where `src/` holds `X.mts`.
- **RISK-007** Node 24 runs a `src/` file directly only if no `.mjs` in its import graph names a converted sibling as `.mjs`, so K-8's claim holds only for the converted graph. Mitigation: none needed here; it becomes true as items 04 to 07 convert, and item 06 is the first to rely on it.

### D-007: Tests hold the layout and the names
**Decision:** Infrastructural decision, carrying X-2, C-014, scan 4 (K-10, item 02 D-008) and "a loader for every name". A scan in `test/kernel/conventions.test.mjs` reads every `.mjs` and `.mts` under `src/lib` and `src/skills/*/scripts`, static and dynamic imports and `export ... from` alike, and applies: `util/` imports only `node:` and `util/`; `shared/` only `shared/` and `util/`; `verbs/<v>/` only its own folder, `shared/` and `util/`; `hooks/` may add any file under `verbs/`; `cli/` may import `verbs.mts`, `verbs/`, `shared/`, `util/`; `verbs.mts` imports nothing; skill scripts only `shared/` and `util/`; nothing outside `src/bin/` imports `cli/`. The draft scans `.mts` only; this one reads `.mjs` too, because about 60 moved files stay `.mjs` and an `.mts`-only scan would see little beyond the adapters. Hooks may reach any file under `verbs/` (`route.verdict` calls `route()` in `verbs/route/route.mjs`); item 05 narrows that to `index.mts`. Phase 9 adds scan 4 (each `VERB_NAMES` key and subverb key matches `^[a-z]+$`), the registry test (RISK-002), a test that `guard.bash.mjs`'s three sets equal what `VERB_NAMES` says, and a test that `cli/main.mts` imports no verb module statically.
**Instead of:** checking the direction on `.mts` files only, as the draft says: true but nearly empty until items 04 to 07 convert.
**Risks:**
- **RISK-008** The import regex misses an unusual form (a multi-line import list). Mitigation: the scan's self-test feeds one sample per form, including a multi-line `import { a,\n b } from`, and expects each to be read.

### D-008: Renames move with every file that names them
**Decision:** Infrastructural decision, carrying X-8 with 04b S-10, 04d P-3 and 07b Y-6. The CLI changes: `new` to `open`; `review-summary` to `summary`; `extensions` to `extension list`; `extension new <name>` to `extension add <name>`; `setup-terminal [--<x>-only]` to `style apply [--only a,b]`; `setup-terminal --revert` to `style remove --all`; `uninstall` (choose styling items) to `style remove`; `pr <url>` to `pullrequest prepare <url>`; `pr <url> --post <f>` to `pullrequest post <url> --file <f>`; `find-verdict` goes. Each rename lands in one phase with every skill, rule, doc, test and guard list that names it (the guard's lists by hand, X-8). `cli/main.mts` keeps `RENAMED`, a map from each old name to its new form, so `picket review-summary x` exits 1 with `picket: "review-summary" is now "summary"`. The concept "review summary" stays in skill prose. The new project-level `uninstall` is 07b's (Y-8); until then `uninstall` points at `style remove`.
**Instead of:** keeping the old names as aliases: two names per verb in the guard lists and docs, the confusion K-10 removes.
**Risks:**
- **RISK-009** The lead and agents of a running session loaded skill text with old names before the rename phase. Mitigation: `RENAMED` answers with the new form, so one retry fixes the call; the phases 7 and 8 blocks name the renames for the lead.

## Scope

**In:**
- `cli/main.mts`, `cli/registry.mts`, `verbs.mts`, `shared/verb-spec.mts`, `util/args.mts`, the build plugin and the `tsconfig.json` change (D-001 to D-003, D-006).
- Every module moved to its folder, with the extractions in D-005 and the B11 fix in `shared/work/block.mjs` (phase 3), since `packet.mjs` is in this item's touch set.
- An adapter per verb (D-004), `leave` converted in full, the legacy fallback removed once the last verb converts.
- The renames with every file that names them, the `RENAMED` answers (D-008).
- The direction scan, scan 4, the registry and guard agreement tests, and the start-time measurement (D-007).

**Out:**
- Converting moved module bodies to `.mts`, removing `root` defaults, `nextStep`, `readSnapshot`, `drive-log.mts` (items 04a to 04d).
- The guard reading `verbs.mts`, `leadOnly` enforcement from the registry, hooks importing only `index.mts`, `output.mts` (item 05).
- Tests beside their code and `fixedContext` (item 06); styling internals, `Host` from `Context`, the project-level `uninstall` (item 07b); generated `docs/reference/` and the stale paths in `src/skills/explaining/examples/admit-walkthrough.md`, which `test/markdown-paths.test.mjs` skips (items 08a, 08b).
- Converting skill scripts to `.mts` (draft R-2's mitigation): repointing their imports is enough to keep them working.
- Bundling the CLI (X-4 keeps item 01 L-3).

## Phase 1: Skeleton and the first verb, `leave`

**Touch set:**
- `tsconfig.json`: add `allowImportingTsExtensions`
- `scripts/build.mjs`: `moduleOptions` bundle, external, plugin
- `scripts/watch.mjs`: read only, reuses `moduleOptions`
- `src/bin/picket.mts`: import `cli/main.mts`, set `exitCode`
- `src/bin/dispatch.mjs` to `src/lib/cli/legacy.mjs`: `git mv`, export `LEGACY_VERBS`, `legacyMain`
- `src/lib/cli/main.mts`, `src/lib/cli/registry.mts`, `src/lib/verbs.mts`, `src/lib/shared/verb-spec.mts`: new
- `src/lib/cli-args.mjs` to `src/lib/util/args.mts`: convert, getters, `UsageError`
- `src/lib/action.mts`, `context.mts`, `work-files.mts`, `io.mts`, `process.mts`: `git mv` per D-005
- `src/lib/leave.mjs` to `src/lib/verbs/leave/index.mts`; `src/lib/shared/work/left.mts`: new
- `src/lib/git.mts`: import names `.mts`
- `src/lib/close.mjs`: `readLeft(root, id)` from `shared/work/left.mjs`
- `src/lib/hooks/guard.bash.mjs`: `parseArgs` from `../util/args.mjs`
- `test/kernel/leave.test.mjs`, `test/kernel/args.test.mjs`: new
- `test/kernel/action.test.mjs`, `context.test.mjs`, `io.test.mjs`, `process.test.mjs`, `work-files.test.mjs`, `paths.test.mjs`: new paths
- `test/kernel/cli.test.mjs`, `test/kernel/close.test.mjs`: leave refusals exit 2
- `test/kernel/conventions.test.mjs`: exempt paths, `cli/`, the X-11 scan
- `test/type-rules/mistakes.mts`: imports from the new `.mts` paths
- `test/build.test.mjs`: no `.mts` import in `dist/`, no inlined module
- `test/hooks/handlers.test.mjs:415-427`: verb list from `VERB_NAMES` and `LEGACY_VERBS`
- `CONTRIBUTING.md:43-51`, `README.md:34-35`: new paths

**Changes:**
- Build first (D-006): `tsconfig.json`, then `moduleOptions` with `bundle: true`, `packages: "external"` and `runtime-extension`. Then the five `git mv` moves and every relative import in `src/**/*.mts` renamed to name its source (`./context.mts`); `UsageError` moves to `util/args.mts` and `shared/work/files.mts` imports it there.
- `util/args.mts` per D-003. `verbs.mts` holds `leave: { summary, readOnly: false }`, plus the `Verb` and `Command` types; `registry.mts` the one loader; `verb-spec.mts` per D-003.
- `verbs/leave/index.mts` follows the draft's example (`03-kernel-cli.md`, "A verb folder"), with `readState(id, root)` imported from `../../work.mjs` until phase 2 moves it, `LeftEntry` from `shared/work/left.mts`, `render` returning `leftLine(entry)`. `shared/work/left.mts` reads `left.jsonl` with `readJsonl` and `workFile`; `close.mjs` imports `readLeft` from it, and `legacy.mjs`'s `close` case uses `leftLine`.
- `cli/main.mts` per D-001. `legacy.mjs` loses its `leave` case, `leftLine` import and the self-running `main(...).then(process.exit)`; `LEGACY_VERBS` drops `leave`.
- `conventions.test.mjs`: exempt paths become `src/lib/shared/context.mts`, `src/lib/paths.mts` and every path under `src/lib/cli/` (scan 1), `src/lib/util/process.mts` (scan 2), `src/lib/shared/work/files.mts` (scan 3); a fourth scan reports a `.mts` file naming a relative `X.mjs` where `src/` holds `X.mts`, with a self-test.
- `close.test.mjs:99,105` and the closed-item case expect exit 2 (item 02's planned change for `leave`); nothing else in the existing suites changes.

**Done when:**
- **T-1.1** The paths in this phase's `files` exist; `src/bin/dispatch.mjs`, `src/lib/leave.mjs`, `src/lib/cli-args.mjs` and the five moved `src/lib/*.mts` no longer do; `npm run typecheck` exits 0; `npm test` passes with no fewer passing tests than at `399e1c9`, plus the new ones.
- **T-1.2** `test/build.test.mjs` shows no `dist/**/*.mjs` containing `.mts"` or `.mts'`, and `dist/lib/verbs/leave/index.mjs` importing `../../util/io.mjs` with no `function appendJsonl` of its own.
- **T-1.3** `leave.test.mjs`, calling `verb.run` with a context whose `now` returns `2026-10-23T10:00:00.000Z`, shows the entry `{ ts: "2026-10-23T10:00:00.000Z", command: "git branch -D old", why: null }` appended to `left.jsonl`; a 301-character command refused with details `{ id }`; a done item refused with `{ id, status: "done" }`; and `verb.parse` throwing `UsageError` for no id, no `--command`, a blank `--command` and the id `../etc`.
- **T-1.4** `args.test.mjs` shows: `str` on bare `--session` throws `UsageError` naming `--session`; `list` on `--touched "a, b,,c"` gives `["a", "b", "c"]`; `many` on two `--hit` gives both; `seconds` on `--timeout 30` gives `30000` and on `abc` throws; `flag` on `--yes x` throws; `pairs` on `--env A=1 --env B=2` gives `{ A: "1", B: "2" }` and on `--env 1A=2` throws.
- **T-1.5** Driven: `node dist/bin/picket.mjs leave <id> --command "git branch -D old"` prints the entry as JSON and exits 0; on a done item it exits 2 and prints `{"ok":false,"error":"<id> is done; only an open or blocked item records what is left","id":"<id>","status":"done"}`; `--human` prints `left for you: git branch -D old`; `picket leave` exits 1 with `picket: ` on stderr; `picket next <id>` (legacy) prints the same JSON as before.
- **T-1.6** `picket help` starts with `usage: picket <verb> [args] [--pretty | --human]`, prints `leave`'s usage and summary, and its `verbs:` line lists `leave` and every `LEGACY_VERBS` name; `picket help leave` prints only `leave`'s usage and summary; the existing help and unknown-verb tests in `cli.test.mjs` pass unchanged.
- **T-1.7** `conventions.test.mjs` passes, its new scan's self-test reports `import { x } from "./io.mjs"` in a `.mts` beside `io.mts` and nothing for `./legacy.mjs`; `handlers.test.mjs`'s verb-set test reads `VERB_NAMES` and `LEGACY_VERBS` and passes.

## Phase 2: Shared, util and hook helpers

**Touch set:**
- `src/lib/paths.mts` to `src/lib/shared/paths.mts`; `src/lib/git.mts` split into `src/lib/util/git.mts` and `src/lib/shared/git.mts`
- `src/lib/config.mjs`, `config.schema.json`, `extensions.mjs`, `extension.schema.json`, `comments.mjs`, `silenced.mjs`, `saved-rules.mjs`, `escalation.mjs`, `repos.mjs`, `tooling.mjs`, `agent-name.mjs`, `ledger.mjs`: to `src/lib/shared/`
- `src/lib/unsafe.mjs`, `check.mjs`, `review.mjs`: to `src/lib/shared/destructive.mjs`, `checks.mjs`, `review-summary.mjs`
- `src/lib/work.mjs`, `gate.mjs`, `next.mjs`: to `src/lib/shared/work/work.mjs`, `gate.mjs`, `next-step.mjs`
- `src/lib/sources.mjs`, `source-paths.mjs`: to `src/lib/shared/sources/`; `transcript.mjs`, `turn-block.mjs`: to `src/lib/shared/transcript/`
- `src/lib/styling/` (11 files and `terminals/` with 8): to `src/lib/shared/styling/`; `font.mjs:17` path join
- `src/lib/yaml-lite.mjs`, `node-floor.mjs`, `vendor/` (4 files): to `src/lib/util/`
- `src/lib/hook.mjs`, `edit-texts.mjs`, `kernel-call.mjs`, `powershell-text.mjs`, `drive-evidence.mjs`: to `src/lib/hooks/`
- `src/lib/shared/verdicts.mjs`, `src/lib/shared/mutation.mjs`: new, extracted (D-005)
- `src/lib/route.mjs`, `cost.mjs`, `init.mjs`, `mutate.mjs`, `preflight.mjs`: lose the extracted exports
- `src/lib/admit.mjs`, `close.mjs`, `drive.mjs`, `migrate.mjs`, `packet.mjs`, `pr.mjs`, `statusline.mjs`, `verify.mjs`: imports repointed
- the 14 handlers in `src/lib/hooks/` and the 14 shells in `src/hooks/` (listed in `files`): imports repointed
- `src/lib/cli/main.mts`, `src/lib/cli/legacy.mjs`, `src/lib/shared/work/files.mts`, `src/lib/verbs/leave/index.mts`, `src/bin/picket.mts`: imports repointed
- `src/skills/documenting/scripts/filename.mjs`, `src/skills/reviewing/scripts/lint.craft.mjs`: imports repointed
- `CONTRIBUTING.md:12,35,43-51`, `README.md:36,52`, `src/hooks/README.md:22,24`, `docs/design/README.md:18`, `docs/design/picketai-design-system/project/README.md:5`, `.claude/rules/harness-authoring.md:14`: new paths
- the test files listed in this phase's `files`: import paths and path strings
- `test/kernel/kernel-sources.mjs`: read only, skips `vendor` by folder name

**Changes:**
- Pure moves and extractions, no behaviour change. Order follows C-003: `util/` first (`yaml-lite`, `node-floor`, `vendor/`, the `git` split), then `shared/`, then the hook helpers, then the extractions; build and test after each group.
- `util/git.mts` holds `gitRead`, `gitRun` and their option types; `shared/git.mts` keeps every other export with its name and behaviour and imports the two from `util/`. A caller of `gitRead` or `gitRun` imports `util/git.mts`; a namespace import (`import * as git`) stays on `shared/git.mjs` and adds the `util/` import if it calls either.
- Extractions as D-005 lists: `VERDICTS` and `findVerdict` to `shared/verdicts.mjs` (importers `extensions`, `emit.ledger`, `guard.block`, `route.verdict`, `route.mjs`); `readLedger` beside `appendLedger` in `shared/ledger.mjs` (`cost.mjs`, `guard.bash`, `observe.drive`); `STATUS_LINE` into `shared/styling/statusline-setting.mjs`, which `init.mjs` then imports; `readMutation` to `shared/mutation.mjs` (`mutate.mjs`, `review-summary.mjs`); `check.mjs`, `drive.mjs`, `mutate.mjs`, `verify.mjs` take `detectTooling` from `shared/tooling.mjs`, and `preflight.mjs` stops re-exporting it.
- `conventions.test.mjs`: scan 1 exempts `src/lib/shared/paths.mts`; scan 2's sample path becomes `src/lib/util/git.mts`. `config.test.mjs:30-38` walks `src/lib` recursively and expects `["shared/paths.mts"]`. `handlers.test.mjs`: shells import `../lib/hooks/hook.mjs` (`:91`); the helper check (`:382-385`) names the new folders; the T-6.2 test (`:95-100`) reads only files named `<kind>.<name>.mjs`, since `hook.mjs`, which reads stdin by design, now shares the folder.
- The Markdown files name the new paths; `harness-authoring.md` points verdict tokens at `src/lib/shared/verdicts.mjs`.

**Done when:**
- **T-2.1** The top level of `src/lib` holds only `cli/`, `hooks/`, `shared/`, `util/`, `verbs/`, `verbs.mts` and the 13 modules `admit`, `close`, `cost`, `drive`, `init`, `migrate`, `mutate`, `packet`, `pr`, `preflight`, `route`, `statusline`, `verify` (`.mjs`); `npm run typecheck` exits 0; `npm test` passes with the same count of passing tests as after phase 1.
- **T-2.2** `git grep -nE "from \"\.\./[a-z-]+\.mjs\"" -- src/lib/shared src/lib/util` finds no import of one of those 13 modules, and `git grep -n "shared/" -- src/lib/util` finds nothing.
- **T-2.3** `VERDICTS` and `findVerdict` are exported only by `shared/verdicts.mjs`, `readLedger` only by `shared/ledger.mjs`, `STATUS_LINE` only by `shared/styling/statusline-setting.mjs`, `readMutation` only by `shared/mutation.mjs`, `gitRead` and `gitRun` only by `util/git.mts`; `src/lib/preflight.mjs` no longer exports `detectTooling`.
- **T-2.4** Driven: the spawn tests in `cli.test.mjs` (including `setup-terminal --dry-run --statusline-only`) and `hooks.test.mjs` pass, and `node dist/hooks/guard.bash.mjs` fed a PreToolUse event for `picket state x` answers as before; the font tests find `dist/lib/shared/styling/nerd-font.json`.
- **T-2.5** `test/markdown-paths.test.mjs` passes, and no Markdown file outside `artifacts/`, `work/` and skill examples names a `src/lib/` path that no longer exists.

## Phase 3: Verb modules into their folders, and the direction scan

**Touch set:**
- `src/lib/admit.mjs` to `src/lib/verbs/admit/admit.mjs`, and likewise `close`, `cost`, `drive`, `init`, `migrate`, `mutate`, `packet`, `preflight`, `route`, `statusline`, `verify`
- `src/lib/pr.mjs` to `src/lib/verbs/pullrequest/pr.mjs`
- `src/lib/shared/work/block.mjs`: new, block functions from `packet.mjs`, B11 fix
- `src/lib/shared/ledger.mjs`: gains `recordAccept` from `close.mjs`
- `src/lib/cli/legacy.mjs`, `src/lib/hooks/route.verdict.mjs`: imports repointed
- `test/kernel/conventions.test.mjs`: the direction scan (D-007)
- `test/kernel/admit.test.mjs`, `admit-labelled.test.mjs`, `cost.test.mjs`, `drive.test.mjs`, `git.test.mjs`, `init.test.mjs`, `migrate.test.mjs`, `mutate.test.mjs`, `packet.test.mjs`, `pr.test.mjs`, `route.test.mjs`, `statusline.test.mjs`, `verify.test.mjs`, `styling/terminal.test.mjs`, `bench/test/tasks.test.mjs`: import paths
- `test/kernel/styling/setup.test.mjs` [INFERRED]: imports `dist/lib/init.mjs`, repoint if still needed
- `test/hooks/handlers.test.mjs:408`, `test/kernel/extensions.test.mjs:121-125`: path strings
- `CONTRIBUTING.md:11-12`: the layout bullets

**Changes:**
- `git mv` each module; repoint every importer. Afterwards no verb module imports another verb's folder.
- `shared/work/block.mjs` takes `blockPath`, `saveBlock`, `readBlock`, `blockFiles`, `parseBlock` and their constants; `packet.mjs`, `close.mjs`, `route.mjs` and `route.verdict.mjs` import them there. B11: `PATH_TOKEN` also accepts a dot-file name with or without folders (`.gitattributes`, `src/.npmrc`) and still rejects a token with no dot (`phase`, `1`).
- `recordAccept` moves next to `appendLedger`; `close.mjs` and `route.mjs` import it from `shared/ledger.mjs`.
- `conventions.test.mjs` gains `importViolations(path, text): string[]`, a pure function applying D-007's rules to one file's static, dynamic and re-export imports, run over every `.mjs` and `.mts` under `src/lib` and `src/skills/*/scripts`, with a self-test per rule.
- `CONTRIBUTING.md` Layout: a kernel module goes in `src/lib/` under `cli/`, `hooks/`, `verbs/<verb>/`, `shared/` or `util/` by C-014, which the scan enforces.

**Done when:**
- **T-3.1** The top level of `src/lib` holds only `cli/`, `hooks/`, `shared/`, `util/`, `verbs/` and `verbs.mts`; each moved module is at its D-005 path; `npm run typecheck` exits 0; `npm test` passes, plus the new tests.
- **T-3.2** The direction scan passes on `src/`; its self-test reports `shared/a.mjs` importing `../verbs/route/route.mjs`, `util/a.mts` importing `../shared/paths.mts`, `verbs/a/index.mts` importing `../b/index.mts`, `verbs.mts` importing anything, `shared/a.mjs` importing `../cli/main.mts`, a multi-line import and a dynamic `import("../verbs/x/index.mts")` in `shared/`, and nothing for `hooks/route.verdict.mjs` importing `../verbs/route/route.mjs`.
- **T-3.3** `packet.test.mjs` shows `blockFiles` returning `.gitattributes`, `src/.npmrc` and `src/a.mjs` for the block line `Files: .gitattributes, src/.npmrc, src/a.mjs (phase 1)` and neither `phase` nor `1`; a `route.test.mjs` approval whose block lists `.gitattributes` commits it.
- **T-3.4** `recordAccept` is exported only by `shared/ledger.mjs`, the five block functions only by `shared/work/block.mjs`, and `verbs/packet/packet.mjs` has no `PATH_TOKEN`.
- **T-3.5** Driven: the `close` and `route` spawn tests in `close.test.mjs` and `route.test.mjs`, and `route.verdict` in `hooks.test.mjs`, pass unchanged.

## Phase 4: Read-only verbs

**Touch set:**
- `src/lib/verbs/state/index.mts`, `list/index.mts`, `next/index.mts`, `cost/index.mts`, `admit/index.mts`, `preflight/index.mts`, `verify/index.mts`, `packet/index.mts`: new
- `src/lib/verbs.mts`, `src/lib/cli/registry.mts`: eight entries, `readOnly: true`
- `src/lib/cli/legacy.mjs`: their cases, imports and names go
- `src/lib/shared/work/work.mjs`, `shared/work/next-step.mjs`, `verbs/cost/cost.mjs`, `verbs/admit/admit.mjs`, `verbs/preflight/preflight.mjs`, `verbs/verify/verify.mjs`, `verbs/packet/packet.mjs`: read only, the helpers called
- `test/kernel/verb-parse.test.mjs`: new, `parse` of each converted verb
- `test/kernel/cost.test.mjs`: the `--session` cases
- `test/kernel/cli.test.mjs`, `admit.test.mjs`, `preflight.test.mjs`, `packet.test.mjs`, `next.test.mjs`, `verify.test.mjs`: read, pass unchanged

**Changes:** one adapter per verb (D-004); line numbers are `src/lib/cli/legacy.mjs`'s, unchanged from `dispatch.mjs`.

| Verb | `parse` gives | Action | Outcome | `render` |
|---|---|---|---|---|
| `state <id>` | `{ id }` | `deriveState` | done | the JSON text (today's `--human` prints JSON) |
| `list` | `{}` | rows of `:162-166` | done | `:166` |
| `next <id>` or `next --latest [--session s]` | `{ id }` or `{ latest, session }` | `next` or `latest(root, { session })`, the session from the flag only, as today | done | `:225`, `:229` |
| `cost [--session s] [--work id]` | `{ session, workId }` | `cost({ root, session, work_id })` | done | `:264` |
| `admit --text t` or `--request <file or ->` `[--touched a,b]` | `{ text, file, touched }`; `-` read by `args.stdin()` | a file read with `readText`; empty text gives `:132`'s value; else `admit(text, { root, touched })` | done | `:132`, `:136` |
| `preflight <id>` | `{ id }` | `preflight(id, root, ctx.home)` | failed when not `ok` | `:235` |
| `verify <id> <n> [--no-tests]` | `{ id, phase, runTests }` | `verify(id, n, { root, runTests })` | failed when not `ok` | `:241` |
| `packet <id> [--width n]` | `{ id, width }` | `packet(id, root, { width })` | done, `output: "text"` | `value.text` |

Ids go through `workId`. A bare `--text` is now a usage error (D-003), where today it gave `lane: null`; no test covers it.

**Done when:**
- **T-4.1** The eight verbs have `index.mts`, `VERB_NAMES` entries with `readOnly: true` and loaders; `legacy.mjs` has no case for them and `LEGACY_VERBS` lacks them; `npm run typecheck` exits 0; `npm test` passes with every existing assertion on these verbs unchanged.
- **T-4.2** `picket cost --session` exits 1 with `--session` on stderr; `picket cost --session s-1` over a ledger with turn rows of `s-1` and `s-2` counts only the `s-1` rows.
- **T-4.3** Driven: `picket packet <id>` prints the packet text and `--json` prints JSON whose `text` equals it; `picket admit --request - --human` with the request on stdin prints `lane: <lane>`; `picket verify <id> 1 --no-tests` on a phase with a missing file exits 2 with `"ok":false`.
- **T-4.4** `verb-parse.test.mjs` shows `next` with neither an id nor `--latest`, `verify <id> x` and `packet <id> --width abc` each throwing `UsageError`.
- **T-4.5** `picket help` prints the eight usage lines with their summaries, and `picket help next` prints only `next`'s.

## Phase 5: Work item writers

**Touch set:**
- `src/lib/verbs/set/index.mts`, `close/index.mts`, `comment/index.mts`, `waive/index.mts`, `route/index.mts`, `migrate/index.mts`, `init/index.mts`: new
- `src/lib/verbs.mts`, `src/lib/cli/registry.mts`: seven entries; `comment` and `waive` with `leadOnly: true`
- `src/lib/cli/legacy.mjs`: their cases, imports and names go
- `src/lib/shared/work/work.mjs`, `shared/git.mts`, `verbs/close/close.mjs`, `verbs/route/route.mjs`, `verbs/migrate/migrate.mjs`, `verbs/init/init.mjs`: read only
- `test/kernel/verb-parse.test.mjs`: the seven parsers
- `test/kernel/close.test.mjs:316`: the refusal's human line
- `test/kernel/init.test.mjs:130`, `test/kernel/cli.test.mjs`: read, JSON `error` keeps its key

**Changes:**

| Verb | `parse` gives | Action | Outcome | `render` |
|---|---|---|---|---|
| `set <id> k=v...` | `{ id, assignments }`; a token without `=` is a `UsageError` | settable fields, `run_through` as a number, dropping `blocked_reason` unless blocked, `dirtyPaths` when done (`:174-189`); an unknown field is refused | done | `:188` |
| `close <id> [--message m] [--touched a,b]` | `{ id, message, touched }` | `close(id, root, ...)`; as today every error it throws is refused with `{ id }` and its `next` when present (04a narrows this) | done | `:197-205` |
| `comment <id> --path p --text t` | blank text: `UsageError` | `readState`, `appendComment` | done | `:294` |
| `waive <id> --path p` with `--text t` or `--deleted` | not exactly one: `UsageError` | `appendWaiver` | done | `:308` |
| `route <id> --verdict V --agent a [--phase n] [--scope s] [--through n] [--reason r] [--session s]` | numbers through `int` | `route({ ..., session: session ?? ctx.session, root })` | done | `:247` |
| `migrate [--dry-run]` | `{ dryRun }` | `migrate(root, { dryRun })` | done | `renderMigrate` |
| `init [--root dir] [--no-install]` | `{ root: str(args, "root") ?? null, install }` | `initRoot`, `InitRefused` refused with `{ root: null }`, then `init(at, { install })` | failed when a step failed | `renderInit` |

`init` reads `--root` itself because `initRoot` tells a given root from a found one.

**Done when:**
- **T-5.1** The seven verbs are converted, registered and gone from `legacy.mjs`; `VERB_NAMES.comment` and `VERB_NAMES.waive` carry `leadOnly: true`; `npm run typecheck` exits 0; `npm test` passes, with `close.test.mjs:316` now expecting `refused: next is review_cumulative, not close` and no other assertion changed.
- **T-5.2** Driven: `picket close <id>` on an item with a phase left exits 2 and prints `{"ok":false,"error":"next is ...","id":"<id>","next":{...}}`; `picket init` in a home folder exits 2 with `"ok":false` and `"root":null`.
- **T-5.3** `picket set <id> colour=red` exits 2 with `field colour is not settable`; `picket set <id> status` exits 1 naming the bad assignment; `picket set <id> status=done` with an uncommitted file prints it under `dirty`.
- **T-5.4** `verb-parse.test.mjs` shows `waive` with both `--text` and `--deleted` throwing, `route --phase x` throwing, and `route` without `--agent` throwing a `UsageError` naming `--agent`.
- **T-5.5** `picket route <id> --verdict APPROVED --agent user` with no `--session` records `CLAUDE_CODE_SESSION_ID`'s value, as today.

## Phase 6: Runners, status line and sources

**Touch set:**
- `src/lib/verbs/drive/index.mts`, `check/index.mts`, `mutate/index.mts`, `statusline/index.mts`: new
- `src/lib/verbs/source/find.mts`, `grep.mts`, `pick.mts`, `add.mts`: new, one per subverb (D-002)
- `src/lib/verbs/statusline/statusline.mjs`: `recordSessionCost` finds the root from the input
- `src/lib/verbs.mts`, `src/lib/cli/registry.mts`, `src/lib/cli/legacy.mjs`: entries in, cases out
- `src/lib/verbs/drive/drive.mjs`, `shared/checks.mjs`, `verbs/mutate/mutate.mjs`, `shared/sources/sources.mjs`, `shared/config.mjs`: read only
- `test/kernel/verb-parse.test.mjs`; `test/kernel/sources.test.mjs`, `drive.test.mjs`, `statusline.test.mjs`, `cli.test.mjs`: read, pass

**Changes:**

| Verb | `parse` gives | Action | Outcome | `render` |
|---|---|---|---|---|
| `drive` | `env: pairs("env")`, `run`, `start`, `port`, `wait`, `work`, `phase` by `str`, `hits: many("hit")`, `timeoutMs: seconds("timeout")`, `keepChanges: flag` | `drive({ root, ... })` with today's value types | failed when not `ok` | `renderDrive` |
| `check [--steps a,b] [--only c] [--timeout s]` | `list`, `str`, `seconds` | `check(...)`, `steps` undefined when the list is empty | failed when not `ok` | `renderCheck` |
| `mutate <id>` | `{ id }` | `mutate(id, { root })` | failed on `outcome: "error"` | `renderMutation` |
| `statusline` | the stdin JSON through `args.stdin()`, `{}` when invalid | `:320-325` with `ctx.now()`, `ctx.env.COLUMNS`, `ctx.home` | done, `output: "text"` | the line |
| `source find <name> <s>`, `source grep <name> <re> [--path p]` | `{ name, query, path }` | source by name from `loadConfig`; unreachable refused with `{ source }`; `find` or `grep` | done | `:400` |
| `source pick <id> <ref> <label>` | | `pick` plus `next` | done | `:371` |
| `source add <id> <ref>` | | `readState`, `addRef`; `LookupError` refused with `{ ref }` | done | `:381` |

`index.mts` files call no `projectRoot(` (scan 1), so `recordSessionCost(input)` resolves the root from `input.workspace` inside `statusline.mjs`. A plain `Error` (an unknown source name) stays a crash with exit 1, as today. A bare `--run` or `--only` is now a usage error.

**Done when:**
- **T-6.1** The four verbs and four `source` subverbs are converted and registered, `VERB_NAMES.source` lists `find` and `grep` as `readOnly: true` and `pick` and `add` as false; `LEGACY_VERBS` holds only `new`, `review-summary`, `find-verdict`, `extension`, `extensions`, `setup-terminal`, `uninstall` and `pr`; `npm test` passes with no assertion changed.
- **T-6.2** Driven: `echo '{}' | picket statusline` prints one line and exits 0; `picket statusline --json` prints JSON; `picket drive --run "node -e 0" --env 1A=2` exits 1 naming `--env`.
- **T-6.3** `picket source add <id> missing.md` exits 2 with `"ok":false` and `"ref"`; `picket source find analysis x` with the source unset exits 2 as today.
- **T-6.4** `verb-parse.test.mjs` shows `drive --timeout abc`, `check --timeout 1.5` and `source grep analysis` (no regex) throwing `UsageError`.

## Phase 7: Renames for the harness: `open`, `summary`, `extension`

**Touch set:**
- `src/lib/verbs/open/index.mts`, `src/lib/verbs/summary/index.mts`, `src/lib/verbs/extension/add.mts`, `src/lib/verbs/extension/list.mts`: new
- `src/lib/verbs.mts`, `src/lib/cli/registry.mts`: four entries
- `src/lib/cli/main.mts`: `RENAMED` (D-008)
- `src/lib/cli/legacy.mjs`: `new`, `review-summary`, `find-verdict`, `extension`, `extensions` go
- `src/lib/hooks/guard.bash.mjs:420-423`: the lists by hand
- `src/lib/hooks/guard.scope.mjs:63`: the deny message names `picket open`
- `src/skills/designing/steps/10-design.md:4`, `src/skills/expediting/SKILL.md:27`, `src/skills/ordering/steps/10-order.md:6`, `src/skills/researching/steps/10-outline.md:4`: `picket open`
- `src/skills/ordering/steps/40-review.md:7`: `picket summary <id>`
- `docs/how-to.md:260,263`: `picket extension add`
- `test/kernel/cli.test.mjs`, `work.test.mjs`, `sources.test.mjs`, `extensions.test.mjs`, `names.test.mjs:12`, `test/hooks/handlers.test.mjs:554`, `test/kernel/verb-parse.test.mjs`: new names

**Changes:**
- `open`: `parse` needs `--lane` and `--title`, takes `--id`, `--text` or `--request <file or ->` (an empty request is a `UsageError`, as today), `--ticket` and `--story` together or neither, `--source`, `--session`. The action reads the request and story files, calls `createWork` with `session ?? ctx.session`, refuses `IntakeError` with `{ failures }`, adds `dir` and `next`, and returns the no-source warning of `:153-157` in `warnings`. `render` is `:158`.
- `summary <id> [--base ref]` or `summary --range a..b` (`:250-262`); `--range` not matching `^(.+?)\.\.\.?(.+)$` is a `UsageError`. `readOnly: true`.
- `extension add <name>`: the name check (`must match`) moves into `parse` as a `UsageError`; the rest of `scaffoldExtension`'s errors stay exit 1. `extension list`: `describeExtensions(loadExtensions(root))`, `renderExtensions`, `readOnly: true`.
- `find-verdict` goes with no successor; `RENAMED` answers it with `picket: "find-verdict" was removed`.
- Guard lists: `KERNEL_READ_VERBS` swaps `review-summary` for `summary` and drops `extensions` and `find-verdict`; `KERNEL_OTHER_VERBS` swaps `new` for `open`; `KERNEL_READ_SUBVERBS` gains `extension: ["list"]`. Each renamed verb keeps its class, so the guard decides nothing new (`security: false`).

**Done when:**
- **T-7.1** `picket open --lane fast --title "Probe"` creates the item as `new` did; `picket new ...` exits 1 with `picket: "new" is now "open"`, and `picket review-summary x` with `"review-summary" is now "summary"`; `npm test` passes with the renamed calls.
- **T-7.2** `picket summary <id> --base HEAD` and `--range HEAD~1..HEAD` print what `review-summary` printed (the `cli.test.mjs` and `sources.test.mjs` cases pass on the new name); `picket summary --range nope` exits 1.
- **T-7.3** `picket extension add local` writes the manifest; `picket extension add Local` exits 1 with `must match`; `picket extension list --human` lists enabled, refused and unlisted extensions.
- **T-7.4** `guardBash` treats `picket summary x` and `picket extension list` as read-only, as it treated `review-summary` and `extensions`, and leaves `picket open --lane fast --title x` to the allow rule, as it did `new`; `handlers.test.mjs`'s verb-set test passes.
- **T-7.5** `git grep -nE "picket (new|review-summary|extensions|find-verdict)\b|extension new" -- src docs README.md CONTRIBUTING.md ':!src/lib/cli/main.mts'` finds nothing.

## Phase 8: Renames for users: `style` and `pullrequest`; the fallback goes

**Touch set:**
- `src/lib/verbs/style/apply.mts`, `remove.mts`, `src/lib/verbs/pullrequest/prepare.mts`, `post.mts`: new
- `src/lib/verbs.mts`, `src/lib/cli/registry.mts`: four entries, `readOnly: false`
- `src/lib/cli/main.mts`: `RENAMED` gains `setup-terminal`, `uninstall`, `pr`; the fallback goes
- `src/lib/cli/legacy.mjs`: deleted
- `src/lib/hooks/guard.bash.mjs:421`: `style`, `pullrequest` replace `setup-terminal`, `uninstall`, `pr`
- `src/lib/shared/styling/terminals/gnome-terminal.mjs:79`, `windows-terminal.mjs:156`: messages name `picket style apply`
- `src/lib/shared/styling/setup.mjs`, `uninstall.mjs`, `host.mjs`, `src/lib/verbs/pullrequest/pr.mjs`: read only
- `src/skills/reviewing/SKILL.md:106,109`, `src/rules/untrusted.md:9`: `pullrequest prepare` and `post`
- `README.md:36-37,69`, `docs/how-to.md:267-285,321-324,376-377`, `docs/design/picketai-design-system/project/README.md:77`: `style apply`, `style remove`
- `docs/setup-terminal-checklist.md` to `docs/style-checklist.md`: `git mv`, commands renamed
- `test/kernel/cli.test.mjs:232-288`, `names.test.mjs:12`, `test/hooks/handlers.test.mjs`, `test/kernel/verb-parse.test.mjs`: new names

**Changes:**
- `style apply [--only a,b] [--dry-run] [--yes]`: `parse` checks `--only` names against `COMPONENTS` (`UsageError` naming the unknown one and the choices); the action calls `setupTerminal(realHost(), { only, dryRun, yes })`. `style remove --all [--dry-run] [--yes]` calls it with `revert: true`; `style remove [--yes]` calls `uninstall(realHost(), { yes })`; `--dry-run` without `--all` is a `UsageError` until 07b adds it. Both `output: "text"`, `renderReport`, failed when a change failed.
- `pullrequest prepare <url> [--repo path]` calls `preparePullRequest`; `pullrequest post <url> --file f [--dry-run]` reads the file with `readText` (missing: refused), then `postReview`. Renderers are `:352` and `:356-361`. The PAT handling is 04d's (P-3).
- With nothing left in it, `legacy.mjs` goes; `main` has no fallback, the `verbs:` line lists `VERB_NAMES` only, and `handlers.test.mjs` reads only `VERB_NAMES`.

**Done when:**
- **T-8.1** `src/lib/cli/legacy.mjs` and `docs/setup-terminal-checklist.md` no longer exist; every verb runs through `REGISTRY`; `npm run typecheck` exits 0; `npm test` passes.
- **T-8.2** Driven with a temp home: `picket style apply --dry-run --only statusline` prints the plan and writes nothing; `picket style apply --only bogus` exits 1 naming `bogus`; `picket style remove --yes` on a manifest with a stuck font item exits 2 with `failed` and `font` (`cli.test.mjs`'s uninstall case on the new name).
- **T-8.3** `picket pullrequest post <url> --file missing.md` exits 2 with `"ok":false`; `picket pr x` exits 1 naming `pullrequest`; `picket setup-terminal` exits 1 naming `style apply`.
- **T-8.4** `guardBash` leaves `picket style apply` and `picket pullrequest prepare <url>` to the allow rule, as it did `setup-terminal` and `pr`.
- **T-8.5** `git grep -nE "setup-terminal|picket uninstall|picket pr\b" -- src docs README.md CONTRIBUTING.md ':!src/lib/cli/main.mts'` finds nothing, and `test/markdown-paths.test.mjs` passes.

## Phase 9: Checks and measurement

**Touch set:**
- `test/kernel/conventions.test.mjs`: scan 4
- `test/kernel/registry.test.mjs`: new, imports `dist/lib/verbs.mjs` and `dist/lib/cli/registry.mjs`
- `test/hooks/handlers.test.mjs`: guard lists against `VERB_NAMES`
- `src/lib/verbs.mts`, `src/lib/cli/registry.mts`, `src/lib/cli/main.mts`, `src/lib/hooks/guard.bash.mjs:420-423`: read only

**Changes:**
- Scan 4: every `VERB_NAMES` key and subverb key matches `^[a-z]+$`, with a self-test that `review-summary` and `setupTerminal` fail.
- `registry.test.mjs`: the keys of `REGISTRY` equal the commands listed from `VERB_NAMES` (a verb, or `group sub` per subverb); each loader resolves to a `verb` whose `usage` starts with its command, whose `output` is `"json"` or `"text"`, and whose entry has a non-empty `summary`; `dist/lib/cli/main.mjs` and `registry.mjs` hold no static import of `verbs/`.
- `handlers.test.mjs`: `KERNEL_READ_VERBS` equals the plain verbs with `readOnly: true`, `KERNEL_OTHER_VERBS` the rest plus every group, `KERNEL_READ_SUBVERBS` the subverbs with `readOnly: true`, `LEAD_ONLY_VERBS` those with `leadOnly`.
- Measure as the draft did (`03-kernel-cli.md`, "Evidence"): 40 interleaved runs each of `node dist/bin/picket.mjs next --latest` and `echo {} | node dist/bin/picket.mjs statusline`, at `399e1c9` (built in a temporary worktree) and at this phase, medians in the block.

**Done when:**
- **T-9.1** `conventions.test.mjs`, `registry.test.mjs` and `handlers.test.mjs` pass on trunk, and each new check fails on its self-test sample.
- **T-9.2** Removing one loader from `REGISTRY` makes `npm run typecheck` fail (shown once in the block, then restored).
- **T-9.3** The block reports both medians before and after; each is lower after.
- **T-9.4** `npm test` passes with no fewer passing tests than after phase 8, plus the new ones.

## Open questions

None. Each premise the phases rest on was read in the source on 2026-10-23: the plugin's inlining of `.mjs` imports (probe), the guard's three sets, `font.mjs`'s path join, the handler test that `hook.mjs` would break, the refusal assertions, and `close`'s catch-all.

## Revision log
