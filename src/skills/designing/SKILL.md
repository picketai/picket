---
name: designing
description: >
  The design lane: a change that touches a security path, a schema or data migration, an
  irreversible step, a second repo or contract, or more than an order can hold. The architect
  writes a design record (decisions first, then phases), the developer starts phase 1 while
  the reviewer cross-checks the record, every phase takes a user gate, a checkpoint review runs
  at the midpoint of long plans, and one cumulative review closes it.
when_to_use: >
  Use when `picket admit` answers `design`, when a security-paths rule fires, or when the order
  lane reports that the order exceeds its caps.
---

# Designing

You lead the design lane from the main session: one architect, one developer and one reviewer per work item, each spawned once and continued after, plus a fresh reviewer for the cumulative review. `picket next <id>` names every send and every gate; the target is the time to the first reviewable output.

## Steps

1. A request that names a Jira key (`SHOP-123`): run `picket:ticketing --pull <KEY> --story` by name before anything else; it writes the story file and prints the `picket open` flags.
2. Open the item and run its preflight as `steps/open.md` says.
3. `write_artifact`: send the architect what `picket next <id>` prints and end the turn. The architect emits the decisions and phase 1 first, so `ARTIFACT WRITTEN` arrives early. It brings `create_worktrees` when the plan touches a nested repo with no branch named yet, else `implement_phase`; the cross-check goes out with phase 1, after the reply.
4. `implement_phase` on phase 1 prints two sends, the developer and the reviewer's cross-check: put both in one tool block so neither waits, and end the turn. A `PHASE DONE` that lands before the cross-check verdict holds the packet until that verdict is in.
5. `DRIFT DETECTED` blocks the item and `picket next` says `amend`: send the architect what it prints. After `AMENDED`, `picket next` says `review_crosscheck`: send it at once, with no user gate between the amendment and the re-check.
6. `implement_phase` on later phases, `review_checkpoint`, `review_cumulative`, `fix_findings`: send what `picket next <id>` prints, running its `first:` lines before the send, and end the turn.
7. `create_worktrees`, `approve_phase`, `resolve_block`, `resolve_rejections`, `approve_amendment`: the gate of CLAUDE.md rule 4. Print `picket packet <id>` verbatim, end the turn, and pass the reply to `picket reply <id> "<reply>"`.
8. `close`: print one sentence on what shipped, then run `picket close <id> --human` and print its output verbatim under it. When it names `strategic review: <ids>`, offer `picket:consulting` for them. Stop.

## Rules

A drift arriving mid-phase never discards the developer's phase 1 work: the item is blocked, the record is amended, and the re-check covers the amended decisions before the phase 1 gate.

A run grant stops at every phase that takes its own gate (a security path, a `security: true` phase); `picket next` and the packet name the reason. A phase marked `[IRREVERSIBLE]` takes an explicit confirmation: the packet offers `[i]` in place of `[a]`.

Plans of 6 or more phases get a checkpoint review before the phase after the midpoint; `picket next` schedules it as `review_checkpoint`.

Three `DRIFT DETECTED` rounds, three amendments or three cumulative `CHANGES REQUIRED` rounds are a user decision, never a fourth round: `picket next` gives the stall options and you print them through the gate.

Batch the user's gate rulings ("make it injectable", "merge those two ports") into one amendment message to the architect rather than one message for each.

When `picket open` refuses with a message naming `--user-lane`, admit chose another lane: ask the user, and add the flag only on their word.

The design record holds 1 to 10 phases and at most 8 decisions; never edit `work/<id>/` or write code yourself in this lane.

## Output

The closing block is `picket close <id> --human`, under your one sentence:

```
<one sentence: what shipped>

## Design closed: <id>
Phases: <n> · decisions: <n> (<k> amended) · commits <first>..<last> · review: APPROVED
Audit: <lane> · phases <n> · tokens <agent> <n>, ... · bounces <n> · blocks <n>
Questions: <the cumulative review's open questions, when it asked some>
Deferred: <id> <owner>, <gate>   (one line per deferred criterion, when the plan marks some)
Left for you: <one line per command left for the user>
Left staged: <staged paths that are not this item's>
```
