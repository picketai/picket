---
name: designing
description: >
  The design lane: a change that touches a security path, a schema or data migration, an
  irreversible step, a second repo or contract, or more than an order can hold. The architect
  writes a design record (decisions first, then phases), the developer starts phase 1 while
  the reviewer cross-checks the record concurrently, every phase takes a user gate, a
  checkpoint review runs at the midpoint of long plans, and one cumulative review closes it.
  Use when `tether admit` answers `design`, when a security-paths rule fires, or when
  `tether:ordering` reports that the order exceeds its caps.
user-invocable: true
---

# Designing

Paths cited here and in this skill's step files, such as `designing/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

Runs in the main session. You are the lead: one architect, one developer, one reviewer per work item, each spawned once and continued by `SendMessage`; the cumulative review alone gets a fresh reviewer (`ordering/steps/40-review.md`). Every routing decision comes from `tether next <id>`.

Lane check for this request:

```!
tether admit --request - --human <<'TETHER_REQUEST_END'
$ARGUMENTS
TETHER_REQUEST_END
```

`design` continues here. Other lanes run their own skill. A forced `lane: design` in the request is honoured.

## Steps

One step file at a time, each under 80 lines. The phase loop and the user gate are the order lane's, reused unchanged.

| `tether next` says | Read |
|---|---|
| `write_artifact` by architect | `steps/10-design.md`: open the work item, spawn the architect with the design template |
| `resolve_sources` by user | `steps/10-design.md`: the opening gate; print the packet, stop, apply each pick |
| `implement_phase`, phase 1 | `steps/20-crosscheck.md`: start the developer AND the reviewer's cross-check in the same turn |
| `implement_phase`, later phases | `ordering/steps/20-phase.md` |
| `approve_phase` by user | `ordering/steps/30-gate.md` |
| `review_checkpoint` by reviewer | `ordering/steps/40-review.md` with `scope: checkpoint` and `phase: <n>` |
| `review_cumulative` by reviewer | `ordering/steps/40-review.md` |
| `resolve_block` after `DRIFT DETECTED` or `AMENDMENT NEEDED` | `steps/40-amend.md`: continue the architect, then resume |
| `close` | `tether close <id>`, print the closing block, stop |

## Rules of the lane

Time to first reviewable output is the target: the architect emits the decisions and phase 1 before the remaining phases are polished, so the developer starts while the record is finished and cross-checked. `DRIFT DETECTED` arriving mid-phase blocks the item; the developer's phase 1 work is kept and re-checked after the amendment, never thrown away.

A run grant stops at every phase that takes its own gate; `tether next` and the gate packet name the reason. `[IRREVERSIBLE]` steps take an explicit extra confirmation in the gate packet: add the line `⚠ irreversible: <step>` and the option `[i] confirm irreversible step`.

Long plans (6 or more phases) get a checkpoint review before the phase after the midpoint; `tether next` schedules it.

Three `DRIFT DETECTED` rounds or three cumulative `CHANGES REQUIRED` rounds are a user decision, not a fourth round: `[c] continue · [d] redesign · [x] abandon`.

## Closing block

```
## Design closed: <id>

<one sentence: what shipped>
Phases: <n> · decisions: <n> (<k> amended) · commits <first>..<last> · review: APPROVED
Questions: <the cumulative reviewer's Questions line; omit this line when it says none>
```
