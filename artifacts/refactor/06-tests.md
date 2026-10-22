# 06: Tests

Status: approved (2026-10-22).

Unit tests move next to the code they test as `*.test.mts` and run on `src/` without a build; tests of the built product and of the repository stay in `test/`. Everything runs in parallel except the cold-start timing tests, which run alone at the end: today's suite already passes that way in 34 s instead of 118 to 144 s. Shared helpers come from `#test/...`, temp folders are removed through `t.after`, tests read the verb and hook registries, and the mod tests run in `npm test` and in CI (B7).

## Today

| Fact | Value |
|---|---|
| Test files | 55 under `test/` (31 in `test/kernel`, 8 in `test/kernel/styling`, 3 in `test/hooks`, 4 in `test/skills`, 5 at the top), 7 in `bench/test`, 6 in the mods |
| Runner | `scripts/test.mjs`: every `*.test.mjs` under `test/` and `bench/test/` in one `node --test --test-concurrency=1` |
| Duration | 118 s run file by file; 132 to 144 s through `npm test`; 728 tests |
| Slowest files | `hooks/hooks.test.mjs` 20.6 s, `kernel/close.test.mjs` 15.2 s, `kernel/sources.test.mjs` 12.9 s, `kernel/route.test.mjs` 7.7 s, `kernel/review.test.mjs` 6.9 s |
| Temp folders | `mkdtempSync` 89 times in 37 files; cleanup by hand, `rmSync` 332 times in 36 files and `finally` 122 times; `t.after` never used |
| Copied helpers | `const BIN = resolve("core/bin/picket.mjs")` in 13 files; `function git(` in 4; `const decision = ` 20 times |
| Loose fixtures | `test/kernel/admit-labelled.json`, `config-fixture.mjs`, `kernel-sources.mjs`, `statusline-input.json`, `statusline-transcript.jsonl` |
| Hand-kept lists | `names.test.mjs:12` lists every CLI verb; `handlers.test.mjs:415` parses the verbs out of `picket.mjs` |
| Hook tests | 14 hooks in two files: `hooks.test.mjs` (1011 lines), `handlers.test.mjs` (1200 lines) |
| Mod tests | `status/` (3 files), `session/` (2), `markdown/` (1) run only through `claude plugin test`; `npm test` and `.github/workflows/release.yml` never run them (B7) |
| CI | one job, `node-version: 22`, `npm ci` then `npm test` |

Why the files run one at a time, from commit `cd0dbea` (2026-09-25): "The hook cold-start budget (200 ms) failed only while other test files started node processes in parallel: 233 to 300 ms inside npm test, under the budget alone and with --test-concurrency=1." One timing test holds the other 61 files in series.

## Target

### Where tests live

```
src/lib/verbs/leave/index.mts
src/lib/verbs/leave/index.test.mts               beside the code: one module's behaviour
src/lib/shared/work/next-step.test.mts           pure decisions on snapshot objects (04a)
src/lib/shared/sources/resolve.test.mts          the D-005 rule as data (04b)
src/lib/hooks/guard/bash/rules.test.mts          and judge, kernel, payloads, sources, escalation, powershell
src/lib/hooks/guard/block/index.test.mts         one per hook
test/
  support/    project.mts cli.mts git.mts context.mts snapshot.mts hook.mts
  cli/        end-to-end runs of dist/bin/picket.mjs
  hooks/      dist/hooks bundles with real stdin; hooks.json mapping (item 05)
  repo/       markdown paths, plugin layout, release, docs checks
  timing/     cold-start budgets, run alone at the end
```

A test of one module's behaviour sits beside the module and imports its `src/` file. A test of the built product (`dist/`) or of the repository as a whole sits in `test/`. The build leaves `*.test.mts` out of `dist/`; the package's `!**/*.test.*` rule stays as a second guard. Fixtures sit beside the test that reads them (`verbs/admit/admit-labelled.json`).

### How they run

```json
"scripts": {
  "test": "npm run typecheck && node scripts/test.mjs",
  "test:unit": "node --test \"src/**/*.test.mts\""
}
```

`scripts/test.mjs`:

1. unit tests on `src/`, in parallel, with no build (Node 24 runs `.mts` directly, X-11);
2. `npm run build`;
3. `test/cli`, `test/hooks`, `test/repo` and `bench/test`, in parallel, on `dist/`;
4. `test/timing`, alone;
5. the mod suites (`claude plugin test status`, `session`, `markdown`) when `claude` is on PATH, otherwise one line: `mods: skipped, claude not on PATH`.

### Shared helpers

```json
"imports": { "#test/*": "./test/support/*" }
```

```ts
// src/lib/verbs/leave/index.test.mts
import { test } from "node:test";
import assert from "node:assert/strict";
import { withProject, openItem } from "#test/project.mts";
import { fixedContext } from "#test/context.mts";
import { leave } from "./index.mts";

test("leave refuses on a closed item", async (t) => {
  const root = withProject(t);
  const id = openItem(root, { lane: "fast", status: "done" });
  const outcome = await leave({ id, command: "git branch -D x", why: null }, fixedContext(root));
  assert.equal(outcome.status, "refused");
});
```

```ts
// test/support/project.mts
export function withProject(t: TestContext, { host = ".picket" } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "picket-test-"));
  mkdirSync(join(root, host));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
```

| Helper | Provides | Replaces |
|---|---|---|
| `project.mts` | `withProject(t)`, `openItem(root, ...)`, `writeArtifact(...)` | 89 `mkdtempSync`, 332 `rmSync`, 122 `finally` |
| `cli.mts` | `runCli(t, root, args)`: the built bin, parsed JSON, exit code, stderr | 13 copies of `BIN` and their runners |
| `git.mts` | `gitRepo(t, { commits, branches, worktrees })` | 4 copies of `git()` and the repository builders |
| `context.mts` | `fixedContext(root, { now, env, session })` | environment set up per test (item 02) |
| `snapshot.mts` | `snapshotOf({...})` | temp folders in the `next`, `gate` and `route` decision tests (04a) |
| `hook.mts` | `runHookBundle(name, event)`, `decision(command, opts)` | 20 copies of `const decision =` |

### Lists come from the registries

`names.test.mjs` and the verb parsing in `handlers.test.mjs` go. A test that needs the verbs reads `VERB_NAMES` (item 03); one that needs the hooks reads `HOOKS` (item 05).

### CI runs both Node lines

`devEngines` asks for Node 24 (item 01, L-5), and the unit tests need Node 24 to run `.mts` directly, while users run on Node 22. One job is not enough:

| Job | Node | Runs |
|---|---|---|
| `test` | 24 | `npm ci`, `npm test` (all five steps), Claude Code CLI installed so the mods are tested |
| `floor` | 22 | the `dist/` built by `test`, uploaded as an artifact; `test/cli` and `test/hooks` against it |
| `publish` | 24 | after both, as today |

## Evidence (2026-10-22)

- Today's suite, run in parallel without changes: `parallel: exit 0 in 31204 ms` (721 tests, 0 failed, 16 cores), then `budgets alone: exit 0 in 2886 ms` (7 tests). 34 s in all, against 118 s file by file.
- Per file, run alone: the five slowest above; every file passed.
- Prototype on Node 24.22: a test `src/lib/verbs/leave/index.test.mts` importing `#test/project.mts` through `package.json` `imports`, run with `node --test --test-reporter=tap "src/**/*.test.mts"`: `ok 1 - renders the line`, `not ok 2 - a failing test still removes its folder`, and after both, `folders removed: true`. `tsc` with `allowImportingTsExtensions` resolves `#test/*` and passes.
- `.github/workflows/release.yml:28`: `node-version: 22`. With `devEngines` at `>=24` and `onFail: "error"`, `npm ci` would refuse to run there.

## Decisions

### T-1: Unit tests sit beside their code
As `*.test.mts`; `test/` keeps tests of `dist/` and of the repository. Chosen by the user on 2026-10-22, over a `test/` tree that mirrors `src/`.

### T-2: Unit tests run on `src/`, product tests on `dist/`
No build before the unit tests; one build before `test/cli`, `test/hooks` and `test/repo`.

### T-3: Parallel, except timing
Everything runs in parallel; `test/timing` runs alone at the end, which keeps the budget honest as `cd0dbea` intended.

### T-4: Shared helpers through `#test/*`
In `test/support/`; temp folders and repositories are removed through `t.after`, so a failing test cleans up too.

### T-5: Tests read the registries
`VERB_NAMES` and `HOOKS` replace the hand-kept lists.

### T-6: Hook tests split per hook
`hooks.test.mjs` and `handlers.test.mjs` become one `index.test.mts` per hook, and the guard's tests one file per concern; `test/hooks/` keeps only the bundle runs.

### T-7: The mod tests run (fixes B7)
In `npm test` when `claude` is on PATH, and always in CI.

### T-8: CI tests on Node 24 and checks the build on Node 22
Two jobs, as in the table above.

### T-9: Tests move with their module
A test converts to `.mts` and moves beside its code in the change that converts the module (C-003); until then it stays and keeps passing.

## Migration

### Phase 1: the runner and the helpers (can land before item 01)
- `scripts/test.mjs` runs in parallel and the timing tests alone. With today's files that is the 34 s run above; it needs nothing from the other items.
- `test/support/` with the helpers, `package.json` `imports`, and `test/timing/` holding `budgets.test.mjs`.

### Phase 2: with the conversion
- Each item's migration moves its tests beside its code, using the helpers (items 02 to 05 name their tests).
- `hooks.test.mjs` and `handlers.test.mjs` split as each hook moves (item 05).
- `names.test.mjs` goes when the registries land (items 03, 05).

### Phase 3: CI
- The `test` and `floor` jobs; the Claude Code CLI in the `test` job; the mod suites in `scripts/test.mjs`.

## Risks

- R-1: parallel runs can surface tests that share state. One parallel run passed (721 of 721); `test/kernel/paths.test.mjs` and `test/hooks/handlers.test.mjs` set `process.env` themselves, which is safe because Node runs each file in its own process. A flaky test found later is fixed in that test, not by going serial again.
- R-2: `claude plugin test` in CI may need sign-in or network; if it does, the mod suites run in a separate job that may fail without blocking the publish, and the risk is named in the release checklist. To check in phase 3.
- R-3: tests beside the code make `src/` folders longer. The folder per verb and per hook is the unit, so a reader sees the code and its tests together.

## Affects

- 01: `devEngines` `>=24` forces CI onto Node 24; the build leaves `*.test.mts` out of `dist/`.
- 02 to 05: each migration's tests are written as `*.test.mts` beside the code with `#test/...` helpers.
- 07: the mods keep their tests beside their code, as today; `scripts/test.mjs` runs them.
- 09: `.github/workflows/release.yml` gains the second job.

## Open questions

None.
