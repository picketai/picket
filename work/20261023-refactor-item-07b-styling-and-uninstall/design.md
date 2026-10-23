---
kind: design
lane: design
title: Styling as lists, and picket uninstall
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/07b-styling.md, artifacts/refactor/00-conventions.md, artifacts/refactor/08a-instructions.md, artifacts/refactor/08b-docs.md, artifacts/refactor/09-hygiene.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, work/20261023-refactor-item-07a-the-mods/design.md, src/lib/shared/styling/ (every file), src/lib/verbs/style/ (every file), src/lib/verbs/init/index.mts, src/lib/verbs/init/init.mjs, src/lib/shared/action.mts, src/lib/shared/context.mts, src/lib/shared/verb-spec.mts, src/lib/shared/paths.mts, src/lib/shared/extensions.mjs, src/lib/verbs.mts, src/lib/mods.mts, src/lib/cli/main.mts, src/lib/cli/registry.mts, src/lib/util/process.mts, src/lib/hooks/guard/bash/kernel.mts, src/templates/claude-block.md, scripts/build.mjs, tsconfig.json, package.json, test/kernel/styling/ (every file), test/kernel/init.test.mjs, test/cli/cli.test.mjs, test/repo/conventions.test.mjs, test/repo/names.test.mjs, test/repo/markdown-paths.test.mjs, test/support/context.mts, test/support/project.mts]
phases:
  - n: 1
    files: [src/lib/shared/styling/host.mts, src/lib/shared/styling/host.test.mts, src/lib/shared/styling/manifest.mts, src/lib/shared/styling/manifest.test.mts, src/lib/util/prompt.mts, src/lib/util/process.mts, src/lib/verbs/style/apply.mts, src/lib/verbs/style/remove.mts]
    greps:
      - path: src/lib/shared/styling/manifest.mts
        pattern: 'export function manifestItem\b'
      - path: src/lib/shared/styling/manifest.mts
        pattern: 'export function writeTracked\b'
      - path: src/lib/shared/styling/manifest.mts
        pattern: 'setsFont'
      - path: src/lib/shared/styling/manifest.mts
        pattern: '^(?![\s\S]*new Date\()'
        flags: i
      - path: src/lib/shared/styling/host.mts
        pattern: 'export function hostFrom\b'
      - path: src/lib/util/process.mts
        pattern: 'export function spawnProgram\b'
      - path: src/lib/util/prompt.mts
        pattern: 'export function terminalPrompt\b'
      - path: src/lib/verbs/style/apply.mts
        pattern: '^(?![\s\S]*realHost)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/util/ini.mts, src/lib/util/ini.test.mts, src/lib/util/plist.mts, src/lib/util/zip.mts, src/lib/util/zip.test.mts, src/lib/shared/styling/change.mts, src/lib/shared/styling/terminals.mts, src/lib/shared/styling/terminals.test.mts, src/lib/shared/styling/terminals/dconf.mts, src/lib/shared/styling/terminals/keyfile.mts, src/lib/shared/styling/terminals/windows-terminal/index.mts, src/lib/shared/styling/terminals/terminal-app/index.mts, src/lib/shared/styling/terminals/terminal-app/index.test.mts, src/lib/shared/styling/terminals/konsole/index.mts, src/lib/shared/styling/terminals/konsole/index.test.mts, src/lib/shared/styling/terminals/gnome-terminal/index.mts, src/lib/shared/styling/terminals/gnome-terminal/index.test.mts, src/lib/shared/styling/terminals/ptyxis/index.mts, src/lib/shared/styling/terminals/ptyxis/index.test.mts, src/lib/shared/styling/terminals/manual/index.mts, test/support/styling-host.mts]
    greps:
      - path: src/lib/shared/styling/terminals.mts
        pattern: 'export const TERMINALS\b'
      - path: src/lib/shared/styling/terminals.mts
        pattern: 'export function detectTerminal\b'
      - path: src/lib/shared/styling/change.mts
        pattern: 'export type Change\b'
      - path: src/lib/shared/styling/terminals/dconf.mts
        pattern: 'export function dconfRead\b'
      - path: src/lib/shared/styling/terminals/ptyxis/index.mts
        pattern: '^(?![\s\S]*gnome-terminal/)'
        flags: i
      - path: src/lib/shared/styling/terminals/keyfile.mts
        pattern: 'export function keyfileChange\b'
      - path: src/lib/util/ini.mts
        pattern: 'export function setKey\b'
      - path: src/lib/util/ini.mts
        pattern: '^(?![\s\S]*shared/)'
        flags: i
      - path: src/lib/shared/styling/terminals/konsole/index.mts
        pattern: 'export const writer\b'
    tests: true
    drive: false
    security: false
  - n: 3
    files: [src/lib/shared/styling/components.mts, src/lib/shared/styling/components/theme/index.mts, src/lib/shared/styling/components/theme/index.test.mts, src/lib/shared/styling/components/font/index.mts, src/lib/shared/styling/components/font/index.test.mts, src/lib/shared/styling/components/terminal/index.mts, src/lib/shared/styling/components/terminal/index.test.mts, src/lib/shared/styling/components/statusline/index.mts, src/lib/shared/styling/plan.mts, src/lib/shared/styling/plan.test.mts, src/lib/shared/styling/removal.mts, src/lib/shared/styling/removal.test.mts, src/lib/shared/styling/terminals/windows-terminal/index.test.mts, src/lib/verbs/style/apply.mts, src/lib/verbs/style/remove.mts, src/lib/verbs/style/report.mts]
    greps:
      - path: src/lib/shared/styling/components.mts
        pattern: 'export const COMPONENT_NAMES\b'
      - path: src/lib/shared/styling/components/terminal/index.mts
        pattern: 'satisfies Record<TerminalId, TerminalWriter>'
      - path: src/lib/shared/styling/components/terminal/index.mts
        pattern: 'fontApplied'
      - path: src/lib/shared/styling/plan.mts
        pattern: 'function applyStyle\b'
      - path: src/lib/shared/styling/removal.mts
        pattern: 'function chooseAndRemove\b'
      - path: src/lib/verbs/style/apply.mts
        pattern: '^(?![\s\S]*as unknown as)'
        flags: i
      - path: src/lib/verbs/style/remove.mts
        pattern: '^(?![\s\S]*as unknown as)'
        flags: i
      - path: src/lib/shared/styling/components/theme/index.mts
        pattern: '^(?![\s\S]*installedAt)'
        flags: i
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/shared/install.mts, src/lib/shared/install.test.mts, src/lib/util/process.mts, src/lib/verbs/init/init.mjs, src/lib/shared/styling/components/statusline/index.mts]
    greps:
      - path: src/lib/shared/install.mts
        pattern: 'export const INSTALL\b'
      - path: src/lib/shared/install.mts
        pattern: 'export function claudeBlockSpan\b'
      - path: src/lib/shared/install.mts
        pattern: 'export function isHomeFolder\b'
      - path: src/lib/util/process.mts
        pattern: 'export function programRunner\b'
      - path: src/lib/verbs/init/init.mjs
        pattern: 'shared/install\.mts'
      - path: src/lib/verbs/init/init.mjs
        pattern: '^(?![\s\S]*(SETTINGS_ALLOW|SETTINGS_ASK|function claudeRunner))'
        flags: i
      - path: src/lib/shared/styling/components/statusline/index.mts
        pattern: 'install\.mts'
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/verbs/uninstall/index.mts, src/lib/verbs/uninstall/index.test.mts, src/lib/verbs/uninstall/uninstall.mts, src/lib/verbs/uninstall/uninstall.test.mts, src/lib/verbs.mts, src/lib/cli/registry.mts, src/lib/cli/main.mts, src/lib/hooks/guard/bash/kernel.test.mts, src/lib/hooks/guard/bash/payloads.test.mts, src/lib/shared/styling/removal.mts, test/cli/cli.test.mjs]
    greps:
      - path: src/lib/verbs.mts
        pattern: 'uninstall: \{ summary: .*leadOnly: true'
      - path: src/lib/cli/registry.mts
        pattern: 'verbs/uninstall/index\.mts'
      - path: src/lib/cli/main.mts
        pattern: '^(?![\s\S]*uninstall: "style remove")'
        flags: i
      - path: src/lib/verbs/uninstall/uninstall.mts
        pattern: 'export function planUninstall\b'
      - path: src/lib/verbs/uninstall/uninstall.mts
        pattern: 'function runUninstall\b'
      - path: src/lib/verbs/uninstall/index.mts
        pattern: 'remove-work'
      - path: src/lib/shared/styling/removal.mts
        pattern: 'picket uninstall'
      - path: src/lib/hooks/guard/bash/kernel.test.mts
        pattern: '"uninstall"'
    tests: true
    drive: true
    security: true
---
# Design: Styling as lists, and picket uninstall

## Problem

The styling code (`src/lib/shared/styling/`, 18 files, still `.mjs` except `palette.mts`) plans, records a style manifest (`~/.picketai/styling-manifest.json`; "style manifest" throughout, since "manifest" alone is the glossary word for `extension.json`) and reaches the machine through a `host`, but its terminals and components are hand-wired `if` chains and imports, ten style manifest entries are built by hand, and the font fact travels through a hidden `run.fontSet` flag that Terminal.app never sets, so macOS never gets Nerd Font icons (B6, `artifacts/refactor/07b-styling.md#B6`). Nothing removes Picket from a project; the user undoes `picket init` by hand. The approved draft `artifacts/refactor/07b-styling.md` (decisions Y-1 to Y-8, its migration and evidence) is the source of truth, bound by `artifacts/refactor/00-conventions.md` (C-002 `.mts`, C-003 bottom-up, C-007 no process reads, C-009 closed lists, C-010 processes through `util/process.mts`, C-014 import zones, C-017 tests beside code). The user chose on 2026-10-22 that `picket uninstall` removes everything `init` adds and offers `work/` unchosen. Neither `uninstall` nor any `style` verb may run against this machine's real home or this repository during the work; tests use temp homes and fake runners.

## Decisions

### D-001 (r2): Components and terminals are lists with one folder each (Y-1)
**Decision:** Infrastructural decision. `terminals.mts` holds `TERMINALS` as data (the draft's table: id, name, `detect` by env name and optional `equals`), the `TerminalId` union, `detectTerminal(env)` walking the list in order, and the `TerminalWriter` type. Each terminal is `terminals/<id>/index.mts` exporting `writer`; `manual/` is the fallback for `"other"`. `components.mts` holds `COMPONENT_NAMES` (`theme`, `font`, `terminal`, `statusline`, `as const`), `ComponentName` and `COMPONENTS`; each component is `components/<name>/index.mts` exporting `component`. The terminal component maps writers with `satisfies Record<TerminalId, TerminalWriter>`, so `tsc` rejects a listed terminal without a writer. Two files the draft's tree does not show: `change.mts` owns the `Change`, `ApplyContext` and `Component` types, so writers convert before the runner (C-003) with type-only imports and no cycle at run time; `removal.mts` holds what `setup.mjs --revert` and the old `uninstall.mjs` did (remove all, choose items, `removeChosen`), so `plan.mts` stays the apply runner. `nerd-font.json` stays where it is.
**Instead of:** keep the flat files and the `if` chain: a new terminal touches three files and the shape differs from verbs, hooks and mods.
**Risks:**
- **RISK-001** Moving the styling tests loses some. Mitigation: phase 1's block states the `test(` count under `test/kernel/styling/` before and after its own edits (72 in the working tree when phase 1 started, 71 at 0a6a593); phases 2 and 3 compare against phase 1's after count, and the reviewer recounts.
- **RISK-002** A writer folder imports a value from `terminals.mts` or `components.mts` and creates a load cycle. Mitigation: folders import only types from the list modules; values come from `change.mts`, `manifest.mts`, `host.mts`, `dconf.mts`, `keyfile.mts`, `palette.mts` and `util/`.

### D-002 (r2): The style manifest records `setsFont` (Y-2, fixes B6)
**Decision:** Infrastructural decision. A `Change` that sets the terminal font declares `setsFont: true`; the runner records every applied item through `manifestItem`, which copies `setsFont: true` onto the `ManifestItem` (top level, not under `data`). The icons step decides from records, `fontApplied(manifest, applied) = [...manifest.items, ...applied].some((item) => item.setsFont)`, where `applied` is what this run recorded so far (`ApplyContext.applied`). `run.fontSet` and the dead `item.data?.setsFont` fallback go. Terminal.app needs no change of its own.
**Instead of:** add `run.fontSet = true` to `terminal-app.mjs`: fixes the symptom and keeps the hidden channel that caused it.
**Risks:**
- **RISK-003** Style manifests written before this change carry no `setsFont` (draft R-1), so a font set in an earlier run counts as not set and the icons step waits for the next run. Mitigation: the style manifest version stays 1 and reads unchanged; one `style apply` records it; a test reads an old-shape style manifest.

### D-003 (r2): `manifestItem` and `writeTracked` build every style manifest entry (Y-3)
**Decision:** Infrastructural decision. `Change.apply(host, context: ApplyContext)` returns `ItemFields | null` (`kind`, `path?`, `backup?`, `sha256?`, `previous?`, `data?`), never a whole item; `ApplyContext` is `{ backup: Backup; applied: readonly ManifestItem[] }`. The runner calls `manifestItem(host, change, component, fields)`, which adds `id`, `component`, `setsFont` and `installedAt`. `writeTracked(host, path, content, backup)` backs up an existing file, creates the folder, writes, hashes, and returns `{ kind: "created" | "edited", path, backup?, sha256 }`. The ten hand-built entries (`artifacts/refactor/07b-styling.md#Copies`) go; `installedAt(` is called only inside `manifest.mts`.
**Instead of:** each writer calls `manifestItem` itself: a writer can forget a field, which is how B6 happened.
**Risks:**
- **RISK-004** A writer that writes a file and then runs a program (Terminal.app's profile, kind `external`) does not fit `writeTracked`'s kinds. Mitigation: it spreads `writeTracked`'s result and overrides `kind`; the Terminal.app test asserts the recorded kind.

### D-004: `dconf.mts` is shared by GNOME Terminal and Ptyxis (Y-4)
**Decision:** Infrastructural decision. The 13 dconf helpers `ptyxis.mjs` imports from `gnome-terminal.mjs`, and `dconfMissing`, move to `terminals/dconf.mts`; `externalItem` becomes a fields builder there. No writer folder imports another writer folder.
**Instead of:** Ptyxis keeps importing GNOME Terminal: a change to one writer silently changes the other.
**Risks:**
- **RISK-005** The fake dconf in the fixture drifts from the helpers' calls. Mitigation: the GNOME Terminal and Ptyxis tests keep running through `fakeDconf` unchanged in substance.

### D-005: `ini`, `plist` and `zip` move to `util/` (Y-5)
**Decision:** Infrastructural decision. `util/ini.mts` (`getKey`, `setKey`, `removeKey`, `renderIni`), `util/plist.mts` (`xmlPlist`), `util/zip.mts` (`readEntries`, `extractEntry`) import only `node:` and know nothing of Picket (C-014). `keyfileChange` and `keptFile` stay in styling as `terminals/keyfile.mts`.
**Instead of:** keep them under `shared/styling/`: file formats with no Picket knowledge belong in `util/`, and the draft places them there.
**Risks:**
- **RISK-006** CRLF handling in `setKey` and `removeKey` regresses in the move. Mitigation: `util/ini.test.mts` covers a CRLF file.

### D-006: `style apply` and `style remove` carry the styling verbs (Y-6)
**Decision:** Infrastructural decision. The two verbs exist since item 03 as adapters with `as unknown as` casts over `setup.mjs` and `uninstall.mjs` (`work/20261022-refactor-item-03-kernel-cli-and-layout/design.md`). This item points them at typed `plan.mts` (`applyStyle`) and `removal.mts` (`removeAll`, `chooseAndRemove`) and drops the casts; `--only` checks against `COMPONENT_NAMES`. Usage and output stay as they are. `setup-terminal` keeps its rename notice in `RENAMED`; `uninstall` leaves `RENAMED` in phase 5, when the name gets its own verb.
**Instead of:** keep the casts: they hide exactly the shape changes D-003 makes.
**Risks:**
- **RISK-007** A user who learned `picket uninstall` as the styling removal now removes Picket from the project. Mitigation: the new verb shows its plan and asks per group; `style remove`'s closing line names `picket uninstall` for the project and `style remove` stays for styling; 08b's changelog names the change.

### D-007 (r2): Styling reads the machine only through `Host`, built from the `Context` (Y-7)
**Decision:** Infrastructural decision. `host.mts` owns `Host` (`platform`, `home`, `env`, `now: () => Date`, `exec`, `fetch`, `interactive`, `ask`) and `hostFrom(context: Context, prompt: Prompt): Host`. The terminal question lives in `util/prompt.mts` (`Prompt`, `AskOptions`, `terminalPrompt()`, today's `answerOf` and readline code); `exec` goes through a new `spawnProgram(program, args)` in `util/process.mts` returning `{ status: number | null; stdout; stderr }` and never throwing. The `style` verbs call `hostFrom(context, terminalPrompt())`. `host.mjs` and `realHost` go. `now` returns a `Date`, so no styling module writes `new Date(` (the C-007 scan).
**Instead of:** add `ask` to `Context`: every verb and test context would carry a terminal prompt only three verbs use.
**Risks:**
- **RISK-008** The fixture's `now` returns a number today and old tests break. Mitigation: the fixture returns `new Date(FIXED_NOW)` in phase 1; `manifest.test.mts` pins `installedAt` to that instant.

### D-008 (r2): `picket uninstall` removes Picket from the project (Y-8)
**Decision:** Infrastructural decision. `shared/install.mts` owns what `init` adds, `INSTALL` (CLAUDE.md block start and template, `.picket/config.json`, the `.picket/state/` ignore line, the settings `env`, `allow`, `ask` and `statusLine`, marketplace `picketai`, plugin `picket@picketai`), `pluginId(plugin)`, `claudeBlockSpan(lines, template)` and `isHomeFolder(root, home, platform)`; `init` and `uninstall` both read it. Mod plugin ids come from `MODS` in each verb, since `shared/` may not import `mods.mts` (C-014). `programRunner(platform)`, today's `claudeRunner`, moves to `util/process.mts`. `uninstall` plans groups (`plugins`, `settings`, `claude-md`, `gitignore`, `config`, `state`, `work`), shows the plan, asks per group, and takes `--dry-run`, `--yes` and `--remove-work`; `work/` is unchosen by default, and so is `config` when `.picket/extensions/` holds an extension. It removes only exact entries from `INSTALL`, refuses the home folder, is `leadOnly` in `VERB_NAMES`, and prints the two machine-level commands instead of running them. Removing `work/` or `.picket/config.json` when chosen is [IRREVERSIBLE] for files not in git.
**Instead of:** a record of what `init` wrote, as styling's style manifest is: projects set up by earlier versions have none, and exact-string removal from the shared list works for both.
**Risks:**
- **RISK-009** `settings.json` holds the user's own rules beside Picket's (draft R-2). Mitigation: only strings and values equal to `INSTALL`'s are removed, `deny` is never touched, `--dry-run` lists each removal.
- **RISK-010** `settings.json` comes back equal as JSON but reformatted (draft R-3). Mitigation: `init` already writes it with `JSON.stringify(_, null, 2)`; the round-trip test compares parsed JSON.
- **RISK-011** Run from a folder under the home without project markers, the root resolves to the home (it holds `.claude/`), and the user settings would be edited as project settings. Mitigation: `uninstall` refuses when the root is the home folder, case-insensitively on Windows, before planning.
- **RISK-012** `uninstall` cannot remove the global `picket` it runs from (draft R-4). Mitigation: it prints `npm uninstall -g @picketai/picket` and `picket style remove --all`.

## Scope

**In:**
- Styling restructure per Y-1 to Y-7, B6 fixed, styling tests beside their code.
- `shared/install.mts` read by `init` with its output unchanged; the new `picket uninstall` with tests and a spawn test on a temp project.

**Out:**
- Docs: the renames landed in item 03; the how-to section for `picket uninstall` and the changelog are item 08b's.
- Converting `src/lib/verbs/init/init.mjs` to `.mts`; it only reads `install.mts`.
- Removing machine-level styling or the global command from `uninstall`; it prints them.
- Any user-level settings file; `uninstall` edits the project's `.claude/settings.json` only.

## Phase 1: Host from the Context, a typed style manifest, B6 fixed

**Touch set:**
- `src/lib/shared/styling/host.mjs`: becomes `host.mts` (D-007); `realHost` goes
- `src/lib/shared/styling/host.test.mts`: new
- `src/lib/shared/styling/manifest.mjs`: becomes `manifest.mts` (D-002, D-003)
- `src/lib/shared/styling/manifest.test.mts`: new
- `src/lib/util/prompt.mts`: new, terminal question
- `src/lib/util/process.mts`: add `spawnProgram`
- `src/lib/shared/styling/setup.mjs`: runner wraps fields with `manifestItem`
- `src/lib/shared/styling/terminal.mjs`: icons step reads records
- `src/lib/shared/styling/font.mjs`, `theme.mjs`, `statusline-setting.mjs`, `uninstall.mjs`: fields, new imports
- `src/lib/shared/styling/terminals/gnome-terminal.mjs`, `ptyxis.mjs`, `konsole.mjs`, `windows-terminal.mjs`, `terminal-app.mjs`, `ini.mjs`, `manual.mjs`: fields, no `run`
- `src/lib/verbs/style/apply.mts`, `src/lib/verbs/style/remove.mts`: `hostFrom(context, terminalPrompt())`
- `test/kernel/styling/host-fixture.mjs`: `now` returns a `Date`
- `test/kernel/styling/terminal-app.test.mjs`: the B6 test
- `test/kernel/styling/*.test.mjs`: assertions on item shape only
- `test/repo/conventions.test.mjs`: must pass unchanged

**Changes:**
- `manifest.mts`: today's functions typed, plus `ITEM_KINDS` (`created`, `edited`, `external`, `as const`) and `ItemKind`, `ManifestItem` (with optional top-level `setsFont: true`), `Manifest`, `ItemFields`, `Backup`, `Unapplied` (`{ result, detail?, manual? }`), `ItemRemover` (`name`, `unapply`, optional `blocks`), `manifestItem` and `writeTracked` as D-003 gives them. Times come from `host.now().toISOString()`.
- `host.mts`, `util/prompt.mts`, `spawnProgram` as D-007. Importers of the converted modules name `.mts`, as `init.mjs` already does.
- Every `apply` takes `(host, { backup, applied })` and returns `ItemFields` or `null`; the ten hand-built entries use `writeTracked` where they write a file and plain fields otherwise; `setsFont: true` stays on the five changes that already declare it (the Konsole, GNOME Terminal, Terminal.app and Windows Terminal default changes, Ptyxis's font change). `run` leaves every writer's `plan` options; the icons step uses `fontApplied` (D-002).
- `setup.mjs`: `applyEntry` passes `{ backup, applied }` (items recorded this run, in order) and records `manifestItem(host, change, component.name, fields)`; `carried` is unchanged.
- No file moves except `host` and `manifest`; tests stay under `test/kernel/styling/`.

**Done when:**
- **T-1.1** A fake macOS host (`darwin`, `TERM_PROGRAM=Apple_Terminal`, brew reporting the cask, fake `defaults` and `osascript`) run with `--yes` ends with `statusline-icons` applied, `~/.picketai/config.json` holding `statusline.icons` `"nerd"`, and the `terminal-app-default` record carrying `setsFont: true`.
- **T-1.2** `rg -n "run\.fontSet|data\?\.setsFont" src/lib` prints nothing, and `rg -n "installedAt\(" src/lib/shared/styling` matches only `manifest.mts`.
- **T-1.3** `manifest.test.mts`: `manifestItem` sets `setsFont` only for a change that declares it and stamps `installedAt` from `host.now()`; `writeTracked` returns `created` with no backup for a new file and `edited` with the backup path for an existing one; a version-1 style manifest in today's shape, with no `setsFont`, reads and its items remove.
- **T-1.4** `host.test.mts`: `hostFrom(fixedContext(...), prompt)` carries the context's `home`, `env`, `platform` and `now`, takes `interactive` and `ask` from the prompt, and its `exec` of a missing program returns status `null` without throwing.
- **T-1.5** Every test under `test/kernel/styling/` passes, with edits limited to the fixture's `now`, assertions on item shape and the B6 test; the block states the `test(` count there before phase 1's edits (72 in the working tree when it started) and after them, the number phases 2 and 3 compare against.
- **T-1.6** Driven: with `HOME` and `USERPROFILE` set to an empty temp folder, `picket style apply --dry-run --only statusline` exits 0, prints a `planned` line for `statusline`, and the temp folder holds no `.picketai`.
- **T-1.7** `npm test` exits 0, `npm run typecheck` and the convention scans included.

## Phase 2: File formats in `util/`, terminals as a list and folders

**Touch set:**
- `src/lib/shared/styling/terminals/ini.mjs`: INI part to `util/ini.mts`, rest to `terminals/keyfile.mts` (D-005)
- `src/lib/shared/styling/terminals/plist.mjs`: becomes `src/lib/util/plist.mts`
- `src/lib/shared/styling/zip.mjs`: becomes `src/lib/util/zip.mts`
- `src/lib/util/ini.test.mts`: new
- `test/kernel/styling/zip.test.mjs`: becomes `src/lib/util/zip.test.mts`
- `src/lib/shared/styling/change.mts`: new, `Change`, `ApplyContext`, `Component` (D-001)
- `src/lib/shared/styling/terminals.mts`, `terminals.test.mts`: new (D-001)
- `src/lib/shared/styling/terminals/gnome-terminal.mjs`: dconf helpers to `terminals/dconf.mts` (D-004), writer to `gnome-terminal/index.mts`
- `src/lib/shared/styling/terminals/windows-terminal.mjs`, `terminal-app.mjs`, `konsole.mjs`, `ptyxis.mjs`, `manual.mjs`: become `terminals/<id>/index.mts`
- `src/lib/shared/styling/terminal.mjs`: imports writers and `detectTerminal` from the new modules
- `src/lib/shared/styling/font.mjs`: imports `util/zip.mts`
- `test/kernel/styling/host-fixture.mjs`: becomes `test/support/styling-host.mts`
- `test/kernel/styling/linux-terminals.test.mjs`: split beside the Konsole, GNOME Terminal and Ptyxis writers
- `test/kernel/styling/terminal-app.test.mjs`: becomes `terminals/terminal-app/index.test.mts`
- `test/kernel/styling/font.test.mjs`, `setup.test.mjs`, `terminal.test.mjs`, `theme.test.mjs`, `uninstall.test.mjs`: fixture import only
- `test/repo/conventions.test.mjs`: must pass unchanged

**Changes:**
- `util/ini.mts`, `util/plist.mts`, `util/zip.mts` typed, `node:` imports only (D-005).
- `change.mts`: `Change` (`id`, `summary`, `question?`, `restart`, `manual?`, `manualIfSkipped?`, `setsFont?: true`, `apply?(host, context): ItemFields | null | Promise<ItemFields | null>`; a change without `apply` is a note), `ApplyContext`, and `Component` (`name`, `plan(host, manifest, earlier)`, `unapply`, `blocks?`), which extends `ItemRemover` from `manifest.mts`.
- `terminals.mts` as D-001: `TERMINALS` in today's detection order (Windows Terminal, Terminal.app, Konsole, Ptyxis, GNOME Terminal), `TerminalId`, `detectTerminal(env): TerminalId | "other"`, `TerminalWriter` (`name`, `plan(host, manifest, { family })`, `unapply(item, host)`). It imports types only.
- Each `terminals/<id>/index.mts` exports `writer: TerminalWriter` and the helpers its tests use today (`profileColors`, `profileFile`, `colorscheme`, `profile`, `paletteFile`, `picketScheme`, `settingsFiles`, `paletteText`). `manual/` takes the family from `plan`'s options instead of a factory. A writer's `data.writer` keeps today's id, so existing style manifests still find their writer.
- `terminals/dconf.mts` and `terminals/keyfile.mts` as D-004 and D-005; Ptyxis imports `../dconf.mts`.
- `terminal.mjs` stays `.mjs` this phase and builds its writer map from the folders.
- Tests: each moved test becomes `.test.mts` beside its module and imports the `src/` file; the fixture is `#test/styling-host.mts`; `terminal.test.mjs`'s detection case also gets a twin in `terminals.test.mts`. The eight old writer files and `zip.mjs` are deleted (the block lists them).

**Done when:**
- **T-2.1** `git ls-files src/lib/shared/styling/terminals` lists only `dconf.mts`, `keyfile.mts` and `<id>/index.mts` (with tests) for `windows-terminal`, `terminal-app`, `konsole`, `gnome-terminal`, `ptyxis`, `manual`; `src/lib/shared/styling/zip.mjs` is gone.
- **T-2.2** `terminals.test.mts`: `detectTerminal` returns each id for its variable (`WT_SESSION`, `TERM_PROGRAM=Apple_Terminal`, `KONSOLE_VERSION`, `PTYXIS_VERSION`, `GNOME_TERMINAL_SCREEN`, `GNOME_TERMINAL_SERVICE`), `"other"` for none, and `windows-terminal` when `WT_SESSION` and `KONSOLE_VERSION` are both set.
- **T-2.3** `rg -n "from \"\.\./(windows-terminal|terminal-app|konsole|gnome-terminal|ptyxis|manual)/" src/lib/shared/styling/terminals` prints nothing.
- **T-2.4** `util/ini.test.mts` shows `setKey` and `removeKey` keep CRLF line ends and `getKey` reads a key from the right section; `util/zip.test.mts` holds the four zip tests.
- **T-2.5** Across the moved and remaining styling tests, the number of `test(` cases is at least the after count phase 1's block states (T-1.5), plus the new `terminals.test.mts` and `util/ini.test.mts` cases, and every one passes.
- **T-2.6** `npm test` exits 0.

## Phase 3: Components as a list and folders, the runner as `plan.mts`

**Touch set:**
- `src/lib/shared/styling/components.mts`: new (D-001)
- `src/lib/shared/styling/theme.mjs`, `font.mjs`, `terminal.mjs`, `statusline-setting.mjs`: become `components/<name>/index.mts`
- `src/lib/shared/styling/setup.mjs`: becomes `plan.mts`
- `src/lib/shared/styling/uninstall.mjs`: becomes `removal.mts` with the revert path from `setup.mjs`
- `src/lib/verbs/style/apply.mts`, `remove.mts`, `report.mts`: typed calls (D-006)
- `test/kernel/styling/font.test.mjs`, `theme.test.mjs`: beside their components
- `test/kernel/styling/terminal.test.mjs`: split between `components/terminal/` and `terminals/windows-terminal/`
- `test/kernel/styling/fixtures/wt-*.json`: beside the Windows Terminal test as `*.test.json`
- `test/kernel/styling/setup.test.mjs`: becomes `plan.test.mts`
- `test/kernel/styling/uninstall.test.mjs`: becomes `removal.test.mts`
- `test/cli/cli.test.mjs`: the `style` spawn tests must pass unchanged

**Changes:**
- `components.mts`: `COMPONENT_NAMES`, `ComponentName`, `COMPONENTS` in today's order. Each `components/<name>/index.mts` exports `component: Component`; font and terminal also keep `fontComponent(pin)` and `terminalComponent(pin)` for tests, and font keeps `detectFont`, `fontDir`, `readPin`, `registryName`. `STATUS_LINE` stays exported from the statusline component until phase 4.
- The terminal component maps writers with `satisfies Record<TerminalId, TerminalWriter>` and falls back to `manual`; its icons step keeps `fontApplied` (D-002).
- `plan.mts`: today's `setupTerminal` without `revert`, renamed `applyStyle(host, { only, dryRun, yes, components })`, plus `report`, `line`, `renderReport`, and the `StyleReport` and `StyleChange` types, which `verbs/style/report.mts` now imports.
- `removal.mts`: `removeAll(host, { dryRun, yes, components })` (today's `revertAll`), `chooseAndRemove(host, { yes, components })` (today's `uninstall`), `removeChosen`.
- `verbs/style/apply.mts` checks `--only` against `COMPONENT_NAMES`; `apply` and `remove` call the typed functions with no casts; usage text unchanged.
- Fixtures are named `*.test.json` so the build does not copy them into `dist/`. The terminal test checks `~/.picketai/config.json` itself instead of importing the status line verb. `test/kernel/styling/` is deleted with every file in it (the block lists them).

**Done when:**
- **T-3.1** `git ls-files src/lib/shared/styling` lists no `.mjs`, and `test/kernel/styling` does not exist.
- **T-3.2** Adding a `TERMINALS` entry with no writer makes `npm run typecheck` fail on the terminal component's map (the block shows the error from a scratch edit, reverted).
- **T-3.3** `rg -n "as unknown as" src/lib/verbs/style` prints nothing; `apply.test.mts` and `remove.test.mts` pass unchanged, `--only bogus` still naming the four components.
- **T-3.4** The `test(` count of the styling tests under `src/lib/shared/styling` and of `src/lib/util/zip.test.mts` and `src/lib/util/ini.test.mts` is at least phase 2's (itself anchored on T-1.5's after count), every case passes, and `npm pack --dry-run` lists no `.test.` path.
- **T-3.5** Driven: with `HOME` and `USERPROFILE` set to an empty temp folder, `picket style apply --dry-run` exits 0 with `planned` lines for the theme and the status line; `picket style remove --all --dry-run` prints `nothing to revert`; the temp folder holds no `.picketai`.
- **T-3.6** `npm test` exits 0, the `style` spawn tests in `test/cli/cli.test.mjs` included.

## Phase 4: One list of what `init` adds

**Touch set:**
- `src/lib/shared/install.mts`, `install.test.mts`: new (D-008)
- `src/lib/verbs/init/init.mjs`: reads `INSTALL`, `claudeBlockSpan`, `isHomeFolder`, `programRunner`
- `src/lib/util/process.mts`: add `programRunner` (today's `claudeRunner`)
- `src/lib/shared/styling/components/statusline/index.mts`: `STATUS_LINE` from `INSTALL`
- `src/lib/shared/styling/plan.test.mts`: `STATUS_LINE` import [INFERRED]
- `src/lib/mods.mts`: read only, mod plugin ids
- `test/kernel/init.test.mjs`: must pass unchanged

**Changes:**
- `install.mts`: `MARKETPLACE = "picketai"`, `pluginId(plugin)` (`<plugin>@picketai`), and `INSTALL` `as const` with `claudeMd` (`file: "CLAUDE.md"`, `start: "# Picket"`, `template: "templates/claude-block.md"`, `projectFacts: "## Project facts"`), `config` (`.picket/config.json`, initial `{ version: 1 }`), `gitignore` (`file: ".gitignore"`, `line: ".picket/state/"`), `settings` (`file: ".claude/settings.json"`, `env`, `allow`, `ask`, `statusLine`, the draft's values), `plugin: "picket@picketai"`. Paths come from `paths.mts` constants. Also `readTemplate()`, `claudeBlockSpan(lines, template): { start, end } | null` (today's scan in `mergeClaudeBlock`), and `isHomeFolder(root, home, platform)` (today's `samePath` against the home).
- `programRunner(platform): ProgramRunner` in `util/process.mts`, with `ProgramRunner = (program, args, { cwd }) => string`, quoting as `claudeRunner` does today.
- `init.mjs` keeps its steps and messages; its constants, `claudeRunner`, the block scan and the home check come from the modules above; mod ids are `pluginId(plugin)` over `MODS` with `install === "default"`; `init(root, { exec })` defaults `exec` to `programRunner(process.platform)`.
- The statusline component and its tests take `INSTALL.settings.statusLine`; `STATUS_LINE` leaves the component.

**Done when:**
- **T-4.1** `test/kernel/init.test.mjs` passes with no edit (`git diff --stat` shows none for it).
- **T-4.2** `rg -n "picket drive \*|CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" src/lib` matches only `src/lib/shared/install.mts` and tests, and `init.mjs` builds no ignore line of its own.
- **T-4.3** `install.test.mts`: `claudeBlockSpan` on text with lines before `# Picket` and a `## Project facts` after it returns the span from `# Picket` to the line before `## Project facts`, and `null` for text without `# Picket`; `isHomeFolder` is true for the home in other case with a trailing separator on `win32` and false for other case on `linux`.
- **T-4.4** Driven: with `HOME` and `USERPROFILE` set to an empty temp folder and a temp project (`CLAUDE.md` `# My project`, `.claude/settings.json` allowing `Bash(npm test)`), `picket init --root <project> --no-install` reports `claude-md: updated`, `config: created`, `gitignore: created`, `settings: updated` and the four install steps `skipped`; `settings.json` holds the draft's `permissions` and `env` plus Picket's `statusLine`.
- **T-4.5** `npm test` exits 0.

## Phase 5: `picket uninstall`

**Touch set:**
- `src/lib/verbs/uninstall/index.mts`, `index.test.mts`: new verb, parse and render (D-008)
- `src/lib/verbs/uninstall/uninstall.mts`, `uninstall.test.mts`: new plan and apply
- `src/lib/verbs.mts`: `uninstall` entry, `leadOnly: true`
- `src/lib/cli/registry.mts`: the import
- `src/lib/cli/main.mts`: `uninstall` leaves `RENAMED`
- `src/lib/hooks/guard/bash/kernel.test.mts`: lead-only list gains `uninstall`
- `src/lib/hooks/guard/bash/payloads.test.mts`: a spawned agent is denied `picket uninstall`
- `src/lib/shared/styling/removal.mts`: closing line names `picket uninstall`
- `test/cli/cli.test.mjs`: rename list, `style remove` closing line, spawn tests
- `src/lib/shared/install.mts`, `src/lib/shared/extensions.mjs`, `src/lib/shared/paths.mts`, `src/lib/util/prompt.mts`: read only

**Changes:**
- `uninstall.mts`: `UNINSTALL_GROUPS` (`plugins`, `settings`, `claude-md`, `gitignore`, `config`, `state`, `work`, `as const`) and `GroupId`; `PlannedGroup = { id, summary, steps: string[], chosen: boolean, note? }`; `planUninstall(root, { removeWork }): PlannedGroup[]`, listing only groups with something to remove; `runUninstall(root, input, { exec: ProgramRunner, prompt: Prompt })` returning `{ root, changes: { id, summary, result, detail? }[], manual: string[] }` with results `planned`, `declined`, `kept`, `removed`, `failed`.
- Groups: `plugins` runs `claude plugin uninstall <id> --scope project` for each `MODS` plugin and then `picket@picketai` found in `enabledPlugins`, then `claude plugin marketplace remove picketai --scope project` when `extraKnownMarketplaces.picketai` is set, all from the root; `settings` removes `INSTALL.settings` entries by exact value, drops a list or object left empty, never touches `deny`, deletes the file if `{}` is left and `.claude/` if it is then empty; `claude-md` removes the block (`claudeBlockSpan`) and the blank line before it, keeping line ends, and deletes the file if only an empty `## Project facts` is left; `gitignore` removes the line and deletes an emptied file; `config` removes `.picket/config.json` and, when chosen, `.picket/extensions/`; `state` removes `.picket/state/`; `work` removes `work/`. Then `.picket/` goes if empty. Removal never follows a link out of the root.
- `index.mts`: `uninstall [--dry-run] [--yes] [--remove-work]`, root from the context, output `text`. It refuses when `isHomeFolder(context.root, context.home, context.platform)`. `--dry-run` prints the plan only; without `--yes` it asks per group with the group's default, and with no terminal it changes nothing and says to pass `--yes`. The render ends with the draft's three lines (`Picket is removed from this project.`, `picket style remove --all`, `npm uninstall -g @picketai/picket`).
- `removal.mts`'s closing line says to run `picket uninstall` in a project and `npm uninstall -g @picketai/picket` for the command.

**Done when:**
- **T-5.1** Round trip (draft migration): a project with `CLAUDE.md` `# My project`, `.claude/settings.json` allowing `Bash(npm test)` and `work/x/state.yaml`, after `init(root, { install: false, home })` then `runUninstall` with `yes`, has `CLAUDE.md` byte for byte as before, no `.gitignore`, `settings.json` equal as JSON, no `.picket/`, and `work/x/state.yaml` unchanged; a CRLF `CLAUDE.md` and a `.gitignore` holding `node_modules/` also come back byte for byte.
- **T-5.2** With a fake runner and `picket@picketai`, `picket-status@picketai`, `picket-session@picketai` and the marketplace in the settings, the calls are the three `plugin uninstall … --scope project` with the mods before `picket@picketai`, then `plugin marketplace remove picketai --scope project`, each with `cwd` the root; with none listed there is no call; a failing call marks `plugins` failed with the by-hand commands and the other groups still run.
- **T-5.3** A user rule in `allow`, `ask` and `deny`, a user `env` key and a user `statusLine` survive; `deny` is byte for byte unchanged.
- **T-5.4** `--dry-run` runs no command and changes no file; with no terminal and no `--yes` nothing changes; `--yes` keeps `work/` and removes it only with `--remove-work`; with an extension under `.picket/extensions/`, `--yes` keeps `.picket/config.json` and the extension.
- **T-5.5** The root equal to the home (other case on `win32`) is refused with exit 2 and no change; a spawned agent running `picket uninstall` is denied by `guard.bash`; `picket uninstall` no longer prints a rename notice; `picket style remove` ends naming `picket uninstall`.
- **T-5.6** Driven: with `HOME`, `USERPROFILE` and `CLAUDE_CONFIG_DIR` set to temp folders and a temp project set up by `picket init --root <p> --no-install`, `picket uninstall --root <p> --dry-run` lists the groups and changes nothing, and `picket uninstall --root <p> --yes` exits 0, prints the three closing lines and leaves the project as T-5.1 states. Never this repository or the real home.
- **T-5.7** `npm test` exits 0.

## Open questions

- **OQ-001** Settings allow `Bash(picket *)`, so the lead can run `picket uninstall --yes` with no permission prompt; should `guard.bash` ask the user before any `picket uninstall` without `--dry-run`? Owner: user. Fallback: `leadOnly` keeps spawned agents out, the plan and per-group questions stay, and `work/` is never removed without `--remove-work`.

## Revision log

- 2026-10-23: D-001 (r2): test count anchored on phase 1's stated before and after counts, not 71 at 0a6a593; T-1.5, T-2.5, T-3.4 follow; cross-check Minor.
- 2026-10-23: D-002 (r2): "style manifest" for the styling record; "manifest" alone means `extension.json` in the glossary; cross-check Minor.
- 2026-10-23: D-003 (r2): "style manifest entry" wording; cross-check Minor.
- 2026-10-23: D-007 (r2): RISK-008 names `manifest.test.mts` instead of "the manifest test"; cross-check Minor.
- 2026-10-23: D-008 (r2): "Instead of" names styling's style manifest; cross-check Minor.
