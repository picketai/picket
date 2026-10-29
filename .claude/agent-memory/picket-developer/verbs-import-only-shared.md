---
name: verbs-import-only-shared
description: conventions.test.mjs layer rule - a verb module may import only the shared and util zones and mods.mts, never another verb
metadata:
  type: project
---

The layer rule in `test/repo/conventions.test.mjs` (ALLOWED_ZONES, allowedZones) lets a verb folder import only itself, the shared zone, the util zone and `mods.mts`. Hooks may import a verb's index module; verbs may not. A new verb that reuses another verb's logic fails `npm test` only at the product step, after the unit tests pass.

**Why:** phase 7 of 20261029-kernel-groundwork (picket reply, 2026-10-29) stalled on this after the whole verb was built and driven; D-008 (r2) then moved the route service into the shared zone.

**How to apply:** before writing a verb that reuses another verb's logic, check the plan moves that logic into the shared zone; if it does not, raise it before implementing. Keep memory files free of backticked repo paths that may move: see [[scans-read-agent-memory]].
