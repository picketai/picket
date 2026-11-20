---
name: bench-selfcheck-runs-in-review
description: node bench/selfcheck.mjs is safe and quick enough to run in a review (no model calls, vitest per hidden set and per tester seed)
metadata:
  type: reference
---

`node bench/selfcheck.mjs` makes no paid call: it materializes the fixture under bench/.runs/, runs vitest per hidden folder and per tester seed, and cleans up. On 2026-11-18 it finished inside a 590 s timeout with exit 0. Run it directly (not piped through `tail` without `${PIPESTATUS[0]}`, which masks the exit code) when a criterion names it.

The dry runner (`node bench/run.mjs --harness plugin --tasks <filter> --dry`) and `node bench/report.mjs <a> <b> --check` are also free. A real run without `--dry` spends money: never run it. See [[bench-paths-in-this-checkout]].
