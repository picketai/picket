# Designing, step 2: phase 1 and the cross-check start together

`harness next <id>` said `implement_phase` with `phase: 1`. Two spawns in the same tool block, so neither waits for the other:

Developer, named `developer`, as in `.claude/skills/ordering/steps/20-phase.md` with `artifact: work/<id>/design.md`.

Reviewer, named `reviewer`, in the background:

```
work: <id>
scope: crosscheck
artifact: work/<id>/design.md
step: .claude/skills/reviewing/steps/60-crosscheck.md
```

Both results arrive as notifications. Handle them in whichever order they land:

`ALIGNED`: the hook records it; nothing changes. When the developer's `PHASE DONE` lands, render the gate as in `.claude/skills/ordering/steps/30-gate.md`.

`DRIFT DETECTED`: the hook blocks the item. Do not interrupt a developer mid-phase; when its `PHASE DONE` lands, do not render the gate yet. Continue to `steps/40-amend.md`. The developer's phase 1 commit stays; after `AMENDED` you send the developer `work: <id>`, `phase: 1`, `re-check: D-00x changed, <what>`, and it re-verifies phase 1 against the amended record before you render the gate.

`PHASE DONE` before either verdict: hold the gate packet until the cross-check verdict lands (at most one turn). A packet rendered on a record that then drifts costs the user a stop and a reversal.

From phase 2 on, the lane uses the order lane's phase and gate steps unchanged. `harness next` inserts `review_checkpoint` before the phase after the midpoint of plans with 6 or more phases; run it as `.claude/skills/ordering/steps/40-review.md` with `scope: checkpoint` and `phase: <n>`, and continue the same reviewer instance.
