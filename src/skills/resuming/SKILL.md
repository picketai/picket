---
name: resuming
description: >
  Re-enter a work item from its state on disk with no history replay: read the state, compute
  the next action, print the gate packet or hand the next step to the right agent.
when_to_use: >
  Use when the user says "resume", "continue <id>", "where were we", "pick up the <feature>
  work", or opens a new session with an item still open.
argument-hint: "[<work-id>]"
---

# Resuming

Re-enter a work item from its state on disk with no history replay. `/picket:resuming` with no id lists the open items.
Current work items:
!`picket list --human`

## Steps

1. No id given: print the list above and ask which one, unless exactly one item is open, which you resume.
2. `picket state <id>` and `picket next <id> --human`. These two lines are the whole history you need; do not read the transcript, the ledger, or the artifact beyond the phase `next` names.
3. Act on `next`:
   - `create_worktrees`, `approve_phase`, `resolve_block`, `resolve_rejections` or `approve_amendment` by user: the gate of CLAUDE.md rule 4. Print `picket packet <id>` verbatim and stop; pass the reply to `picket reply <id> "<reply>"`.
   - `implement_phase`, `write_artifact`, `review_cumulative`, `review_checkpoint`, `review_crosscheck`: open the lane skill the item's `lane` names (`picket:ordering`, `picket:designing`, `picket:researching`) and follow its `## Steps` for that action, sending the messages `picket next` prints. Agents from the previous session are gone: `picket next` prints an `Agent` spawn for each, and you note in one line that the instance is new.
   - `resolve_sources`: the opening gate. Print `picket packet <id>` verbatim and stop; apply each reply with `picket source pick <id> <ref> <label>`, then continue the lane's `## Steps`.
   - `close` or `none`: say so in one line.
4. Fast-lane items have no artifact and no phases; if one is still `open`, the change was interrupted: show `git status` for the touch set and ask whether to finish or abandon.

## Rules

Never rewrite `state.yaml` by hand and never guess a phase number: `picket next` is the only source.

When the item's source is a ticket key, compare the live ticket's updated time with the story's `Ticket updated:` line; when it moved, say so and offer a pull before continuing.

## Output

At a gate, `picket packet <id>` printed verbatim and nothing else. For `close` or `none`, one line. Any other action replies as the lane skill's `## Output` says.
