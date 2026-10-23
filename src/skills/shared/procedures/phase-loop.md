# Phase loop: implement phase n

`picket next <id>` said `implement_phase` with `phase: n`. Spawn the developer (type `picket:developer`) once per work item, named `developer`; every later phase is a `SendMessage` to that same instance.

First phase message, followed by the Developer section below pasted verbatim (it is in your context; pasting it saves the developer a round trip):

```
work: <id>
phase: <n>
artifact: <the artifact field picket state <id> prints>
step: shared/procedures/phase-loop.md, developer section follows
```

Later phases: `work: <id>` and `phase: <n>` only, plus `run through <m>` when the user granted a run.

Wait for `PHASE DONE` or `PHASE STALLED`. The hook routes it. Then run `picket next <id>` and follow your lane's table: after `PHASE DONE` it says `approve_phase` (or `implement_phase` for the next phase, inside a granted run); after `PHASE STALLED` the item is `blocked` and it says `resolve_block`.

## Developer section

Your agent file carries the phase loop. Lane specifics:

Read the artifact named on your message's `artifact:` line once per work item; later phases re-read only the phase section you implement. Read every path in the phase's `**Touch set:**` before editing; the read-before-edit hook blocks the alternative.

Run `picket verify <id> <n> --no-tests` before you start to see the must_haves, and `picket verify <id> <n>` before you emit the block. Verify is the machine's view of done; `**Done when:**` is the human's. Both must hold.

Inside a granted run (`run through <m>` in your message), the phase loop is unchanged: one phase, one block, end the turn. The kernel decides whether the run goes on, and the lead sends the next phase only while `picket next` says `implement_phase`.

A criterion you cannot meet without changing a `D-###` decision is not yours to force: end with `PHASE STALLED` and name the decision. Three failed attempts at one criterion: the same.
