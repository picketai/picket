---
kind: design
lane: design
title: Refactor item 02, code conventions
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/02-code-conventions.md, artifacts/refactor/00-conventions.md, artifacts/refactor/03-kernel-cli.md, artifacts/refactor/04a-work-item-model.md, artifacts/refactor/04c-running-things.md, artifacts/refactor/05-hooks.md, artifacts/refactor/06-tests.md, work/20261022-refactor-item-01-layout-and-build/design.md, tsconfig.json, package.json, scripts/build.mjs, scripts/test.mjs, CONTRIBUTING.md, src/lib/paths.mjs, src/lib/git.mjs, src/lib/work.mjs, src/lib/route.mjs, src/lib/close.mjs, src/lib/review.mjs, src/lib/comments.mjs, src/lib/silenced.mjs, src/bin/dispatch.mjs, test/kernel/kernel-sources.mjs, test/kernel/paths.test.mjs, test/kernel/config.test.mjs, test/kernel/git.test.mjs, esbuild 0.28.2 probe of a .mjs import resolving to .mts (2026-10-23)]
phases:
  - n: 1
    files: [src/lib/action.mts, src/lib/context.mts, src/lib/io.mts, src/lib/work-files.mts, src/lib/process.mts, src/lib/paths.mts, src/lib/git.mts, src/lib/route.mjs, src/lib/close.mjs, test/kernel/action.test.mjs, test/kernel/context.test.mjs, test/kernel/io.test.mjs, test/kernel/work-files.test.mjs, test/kernel/process.test.mjs, test/kernel/paths.test.mjs, test/kernel/git.test.mjs, test/kernel/kernel-sources.mjs, test/kernel/config.test.mjs]
    greps:
      - path: tsconfig.json
        pattern: '"erasableSyntaxOnly": true'
      - path: src/lib/action.mts
        pattern: 'export class Refused extends Error'
      - path: src/lib/action.mts
        pattern: 'export function describeExit<'
      - path: src/lib/context.mts
        pattern: 'export function edgeContext\('
      - path: src/lib/work-files.mts
        pattern: 'readonly __brand: "WorkId"'
      - path: src/lib/io.mts
        pattern: 'export function readJsonl<'
      - path: src/lib/process.mts
        pattern: 'export function runShell\('
      - path: src/lib/git.mts
        pattern: 'export function gitRead\('
      - path: src/lib/git.mts
        pattern: 'export function gitRun\('
      - path: src/lib/git.mts
        pattern: '^(?![\s\S]*process\.env)'
        flags: i
      - path: src/lib/paths.mts
        pattern: 'export function pluginRoot\(from'
      - path: src/lib/paths.mts
        pattern: '^(?![\s\S]*dirname\(dirname\()'
        flags: i
      - path: test/kernel/kernel-sources.mjs
        pattern: '\.mts'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [test/kernel/conventions.test.mjs, test/kernel/type-rules.test.mjs, test/type-rules/mistakes.mts, test/type-rules/tsconfig.json, CONTRIBUTING.md]
    greps:
      - path: test/kernel/conventions.test.mjs
        pattern: 'context\.mts'
      - path: test/kernel/conventions.test.mjs
        pattern: 'process\.mts'
      - path: test/kernel/conventions.test.mjs
        pattern: 'work-files\.mts'
      - path: test/type-rules/tsconfig.json
        pattern: '"extends": "\.\./\.\./tsconfig\.json"'
      - path: test/type-rules/mistakes.mts
        pattern: 'readonly \w+: number'
      - path: CONTRIBUTING.md
        pattern: '^## Code conventions\b'
      - path: CONTRIBUTING.md
        pattern: 'artifacts/refactor/00-conventions\.md'
      - path: CONTRIBUTING.md
        pattern: 'C-006\b'
    tests: true
    drive: false
    security: false
---
# Design: Refactor item 02, code conventions

## Problem

Verbs today have four calling styles, eight ways to fail, a hidden `root = projectRoot()` default in 40 places, five JSONL parsers (two fatal on one bad line, B4), a shell-string git call (B2) and a plugin root that is right only by luck of depth (item 01, R-4). The user approved item 02 (`artifacts/refactor/02-code-conventions.md`, decisions K-1 to K-14 with its revision log) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`); this record carries them into phases and re-decides nothing. Binding constraints: this item builds the foundation modules and the tests that hold the rules, and moves no verb onto them (items 03 to 05 do that); conversion is bottom-up (C-003); item 01 left `src/` as `.mjs` with esbuild building each `.mts` to one `.mjs` and `tsc` only checking, and the `.mts` import rewrite (item 03, X-11) does not exist yet; every phase leaves `npm test` green on trunk.

## Decisions

### D-001: The foundation sits flat in `src/lib`; item 03 moves it into folders
**Decision:** Infrastructural decision, carrying the draft's migration phase 1. The new modules are `src/lib/action.mts`, `context.mts`, `io.mts`, `work-files.mts` and `process.mts`; `paths.mjs` and `git.mjs` convert in place to `paths.mts` and `git.mts`. Item 03's table (`03-kernel-cli.md`, "Where each piece of today's code lands") already moves them: `action`, `context`, `paths` to `shared/`, `io`, `process` and `gitRead`/`gitRun` to `util/`, `work-files` to `shared/work/files.mts` (item 04a). Converting in place keeps every importer working: the 40 `.mjs` modules that import `./paths.mjs` or `./git.mjs` are copied unchanged to `dist/`, where the per-module build writes `dist/lib/paths.mjs` and `git.mjs`; the hook bundles resolve `../paths.mjs` to `paths.mts` (esbuild 0.28.2, probed 2026-10-23: a bundled `.mjs` importing `../paths.mjs` beside only `paths.mts` built and ran).
**Instead of:** creating `shared/` and `util/` now: the folder layout and its import-direction scan are item 03's decision X-2, and doing half of it here splits one layout change over two items.
**Risks:**
- **RISK-001** Item 03 must `git mv` seven files this item creates. Mitigation: item 03's table already lists each one; the moves are mechanical and item 03's build rewrite handles the import paths.

### D-002: `Action`, `Outcome` and one exit table in `action.mts`
**Decision:** Infrastructural decision, carrying K-1, K-2, K-3 and C-006, C-008. `action.mts` exports the draft's `Details`, `Outcome<T>` (`done`, `failed`, `refused`), `Action<I, O>`, `done`, `failed`, `refuse`, `Refused`, `UsageError` and `action()` exactly as `02-code-conventions.md` "The action" shows. The exit table is data beside them: `EXIT = { done: 0, failed: 2, refused: 2, usage: 1, crash: 1 } as const`, `type ExitCode`, and `describeExit<T>(outcome: Outcome<T>): { code: ExitCode; json: unknown }`, where `json` is the value for `done` and `failed` and `{ ok: false, error: message, ...details }` for `refused`. Item 03's `main` uses it; nothing calls it in this item. `UsageError` lives here until item 03 moves it to `util/args.mts` (02 revision log, X-5).
**Instead of:** returning an `Error` for a refusal: `JSON.stringify(new Error("x"))` prints `{}`, and a refusal could not be told from a crash (K-2).
**Risks:**
- **RISK-002** A helper that throws `Refused` outside any `action()`, such as in a hook handler, is a crash (draft R-2). Mitigation: `runHook` already catches everything; item 05 decides whether a hook says why.

### D-003 (r2): Only entry points build a `Context`
**Decision:** Infrastructural decision, carrying K-1 and C-007. `context.mts` exports `Context = { root: string; now: () => Date; env: NodeJS.ProcessEnv; home: string; session: string | null }` and `edgeContext(root: string): Context`, which returns `root` as given, `now` reading the clock on each call, `env` as the `process.env` object itself, `home` as `homedir()`, and `session` from `CLAUDE_CODE_SESSION_ID` (null when unset). Phase 1 checks each field (T-1.8). `paths.mts` keeps `projectRoot()`; it and `context.mts` are the only `src/lib` `.mts` files allowed to touch the process (phase 2 scan). The test helper `fixedContext` is item 06's.
**Instead of:** a module-level default context: it brings back the hidden `projectRoot()` default the draft removes.
**Risks:**
- **RISK-003** `git.mts`'s `commitOwned` builds a child environment from `process.env` for its temporary index today, which the scan would flag. Mitigation: `commitOwned` takes `env` in its options (D-005), and its two callers pass `process.env` until items 03 and 04 give them a context.

### D-004: Work item paths and closed lists in `work-files.mts`
**Decision:** Infrastructural decision, carrying K-4, K-5 and C-009, C-010. `WorkId` is `string & { readonly __brand: "WorkId" }`, produced only by `workId(text)`, which checks the pattern `work.mjs:91` already enforces, `/^[a-z0-9][a-z0-9-]{2,80}$/`, and throws `UsageError` otherwise (so `../etc` is refused, the draft's evidence gap). Each closed list is a value and its type: `WORK_FILES` (the draft's 13 names, each found in `src/lib` on 2026-10-23) with `WorkFile`, and `MARKERS` (`done`, `approved`, `reviewed`, `block.md`) with `Marker`, each `as const` with the union derived from it. `workDir`, `workFile`, `phaseMarker` and `workRel` follow the draft's signatures; `workDir` joins `WORK_DIR` from `paths.mts`. Verdicts, lanes and statuses stay with their modules until items 03 and 04a give them owners.
**Instead of:** plain string ids checked where each path is built: `review.mjs:178` already builds `work/${id}` without a check (K-5).
**Risks:**
- **RISK-004** A branded id adds a `workId()` call wherever an id enters as text (draft R-4). Mitigation: that is the point; the calls land in items 03 to 05, not here.

### D-005: Files, git and processes through `io.mts`, `git.mts`, `process.mts`
**Decision:** Infrastructural decision, carrying K-6, K-7 and C-010. `io.mts`: `readText` (null when the file does not exist, other errors throw), `readJson<T>` (null when missing or not valid JSON), `readJsonl<T>` (`{ rows, skipped }`; a missing file is no rows, a blank line is ignored, a line `JSON.parse` rejects is skipped and counted, lines split on `\r?\n`), `appendJsonl` (creates the folder, writes one line). `git.mts`: today's private `git()` becomes `gitRead(root, args, opts?: { maxBuffer?: number })`, null on any failure, output end-trimmed; `gitRun(root, args, opts?: { input?: string; env?: NodeJS.ProcessEnv })` throws an `Error` naming the git subcommand and its last stderr line, and today's `gitStrict` becomes a call to it with `--literal-pathspecs` first. Every existing export keeps its name and behaviour; `commitOwned`'s options gain a required `env: NodeJS.ProcessEnv` used for the temporary index. `process.mts`: `ShellOptions`, `ShellResult` and `runShell` with the signature item 04c fixes (`04c-running-things.md`, "src/lib/util/process.mts"); `killTree` is item 04c's.
**Instead of:** naming `git.mts` as a third exception to the process scan: an exception list grows and hides the next real environment read.
**Risks:**
- **RISK-005** The `commitOwned` signature change touches `route.mjs` and `close.mjs`, kernel modules of items 03 and 04. Mitigation: one argument at each of the two call sites; behaviour is unchanged because both pass `process.env`.

### D-006: The plugin root is found by walking up
**Decision:** Infrastructural decision, carrying K-13 and C-013; closes item 01, R-4 and RISK-001. `pluginRoot(from: string = import.meta.dirname): string` returns the first folder at or above `from` that holds `.claude-plugin/plugin.json`, and throws an `Error` naming `from` when none does. In `dist/lib/paths.mjs` it finds `dist/`; inlined in a hook bundle, `import.meta.dirname` is `dist/hooks/` and it still finds `dist/` (draft evidence, and the 2026-10-23 probe printed the bundle's own folder). `pluginManifestPath()` and `rulesDir()` keep their meaning, and `init.mjs`'s `dirname(pluginRoot())` stays the package root.
**Instead of:** keeping `dirname(dirname(import.meta.url))`: it is right only while every caller sits one level below the plugin folder, which bundling already broke once.
**Risks:**
- **RISK-006** A stray `.claude-plugin/plugin.json` between the module and the real root would win. Mitigation: the walk starts at the module's own folder, and inside `dist/` the first manifest above `lib/`, `bin/` or `hooks/` is the plugin's own.

### D-007: `.mjs` import names and tests in `test/` until items 03 and 06
**Decision:** Infrastructural decision, carrying K-8, K-9, K-14 and C-011, within item 01's D-002 and D-008. Imports between the new modules name `.mjs` (`import type { Context } from "./context.mjs"`, `import { UsageError } from "./action.mjs"`), which `tsc` under `nodenext` resolves to the `.mts` source and the per-module build leaves pointing at the built file; item 03 phase 1 rewrites them to `.mts` (X-11). Tests are `test/kernel/<module>.test.mjs` importing `dist/lib/<module>.mjs`, as item 01 D-008 requires; item 06 moves them beside the code. All code is erasable syntax (classes assign fields by hand, no enums, namespaces or parameter properties), generic helpers are `function` declarations, names follow K-9, there are no default exports, and the converted files lose any `@param` and `@returns` lines (K-14). In `git.mts` the header comment "never throws on a missing repo" becomes false once `gitRun` exists, so it is deleted (comments rule); its other comments stay.
**Instead of:** `.mts` import names now with `allowImportingTsExtensions`: Node cannot run `src/` without the build rewrite, which is item 03's (X-11), so the tests would still need `dist/`.
**Risks:**
- **RISK-007** The existing source scans in `test/kernel/kernel-sources.mjs` list `.mjs` only, so converted code would fall out of the self-location and host-folder bans. Mitigation: phase 1 widens them to `.mts` (not `.d.mts` or `.test.mts`) and lets `isPathsModule` match `paths.mts`.

### D-008: Three source scans and a type-mistake fixture hold the rules
**Decision:** Infrastructural decision, carrying the draft's migration phase 2. A new test scans every `.mts` under `src/` except `*.d.mts` and `*.test.mts`, code lines only, for scan 1 (`projectRoot(`, `process.cwd(`, `process.env`, `homedir(`, `new Date(` under `src/lib`, except `context.mts` and `paths.mts`), scan 2 (`execSync(`, `shell: true`, or a backtick as the first argument of `exec`, `execFile`, `execFileSync`, `spawn`, `spawnSync`, except in `process.mts`) and scan 3 (`` `work/${ `` outside `work-files.mts`). The scans read only `.mts`, so each covers more code as items 03 to 05 convert. A checked-in fixture `test/type-rules/mistakes.mts` with its own `tsconfig.json` is compiled by `tsc` in a test that asserts the exact error codes the draft's evidence lists. The draft's scan 4 (one-word registry keys) has no registry to read until item 03 creates `verbs.mts`; item 03 phase 3 lists the same scan, so it lands there, with K-10, K-11 and K-12.
**Instead of:** `@ts-expect-error` lines in a `src/` fixture: `guard.silenced` denies suppression markers (`src/lib/comments.mjs:27`, `src/lib/silenced.mjs:18`), and the directive cannot say which error it expects.
**Risks:**
- **RISK-008** The fixture breaks when a TypeScript upgrade renumbers or rewords an error. Mitigation: the test asserts codes and line numbers only, and `typescript` is pinned at 7.0.2.

## Scope

**In:**
- `action.mts`, `context.mts`, `io.mts`, `work-files.mts`, `process.mts`, each with tests (D-002 to D-005).
- `paths.mjs` and `git.mjs` converted to `.mts`, with `pluginRoot()` walking up and `gitRead`/`gitRun` (D-005, D-006), and the two `commitOwned` call sites.
- The existing source scans widened to `.mts`; the three new scans and the type-mistake fixture (D-007, D-008).
- A "Code conventions" section in `CONTRIBUTING.md` pointing at C-006 to C-013.

**Out:**
- Moving any verb onto `Action`, the registry, `VerbSpec`, `parse`/`render`, the renames, the refusal JSON change and scan 4 (item 03).
- `work.mts` adopting `io.mts` (B4), `drive` adopting `gitRun` (B2), `nextStep`, removing the `root` defaults, `killTree` (items 04a to 04d).
- Hook handlers getting a `Context`, the guard's verb lists (item 05); `fixedContext`, tests beside code (item 06).
- The `PATH_TOKEN` dotfile bug in `src/lib/packet.mjs`: outside this item's touch set.
- `tsconfig.json`: it already sets `erasableSyntaxOnly: true` (item 01), so nothing changes there.

## Phase 1: Foundation modules

**Touch set:**
- `src/lib/action.mts`, `src/lib/context.mts`, `src/lib/io.mts`, `src/lib/work-files.mts`, `src/lib/process.mts`: new
- `src/lib/paths.mjs` to `src/lib/paths.mts`: `git mv`, types, `pluginRoot` walk
- `src/lib/git.mjs` to `src/lib/git.mts`: `git mv`, types, `gitRead`, `gitRun`
- `src/lib/route.mjs:27`, `src/lib/close.mjs:91`: pass `env` to `commitOwned`
- `test/kernel/action.test.mjs`, `context.test.mjs`, `io.test.mjs`, `work-files.test.mjs`, `process.test.mjs`: new
- `test/kernel/paths.test.mjs`, `test/kernel/git.test.mjs`: walk cases, `env` option, new exports
- `test/kernel/kernel-sources.mjs`, `test/kernel/config.test.mjs`: scans read `.mts`
- `tsconfig.json`: read only, already `erasableSyntaxOnly`

**Changes:**
- Convert first, then add: `git mv` the two modules, type them under `strict`, delete stale comments as D-007 says, then write the five new modules with the interfaces in D-002 to D-005. The build's collision check already fails if a `.mjs` and its `.mts` twin both remain.
- `paths.mts` keeps its 24 exports (the `paths exports locations only` test holds); `pluginRoot` changes as D-006. `repoRelative` takes `event: { cwd?: string } | null | undefined`.
- `git.mts` exports everything `git.mjs` did plus `gitRead` and `gitRun`; `commitOwned(root, message, { add?, owns, env })` returns `{ sha: string | null; committed: string[]; left_staged: string[]; warnings: string[] }` as today.
- Tests import `dist/lib/*.mjs`. `git.test.mjs` passes `env: process.env` inside `withIdentity`, so the identity variables reach the commit.
- `kernel-sources.mjs`: `kernelModules()` lists `.mjs` and `.mts`, not `.d.mts` or `.test.mts`; `isPathsModule` matches `paths.mjs` or `paths.mts`. `config.test.mjs` (T-2.4 there) reads `.mjs` and `.mts` in `src/lib` and expects `["paths.mts"]`.

**Done when:**
- **T-1.1** `src/lib/paths.mjs` and `src/lib/git.mjs` no longer exist, the seven `.mts` modules do, `dist/lib/` holds a `.mjs` for each after `npm run build`, `npm run typecheck` exits 0, and `npm test` passes with no fewer passing tests than on `e3d1221`, plus the new ones.
- **T-1.2** `action.test.mjs` shows `action()` turning a thrown `Refused("x", { id: "a" })` into `{ status: "refused", message: "x", details: { id: "a" } }` and rethrowing a plain `Error`; `describeExit` gives code 0 with the value for `done`, 2 with the value for `failed`, and 2 with `{ ok: false, error: "x", id: "a" }` for that refusal; `EXIT.usage` and `EXIT.crash` are 1.
- **T-1.3** `work-files.test.mjs` shows `workId("20261022-x")` returning its text, `workId("../etc")` and `workId("ab")` throwing `UsageError`, and `workFile(root, id, "state.yaml")`, `phaseMarker(root, id, 2, "approved")` and `workRel(id)` equal to `join(root, "work", id, "state.yaml")`, `join(root, "work", id, "phases", "2.approved")` and `` `work/${id}/` ``.
- **T-1.4** `io.test.mjs` shows `readJsonl` on a file of two valid lines, one blank line and one line `{bad` returning 2 rows and `skipped: 1`, a missing file returning `{ rows: [], skipped: 0 }`, `readText` and `readJson` returning null for a missing file, and `appendJsonl` creating a missing folder.
- **T-1.5** `git.test.mjs` shows `gitRead` returning null outside a repo and `gitRun` throwing there with the subcommand in the message; `process.test.mjs` shows `runShell` reporting exit code 3 and the printed text for `node -e "console.log('hi'); process.exit(3)"`, and `timedOut: true` for a command that outlives `timeoutMs: 200`.
- **T-1.6** `paths.test.mjs` shows `pluginRoot` from `dist/lib`, `dist/lib/styling`, `dist/hooks` and `dist/bin` returning `resolve("dist")`, and throwing from a temp folder with no manifest above it; `kernelModules()` includes `src/lib/action.mts` and `src/bin/picket.mts`, excludes every `*.d.mts`, and the self-location and host-folder bans pass over it.
- **T-1.7** Driven: `node dist/bin/picket.mjs --version` prints the version in `src/.claude-plugin/plugin.json`, and `dist/hooks/inject.rules.mjs` fed a SessionStart event prints the rules.
- **T-1.8** `context.test.mjs` shows `edgeContext("/r")` returning `root: "/r"`, `env` identical to `process.env`, `home` equal to `homedir()`, `now()` within one second of the test's clock, `session: "s-1"` with `CLAUDE_CODE_SESSION_ID=s-1`, and `session: null` with the variable unset.

## Phase 2: Tests that hold the rules

**Touch set:**
- `test/kernel/conventions.test.mjs`: new, the three source scans
- `test/kernel/kernel-sources.mjs`: `kernelModules`, `codeLines` reused, read only
- `test/type-rules/mistakes.mts`, `test/type-rules/tsconfig.json`: new fixture
- `test/kernel/type-rules.test.mjs`: new, runs `tsc` on the fixture
- `node_modules/typescript/bin/tsc`: the checker entry, read only
- `CONTRIBUTING.md`: new "Code conventions" section after "Code"

**Changes:**
- `conventions.test.mjs` holds one pure function per scan, `(path: string, text: string) => string[]` (the offending code lines), and runs each over every `.mts` under `src/` except `*.d.mts` and `*.test.mts`, using `codeLines` so comment lines never count. Scan 1 applies only under `src/lib`. The exemptions are exact repo-relative paths: `src/lib/context.mts` and `src/lib/paths.mts` for scan 1, `src/lib/process.mts` for scan 2, `src/lib/work-files.mts` for scan 3; item 03 updates them when it moves the files (D-001). The forms are D-008's. Each scan has a self-test feeding it one sample line per banned form, the same line as a comment, and the same line under its exempt path.
- `test/type-rules/tsconfig.json` extends `../../tsconfig.json` and includes only `mistakes.mts`, so `npm run typecheck` never sees the fixture. `mistakes.mts` imports from `../../src/lib/work-files.mjs` and `../../src/lib/action.mjs` and holds one mistake per line, in this order: a `Marker` compared with `"aproved"` (TS2367), `workFile(root, id, "stat.yaml")` (TS2345), `workFile(root, "20261022-x", "state.yaml")` with a plain string (TS2345), `{ status: "done", value: "x" }` typed `Outcome<number>` (TS2322), a class with `constructor(readonly x: number)` (TS1294), and `const same = <T>(value: T) => value;` (TS7060). Every other line is valid, and the file has no comments.
- `type-rules.test.mjs` spawns `process.execPath` with `node_modules/typescript/bin/tsc -p test/type-rules --pretty false`, parses each `mistakes.mts(<line>,<col>): error TS<code>` line, and asserts the list of `[line, code]` pairs equals the expected six exactly.
- `CONTRIBUTING.md` gains `## Code conventions`: two or three sentences saying new and converted code follows `artifacts/refactor/00-conventions.md` entries C-006 to C-013 and that the scans in `test/kernel/conventions.test.mjs` enforce the mechanical ones, then a list of the seven foundation modules in `src/lib/` with one line each on what goes through it.

**Done when:**
- **T-2.1** `conventions.test.mjs` passes on trunk's `.mts` files, and its self-tests show each scan reporting one offender per banned form (five for scan 1, three for scan 2, one for scan 3) and none for the same text on a comment line.
- **T-2.2** The scan-1 function reports `const t = new Date();` for `src/lib/io.mts` and nothing for `src/lib/context.mts`; scan 2 reports `execSync("ls")` for `src/lib/git.mts` and nothing for `src/lib/process.mts`; scan 3 reports `` `work/${id}` `` for `src/lib/io.mts` and nothing for `src/lib/work-files.mts`.
- **T-2.3** `type-rules.test.mjs` passes: `tsc -p test/type-rules` exits non-zero with exactly six errors, TS2367, TS2345, TS2345, TS2322, TS1294 and TS7060, each on the fixture line the test names, and no other error.
- **T-2.4** `npm run typecheck` still exits 0, so the fixture stays outside the root type check.
- **T-2.5** `CONTRIBUTING.md` has a `## Code conventions` section naming `artifacts/refactor/00-conventions.md`, C-006 to C-013 and the seven modules, and `test/markdown-paths.test.mjs` passes.
- **T-2.6** `npm test` passes with no fewer passing tests than after phase 1, plus the new ones.

## Open questions

None. The draft's scan 4 is placed by D-008, not left open.

## Revision log

- 2026-10-23: D-003 (r2): edgeContext's returned fields specified and checked by new T-1.8; old T-1.8 folded into T-1.6; review found no criterion on edgeContext.
