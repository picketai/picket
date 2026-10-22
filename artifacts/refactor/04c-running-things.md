# 04c: Running things

Status: approved (2026-10-22).

The five verbs that run the project's own commands (`drive`, `check`, `verify`, `mutate`, `preflight`) get one way to run a shell command, one way to run a test, lint or build step, tooling detection that never crashes, and one rule for which work item is current. Fixes B2, B5, and two bugs found in this pass: B8 (a malformed `package.json` crashes five verbs) and B9 (drive evidence lands on the wrong item).

## Today

### Five ways to run a command

| Where | How | Output kept | Timeout reported |
|---|---|---|---|
| `drive --run` (`drive.mjs:168`) | `execSync(string)` | last 4000 characters | as exit 1 |
| `drive --start` (`drive.mjs:183`) | `spawn(shell: true, detached)`; stopped with `execSync("taskkill /PID ...")` | server log tail | no |
| `check` (`check.mjs:36`) | `spawnSync(shell: true)` | log file and tail | `"timed out"` |
| `verify`, the `tests` must-have (`verify.mjs:63`) | `execSync(test, stdio: "ignore")` | nothing | no |
| `mutate` (`mutate.mjs:102`) | calls the `check` verb | through `check` | through `check` |

`verify` runs the same command as `check` and discards the output: a failing `tests` must-have says only `npm test failed`. `mutate` calling `check` is a verb calling a verb (K-3).

### Bugs

- **B2:** `checkout()` (`drive.mjs:108`) builds `` `git checkout -- "${p}"` ``; `gitEntries()` (`:74`) runs `git status` and `git ls-files` as strings.
- **B5:** `["*.sln"].some(() => existsSync(join(root, "Directory.Build.props")) || existsSync(join(root, "global.json")))` (`tooling.mjs:20`) never looks for a `.sln` file. A folder holding only `App.sln` gives `{"test":null,"lint":null,"build":null,"run":null,"stack":null}`.
- **B8 (new):** `detectTooling` parses `package.json` with a bare `JSON.parse`. With `{ "scripts": { "test": "node t.js", }` it throws `SyntaxError: Expected double-quoted property name in JSON at position 36`, which crashes `check`, `drive`, `verify`, `mutate`, `preflight` and the `guard.bash` hook's test-command lookup (`guard.bash.mjs:1148`).
- **B9 (new):** three rules for the current item. `drive.mjs:35` (`currentWork`) and `hooks/observe.drive.mjs:15` (`openWorkItem`) are copies: the last *open* id in alphabetical order. `next --latest` takes the most recently active item (open or blocked), this session's first. Reproduced with two open items of the same day:

  ```
  drive currentWork    -> 20261022-zeta-older
  hook openWorkItem    -> 20261022-zeta-older
  next --latest        -> 20261022-alpha-newer
  ```

  Drive evidence is filed under `zeta`, so `verify`'s `drive_observed` must-have fails on `alpha`, the item being worked on.

### Shape

- `drive()` (`drive.mjs:153`, 79 lines) holds both modes, server management, side-effect restore and logging.
- `preflight()` (`preflight.mjs:57`, 59 lines) is a run of `add(...)` calls, including a ternary with identical branches (`:83`: `s.current_phase > 1 ? "warn" : "warn"`).
- `assertNotDestructive` throws a plain `Error`, so `picket check --only "rm -rf x"` exits 1 as a crash; `config.mjs:102` wraps it in `try`/`catch` only to turn the throw back into a string.
- `detectTooling` is re-exported through `preflight.mjs:16` and imported from there by `check`, `drive`, `mutate` and `verify`.

## Target

```
src/lib/util/process.mts          runShell(command, opts) -> ShellResult; killTree(pid)
src/lib/shared/
  checks.mts                      StepName, StepResult; runStep(root, name, command, opts)
  tooling.mts                     Tooling; detectTooling(root) -> { tooling, warnings }    (B5, B8)
  destructive.mts                 destructiveCommand(command) -> string | null
  drive-log.mts                   appendDriveRow, readDriveLog (through io.mts)
  work/state.mts                  currentItem(root, { session }), the one rule             (B9)
src/lib/verbs/
  check/index.mts
  verify/index.mts
  mutate/index.mts  mutant.mts
  preflight/index.mts  checks.mts
  drive/index.mts  run.mts  server.mts  side-effects.mts                                   (B2)
```

### One way to run a command

```ts
// src/lib/util/process.mts
export type ShellOptions = { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number };
export type ShellResult = { exitCode: number; output: string; ms: number; timedOut: boolean };

export function runShell(command: string, { cwd, env, timeoutMs }: ShellOptions): ShellResult {
  const started = Date.now();
  const r = spawnSync(command, { cwd, env, shell: true, encoding: "utf8", timeout: timeoutMs, windowsHide: true });
  return { exitCode: r.status ?? 1, output: `${r.stdout ?? ""}${r.stderr ?? ""}`, ms: Date.now() - started, timedOut: r.error?.code === "ETIMEDOUT" };
}

export function killTree(pid: number, platform: NodeJS.Platform): void
```

`runShell` is the named exception of K-6: commands the user supplies or the project defines are shell commands by nature. Everything else runs with argument arrays.

### One way to run a step

```ts
// src/lib/shared/checks.mts
export type StepName = "test" | "lint" | "build" | "command";
export type StepResult = {
  name: StepName; command: string | null;
  status: "passed" | "failed" | "timed out" | "none detected";
  exit_code: number | null; ms: number; log: string | null; tail: string;
};

export function runStep(root: string, name: StepName, command: string | null, { env, timeoutMs, logPrefix }: StepOptions): StepResult
```

- `check` loops `runStep` over its plan and stops at the first red step, as today; logs stay `.picket/state/check-<step>.log`.
- `verify`'s `tests` must-have calls `runStep(root, "test", tooling.test, { logPrefix: "verify" })`. A failure reads `tests: failed · npm test · log .picket/state/verify-test.log` instead of `npm test failed`, and a timeout says `timed out`.
- `mutate` calls `runStep` for the baseline and for the mutant, not the `check` verb.

### Tooling that never crashes (B5, B8)

```ts
// src/lib/shared/tooling.mts
export type Tooling = { test: string | null; lint: string | null; build: string | null; run: string | null; stack: "node" | "dotnet" | "python" | null };

export function detectTooling(root: string): { tooling: Tooling; warnings: string[] } {
  const warnings: string[] = [];
  const scripts = npmScripts(root, warnings);           // a parse error adds "package.json is not valid JSON (...); no npm scripts detected"
  const dotnet = readdirSync(root).some((name) => /\.slnx?$/.test(name)) || existsSync(join(root, "Directory.Build.props")) || existsSync(join(root, "global.json"));
  ...
  return { tooling: { ...detected, ...loadConfig(root).commands }, warnings };
}
```

`check`, `verify` and `preflight` show the warnings; `preflight`'s `tooling` check turns `warn` with the message. Configured commands still override detection. Every caller imports from `shared/tooling.mts`; the re-export through `preflight` goes (C-015).

### One current item (B9)

```ts
// src/lib/shared/work/state.mts
export function currentItem(root: string, { session }: { session: string | null }): WorkState | null
```

Today's `next --latest` rule, unchanged: among open and blocked items, this session's first, then the most recent activity (`updated` or the last verdict's time). `drive`, the `observe.drive` hook and `next --latest` call it; `currentWork` and `openWorkItem` are deleted. The user chose this on 2026-10-22, accepting that a blocked item can now receive drive evidence.

### Refusing destructive commands

```ts
// src/lib/shared/destructive.mts
export function destructiveCommand(command: string): string | null     // the matched text, or null
```

`check --only`, `drive --run` and `drive --start` return `refuse(...)` (exit 2) with the matched text; `config.mts` warns with it directly, no `try`/`catch`.

### `drive` in four files

```ts
// src/lib/verbs/drive/index.mts
export const drive = action<DriveInput, DriveReport>(async (input, ctx) => {
  const dangerous = destructiveCommand(input.run ?? input.start ?? "");
  if (dangerous) return refuse(`drive refuses to run a destructive command (${dangerous}); run it yourself so the permission prompt sees it`, { command: input.run ?? input.start });
  const work = input.work ?? currentWorkRef(ctx);
  const before = treeSnapshot(ctx.root);
  const report = input.run ? runMode(input, ctx) : await serverMode(input, ctx);    // serverMode refuses without hits or a start command
  if (report.status === "refused") return report;
  const result = { ...report.value, ...restoreSideEffects(ctx.root, before, input.keepChanges) };
  appendDriveRow(ctx.root, driveRow(input, work, result, ctx.now()));
  return result.ok ? done(result) : failed(result);
});
```

- `run.mts`: `runShell(input.run, { cwd: root, env: { ...ctx.env, ...input.env }, timeoutMs })`.
- `server.mts`: start, wait for the port, send the hits, stop with `killTree`, wait for the port to close.
- `side-effects.mts`: `gitRead(root, ["status", "--porcelain", "-z", "--untracked-files=no"])`, `gitRead(root, ["ls-files", "-z", "--others", "--exclude-standard"])`, and `gitRun(root, ["checkout", "--", ...paths])` (B2).

The JSON fields and `renderDrive` stay as they are.

### `preflight` as a list of checks

```ts
// src/lib/verbs/preflight/checks.mts
export type Check = { name: string; level: "ok" | "warn" | "fail"; detail: string };
type PreflightCheck = (input: PreflightInput) => Check | Check[] | null;

export const CHECKS: PreflightCheck[] = [
  workItemCheck, statusCheck, artifactCheck, branchCheck, treeCheck, toolingCheck,
  projectMapCheck, legacyCheck, savedRulesCheck, configCheck, sourceChecks, extensionChecks,
];
```

`PreflightInput` is built once: the snapshot (04a), the config, the tooling result, git facts, and `home` from the `Context`. Each check is a few lines with its own test; the JSON and `renderPreflight` output stay.

## Evidence (2026-10-22)

- B5: `detectTooling` on a folder with only `App.sln` returned `{"test":null,"lint":null,"build":null,"run":null,"stack":null}`.
- B8: `detectTooling` on a folder whose `package.json` is `{ "scripts": { "test": "node t.js", }` threw `SyntaxError: Expected double-quoted property name in JSON at position 36`.
- B9: the three-line reproduction above, with `20261022-zeta-older` (updated 08:00) and `20261022-alpha-newer` (updated 15:00), both open.
- Callers of `detectTooling`: `check.mjs:19`, `drive.mjs:182`, `mutate.mjs:125`, `preflight.mjs:87`, `verify.mjs:64`, `hooks/guard.bash.mjs:1148`. Callers of the destructive check: `check.mjs:21`, `drive.mjs:161-162`, `config.mjs:102`.
- No skill or agent reads the words of `verify`'s `tests` detail; `expediting/steps/30-check.md:9` describes `check`'s logs under `.picket/state/check-*.log`, which stay.

## Decisions

### E-1: `runShell` is the one way to run a user command
In `util/process.mts`; `killTree` uses `spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"])` on Windows and `process.kill(-pid, "SIGKILL")` elsewhere, with the platform passed in.

### E-2: `runStep` is the one way to run a step
Used by `check`, `verify` and `mutate`; `verify`'s test failures get a log (`verify-test.log`) and a timeout status; `mutate` no longer calls a verb.

### E-3: Tooling detection never throws (fixes B5, B8)
Warnings instead of a crash on a bad `package.json`; `.sln` and `.slnx` are found by name. One import path, no re-export.

### E-4: `currentItem` is the one current-item rule (fixes B9)
Today's `next --latest` rule, used by `drive`, `observe.drive` and `next --latest`. Approved by the user on 2026-10-22.

### E-5: `drive` splits into `run`, `server` and `side-effects` (fixes B2)
Git through argument arrays; JSON and rendering unchanged.

### E-6: Destructive commands are refused, not thrown
`destructiveCommand` returns the matched text; exit 2 instead of a crash.

### E-7: `preflight` is a list of small checks
Built from one `PreflightInput`; output unchanged; the identical ternary goes.

### E-8: `shared/drive-log.mts` owns the drive log
`drive` and the `observe.drive` hook append, `verify` reads; through `io.mts`, so a bad line is skipped and counted.

## Migration

One phase, after 04a (`currentItem`, the snapshot) and 04b (`protectionScope` takes `env` and `platform`).

- `util/process.mts`, `shared/checks.mts`, `shared/tooling.mts`, `shared/destructive.mts`, `shared/drive-log.mts`, `currentItem` in `shared/work/state.mts`.
- Tests: the `App.sln`, `App.slnx` and trailing-comma `package.json` cases; the two-item B9 case for `currentItem`; `runStep` passed, failed and timed out; a destructive `--only` refused with exit 2.
- `verbs/check`, `verbs/verify`, `verbs/mutate`, `verbs/preflight`, `verbs/drive`; `currentWork` and `openWorkItem` deleted; `observe.drive` (item 05) calls `currentItem`.
- `drive.test.mjs`, `check.test.mjs`, `verify.test.mjs`, `mutate.test.mjs` and `preflight.test.mjs` pass unchanged except where the table of behaviour changes below says otherwise.

| Behaviour change | Before | After |
|---|---|---|
| destructive `check --only`, `drive --run`, `drive --start` | exit 1, crash message | exit 2, `{ ok: false, error, command }` |
| `verify` `tests` failure detail | `npm test failed` | `failed · npm test · log .picket/state/verify-test.log` |
| `verify` `tests` timeout | `npm test failed` | `timed out · npm test · log ...` |
| malformed `package.json` | crash in five verbs and a hook | a warning; no npm scripts detected |
| a folder with only `App.sln` | no stack detected | `dotnet`, `dotnet test`, `dotnet build` |
| drive evidence with two items open | alphabetically last open item | most recently active item, this session's first |

## Risks

- R-1: `runShell` with `shell: true` and a timeout kills the shell, not always its children on Windows; same as today's `execSync`. `drive`'s server mode keeps `killTree` for that reason.
- R-2: `verify` writing its own log means a second file under `.picket/state/`; it is overwritten on each run, like `check`'s.
- R-3: B9's fix moves evidence for users with several open items; `verify` on the older item may now report `drive_observed: false` where it passed by accident. That is the correct answer; the release note says so.

## Affects

- 03: the tree gains `shared/drive-log.mts`; `destructive.mts`, `checks.mts` and `tooling.mts` were already listed.
- 04a: `shared/work/state.mts` gains `currentItem`.
- 04d: `next --latest` is reported by `statusline` through `currentItem`.
- 05: `observe.drive` calls `currentItem` and `appendDriveRow`; `guard.bash` reads `detectTooling(root).tooling.test`.
- The findings list gains B8 and B9.

## Open questions

None.
