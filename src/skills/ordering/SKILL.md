---
name: ordering
description: >
  The order lane: a bounded feature with local decisions, delivered as one work order (at most
  3 phases, 5 decisions) written by the architect and implemented phase by phase by the
  developer, with a user gate after each phase, a run offer, and one cumulative review at the
  end. No cross-check. Escalates to the design lane when the order outgrows its caps.
when_to_use: >
  Use when `picket admit` answers `order`, or when the user asks for a new endpoint, module,
  handler or capability that fits in a few phases and crosses no security path, schema or repo
  boundary.
---

# Ordering

You lead the order lane from the main session: you open the work item, send the agents what `picket next <id>` prints, stop only at user gates, and close with the block `picket close` prints. Every routing decision is the kernel's, never yours in prose.

## Steps

1. A request that names a Jira key (`SHOP-123`): run `picket:ticketing --pull <KEY> --story` by name first. It writes the story file and prints the `--ticket` and `--story` flags for `picket open`.
2. Open the item and run its preflight as `steps/open.md` says.
3. `write_artifact`: send the architect what `picket next <id>` prints and end the turn. Its `ARTIFACT WRITTEN` brings `create_worktrees` when the plan touches a nested repo with no branch named yet, else `implement_phase`.
4. `implement_phase`: send the developer what `picket next <id>` prints (an `Agent` spawn on phase 1, a `SendMessage` after) and end the turn. Its `PHASE DONE` brings the phase gate.
5. `create_worktrees`, `approve_phase`, `resolve_block`, `resolve_rejections`: the gate of rule 4. Print `picket packet <id>` verbatim, end the turn, and pass the user's reply to `picket reply <id> "<reply>"`.
6. `review_cumulative`, `fix_findings`, `amend`: send what `picket next <id>` prints, running its `first:` lines before the send, and end the turn.
7. `close`: print one sentence on what shipped, then run `picket close <id> --human` and print its output verbatim under that sentence. When it names `strategic review: <ids>`, offer `picket:consulting` for them. Stop.

## Rules

Mechanical hops never end the lane at a user stop: `ARTIFACT WRITTEN` starts phase 1, an approval starts the next phase, and a cumulative `APPROVED` leads to `close`. The hooks route each verdict; you read `picket next` and act.

A run grant (`r <n>`) lets the developer go through phase n with no gate in between, except a phase that takes its own gate, which always stops; `picket next` names the reason. A phase marked `[IRREVERSIBLE]` asks for `[i]` in place of `[a]`.

An architect answer of `exceeds order caps`: run `picket set <id> status=abandoned` and start `picket:designing` with the same request.

Three cumulative `CHANGES REQUIRED` rounds, or a `PHASE STALLED`, are the user's call: `picket next` gives `resolve_rejections` or `resolve_block` with the options, and you print them through the gate.

Rulings the user gives at gates ("make it injectable", "merge those two ports") go to the architect batched into one amendment, not one per ruling.

A `picket open` refusal naming `--user-lane` means admit put the request in another lane: ask the user; add the flag only on their word.

Never edit `work/<id>/` yourself, and never write code yourself in this lane.

## Output

The closing block is `picket close <id> --human`, under your one sentence:

```
<one sentence: what shipped>

## Order closed: <id>
Phases: <n> · commits <first>..<last> · review: APPROVED
Questions: <the cumulative review's open questions, when it asked some>
Deferred: <id> <owner>, <gate>   (one line per deferred criterion, when the plan marks some)
Left for you: <one line per command left for the user>
Left staged: <staged paths that are not this item's>
```
