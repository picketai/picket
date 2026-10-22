# 07a: The mods

Status: approved (2026-10-22).

The three mods (`status`, `session`, `markdown`) get the structure verbs and hooks got: an import-free list (`src/lib/mods.mts`), one folder per mod, and a build that writes each mod's manifest, its `hooks.json` and the marketplace entries. Each helper the kernel and the mods share (formatters, the brand palette, the kernel's JSON shapes) exists once in `src/lib/shared/` and is copied into each mod at build time. The mods stop parsing work files and ask the kernel, and the two 700-line `register.tsx` files become wiring over a view, actions and data.

Item 07 is split in two: 07a the mods, 07b terminal styling.

## Today

| Mod | Files | Largest | Gets Picket data by |
|---|---|---|---|
| `status/` (band above the prompt) | 4 source, 3 tests | `register.tsx` 173 lines | running `picket next --latest` |
| `session/` (sessions and agents pane) | 3 source, 2 tests | `register.tsx` 712 lines | reading transcripts and artifacts itself |
| `markdown/` (file pane) | 6 source, 1 test | `register.tsx` 649 lines | reading `state.yaml` and artifacts itself |

Each mod is its own Claude Code plugin, and Claude Code copies a plugin's folder alone into its cache, so a mod cannot import from another mod or from `core/`. Copies by hand have drifted:

| Helper | Copies | Drift |
|---|---|---|
| `roleOf` | `status/hooks/register.tsx:13`, `session/hooks/format.ts:45` | same today |
| counting an artifact's phases | `session/hooks/format.ts:87` (`countPhases`, `null` when none), `markdown/hooks/work.ts:19` (`phaseCount`, `0`), and the kernel's parser | three rules |
| reading `state.yaml` | `markdown/hooks/work.ts:14` (`field`, a regex) | the kernel has `yaml-lite` |
| `prettyModel` | `core/lib/statusline.mjs:71`, `session/hooks/format.ts:49` | same today |
| `compactTokens` | `core/lib/statusline.mjs:77`, `session/hooks/format.ts:57` | 200 000 tokens: `200.0k` in one, `200k` in the other |
| time formats | `status/hooks/format.ts` (`elapsed`, `minutes`), `session/hooks/format.ts` (`clock`), `statusline.mjs` (`untilReset`) | four formats |

And:

- `session` hard-codes GitHub-dark hex values (`register.tsx:45-49`, `format.ts:9-16`) and sprite colours such as `0xff9139`, where `status` and `markdown` use Claude Code theme tokens and the brand orange is `#F9782B` (`core/lib/styling/palette.mjs`).
- `register` is 400 lines in `session` (`:312-712`) and in `markdown` (`:248-649`): view, actions and data loading in nested closures. `status` (173 lines) shows the shape the other two could have.
- `session` has no register test.
- Each mod's `types/index.d.ts` describes the kernel's JSON (`Work` in `status`) by hand next to the mod's own types (`Piece`, `Line`, `AgentRow`).
- Facts about the mods are spread: `.claude-plugin/plugin.json` per mod, `hooks/hooks.json` per mod (`{ "modules": ["./register.tsx"] }`), `.claude-plugin/marketplace.json`, the `files` list in `package.json`, `core/lib/init.mjs:17-21` (which mods `picket init` installs), and `.github/scripts/release.mjs` (whose `sync-version` rewrites four manifests).

## Target

### The list

```ts
// src/lib/mods.mts
export const MODS = {
  status:   { plugin: "picket-status",   description: "The open work item and its agents, above the prompt", install: "default" },
  markdown: { plugin: "picket-markdown", description: "Click a markdown file path in a reply to read it, read-only, in a pane beside the transcript", install: "default" },
  session:  { plugin: "picket-session",  description: "Sessions of this project and every agent of this one, in a docked sidebar", install: "opt-in" },
} as const;

export type ModName = keyof typeof MODS;
```

From it, the build writes for each mod `dist/mods/<name>/.claude-plugin/plugin.json` (name, version from `package.json`, description, author, `types`) and `dist/mods/<name>/hooks/hooks.json` (`{ "modules": ["./index.tsx"] }`), and the marketplace entries in `.claude-plugin/marketplace.json` next to the core plugin's. `picket init` reads `install` instead of its own list. `sync-version` no longer touches the mods; the build stamps the version.

### Source layout

```
src/lib/
  mods.mts                          the list
  shared/
    format.mts                      roleOf, prettyModel, compactTokens, elapsed, clock: one copy, import-free
    views.mts                       the kernel's JSON shapes (NextView, LatestView, StateView), types only, import-free
    styling/palette.mts             BRAND, already import-free
src/mods/
  shared/
    kernel.ts                       runPicket($, args): launchers (picket, cmd /c picket) and JSON parsing
    theme.ts                        Claude Code theme tokens for every UI colour
  status/
    hooks/   index.tsx band.ts band.test.ts index.test.tsx
    types/   index.d.ts             the mod's own types (Piece, Line, AgentRow)
  session/
    hooks/   index.tsx view.tsx actions.ts data.ts sprite.ts sessions.ts *.test.ts index.test.tsx
    types/   index.d.ts
  markdown/
    hooks/   index.tsx view.tsx actions.ts tree.ts links.ts markdown.ts *.test.tsx
    types/   index.d.ts
```

Each mod's entry is `hooks/index.tsx`, exporting `register`, as a verb's is `index.mts` and a hook's is `index.mts`.

### What the build produces

```
dist/mods/status/
  .claude-plugin/plugin.json        generated from MODS
  hooks/hooks.json                  generated: { "modules": ["./index.tsx"] }
  hooks/*.tsx, hooks/*.ts           copied from src/mods/status/hooks/
  types/index.d.ts                  copied
  shared/format.ts views.ts palette.ts   copied from src/lib/shared/
  shared/kernel.ts theme.ts         copied from src/mods/shared/
```

In `src/`, a mod imports shared code by its source path; the build rewrites two prefixes when it copies the mod, so the same import resolves in both places:

| Import in `src/mods/<name>/hooks/` | Resolves in `src/` to | Rewritten in `dist/mods/<name>/hooks/` to |
|---|---|---|
| `'../../shared/kernel'` | `src/mods/shared/kernel.ts` | `'../shared/kernel'` |
| `'../../../lib/shared/format.mts'` | `src/lib/shared/format.mts` | `'../shared/format'` |

The mods keep Claude Code's mod style (TSX, run by Claude Code itself, extensionless relative imports); C-002's `.mts` rule is for the kernel. A test after the build scans `dist/mods/**` for any import that still points outside its mod.

### Mods ask the kernel

```ts
// src/mods/session/hooks/data.ts
import { runPicket } from '../../shared/kernel'
import type { StateView } from '../../../lib/shared/views.mts'

export const phasesOf = async ($: EngineInterface, workId: string): Promise<number | null> =>
  (await runPicket<StateView>($, ['state', workId]))?.phase_count ?? null
```

`session` and `markdown` call `picket state <id>` as `status` already calls `picket next --latest`. `countPhases`, `phaseCount` and `field` go; a change to the work item format reaches the mods through the kernel. `views.mts` is the same file the kernel's `stateView` and `nextView` return types come from, so a changed JSON shape fails the type check in both.

### `register` becomes wiring

| Out of `register` | Into |
|---|---|
| the pane render (JSX) | `view.tsx` |
| switch, rename, delete, archive sessions; open, copy, scroll files | `actions.ts` |
| reading sessions, transcripts and agent rows | `data.ts` |
| the sprite (`session`) | `sprite.ts` |

`index.tsx` keeps atoms, subscriptions and opening the pane: about 100 to 170 lines, like `status/hooks/register.tsx` today. `session` gets `index.test.tsx` before the split.

### One palette, one format

UI colours come from Claude Code theme tokens (`src/mods/shared/theme.ts`), so the mods follow the user's theme; the sprite and brand accents use `BRAND` from `palette.mts`. `session`'s GitHub-dark values go. `compactTokens` has one format for the kernel's status line and the mods: `200k`, with one decimal only below 10k (`9.5k`), chosen by the user on 2026-10-22.

## Evidence (2026-10-22)

`status` copied to the scratchpad, with `format.ts`, `format.test.ts` and `palette.ts` moved from `hooks/` to a `shared/` folder at the plugin root and their imports changed to `'../shared/...'`:

```
claude plugin validate --strict .   ->  ✔ Validation passed
claude plugin test .                ->  23 pass, 0 fail, "Ran 23 tests across 3 files."
```

So a mod reads files from a sibling folder of `hooks/`, and its tests there run too. The same copy with `types/index.d.ts` moved to `hooks/types.ts` and the manifest's `types` pointing at it failed: `types: types must name a TypeScript declaration file ending in '.d.ts'`. Each mod keeps `types/index.d.ts`.

The test runner output (`(pass) format > elapsed reads seconds, ...`) is Bun's: Claude Code runs mods on Bun, which is why the mods' style differs from the kernel's.

## Decisions

### M-1: Item 07 splits into 07a mods and 07b styling

### M-2: `src/lib/mods.mts` lists the mods; the build writes their manifests
`plugin.json`, `hooks.json` and the marketplace entries come from the list; `picket init` reads `install`; `sync-version` stops rewriting mod manifests. The user asked for a structure like the verbs' and the hooks' on 2026-10-22.

### M-3: One folder per mod, entry `hooks/index.tsx`
`src/mods/<name>/hooks/` and `types/index.d.ts`, built into `dist/mods/<name>/` with the shared files copied in; marketplace sources point at `./dist/mods/<name>`.

### M-4: Shared code exists once
Kernel and mods: `src/lib/shared/format.mts`, `views.mts`, `styling/palette.mts`, all import-free and copied into each mod. Mods only: `src/mods/shared/kernel.ts`, `theme.ts`. The build rewrites the two import prefixes, and a test checks no import in `dist/mods/**` leaves its mod.

### M-5: Mods read Picket data from the kernel
Through `picket state` and `picket next` via `runPicket`; no mod parses `state.yaml` or an artifact.

### M-6: `session` and `markdown` split `register`
Into `index.tsx` (wiring), `view.tsx`, `actions.ts`, `data.ts` (and `sprite.ts`); `session` gets its register test first.

### M-7: Theme tokens for the UI, brand hex for the sprite
From `theme.ts` and `palette.mts`.

### M-8: `compactTokens` prints `200k`, one decimal below 10k
One format for the status line and the mods; chosen by the user.

### M-9: Mods keep Claude Code's mod style
TSX on Bun, extensionless relative imports; the kernel's `.mts` conventions do not apply inside `src/mods/`.

## Migration

### Phase 1: list and build
- `src/lib/mods.mts`; the build writes the manifests, `hooks.json` and the marketplace entries; `picket init` reads `install`.
- Move `status/`, `session/`, `markdown/` to `src/mods/<name>/`, `register.tsx` to `hooks/index.tsx`; `package.json` `files` and the `test:<mod>` scripts point at `dist/mods/<name>`.
- `src/lib/shared/format.mts` and `views.mts`; the copy and the two import rewrites; the leak test over `dist/mods/**`.
- `claude plugin validate --strict` and `claude plugin test` pass for all three built mods (run by `scripts/test.mjs`, item 06).

### Phase 2: inside the mods
- `runPicket` in `src/mods/shared/kernel.ts`; `session` and `markdown` read through `picket state`; `countPhases`, `phaseCount`, `field` go.
- `session`'s register test, then the `register` splits for `session` and `markdown`.
- `theme.ts`; `session` moves to theme tokens and `BRAND`.
- One `compactTokens`, `prettyModel`, `roleOf` and time format in `format.mts`; the kernel's status line and the mods use them; tests for `200k`, `9.5k` and `950`.

## Risks

- R-1: the import rewrite is a build-time text change in TSX that Claude Code then compiles. Two fixed prefixes only, a leak test, and `claude plugin test` on the built folders guard it.
- R-2: calling `picket state` from `session` and `markdown` adds a process per refresh where they read files today. `status` already does it on a timer; the calls run only when the work item changes or a pane opens.
- R-3: theme tokens change `session`'s look slightly for users on a theme that is not GitHub-dark; that is the point (it follows their theme).
- R-4: marketplace source paths change (`./status` to `./dist/mods/status`); an installed mod updates with the plugin, as in item 01 for the core.

## Affects

- 01: the build copies and stamps the mods; `package.json` `files` lists `dist/` only.
- 04d: the kernel's status line takes `compactTokens`, `prettyModel` and the time formats from `shared/format.mts`.
- 06: `scripts/test.mjs` runs `claude plugin test` on `dist/mods/<name>`; mod tests stay beside their code (C-017).
- 07b: `palette.mts` is shared with the mods.
- 09: `.github/scripts/release.mjs` stops rewriting mod manifests.

## Open questions

None.
