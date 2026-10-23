# Designing, step 2: phase 1 and the cross-check start together

`picket next <id>` said `implement_phase` with `phase: 1`. Two spawns in the same tool block, so neither waits for the other:

Developer (type `picket:developer`), named `developer`, as in `../shared/procedures/phase-loop.md`.

Reviewer (type `picket:reviewer`), named `reviewer`, in the background:

```
work: <id>
scope: crosscheck
artifact: work/<id>/design.md
step: reviewing/checklists/60-crosscheck.md
```

Both results arrive as notifications. Handle them in whichever order they land:

`ALIGNED`: the hook records it; nothing changes. When the developer's `PHASE DONE` lands, render the gate as in `../shared/procedures/gate.md`.

`DRIFT DETECTED`: the hook blocks the item. Do not interrupt a developer mid-phase; when its `PHASE DONE` lands, do not render the gate yet. Continue to `../shared/procedures/amend.md`. The developer's phase 1 commit stays; after `AMENDED` you send the developer `work: <id>`, `phase: 1`, `re-check: D-00x changed, <what>`, and it re-verifies phase 1 against the amended record before you render the gate.

`PHASE DONE` before either verdict: hold the gate packet until the cross-check verdict lands (at most one turn). A packet rendered on a record that then drifts costs the user a stop and a reversal.

From phase 2 on, the lane uses the shared phase loop and gate unchanged. `picket next` inserts `review_checkpoint` before the phase after the midpoint of plans with 6 or more phases; run it as `../shared/procedures/cumulative-review.md` with `scope: checkpoint` and `phase: <n>`, and continue the same reviewer instance.
