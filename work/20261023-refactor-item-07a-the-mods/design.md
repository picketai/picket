---
kind: design
lane: design
title: Mods listed, built, fed by kernel
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/07a-mods.md, artifacts/refactor/00-conventions.md, artifacts/refactor/07b-styling.md, artifacts/refactor/08b-docs.md, artifacts/refactor/09-hygiene.md, artifacts/refactor/04d-reading-and-reporting.md, work/20261023-refactor-item-05-hooks/design.md, work/20261023-refactor-item-06-tests/design.md, scripts/build.mjs, scripts/watch.mjs, scripts/test.mjs, package.json, tsconfig.json, .gitignore, .claude-plugin/marketplace.json, .github/scripts/release.mjs, .github/workflows/release.yml, src/lib/hooks.mts, src/lib/verbs/init/init.mjs, src/lib/shared/work/next-view.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/styling/palette.mjs, src/lib/verbs/statusline/layout.mts, src/lib/verbs/statusline/facts.mts, src/lib/verbs/statusline/index.test.mts, src/lib/verbs/statusline/layout.test.mts, status/ (every file), session/ (every file), markdown/ (every file), test/repo/build.test.mjs, test/repo/package.test.mjs, test/repo/plugin-layout.test.mjs, test/repo/release.test.mjs, test/repo/conventions.test.mjs, test/repo/markdown-paths.test.mjs, test/support/kernel-sources.mts, test/kernel/init.test.mjs, CONTRIBUTING.md]
phases:
  - n: 1
    files: [src/lib/mods.mts, scripts/build.mjs, scripts/watch.mjs, scripts/test.mjs, src/mods/status/hooks/index.tsx, src/mods/status/hooks/index.test.tsx, src/mods/session/hooks/index.tsx, src/mods/markdown/hooks/index.tsx, src/mods/status/types/index.d.ts, src/mods/session/types/index.d.ts, src/mods/markdown/types/index.d.ts, .claude-plugin/marketplace.json, package.json, tsconfig.json, src/lib/verbs/init/init.mjs, .github/scripts/release.mjs, .github/workflows/release.yml, test/repo/mods.test.mjs, test/repo/plugin-layout.test.mjs, test/repo/release.test.mjs, test/repo/package.test.mjs, test/repo/build.test.mjs, test/repo/conventions.test.mjs, CONTRIBUTING.md]
    greps:
      - path: src/lib/mods.mts
        pattern: 'export const MODS\b'
      - path: src/lib/mods.mts
        pattern: 'install: "opt-in"'
      - path: .claude-plugin/marketplace.json
        pattern: '"source": "\./dist/mods/status"'
      - path: src/lib/verbs/init/init.mjs
        pattern: 'mods\.mts'
      - path: tsconfig.json
        pattern: 'src/mods'
      - path: package.json
        pattern: '^(?![\s\S]*"status/hooks/")'
        flags: i
      - path: .github/scripts/release.mjs
        pattern: '^(?![\s\S]*status/\.claude-plugin)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/format.mts, src/lib/shared/format.test.mts, src/lib/shared/styling/palette.mts, src/lib/shared/styling/terminals/gnome-terminal.mjs, src/lib/shared/styling/terminals/konsole.mjs, src/lib/shared/styling/terminals/manual.mjs, src/lib/shared/styling/terminals/ptyxis.mjs, src/lib/shared/styling/terminals/terminal-app.mjs, src/lib/shared/styling/terminals/windows-terminal.mjs, src/lib/verbs/statusline/paint.mts, src/lib/verbs/statusline/index.test.mts, src/lib/verbs/statusline/layout.mts, src/lib/verbs/statusline/layout.test.mts, src/lib/verbs/statusline/facts.mts, scripts/build.mjs, scripts/watch.mjs, src/mods/status/hooks/band.ts, src/mods/status/hooks/band.test.ts, src/mods/status/hooks/index.tsx, src/mods/session/hooks/index.tsx, test/repo/mods.test.mjs]
    greps:
      - path: src/lib/shared/format.mts
        pattern: 'export function compactTokens\b'
      - path: src/lib/shared/format.test.mts
        pattern: '"9\.5k"'
      - path: src/lib/verbs/statusline/layout.mts
        pattern: 'shared/format\.mts'
      - path: src/lib/verbs/statusline/layout.mts
        pattern: '^(?![\s\S]*function (compactTokens|untilReset)\b)'
        flags: i
      - path: src/lib/shared/styling/palette.mts
        pattern: 'export const BRAND\b'
      - path: scripts/build.mjs
        pattern: 'rewriteModImports'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/views.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/next-view.mts, src/mods/shared/kernel.ts, src/mods/shared/kernel.test.ts, src/mods/status/hooks/index.tsx, src/mods/status/hooks/band.ts, src/mods/status/types/index.d.ts, src/mods/markdown/hooks/picket-markdown.test.tsx, src/mods/session/hooks/index.tsx, src/mods/session/hooks/index.test.tsx, src/mods/markdown/hooks/index.tsx, src/mods/markdown/hooks/index.test.tsx, scripts/build.mjs, test/repo/mod-contracts.test.mjs, test/repo/mod-contracts/tsconfig.json, test/repo/mod-contracts/check.mts, test/repo/mod-contracts/claude-code.d.ts]
    greps:
      - path: src/lib/shared/views.mts
        pattern: 'export type StateView\b'
      - path: test/repo/mod-contracts/check.mts
        pattern: 'LatestView'
      - path: src/lib/shared/work/snapshot.mts
        pattern: 'views\.mts'
      - path: src/lib/shared/work/next-view.mts
        pattern: 'views\.mts'
      - path: src/mods/shared/kernel.ts
        pattern: 'export (async function|function|const) runPicket\b'
      - path: src/mods/session/hooks/index.test.tsx
        pattern: 'phase_count'
      - path: src/mods/status/types/index.d.ts
        pattern: '^(?![\s\S]*\bimport\b)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/mods/session/hooks/index.tsx, src/mods/session/hooks/view.tsx, src/mods/session/hooks/actions.ts, src/mods/session/hooks/data.ts, src/mods/session/hooks/sprite.ts, src/mods/session/hooks/data.test.ts, src/mods/session/hooks/sprite.test.ts, src/mods/session/hooks/sessions.ts, src/mods/session/hooks/index.test.tsx]
    greps:
      - path: src/mods/session/hooks/index.tsx
        pattern: '^(?![\s\S]*\batom\()'
        flags: i
      - path: src/mods/session/hooks/data.ts
        pattern: '\batom\('
      - path: src/mods/session/hooks/view.tsx
        pattern: 'renderPane'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/mods/markdown/hooks/index.tsx, src/mods/markdown/hooks/view.tsx, src/mods/markdown/hooks/actions.ts, src/mods/markdown/hooks/data.ts, src/mods/markdown/hooks/links.ts, src/mods/markdown/hooks/markdown.ts, src/mods/markdown/hooks/tree.ts, src/mods/markdown/hooks/picket-markdown.test.tsx, src/mods/markdown/hooks/index.test.tsx]
    greps:
      - path: src/mods/markdown/hooks/index.tsx
        pattern: '^(?![\s\S]*\batom\()'
        flags: i
      - path: src/mods/markdown/hooks/data.ts
        pattern: '\batom\('
      - path: src/mods/markdown/hooks/view.tsx
        pattern: 'renderPane'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/mods/shared/theme.ts, src/mods/status/hooks/band.ts, src/mods/status/hooks/index.tsx, src/mods/markdown/hooks/view.tsx, src/mods/session/hooks/view.tsx, src/mods/session/hooks/data.ts, src/mods/session/hooks/sprite.ts, src/mods/session/hooks/sprite.test.ts, src/mods/session/hooks/index.test.tsx]
    greps:
      - path: src/mods/shared/theme.ts
        pattern: 'ROLE_TONES'
      - path: src/mods/session/hooks/sprite.ts
        pattern: 'BRAND'
      - path: src/mods/session/hooks/view.tsx
        pattern: '^(?![\s\S]*#[0-9a-f]{6})'
        flags: i
    tests: true
    drive: true
    security: false
---
# Design: Mods listed, built, fed by kernel

## Problem

The three mods (`status`, `session`, `markdown`) are Claude Code plugins that the engine copies alone into its cache, so none can import from another or from the kernel; hand copies of `roleOf`, `prettyModel`, `compactTokens`, the phase count and the time formats have drifted, and facts about each mod sit in six hand-kept places (`artifacts/refactor/07a-mods.md#Today`). Item 07a, approved by the user on 2026-10-22, gives them the verbs' and hooks' structure: an import-free list, one folder per mod, generated manifests, shared code kept once and copied in at build time, Picket data read through the kernel, and `register` split into wiring over a view, actions and data (M-1 to M-9). Binding: `artifacts/refactor/00-conventions.md` (C-001, C-016 to C-018), item 06's runner and CI (`work/20261023-refactor-item-06-tests/design.md` D-003, D-006), the mod manifest's `types` must name a `.d.ts` file, and each phase leaves `npm test` green.

## Decisions

### D-001: The list, and the plugin files it generates
**Decision:** Infrastructural decision, carrying M-2. `src/lib/mods.mts` imports nothing and exports `MOD_INSTALLS = ["default", "opt-in"] as const`, `ModInstall`, `ModEntry = { plugin: string; summary: string; description: string; install: ModInstall }`, `MODS` (`as const`, keys `status`, `markdown`, `session` in that order, each key the folder name) and `ModName`. `summary` is one line for the generated reference of item 08b; `description` is today's manifest text. `scripts/build.mjs` writes, per mod, `dist/mods/<name>/.claude-plugin/plugin.json` (`name` from `plugin`, `version` from `package.json`, `description`, `author: { name }` from `package.json` `author`, `types: "./types/index.d.ts"`) and `dist/mods/<name>/hooks/hooks.json` (`{ "modules": ["./index.tsx"] }`). It rewrites the mod entries of the tracked `.claude-plugin/marketplace.json` (keeping every other key and the `picket` entry first; mod entries `{ name, source: "./dist/mods/<name>", description }` in `MODS` order) and writes the file only when its text changes. `picket init` installs the entries with `install: "default"`, in `MODS` order, instead of its own `MOD_PLUGINS`. `sync-version` stamps `src/.claude-plugin/plugin.json` only.
**Instead of:** hand-kept manifests guarded by a consistency test: every new mod would still touch six files, and the user asked for the verbs' and hooks' structure (M-2).
**Risks:**
- **RISK-001** The build now writes one tracked file outside `dist/`, so a build can leave the tree dirty. Mitigation: the output is deterministic (two-space JSON, LF, trailing newline), is written only on change, and `test/repo/mods.test.mjs` asserts the committed file equals what the build would write.
- **RISK-002** Marketplace sources move from `./status` to `./dist/mods/status` (draft R-4). Mitigation: plugin names stay; an installed mod updates with the package as the core did in item 01; `test/kernel/init.test.mjs` keeps its install expectations.

### D-002: One folder per mod, built into `dist/mods/`, in mod style
**Decision:** Infrastructural decision, carrying M-3 and M-9. Each mod is `src/mods/<name>/hooks/` (entry `index.tsx` exporting `register`) plus `types/index.d.ts`; no `plugin.json` or `hooks.json` lives in `src/`. The kernel walk of the build ignores `src/mods/` (`isCopied` and `isBuiltModule` are false there); a `buildMods()` step copies each mod's `hooks/` and `types/`, tests included, into `dist/mods/<name>/`, because `claude plugin test` runs the built folder and the user installs the built folder. `package.json` `files` keeps `!**/*.test.*` last, so the tarball holds no mod test. Mods keep Claude Code's style: TSX run by the engine on Bun, single quotes, extensionless relative imports; C-002's `.mts` rule stops at `src/mods/`. The root `tsconfig.json` excludes `src/mods` (TSX and the `claude-code` module belong to the engine). `scripts/watch.mjs` reruns `buildMods()` on any change under `src/mods/`, to `src/lib/mods.mts`, or to a file D-003 copies. `scripts/test.mjs` takes its mod folders from `MODS` as `dist/mods/<name>`. The CI `mods` job runs `npm ci` and `node scripts/test.mjs build mods` on Node 24, still `continue-on-error` (item 06 OQ-001).
**Instead of:** testing `src/mods/<name>` in place: it has no manifest (D-001 generates it), and whether `claude plugin test` follows imports out of the plugin folder is unverified. A CI job that downloads the `dist` artifact instead of building also lost: `actions/upload-artifact` leaves hidden folders such as `.claude-plugin/` out unless told, which would hand the job folders without manifests.
**Risks:**
- **RISK-003** `dist/` now holds test files. Mitigation: only under `dist/mods/`; `test/repo/build.test.mjs` keeps its no-test rule for the rest of `dist/`, and `test/repo/package.test.mjs` already fails on any `.test.` path in the tarball.
- **RISK-004** `npm run typecheck` no longer reads mod code, and no mod tsconfig is tracked (item 09 moves those ignore lines). Mitigation: `claude plugin test` runs every mod test on Bun in `npm test` where `claude` is on PATH; the kernel side of D-004's shared types stays type-checked.

### D-003: Shared code exists once, copied in with two rewrites
**Decision:** Infrastructural decision, carrying M-4. Kernel and mods share `src/lib/shared/format.mts`, `src/lib/shared/views.mts` and `src/lib/shared/styling/palette.mts`; each imports nothing. `buildMods()` copies them into every mod at `shared/<path below src/lib/shared>` with `.mts` renamed `.ts` (so `shared/format.ts`, `shared/views.ts`, `shared/styling/palette.ts`; the draft drew palette flat, the kept subpath needs no rename table). Mods-only code lives in `src/mods/shared/` (`kernel.ts`, `theme.ts` and their tests), copied into every mod's `shared/`; these files import nothing relative. While copying a mod's files, the build rewrites exactly two specifier forms, in either quote style, and nothing else:

| In `src/mods/<name>/hooks/` or `types/` | Resolves in `src/` to | In `dist/mods/<name>/` |
|---|---|---|
| `'../../shared/<p>'` | `src/mods/shared/<p>.ts` | `'../shared/<p>'` |
| `'../../../lib/shared/<p>.mts'` | `src/lib/shared/<p>.mts` | `'../shared/<p>'` |

`test/repo/mods.test.mjs` reads `dist/mods/**` and fails on any specifier that is not `claude-code`, `claude-code/testing`, or a relative path resolving to an existing file inside the same mod folder (tried as written, then with `.ts`, `.tsx`, `.d.ts`, then `/index.*`).
**Instead of:** bundling each mod with esbuild: the engine compiles mod TSX itself and `claude plugin test` needs sources and tests as files, so a bundle changes what the engine loads and loses the test layout.
**Risks:**
- **RISK-005** The rewrite is a text change in TSX the engine compiles (draft R-1). Mitigation: two fixed forms, the leak test, and `claude plugin test` on the built folders.
- **RISK-006** A copied kernel file gains an import later. Mitigation: the leak test fails in every mod on the unresolved path.

### D-004 (r2): The kernel's JSON shapes are one import-free type file
**Decision:** Carrying M-4 and M-5. `src/lib/shared/views.mts` declares the published read model of the work item aggregate: `PhaseView`, `VerdictView`, `StateView`, `NextView`, `LatestView`, with JSON-level types (`string` where the kernel has a branded `WorkId` or a closed word list). The aggregate itself (`WorkState`, `WorkSnapshot`) stays kernel-internal. `src/lib/shared/work/snapshot.mts` and `next-view.mts` declare their exported view types as the wire type intersected with the narrow kernel fields (`WorkId`, `Lane`, `Status`, `NextAction`), so renaming, removing or retyping a wire field fails `npm run typecheck`. Mod code under `hooks/` imports the wire types from `'../../../lib/shared/views.mts'`. A mod's `types/index.d.ts` cannot: `claude plugin validate --strict` rejects any import there ("the contract must be self-contained") and requires the file itself to declare the mod's `PluginState`. So `status`'s `types/index.d.ts` keeps its own `Work` type, and `test/repo/mod-contracts.test.mjs` holds it to `views.mts`: it runs `tsc` on a fixture that, beside a stub ambient `claude-code` module, imports `Work` from the contract and `LatestView` from `views.mts`, and fails unless every key of `Work` is a key of the non-empty `LatestView` branch and that branch's `Pick` over those keys is assignable to `Work`. The one-copy rule holds for the contract by test, not by import.
**Instead of:** moving the kernel's own types into `views.mts`: they carry brands and closed lists owned elsewhere (C-009), and the file must import nothing to be copied.
**Risks:**
- **RISK-007** A field the kernel adds without adding it to `views.mts` escapes the check. Mitigation: a mod cannot read a field it has no type for; the reviewer checks additions to `stateView` and `latest`.
- **RISK-014** `status`'s contract is a second hand-written copy of part of `LatestView`. Mitigation: the contract test fails on a renamed, removed or retyped field; a planted copy proves it fails.

### D-005 (r3): Mods read Picket data only through the kernel
**Decision:** Infrastructural decision, carrying M-5. `src/mods/shared/kernel.ts` exports, as an async function declaration (the validator follows `$` only into a function declaration), `runPicket<T>($: EngineInterface, args: readonly string[], options?: { timeoutMs?: number }): Promise<T | null>`: it tries `['picket']`, then `['cmd', '/c', 'picket']`, keeps the first launcher that starts for later calls, and returns `null` when none starts, the exit code is not 0, or stdout is not JSON. `status` keeps its busy flag and `--session` argument around it. `session` reads `phase_count` from `picket state <id>` (0 becomes `null`, today's unmeasured card). `markdown` builds its `DocWork` from `picket state <id>` (`phases_approved`, the count of phases with `done`, `phase_count`). No mod works out Picket data itself: a work item's state, phase markers and artifact fields (lane, status, phase count) come only from the kernel. `markdown` still reads and displays a work item's documents as text, as it does any markdown file, and may stat a work file or count the entries of `phases/` for the signature below. `markdown`'s 2-second poll asks the kernel again only when a signature changes: the modification times of `state.yaml` and of the lane artifact, and the number of entries in `phases/`. `countPhases`, `phaseCount`, `field` and `markerCount` go.
**Instead of:** asking the kernel on every poll tick: one process every 2 seconds while a work item file is open, against the draft's R-2 promise of calls only on change.
**Risks:**
- **RISK-008** A process per refresh (draft R-2). Mitigation: the signature above for `markdown`; `session` asks only on `agent.spawn` and `SendMessage`.
- **RISK-009** `picket` is not on the engine's PATH. Mitigation: `null` hides the phase count and work line, as `status` behaves today.

### D-006 (r2): `register` becomes wiring
**Decision:** Infrastructural decision, carrying M-6. `session/hooks/`: `index.tsx` (event subscriptions, the command, opening the pane; at most 170 lines), `view.tsx` (the pane render), `actions.ts` (switch, rename, delete, archive, tabs, groups, compact), `data.ts` (atoms, sessions and transcripts, agent rows, merge, grouping, progress), `sprite.ts`, `sessions.ts`. `markdown/hooks/`: `index.tsx`, `view.tsx` (pane and linked reply), `actions.ts` (show, back, refresh, copy, ask, editor, scroll), `data.ts` (atoms, load, work status, remembered files), `tree.ts`, `links.ts`, `markdown.ts`. Atoms live in `data.ts`, not in `index.tsx` as the draft drew, because view and actions read them and `index.tsx` imports both: atoms there would make an import cycle. Imports run `index.tsx` to `view.tsx` to `actions.ts` to `data.ts`; nothing imports `index.tsx`. Each split keeps behaviour: the `index.test.tsx` written in phase 3 passes unchanged.
**Instead of:** one module per event handler: more files, with the shared closures turned into parameters; `status/hooks/register.tsx` is the shape the user approved.
**Risks:**
- **RISK-010** Module-level mutable state (`limits` and `titles` in session, `lastView` in markdown) gains a second reader. Mitigation: each stays in `data.ts` with one writer; the index tests cover scroll clamping.

### D-007: Theme tokens for the UI, brand colours for the sprite
**Decision:** Infrastructural decision, carrying M-7. `src/mods/shared/theme.ts` holds every UI colour as a Claude Code theme token: `TONES` (accent, muted, rule, warning, error, success, link, code, control) and `SURFACES` (pane, code, row), merged from the two `palette.ts` files, plus `ROLE_TONES` for the four roles. `session`'s GitHub-dark hex values map onto them. The sprite takes its body colours from `BRAND` and its role stripe from `ANSI` in `palette.mts`, so no hex literal remains under `src/mods/`.
**Instead of:** keeping `session`'s fixed hex values: they ignore the user's theme, which the draft accepts changing (R-3).
**Risks:**
- **RISK-011** The theme may lack a token per role. Mitigation: OQ-001 with a fallback onto tokens the mods already use.
- **RISK-012** `session` looks slightly different on themes other than GitHub dark. Mitigation: accepted by the draft (R-3).

### D-008: One format per value, used by the kernel and the mods
**Decision:** Infrastructural decision, carrying M-8 and the time formats of `artifacts/refactor/07a-mods.md#Today`. `src/lib/shared/format.mts` exports `roleOf`, `prettyModel`, `compactTokens`, `elapsed`, `minutes`, `clock`, once. `compactTokens`: below 1000 the number (`950`); below 10k one decimal (`1.0k`, `9.5k`); below a million whole k (`10k` from 9 960, `46k`, `200k`, `999k`); from there one decimal M (`1.0M` from 999 600, `1.5M`). `elapsed` (seconds shown): `45s`, `3m05s`, `1h02m`. `minutes` (no seconds, days from 24 h): `12m`, `1h05m`, `3d06h`. `clock` (stopwatch): `0:16`, `1:02:05`. The status line takes `compactTokens`, `prettyModel` and `minutes` (in place of `untilReset`) from it.
**Instead of:** one single duration format: the band's seconds for running agents and the session stopwatch would both change look; the drift the draft names is copies and unpadded variants, which this removes.
**Risks:**
- **RISK-013** The status line's text changes (`200.0k` to `200k`, `3d6h` to `3d06h`, `1h5m` to `1h05m`), and fixed-width layout tests with it. Mitigation: the user chose `200k` on 2026-10-22; the statusline tests are updated in the same phase.

## Scope

**In:**
- `src/lib/mods.mts`, `src/mods/` (three mods and `shared/`), the mod parts of `scripts/build.mjs`, `scripts/watch.mjs`, `scripts/test.mjs`, the marketplace, `picket init`'s mod list, `sync-version`, the CI `mods` job.
- `src/lib/shared/format.mts`, `views.mts`, `styling/palette.mts`, and the kernel modules that take them (status line, snapshot, next view).
- The `register` splits, the kernel bridge, theme tokens and brand colours.

**Out:**
- Terminal styling and `picket uninstall` (07b); `docs/reference/mods.md` (08b, which reads `summary`); the mods' `tsconfig.json` ignore lines (09).
- Renaming a plugin; making the CI `mods` job blocking (item 06 OQ-001).

## Phase 1: The list, the move and the generated plugin files

**Touch set:**
- `src/lib/mods.mts`: new, the list (D-001)
- `src/lib/hooks.mts`: the pattern to mirror
- `scripts/build.mjs`: `buildMods()`, manifests, marketplace
- `scripts/watch.mjs`: rerun `buildMods()` on mod changes
- `scripts/test.mjs`: mod folders from `MODS`
- `status/`, `session/`, `markdown/`: `git mv` to `src/mods/<name>/`
- `src/lib/verbs/init/init.mjs`: install list from `MODS`
- `.claude-plugin/marketplace.json`: generated mod entries
- `package.json`: `files`, `version`, `test:<mod>` scripts
- `tsconfig.json`: exclude `src/mods`
- `.github/scripts/release.mjs`, `.github/workflows/release.yml`: one manifest; `mods` job builds
- `test/repo/mods.test.mjs`: new, marketplace and leak checks
- `test/repo/plugin-layout.test.mjs`, `test/repo/package.test.mjs`, `test/repo/release.test.mjs`, `test/repo/build.test.mjs`, `test/repo/conventions.test.mjs`: repoint
- `test/kernel/init.test.mjs`: must pass unchanged
- `CONTRIBUTING.md`: the release paragraph names four manifests [line 85]

**Changes:**
- `src/lib/mods.mts` as D-001 describes; `conventions.test.mjs` adds `mods.mts` to the import-free zones and lets verb folders import it.
- `git mv` every tracked file of `status/`, `session/` and `markdown/` under `src/mods/<name>/`, keeping `hooks/` and `types/`; `register.tsx` becomes `hooks/index.tsx`, `status/hooks/register.test.tsx` becomes `hooks/index.test.tsx`; the three `.claude-plugin/plugin.json` and `hooks/hooks.json` files are deleted (the block lists them so the route commits the deletions). No other edit to mod code in this phase.
- `scripts/build.mjs`: `isCopied` and `isBuiltModule` are false under `src/mods/`; new exports `modManifest(name, pkg)`, `marketplaceJson(current, pkg)`, `buildMods()`; `buildAll()` calls `buildMods()` after the kernel build. `buildMods()` copies `hooks/` and `types/` with tests, writes `plugin.json` and `hooks.json`, and updates the marketplace file (D-001, D-002).
- `scripts/watch.mjs`: a change under `src/mods/` or to `src/lib/mods.mts` reruns `buildMods()`.
- `scripts/test.mjs`: `MODS` comes from `src/lib/mods.mts`, each folder `dist/mods/<name>`.
- `init.mjs`: `MOD_PLUGINS` derives from `MODS` (`install === "default"`, ids `<plugin>@picketai`).
- `package.json`: `files` is `dist/`, `.claude-plugin/marketplace.json`, `LICENSE`, `README.md`, `!**/*.test.*`; `version` stages `src/.claude-plugin/plugin.json` only; `test:<mod>` run `claude plugin validate --strict dist/mods/<mod> && claude plugin test dist/mods/<mod>`.
- `tsconfig.json`: `"exclude": ["src/mods"]`.
- `release.mjs`: `PLUGIN_MANIFESTS` is `src/.claude-plugin/plugin.json`. `release.yml` `mods` job: setup Node 24, `npm ci`, install Claude Code, `node scripts/test.mjs build mods`, `continue-on-error: true` kept.
- Tests: the marketplace test expects `./dist/mods/<name>`; the package test ships `dist/mods/<name>/.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/index.tsx` and no `.test.` path; the release test covers one manifest and the new `mods` steps; the build test's no-test rule skips `dist/mods/`. `test/repo/mods.test.mjs` asserts the generated files, the committed marketplace equals `marketplaceJson`, and D-003's leak rule, with a planted case the scanner flags.
- `CONTRIBUTING.md:85`: the release paragraph says `sync-version` stamps the core manifest and the build stamps the mods.

**Done when:**
- **T-1.1** After `npm run build`, each of `dist/mods/status`, `dist/mods/markdown`, `dist/mods/session` holds `.claude-plugin/plugin.json` with the `MODS` plugin name and description, the `package.json` version, an `author` and `types: "./types/index.d.ts"`; `hooks/hooks.json` equal to `{ "modules": ["./index.tsx"] }`; and `hooks/index.tsx` exporting `register`.
- **T-1.2** `git ls-files status session markdown` prints nothing, and no `plugin.json` or `hooks.json` exists under `src/mods/`.
- **T-1.3** `.claude-plugin/marketplace.json` lists `picket` from `./dist`, then `picket-status`, `picket-markdown`, `picket-session` from `./dist/mods/<name>`; a second `npm run build` leaves it byte for byte unchanged.
- **T-1.4** `test/kernel/init.test.mjs` passes with its expectations unchanged: `picket init` installs `picket`, `picket-status`, `picket-markdown`, and never `picket-session`.
- **T-1.5** `sync-version` rewrites only `src/.claude-plugin/plugin.json`; `npm pack --dry-run` lists the three `dist/mods/<name>/.claude-plugin/plugin.json` and no path containing `.test.`.
- **T-1.6** Driven: `node scripts/test.mjs build mods` validates the three built folders with `--strict` and runs their suites with as many passing tests as before the move (52 on 2026-10-23), exit 0 (OQ-002).
- **T-1.7** `npm test` exits 0, `npm run typecheck` included, with `test/repo/mods.test.mjs` passing and its planted leaking import reported.

## Phase 2: One format, one palette, copied in

**Touch set:**
- `src/lib/shared/format.mts`, `src/lib/shared/format.test.mts`: new (D-008)
- `src/lib/shared/styling/palette.mjs`: `git mv` to `palette.mts`, typed
- `src/lib/shared/styling/terminals/gnome-terminal.mjs`, `konsole.mjs`, `manual.mjs`, `ptyxis.mjs`, `terminal-app.mjs`, `windows-terminal.mjs`: import `../palette.mts`
- `src/lib/verbs/statusline/paint.mts`, `src/lib/verbs/statusline/index.test.mts`: palette import, expected text
- `src/lib/verbs/statusline/layout.mts`, `src/lib/verbs/statusline/layout.test.mts`: `compactTokens`, `untilReset` go
- `src/lib/verbs/statusline/facts.mts`: `prettyModel` goes
- `scripts/build.mjs`, `scripts/watch.mjs`: shared copies and the two rewrites (D-003)
- `src/mods/status/hooks/format.ts`, `format.test.ts`: removed; `stepText` and its tests move
- `src/mods/status/hooks/band.ts`, `band.test.ts`, `index.tsx`: shared imports
- `src/mods/session/hooks/format.ts`, `format.test.ts`, `index.tsx`: shared imports
- `test/repo/mods.test.mjs`: shared copies present

**Changes:**
- `format.mts` imports nothing and exports `roleOf`, `prettyModel`, `compactTokens`, `elapsed`, `minutes`, `clock` with the values of D-008. `format.test.mts` (node:test) holds the value tables, including the cases moved from `layout.test.mts` and from `status/hooks/format.test.ts` (`elapsed`, `minutes`) and `session/hooks/format.test.ts` (`clock`, `compactTokens`, `prettyModel`, `roleOf`).
- `palette.mts` keeps `BRAND`, `ANSI`, `TERMINAL`, and types `rgb(hex: string): [number, number, number]`; every importer names `palette.mts`.
- The status line imports `compactTokens` and `prettyModel` from `shared/format.mts` and prints reset times with `minutes`; `untilReset` goes; `cacheLeft` keeps its rounded-up countdown (a cache 30 seconds from expiry must not read `0m`). The statusline tests take the new texts (`200k`, `3d06h`).
- `scripts/build.mjs` exports `MOD_LIB_SHARED` (`src/lib/shared/format.mts` and `src/lib/shared/styling/palette.mts` now; phase 3 adds `views.mts`), `modSharedTarget(path)` and `rewriteModImports(text)`. `buildMods()` copies `MOD_LIB_SHARED` and, when present, every file of `src/mods/shared/` into each mod's `shared/`, and applies `rewriteModImports` to every `.ts`, `.tsx` and `.d.ts` it copies. `watch.mjs` reruns `buildMods()` when a `MOD_LIB_SHARED` file or `src/mods/shared/` changes.
- `status`: `stepText` moves into `band.ts` (with its tests into `band.test.ts`); `format.ts` and `format.test.ts` go; `band.ts` and `index.tsx` import `elapsed`, `minutes`, `roleOf` from `'../../../lib/shared/format.mts'`.
- `session`: `format.ts` keeps its other helpers and imports `roleOf`, `prettyModel`, `compactTokens`, `clock` from the same path; its own copies and their tests go.

**Done when:**
- **T-2.1** `format.test.mts` passes with `compactTokens` giving `950`, `1.0k`, `9.5k`, `10k` (9 960), `46k`, `200k`, `999k`, `1.0M` (999 600), `1.5M`; `elapsed` giving `45s`, `3m05s`, `1h02m`; `minutes` giving `12m`, `1h05m`, `3d06h`; `clock` giving `0:16`, `1:02:05`.
- **T-2.2** `git grep -nE "(const|function) (roleOf|prettyModel|compactTokens|elapsed|minutes|clock|untilReset)\b" -- src ':(exclude)src/lib/hooks'` lists only `src/lib/shared/format.mts` (the `roleOf(event)` in `src/lib/hooks/inject/extensions/index.mts` is an unrelated function present at base).
- **T-2.3** After `npm run build`, every `dist/mods/<name>/shared/` holds `format.ts` and `styling/palette.ts`, and no file under `dist/mods/` contains `lib/shared/` or an `.mts'` specifier.
- **T-2.4** `src/lib/shared/styling/palette.mjs`, `src/mods/status/hooks/format.ts` and `src/mods/status/hooks/format.test.ts` no longer exist (the block lists them), and no file under `src/` names `palette.mjs`.
- **T-2.5** Driven: `picket statusline` fed a status line input with a 200 000-token window prints `200k`, and its reset field reads in the `minutes` format.
- **T-2.6** `layout.test.mts` shows `cacheLeft` for a warm cache 30 seconds from expiry still reading `1m`, never `0m`.
- **T-2.7** Driven: `node scripts/test.mjs build mods` exits 0 (OQ-002); `npm test` exits 0.

## Phase 3: Mods ask the kernel

**Touch set:**
- `src/lib/shared/views.mts`: new wire types (D-004)
- `src/lib/shared/work/snapshot.mts`, `src/lib/shared/work/next-view.mts`: view types extend the wire types
- `src/mods/shared/kernel.ts`, `src/mods/shared/kernel.test.ts`: new, `runPicket` (D-005)
- `src/mods/status/hooks/index.tsx`, `src/mods/status/hooks/band.ts`: `runPicket`
- `src/mods/status/types/index.d.ts`: keeps a self-contained `Work` (D-004 r2)
- `test/repo/mod-contracts.test.mjs`, `test/repo/mod-contracts/tsconfig.json`, `test/repo/mod-contracts/check.mts`, `test/repo/mod-contracts/claude-code.d.ts`: new, the contract check
- `test/repo/type-rules.test.mjs`, `test/repo/type-rules/tsconfig.json`: the pattern to follow
- `src/mods/session/hooks/index.tsx`, `src/mods/session/hooks/format.ts`, `src/mods/session/hooks/format.test.ts`: `phasesOf` through the kernel; `countPhases` goes
- `src/mods/session/hooks/index.test.tsx`: new, the register test (M-6)
- `src/mods/markdown/hooks/index.tsx`, `src/mods/markdown/hooks/work.ts`, `src/mods/markdown/hooks/picket-markdown.test.tsx`: work status through the kernel
- `src/mods/markdown/hooks/index.test.tsx`: new, the register test
- `src/mods/status/hooks/index.test.tsx`: the model for both tests

**Changes:**
- `views.mts` as D-004, added to `MOD_LIB_SHARED` in `scripts/build.mjs`; `snapshot.mts` and `next-view.mts` intersect their exported `StateView`, `PhaseView`, `NextView`, `LatestView` with it. `picket state` and `picket next` print the same bytes as before (the golden test in `snapshot.test.mts` stays unchanged).
- `kernel.ts` exports `runPicket` as D-005; its tests mock `process.run` for a launcher that fails to start, a non-zero exit, bad JSON and a good answer.
- `status`: `runLatest` and `parseWork` become a `runPicket<Work>` call; `types/index.d.ts` keeps `Work` with no import, and the contract test of D-004 (r2) checks it against `LatestView`. `test/repo/mod-contracts/tsconfig.json` extends the root config and includes only `check.mts` and `claude-code.d.ts`; the test also runs `tsc` on a temporary copy whose `Work` renames `phase_count`, and on one that retypes it to `string`, and expects both to fail.
- `session`: `phasesOf` asks `picket state <id>`; `countPhases` and its tests go; `parseWork` stays (it reads the prompt, not a work file). `index.test.tsx` covers: the pane opens on start; `/picket-session` closes and reopens it; an agent spawned with `work: <id>` and `phase: 2` shows `2/3` when the mocked `picket state` answers `phase_count: 3`, and no phase fraction when it exits 2; a lead `SendMessage` to a live agent carrying `work: <id>` asks `picket state <id>` once and updates that agent's phase count, while a message with no `work:` line asks nothing; archiving a session moves it to the archived tab.
- `markdown`: `workOf` asks `picket state <id>` behind the signature of D-005; `field`, `phaseCount`, `markerCount` and their tests go; `workId` and `statusLine` stay. `index.test.tsx` covers: `/md work/<id>/design.md` shows `work <id> · design · open · phase 1/3 approved`; an unchanged signature runs no second `picket state`; a changed `state.yaml` time runs one.

**Done when:**
- **T-3.1** `git grep -nE "countPhases|phaseCount|markerCount|field\(" -- src/mods` prints nothing; under `src/mods/`, no `$.fs.read` takes a `state.yaml` path or reads an artifact to count its phases, and `phases/` is only listed for its entry count. `markdown` reading a work item document to display it is allowed.
- **T-3.2** `views.mts` imports nothing; renaming `phase_count` in it makes `npm run typecheck` fail in `snapshot.mts` (the block shows the error, then the revert).
- **T-3.3** `src/mods/shared/kernel.test.ts` passes in each built mod: a failed `picket` start falls back to `cmd /c picket` and keeps it; a non-zero exit and bad JSON give `null`.
- **T-3.4** `src/mods/session/hooks/index.test.tsx` and `src/mods/markdown/hooks/index.test.tsx` pass with the cases listed under Changes.
- **T-3.5** In `src/mods/session/hooks/index.test.tsx`, `picket state` runs on `agent.spawn` and on a lead `SendMessage` with a `work:` line, and on no other event (RISK-008).
- **T-3.6** `src/mods/status/types/index.d.ts` holds no import and declares `picket-status` `now`, `work` and `agents`; `test/repo/mod-contracts.test.mjs` passes against it, and its two planted copies (`phase_count` renamed, `phase_count` as `string`) fail `tsc`.
- **T-3.7** Driven: `node scripts/test.mjs build mods` exits 0 with more passing tests than after phase 2 (OQ-002); `npm test` exits 0.

## Phase 4: session's `register` becomes wiring

**Touch set:**
- `src/mods/session/hooks/index.tsx`: wiring only (D-006)
- `src/mods/session/hooks/view.tsx`, `actions.ts`, `data.ts`, `sprite.ts`: new
- `src/mods/session/hooks/format.ts`, `format.test.ts`: removed; helpers and tests move
- `src/mods/session/hooks/data.test.ts`, `sprite.test.ts`: new, the moved tests
- `src/mods/session/hooks/sessions.ts`: stays
- `src/mods/session/hooks/index.test.tsx`: unchanged, the safety net
- `src/mods/session/types/index.d.ts`: types the new modules share

**Changes:**
- `data.ts`: the atoms (`session`, `view`, `sessions`), `readView`, `updateView`, `limits`, `titles`, config folder and live sessions, transcript titles, `refreshSessions`, `blankRow`, `merge`, `patch`, `phasesOf`, `workChange`, and from `format.ts` the grouping, tally, progress, ordering, `isFinished`, `contextPercent`, `parseWork`.
- `actions.ts`: `toggleArchived`, `deleteSession`, `switchTo`, `rename`, `appendName`, and the view changes the buttons make (tab, confirm, rename, group, compact, scroll).
- `view.tsx`: `renderPane($, e)` returning the pane; `layout` and the card, row and tab parts; it calls `actions.ts` and reads `data.ts`.
- `sprite.ts`: `sprite`, `toBase64`, `isBlinking`, `SPRITE_COLUMNS`, `SPRITE_ROWS`, `roleColor` for the sprite stripe.
- `index.tsx`: the `session.start`, `command.run`, `agent.spawn`, `tool.call`, `turn.step`, `ui.scroll` and `ui.render` subscriptions, each delegating.

**Done when:**
- **T-4.1** `src/mods/session/hooks/` holds `index.tsx`, `view.tsx`, `actions.ts`, `data.ts`, `sprite.ts`, `sessions.ts` and their tests; `src/mods/session/hooks/format.ts` and `src/mods/session/hooks/format.test.ts` no longer exist (the block lists them).
- **T-4.2** `index.tsx` has at most 170 lines and declares no atom.
- **T-4.3** No file imports `./index`; `data.ts` imports neither `./view` nor `./actions`; `actions.ts` does not import `./view`.
- **T-4.4** `git diff <phase 3 commit> -- src/mods/session/hooks/index.test.tsx` is empty and the test passes.
- **T-4.5** Driven: `node scripts/test.mjs build mods` exits 0 with no fewer passing tests than after phase 3 (OQ-002); `npm test` exits 0.

## Phase 5: markdown's `register` becomes wiring

**Touch set:**
- `src/mods/markdown/hooks/index.tsx`: wiring only (D-006)
- `src/mods/markdown/hooks/view.tsx`, `actions.ts`, `data.ts`: new
- `src/mods/markdown/hooks/work.ts`: removed; `workId`, `statusLine` move to `data.ts`
- `src/mods/markdown/hooks/picket-markdown.test.tsx`: imports follow the moves
- `src/mods/markdown/hooks/links.ts`, `markdown.ts`, `tree.ts`: stay
- `src/mods/markdown/hooks/index.test.tsx`: unchanged, the safety net
- `src/mods/markdown/types/index.d.ts`: shared types

**Changes:**
- `data.ts`: the nine atoms, `lastView` and its type, `keyOf`, `clamp`, `cut`, `message`, `existing`, `remember`, `textOf`, `toolPath`, `link`, `readOr`, `workOf` with its signature cache, `load`, `closedFolders`, `workId`, `statusLine`.
- `actions.ts`: `reveal`, `show`, `refresh`, `back`, `openInEditor`, `ask`, `showOrToast`, `openPressed`, `copy`, `scrollTo`, and the tree, mode and table-scroll changes the buttons make.
- `view.tsx`: `renderPane($, e)` and `renderReply($, e, linked)`, with the span, gutter, line, code block, file tree, outline and footer parts.
- `index.tsx`: the `session.start`, `session.append`, `tool.call`, `command.run`, `ui.render` (reply and pane) and `ui.scroll` subscriptions, each delegating.

**Done when:**
- **T-5.1** `src/mods/markdown/hooks/` holds `index.tsx`, `view.tsx`, `actions.ts`, `data.ts`, `tree.ts`, `links.ts`, `markdown.ts` and their tests; `src/mods/markdown/hooks/work.ts` no longer exists (the block lists it).
- **T-5.2** `index.tsx` has at most 170 lines and declares no atom.
- **T-5.3** No file imports `./index`; `data.ts` imports neither `./view` nor `./actions`; `actions.ts` does not import `./view`.
- **T-5.4** `git diff <phase 3 commit> -- src/mods/markdown/hooks/index.test.tsx` is empty and the test passes.
- **T-5.5** Driven: `node scripts/test.mjs build mods` exits 0 with no fewer passing tests than after phase 4 (OQ-002); `npm test` exits 0.

## Phase 6: Theme tokens and brand colours

**Touch set:**
- `src/mods/shared/theme.ts`: new, `TONES`, `SURFACES`, `ROLE_TONES` (D-007)
- `src/mods/status/hooks/palette.ts`, `src/mods/markdown/hooks/palette.ts`: removed
- `src/mods/status/hooks/band.ts`, `src/mods/status/hooks/index.tsx`: `TONES`
- `src/mods/markdown/hooks/view.tsx`: `TONES`, `SURFACES`
- `src/mods/session/hooks/view.tsx`, `src/mods/session/hooks/data.ts`: hex values to tokens
- `src/mods/session/hooks/sprite.ts`, `src/mods/session/hooks/sprite.test.ts`: `BRAND` and `ANSI`
- `src/lib/shared/styling/palette.mts`: read only

**Changes:**
- `theme.ts` imports nothing and exports `TONES` (`accent: 'claude'`, `muted: 'inactive'`, `rule: 'promptBorder'`, `warning`, `error`, `success`, `link: 'suggestion'`, `code: 'permission'`, `control: 'claudeShimmer'`), `SURFACES` (`pane: 'bashMessageBackgroundColor'`, `code: 'userMessageBackground'`, `row: 'userMessageBackgroundHover'`) and `ROLE_TONES` per OQ-001.
- `status` and `markdown` read colours from `'../../shared/theme'`; their `palette.ts` files go.
- `session`: role names use `ROLE_TONES`; tab and current-row backgrounds use `SURFACES.row`; the delete prompt uses `TONES.error` with no custom background; the divider and the unmeasured bar use `TONES.rule` and `TONES.muted`.
- The sprite takes `K` from `BRAND.selection`, `O` from `BRAND.orange`, `C` from `BRAND.cream`, `E` from `BRAND.background`, the finished tint from `BRAND.barEmpty`, and the role stripe from `ANSI` (architect blue, developer green, reviewer red, analyst purple, others `BRAND.muted`), all through `rgb` or one hex parse.

**Done when:**
- **T-6.1** `git grep -nE "#[0-9A-Fa-f]{6}\b|\b0x[0-9A-Fa-f]{6}\b" -- src/mods` prints nothing.
- **T-6.2** `src/mods/status/hooks/palette.ts` and `src/mods/markdown/hooks/palette.ts` no longer exist (the block lists them), no `palette.ts` exists under `src/mods/`, and every mod that colours text imports `theme`.
- **T-6.3** `sprite.test.ts` shows a body cell coloured `0xF9782B` (`BRAND.orange`) and a developer stripe cell coloured `ANSI.green[0]`.
- **T-6.4** `src/mods/session/hooks/index.test.tsx` passes with one added case: a developer card's name is coloured `ROLE_TONES.developer`.
- **T-6.5** Driven: `node scripts/test.mjs build mods` exits 0 (OQ-002); `npm test` exits 0.

## Open questions

- **OQ-001** Does the engine's theme offer one token per role, such as Claude Code's subagent colours (`blue_FOR_SUBAGENTS_ONLY` and siblings)? Not verified: the engine's mod types are not in this repository, and reading the Claude Code binary for token names was refused. Owner: the developer in phase 6, from the `claude-code` types a mod sees or a mod test that renders the token. Fallback: `ROLE_TONES` maps architect to `suggestion`, developer to `success`, reviewer to `permission`, analyst to `claudeShimmer`, all tokens the mods already render.
- **OQ-002** Will `claude plugin test` run from the developer's shell? On 2026-10-10 it refused from a subagent shell with "hooks modules are turned off in this process", while `validate --strict` still worked. Owner: the developer, every phase. Fallback: the block gives the `validate --strict` result and the refusal line, and the lead runs `node scripts/test.mjs mods` from the main session before routing the phase. Item 06 OQ-001 (the CI `mods` job) stays open and unchanged.

## Revision log

- 2026-10-23: D-005 (r2): rule limited to Picket data, markdown still displays work documents; files and absence criteria for phases 2 to 6; cacheLeft and SendMessage criteria.
- 2026-10-23: D-004 (r2): validate --strict rejects contract imports; status keeps a self-contained Work, checked against LatestView by test/repo/mod-contracts.test.mjs; phase 3 greps and T-3.6 follow.
- 2026-10-23: D-005 (r3): runPicket is an async function declaration, since the validator follows `$` only into one; phase 3 grep accepts `export async function`.
- 2026-10-23: D-006 (r2): wiring files at most 170 lines, no floor (T-4.2, T-5.2); T-2.2 excludes src/lib/hooks; T-4.5 allows more tests; cumulative review.
- 2026-10-23: D-006 (r2): T-5.5 allows more passing tests, as T-4.5 does; the review fix adds one test.
