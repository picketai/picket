---
kind: design
lane: design
title: Refactor item 01, layout and build
date: 2026-10-22
audience: developer
sources: [request.md, artifacts/refactor/01-layout-and-build.md, artifacts/refactor/00-conventions.md, artifacts/refactor/02-code-conventions.md, artifacts/refactor/03-kernel-cli.md, artifacts/refactor/05-hooks.md, artifacts/refactor/06-tests.md, artifacts/refactor/09-hygiene.md, package.json, .gitignore, .gitattributes, .claude/settings.json, .claude-plugin/marketplace.json, .claude/MEMORY.md, scripts/claude.mjs, scripts/test.mjs, .github/workflows/release.yml, .github/scripts/release.mjs, core/bin/picket.mjs, core/bin/picket, core/bin/picket.cmd, core/lib/hook.mjs, core/lib/paths.mjs, core/lib/init.mjs, core/lib/verify.mjs, core/hooks/guard.silenced.mjs, core/hooks/README.md, test/kernel/plugin-layout.test.mjs, test/markdown-paths.test.mjs, test/budgets.test.mjs, npm registry (esbuild 0.28.2, typescript 7.0.2, @types/node 22.20.5), Node 24.22.1 probe of process.versions]
phases:
  - n: 1
    files: [src/bin/picket.mts, src/bin/dispatch.mjs, src/bin/picket, src/bin/picket.cmd, src/lib/node-floor.mjs, src/lib/hook.mjs, src/hooks/hooks.json, src/.claude-plugin/plugin.json, src/lib/vendor/jsonc-parser.d.mts, src/lib/vendor/shell-quote-parse.d.mts, scripts/build.mjs, scripts/watch.mjs, tsconfig.json, .nvmrc, test/build.test.mjs, test/kernel/node-floor.test.mjs]
    greps:
      - path: package.json
        pattern: '"picket": "dist/bin/picket\.mjs"'
      - path: package.json
        pattern: '"node": ">=22"'
      - path: package.json
        pattern: '"onFail": "error"'
      - path: package.json
        pattern: '"typecheck": "tsc -p \."'
      - path: package.json
        pattern: '"prepare": "npm run build"'
      - path: package.json
        pattern: '^(?![\s\S]*"core/)'
        flags: i
      - path: .nvmrc
        pattern: '^24\b'
      - path: .claude-plugin/marketplace.json
        pattern: '"source": "\./dist"'
      - path: .gitignore
        pattern: '^dist/'
      - path: .gitattributes
        pattern: '^src/bin/picket text eol=lf'
      - path: .claude/settings.json
        pattern: '"Edit\(dist/\*\*\)"'
      - path: .claude/settings.json
        pattern: '"Write\(dist/\*\*\)"'
      - path: tsconfig.json
        pattern: '"noEmit": true'
      - path: tsconfig.json
        pattern: '"erasableSyntaxOnly": true'
      - path: src/bin/picket.mts
        pattern: 'import\("\./dispatch\.mjs"\)'
      - path: src/lib/node-floor.mjs
        pattern: 'export function checkNodeFloor\b'
      - path: src/lib/hook.mjs
        pattern: 'checkNodeFloor\('
      - path: scripts/build.mjs
        pattern: 'target: "node22"'
      - path: scripts/claude.mjs
        pattern: '"--plugin-dir", "dist"'
      - path: .github/workflows/release.yml
        pattern: 'node-version: 24\b'
      - path: .github/scripts/release.mjs
        pattern: 'src/\.claude-plugin/plugin\.json'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [README.md, CONTRIBUTING.md, src/hooks/README.md, test/markdown-paths.test.mjs]
    greps:
      - path: README.md
        pattern: 'scripts/build\.mjs'
      - path: README.md
        pattern: 'scripts/watch\.mjs'
      - path: CONTRIBUTING.md
        pattern: 'npm run watch'
      - path: CONTRIBUTING.md
        pattern: 'npm run typecheck'
      - path: CONTRIBUTING.md
        pattern: '\.nvmrc'
      - path: src/hooks/README.md
        pattern: 'node dist/hooks/'
    tests: true
    drive: false
    security: false
  - n: 3
    files: [test/package.test.mjs]
    greps:
      - path: test/package.test.mjs
        pattern: '--ignore-scripts'
      - path: test/package.test.mjs
        pattern: 'dist/bin/picket\.mjs'
    tests: true
    drive: true
    security: false
---
# Design: Refactor item 01, layout and build

## Problem

Picket's code is hand-written `.mjs` inside the plugin folder `core/`, which is also tracked source, so nothing is built and every hook loads its modules file by file (`guard.bash` opens 22). The user approved item 01 (`artifacts/refactor/01-layout-and-build.md`, decisions L-1 to L-8 with its revision log) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`); this record carries them into phases and re-decides nothing. Binding constraints: `src/` is the source and a generated, ignored `dist/` is the plugin and the npm package (C-001); users run on Node 22, contributors on Node 24 (C-004 r2); this item converts no module (L-4), and later items 02 to 09 keep their own scope, so where their revision lines amend item 01 this record names which phase of which item lands the change. Every phase leaves `npm test` green on trunk, which forces every path consumer to move in the same phase as the files.

## Decisions

### D-001: `src/` is the source, `dist/` the generated plugin
**Decision:** Infrastructural decision, carrying L-1 and C-001. `git mv core src` moves the whole tree (history stays reachable with `git log --follow`); `dist/` is built whole and never edited. Consumers move as the draft's table says: `.claude-plugin/marketplace.json` serves `picket` from `./dist`; `package.json` has `"bin": { "picket": "dist/bin/picket.mjs" }` and `dist/` replaces `core/` in `files` (the mod entries stay until item 07a); `scripts/claude.mjs` passes `--plugin-dir dist` and puts `dist/bin` first on PATH; `hooks.json` and `paths.mjs` are unchanged, because `pluginRoot()` still sits one level below the plugin folder (draft R-4). `init.mjs` `marketplaceRoot()` is `dirname(pluginRoot())`, the package root, which still holds `.claude-plugin/marketplace.json` (read 2026-10-22).
**Instead of:** `core/` as the source with `dist/` as output: `src/` is what readers expect, and "core" stays a glossary concept (L-1).
**Risks:**
- **RISK-001** `pluginRoot()` is right by luck of depth (draft R-4). Mitigation: `test/kernel/paths.test.mjs` asserts it from `dist/lib`; item 02 K-13 replaces it with a walk up to `.claude-plugin/plugin.json`.
- **RISK-002** This session was started with `--plugin-dir core` and `core/bin` first on PATH, so at the `git mv` its plugin hooks stop and `picket` falls back to the global `@picketai/picket@1.0.0-alpha.3`. Mitigation: after the move the developer runs the kernel as `node dist/bin/picket.mjs`; the phase 1 gate asks the user to restart with `npm run claude` (which builds and loads `dist/`) before the approval is routed.

### D-002 (r2): esbuild emits, `tsc` only checks
**Decision:** Infrastructural decision, carrying L-2 and C-002. `scripts/build.mjs` removes `dist/`, copies every file under `src/` that is not `.mts` and not a hook entry, builds each `src/**/*.mts` except `*.d.mts` and `*.test.mts` to one `.mjs` (esbuild, `format: "esm"`, `platform: "node"`, `target: "node22"`, `outbase: "src"`, no bundling), and bundles the hook entries (D-003). It stops with an error naming both files when one folder holds `x.mjs` and `x.mts`, since both would write `dist/.../x.mjs`. `npm run typecheck` is `tsc -p .` with the draft's `tsconfig.json` plus `erasableSyntaxOnly: true` (01 revision log, item 02 K-8). L-2 (r2)'s `bundle: true`, `packages: "external"`, the import-rewriting plugin and `allowImportingTsExtensions` land with item 03 phase 1 (X-11), which lists them in its own migration; here the only `.mts` entry, `src/bin/picket.mts`, imports `.mjs` files that exist under the same name in `src/` and `dist/`, so C-002 (r2) holds with no rewrite.
**Instead of:** `tsc` emitting modules with esbuild only bundling: two emitters to keep in step (L-2).
**Risks:**
- **RISK-003** TypeScript 7.0.2, the pinned checker, is a new major and may misbehave (draft R-5). Mitigation: 7.0.2 stays the pin; only if it misbehaves, fall back to pinning the 5.x line, since the source is the same.

### D-003: Bundle the hooks, nothing else
**Decision:** Infrastructural decision, carrying L-3, L-6 and L-8. Each `src/hooks/<name>.mjs` entry becomes one self-contained `dist/hooks/<name>.mjs`; the CLI, skill scripts and `dist/lib` stay one module per file. No compile cache and no source maps.
**Instead of:** bundling the CLI too: no clear gain in the timings, and it would hide the lazy styling imports and the module files the tests import (L-3, kept by item 03 X-4).
**Risks:**
- **RISK-004** The package grows by about 240 KB packed, since each of the 14 bundles carries its own copy of shared modules (draft R-6). Mitigation: accepted; phase 3 records the packed size.

### D-004: Convert nothing; only new code is `.mts`
**Decision:** Infrastructural decision, carrying L-4 and C-003. Every moved file keeps `.mjs`, `checkJs` stays off, and the hook shells stay `.mjs` (item 05 H-10 removes `src/hooks/` later). The one new TypeScript entry is `src/bin/picket.mts` (D-006, item 03 X-9). The two vendored parsers gain `.d.mts` declarations so later strict modules get real types; declarations are never copied to `dist/`.
**Instead of:** converting while moving: the 89 errors `checkJs` finds today get fixed where each module is redesigned (L-4).
**Risks:**
- **RISK-005** A strict `.mts` inherits `{}` types from unconverted neighbours (draft evidence, `leave.mts`). Mitigation: C-003 bottom-up order in items 02 to 05.

### D-005: Node 22 for users, Node 24 for contributors
**Decision:** Infrastructural decision, carrying L-5 (r2) and C-004 (r2). `engines.node` is `>=22`; `devEngines.runtime` is `{ "name": "node", "version": ">=24", "onFail": "error" }`; `.nvmrc` holds `24`; esbuild targets `node22`. Dev dependencies pinned exactly, as read from npm on 2026-10-22: `esbuild` 0.28.2, `typescript` 7.0.2, `@types/node` 22.20.5. `.github/workflows/release.yml` moves `setup-node` to 24, because `npm ci` refuses under `devEngines` on 22 (item 06 evidence); the Node 22 floor job is item 06 T-8.
**Instead of:** requiring the newest Node line, or shipping Node as a dependency: the first turns away users on a supported LTS for no speed, the second still runs the `node` on PATH from the plugin cache (L-5).
**Risks:**
- **RISK-006** Until item 06 adds the floor job, CI never runs `dist/` on Node 22. Mitigation: `@types/node` on the 22 line makes `tsc` reject newer APIs in `.mts` code, and moved `.mjs` code is unchanged from what alpha.3 shipped for Node 20.

### D-006: One Node check, run first by both entry points
**Decision:** Infrastructural decision, carrying L-5 and draft R-8. New `src/lib/node-floor.mjs` imports nothing and exports `NODE_FLOOR` (22) and `checkNodeFloor(version: string): string | null`, which returns `Picket needs Node 22 or newer; this is 20.11.1` for version `20.11.1` and `null` from 22.0.0 up. `runHook` calls it before reading stdin; on a message it writes the line to stderr, writes nothing to stdout or the ledger, and exits 0. `src/bin/picket.mts` statically imports only `node-floor.mjs`; on a message it writes the line to stderr and exits 1, otherwise it runs `await import("./dispatch.mjs")`. Today's 424-line `core/bin/picket.mjs` moves unchanged to `src/bin/dispatch.mjs`; it calls `main` at top level, so the dynamic import runs it. The module is `.mjs`, an exception to C-002's "new modules are `.mts`", because the copied `src/lib/hook.mjs` can only import a name that exists in both `src/` and `dist/` until item 03's rewrite plugin; it converts with `runHook` in item 05 (`run-hook.mts`).
**Instead of:** an inline check in each entry: two copies of the floor and the message that can drift.
**Risks:**
- **RISK-007** Node 20 must parse every file before the check. Mitigation: `node-floor.mjs` and `picket.mts` use no syntax newer than Node 20, and the dispatcher loads only after the check (R-8). Tests fake the version with an `--import` preload that redefines `process.versions.node`, which is configurable on Node 24.22.1 (probed 2026-10-22).

### D-007: Guard rails against editing `dist/`
**Decision:** Infrastructural decision, carrying L-7, C-005 and item 09 Z-4. Every `.mjs` in `dist/`, built or copied, starts with `// generated from src/ by scripts/build.mjs; edit the source` (on line 2 when line 1 is a shebang). `.gitignore` lists `dist/`; `.claude/settings.json` gains `deny: ["Edit(dist/**)", "Write(dist/**)"]`. `prepare` and `prepack` run the build, `npm test` is build, typecheck, then `node scripts/test.mjs`, and `npm run claude` builds first. `scripts/build.mjs` exports its option objects and copy function and builds only when run directly (the idiom of `scripts/claude.mjs`); `scripts/watch.mjs` imports them and runs esbuild watch contexts for the module and hook builds plus a recursive `fs.watch` that copies other changed files.
**Instead of:** a watch that reruns the whole build on any change: it deletes `dist/` while a session runs hooks from it.
**Risks:**
- **RISK-008** A session runs a stale build (draft R-2). Mitigation: `npm run claude` and `npm test` build first; `npm run watch` covers the rest.
- **RISK-009** A Bash write into `dist/` passes the deny rules. Mitigation: the banner and the ignore line keep such an edit out of every commit (draft R-1).

### D-008: Runtime consumers read `dist/`, source scans read `src/`
**Decision:** Infrastructural decision, carrying the draft's consumer table. A test, bench file or script that imports a kernel module or spawns the CLI or a hook uses `dist/`; one that reads Markdown, JSON, hook shells, kernel source text or git modes uses `src/`. Every `core/` mention outside `work/`, `artifacts/`, `bench/results/`, `docs/design/` and the labelled request texts in `test/kernel/admit-labelled.json` moves in phase 1, because `test/markdown-paths.test.mjs` fails on a cited path that no longer exists.
**Instead of:** tests importing `src/` directly: the bundles that ship would go untested (item 06 T-2 moves unit tests to `src/` once they are `.mts`).
**Risks:**
- **RISK-010** A test passes against a stale `dist/`. Mitigation: `npm test` builds first, and `test/build.test.mjs` checks the output shape.

## Scope

**In:**
- The move to `src/`, the build, the watch, the type check, the Node floors and the Node check (D-001 to D-007).
- Every path consumer: tests, bench, scripts, CI, settings, docs and memories that cite `core/` (D-008).
- Contributor documentation of the build, and a proof of the packed install.

**Out:**
- Converting any module to `.mts` beyond `src/bin/picket.mts` (items 02 to 05).
- The import-rewriting build plugin and `allowImportingTsExtensions` (item 03 phase 1, X-11).
- Generated hook entries and `hooks.json`, removing `src/hooks/` (item 05 H-10).
- The Node 22 CI job, the parallel runner, tests beside code (item 06).
- Moving the mods into `src/mods/` (item 07a); `"type": "module"`, other `.gitignore` regrouping and agent memory content refresh (item 09).

## Phase 1: Move, build and repoint

**Touch set:**
- `core/` to `src/`: `git mv`, whole tree, history kept
- `src/bin/picket.mjs` to `src/bin/dispatch.mjs`: dispatcher renamed, body unchanged
- `src/bin/picket.mts`, `src/lib/node-floor.mjs`, `src/lib/hook.mjs`: the Node check (D-006)
- `src/lib/vendor/jsonc-parser.d.mts`, `src/lib/vendor/shell-quote-parse.d.mts`: new declarations
- `scripts/build.mjs`, `scripts/watch.mjs`, `tsconfig.json`, `.nvmrc`: new build files
- `package.json`, `package-lock.json`: bin, files, engines, devEngines, scripts, devDependencies
- `.claude-plugin/marketplace.json`, `scripts/claude.mjs`: point at `dist/`
- `.github/workflows/release.yml`, `.github/scripts/release.mjs`: Node 24, manifest under `src/`
- `.gitignore`, `.gitattributes`, `.claude/settings.json`: `dist/`, LF shim, deny rules
- `.claude/bin/statusline.mjs`, `.claude/rules/harness-authoring.md`, `.claude/MEMORY.md`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `docs/how-to.md`: `core/` mentions
- `.claude/agent-memory/picket-architect/block-format-couplings.md`, `guard-log-replay.md`, `npm-pack-facts.md`, `record-edits-ride-phase-commits.md`, `statusline-contract.md`, `verify-grep-patterns.md` (same folder), `.claude/agent-memory/picket-developer/feedback-files-line.md`, `.claude/agent-memory/picket-reviewer/probe-guards-directly.md`: path mentions only
- `bench/adapters/plugin.mjs`, `bench/test/adapters.test.mjs`, `bench/test/tasks.test.mjs`: plugin dir `dist`
- `test/budgets.test.mjs`, `test/claude-launcher.test.mjs`, `test/markdown-paths.test.mjs`, `test/names-picket.test.mjs`, `test/release.test.mjs`: repoint
- `test/hooks/handlers.test.mjs`, `test/hooks/hooks.test.mjs`, `test/hooks/powershell-text.test.mjs`: repoint
- `test/skills/filename.test.mjs`, `test/skills/lane-check.test.mjs`, `test/skills/lint-craft.test.mjs`, `test/skills/routing.mjs`: repoint
- `test/kernel/`: `admit-labelled.test.mjs`, `admit.test.mjs`, `check.test.mjs`, `cli.test.mjs`, `close.test.mjs`, `comments.test.mjs`, `config-fixture.mjs`, `config.test.mjs`, `cost.test.mjs`, `drive.test.mjs`, `extensions.test.mjs`, `gate.test.mjs`, `git.test.mjs`, `init.test.mjs`, `kernel-sources.mjs`, `migrate.test.mjs`, `mutate.test.mjs`, `names.test.mjs`, `next.test.mjs`, `packet.test.mjs`, `paths.test.mjs`, `plugin-layout.test.mjs`, `pr.test.mjs`, `preflight.test.mjs`, `review.test.mjs`, `route.test.mjs`, `saved-rules.test.mjs`, `silenced.test.mjs`, `sources.test.mjs`, `statusline.test.mjs`, `verify.test.mjs`, `work.test.mjs`, `yaml-lite.test.mjs`: repoint
- `test/kernel/styling/`: `font.test.mjs`, `linux-terminals.test.mjs`, `setup.test.mjs`, `terminal-app.test.mjs`, `terminal.test.mjs`, `theme.test.mjs`, `uninstall.test.mjs`, `zip.test.mjs`: repoint
- `test/build.test.mjs`, `test/kernel/node-floor.test.mjs`: new

**Changes:**
- Move first, then build: `git mv core src`, then `git mv src/bin/picket.mjs src/bin/dispatch.mjs`. The shims `src/bin/picket` and `picket.cmd` stay as they are; they run `picket.mjs` beside them, which is now the built entry.
- Build, watch, type check and package scripts as D-002, D-003, D-005 and D-007 state, with the draft's `tsconfig.json` (`include: ["src"]`, `allowJs`, `checkJs: false`, `noEmit`, `strict`, `module: nodenext`, `types: ["node"]`) plus `erasableSyntaxOnly`. If esbuild places the banner above a shebang, the build writes the banner itself.
- The Node check as D-006. `test/kernel/node-floor.test.mjs` calls `checkNodeFloor` for `20.11.1`, `22.0.0` and `24.22.1`, and spawns `dist/bin/picket.mjs` and a hook bundle under a preload that sets `process.versions.node` to `20.11.1`.
- `test/build.test.mjs` checks the built tree: the banner on every `dist/**/*.mjs`, the shebang on `dist/bin/picket.mjs`, no relative import in any `dist/hooks/*.mjs`, no `.mts` or `.d.mjs` file in `dist/`, every other file byte-equal to its source.
- Repoint by D-008. A text that cites `core/bin/picket.mjs` by line now cites `src/bin/dispatch.mjs`; a command that runs it uses `dist/bin/picket.mjs`. Guard tests that feed command strings change the path only. In `test/markdown-paths.test.mjs`, `src/` leaves the host-layout `ELSEWHERE` group (it now exists, and that test fails on an elsewhere path that exists), and each exact `dist/` path a scanned document cites joins a new group "built by `npm run build`, ignored by git", since `dist/` is not in the git listing the test reads. `plugin-layout.test.mjs` scans `.mjs` and `.mts` under `src/` for imports, asserts `engines`, `files`, the `./dist` source and both deny rules. Where a plain rewrite would state something false (the `.claude/MEMORY.md` 2026-10-04 line "the plugin folder is `core/` itself, no build step", the README's first paragraph), write the new fact: `src/` is the source, `dist/` the built plugin.

**Done when:**
- **T-1.1** `core/` no longer exists, and `git diff -M --name-status 4eab316` lists every former `core/` file as a rename to the same path under `src/`, except `core/bin/picket.mjs`, renamed to `src/bin/dispatch.mjs`.
- **T-1.2** `npm run build` writes `dist/` from nothing in under 2 seconds on this machine, and `test/build.test.mjs` passes.
- **T-1.3** `npm run typecheck` exits 0, and `npm test` passes with no fewer passing tests than on `4eab316`, plus the new ones.
- **T-1.4** Under the preload faking Node 20.11.1, `node dist/bin/picket.mjs state <id>` exits 1 with stdout empty and stderr exactly `Picket needs Node 22 or newer; this is 20.11.1`; a hook bundle that prints output for its event without the preload (for example `dist/hooks/inject.rules.mjs` on SessionStart) exits 0 with stdout empty and the same stderr line.
- **T-1.5** `package.json`, `.nvmrc`, `.claude-plugin/marketplace.json`, `.github/workflows/release.yml` and `.github/scripts/release.mjs` hold the values in D-001 and D-005, the `version` script stages `src/.claude-plugin/plugin.json`, and `plugin-layout.test.mjs` and `release.test.mjs` assert them.
- **T-1.6** After a build, `git status --porcelain` lists nothing under `dist/`, and `.claude/settings.json` denies `Edit(dist/**)` and `Write(dist/**)`.
- **T-1.7** `git grep -n -E '\bcore/' -- . ':!work' ':!artifacts' ':!bench/results' ':!docs/design' ':!test/kernel/admit-labelled.json'` prints nothing.
- **T-1.8** `claude --plugin-dir dist plugin details picket` (no model call) lists the eight hook events of `src/hooks/hooks.json` and every skill in `src/.claude-plugin/plugin.json`.

## Phase 2: Contributor docs for the build

**Touch set:**
- `README.md`: layout block, session paragraph
- `CONTRIBUTING.md`: code, build and release sections
- `src/hooks/README.md`: shells are bundled at build
- `test/markdown-paths.test.mjs`: the `dist/` elsewhere group

**Changes:**
- Phase 1 moved every path; this phase writes what is new. `README.md`: the layout block shows `src/` as the hand-written source, `dist/` as generated and ignored, and `scripts/build.mjs`, `scripts/watch.mjs`, `tsconfig.json`; the session paragraph says `npm run claude` builds, then starts `claude --plugin-dir dist`.
- `CONTRIBUTING.md`: contributors run Node 24 or newer (`.nvmrc`), users Node 22 or newer; `npm run build`, `npm run watch` and `npm run typecheck`, and that `npm test` and `npm run claude` build first; `dist/` is never edited; a moved module stays `.mjs` until its refactor item converts it, and new modules are `.mts` (C-002, with the `node-floor.mjs` exception of D-006); the release section names `src/bin/picket` for the executable bit and says `prepack` builds before the publish.
- `src/hooks/README.md`: each shell is bundled with its imports into one file in `dist/hooks/`; the standalone run uses the bundle.
- Every `dist/` path a document cites in backticks is listed in the `markdown-paths` group from phase 1; prose names it without backticks where a listing would only add noise.

**Done when:**
- **T-2.1** The `README.md` layout block lists `src/`, `dist/`, `scripts/build.mjs` and `scripts/watch.mjs`, and says `dist/` is generated and ignored by git.
- **T-2.2** `CONTRIBUTING.md` names `npm run build`, `npm run watch`, `npm run typecheck`, `.nvmrc`, Node 24 for contributors and Node 22 for users, and says `dist/` is never edited.
- **T-2.3** `src/hooks/README.md` says each shell is bundled into `dist/hooks/` and gives the standalone run as `node dist/hooks/<hook>.mjs < payload.json`.
- **T-2.4** `npm test` passes, including `test/markdown-paths.test.mjs`, `test/kernel/names.test.mjs` and the `CLAUDE.md` byte budget in `test/budgets.test.mjs`.

## Phase 3: Prove the packed install

**Touch set:**
- `test/package.test.mjs`: new, tarball contents
- `package.json`: only if the proof finds a gap [INFERRED]

**Changes:**
- `test/package.test.mjs` runs `npm pack --dry-run --json --ignore-scripts` after the build that `npm test` already ran, and asserts the file list: `dist/bin/picket.mjs`, `dist/bin/picket`, `dist/bin/picket.cmd`, `dist/hooks/hooks.json`, `dist/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and the mod entries are in; no path under `src/`, no `.mts` file and no `*.test.*` file is.
- The developer drives the real install with every folder in the scratchpad: `npm pack` to a tarball, `npm install -g <tarball> --prefix <temp prefix>`, then from that prefix `picket --version`, `picket init` in a temp git project (see OQ-001), `claude --plugin-dir <prefix package>/dist plugin details picket`, and a SessionStart event piped into the installed `dist/hooks/inject.rules.mjs`.
- The phase block records the packed and unpacked tarball sizes against the draft's 722 KB and 2202 KB.

**Done when:**
- **T-3.1** `test/package.test.mjs` passes inside `npm test`, and `npm run typecheck` exits 0.
- **T-3.2** The tarball installs into a temp prefix, and that prefix's `picket --version` prints the version in `src/.claude-plugin/plugin.json`.
- **T-3.3** That prefix's `picket init` in a temp git project reports no failed step, and the project's `.claude/settings.json` names the marketplace `picketai` at the installed package root.
- **T-3.4** `plugin details` on the installed `dist/` lists the eight hook events, and the installed `dist/hooks/inject.rules.mjs` prints the rules for a SessionStart event in the temp project.
- **T-3.5** In the session the user restarted with `npm run claude` after phase 1, `command -v picket` ends in `dist/bin/picket`.

## Open questions

- **OQ-001** Does `picket init` in a temp project, which runs `claude plugin marketplace add <installed package root> --scope project` and the plugin installs, leave the user's own marketplace `picketai` (a directory marketplace at this checkout) untouched? Not verified. Owner: user. Fallback: the developer runs `picket init` with `CLAUDE_CONFIG_DIR` set to a scratchpad folder; if the CLI refuses there, the developer drives T-3.1, T-3.2 and T-3.4 only, and the user runs `picket init` and one session in the temp project at the phase 3 gate for T-3.3.

## Revision log

- 2026-10-23: D-002 (r2): RISK-003 names 5.x as fallback only; phase 2 files gains test/markdown-paths.test.mjs; cross-check Minor rows.
