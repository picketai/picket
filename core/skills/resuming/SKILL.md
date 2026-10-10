---
name: resuming
description: >
  Re-enter a work item from its state on disk with no history replay: read the state, compute
  the next action, print the gate packet or hand the next step to the right agent. Use when the
  user says "resume", "continue <id>", "where were we", "pick up the <feature> work", or opens
  a new session with an item still open. `/tether:resuming` with no id lists the open items.
user-invocable: true
---

# Resuming

Paths cited here and in this skill's step files, such as `resuming/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

`/tether:resuming [<work-id>]`

Current work items:

!`picket list --human`

## Steps

1. No id given: print the list above and ask which one, unless exactly one item is open, which you resume.
2. `picket state <id>` and `picket next <id> --human`. These two lines are the whole history you need; do not read the transcript, the ledger, or the artifact beyond the phase `next` names.
3. Act on `next`:
   - `approve_phase` by user: render the gate packet exactly as `ordering/steps/30-gate.md` describes, from the artifact's phase section and the last `PHASE DONE` block in `work/<id>/verdicts.jsonl`, and stop.
   - `implement_phase`, `write_artifact`, `review_cumulative`, `review_checkpoint`: open the lane skill the item's `lane` names (`tether:ordering`, `tether:designing`, `tether:researching`) at the matching step. Agents from the previous session are gone; spawn fresh ones with the same messages the step file gives, and note in one line that the instance is new.
   - `resolve_block`: print `blocked_reason` and the options `[c] continue · [x] abandon`; stop.
   - `resolve_sources`: the opening gate. Print `picket packet <id>` verbatim and stop; apply each reply with `picket source pick <id> <ref> <label>`, then continue the lane's step 1.
   - `close` or `none`: say so in one line.
4. Fast-lane items have no artifact and no phases; if one is still `open`, the change was interrupted: show `git status` for the touch set and ask whether to finish or abandon.

Never rewrite `state.yaml` by hand and never guess a phase number: `picket next` is the only source.
