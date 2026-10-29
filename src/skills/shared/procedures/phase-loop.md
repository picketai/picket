# Phase loop: implement phase n

`picket next <id>` said `implement_phase` with `phase: n`. Spawn the developer (type `picket:developer`) once per work item, named as the send says; every later phase is a `SendMessage` to that same instance.

Send what `picket next` prints: its send line names the tool, the instance and the type, and its text fence is the message, verbatim. The first message carries `work:`, `phase:` and `artifact:`; later ones `work:` and `phase:`, plus `run through <m>` when the user granted a run.

Wait for `PHASE DONE` or `PHASE STALLED`. The hook routes it. Then run `picket next <id>` and follow your lane's table: after `PHASE DONE` it says `approve_phase` (or `implement_phase` for the next phase, inside a granted run); after `PHASE STALLED` the item is `blocked` and it says `resolve_block`.
