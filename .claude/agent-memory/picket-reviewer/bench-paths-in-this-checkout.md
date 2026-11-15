---
name: bench-paths-in-this-checkout
description: bench/run.mjs without --harness plugin dies before any refusal here; lint.craft TK1 flags every bench/ path as a performance test
metadata:
  type: reference
---

In this checkout `node bench/run.mjs ...` defaults to `--harness trunk`, whose `defaultHarnessRoot` wants a main checkout two folders up; it exits 1 with "cannot locate the trunk harness" before reaching the spend refusal. A declared drive that expects the refusal must pass `--harness plugin` (seen 2026-11-14, T-6.4 of the guard bypass item).

`lint.craft.mjs` reports TK1 "performance test" on any changed file under `bench/`, including pure unit tests of `bench/lib/spend.mjs`; it is a path match, not a finding.

Probing a closure test against a rejected revision: `TMPDIR=<scratchpad> node scripts/replay-rejected.mjs <rev> <test-file>` works from the reviewer shell and cleans up after itself. See [[reproduce-red-in-scratch-copy]].
