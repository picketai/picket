---
name: probe-numeric-caps-to-consumer
description: Number-flag guards (caps, budgets): feed NaN, 0, negative, Infinity and follow the value to where it becomes a CLI arg
metadata:
  type: feedback
---

When a change adds a numeric guard, feed it NaN, 0, a negative value and Infinity through `node -e`, then follow the value to where it is consumed. `Number(next())` gives NaN for a missing value, a NaN compare is always false, and a truthiness check downstream drops the limit entirely.

**Why:** on the bench --max-usd item (2026-10-30), a bad `--budget-usd` made the planned total NaN or 0. The guard let the run through, and `bench/lib/claude.mjs` `if (o.maxBudgetUsd)` then dropped the per-call cap. The same trace showed that a budget applies per call, and one run makes up to max_stops+1 calls.

**How to apply:** for any cap, ask what multiplies it (loops, retries, resumes) and what a falsy value means at the consumer. Related: [[probe-guards-directly]].
