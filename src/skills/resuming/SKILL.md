---
name: resuming
description: >
  Re-enter a work item from its state on disk with no history replay: read the state, compute
  the next action, print the gate packet or hand the next step to the right agent. Use when the
  user says "resume", "continue <id>", "where were we", "pick up the <feature> work", or opens
  a new session with an item still open. `/picket:resuming` with no id lists the open items.
user-invocable: true
---

# Resuming

`/picket:resuming [<work-id>]`

Current work items:

!`picket list --human`

## Steps

1. No id given: print the list above and ask which one, unless exactly one item is open, which you resume.
2. `picket state <id>` and `picket next <id> --human`. These two lines are the whole history you need; do not read the transcript, the ledger, or the artifact beyond the phase `next` names.
3. Act on `next`:
   - `approve_phase`, `resolve_block` or `resolve_rejections` by user: render the gate exactly as `../shared/procedures/gate.md` describes, with `picket packet <id>`, and stop; apply the reply by its tables.
   - `implement_phase`, `write_artifact`, `review_cumulative`, `review_checkpoint`: open the lane skill the item's `lane` names (`picket:ordering`, `picket:designing`, `picket:researching`) and follow its table for that action. Agents from the previous session are gone; spawn fresh ones with the same messages the step file or procedure gives, and note in one line that the instance is new.
   - `resolve_sources`: the opening gate. Print `picket packet <id>` verbatim and stop; apply each reply with `picket source pick <id> <ref> <label>`, then continue the lane's step 1.
   - `close` or `none`: say so in one line.
4. Fast-lane items have no artifact and no phases; if one is still `open`, the change was interrupted: show `git status` for the touch set and ask whether to finish or abandon.

Never rewrite `state.yaml` by hand and never guess a phase number: `picket next` is the only source.
