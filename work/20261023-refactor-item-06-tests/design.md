---
kind: design
lane: design
title: Tests beside code, parallel, in CI
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/06-tests.md, artifacts/refactor/00-conventions.md, artifacts/refactor/07a-mods.md, work/20261022-refactor-item-01-layout-and-build/design.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, work/20261023-refactor-item-05-hooks/design.md, package.json, tsconfig.json, scripts/build.mjs, scripts/watch.mjs, scripts/test.mjs, .github/workflows/release.yml, test (every file listed, imports and spawns of each), bench/test, test/kernel/kernel-sources.mjs, test/kernel/conventions.test.mjs, test/kernel/leave.test.mjs, test/kernel/names.test.mjs, test/kernel/work-fixture.mjs, test/hooks/hook-context.mjs, src/lib/shared/context.mts, CONTRIBUTING.md, README.md, src/lib/hooks/README.md, Node 24.22.1 probe importing every src/lib module from a scratch copy, esbuild 0.28.2 probe building .mjs entries, parallel timing of today's suite, claude plugin test on status, session and markdown (Claude Code 2.1.308)]
phases:
  - n: 1
    files: [src/lib/shared/config.mjs, src/lib/shared/extensions.mjs, src/lib/shared/mutation.mjs, src/lib/shared/saved-rules.mjs, src/lib/shared/styling/font.mjs, src/lib/shared/styling/statusline-setting.mjs, src/lib/shared/styling/terminal.mjs, src/lib/shared/styling/theme.mjs, src/lib/verbs/init/init.mjs, src/lib/verbs/migrate/migrate.mjs, src/lib/verbs/packet/packet.mjs, src/skills/documenting/scripts/filename.mjs, scripts/build.mjs, scripts/test.mjs, package.json, tsconfig.json, test/support/project.mts, test/support/context.mts, src/lib/verbs/leave/index.test.mts, test/timing/budgets.test.mjs, test/repo/support.test.mjs, test/build.test.mjs, test/kernel/conventions.test.mjs, CONTRIBUTING.md, src/lib/hooks/README.md]
    greps:
      - path: package.json
        pattern: '"#test/\*": "\./test/support/\*"'
      - path: package.json
        pattern: '"test": "npm run typecheck && node scripts/test\.mjs"'
      - path: package.json
        pattern: '"test:unit": "node --test'
      - path: scripts/test.mjs
        pattern: 'mods: skipped, claude not on PATH'
      - path: src/lib/shared/config.mjs
        pattern: 'from "\./paths\.mts"'
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'shared/work/snapshot\.mts'
      - path: src/lib/verbs/leave/index.test.mts
        pattern: 'from "#test/project\.mts"'
      - path: test/support/project.mts
        pattern: 't\.after\('
      - path: tsconfig.json
        pattern: '"test/support"'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [test/repo/build.test.mjs, test/repo/claude-launcher.test.mjs, test/repo/markdown-paths.test.mjs, test/repo/names-picket.test.mjs, test/repo/package.test.mjs, test/repo/release.test.mjs, test/repo/conventions.test.mjs, test/repo/plugin-layout.test.mjs, test/repo/type-rules.test.mjs, test/repo/type-rules/mistakes.mts, test/repo/type-rules/tsconfig.json, test/repo/names.test.mjs, test/repo/descriptions.test.mjs, test/repo/description-cases.json, test/repo/hook-list.test.mjs, test/cli/cli.test.mjs, test/cli/close.test.mjs, test/cli/check.test.mjs, test/cli/node-floor.test.mjs, test/cli/lane-check.test.mjs, test/cli/filename.test.mjs, test/cli/lint-craft.test.mjs, test/support/kernel-sources.mts, test/support/routing.mts, test/support/cli.mts, test/kernel/config.test.mjs, test/kernel/extensions.test.mjs, test/kernel/paths.test.mjs, test/timing/budgets.test.mjs, CONTRIBUTING.md]
    greps:
      - path: test/repo/names.test.mjs
        pattern: 'VERB_NAMES'
      - path: test/repo/names.test.mjs
        pattern: '^(?![\s\S]*CLI_VERBS)'
        flags: i
      - path: test/support/cli.mts
        pattern: 'export function runCli\('
      - path: test/repo/conventions.test.mjs
        pattern: '#test/kernel-sources\.mts'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/util/args.test.mts, src/lib/util/io.test.mts, src/lib/util/process.test.mts, src/lib/util/yaml-lite.test.mts, src/lib/util/yaml-lite-corpus.test.json, src/lib/util/git.test.mts, src/lib/shared/git.test.mts, src/lib/verbs/statusline/probe.test.mts, src/lib/shared/action.test.mts, src/lib/shared/context.test.mts, src/lib/shared/destructive.test.mts, src/lib/shared/drive-log.test.mts, src/lib/shared/ledger.test.mts, src/lib/shared/security-paths.test.mts, src/lib/shared/tooling.test.mts, src/lib/shared/checks.test.mts, src/lib/shared/paths.test.mts, src/lib/shared/work/files.test.mts, src/lib/shared/work/artifact.test.mts, src/lib/shared/work/gate.test.mts, src/lib/shared/work/next-step.test.mts, src/lib/shared/work/block.test.mts, src/lib/shared/work/state.test.mts, src/lib/shared/work/next-view.test.mts, src/lib/shared/work/snapshot.test.mts, src/lib/shared/work/state-view.test.json, src/lib/shared/sources/intake.test.mts, src/lib/shared/sources/references.test.mts, src/lib/shared/sources/resolve.test.mts, src/lib/shared/transcript/tail.test.mts, src/lib/shared/shell/powershell.test.mts, test/cli/work.test.mjs, test/repo/paths.test.mjs, test/kernel/config.test.mjs, test/support/snapshot.mts, test/support/lookup.mts, test/support/project.mts]
    greps:
      - path: test/support/project.mts
        pattern: 'export function writeConfig\('
      - path: test/support/snapshot.mts
        pattern: 'export function snapshotOf\('
      - path: src/lib/shared/work/next-step.test.mts
        pattern: 'from "#test/snapshot\.mts"'
    tests: true
    drive: false
    security: false
  - n: 4
    files: [src/lib/verbs/admit/index.test.mts, src/lib/verbs/admit/lane.test.mts, src/lib/verbs/admit/signals.test.mts, src/lib/verbs/admit/admit-labelled.test.mts, src/lib/verbs/admit/admit-labelled.test.json, src/lib/verbs/cost/index.test.mts, src/lib/verbs/drive/server.test.mts, src/lib/verbs/drive/side-effects.test.mts, src/lib/verbs/mutate/index.test.mts, src/lib/verbs/mutate/mutant.test.mts, src/lib/verbs/summary/index.test.mts, src/lib/verbs/pullrequest/azdo.test.mts, src/lib/verbs/pullrequest/prepare.test.mts, src/lib/verbs/pullrequest/pull-request.test.mts, src/lib/verbs/pullrequest/remote.test.mts, src/lib/verbs/pullrequest/threads.test.mts, src/lib/verbs/preflight/checks.test.mts, src/lib/verbs/route/plan.test.mts, src/lib/verbs/verify/index.test.mts, src/lib/verbs/statusline/index.test.mts, src/lib/verbs/statusline/facts.test.mts, src/lib/verbs/statusline/layout.test.mts, src/lib/verbs/statusline/statusline-input.test.json, src/lib/verbs/statusline/statusline-transcript.test.jsonl, src/lib/verbs/source/find.test.mts, src/lib/verbs/source/grep.test.mts, src/lib/cli/registry.test.mts, test/hooks/inject.state.test.mjs, test/cli/admit.test.mjs, test/cli/cost.test.mjs, test/cli/drive.test.mjs, test/cli/mutate.test.mjs, test/cli/summary.test.mjs, test/cli/pullrequest.test.mjs, test/cli/preflight.test.mjs, test/cli/route.test.mjs, test/cli/source.test.mjs, test/cli/statusline.test.mjs, test/cli/extension.test.mjs, test/cli/init.test.mjs, test/support/git.mts, test/repo/names.test.mjs]
    greps:
      - path: test/support/git.mts
        pattern: 'export function gitRepo\('
      - path: test/repo/names.test.mjs
        pattern: '\.test\.mts'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/hooks/emit/ledger/index.test.mts, src/lib/hooks/guard/comments/index.test.mts, src/lib/hooks/guard/scope/index.test.mts, src/lib/hooks/guard/silenced/index.test.mts, src/lib/hooks/inject/extensions/index.test.mts, src/lib/hooks/inject/rules/index.test.mts, src/lib/hooks/inject/state/index.test.mts, src/lib/hooks/notify/user/index.test.mts, src/lib/hooks/observe/drive/index.test.mts, src/lib/hooks/route/verdict/index.test.mts, src/lib/hooks/guard/edit-target.test.mts, src/lib/hooks/run-hook.test.mts, test/hooks/emit.ledger.test.mjs, test/hooks/guard.block.test.mjs, test/hooks/guard.comments.test.mjs, test/hooks/guard.scope.test.mjs, test/hooks/guard.silenced.test.mjs, test/hooks/inject.extensions.test.mjs, test/hooks/inject.rules.test.mjs, test/hooks/inject.state.test.mjs, test/hooks/lint.schema.test.mjs, test/hooks/monitor.context.test.mjs, test/hooks/notify.user.test.mjs, test/hooks/observe.drive.test.mjs, test/hooks/route.verdict.test.mjs, test/support/hook.mts, test/support/context.mts, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: test/support/hook.mts
        pattern: 'export function runHookBundle\('
      - path: src/lib/hooks/inject/rules/index.test.mts
        pattern: 'from "#test/context\.mts"'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/hooks/guard/bash/index.test.mts, src/lib/hooks/guard/bash/judge.test.mts, src/lib/hooks/guard/bash/rules.test.mts, src/lib/hooks/guard/bash/kernel.test.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/lib/hooks/guard/bash/sources.test.mts, src/lib/hooks/guard/bash/escalation.test.mts, src/lib/hooks/guard/bash/powershell.test.mts, src/lib/hooks/guard/bash/bash.test.mts, test/hooks/guard.bash.test.mjs, test/support/hook.mts, CONTRIBUTING.md, src/lib/hooks/README.md]
    greps:
      - path: test/support/hook.mts
        pattern: 'export function decision\('
      - path: CONTRIBUTING.md
        pattern: 'index\.test\.mts'
    tests: true
    drive: true
    security: false
  - n: 7
    files: [.github/workflows/release.yml, test/repo/release.test.mjs, README.md, CONTRIBUTING.md]
    greps:
      - path: .github/workflows/release.yml
        pattern: 'node-version: 22\b'
      - path: .github/workflows/release.yml
        pattern: 'needs: \[test, build-on-22\]'
      - path: .github/workflows/release.yml
        pattern: 'continue-on-error: true'
      - path: .github/workflows/release.yml
        pattern: 'node scripts/test\.mjs mods'
      - path: README.md
        pattern: 'test/timing/'
    tests: true
    drive: true
    security: false
---
# Design: Tests beside code, parallel, in CI

## Problem

The user approved refactor item 06 (`artifacts/refactor/06-tests.md`, decisions T-1 to T-9, its migration and evidence) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`, C-017 for tests); this record carries them into phases and re-decides nothing except where the code read on 2026-10-23 differs from the draft, which D-001, D-006 and D-007 name. Today 96 test files sit under `test/` and import `dist/`, `scripts/test.mjs` runs them one at a time (118 to 144 s) because one cold-start test needs the machine to itself (`cd0dbea`), and the mod suites never run in `npm test` or CI (B7). Items 02 to 05 converted most modules to `.mts` but each left moving its tests to this item (item 05 Scope, Out), so T-9's "move with the conversion" now means moving them here; and `src/` cannot run without a build, because 21 imports in 12 `.mjs` files name a `.mjs` file that exists in `src/` only as `.mts` (item 03 RISK-007). Binding constraints: every phase leaves `npm test` green on trunk, and `npm test` rebuilds the `dist/` this session's hooks run from; styling and mod tests stay put for items 07b and 07a; CI cannot be run from here, so no criterion rests on a CI run.

## Decisions

### D-001 (r2): Every source import names the source file; the build compiles `.mjs` modules too
**Decision:** Infrastructural decision, carrying C-002 (r2) and T-2, and closing item 03 RISK-007. The 21 imports are renamed to `.mts`; no module converts. They are in 12 files: `src/lib/shared/config.mjs` (3), `extensions.mjs` (1), `mutation.mjs` (2), `saved-rules.mjs` (2), `styling/font.mjs`, `styling/statusline-setting.mjs`, `styling/terminal.mjs`, `styling/theme.mjs` (1 each), `src/lib/verbs/init/init.mjs` (1), `verbs/migrate/migrate.mjs` (1), `verbs/packet/packet.mjs` (6) and `src/skills/documenting/scripts/filename.mjs` (1). Today `import("./src/lib/verbs/admit/index.mts")` fails with `ERR_MODULE_NOT_FOUND` for `src/lib/shared/paths.mjs` imported from `config.mjs`. `scripts/build.mjs` then builds every `.mjs` under `src/` outside `src/lib/util/vendor/` through `moduleOptions`, beside the `.mts` modules, so the `runtime-extension` plugin writes `.mjs` back; only vendor `.mjs` and non-code files are copied. The built-name scan in `test/kernel/conventions.test.mjs` reads `.mjs` files as well as `.mts`, so a new `.mjs` naming a typed sibling `.mjs` fails. This replaces item 03 D-006's "a `.mjs` file, copied verbatim (L-2), names the built file". Probe on 2026-10-23, on a scratch copy of `src/` with the 21 renames: 161 of 161 modules under `src/lib` import directly on Node 24.22.1, and esbuild 0.28.2 with the plugin turns `config.mjs`'s `./paths.mts` into `./paths.mjs` and leaves every other import as written.
**Instead of:** a test-only resolve hook (`module.registerHooks` retrying `X.mts` when `X.mjs` is missing) passed to the unit step with `--import`: no source or build change, but `src/` would still run only through that hook, a second resolution rule beside C-002 (r2) that lives until 07b converts the last `.mjs`.
**Risks:**
- **RISK-001** esbuild reprints `.mjs` modules, so a built `.mjs` is no longer byte-equal to its source and a shebang may land under the banner. Mitigation: the build test (`test/repo/build.test.mjs` from phase 2) compares bytes only for files `isCopied` returns, and keeps its banner and shebang-first checks over every `dist/**/*.mjs`; the built skill scripts are spawned by `test/cli/filename.test.mjs` and `test/cli/lint-craft.test.mjs` (phase 2 paths).

### D-002 (r2): Where a test lives
**Decision:** Infrastructural decision, carrying T-1, T-9 and C-017. A test of one module's behaviour is `<module>.test.mts` beside it, strict under `npm run typecheck`, importing its `src/` file and `#test/*` helpers and never `dist/`. Its fixtures sit beside it named `<name>.test.<ext>` (`src/lib/verbs/admit/admit-labelled.test.json`), so one rule keeps test files out of the product: the build neither builds nor copies `*.test.*`, and the package's `!**/*.test.*` stays as a second guard. Code that only tests use lives in `test/support/`, never in `src/`. `test/` holds `cli/` (spawns of `dist/bin/picket.mjs` and the built skill scripts), `hooks/` (spawns of `dist/hooks/` bundles, one file per hook), `repo/` (checks over the repository and the build), `timing/` (cold-start budgets) and `support/`; their tests stay `.mjs`, moved with `git mv`. A test whose subject is still a `.mjs` module stays in `test/kernel/` against `dist/` until the item that converts the module moves it (T-9): `comments`, `config`, `extensions`, `init`, `migrate`, `packet`, `saved-rules`, `silenced` and `test/kernel/styling/` (07b). A file with several subjects splits: each part on a `.mts` module moves beside it, a part that spawns the CLI goes to `test/cli/`, a part on a `.mjs` module stays.
**Instead of:** converting the product and repository tests to `.mts` too: they compare spawned output and file contents, which types do not check, and it would add about 40 files of typing.
**Risks:**
- **RISK-002** Strict typing of about 45 moved unit tests is slow and invites casts. Mitigation: helpers carry the types; a `JSON.parse` result may stay `any`; assertions never change, only imports, call sites, helper use and types.
- **RISK-003** A fixture without `.test.` in its name ships in `dist/` and the package. Mitigation: the build test asserts no `dist/` path contains `.test.`, and the package test asserts it for the tarball (`test/repo/build.test.mjs` and `test/repo/package.test.mjs` from phase 2).

### D-003: One runner, five steps, timing alone
**Decision:** Infrastructural decision, carrying T-2, T-3 and T-7. `npm test` is `npm run typecheck && node scripts/test.mjs`; `test:unit` is `node --test "src/**/*.test.mts"`. `scripts/test.mjs [step ...]` runs the named steps, or all five in order, each a `node --test` at default concurrency (one process per file): `unit` (`src/**/*.test.mts`, no build), `build` (spawns `node scripts/build.mjs`, so the runner imports no dev dependency), `product` (`test/cli`, `test/hooks`, `test/repo`, `test/kernel`, `bench/test`), `timing` (`test/timing`, alone) and `mods`: for each of `MODS = ["status", "session", "markdown"]`, `claude plugin validate --strict <dir>` then `claude plugin test <dir>` when `claude --version` succeeds, otherwise the one line `mods: skipped, claude not on PATH`. Each step prints `<step>: exit <code> in <ms> ms`; the first failing step ends the run with exit 1. Item 07a only changes `MODS` to `dist/mods/<name>` (its Affects line for 06). Today's files already pass this way: 33.2 s for the parallel part and 2.8 s for the budgets alone on 2026-10-23 (16 cores), against 118 to 144 s serially.
**Instead of:** one `node --test` over every file with the timing tests skipped under load: the budget would then be measured with 15 other processes starting, which `cd0dbea` removed for cause.
**Risks:**
- **RISK-004** Files that share state fail in parallel (draft R-1). Mitigation: each file runs in its own process and every temp folder is unique through `withProject`; a flaky test is fixed in that test, never by going serial. Known environment flake, not a design problem: tests that run Git Bash (`test/skills/lane-check.test.mjs`) fail now and then on this machine with the cygwin `add_item` error; a rerun decides.
- **RISK-005** Another process rebuilding `dist/` during `product` fails the spawn tests (seen on 2026-10-23 when the timing probe overlapped a rebuild: `Cannot find module dist/bin/picket.mjs`). Mitigation: none in code; no `npm run build` or `npm run watch` runs while `npm test` does.

### D-004 (r2): Shared helpers through `#test/*`, cleanup through `t.after`
**Decision:** Infrastructural decision, carrying T-4. `package.json` gains `"imports": { "#test/*": "./test/support/*" }` and `tsconfig.json` includes `test/support`. Helpers are strict `.mts` importing only `node:` modules and `src/` files, so they run before the build and in the Node 22 job `build-on-22` (D-006); `dist/` appears in them only as a path they spawn. Every folder or repository a helper makes is removed by `t.after`, so a failing test cleans up too. A helper exists only when two test files use it, and is created in the first phase that needs it:

| Helper | Exports | Replaces |
|---|---|---|
| `project.mts` | `withProject(t, { host })`, `openItem(root, item)`, `writeArtifact(root, id, name, text)`, `writeConfig(root, config)` | `mkdtempSync` and `rmSync` per test, `test/kernel/work-fixture.mjs`, `test/kernel/config-fixture.mjs` |
| `context.mts` | `fixedContext(root, { now, env, session, home, cwd, platform })`, a full `Context` | per-test `contextAt` copies, `test/hooks/hook-context.mjs` |
| `cli.mts` | `runCli(root, args, { env, input })` giving `{ status, stdout, stderr, json }` over `dist/bin/picket.mjs` | 13 copies of `BIN` and their runners |
| `git.mts` | `gitRepo(t, { commits, branches, worktrees })` | 4 copies of `git()` and the repository builders |
| `snapshot.mts` | `snapshotOf({...})` | `test/kernel/snapshot-fixture.mjs` |
| `hook.mts` | `runHookBundle(name, event, { env })`, `decision(command, opts)` | 20 copies of `const decision =` |
| `kernel-sources.mts`, `routing.mts`, `lookup.mts` | today's exports | `test/kernel/kernel-sources.mjs`, `test/skills/routing.mjs`, `test/kernel/lookup-fixture.mjs` |

**Instead of:** relative imports of a helper folder (`../../../../test/support/project.mts`): the depth differs per folder and breaks on every move.
**Risks:**
- **RISK-006** Helpers that import `src/` create items through `src/` code while a product test checks `dist/`, so a module exists twice in one process. Mitigation: product tests reach `dist/` only by spawning, so no class crosses; a helper never returns a `src/` object to a `dist/` call.

### D-005: Lists come from the registries; hook tests split per hook
**Decision:** Infrastructural decision, carrying T-5, T-6 and C-016. `test/kernel/names.test.mjs` moves to `test/repo/names.test.mjs` and its hand list `CLI_VERBS` becomes `Object.keys(VERB_NAMES)` from `src/lib/verbs.mts`; its Markdown scans stay. A test that loops over hooks reads `HOOKS` from `src/lib/hooks.mts`. Each hook's handler tests move to `src/lib/hooks/<kind>/<name>/index.test.mts`, calling the exported handler with `fixedContext`; `guard/bash/` gets one test file per module (`index`, `judge`, `bash`, `powershell`, `rules`, `kernel`, `payloads`, `sources`, `escalation`), plus `guard/edit-target.test.mts`, `hooks/run-hook.test.mts` and `shared/shell/powershell.test.mts`. `test/hooks/` keeps only bundle spawns, one `<kind>.<name>.test.mjs` per hook through `runHookBundle`. `test/hooks/hook-list.test.mjs` moves to `test/repo/`, because it imports `scripts/build.mjs` and so needs the dev dependencies. `test/hooks/handlers.test.mjs` and `hooks.test.mjs` go.
**Instead of:** one test file per hook kind: `guard.bash` alone would stay the slowest file, which parallel runs wait on.
**Risks:**
- **RISK-007** A test is lost in the split. Mitigation: the phase block lists each `test(` name of the split files with its new file, and the passing count across steps is not below the count before the phase.

### D-006 (r2): CI tests on Node 24, checks the build on Node 22, runs the mods beside
**Decision:** Infrastructural decision, carrying T-8 and T-7, with draft R-2's fallback taken from the start. `.github/workflows/release.yml` keeps its triggers and gets four jobs. `test` (Node 24): checkout, npm 11.21.0, git identity, `npm ci`, `npm test`, upload `dist/` as artifact `dist`. `build-on-22` (needs `test`, Node 22; the draft's `floor` job, renamed so it does not clash with the glossary's Floor): checkout, git identity, download `dist`, `node --test "test/cli/**/*.test.mjs" "test/hooks/**/*.test.mjs"`, and no `npm ci`, which `devEngines` refuses on Node 22. `mods` (Node 24): checkout, `npm install -g @anthropic-ai/claude-code`, `node scripts/test.mjs mods`, with `continue-on-error: true` until OQ-001 is answered. `publish` (needs `test` and `build-on-22`): today's steps less `npm test`; `prepack` builds. Actions are pinned by commit like today's.
**Instead of:** the draft table's mods inside `test`: whether `claude plugin test` runs on a runner without sign-in is unverified, and the mods' rollout switch has refused before (2026-10-10), so it could block every publish.
**Risks:**
- **RISK-008** `build-on-22` relies on Node 22 stripping types from the `#test/*` helpers and the `src/` modules they import, on by default from Node 22.18 (the line is at 22.23.4 on npm). Mitigation: phase 7 drives `test/cli` and `test/hooks` under Node 22.23.4 (OQ-002).

### D-007: Seven phases, each leaving `npm test` green
**Decision:** Infrastructural decision, carrying the draft's migration. Draft phase 1 is phase 1 here, with D-001; draft phase 2 ("with the conversion") becomes phases 2 to 6, because the conversions are done and no later item moves these tests; draft phase 3 is phase 7. Phase 1 builds the runner and the first helpers and moves one test beside its code; phase 2 moves the product and repository tests into `test/cli/`, `test/repo/` and `test/hooks/`; phase 3 the `util/` and `shared/` unit tests; phase 4 the verb and CLI unit tests; phase 5 the hooks other than `guard.bash`; phase 6 `guard.bash`, then the old fixtures go; phase 7 CI and the docs. A moved test keeps its assertions; a phase block names any assertion it changed and why. Every phase reports the passing count summed over the steps, never below the count at base `4f6ae61` plus the new tests.
**Instead of:** the draft's three phases: its phase 2 has no item left to ride on, and as one change it would move about 70 files at once.
**Risks:**
- **RISK-009** Phases 3 to 6 edit test files that items 07a and 07b also touch. Mitigation: no phase moves `test/kernel/styling/` or a mod test.

## Scope

**In:**
- The 21 import renames and the build compiling `.mjs` (D-001); the runner, `test:unit`, `imports` and `tsconfig.json` (D-003, D-004).
- Moving every test whose subject is a `.mts` module beside it; `test/cli/`, `test/hooks/`, `test/repo/`, `test/timing/`, `test/support/` (D-002, D-005).
- The registries in place of hand lists; the per-hook split (D-005).
- The CI jobs, the mod suites in `npm test` and CI (D-006); `CONTRIBUTING.md`, `README.md` and `src/lib/hooks/README.md` lines that cite moved tests.

**Out:**
- Converting any `.mjs` module, and moving its tests (T-9): `comments`, `config`, `extensions`, `mutation`, `saved-rules`, `silenced`, `verdicts`, `init`, `migrate`, `packet`, the styling modules (07b).
- Moving the mods into `src/mods/` (07a); `bench/test/` stays where it is.
- Changing what any test asserts; adding pull request or push triggers to CI.
- `.claude/` files: the lead edits `.claude/rules/harness-authoring.md` and the agent memories a phase names.

## Phase 1: `src/` runs without a build; the runner and the first helpers

**Touch set:**
- `src/lib/shared/config.mjs`, `extensions.mjs`, `mutation.mjs`, `saved-rules.mjs`: import names to `.mts`
- `src/lib/shared/styling/font.mjs`, `statusline-setting.mjs`, `terminal.mjs`, `theme.mjs`: `../paths.mts`
- `src/lib/verbs/init/init.mjs`, `src/lib/verbs/migrate/migrate.mjs`, `src/lib/verbs/packet/packet.mjs`: import names to `.mts`
- `src/skills/documenting/scripts/filename.mjs`: `../../../lib/shared/paths.mts`
- `scripts/build.mjs`: `.mjs` built, `*.test.*` skipped
- `scripts/watch.mjs`: read only, takes `isBuiltModule` and `isCopied` from the build
- `scripts/test.mjs`: the five steps
- `package.json`: `test`, `test:unit`, `imports`; `tsconfig.json`: include `test/support`
- `test/support/project.mts`, `test/support/context.mts`: new
- `src/lib/verbs/leave/index.test.mts`: `git mv` from `test/kernel/leave.test.mjs`, then converted
- `test/timing/budgets.test.mjs`: `git mv` from `test/budgets.test.mjs`
- `test/repo/support.test.mjs`: new, cleanup after a failure
- `test/build.test.mjs`: test files and `.mts` names absent from `dist/`
- `test/kernel/conventions.test.mjs`: built-name scan over `.mjs` too
- `test/kernel/kernel-sources.mjs`: read only, `isKernelSource` already skips `.test.mts`
- `CONTRIBUTING.md`: lines 3, 11, 35 and 59; `src/lib/hooks/README.md`: line 3
- `.claude/rules/harness-authoring.md` line 12, `.claude/agent-memory/picket-architect/hook-path-couplings.md` line 10: the budgets path; the lead edits them

**Changes:**
- The renames and the build split per D-001: `isBuiltModule` is true for `.mts` (not `.d.mts`) and for `.mjs` outside `src/lib/util/vendor/`, false for any `*.test.*`; `isCopied` is false for both built modules and `*.test.*`. `outputCollisions` is unchanged.
- `scripts/test.mjs` and the `package.json` scripts per D-003; `imports` and `tsconfig.json` per D-004.
- `project.mts` exports `withProject` and `openItem` (over `createItem` and `recordBases` from `src/`); `context.mts` exports `fixedContext`. The leave test uses both and keeps its assertions.
- `test/repo/support.test.mjs` spawns `node --test` on a temp test file that calls `withProject`, prints the root and fails.
- `CONTRIBUTING.md`: the budgets path; a module's tests sit beside it as `<module>.test.mts`, with `test/` for `dist/` and repository checks; a `.mjs` module names the source file it imports, as `.mts` modules do; the Tests section names the five steps, `test:unit` and `#test/*`.

**Done when:**
- **T-1.1** The built-name scan reads `.mjs` and `.mts` under `src/lib` and `src/skills/*/scripts` and passes; its self-test reports `import { x } from "./paths.mjs"` in `src/lib/shared/a.mjs` and nothing for `./verdicts.mjs` there.
- **T-1.2** `node --test "src/**/*.test.mts"` passes before any build, and `git grep -n "dist/" -- "src/**/*.test.mts" test/support` prints nothing.
- **T-1.3** After `npm run build`, `dist/lib/shared/config.mjs` imports `./paths.mjs`, no `dist/**/*.mjs` contains `.mts"` or `.mts'`, no `dist/` path contains `.test.`, and `test/build.test.mjs` asserts all three; `test/skills/filename.test.mjs` passes unchanged against the compiled script.
- **T-1.4** In `test/repo/support.test.mjs`, the child `node --test` exits non-zero and the root it printed no longer exists.
- **T-1.5** `npm test` exits 0 in under 60 s on this machine and prints one line per step, with `timing` running only `test/timing/budgets.test.mjs`; the block gives each step's time and the passing count, not below the count at `4f6ae61` plus the new tests.
- **T-1.6** With `claude` on PATH, `node scripts/test.mjs mods` runs three validations and the three suites (52 tests on 2026-10-23) and exits 0; with a PATH lacking `claude` it prints `mods: skipped, claude not on PATH` and exits 0.
- **T-1.7** `npm run typecheck` exits 0 with `test/support/` and `src/lib/verbs/leave/index.test.mts` checked; `test/kernel/leave.test.mjs` and `test/budgets.test.mjs` do not exist; `test/markdown-paths.test.mjs` passes.

## Phase 2: Product and repository tests in their folders

**Touch set:**
- `test/repo/`: `git mv` of `test/build.test.mjs`, `claude-launcher.test.mjs`, `markdown-paths.test.mjs`, `names-picket.test.mjs`, `package.test.mjs`, `release.test.mjs`, `test/kernel/conventions.test.mjs`, `plugin-layout.test.mjs`, `type-rules.test.mjs`, `names.test.mjs`, `test/skills/descriptions.test.mjs`, `description-cases.json`, `test/hooks/hook-list.test.mjs`; `test/type-rules/` to `test/repo/type-rules/`
- `test/cli/`: `git mv` of `test/kernel/cli.test.mjs`, `close.test.mjs`, `check.test.mjs`, `node-floor.test.mjs`, `test/skills/lane-check.test.mjs`, `filename.test.mjs`, `lint-craft.test.mjs`
- `test/support/kernel-sources.mts`, `test/support/routing.mts`: `git mv` from `test/kernel/kernel-sources.mjs`, `test/skills/routing.mjs`, then typed
- `test/support/cli.mts`: new, `runCli`
- `test/kernel/config.test.mjs`, `extensions.test.mjs`, `paths.test.mjs`, `test/timing/budgets.test.mjs`: helper imports repointed
- `CONTRIBUTING.md`: lines 11, 35, 41 and 69
- `.claude/agent-memory/picket-architect/markdown-paths-facts.md`, `mts-conversion-facts.md`, `hook-path-couplings.md` (lines 11 to 14), `.claude/agent-memory/picket-developer/new-files-pass-check-then-fail.md`: moved paths; the lead edits them

**Changes:**
- Moves only, then imports: relative paths gain or lose a level, `kernel-sources` and `routing` come from `#test/...`, fixtures from `#test/project.mts`. `type-rules/mistakes.mts` and its `tsconfig.json` point one level further up to `src/`.
- `test/repo/names.test.mjs` reads `Object.keys(VERB_NAMES)` from `src/lib/verbs.mts` (D-005).
- `runCli(root, args, { env, input })` spawns `dist/bin/picket.mjs` with `cwd: root` and gives `{ status, stdout, stderr, json }`, `json` parsed when stdout parses; the moved `test/cli` files use it in place of their own `BIN` runners, and their temp folders come from `withProject`.
- `test/repo` and `test/cli` files that make temp folders take them from `withProject`.

**Done when:**
- **T-2.1** The top level of `test/` holds only the folders `cli`, `hooks`, `kernel`, `repo`, `support` and `timing`; `test/skills/` and `test/type-rules/` do not exist.
- **T-2.2** `git grep -nE "CLI_VERBS|const BIN\b|mkdtempSync" -- test/cli test/repo` prints nothing, and `test/repo/names.test.mjs` imports `VERB_NAMES`.
- **T-2.3** `git grep -nE "from \"(\.\./)+scripts/|\"esbuild\"|\"typescript\"" -- test/cli test/hooks` prints nothing, so the `build-on-22` job (D-006) can run both folders without `npm ci`.
- **T-2.4** After a build, `node --test "test/cli/**/*.test.mjs"` passes on its own.
- **T-2.5** `npm test` passes with the passing count of phase 1; `test/repo/markdown-paths.test.mjs` passes with the moved paths cited.

## Phase 3: `util/` and `shared/` unit tests beside their modules

**Touch set:**
- From `test/kernel/`, each converted to `.mts` beside its module: `args`, `io`, `process` and `yaml-lite.test.mjs` (with `yaml-lite-corpus.json` as `yaml-lite-corpus.test.json`) to `src/lib/util/`; `git.test.mjs` split into `src/lib/util/git.test.mts`, `src/lib/shared/git.test.mts` and `src/lib/verbs/statusline/probe.test.mts`
- To `src/lib/shared/`: `action`, `context`, `destructive`, `drive-log`, `ledger`, `security-paths`, `tooling` tests; `run-step.test.mjs` as `checks.test.mts`; `paths.test.mjs` unit part as `paths.test.mts`
- To `src/lib/shared/work/`: `work-files.test.mjs` as `files.test.mts`; `artifact`, `gate`, `next-step` tests; `block-heading.test.mjs` as `block.test.mts`; `current-item.test.mjs` as `state.test.mts`; `next.test.mjs` as `next-view.test.mts`; `state-view.test.mjs` as `snapshot.test.mts` with `state-view.json` as `state-view.test.json` and `state-view-items.mjs` folded into the test
- To `src/lib/shared/sources/`: `intake`, `references`, `resolve` tests; to `src/lib/shared/transcript/`: `transcript.test.mjs` as `tail.test.mts`; `test/hooks/powershell-text.test.mjs` to `src/lib/shared/shell/powershell.test.mts`
- `test/kernel/work.test.mjs`: unit parts beside `shared/work/` modules, spawn part to `test/cli/work.test.mjs`
- `test/kernel/paths.test.mjs`: the part reading `dist/` to `test/repo/paths.test.mjs`
- `test/kernel/config.test.mjs`: its `paths.mts` and `tooling.mts` parts move; the `config.mjs` part stays
- `test/support/snapshot.mts`, `test/support/lookup.mts`: from `test/kernel/snapshot-fixture.mjs` (kept until phase 4) and `test/kernel/lookup-fixture.mjs` (deleted); `test/support/project.mts`: `writeArtifact`, `writeConfig`

**Changes:**
- Each test imports its module from `src/` with a `.mts` name and its helpers from `#test/...`; temp folders come from `withProject`; contexts from `fixedContext`. Assertions are unchanged.
- A file with several subjects splits by subject (D-002); each new file names its tests as before.

**Done when:**
- **T-3.1** Every file this phase moves away from `test/kernel/` and `test/hooks/powershell-text.test.mjs` no longer exists, and every listed `src/` test exists.
- **T-3.2** `git grep -nE "mkdtempSync|dist/" -- "src/**/*.test.mts"` prints nothing.
- **T-3.3** `node scripts/test.mjs unit` passes, and `npm run typecheck` exits 0 with every moved test checked under `strict`.
- **T-3.4** The passing count across steps equals phase 2's; the block names any assertion that changed and why.
- **T-3.5** `npm test` passes in under 60 s; the block gives each step's time.

## Phase 4: Verb and CLI unit tests beside their modules

**Touch set:**
- `test/kernel/verb-parse.test.mjs`: split into each verb's `src/lib/verbs/<verb>/index.test.mts`, or `<subverb>.test.mts` for `source`, `extension`, `style` and `pullrequest`
- To `src/lib/verbs/admit/`: `admit.test.mjs` unit parts (`index`, `lane`, `signals`); `admit-labelled.test.mjs` with `admit-labelled.json` as `admit-labelled.test.mts` and `admit-labelled.test.json`
- To their verb folders: `cost` (`cost/index`), `drive` (`drive/server`), `side-effects` (`drive/side-effects`), `mutate` (`mutate/index`, `mutate/mutant`), `review` (`summary/index`), `pr` (`pullrequest/azdo`, `prepare`, `pull-request`, `remote`, `threads`), `preflight-checks` and the unit part of `preflight` (`preflight/checks`), `route-plan` (`route/plan`), `verify` (`verify/index`), `statusline` (`statusline/index`, `facts`, `layout`, `probe`, fixtures as `statusline-input.test.json` and `statusline-transcript.test.jsonl`)
- `test/kernel/sources.test.mjs`: `verbs/source/find`, `grep`, `shared/sources/places`, `protection`; its one hook spawn (`inject.state.mjs`, "SessionStart names each source with its root") to `test/hooks/inject.state.test.mjs` (new)
- `test/kernel/registry.test.mjs` to `src/lib/cli/registry.test.mts`
- Spawn parts to `test/cli/<verb>.test.mjs`: admit, cost, drive, mutate, summary, pullrequest, preflight, route, source, statusline, plus `extension` from `test/kernel/extensions.test.mjs` and `init` from `test/kernel/init.test.mjs`, whose other parts stay (D-002)
- `test/support/git.mts`: new, `gitRepo`, replacing `function git(` in `mutate`, `review` and `sources`
- `test/kernel/snapshot-fixture.mjs`: deleted once `route-plan` moves

**Changes:**
- As phase 3: `src/` imports, `#test/*` helpers, `withProject`, `fixedContext`, `runCli` in the CLI parts; assertions unchanged.
- `gitRepo(t, { commits, branches, worktrees })` builds a repository with the identity the copies set today and removes it through `t.after`.

**Done when:**
- **T-4.1** `test/kernel/` holds only `comments`, `config`, `extensions`, `init`, `migrate`, `packet`, `saved-rules` and `silenced` tests, `work-fixture.mjs`, `config-fixture.mjs` and `styling/`.
- **T-4.2** `git grep -nE "function git\(|const BIN\b" -- "src/**/*.test.mts" test/cli` prints nothing, and `git grep -n "dist/" -- "src/**/*.test.mts"` prints nothing (`test/cli` spawns `dist/` by design, D-002).
- **T-4.3** Every `VERB_NAMES` entry's folder holds at least one `*.test.mts` file, checked by a test in `test/repo/names.test.mjs` that reads `VERB_NAMES`.
- **T-4.4** `npm run typecheck` exits 0; the passing count equals phase 3's plus the T-4.3 test; the block names any changed assertion.
- **T-4.5** Driven: `node --test "test/cli/**/*.test.mjs"` passes after a build, `route`, `close` and `pullrequest` spawns included.
- **T-4.6** `npm test` passes in under 60 s; the block gives each step's time.

## Phase 5: Hook tests split per hook, `guard.bash` excepted

**Touch set:**
- From `test/hooks/handlers.test.mjs`, the handler tests of `emit.ledger`, `guard.comments`, `guard.scope`, `guard.silenced`, `inject.extensions`, `inject.rules`, `inject.state`, `notify.user`, `observe.drive` and `route.verdict` to `src/lib/hooks/<kind>/<name>/index.test.mts`; the `quotedList` and `editTarget` tests to `src/lib/hooks/guard/edit-target.test.mts`
- `test/hooks/run-hook.test.mjs` to `src/lib/hooks/run-hook.test.mts`
- From `test/hooks/hooks.test.mjs` and the spawn tests in `handlers.test.mjs`, each hook's bundle runs to `test/hooks/<kind>.<name>.test.mjs` for all 13 hooks but `guard.bash`; every one is spawned by name today (`run("<name>.mjs", ...)` in `hooks.test.mjs`)
- `test/hooks/inject.state.test.mjs` (from phase 4): gains `hooks.test.mjs`'s `inject.state` spawns, and all its spawns go through `runHookBundle`
- `test/support/hook.mts`: new, `runHookBundle`; `test/support/context.mts`: covers `hook-context.mjs`'s use
- `test/hooks/handlers.test.mjs`, `test/hooks/hooks.test.mjs`: keep only `guard.bash` tests
- `src/lib/hooks.mts`, `src/lib/hooks/hook-spec.mts`: read only

**Changes:**
- Handler tests call the hook's exported handler with `fixedContext(root, ...)`; bundle tests spawn through `runHookBundle(name, event, { env })`, which runs `node dist/hooks/<name>.mjs` with the event on stdin and gives `{ status, stdout, stderr, json }`.
- A test that walks every hook (registered paths, event lists) reads `HOOKS`.

**Done when:**
- **T-5.1** Each of the ten hooks with handler tests has `index.test.mts`; `src/lib/hooks/guard/edit-target.test.mts` and `src/lib/hooks/run-hook.test.mts` exist; `test/hooks/run-hook.test.mjs` does not; each of the 13 hooks other than `guard.bash` has `test/hooks/<kind>.<name>.test.mjs` (`guard.bash`'s comes in phase 6).
- **T-5.2** `git grep -nE "inject\.|emit\.|notify\.|observe\.|route\.verdict|guard\.(scope|comments|silenced|block)|lint\.|monitor\." -- test/hooks/handlers.test.mjs test/hooks/hooks.test.mjs` prints nothing.
- **T-5.3** `git grep -n "dist/" -- "src/lib/hooks/**/*.test.mts"` prints nothing; every `test/hooks/*.test.mjs` other than the two old files spawns only through `runHookBundle`.
- **T-5.4** The passing count equals phase 4's, and the block maps every moved test name to its new file.
- **T-5.5** `npm test` passes in under 60 s; the cold-start step passes; the block gives each step's time.

## Phase 6: `guard.bash` tests per module; the old fixtures go

**Touch set:**
- `test/hooks/handlers.test.mjs`: deleted; its `guard.bash` tests to `src/lib/hooks/guard/bash/<module>.test.mts` by the module whose behaviour each asserts: `index` (end-to-end `guardBash` decisions), `judge`, `rules`, `kernel`, `payloads`, `sources`, `escalation`, `powershell` and `bash` (heredocs, quoting, `$(...)` and segment splitting; `handlers.test.mjs` holds 43 lines on these)
- `test/hooks/hooks.test.mjs`: deleted; its `guard.bash` spawns to `test/hooks/guard.bash.test.mjs` (new)
- `test/support/hook.mts`: `decision(command, opts)`
- `test/hooks/hook-context.mjs`, `test/kernel/work-fixture.mjs`, `test/kernel/config-fixture.mjs`: deleted
- `test/kernel/packet.test.mjs`, `migrate.test.mjs`, `init.test.mjs`, `config.test.mjs`, `extensions.test.mjs` [INFERRED: whichever still import the fixtures]: repointed to `#test/project.mts`
- `CONTRIBUTING.md` line 12, `src/lib/hooks/README.md` line 26: where hook tests live
- `.claude/agent-memory/picket-architect/statusline-contract.md`, `.claude/agent-memory/picket-reviewer/probe-guards-directly.md`: cite deleted test files; the lead edits them

**Changes:**
- `decision(command, { agent, mode, cwd, env })` calls `guardBash` from `src/lib/hooks/guard/bash/index.mts` with a `fixedContext` and returns `"allow"`, `"ask"`, `"deny"` or `null`, replacing the 20 local copies.
- Assertions unchanged; a test spanning two modules goes to `index.test.mts`.

**Done when:**
- **T-6.1** `test/hooks/handlers.test.mjs`, `hooks.test.mjs`, `hook-context.mjs`, `test/kernel/work-fixture.mjs` and `config-fixture.mjs` do not exist, and `git grep -nE "work-fixture|config-fixture|hook-context" -- test src` prints nothing.
- **T-6.2** `git grep -n "const decision =" -- src test` prints nothing.
- **T-6.3** The passing count equals phase 5's; the block maps every `guard.bash` test name to its new file and gives the count per file.
- **T-6.4** `git grep -n mkdtempSync -- src test/cli test/hooks test/repo test/timing` prints nothing; temp folders there come from `test/support/`.
- **T-6.5** `npm test` exits 0 in under 60 s; the block gives each step's time and names the slowest file with its time.

## Phase 7: CI on two Node lines, the mods, and the docs

**Touch set:**
- `.github/workflows/release.yml`: the four jobs (D-006)
- `test/repo/release.test.mjs`: the job graph
- `README.md`: the `test/` layout line (58)
- `CONTRIBUTING.md`: Tests and release sections
- `actions/upload-artifact`, `actions/download-artifact` commits [INFERRED: read with `git ls-remote` on their release tags]

**Changes:**
- `release.yml` per D-006. `test` uploads `dist/` with `retention-days: 1`; `build-on-22` downloads it to `dist/` before its `node --test` line.
- `test/repo/release.test.mjs` reads the workflow text and asserts: four jobs; `build-on-22` on `node-version: 22` with no `npm ci`; `publish` needs `test` and `build-on-22`; `mods` runs `node scripts/test.mjs mods` with `continue-on-error: true`; every `uses:` pinned to a 40-character commit.
- `README.md`: the layout lists `test/cli/`, `test/hooks/`, `test/repo/`, `test/timing/` and `test/support/`, and says unit tests sit beside their code. `CONTRIBUTING.md`: CI runs `npm test` on Node 24, the built `dist/` on Node 22, and the mod suites in a job that does not block the publish.

**Done when:**
- **T-7.1** `test/repo/release.test.mjs` passes with the assertions above.
- **T-7.2** Driven: after a build, `npx -y node@22.23.4 --test "test/cli/**/*.test.mjs" "test/hooks/**/*.test.mjs"` passes; the block gives the Node version printed and the count (OQ-002).
- **T-7.3** `README.md` and `CONTRIBUTING.md` say where unit, product, repository and timing tests live and what each CI job runs; `test/repo/markdown-paths.test.mjs` passes.
- **T-7.4** `npm test` exits 0 in under 60 s with all five steps run, `mods` included.

## Open questions

- **OQ-001** Does `claude plugin test` run on a GitHub runner without sign-in, with the hooks-modules switch on? Unverified here, and running CI is the user's outward action. Owner: the user, through a `workflow_dispatch` run after phase 7. Fallback: the `mods` job keeps `continue-on-error: true` and `publish` does not need it; making it blocking is a one-line change once a run passes.
- **OQ-002** Does Node 22.23.4 strip types from the `#test/*` helpers and their `src/` imports by default? No Node 22 is installed on this machine (nvm holds 20.11.1 and 24.22.1). Owner: the developer in phase 7. Fallback: if `npx` cannot fetch it, T-7.2 becomes the `build-on-22` job of the user's dispatch run; if it fetches but does not strip, `build-on-22` runs `node --experimental-strip-types --test ...`.

## Revision log

- 2026-10-23: D-001 (r2): 12 files, not 10, hold the 21 imports; RISK-001 cites the phase 2 test paths; cross-check Minor.
- 2026-10-23: D-002 (r2): RISK-003 cites `test/repo/build.test.mjs` and `test/repo/package.test.mjs`, where phase 2 moves them; cross-check Minor.
- 2026-10-23: D-004 (r2): helpers run in the `build-on-22` job, not "the Node 22 floor"; follows the D-006 rename.
- 2026-10-23: D-006 (r2): CI job `floor` renamed `build-on-22`, clashing with the glossary's Floor; phase 7, T-2.3 and OQ-002 follow; cross-check Minor.
- 2026-10-23: D-005: text unchanged; phases 4 to 6 now list every test file it names; T-4.2 drops `test/cli` from the `dist/` grep; T-4.4 counts the T-4.3 test.
- 2026-10-23: D-005: phase 4's one hook spawn in `sources.test.mjs` is `inject.state`, so it goes to `test/hooks/inject.state.test.mjs`; `guard.bash.test.mjs` starts in phase 6.
