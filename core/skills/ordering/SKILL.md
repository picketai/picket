---
name: ordering
description: >
  The order lane: a bounded feature with local decisions, delivered as one work order (at most
  3 phases, 5 decisions) written by the architect and implemented phase by phase by the
  developer, with a user gate after each phase, a run offer, and one cumulative review at the
  end. No cross-check. Use when `picket admit` answers `order`, or when the user asks for a
  new endpoint, module, handler or capability that fits in a few phases and crosses no
  security path, schema or repo boundary. Escalates to `picket:designing` when the order outgrows
  its caps.
user-invocable: true
---

# Ordering

Paths cited here and in this skill's step files, such as `ordering/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

Runs in the main session. You are the lead: you open the work item, spawn the architect once and the developer once, continue them by `SendMessage`, and stop only at user gates. Every routing decision comes from `picket next <id>`; never decide it in prose.

Lane check for this request:

If this conversation has no `picket admit` answer for the request yet, run `picket admit --request - --human <<'PICKET_REQUEST_END'` with the request on the lines after it and `PICKET_REQUEST_END` alone on the last line.

`order` continues here. `fast` runs `picket:expediting`; `design` runs `picket:designing`; `research` runs `picket:researching`.

## Steps

One step file at a time, each under 80 lines. `picket next <id>` tells you which applies.

| `picket next` says | Read |
|---|---|
| `write_artifact` by architect | `steps/10-order.md`: open the work item, spawn the architect with the order template |
| `resolve_sources` by user | `steps/10-order.md`: the opening gate; print the packet, stop, apply each pick |
| `implement_phase` by developer | `steps/20-phase.md`: spawn or continue the developer for phase n |
| `approve_phase` by user | `steps/30-gate.md`: render the gate packet, stop, apply the reply with `picket route` |
| `review_cumulative` by reviewer | `steps/40-review.md`: compute the review summary, spawn the reviewer, route the verdict |
| `close` | `picket close <id>`, print the closing block, stop |
| `resolve_block` | print `blocked_reason`, ask the user how to proceed, stop |

## Rules of the lane

Mechanical hops never end your turn: architect `ARTIFACT WRITTEN` starts phase 1, developer `PHASE DONE` renders the gate, user `approved` starts the next phase, reviewer `APPROVED` closes. The hooks apply each verdict with `picket route`; you read `picket next` and act.

A run grant (`r <n>` or "approved through n") lets the developer continue through phase n without a stop, except a phase that takes its own gate, which always stops; `picket next` names the reason. `picket route ... --through n` records it; the developer's continuation message names the phases.

A third `CHANGES REQUIRED` on the cumulative review, or a `PHASE STALLED`, is a user decision: print the diagnosis and the options `[c] continue with a fresh developer · [d] redesign · [x] abandon`, and stop.

Never edit `work/<id>/` yourself; never write code yourself in this lane.

## Closing block

```
## Order closed: <id>

<one sentence: what shipped>
Phases: <n> · commits <first>..<last> · review: APPROVED
Questions: <the cumulative reviewer's Questions line; omit this line when it says none>
```
