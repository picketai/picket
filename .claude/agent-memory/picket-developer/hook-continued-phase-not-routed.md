---
name: hook-continued-phase-not-routed
description: fixed in e15d2ba (2026-10-30); a continued-turn PHASE DONE now routes unless it repeats the last verdict row
metadata:
  type: project
---

Fixed on 2026-10-30 in e15d2ba (item 20261029-route-verdicts-on-continued-turns-drift-amends). routeVerdict used to return null on `stop_hook_active`, so under a run grant a phase begun from hook context did not route its first PHASE DONE. It now routes, and skips only a turn that repeats the item's last verdict row (same verdict and phase).

**Why:** the lead spent a round trip per phase on re-emits before the fix.

**How to apply:** no warning on Decisions: is needed any more. A deliberate re-emit of the same verdict on a continued turn is dropped by design.
