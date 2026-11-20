---
name: guard-ask-drive-scratch-root
description: How to drive guard.bash's dist bundle to an ask for a marked data run, with a seeded project under .picket/state/scratch
metadata:
  type: project
---

guard.bash's `ask` path for a data run needs a project with a catalog entry, an approval row, data_targets and an open item. Build one under `.picket/state/scratch/<id>/ask-root/` with Write (guard.scope allows the scratch prefix, including its nested `.picket/state`), open the item with `CLAUDE_PROJECT_DIR=<root> picket open --lane fast --title x`, then drive `CLAUDE_PROJECT_DIR="$PWD/<rel>" PICKET_DATA_<SVC>=... node dist/hooks/guard.bash.mjs < <rel>/payload.json` through `picket drive --run`.

**Why:** `picket data approve` is lead-only, so the approval row is written by hand there; and the repo root has no `.picket/env`, so it only reaches plan refusals.

**How to apply:** use it to check `updatedInput` and confirmations from the real bundle. The PowerShell dialect falls through on bash-only syntax, so a PowerShell closure uses the `powerShellCommands` grammar, not `commandLines`. See [[drive-needs-fresh-dist]].
