---
name: new-date-scan
description: conventions.test.mjs flags any `new Date(` text outside context.mts, even pure date arithmetic; use Date.UTC plus Intl formatToParts
metadata:
  type: project
---

`test/repo/conventions.test.mjs` PROCESS_READS matches the text `new Date(` in every typed source except the exempt list, so `new Date(ms).toISOString()` for date math fails `npm test` although it reads no clock.

**Why:** the scan is textual, not semantic.

**How to apply:** do date arithmetic with `Date.UTC(y, m - 1, d + n)` and an `Intl.DateTimeFormat("en-US", { timeZone: "UTC", ... }).formatToParts`, as `src/lib/shared/scenarios/values.mts` does. Related: [[scans-read-agent-memory]].
