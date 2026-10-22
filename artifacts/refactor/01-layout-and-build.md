# 01: Layout and build

Status: approved (2026-10-22).

Picket's code moves to TypeScript source in `src/` and is built into a `dist/` folder that is the plugin and the npm package. Users still get plain `.mjs`, on Node 22 or newer; contributors edit `src/` and a build of under one second produces `dist/`. A prototype of this item passed 716 of 728 tests with path changes only.

## Today

All code is hand-written `.mjs` inside the plugin folder `core/`, which is also tracked source. Nothing is built.

```
core/
  .claude-plugin/plugin.json
  bin/picket, bin/picket.cmd     shims: node picket.mjs
  bin/picket.mjs                 424 lines, imports 28 lib modules eagerly
  hooks/hooks.json               node ${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs
  hooks/<name>.mjs               14 shells of 4 lines
  lib/*.mjs, lib/hooks/*.mjs, lib/styling/**/*.mjs
  lib/vendor/*.mjs               jsonc-parser, shell-quote (licence headers)
  skills/*/scripts/*.mjs         two import ../../../lib/*.mjs
  agents/ rules/ skills/ output-styles/ templates/ themes/
```

The folder name `core` reaches users nowhere: `picket init` installs `picket@picketai` by name, hooks resolve through `${CLAUDE_PLUGIN_ROOT}`, and no settings file gets a `core` path. Inside the repository about 125 files mention `core/` (tests 52, bench 45, `.claude/` 16, docs 7, plus `package.json`, `CLAUDE.md`, the README, `CONTRIBUTING.md` and the release workflow).

A hook loads its handler and every import file by file: `guard.bash` opens 22 modules.

## Target

```
src/                              hand-written, tracked
  .claude-plugin/plugin.json
  bin/picket  bin/picket.cmd      shims, copied as is
  bin/picket.mts
  hooks/hooks.json                copied as is
  hooks/<name>.mts                entry shells, still 4 lines
  lib/**/*.mts                    one module per file
  lib/vendor/*.mjs  *.d.mts       copied as is, typed by a declaration
  skills/<name>/scripts/*.mts
  agents/ rules/ skills/ output-styles/ templates/ themes/
scripts/build.mjs                 the build
scripts/watch.mjs                 the build on save
tsconfig.json
dist/                             generated whole, ignored by git, shipped
```

What each consumer reads:

| Consumer | Reads | Change |
|---|---|---|
| Claude Code (marketplace) | `dist/` | `"source": "./dist"` in `.claude-plugin/marketplace.json` |
| npm | `dist/` | `"files": ["dist/", ...]`, `"bin": { "picket": "dist/bin/picket.mjs" }` |
| `hooks.json` | `${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs` | none; each file is now a bundle |
| `npm run claude` | `--plugin-dir dist`, `dist/bin` first on PATH | two paths in `scripts/claude.mjs` |
| Tests, bench | `dist/lib/*.mjs`, `dist/bin/picket.mjs` | path rewrite; tests that read source read `src/` |
| Skill scripts | `../../../lib/*.mjs` | none, the relative layout is kept |
| `paths.mjs` plugin root | `dirname(dirname(import.meta.url))` | none, see risk R-4 |

### A module before and after

`core/lib/leave.mjs` becomes `src/lib/leave.mts`. The import keeps the output name `./work.mjs`; with `module: nodenext` TypeScript resolves it to `work.mts`, so renaming a file to `.mts` changes none of its importers.

```ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readState, workDir } from "./work.mjs";

export class LeaveRefused extends Error {}

export type LeftEntry = { ts: string; command: string; why: string | null };
type LeaveInput = { command?: unknown; why?: unknown };

export function leave(id: string, root: string, { command, why }: LeaveInput = {}): LeftEntry {
```

The built `dist/lib/leave.mjs`, as esbuild printed it in the prototype:

```js
// generated from src/ by scripts/build.mjs; edit the source
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readState, workDir } from "./work.mjs";
const LEFT_FILE = "left.jsonl";
const MAX_COMMAND_CHARS = 300;
const CLOSED_STATUSES = /* @__PURE__ */ new Set(["done", "abandoned"]);
class LeaveRefused extends Error {
}
function leave(id, root, { command, why } = {}) {
```

esbuild reprints the code: exports gather in one `export { ... }` at the end and comments are dropped. That is fine for output nobody edits.

### A hook before and after

The source shell stays four lines:

```ts
import { runHook } from "../lib/hook.mjs";
import { guardSilenced } from "../lib/hooks/guard.silenced.mjs";
await runHook(guardSilenced);
```

`dist/hooks/guard.silenced.mjs` is one self-contained file. The handler's two lazy `await import("../config.mjs")` and `await import("../work.mjs")` become esbuild `__esm` wrappers: parsed with the file, evaluated only when called.

### The build

One emitter (esbuild), one checker (`tsc`). Contributors run Node 24 or newer (decision L-5), so the script can use `fs.globSync`.

```js
import { build } from "esbuild";
import { cpSync, globSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = "src";
const OUT = "dist";
const BANNER = { js: "// generated from src/ by scripts/build.mjs; edit the source" };
const COMMON = { format: "esm", platform: "node", target: "node22", outExtension: { ".js": ".mjs" }, banner: BANNER, logLevel: "warning" };

const isHookEntry = (path) => relative(join(SRC, "hooks"), path).split(sep).length === 1 && /\.m[jt]s$/.test(path);

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true, filter: (path) => !path.endsWith(".mts") && !isHookEntry(path) });
await build({ ...COMMON, entryPoints: globSync(`${SRC}/**/*.mts`).filter((p) => !isHookEntry(p)), outbase: SRC, outdir: OUT });
await build({ ...COMMON, entryPoints: globSync(`${SRC}/hooks/*.m[jt]s`), outdir: join(OUT, "hooks"), bundle: true });
```

```json
"engines": { "node": ">=22" },
"devEngines": { "runtime": { "name": "node", "version": ">=24", "onFail": "error" } },
"scripts": {
  "build": "node scripts/build.mjs",
  "watch": "node scripts/watch.mjs",
  "typecheck": "tsc -p .",
  "prepare": "npm run build",
  "prepack": "npm run build",
  "test": "npm run build && npm run typecheck && node scripts/test.mjs",
  "claude": "npm run build && node scripts/claude.mjs"
}
```

```json
{
  "compilerOptions": {
    "module": "nodenext", "target": "es2022", "strict": true,
    "allowJs": true, "checkJs": false, "noEmit": true,
    "skipLibCheck": true, "types": ["node"]
  },
  "include": ["src"]
}
```

Dev dependencies, pinned exactly: `esbuild`, `typescript`, `@types/node` at the 22 line (the user floor, so the checker rejects an API newer than what users run). None ships. `.nvmrc` holds `24`.

## Evidence (prototype, 2026-10-22)

The repository was copied to the scratchpad, `core` moved to `src`, built into `dist`, and consumers repointed with a plain path rewrite.

Tests: 716 of 728 pass unchanged. The 12 failures are all paths, none is runtime behaviour:

| Tests | Cause | Fix in this item |
|---|---|---|
| 1, 9 | `bench/adapters/plugin.mjs` still names `core/.claude-plugin` | path rewrite missed one folder |
| 58, 446, 448 | read hook shells and kernel source; `dist/hooks` now holds bundles | read `src/` |
| 474 | checks the git mode of the `picket` shim, which `dist/` no longer tracks | check `src/bin/picket` |
| 700, 701 | docs cite `core/...` paths | update the docs |
| 709, 710 | `.github/scripts/release.mjs` writes `core/.claude-plugin/plugin.json` | write `src/.claude-plugin/plugin.json` |
| 47 | `CLAUDE.md` over budget | a CRLF artefact of the copy only; the real file is 2047 of 2048 bytes and the edit keeps its length |

Hook cold start, 60 interleaved runs each, same folder, Node 22.18 (the cleaner run):

| | Bare node | Today | Bundled | Bundled + compile cache |
|---|---|---|---|---|
| `guard.bash` median | 44 ms | 73 ms | 59 ms | 58 ms |
| `inject.state` median | 44 ms | 72 ms | 65 ms | 66 ms |

A later quiet run, 40 interleaved runs per Node line, gave `guard.bash` today against bundled: Node 20.11 76 to 62 ms, 22.18 73 to 59, 24.22 76 to 63, 26.12 71 to 59. Bare startup was 43 to 48 ms on all four lines, so the Node version itself buys no speed; an earlier noisy Node 20 run (201 to 154 ms) is discarded. Bundling cuts the hook's own share above bare Node by about half for `guard.bash` (29 to 15 ms). A first run with the files in `%TEMP%` showed bundles slower; that was the virus scanner reading the temporary folder, and same-folder runs remove it.

Other numbers: the build takes 730 ms; `tsc` checks all of `src/` in 961 ms (TypeScript 7.0.2); the npm package grows from 483 to 722 KB packed (1316 to 2202 KB unpacked), because each of the 14 hook bundles carries its own copy of the shared modules (largest: `guard.bash.mjs`, 112 KB).

Converting `leave.mjs` alone to `.mts` failed the check: `leave.mts(22,11): error TS2339: Property 'status' does not exist on type '{}'`, because `readState` in the still unconverted `work.mjs` is inferred as `{}`. Conversion order matters (decision L-4).

## Decisions

### L-1: `src/` is the source, `dist/` the generated plugin
Everything hand-written, Markdown and JSON included, lives in `src/`; `dist/` is built whole, ignored by git, and never edited. Why: the standard layout for npm packages written in TypeScript, one ignore line, one deny rule, and a plugin folder that is output only. Rejected: mirroring into `core/` (tracked and generated files mixed in one folder), `core/` as source with `dist/` as output (`src/` is what readers expect; "Core" stays a concept in the glossary).

### L-2: esbuild emits, `tsc` only checks
The build copies every file that is not `.mts` (Markdown, JSON, shims, vendor, not yet converted `.mjs`) verbatim, transforms each `.mts` to `.mjs` one module per file, and bundles each hook entry. `tsc -p .` checks with `noEmit`. Why: one emitter for both modes, under a second for the whole tree. Rejected: `tsc` emitting modules with esbuild only bundling (two emitters to keep in step).

### L-3: Bundle the hooks, nothing else
Each `src/hooks/<name>.mts` becomes one file in `dist/hooks/`. The CLI, the skill scripts and `dist/lib` stay one module per file. Why: hooks have the hard 200 ms budget and run on every tool call; bundling saved 14 ms median on `guard.bash`. The CLI bundle showed no clear gain in the noise and would hide the lazy styling imports and the module files the tests import.

### L-4: Convert bottom-up, as items touch the code
This item converts nothing: files move to `src/` keeping `.mjs`, with `checkJs` off. A later item renames a module to `.mts` and makes it `strict` clean, and converts its imports first (leaves of the import graph before their importers), or the strict file inherits `{}` types from its JavaScript neighbours. Why: the 89 errors that `checkJs` finds today get fixed where each module is redesigned anyway, not in a separate pass.

### L-5 (r2): Node 22 for users, the latest LTS for contributors
Users: `engines` is `>=22`, every line Node still supports (22 until 2027-04-30, 24, and 26 from 2026-10-28); Node 20 is past end of life since 2026-04-30. esbuild targets `node22` and `@types/node` follows the 22 line. Contributors: `devEngines` requires `>=24` with `onFail: "error"` and `.nvmrc` holds `24`, so build and test scripts may use newer APIs such as `fs.globSync`; move both to 26 once it is LTS. `engines` only makes npm warn, so `runHook` and the CLI entry check `process.versions.node` first and print one line, for example `Picket needs Node 22 or newer; this is 20.11.1`; a hook that finds an old Node returns nothing and does no other work. Why: the Node line buys no speed (startup 43 to 48 ms on 20, 22, 24 and 26 alike), so the floor follows Node's support schedule. Rejected: requiring the newest line (turns away users on a supported LTS for no gain); shipping Node as an npm dependency (Claude Code copies only `dist/` into its plugin cache, so hooks would still run the `node` on PATH; tens of MB per platform through an install script; Picket would own Node's security fixes).

### L-6: No compile cache
`module.enableCompileCache()` measured 58 against 59 ms and 66 against 65 ms, and needs a loader file per hook plus a cache folder outside the plugin root. Dropped.

### L-7: Guard rails against editing `dist/`
Every built JavaScript file starts with the generated-file banner (allowed by the comments rule). `.claude/settings.json` denies `Edit(dist/**)` and `Write(dist/**)`. `prepare` builds after every `npm install`, so a fresh clone works; `prepack` builds before publishing; `npm test` and `npm run claude` build first; `npm run watch` rebuilds on save, esbuild in watch mode for code and a copy on change for the rest.

### L-8: No source maps
Hooks swallow their own errors and the CLI prints only the message, so a map adds size without a reader. Revisit if a stack trace from `dist/` is ever needed.

## Migration

One item, three phases.

### Phase 1: move and build
- `git mv core src` (history stays reachable with `git log --follow`).
- Add `tsconfig.json`, `scripts/build.mjs`, `scripts/watch.mjs`, the dev dependencies and the scripts above.
- `package.json`: `bin`, `files`; `.claude-plugin/marketplace.json`: `"source": "./dist"`; `.github/scripts/release.mjs`: manifest path under `src/`.
- `scripts/claude.mjs`: `--plugin-dir dist` and `dist/bin` on PATH.
- `.gitignore`: `dist/`. `.claude/settings.json`: the two deny rules.
- Add the `.d.mts` declarations for the two vendored parsers.
- `engines` `>=22`, `devEngines` `>=24`, `.nvmrc`; the Node version check at the start of `runHook` and in `src/bin/picket.mts` before it loads the dispatcher (see R-8), with a test for each that fakes an old version.

### Phase 2: repoint consumers
- Tests and bench: runtime paths to `dist/`; the four tests that read source or git modes (58, 446, 448, 474) to `src/`; `bench/adapters/plugin.mjs`.
- `test/budgets.test.mjs` keeps timing `dist/hooks/*.mjs`, the files that run.
- Docs: `README.md` layout block, `CONTRIBUTING.md`, `docs/*.md`, `.claude/rules/harness-authoring.md` path globs, the `CLAUDE.md` line `harness-authoring loads by path (.claude/**, src/**)` (same byte count).
- `.claude/MEMORY.md`: amend the 2026-10-04 decision "the plugin folder is `core/` itself, no build step" with the new layout.

### Phase 3: prove the real install
- `npm test` green, `npm run typecheck` green.
- `npm pack`, install the tarball globally into a temporary prefix, run `picket init` in a temporary project, start a session, and see the hooks fire from `dist/`.
- `npm run claude` in this repository starts with the built plugin.

## Risks

- R-1: an agent or a person edits `dist/` and the next build erases it. Banner, deny rule, and `dist/` ignored by git, so the edit never reaches a commit.
- R-2: during work on Picket itself, the session runs the last build. `npm run claude` builds at start; the developer's drive and `npm test` build first; `npm run watch` covers the rest.
- R-3: the `picket` shim must stay executable. `cpSync` keeps the mode on POSIX; test 474 checks `src/bin/picket` in git.
- R-4: `pluginRoot()` in `paths.mjs` works because both `dist/lib/paths.mjs` and every bundle in `dist/hooks/` sit one level below `dist/`. That is luck, not design; item 02 turns it into a stated rule with a test.
- R-5: TypeScript 7 is a new major (the native compiler). If it misbehaves, pin the 5.x line; the source is the same.
- R-6: the package grows by about 240 KB packed. esbuild `splitting` would share chunks across hooks, but brings back several files per hook; not worth it at this size.
- R-7: a user still on Node 20 loses support. The check names the problem in one line instead of a stack trace; the release note says it.
- R-8: the check only helps if Node 20 can still parse the file it sits in. A Node 22 API is caught by the check; Node 22 only syntax would fail at parse time, before it. Hooks then stay silent, which is safe, but the CLI would print a parse error. To keep the CLI message, the check sits in `src/bin/picket.mts` before its first dynamic import of the dispatcher; the test fakes the version rather than running a real Node 20.

## Affects

- 02 code conventions: R-4, typed result shapes, and the conversion order of L-4.
- 05 hooks: splitting `guard.bash.mjs` into modules costs nothing at runtime once hooks are bundled; the handler-imports-handler finding stays a structure issue only.
- 06 tests: which tests read `src/` and which read `dist/` becomes a rule.
- 08 instructions and docs: paths in docs follow phase 2.
- 09 hygiene: `.gitignore` regrouping includes `dist/`.

## Open questions

- Q-1: resolved 2026-10-22, the user chose the Node 22 floor (L-5 r2).
- Q-2: resolved 2026-10-22, the user chose TypeScript 7.

## Revision log

- 2026-10-22: L-5 (r2): floor raised from Node 20 to 22, contributors on 24 or newer, runtime check added; the user chose it after the Node line timings.
