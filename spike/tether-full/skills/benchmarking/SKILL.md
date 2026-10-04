---
name: benchmarking
description: >
  Runs the golden task suite against a harness and prints the metric table: pass@1 and
  pass^k, route agreement, cost and its variance, time to first reviewable output, stops,
  prompts, re-reads, cache hit ratio. Use when the user says "benchmark", "run the bench",
  "baseline", "compare trunk and rework", "did this change regress", or after any edit to an
  agent, skill, hook or CLAUDE.md. Spends real API budget: always dry-run first and quote the
  expected cost.
user-invocable: true
---

# Benchmarking

`/benchmarking <run|baseline|check|report> [--harness trunk|rework] [--tasks all|lane:<lane>|<id,...>] [--runs N]`

Everything is code under `bench/`; this skill only chooses the arguments and reads the result. Read `bench/README.md` once if the layout is new to you.

## Verbs

| Verb | Command | Use |
|---|---|---|
| dry | `node bench/run.mjs --harness <h> --tasks <t> --dry` | list the tasks and the manifest, spend nothing |
| run | `node bench/run.mjs --harness <h> --tasks <t> --runs <n> --out bench/results/<h>-<date>.json` | measure; the file is resumable, interrupted suites continue |
| baseline | run with `--harness trunk --tasks all --runs 5 --out bench/results/baseline-trunk.json` | the number to beat; committed |
| report | `node bench/report.mjs <results.json> [<candidate.json>]` | the table, with deltas when two files |
| check | `node bench/report.mjs <baseline> <candidate> --check` | exit 1 when pass^k falls or cost rises past two standard errors |

## Procedure

1. Dry-run and quote the cost before spending: fast tasks run about 2 dollars each, order tasks 10 to 15, design tasks 20 to 25, and every gate stop pays the prompt cache again (about 0.75 dollars). State the total and wait for the user's go unless they already gave one.
2. Run in the background (`run_in_background`) and keep working; the results file fills as runs finish. Check `bench/results/spend.log` when the user asks.
3. Records that failed on an API or session limit are not harness results: drop them with a one-line node script before reporting, and re-run those tasks.
4. Report with the table, then two sentences: what moved, and whether `check` passes.

## Reading the table

`lane ok` says whether the harness routed the task where the bench intended; `route agree` says whether it made the same choice every run. TTFR is the first write or the first stop, whichever came first. `tok/line` is every token type divided by lines the run added outside `work/` and `.claude/`; a research task has none.
