---
name: inspecting
description: >
  Status at a glance: every work item with its lane, phase and next action, and the session's
  spend, cache hit ratio, tokens per accepted line, stops and hook bounces from the ledger.
  Use when the user says "status", "where are we", "what's open", "how much has this cost",
  "cache ratio", "show the ledger", or "what's next". Read-only.
user-invocable: true
---

# Inspecting

`/picket:inspecting [<work-id>] [--session <id>]`

Work items:

!`picket list --human`

Cost, this project:

!`picket cost --human`

## Steps

1. With no id: print the two lines above, then for each `open` item one line from `picket next <id> --human`. When the cost line shows any escalation, add the `Escalations:` block from step 2, read from `picket cost`. Stop.
2. With an id: `picket state <id>` and `picket next <id> --human`, plus `picket cost --work <id>` (JSON, for `escalations`). Render:

```
▶ <id> · <lane> · <status> · phases <approved>/<total>
Next: <action> by <actor><, phase n>
Spent: $<cost> · <turns> turns · cache <ratio> · <tok/line> tokens per accepted line
Verdicts: <last three, oldest first>
Escalations: <asked> asked · <ran> ran · <not_run> not run · <denied> denied
  <outcome> <command> · "<reason>"   (one line per `escalations.recent` row, only when any exist)
```

`not run` means the dialog was refused, interrupted, or the command failed; the hooks cannot tell which, so never call it refused.

3. Answer the specific question the user asked in one more line if the render does not already; never restate the artifact.

The ledger is `.picket/state/ledger.jsonl`, written by the hooks; this skill only reads what `picket cost` computes from it. An empty ledger means no turn has completed in this project since the hooks were installed.
