---
name: new-next-action-check-band
description: A new picket next action needs a check of src/mods/status/hooks/band.ts, which falls back to "you approve phase <phase>" for any user action
metadata:
  type: project
---

When `NEXT_ACTIONS` gains an action, read `src/mods/status/hooks/band.ts` (`stepText`, `otherSessionStep`). Every open item with `actor: user` that is not `resolve_sources` renders "you approve phase ${work.phase}". An action without a phase shows "phase null". Item 08a's `resolve_rejections` did this (2026-10-23, Minor).

**Why:** grepping for the action name misses the band, because it never names the action. It branches on `actor` and `status`.

**How to apply:** in the regression step of a cumulative review that touches `next-step.mts`, read the band and `inject/state` as consumers. Write probe files only to the session scratchpad, never `$TMP`: `guard.bash` blocks `rm`, so stray files cannot be cleaned up. Related: [[probe-guards-directly]].
