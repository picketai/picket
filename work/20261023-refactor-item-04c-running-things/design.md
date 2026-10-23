---
kind: design
lane: design
title: Refactor item 04c, running things
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/04c-running-things.md, artifacts/refactor/00-conventions.md, artifacts/refactor/05-hooks.md, artifacts/refactor/07b-styling.md, artifacts/refactor/09-hygiene.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, work/20261023-refactor-item-04a-work-item-model/design.md, work/20261023-refactor-item-04b-sources-and-intake/design.md, src/lib/util/process.mts, src/lib/util/git.mts, src/lib/util/io.mts, src/lib/shared/action.mts, src/lib/shared/context.mts, src/lib/shared/paths.mts, src/lib/shared/tooling.mjs, src/lib/shared/checks.mjs, src/lib/shared/destructive.mjs, src/lib/shared/config.mjs, src/lib/shared/work/state.mts, src/lib/shared/work/snapshot.mts, src/lib/shared/work/verdict-log.mts, src/lib/shared/work/next-view.mts, src/lib/verbs/drive, src/lib/verbs/check/index.mts, src/lib/verbs/verify, src/lib/verbs/mutate, src/lib/verbs/preflight, src/lib/verbs/next/index.mts, src/lib/hooks/observe.drive.mjs, src/lib/hooks/drive-evidence.mjs, src/lib/hooks/hook.mjs, src/lib/hooks/guard.bash.mjs, src/hooks/README.md, test/kernel (check, drive, verify, mutate, preflight, config, next, process, conventions, kernel-sources), test/hooks/hooks.test.mjs, test/hooks/handlers.test.mjs]
phases:
  - n: 1
    files: [src/lib/shared/tooling.mts, src/lib/shared/checks.mjs, src/lib/verbs/verify/verify.mjs, src/lib/verbs/verify/index.mts, src/lib/verbs/drive/drive.mjs, src/lib/verbs/mutate/mutate.mjs, src/lib/verbs/preflight/preflight.mjs, src/lib/hooks/guard.bash.mjs, test/kernel/tooling.test.mjs, test/kernel/config.test.mjs, test/kernel/check.test.mjs, test/kernel/preflight.test.mjs, test/kernel/verify.test.mjs]
    greps:
      - path: src/lib/shared/tooling.mts
        pattern: 'export function detectTooling\(root: string\): \{ tooling: Tooling; warnings: string\[\] \}'
      - path: src/lib/shared/tooling.mts
        pattern: 'slnx\?'
      - path: src/lib/hooks/guard.bash.mjs
        pattern: 'detectTooling\(hookRoot\)\.tooling\.test'
      - path: test/kernel/tooling.test.mjs
        pattern: 'App\.slnx'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/work/state.mts, src/lib/shared/work/next-view.mts, src/lib/shared/drive-log.mts, src/lib/verbs/drive/drive.mjs, src/lib/verbs/drive/index.mts, src/lib/verbs/verify/verify.mjs, src/lib/hooks/observe.drive.mjs, src/lib/hooks/guard.bash.mjs, src/lib/hooks/hook.mjs, src/hooks/README.md, README.md, test/kernel/current-item.test.mjs, test/kernel/drive-log.test.mjs, test/kernel/verify.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: src/lib/shared/work/state.mts
        pattern: 'export function currentItem\(root: string, \{ session \}: \{ session: string \| null \}\): WorkState \| null'
      - path: src/lib/shared/drive-log.mts
        pattern: 'export function appendDriveRow\('
      - path: src/lib/shared/drive-log.mts
        pattern: 'export function maskEnvValues\('
      - path: src/lib/hooks/observe.drive.mjs
        pattern: '^(?![\s\S]*(openWorkItem|appendFileSync))'
        flags: i
      - path: src/lib/verbs/drive/drive.mjs
        pattern: '^(?![\s\S]*currentWork)'
        flags: i
      - path: test/kernel/current-item.test.mjs
        pattern: '20261022-alpha-newer'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/checks.mts, src/lib/shared/destructive.mts, src/lib/shared/config.mjs, src/lib/verbs/check/index.mts, src/lib/verbs/verify/index.mts, src/lib/verbs/mutate/mutate.mjs, src/lib/verbs/mutate/index.mts, src/lib/verbs/drive/drive.mjs, test/kernel/run-step.test.mjs, test/kernel/destructive.test.mjs, test/kernel/check.test.mjs, test/kernel/verify.test.mjs, test/kernel/drive.test.mjs, test/hooks/hooks.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: src/lib/shared/checks.mts
        pattern: 'export function runStep\(root: string, name: StepName, command: string \| null'
      - path: src/lib/shared/destructive.mts
        pattern: 'export function destructiveCommand\(command: string\): string \| null'
      - path: src/lib/verbs/check/index.mts
        pattern: 'refuse\('
      - path: src/lib/verbs/mutate/mutate.mjs
        pattern: '^(?![\s\S]*\bcheck\(\{)'
        flags: i
      - path: src/lib/shared/config.mjs
        pattern: '^(?![\s\S]*assertNotDestructive)'
        flags: i
      - path: test/kernel/verify.test.mjs
        pattern: 'verify-test\.log'
    tests: true
    drive: true
    security: true
  - n: 4
    files: [src/lib/shared/context.mts, src/lib/util/process.mts, src/lib/verbs/drive/index.mts, src/lib/verbs/drive/run.mts, src/lib/verbs/drive/server.mts, src/lib/verbs/drive/side-effects.mts, test/kernel/drive.test.mjs, test/kernel/side-effects.test.mjs, test/kernel/process.test.mjs, test/kernel/context.test.mjs]
    greps:
      - path: src/lib/util/process.mts
        pattern: 'export function killTree\(pid: number, platform: NodeJS\.Platform\): void'
      - path: src/lib/util/process.mts
        pattern: 'export function startShell\('
      - path: src/lib/shared/context.mts
        pattern: 'platform: process\.platform'
      - path: src/lib/verbs/drive/side-effects.mts
        pattern: '"--literal-pathspecs", "checkout", "--"'
      - path: src/lib/verbs/drive/index.mts
        pattern: 'destructiveCommand\('
      - path: test/kernel/side-effects.test.mjs
        pattern: '\[a\]\.txt'
    tests: true
    drive: true
    security: true
  - n: 5
    files: [src/lib/verbs/preflight/index.mts, src/lib/verbs/preflight/checks.mts, test/kernel/preflight.test.mjs, test/kernel/preflight-checks.test.mjs, test/kernel/migrate.test.mjs]
    greps:
      - path: src/lib/verbs/preflight/checks.mts
        pattern: 'export const CHECKS: PreflightCheck\[\]'
      - path: src/lib/verbs/preflight/checks.mts
        pattern: '^(?![\s\S]*(process\.|homedir))'
        flags: i
      - path: test/kernel/preflight-checks.test.mjs
        pattern: 'CHECKS'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/verbs/mutate/index.mts, src/lib/verbs/mutate/mutant.mts, test/kernel/mutate.test.mjs]
    greps:
      - path: src/lib/verbs/mutate/mutant.mts
        pattern: 'export function pickMutant\(root: string'
      - path: src/lib/verbs/mutate/index.mts
        pattern: 'runStep\('
      - path: test/kernel/mutate.test.mjs
        pattern: 'mutate-test\.log'
    tests: true
    drive: true
    security: false
---
# Design: Refactor item 04c, running things

## Problem

The five verbs that run the project's own commands (`drive`, `check`, `verify`, `mutate`, `preflight`) run them five different ways, crash on a malformed `package.json` (B8), never find a `.sln` file (B5), file drive evidence under the alphabetically last open item instead of the one being worked on (B9), and build `git` command lines as strings (B2). The user approved item 04c (`artifacts/refactor/04c-running-things.md`: E-1 to E-8, its migration and its behaviour table) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`); this record carries them into phases and re-decides none, recording where the code read on 2026-10-23 forces a detail the draft did not see. Binding constraints: items 03, 04a and 04b fixed the layout (`verbs/<verb>/`, `shared/`, `util/`), the work item read model (`readSnapshot`, `stateView`, `listOpenWork`) and `protectionScope(sourceRoot, root, platform)`; every converted module passes the `.mts` scans of `test/kernel/conventions.test.mjs` (no `process.env`, `new Date(`, `homedir(`, `shell: true` outside `util/process.mts`); every phase leaves `npm test` green and the CLI working, because this session drives the harness through `dist/`; `drive-evidence.mjs` and its `logdigest` and `lint.(write|contract)` patterns stay (item 09). Because `picket verify` checks that each `files` path exists, a phase's must_haves name only paths that exist afterwards, and every path a phase deletes goes on its block's Files line.

## Decisions

### D-001: `runShell` runs a user command, `startShell` starts one, `killTree` stops it; `platform` joins `Context`
**Decision:** Infrastructural decision, carrying E-1, C-010 and C-007. `util/process.mts` keeps `runShell(command, { cwd, env, timeoutMs }): ShellResult` as it is (item 02) and gains two functions. `startShell(command, { cwd, env, platform }): ChildProcess` spawns with `shell: true`, `stdio: ["ignore", "pipe", "pipe"]`, `windowsHide: true` and `detached: platform !== "win32"`, which is `drive.mjs:189-196` today; it exists because scan 2 (`SHELL_FORMS`) bans `shell: true` outside `util/process.mts`, so `drive`'s server cannot spawn one itself. `killTree(pid, platform): void` runs `spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true })` on `win32` and `process.kill(-pid, "SIGKILL")` elsewhere, swallowing the error of a process already gone, as `drive.mjs:67-73`. `Context` gains `platform: NodeJS.Platform`, set to `process.platform` by `edgeContext`; `drive` passes it to `startShell` and `killTree`, `preflight` to `onPath` and `protectionScope` (04b D-004 left `preflight` passing `process.platform` "until item 04c"). Every other process runs with argument arrays through `util/git.mts` or `spawnSync(program, args)`.
**Instead of:** reading `process.platform` inside `killTree`: the draft's E-1 asks for the platform passed in, and 07b Y-7 builds its `Host` from the `Context`, so the field is needed there anyway.
**Risks:**
- **RISK-001** `runShell` with a timeout kills the shell but not always its children on Windows (draft R-1), so a test runner that spawns workers can outlive `check --timeout`. Mitigation: unchanged from today's `spawnSync`; `drive`'s server mode keeps `killTree`, which kills the tree.

### D-002: `runStep` runs every test, lint and build step
**Decision:** Infrastructural decision, carrying E-2 and K-3 (an action never calls an action). `shared/checks.mts` replaces `shared/checks.mjs` and exports `STEP_NAMES = ["test", "lint", "build", "command"] as const`, `StepName`, `StepStatus = "passed" | "failed" | "timed out" | "none detected"`, `StepResult = { name; command: string | null; status; exit_code: number | null; ms; log: string | null; tail: string }` (today's step object, key for key), `StepOptions = { env: NodeJS.ProcessEnv; timeoutMs: number; logPrefix: string }` and `runStep(root, name, command, options): StepResult`. A `null` command returns `none detected` without running anything; otherwise it calls `runShell` in `root`, writes the output to `.picket/state/<logPrefix>-<name>.log`, sets `log` to that path relative to the root, `tail` to the last 30 lines on failure, and the status from `exitCode` and `timedOut`. `check`'s plan and its stop-at-first-red loop move into `verbs/check/index.mts` with `renderCheck`, so logs stay `check-<step>.log` (`expediting/steps/30-check.md:9`); `verify`'s `tests` must-have runs `runStep(root, "test", tooling.test, { logPrefix: "verify", timeoutMs: 300_000, env })`; `mutate` runs its baseline, mutant and rebuild through `runStep` with `logPrefix: "mutate"`, no longer through `check()`. Steps take `env` from `ctx.env`.
**Instead of:** keeping `check()` in `shared/` for `mutate` to call: the draft's E-2 removes exactly that verb-calling-verb path, and `check()` is the `check` verb's plan, not a shared rule.
**Risks:**
- **RISK-002** `mutate` now logs to `mutate-test.log` and `mutate-build.log` where it overwrote `check-*.log`, and `verify` writes `verify-test.log` (draft R-2). Mitigation: each is overwritten per run like `check`'s; no skill reads them, and `check`'s own logs keep their names.

### D-003: Tooling detection never throws and returns warnings
**Decision:** Infrastructural decision, carrying E-3 and C-015. `shared/tooling.mts` replaces `shared/tooling.mjs` and exports `Tooling = { test; lint; build; run: string | null; stack: "node" | "dotnet" | "python" | null }` and `detectTooling(root: string): { tooling: Tooling; warnings: string[] }`. A `package.json` that cannot be read or parsed sets `stack: "node"`, detects no npm script and adds `package.json is not valid JSON (<parser message>); no npm scripts detected` (B8); one whose top level is not an object adds `package.json is not a JSON object; no npm scripts detected`. A root holding a file matching `/\.slnx?$/i`, or `Directory.Build.props`, or `global.json`, is `dotnet` (B5). Configured commands still override detection (`{ ...detected, ...loadConfig(root).commands }`). Every caller imports `shared/tooling.mts` and reads `.tooling`; `check` and `verify` add `warnings` to their report only when it is non-empty and render each as `warning: <text>` before the last line; `preflight`'s `tooling` check turns `warn` and appends the warnings to its detail. `tooling.mts` imports `loadConfig` from `config.mjs`, the same exception to C-003 `next-view.mts` already takes for `securityPaths`.
**Instead of:** throwing a `Refused` with the parse error: `guard.bash` and `preflight` need an answer, not a stop, and a project with a broken `package.json` still has a `dotnet` or configured command to run.
**Risks:**
- **RISK-003** A broken `package.json` now silently loses `npm test` where it crashed loudly. Mitigation: the warning reaches the user through `check`, `verify` and `preflight`, the three places a missing test command would be noticed.

### D-004: `currentItem` is the one current-item rule
**Decision:** A domain query over the work item aggregate, carrying E-4 (user approved 2026-10-22). `shared/work/state.mts` gains `lastActivity(state: WorkState, lastVerdict: VerdictRow | null): string` (the later of `updated ?? created` and the last verdict's `ts`, today's `sinceOf`) and `currentItem(root, { session }: { session: string | null }): WorkState | null`: among `listOpenWork(root)` (open and blocked), this session's items when `session` is a session id and one matches, else all; the one with the latest `lastActivity`, ties to the larger id, as `newestOf` does. It reads `state.yaml` and `verdicts.jsonl` (`verdict-log.mts`, which imports nothing from `state.mts`, so no cycle) and never a whole snapshot. `next-view.mts`'s `latest` calls it and reads one snapshot for the answer, its output unchanged. `shared/drive-log.mts` adds `driveTarget(root, { session }): { work_id: WorkId | null; phase: number | null }` (the current item and its `current_phase`). `drive` and `observe.drive` use `driveTarget`; `guard.bash.mjs:1343` and `hook.mjs:39`, which also call `openWorkItem` today, use `currentItem(...)?.id ?? null`. `currentWork` and `openWorkItem` are deleted.
**Instead of:** keeping `latest`'s snapshot-per-item reading and calling it from the hooks: a full snapshot per open item on every Bash call, where two small files are enough to choose.
**Risks:**
- **RISK-004** Evidence moves for users with several open items, and a blocked item can now receive it (draft R-3). Mitigation: that is the approved rule; the B9 test pins it and the phase block names it for the release note.

### D-005: `drive` splits into `index`, `run`, `server` and `side-effects`; `git` takes argument arrays
**Decision:** Infrastructural decision, carrying E-5 and C-010. `verbs/drive/index.mts` holds `DriveInput` (with `hits: Hit[]`, parsed in `parse`, so a bad `--hit` is a `UsageError`), the action as the draft shows it, `driveRow` and `renderDrive` (unchanged). `run.mts` exports `runMode(input, ctx, timeoutMs): RunReport` over `runShell`, output cut to the last 4000 characters. `server.mts` exports `freePort`, `portOpen`, `parseHit` and `serverMode(input, ctx, timeoutMs): Promise<ServerReport>`; it throws `Refused` for no hit or no start command, and takes `PORT` from `ctx.env`. `side-effects.mts` exports `treeSnapshot(root)` and `restoreSideEffects(root, before, keep)` with `gitRead(root, ["status", "--porcelain", "-z", "--untracked-files=no"])`, `gitRead(root, ["ls-files", "-z", "--others", "--exclude-standard"])` and `gitRun(root, ["--literal-pathspecs", "checkout", "--", ...paths])` (B2): a path is one argument, never shell text, and `--literal-pathspecs` stops git reading `*` or `:(glob)` in a file name as a pattern. JSON fields and `renderDrive` output stay.
**Instead of:** quoting paths better in the string: any quoting misses a case on one of two shells, while an argument array has none to miss.
**Risks:**
- **RISK-005** `drive --run` now returns stdout and stderr on success too, where `execSync` returned stdout only. Mitigation: listed in the behaviour table; the field is a tail for a human, and no test or skill parses it.

### D-006: Destructive commands are refused, not thrown
**Decision:** Infrastructural decision, carrying E-6 and C-008. `shared/destructive.mts` replaces `shared/destructive.mjs` and exports `DESTRUCTIVE` (the regex, unchanged) and `destructiveCommand(command: string): string | null`, the matched words without the leading separator (`"npm test && rm -rf x"` gives `"rm"`, `"git push --force"` gives `"git push"`), or `null`. `check --only`, `drive --run` and `drive --start` return `refuse("<verb> refuses to run a destructive command (<match>); run it yourself so the permission prompt sees it", { command })`, exit 2, before anything runs. `config.mjs`'s `destructiveReason` calls `destructiveCommand` with no `try`/`catch`; its warning still matches `commands\.<name> dropped: .*destructive`. `config.mjs` stays `.mjs` (04d), where the draft wrote `config.mts`. `assertNotDestructive` is deleted.
**Instead of:** throwing `Refused` from a shared helper: the check is one line at the top of two actions, and a returned refusal shows where a verb stops.
**Risks:**
- **RISK-006** A rewrite of the destructive check lets a command through. Mitigation: `DESTRUCTIVE` moves unchanged; a table test runs every root in it (`rm`, `sudo`, `git push`, `git reset`, `Remove-Item` and the rest) through `destructiveCommand` and the three flags through the CLI; the phase that does it has its own gate.

### D-007: `preflight` is a list of small checks over one input
**Decision:** Infrastructural decision, carrying E-7 and C-007. `verbs/preflight/checks.mts` exports `Check = { name; level: "ok" | "warn" | "fail"; detail }`, `PreflightInput = { root; snapshot: WorkSnapshot; view: StateView; config; tooling: { tooling; warnings }; git: { repo: boolean; branch: string | null; dirty: string[] }; home; env; platform }`, `onPath(program, env, platform)`, and `CHECKS`, the draft's twelve functions in today's order, each `(input) => Check | Check[] | null`. `index.mts` reads the snapshot first (a read error is the one `work_item` `fail` and stops, as `preflight.mjs:61-67`), builds the input once, runs `CHECKS`, and returns today's JSON `{ ok, checks, tooling, state }`. The `tree` check is `warn` without the identical ternary; extension checks read `input.env`, not `process.env`.
**Instead of:** one check per file: twelve files of five lines, read together every time.
**Risks:**
- **RISK-007** Check order or a detail string drifts, and agents read `preflight --human`. Mitigation: `preflight.test.mjs` passes with only its `onPath` import and call changed, and a new test runs `CHECKS` over one fixed input and compares the full list.

### D-008: `shared/drive-log.mts` owns the drive log
**Decision:** Infrastructural decision, carrying E-8, C-010 and 05 H-7 (which places `maskEnvValues` and the drive log in `shared/` by item 04c). `shared/drive-log.mts` exports `DriveRow` (`ts`, `kind: "drive" | "inspect"`, `command`, `work_id`, `phase`, and the optional `session`, `agent`, `source`, `env`, `ok`, `exit_code`, `port`, `hits` that the two writers set today), `appendDriveRow(root, row)` through `appendJsonl`, `readDriveLog(root): JsonlRead<DriveRow>` through `readJsonl`, `maskEnvValues(command)` moved unchanged from `observe.drive.mjs`, and `driveTarget` (D-004). `drive` and `observe.drive` append; `verify` reads and adds ` (<n> unreadable lines skipped)` to the `drive_observed` detail when a line was bad; `guard.bash.mjs` takes `maskEnvValues` from it, so no hook imports another hook for it.
**Instead of:** leaving `maskEnvValues` in the hook for item 05: `guard.bash.mjs:30` imports `openWorkItem` and `maskEnvValues` together, and this item deletes the first.
**Risks:**
- **RISK-008** A writer forgets to mask a `--env` value now that masking and appending live apart. Mitigation: `maskEnvValues` moves byte for byte, `observe.drive` keeps calling it, and the existing `hooks.test.mjs` masking cases run unchanged.

## Scope

**In:**
- `shared/tooling.mts`, `shared/checks.mts`, `shared/destructive.mts`, `shared/drive-log.mts`, `currentItem` and `lastActivity` in `shared/work/state.mts`, `startShell` and `killTree` in `util/process.mts`, `platform` in `Context` (D-001 to D-008).
- `verbs/check`, `verbs/verify`, `verbs/mutate`, `verbs/preflight` and `verbs/drive` converted to `.mts` in the files the draft names; `verify.mjs`, `mutate.mjs`, `preflight.mjs`, `drive.mjs`, `checks.mjs`, `tooling.mjs`, `destructive.mjs` deleted.
- Callers repointed: `observe.drive.mjs`, `guard.bash.mjs`, `hook.mjs`, `next-view.mts`, `config.mjs`; the B5, B8, B9 and destructive-refusal tests; `src/hooks/README.md:15` and `README.md:72` for the new current-item rule.

**Out:**
- Converting `config.mjs`, `observe.drive.mjs`, `guard.bash.mjs` or `hook.mjs` to `.mts`, and hooks taking a `Context` (items 04d, 05).
- `drive-evidence.mjs` and its `logdigest` and `lint.(write|contract)` patterns (item 09); `statusline` reading `currentItem` (04d).
- Moving tests beside their code (item 06); tests stay in `test/kernel/` and import `dist/`.

## Phase 1: Tooling that never crashes (B5, B8)

**Touch set:**
- `src/lib/shared/tooling.mjs` to `src/lib/shared/tooling.mts`: `git mv`, convert, warnings
- `src/lib/shared/config.mjs`: read only, `loadConfig(root).commands`
- `src/lib/shared/checks.mjs`: `.tooling`, `warnings` in report and `renderCheck`
- `src/lib/verbs/verify/verify.mjs`: `.tooling`, `warnings` in report
- `src/lib/verbs/verify/index.mts`: `VerifyReport.warnings?`, `renderVerify` prints them
- `src/lib/verbs/drive/drive.mjs:183`: `detectTooling(root).tooling.run`
- `src/lib/verbs/mutate/mutate.mjs:133`: `detectTooling(root).tooling.test`
- `src/lib/verbs/preflight/preflight.mjs:86-87`: tooling check with warnings; `tooling` key keeps the `Tooling` object
- `src/lib/hooks/guard.bash.mjs:1148`: `.tooling.test`
- `test/kernel/tooling.test.mjs`: new
- `test/kernel/config.test.mjs:145,152`: `.tooling.test`
- `test/kernel/check.test.mjs`, `test/kernel/preflight.test.mjs`, `test/kernel/verify.test.mjs`: one malformed `package.json` case each

**Changes:**
- `tooling.mts` per D-003, with `npmScripts(root, warnings)` and the dotnet and python checks as small functions; `readText` from `util/io.mts` reads `package.json`.
- `check()` in `checks.mjs` and `verify()` in `verify.mjs` put `warnings` on the report only when non-empty; `renderCheck` and `renderVerify` print `warning: <text>` lines just before `CHECK OK`/`CHECK FAILED` and `VERIFIED`/`NOT VERIFIED`. A report from a sound project is byte for byte what it was.
- `preflight.mjs`'s `tooling` check: `warn` when there is no test command or any warning; detail is today's detail, then `; ` and the warnings joined with `; `. Example: `no test command detected; package.json is not valid JSON (Expected double-quoted property name in JSON at position 36 (line 1 column 37)); no npm scripts detected`.
- `guard.bash.mjs` keeps its `try`/`catch`; with no throw, a malformed `package.json` now reads as "no test command", so `picket verify` there no longer asks (the verify runs nothing).

**Done when:**
- **T-1.1** The paths in this phase's `files` exist and `src/lib/shared/tooling.mjs` does not; `npm run typecheck` exits 0; `npm test` passes with no fewer passing tests than at `5aeea03`, plus the new ones.
- **T-1.2** `tooling.test.mjs` shows a folder holding only `App.sln` giving `{ test: "dotnet test", lint: null, build: "dotnet build", run: null, stack: "dotnet" }` with `warnings: []`, the same for only `App.slnx` and for only `Directory.Build.props`, and a folder with only `pyproject.toml` giving `pytest`.
- **T-1.3** `tooling.test.mjs` shows `package.json` text `{ "scripts": { "test": "node t.js", }` giving `stack: "node"`, all four commands `null`, and one warning matching `^package\.json is not valid JSON \(.+\); no npm scripts detected$`; the text `null` giving one warning and no throw; and a configured `commands.test` of `node -e 1` winning over a malformed file, with the warning kept.
- **T-1.4** Driven through `picket drive --run`: `picket check --root <tmp>` on a folder with the malformed `package.json` exits 0, prints `test: none detected` and a `warnings` array holding the parse message, and no stack trace; `picket check --root <tmp>` on a sound fixture prints JSON with no `warnings` key.
- **T-1.5** Driven through `picket drive --run`: `picket preflight <id> --root <tmp> --human` on an item in that folder prints a `warn tooling:` line containing `package.json is not valid JSON`; `picket verify <id> 1 --root <tmp>` for a phase with `tests: true` exits 2 with `tests` false, detail `no test command detected`, and the warning under `warnings`.
- **T-1.6** `git grep -n "detectTooling" -- src` shows every call reading `.tooling` or destructuring `{ tooling`, and every import naming `shared/tooling`.

## Phase 2: One current item and one drive log (B9)

**Touch set:**
- `src/lib/shared/work/state.mts`: `lastActivity`, `currentItem` (D-004)
- `src/lib/shared/work/verdict-log.mts`: read only, `readVerdicts`
- `src/lib/shared/work/next-view.mts:60-97`: `latest` over `currentItem`; `sinceOf` and `newestOf` go
- `src/lib/shared/drive-log.mts`: new (D-008), with `driveTarget`
- `src/lib/verbs/drive/drive.mjs`: `currentWork` and `logRow` go; `driveTarget`, `appendDriveRow`
- `src/lib/verbs/drive/index.mts`: passes `ctx.session` to `drive`
- `src/lib/verbs/verify/verify.mjs:19-33,72-73`: `readDriveLog` from `shared/drive-log`, skipped count
- `src/lib/hooks/observe.drive.mjs`: `openWorkItem`, `maskEnvValues` go; `driveTarget`, `appendDriveRow`
- `src/lib/hooks/guard.bash.mjs:30,1343`: imports from `shared/drive-log.mjs`, `currentItem`
- `src/lib/hooks/hook.mjs:39-45`: `currentItem` instead of the dynamic hook import
- `src/hooks/README.md:15`, `README.md:72`: the current-item rule in one clause
- `test/kernel/current-item.test.mjs`, `test/kernel/drive-log.test.mjs`: new
- `test/kernel/verify.test.mjs`: a bad drive-log line case
- `test/kernel/next.test.mjs`: read only, must pass unchanged
- `test/hooks/hooks.test.mjs:737-756`: a two-item case for `observe.drive`

**Changes:**
- `state.mts`: `lastActivity` and `currentItem` per D-004; `latest` keeps its empty answer, its extra keys and `since: lastActivity(...)`, so its JSON does not change.
- `drive-log.mts` per D-008. `driveTarget` returns `{ work_id: null, phase: null }` when there is no current item, and the item's `currentPhase(readSnapshot(...))?.n ?? null` otherwise.
- `drive.mjs` takes `o.session`; `--work <id>` still wins, with `phase: null` unless `--phase` is given, as today. Both writers build their rows exactly as now and pass them to `appendDriveRow`.
- `hook.mjs`'s denial row and `guard.bash.mjs`'s escalation row take `work_id` from `currentItem(root, { session })?.id ?? null`, `session` being the event's `session_id`.
- Docs: `observe.drive` tags rows "with the current work item (the most recently active open or blocked item, this session's first) and its phase"; `picket next --latest` answers that same item.
- Behaviour change: with two items open, evidence goes to the most recently active one, this session's first (draft table, last row).

**Done when:**
- **T-2.1** The paths in this phase's `files` exist; `git grep -nE "openWorkItem|currentWork" -- src test` finds nothing; `npm run typecheck` exits 0; `npm test` passes, with `next.test.mjs` unchanged.
- **T-2.2** `current-item.test.mjs` with `20261022-zeta-older` (open, updated `2026-10-22T08:00:00.000Z`) and `20261022-alpha-newer` (open, updated `2026-10-22T15:00:00.000Z`) shows `currentItem(root, { session: null })` returning `20261022-alpha-newer`; a verdict on `zeta` at `16:00` makes `zeta` current; `zeta` stamped with session `s1` is current for `{ session: "s1" }` only; a newer blocked item is current; a root with only done items gives `null`.
- **T-2.3** `drive-log.test.mjs` shows `appendDriveRow` adding one line after a file that ends mid-line, `readDriveLog` returning the good rows with `skipped: 1` for one bad line, and `maskEnvValues('picket drive --env TOKEN="a b" --run x')` giving `picket drive --env TOKEN=*** --run x`.
- **T-2.4** Driven through `picket drive --run`: a script under `.picket/state/scratch/` builds the two items of T-2.2 in a temp root, runs `picket drive --run "node -e 0" --root <tmp>` and spawns `dist/hooks/observe.drive.mjs` with a `curl` command there; both new rows of `.picket/state/drive-log.jsonl` carry `work_id: "20261022-alpha-newer"`.
- **T-2.5** `verify.test.mjs` shows a drive log with one unreadable line and one row for the phase giving `drive_observed` true with a detail ending `(1 unreadable line skipped)`; with no bad line the detail is what it was.
- **T-2.6** `maskEnvValues` is exported only by `src/lib/shared/drive-log.mts`, and no file under `src/lib/hooks/` imports `./observe.drive.mjs`.

## Phase 3: One way to run a step; destructive commands refused

**Touch set:**
- `src/lib/shared/checks.mjs` to `src/lib/shared/checks.mts`: only `runStep` and its types remain (D-002)
- `src/lib/shared/destructive.mjs` to `src/lib/shared/destructive.mts`: `destructiveCommand` (D-006)
- `src/lib/shared/config.mjs:4,111-118`: `destructiveCommand`, no `try`/`catch`
- `src/lib/verbs/check/index.mts`: plan, loop, refusal, `renderCheck`; `check()` moves here
- `src/lib/verbs/verify/verify.mjs` into `src/lib/verbs/verify/index.mts`: `verify(root, id, n, { runTests, env })`, `runStep`
- `src/lib/verbs/mutate/mutate.mjs:3,104-110`: `runStep` instead of `check()`; `env` option
- `src/lib/verbs/mutate/index.mts`: passes `ctx.env`
- `src/lib/verbs/drive/drive.mjs:162-163`: `destructiveCommand`, `throw new Refused(...)`
- `src/lib/shared/paths.mts`: read only, `statePath`, `stateRel`
- `test/kernel/run-step.test.mjs`, `test/kernel/destructive.test.mjs`: new
- `test/kernel/check.test.mjs`, `test/kernel/drive.test.mjs`: refusal cases
- `test/kernel/verify.test.mjs:7,49-61`: import `index.mjs`, root-first call, failure detail case
- `test/hooks/hooks.test.mjs:510-513`: the kernel layer refuses on stdout with exit 2
- `test/hooks/handlers.test.mjs:410-416`: the executed-flags test reads a literal list
- `src/skills/expediting/steps/30-check.md:9`: read only, `check-*.log` stays

**Changes:**
- `checks.mts` per D-002; `runShell` gets `cwd: root`, the caller's `env` and `timeoutMs`.
- `verbs/check/index.mts`: `CHECK_ORDER = ["test", "lint", "build"] as const`; the action refuses a destructive `--only` first (D-006), then detects tooling, plans, runs `runStep` with `logPrefix: "check"`, `timeoutMs` default 300 000 and `ctx.env`, stops at the first red step, and returns `{ ok, steps, skipped, warnings? }`, the same JSON as today.
- `verify` per D-002: passed gives detail `npm test`; anything else gives `<status> · <command> · log <log>`, for example `failed · npm test · log .picket/state/verify-test.log`; `--no-tests` keeps `skipped (npm test)`.
- `mutate.mjs`'s `stepStatus(root, step, env)` calls `runStep(root, step, tooling[step], { env, timeoutMs: 300_000, logPrefix: "mutate" })` inside today's `try`.
- `drive.mjs` throws `Refused` with D-006's message and `{ command }` before it snapshots the tree; phase 4 moves this into `index.mts`.
- `handlers.test.mjs`: the flags whose value runs are the literal `["--only", "--run", "--start"]`, each asserted in `WRAPPING_FLAGS`; the refusals themselves are pinned in `check.test.mjs` and `drive.test.mjs`.
- Behaviour changes, draft table rows 1 to 3: a destructive `check --only`, `drive --run` or `drive --start` exits 2 with `{ ok: false, error, command }`; a failed `verify` test step names its status, command and log.

**Done when:**
- **T-3.1** The paths in this phase's `files` exist; `shared/checks.mjs`, `shared/destructive.mjs` and `verbs/verify/verify.mjs` do not; `git grep -n assertNotDestructive -- src test` finds nothing; `npm run typecheck` exits 0; `npm test` passes, with `mutate.test.mjs` and `config.test.mjs` unchanged.
- **T-3.2** `run-step.test.mjs` shows `node -e 0` as `passed` with `exit_code: 0`, `tail: ""` and its log file written; `node -e "console.error('boom'); process.exit(3)"` as `failed`, `exit_code: 3`, `tail` containing `boom`; `node -e "setTimeout(() => {}, 5000)"` with `timeoutMs: 300` as `timed out`; a `null` command as `none detected` with `exit_code: null`, `log: null` and no file written.
- **T-3.3** `destructive.test.mjs` shows `destructiveCommand` giving `rm` for `npm test && rm -rf x`, `git push` for `git push --force`, `Remove-Item` for `Remove-Item x`, and `null` for `npm test`, `git status` and `echo firmware`, and a non-null answer for one sample of every alternative in `DESTRUCTIVE`.
- **T-3.4** Driven by the spawn tests: `picket check --only "rm -rf x" --root <tmp>` exits 2 and prints `{"ok":false,"error":"check refuses to run a destructive command (rm); run it yourself so the permission prompt sees it","command":"rm -rf x"}` and writes no `check-command.log`; `picket drive --run "rm -rf src"` and `picket drive --start "sudo node s.mjs" --hit /` exit 2 with `refuses to run a destructive command` on stdout.
- **T-3.5** `verify.test.mjs` shows a phase with `tests: true` and the test script `node -e "process.exit(1)"` giving `tests` false with detail `failed · npm test · log .picket/state/verify-test.log`, and that file existing.
- **T-3.6** `check.test.mjs` passes with its existing cases unchanged (`check-test.log` still written), and a `mutate` run writes `.picket/state/mutate-test.log` and no `check-test.log`.

## Phase 4: `drive` in four files (B2)

**Touch set:**
- `src/lib/shared/context.mts`: `platform` (D-001)
- `src/lib/util/process.mts`: `startShell`, `killTree`
- `src/lib/util/git.mts`: read only, `gitRead`, `gitRun`
- `src/lib/verbs/drive/drive.mjs`: deleted; contents split as below
- `src/lib/verbs/drive/index.mts`: input, parse with `Hit[]`, action, `driveRow`, `renderDrive`
- `src/lib/verbs/drive/run.mts`, `server.mts`, `side-effects.mts`: new (D-005)
- `src/lib/shared/drive-log.mts`: read only, `appendDriveRow`, `driveTarget`
- `test/kernel/drive.test.mjs:7`: imports from `dist/lib/verbs/drive/server.mjs`; refusal cases
- `test/kernel/side-effects.test.mjs`: new
- `test/kernel/process.test.mjs`, `test/kernel/context.test.mjs`: `startShell`, `killTree`, `platform`

**Changes:**
- `edgeContext` sets `platform: process.platform`; `startShell` and `killTree` per D-001.
- `index.mts` per the draft's sketch: refuse a destructive command, take `work` from `--work` or `driveTarget(ctx.root, { session: ctx.session })`, snapshot the tree, run `runMode` or `serverMode`, restore side effects, append the row with `ts: ctx.now().toISOString()`, and return `done` or `failed` on `ok`. Default timeout 20 000 ms.
- `run.mts` passes `{ ...ctx.env, ...input.env }`; `server.mts` passes `{ ...ctx.env, PORT, ...input.env }` to `startShell`, waits, hits, `killTree(child.pid, ctx.platform)`, and waits up to 3 s for the port to close, as `drive.mjs:204-222`.
- `side-effects.mts` per D-005; a `null` from `gitRead` (not a repository) is `[]`, a `GitFailed` from `checkout` restores nothing, as today's `catch`.
- Behaviour changes: no `--hit` and no `--run`, or no start command, exit 2 as refusals where they crashed with exit 1; `--hit ""` is a usage error, exit 1; `drive --run` output holds stderr on success too.

**Done when:**
- **T-4.1** The paths in this phase's `files` exist and `src/lib/verbs/drive/drive.mjs` does not; `git grep -nE "execSync|shell: true|process\.(env|platform)|new Date\(" -- src/lib/verbs/drive` finds nothing; `npm run typecheck` exits 0; `npm test` passes, with `drive.test.mjs` changed only in its import line and new cases.
- **T-4.2** `side-effects.test.mjs`, in a temp repository, shows a tracked file named `$(echo hi).txt` that the drive changed restored by its real name, and, with `a.txt` and `[a].txt` both tracked and the user's own change in `a.txt` before the drive, only `[a].txt` restored while `a.txt` keeps the user's change.
- **T-4.3** `process.test.mjs` shows `startShell("node -e \"setInterval(() => {}, 1000)\"", ...)` started and `killTree(child.pid, process.platform)` ending it within 3 s; `context.test.mjs` shows `edgeContext("/r").platform` equal to `process.platform`.
- **T-4.4** Driven: `picket drive --start "node server.mjs" --hit /health --root <fixture>` prints `server stopped` and `DRIVE OK` under `--human`, and the port no longer answers afterwards; the existing `drive.test.mjs` server, `--run`, restore and `--env` cases pass.
- **T-4.5** `drive.test.mjs` shows `picket drive --root <tmp>` with no `--hit` exiting 2 with `drive needs at least one --hit`, `--hit /x` with no start command exiting 2 with `no start command detected: pass --start "<command>"`, and `--hit ""` exiting 1 with `picket: ` on stderr.

## Phase 5: `preflight` as a list of checks

**Touch set:**
- `src/lib/verbs/preflight/preflight.mjs`: deleted; contents to `checks.mts` and `index.mts`
- `src/lib/verbs/preflight/checks.mts`: new (D-007)
- `src/lib/verbs/preflight/index.mts`: builds `PreflightInput` once, runs `CHECKS`; exports `preflight(root, id, machine)`
- `src/lib/shared/git.mts`, `src/lib/shared/sources/places.mts`, `src/lib/shared/sources/protection.mts`, `src/lib/shared/extensions.mjs`, `src/lib/shared/saved-rules.mjs`: read only
- `test/kernel/preflight.test.mjs:8,78`: `onPath` from `checks.mjs` with `env` and `platform`
- `test/kernel/migrate.test.mjs:7,157,161`: `preflight(root, id, { home: root, env: {}, platform: process.platform })`
- `test/kernel/preflight-checks.test.mjs`: new

**Changes:**
- `checks.mts` per D-007: `workItemCheck`, `statusCheck`, `artifactCheck`, `branchCheck`, `treeCheck`, `toolingCheck`, `projectMapCheck`, `legacyCheck`, `savedRulesCheck`, `configCheck`, `sourceChecks`, `extensionChecks`, each a few lines; `configCheck` and the per-source and per-extension checks return `Check[]`; a `null` adds nothing. Detail strings move unchanged, including `scopeText`.
- `index.mts`: `preflight(root, id, { home, env, platform })` reads the snapshot (a failure returns `{ ok: false, checks: [work_item fail], tooling: null }`), `loadConfig(root, env)`, `detectTooling(root)`, the git facts and the input, then maps `CHECKS`; the action passes `ctx.home`, `ctx.env`, `ctx.platform`; `ok` is no `fail`; `renderPreflight` stays.
- `EXTENSION_CHECKS` take the input: `env_set` reads `input.env`, `command_on_path` calls `onPath(value, input.env, input.platform)`.

**Done when:**
- **T-5.1** The paths in this phase's `files` exist and `preflight.mjs` does not; `npm run typecheck` exits 0; `npm test` passes, with `preflight.test.mjs` and `migrate.test.mjs` changed only in the `onPath` and `preflight` import and call lines.
- **T-5.2** `preflight-checks.test.mjs` runs `CHECKS` over one fixed input (an open design item with no `design.md`, branch `trunk`, 7 dirty paths `a` to `g`, tooling `npm test`, no project map, no legacy paths, no saved rules, no sources, no extensions) and gets, in order, `work_item ok`, `status ok`, `artifact warn`, `branch ok`, `tree warn 7 uncommitted path(s) outside work/: a, b, c, d, e, …`, `tooling ok`, `project_map warn`, `saved_rules ok`, `extensions ok none`.
- **T-5.3** The same test shows `treeCheck` `warn` both at `current_phase` 1 and 3, `statusCheck` `fail` with `blocked: <reason>` for a blocked item, and `env_set` passing with `env: { ACME_TOKEN: "1" }` while `process.env` lacks `ACME_TOKEN`.
- **T-5.4** Driven through `picket drive --run`: `picket preflight 20261023-refactor-item-04c-running-things --human` prints the same check names in the same order as before the phase (`work_item`, `status`, `artifact`, `branch`, `tree`, `tooling`, `project_map`, then the rest) and its last line is `PREFLIGHT OK`.

## Phase 6: `mutate` in two typed files

**Touch set:**
- `src/lib/verbs/mutate/mutate.mjs`: deleted; contents to `mutant.mts` and `index.mts`
- `src/lib/verbs/mutate/mutant.mts`: new; operator tables, `pickMutant`, `withMutant`, `restoreLeftover`
- `src/lib/verbs/mutate/index.mts`: `mutate(root, id, { env, now })`, outcomes, `renderMutation`, the action
- `src/lib/shared/comments.mjs`, `src/lib/shared/silenced.mjs`, `src/lib/shared/git.mts`, `src/lib/shared/mutation.mjs`: read only
- `test/kernel/mutate.test.mjs:8` and its `mutate(id, { root })` calls: new imports and root-first calls

**Changes:**
- `mutant.mts` exports `Mutant = { path; line; col; from; to }`, `pickMutant(root, base): Mutant | null`, `withMutant<T>(root, mutant, run: () => T): T`, `restoreLeftover(root): string | null`, with today's logic; it imports `shared/git.mts` by its `.mts` name.
- `index.mts`: `mutate` writes `mutation.json` with `ts: now().toISOString()` and runs every step through `runStep` with `logPrefix: "mutate"`; the action passes `ctx.env` and `ctx.now`; outcomes, `REBUILD_PROBLEMS` and the rendered lines are unchanged.

**Done when:**
- **T-6.1** The paths in this phase's `files` exist and `mutate.mjs` does not; `npm run typecheck` exits 0; `npm test` passes, with `mutate.test.mjs` changed only in imports, call form and the new assertions.
- **T-6.2** `mutate.test.mjs` shows a run with `now` returning `2026-10-23T10:00:00.000Z` saving that `ts` in `mutation.json`, and `.picket/state/mutate-test.log` written by the baseline.
- **T-6.3** `git grep -nE "shared/checks\.mjs|verbs/check|new Date\(|process\." -- src/lib/verbs/mutate` finds nothing, and `conventions.test.mjs` passes, its built-name scan included.
- **T-6.4** Driven through `picket drive --run`: `picket mutate <id> --root <fixture>` on a fixture with an uncaught `<` prints `mutant src/a.js:3 < -> >=: survived` under `--human`, exits 0, and leaves `src/a.js` byte for byte as before.

## Open questions

none

## Revision log
