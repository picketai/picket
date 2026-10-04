# Ordering, step 2: implement phase n

`harness next <id>` said `implement_phase` with `phase: n`. Spawn the developer once per work item, named `developer`; every later phase is a `SendMessage` to that same instance.

First phase message, followed by the Developer section below pasted verbatim (it is in your context; pasting it saves the developer a round trip):

```
work: <id>
phase: <n>
artifact: work/<id>/order.md
step: .claude/skills/ordering/steps/20-phase.md, developer section follows
```

Later phases: `work: <id>` and `phase: <n>` only, plus `run through <m>` when the user granted a run.

Wait for `PHASE DONE` or `PHASE STALLED`. The hook routes it. `PHASE DONE` moves you to `steps/30-gate.md` (or straight to the next phase inside a granted run). `PHASE STALLED` makes the item `blocked`: print the developer's diagnosis and the options `[c] continue with a fresh developer · [d] redesign · [x] abandon`, then stop.

## Developer section

Your agent file carries the phase loop. Lane specifics:

Read `work/<id>/order.md` once per work item; later phases re-read only the phase section you implement. Read every path in the phase's `**Touch set:**` before editing; the read-before-edit hook blocks the alternative.

Run `harness verify <id> <n> --no-tests` before you start to see the must_haves, and `harness verify <id> <n>` before you emit the block. Verify is the machine's view of done; `**Done when:**` is the human's. Both must hold.

Inside a granted run (`run through <m>` in your message), continue to the next phase after `PHASE DONE` without waiting, emitting one block per phase, and stop at phase m or at the first phase whose touch set includes a security path.

A criterion you cannot meet without changing a `D-###` decision is not yours to force: end with `PHASE STALLED` and name the decision. Three failed attempts at one criterion: the same.
