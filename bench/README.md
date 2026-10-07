# Harness benchmark

Measures a Claude Code harness, not the model: cost, efficiency, determinism, predictability and
time to first reviewable output, on a fixed set of tasks against a fixed repository.

## How a run works

1. `fixture/` (LedgerLite, a small TypeScript invoicing service) is copied to a fresh directory and
   committed with fixed dates, so every run starts from the same content hash and the same SHA.
2. The harness under test is installed into that repository by its adapter (`adapters/<name>.mjs`):
   CLAUDE.md, the `.claude` tree, and whatever directories its contract expects.
3. `claude -p` runs the task prompt in stream-json mode. The runner plays an eager approver: every
   user gate the harness stops at gets `approved` (or the run grant it offers), every open question
   gets one fixed answer. Stops are counted; they are the latency the real user would pay.
4. The result is graded by code only: the fixture's own suite, the task's hidden tests dropped into
   `test/hidden/`, file and grep assertions, and for research tasks the presence and shape of a
   report whose cited paths exist.
5. One JSON record per run lands in the results file. `report.mjs` turns records into the table.

## Commands

```sh
npm run bench:test                                  # metrics math and adapters, no LLM
node bench/run.mjs --harness trunk --dry            # list tasks and the manifest, spend nothing
node bench/run.mjs --harness trunk --tasks lane:fast --runs 1 --out bench/results/smoke.json
node bench/run.mjs --harness trunk --tasks all --runs 5 --out bench/results/baseline-trunk.json
node bench/report.mjs bench/results/baseline-trunk.json
node bench/report.mjs bench/results/baseline-trunk.json bench/results/rework.json --check
```

`--tasks` takes ids, `lane:<fast|order|design|research>`, or `all`. A results file is resumable:
records already present are skipped, so an interrupted suite continues where it stopped.
`--keep` leaves the run directory under `bench/.runs/` with `events.jsonl` for inspection.

## Metrics

| Metric | Property | From |
|---|---|---|
| pass@1, pass^k | determinism | HARD grade over N runs, tau-bench estimator |
| route agreement, lane as intended | determinism | adapter signals: lane and verdict sequence |
| cost per task, cost CV | cost, predictability | `total_cost_usd` summed over the stops of a run |
| cache hit ratio | cost | cache_read / (cache_read + cache_creation + input) |
| tokens per added line | efficiency | all token types / lines added outside artifacts |
| turns, tool calls, re-reads | efficiency | stream-json tool_use events |
| stops, permission denials | performance, predictability | gate loop, `permission_denials` |
| wall p50/p90, TTFR p50 | performance | wall clock; first Write/Edit or first stop |

The suite table reports the mean over tasks with its standard error. `--check` fails when pass^k
falls, or cost rises, by more than two standard errors of the baseline.

## Cost of running it

Every `claude -p` invocation writes the full system prompt to the cache: about 37k tokens, which
is roughly $0.75 at list price on Fable 5.1 before any work happens. A gate stop is a new
invocation, so a five-phase task with per-phase approval pays that six times. Run `--dry` first,
then one lane at `--runs 1`, and read `bench/results/spend.log` before committing to five runs.

## Layout

```
bench/
  fixture/        LedgerLite source; the benchmark repository
  tasks/          14 task definitions (6 fast, 4 order, 2 research, 2 gate-trippers)
  hidden/<task>/  hidden vitest files copied in after the run
  adapters/       trunk.mjs, plugin.mjs: install, gate detection, signals, report paths
  lib/            fixture.mjs, claude.mjs, grade.mjs, metrics.mjs
  schema/         ledger-v2 (hook ledger rows) and result (this runner's output)
  results/        committed baselines; spend.log is ignored
  run.mjs, report.mjs
```
