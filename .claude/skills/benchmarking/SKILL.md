---
name: benchmarking
description: >
  Runs Picket's golden task suite in this repository against the plugin or trunk build and prints
  the metric table: pass@1 and pass^k, route agreement, cost and its variance, time to first
  reviewable output, stops, prompts, re-reads, cache hit ratio. Use when the user says
  "benchmark", "run the bench", "baseline", "compare plugin and trunk" or "did this change
  regress". Spends real API budget: the user names the cap, and every real run passes it as
  --max-usd.
disable-model-invocation: true
---

# Benchmarking

`/benchmarking <dry|run|baseline|check|report> [--harness plugin|trunk] [--tasks all|lane:<lane>|<id,...>] [--runs N]`

Everything is code under `bench/`; this skill only chooses the arguments and reads the result. Read `bench/README.md` once if the layout is new to you.

## Verbs

| Verb | Command | Use |
|---|---|---|
| dry | `node bench/run.mjs --harness <h> --tasks <t> --dry` | list the tasks and the manifest, spend nothing |
| run | `node bench/run.mjs --harness <h> --tasks <t> --runs <n> --max-usd <cap> --out bench/results/<h>-<date>.json` | measure; the file is resumable, interrupted suites continue |
| baseline | run with `--harness trunk --tasks all --runs 5 --max-usd <cap> --out bench/results/baseline-trunk.json` | the number to beat; committed |
| report | `node bench/report.mjs <results.json> [<candidate.json>]` | the table, with deltas when two files |
| check | `node bench/report.mjs <baseline> <candidate> --check` | exit 1 when pass^k falls or cost rises past two standard errors |

## Procedure

1. Dry-run and quote the plan it prints before spending: each task's budget and the `planned $<total>` line. The plan is an estimate, not a ceiling: a budget caps one call, and every gate stop is a new call that pays the prompt cache again. State the total and wait for the user's go and cap; the cap is the `--max-usd` value, the only hard limit, and the runner refuses a real run without one or over it.
2. Run in the background (`run_in_background`) and keep working; the results file fills as runs finish. Check `bench/results/spend.log` when the user asks.
3. Records that failed on an API or session limit are not Picket results: drop them with a one-line node script before reporting, and re-run those tasks.
4. Report with the table, then two sentences: what moved, and whether `check` passes.

## Reading the table

`lane ok` says whether Picket routed the task where the bench intended; `route agree` says whether it made the same choice every run. TTFR is the first write or the first stop, whichever came first. `tok/line` is every token type divided by lines the run added outside `work/` and `.claude/`; a research task has none.
