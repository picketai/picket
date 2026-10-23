---
name: designing
description: >
  The design lane: a change that touches a security path, a schema or data migration, an
  irreversible step, a second repo or contract, or more than an order can hold. The architect
  writes a design record (decisions first, then phases), the developer starts phase 1 while
  the reviewer cross-checks the record concurrently, every phase takes a user gate, a
  checkpoint review runs at the midpoint of long plans, and one cumulative review closes it.
  Use when `picket admit` answers `design`, when a security-paths rule fires, or when
  `picket:ordering` reports that the order exceeds its caps.
user-invocable: true
---

# Designing

Runs in the main session. You are the lead: one architect, one developer, one reviewer per work item, each spawned once and continued by `SendMessage`; the cumulative review alone gets a fresh reviewer (`../shared/procedures/cumulative-review.md`). Every routing decision comes from `picket next <id>`.

Lane check for this request:

If this conversation has no `picket admit` answer for the request yet, run `picket admit --request - --human <<'PICKET_REQUEST_END'` with the request on the lines after it and `PICKET_REQUEST_END` alone on the last line.

`design` continues here. Other lanes run their own skill. A forced `lane: design` in the request is honoured.

## Steps

One step file at a time, each under 80 lines. The phase loop, the gate and the reviews are shared procedures, the same in the order lane.

| `picket next` says | Read |
|---|---|
| `write_artifact` by architect | `steps/10-design.md`: open the work item, spawn the architect with the design template |
| `resolve_sources` by user | `steps/10-design.md`: the opening gate; print the packet, stop, apply each pick |
| `implement_phase`, phase 1 | `steps/20-crosscheck.md`: start the developer AND the reviewer's cross-check in the same turn |
| `implement_phase`, later phases | `../shared/procedures/phase-loop.md` |
| `approve_phase` by user | `../shared/procedures/gate.md` |
| `review_checkpoint` by reviewer | `../shared/procedures/cumulative-review.md` with `scope: checkpoint` and `phase: <n>` |
| `review_cumulative` by reviewer | `../shared/procedures/cumulative-review.md` |
| `resolve_block` after `DRIFT DETECTED` or `AMENDMENT NEEDED`, when its options offer no redesign | `../shared/procedures/amend.md`: continue the architect, then resume |
| `resolve_block` whose options offer a redesign (a `PHASE STALLED`, a third drift or a third amendment), any other `resolve_block`, or `resolve_rejections` | `../shared/procedures/gate.md`: print the packet with the kernel's options, stop, apply the reply |
| `close` | `picket close <id>`, print the closing block, stop |

## Rules of the lane

Time to first reviewable output is the target: the architect emits the decisions and phase 1 before the remaining phases are polished, so the developer starts while the record is finished and cross-checked. `DRIFT DETECTED` arriving mid-phase blocks the item; the developer's phase 1 work is kept and re-checked after the amendment, never thrown away.

A run grant stops at every phase that takes its own gate; `picket next` and the gate packet name the reason. A phase marked `[IRREVERSIBLE]` takes an explicit confirmation: `picket next` and the packet offer `[i]` in place of `[a]`, and the gate procedure maps the reply.

Long plans (6 or more phases) get a checkpoint review before the phase after the midpoint; `picket next` schedules it.

Three `DRIFT DETECTED` rounds, three amendments or three cumulative `CHANGES REQUIRED` rounds are a user decision, not a fourth round: `picket next` returns the options, and the gate prints them.

## Closing block

```
## Design closed: <id>

<one sentence: what shipped>
Phases: <n> · decisions: <n> (<k> amended) · commits <first>..<last> · review: APPROVED
Questions: <the cumulative reviewer's Questions line; omit this line when it says none>
Left for you: <picket close's left lines; omit when there are none>
Left staged: <picket close's left staged paths, not this item's; omit when there are none>
```
