---
name: bench-runner-drive-safety
description: bench/run.mjs calls main() at import, so tests need logic in bench/lib; a drive of the runner risks real spend unless it uses --dry or --runs 0
metadata:
  type: reference
---

`bench/run.mjs` runs `main()` when imported (read 2026-10-30), so any logic a unit test needs goes in `bench/lib/` and `bench/test/` imports it from there. `scripts/test.mjs` runs `bench/test/` in its product step.

A drive of the runner that reaches the run loop spends real API money (per task `budget_usd`, default 10), and the plugin harness runs `npm run build` first (rebuilds dist/). A safe drive uses `--dry`, or `--runs 0` so the loop has nothing to run even if a guard is broken; pass `--out` into a temp folder so no file lands under `bench/results/`. Sums on 6403d5b: lane fast is 8 tasks, $44; all tasks $166.

The routing model in `test/support/routing.mts` exposes `idf`, so "no skill claims prompt X" can be tested as "the prompt's distinctive terms are not in `MODEL.idf`", which is deterministic where a cosine ceiling is not.

**How to apply:** when ordering bench work, put pure functions in `bench/lib/` and write drive criteria with `--dry` or `--runs 0`. Related: [[machine-node-and-test-runs]].
