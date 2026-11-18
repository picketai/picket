---
kind: order
lane: order
title: Planted defect benchmark measures the tester
date: 2026-11-18
audience: developer
sources: [work/20261118-planted-defect-benchmark-measures-the-tester/request.md, artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, artifacts/strategy/drafts/testing-and-test-environment.md, work/20261117-the-tester-checks-finished-items/design.md, bench/run.mjs, bench/report.mjs, bench/selfcheck.mjs, bench/lib/grade.mjs, bench/lib/fixture.mjs, bench/lib/spend.mjs, bench/lib/claude.mjs, bench/lib/metrics.mjs, bench/adapters/plugin.mjs, bench/test/tasks.test.mjs, bench/fixture/src/config.ts, src/lib/shared/env/instep.mts, src/lib/shared/env/scan.mts, src/lib/shared/env/rules.mts, src/lib/shared/testing/results.mts, src/lib/shared/testing/derive.mts, src/lib/shared/testing/report.mts, src/lib/shared/testing/cases.mts, src/lib/shared/work/test-stage.mts, src/lib/shared/work/snapshot.mts, src/lib/hooks/guard/blackbox/index.mts, src/lib/verbs/drive/run.mts]
phases:
  - n: 1
    files:
      - bench/fixture/.picket/env/compose.yaml
      - bench/fixture/.picket/env/docker/ledgerlite/Dockerfile
      - bench/fixture/.picket/env/docker/ledgerlite/config.json
      - src/lib/shared/env/instep.mts
      - src/lib/shared/env/instep.test.mts
      - bench/lib/tasks.mjs
      - bench/lib/tester-seed.mjs
      - bench/test/tester-seed.test.mjs
      - bench/test/tasks.test.mjs
      - bench/run.mjs
      - bench/selfcheck.mjs
      - bench/seeds/
      - bench/tasks/test-01-negative-quantity.json
      - bench/tasks/test-02-page-size-boundary.json
      - bench/tasks/test-03-delete-unknown-invoice.json
      - bench/tasks/test-04-replay-returns-200.json
      - bench/tasks/test-05-page-past-end.json
      - bench/tasks/test-06-credit-over-total.json
      - bench/hidden/test-01-negative-quantity/key.json
      - bench/hidden/test-02-page-size-boundary/key.json
      - bench/hidden/test-03-delete-unknown-invoice/key.json
      - bench/hidden/test-04-replay-returns-200/key.json
      - bench/hidden/test-05-page-past-end/key.json
      - bench/hidden/test-06-credit-over-total/key.json
    greps:
      - path: bench/fixture/.picket/env/compose.yaml
        pattern: 'io\.github\.picketai\.role: app'
      - path: bench/lib/tasks.mjs
        pattern: 'export function loadTasks'
      - path: bench/run.mjs
        pattern: 'from "\./lib/tasks\.mjs"'
      - path: bench/lib/tester-seed.mjs
        pattern: 'export function seedTesterTask'
    tests: true
    drive:
      - covers: T-1.1
        command: CLAUDE_PROJECT_DIR="$PWD/bench/fixture" node dist/bin/picket.mjs env check
        exit_code: 0
        contains: ["rules passed"]
  - n: 2
    files:
      - bench/lib/tester-grade.mjs
      - bench/test/tester-grade.test.mjs
      - bench/lib/tester-stop-hook.mjs
      - bench/test/tester-stop-hook.test.mjs
      - bench/lib/claude.mjs
      - bench/test/claude.test.mjs
      - bench/run.mjs
    greps:
      - path: bench/run.mjs
        pattern: 'gradeTester'
      - path: bench/run.mjs
        pattern: 'seedTesterTask'
      - path: bench/lib/claude.mjs
        pattern: '"--settings"'
      - path: bench/lib/tester-stop-hook.mjs
        pattern: 'picket:tester'
    tests: true
    drive: true
  - n: 3
    files:
      - bench/lib/tester-measures.mjs
      - bench/test/tester-measures.test.mjs
      - bench/report.mjs
      - bench/test/fixtures/tester-baseline.json
      - bench/test/fixtures/tester-worse.json
    greps:
      - path: bench/report.mjs
        pattern: 'testerCheck'
      - path: bench/report.mjs
        pattern: '## Tester'
    tests: true
    drive:
      - covers: T-3.4
        command: node bench/report.mjs bench/test/fixtures/tester-baseline.json bench/test/fixtures/tester-worse.json --check
        exit_code: 1
        contains: ["REGRESSION", "defects found fell"]
      - covers: T-3.5
        command: node bench/report.mjs bench/test/fixtures/tester-baseline.json bench/test/fixtures/tester-baseline.json --check
        exit_code: 0
        contains: ["## Tester", "no regression"]
---
# Order: Planted defect benchmark measures the tester

## Problem
SDR 00004 D-012 says the tester is measured before it is trusted, and `testing` stays `design` until a benchmark has measured catch rate and cost. The benchmark has no task the tester can run: the fixture has no `.picket/env/`, every task starts from a request rather than a finished item, and the grader only knows hidden tests, files and greps. The measurement must be graded by code only, run through the existing runner and report with their spending cap, and spend nothing in this item.

## Decisions
### D-001: Tester tasks seed a finished design item and run through the lead
**Decision:** A tester task is a file in `bench/tasks/` with `kind: "tester"`, `lane: "design"`, `item: "<work id>"` and a prompt that asks the lead to continue that item. Its seed `bench/seeds/<task>/` holds `repo/`, the finished implementation with its own passing tests, and `item/`, the work item at the test stage: `request.md` (the story), `design.md` whose phases list every `repo/` file in `files` and declare HTTP checks, `state.yaml` with `base: {{BASE}}`, the phase markers, and `verdicts.jsonl` ending with the cumulative reviewer's `APPROVED`. `seedTesterTask` copies `repo/` over the materialized fixture and commits it at fixed dates, then copies `item/` to `work/<item>/` with the fixture SHA as base, before the adapter installs the harness. The design lane makes the shipped default `testing: design` apply with no config change (`testApplies`, `src/lib/shared/work/test-stage.mts:26`), and listing the implementation in `files` puts it inside guard.blackbox's fence (`itemOwnedPaths`, `src/lib/hooks/guard/blackbox/index.mts:31`). The answer key `bench/hidden/<task>/key.json` never enters the run repository.
**Instead of:** running the tester alone with `claude --agent picket:tester`: guard.blackbox decides on the hook's `agent_type`, which no source shows a main-session agent carrying, and it skips the lead's send, so it measures a flow no user runs.
**Risks:**
- **RISK-001** A kernel change to the state, verdict or marker shapes stops a seed reaching the test stage. Mitigation: T-1.3 runs the kernel's own `readSnapshot` and `nextStep` on every seed inside `npm test`.
- **RISK-002** The lead or tester reads a key through a relative path out of `bench/.runs/`. Mitigation: the same exposure today's hidden tests have; the kept event stream shows any read naming `hidden/test-`.

### D-002: The fixture gains one app service, and env check places a root service
**Decision:** `bench/fixture/.picket/env/compose.yaml` holds one service, `ledgerlite`, role `app`, built with context `../..` and `.picket/env/docker/ledgerlite/Dockerfile` (base image pinned by digest, `npm ci`, `tsc -p tsconfig.json`, `CMD node dist/src/main.js`), a `wget` healthcheck on `/health`, target port 8080 with no host port, and `x-picket` version 1 with one wiring row (`service: root`, `file: data/config.json`, `key: server:host`, `by: file`, `replaced: .picket/env/docker/ledgerlite/config.json`, which sets host `0.0.0.0`), because `loadConfig` takes the host from the file only (`bench/fixture/src/config.ts:20`). On that layout `picket env check` fails today with `E9 root:  is not in the environment` (probe 2026-11-18): the scan names the umbrella root a service with path `""` (`src/lib/shared/env/scan.mts:26`), and `builtFrom` (`src/lib/shared/env/instep.mts:19`) never matches `""` against the absolute build context compose returns. The fix: a build context equal to the umbrella root places the root service. Every single-repository project meets the same refusal, so this is a product fix.
**Instead of:** a second service the app reaches by address: it changes LedgerLite code the hidden tests of the 18 existing tasks pin, and faking the dependency needs the stub server of TF-006.
**Risks:**
- **RISK-003** Every existing task now sees `.picket/env/` and a new fixture hash, so gate-13 and gate-14 (design lane) can meet the tester and new results differ from saved baselines. Mitigation: OQ-001; the report heading already prints each file's fixture hash.

### D-003: The grader reads the kernel's result rows through the kernel's readers
**Decision:** `gradeTester` imports `readTestRows`, `roundRows`, `latestCases`, `latestClass` (`lib/shared/testing/results.mjs`) and `caseCard` (`lib/shared/testing/cases.mjs`) from the plugin directory of the harness under test, and grades round 1 of `work/<item>/test/results.jsonl`. A product failure is a latest case with outcome `failed` whose latest class is `product`, the rule of `fixReasons` (`src/lib/shared/testing/derive.mts:48`). It matches the key when one of its request steps has the key's method, its target with the leading `{service}` removed matches the key's `path` regex, and the first `expect status` after it, before the next request, equals the key's `status`. A defect run passes when a product failure matches and no other one exists; a trap run when no product failure and no question exist; a silent run when a round-1 question names the key's criterion and no product failure exists. `work/<item>/test.md` must exist in every case. Every unmatched product failure counts as a false alarm.
**Instead of:** parsing `test.md`: its table carries no request and no expected status (`src/lib/shared/testing/report.mts:6`), so it cannot be matched by request and status; the rows are what that report is rendered from.
**Risks:**
- **RISK-004** A tester that shows the planted defect through another request is scored a miss plus a false alarm. Mitigation: each key names the one request that shows its defect, and T-1.5 proves that request is live on the seed.

### D-004: A tester run ends at the tester's first verdict, and tester tasks are opt-in
**Decision:** For a tester task the runner writes a settings file holding one `PreToolUse` hook with matcher `Agent|Task` that runs `bench/lib/tester-stop-hook.mjs`, and passes it to `claude -p` as `--settings <file>`. The hook denies a call whose `tool_input.subagent_type` is not `picket:tester`, with the reason `the benchmark ends after the tester's verdict; end your turn`. Without it a `fix` route sends the developer, the cumulative reviewer and a second test round with no user stop (`fixStep`, `src/lib/shared/work/test-stage.mts:51`). Tester tasks carry `max_stops: 0`, and their `pass` is the grade's pass. `--tasks all` and `lane:<lane>` keep selecting only tasks without `kind`; `kind:tester` selects tester tasks; an id selects either.
**Instead of:** a stop instruction in the prompt: the lead's rules tell it to keep sending, so the stop would rest on the model.
**Risks:**
- **RISK-005** Hooks from `--settings` do not reach the session next to the plugin's, or the tool is named otherwise. Mitigation: OQ-004 and T-2.8; grading reads round 1 only, so only cost and time overstate.

### D-005: The measures and the not-worse check share the paired rule
**Decision:** `bench/lib/tester-measures.mjs` holds pure functions. Per tester task: found share (defect runs), false alarms per run, questions-right share (silent runs), consistent (every run's grade signature equal, `agreement` of 1), cost mean, wall p50. Per suite: catch rate, false alarms per run, questions right, consistent tasks. `report.mjs` prints a `## Tester` section when a file holds tester records. `testerCheck(rowsA, rowsB)` pairs tester tasks by id and fails, as `pairedCheck` does (`bench/report.mjs:111`), when the mean paired delta is worse by more than two standard errors of the deltas, the error floored at 0.05 as for pass^k: found share over defect tasks, false alarms over every tester task, questions-right share over silent tasks. `--check` exits 1 on a failure of either function; cost is already in `pairedCheck`.
**Instead of:** failing on any drop: with a few runs per task one unlucky run rejects a good change, and it would leave the house rule that cost and pass^k share.
**Risks:**
- **RISK-006** A small drop passes: one missed run of three on one of three defect tasks gives deltas (-1/3, 0, 0), mean -0.111 against a limit of 0.222 (derived with `bench/lib/metrics.mjs`). Mitigation: the per-task table shows each drop, and more runs narrow the limit.

## Scope
**In:**
- The fixture's standard environment and the root-service fix in env check (D-002).
- Six tester tasks with seeds and keys, the seed function, the self check (D-001).
- The code grader (D-003), the stop hook and the runner wiring (D-004).
- The measures, the `## Tester` report section and the comparison check (D-005).

**Out:**
- The default of `testing`, any paid run, TF-006 to TF-009, any change to the tester's agent, skill or verbs.
- A saved baseline of real runs: it needs a paid run on the user's word.

## Phase 1: The fixture runs as a standard environment and seeds tested items
**Touch set:**
- `bench/fixture/.picket/env/compose.yaml`: new, the app service
- `bench/fixture/.picket/env/docker/ledgerlite/Dockerfile`: new, builds LedgerLite
- `bench/fixture/.picket/env/docker/ledgerlite/config.json`: new, replaced config, host 0.0.0.0
- `bench/fixture/src/config.ts`: host read from file only
- `bench/fixture/test/router.test.ts`: in-process router pattern for keys
- `src/lib/shared/env/instep.mts`: `builtFrom` places root service
- `src/lib/shared/env/instep.test.mts`: pin the root service case
- `src/lib/shared/env/scan.mts`: root scanned with path ""
- `bench/lib/tasks.mjs`: new, `loadTasks` moved here
- `bench/run.mjs`: imports `loadTasks` from lib
- `bench/lib/tester-seed.mjs`: new, `seedTesterTask`
- `bench/test/tester-seed.test.mjs`: new, seeds reach test stage
- `bench/test/tasks.test.mjs`: exempt tester tasks, pin selection
- `bench/selfcheck.mjs`: tester loop, skip their hidden folders
- `bench/lib/fixture.mjs`: fixed-date commit pattern
- `bench/seeds/`: new, one `repo/` and `item/` per task
- `bench/tasks/test-01-negative-quantity.json`: new task
- `bench/tasks/test-02-page-size-boundary.json`: new task
- `bench/tasks/test-03-delete-unknown-invoice.json`: new task
- `bench/tasks/test-04-replay-returns-200.json`: new task
- `bench/tasks/test-05-page-past-end.json`: new task
- `bench/tasks/test-06-credit-over-total.json`: new task
- `bench/hidden/test-01-negative-quantity/`: new key and key test
- `bench/hidden/test-02-page-size-boundary/`: new key and key test
- `bench/hidden/test-03-delete-unknown-invoice/`: new key and key test
- `bench/hidden/test-04-replay-returns-200/`: new key and key test
- `bench/hidden/test-05-page-past-end/`: new key and key test
- `bench/hidden/test-06-credit-over-total/`: new key only

**Changes:** The environment files of D-002, and in `instep.mts` a `builtFrom` that also matches a scanned path `""` when the service's build context is the umbrella root. `bench/lib/tasks.mjs` exports `loadTasks(filter)`, moved from `run.mjs`, with `all` and `lane:` skipping tasks that carry `kind`, and `kind:<kind>` selecting by kind. `bench/lib/tester-seed.mjs` exports `seedTesterTask({ repo, task, seedDir, base })` per D-001, returning the implementation commit SHA.

The six tasks, each with `id`, `lane: "design"`, `kind: "tester"`, `item` (a `YYYYMMDD-slug` id), `title`, `prompt`, `budget_usd` in the range of the order tasks (8 to 14), `max_stops: 0`, `checks: {}`:

| Task | Key kind | The finished feature | Planted or suspicious behaviour |
|---|---|---|---|
| test-01-negative-quantity | defect | POST /invoices validation, 400 with `error.field` | a negative quantity is stored, 201 |
| test-02-page-size-boundary | defect | `size` above `maxPageSize` refused with 400 | `size=101` answers 200 |
| test-03-delete-unknown-invoice | defect | DELETE /invoices/:id, 204, unknown id 404 | an unknown id answers 204 |
| test-04-replay-returns-200 | trap | `Idempotency-Key` on POST; a replay answers 200 with the original | none: the story says 200 |
| test-05-page-past-end | trap | a page past the last answers 200 with an empty list | none: the story says so |
| test-06-credit-over-total | silent | POST /invoices/:id/credit makes a credit note | the story never says whether a credit may exceed the invoice total |

A key is `{ "kind": "defect", "defect": { "criterion", "method", "path" (regex on the target without its `{service}` prefix), "status" } }`, `{ "kind": "trap" }`, or `{ "kind": "silent", "question": { "criterion" } }`. Defect and trap folders also hold `key.test.ts`, which sends the key's request (traps: the suspicious request) through `buildRouter` in process and asserts the story's status. A planted defect shows as a wrong status on a request no declared check of its seed makes, since the phase gate ran those checks. `selfcheck.mjs` skips tester folders in its hidden loop and, per tester task, materializes, seeds, runs the fixture suite, then the key test, printing `ok   <task>: defect live`, `ok   <task>: trap holds` or `ok   <task>: seeded`.

**Done when:**
- **T-1.1** `CLAUDE_PROJECT_DIR="$PWD/bench/fixture" node dist/bin/picket.mjs env check` exits 0 and prints `rules passed`.
- **T-1.2** A unit test in `instep.test.mts` gives a model whose build context is the umbrella root and a scan whose service path is `""`, and gets no E9 finding for it; a root service with no such build still gets one.
- **T-1.3** For each of the six tasks, `tester-seed.test.mjs` seeds `item/` into a temporary git folder holding the fixture's `.picket/env/compose.yaml`, and `nextStep(readSnapshot(...))` from `dist/lib/shared/work/` returns action `test_item`.
- **T-1.4** The same test finds every file under each seed's `repo/` in the `files` of a phase of its seeded `design.md`, read through `readSnapshot`.
- **T-1.5** `node bench/selfcheck.mjs` exits 0 and prints `defect live` for test-01 to test-03, `trap holds` for test-04 and test-05, and `seeded` for test-06, with the fixture suite green on every seed.
- **T-1.6** `tasks.test.mjs`: `loadTasks("all")` returns exactly the 18 task ids `bench/tasks/` holds on the base a993b62b (the before-image, listed in full in the test), and `loadTasks("kind:tester")` returns the six tester ids.
- **T-1.7** `tasks.test.mjs`: the keys hold three `defect`, two `trap` and one `silent`; each defect key's criterion is a `covers` of a declared HTTP check of its seed, and no declared check of its seed has the key's method, a path the key's regex matches, and the key's status.
- **T-1.8** `npm test` passes.

## Phase 2: Code grades a tester run and the run ends at its verdict
**Touch set:**
- `bench/lib/tester-grade.mjs`: new, `gradeTester` per D-003
- `bench/test/tester-grade.test.mjs`: new, rows from kernel writer
- `bench/lib/tester-stop-hook.mjs`: new, denies non-tester sends
- `bench/test/tester-stop-hook.test.mjs`: new, deny and allow
- `bench/lib/claude.mjs`: `settings` option to `--settings`
- `bench/test/claude.test.mjs`: pin the flag
- `bench/run.mjs`: seed, settings, grade, pass per kind
- `bench/lib/ask-probe-hook.mjs`: hook stdin and output pattern
- `bench/lib/grade.mjs`: check record shape `{ name, ok, detail }`
- `src/lib/shared/testing/results.mts`: row types the grader reads
- `src/lib/shared/scenarios/format.mts`: request and expect step shapes

**Changes:** `tester-grade.mjs` exports `loadKernelReaders(pluginDir)` (dynamic import of the four readers and `caseCard`) and `gradeTester({ repo, task, key, readers })`, returning `{ pass, checks, tester: { verdict, found, false_alarms, questions_right, signature } }`: `checks` hold `report_exists` and one entry per key rule in the shape of `grade.mjs`; `verdict` is the round line's token in `test.md` or `null`; `found` is `null` outside defect tasks and `questions_right` outside silent tasks; `signature` joins found, false alarms and the question result. `tester-stop-hook.mjs` exports `stopAnswer(input)` and `stopSettings(hookPath)`, and runs as a hook when executed. `claudeArgs` gains `settings`. In `runOnce`, a tester task seeds after `materializeRun` and before `adapter.install`, writes the settings file in the run folder, reads `bench/hidden/<task>/key.json`, grades with `gradeTester` instead of `grade`, and sets `record.kind`; `record.pass` is the grade's pass.

**Done when:**
- **T-2.1** `tester-grade.test.mjs` writes rows with `appendTestRow` from `dist/lib/shared/testing/results.mjs` into a temporary item and grades them with the kernel readers: a round-1 failed case classed `product` whose steps hold `request POST {ledgerlite}/invoices` then `expect status 400`, against a defect key `POST`, `^/invoices$`, 400, gives `found: true`, `false_alarms: 0`, `questions_right: null`, `pass: true`.
- **T-2.2** A second product failure on another request in that run gives `false_alarms: 1` and `pass: false`; on a trap key, one product failure or one question each give `pass: false`.
- **T-2.3** On a silent key for `T-1.2`, a round-1 question on `T-1.2` gives `questions_right: true`, `pass: true`; a question on `T-1.1` only gives `questions_right: false`, `pass: false`.
- **T-2.4** A failed case classed `test` or `environment`, a matching product failure recorded in round 2, and a matching request whose expected status differs from the key's each leave `found: false` and `false_alarms: 0`.
- **T-2.5** With no `work/<item>/test.md`, the `report_exists` check fails, `verdict` is `null` and `pass` is false.
- **T-2.6** `stopAnswer` denies a `PreToolUse` `Agent` input with `subagent_type` `picket:developer` naming the reason of D-004, and returns nothing for `picket:tester` or a `Bash` input; `stopSettings` holds matcher `Agent|Task`; `claudeArgs({ settings: "s.json" })` holds `--settings s.json` and `claudeArgs({})` no `--settings`.
- **T-2.7** `node bench/run.mjs --harness plugin --tasks kind:tester --dry` exits 0, prints one `[design]` row for each of the six tester tasks and a `planned $` line, and writes no results file.
- **T-2.8** [DEFERRED: the product owner, the first paid tester run] One real run of test-01 ends after the tester's first verdict, with `work/<item>/test.md` in the run and `grade.tester` filled in the record.

## Phase 3: The report shows the measures and the check refuses a worse result
**Touch set:**
- `bench/lib/tester-measures.mjs`: new, pure measures and `testerCheck`
- `bench/test/tester-measures.test.mjs`: new, every field per branch
- `bench/report.mjs`: `## Tester` section, `--check` wiring
- `bench/lib/metrics.mjs`: `mean`, `stderr`, `agreement`, `percentile`
- `bench/test/fixtures/tester-baseline.json`: new, six tasks, two runs each
- `bench/test/fixtures/tester-worse.json`: new, every defect run missed

**Changes:** `tester-measures.mjs` exports `testerRow(task, records)`, `testerSuite(rows)` and `testerCheck(rowsA, rowsB)` per D-005; `testerCheck` returns `{ fails, found, false_alarms, questions_right }` with fail lines `defects found fell by …`, `false alarms rose by …` and `questions asked rightly fell by …`, each naming the paired task count and the limit. `report.mjs` builds tester rows from records with `kind: "tester"`, prints `## Tester` (columns task, key kind, n, found, false alarms per run, questions right, same every run, cost $, wall p50 s, then the suite line) after the suite table, and with `--check` joins `testerCheck` fails to the `REGRESSION` list. Records without `kind` keep today's rows and tables. The fixtures follow `bench/schema/result.schema.json` with synthetic records; `tester-worse.json` differs from the baseline only in `found: false` and `pass: false` on every defect run, so the found deltas are (-1, -1, -1) against a limit of 0.1.

**Done when:**
- **T-3.1** `testerRow` on two defect runs (found, missed) gives found share 0.5 and consistent false; on two trap runs with 0 and 2 false alarms gives 1 false alarm per run, found `null` and consistent false; on two equal silent runs gives questions-right share 1 and consistent true; each case asserts every field.
- **T-3.2** `testerSuite` over one defect, one trap and one silent row gives the catch rate from defect runs only, false alarms per run over every run, questions right from silent runs only, and consistent tasks as a count of 3.
- **T-3.3** `testerCheck` fails with `defects found fell` on found deltas (-1, -1, -1), with `false alarms rose` on deltas (1, 1, 1), with `questions asked rightly fell` on a silent delta of -1, and returns no fail for identical rows.
- **T-3.4** `node bench/report.mjs bench/test/fixtures/tester-baseline.json bench/test/fixtures/tester-worse.json --check` exits 1 and prints `REGRESSION` and `defects found fell`.
- **T-3.5** The same command with the baseline file twice exits 0 and prints `## Tester` and `no regression`.
- **T-3.6** Before the first edit of this phase, the developer captures the output and exit code of `node bench/report.mjs bench/results/baseline-trunk.json bench/results/plugin-2026-11-09.json --check` into the scratchpad; after the phase the same command prints byte-identical output with the same exit code (diffed in the block).
- **T-3.7** `npm test` passes.

## Open questions
- **OQ-001** Should the 18 existing tasks keep the new `.picket/env/`, so gate-13 and gate-14 meet the tester whenever their design declares an HTTP check, or run with `testing: off`? Owner: product owner. Fallback: they keep it, which is how the product ships (`testing: design`).
- **OQ-002** The request says the grader reads "the report the kernel generates"; D-003 reads the result rows the report is rendered from, since `test.md` has no request or status. Owner: product owner. Fallback: D-003.
- **OQ-003** Is three defects, two traps and one silent story the right first set? Owner: product owner. Fallback: the six tasks of phase 1; more tasks are new files only.
- **OQ-004** Hooks given with `--settings` reaching a `claude -p` session next to the plugin's hooks, and the agent tool's hook name `Agent`, rest on no source read here. Owner: operations, at the first paid tester run. Fallback: the run continues into the fix round; round-1 grading holds and only cost and time overstate.
- **OQ-005** `bench/README.md` counts 18 tasks and documents no tester task, measure or `kind:` filter; a doc change is not phase scope. Owner: product owner. Fallback: the README stays as it is.

## Revision log
