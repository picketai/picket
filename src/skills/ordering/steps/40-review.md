# Ordering, step 4: the cumulative or checkpoint review

`picket next <id>` said `review_cumulative` (or `review_checkpoint` in the design lane). Compute the summary the reviewer needs; never let the reviewer detect it. Before a cumulative review, run the mutation spot-check first, once: it inverts one operator on a changed source line (`===` to `!==`), runs the tests, puts the file back, and saves the outcome for the summary:

```
picket mutate <id>
picket summary <id>
```

The summary prints `{ size, frameworks, concerns, security_path, changed_files, base, request, repos, silenced, mutation }` from the diff between the work item's base and HEAD, across the root and every nested repo. A checkpoint skips `picket mutate`; its `mutation` is whatever an earlier run left, or null.

## Cumulative: a fresh reviewer

Spawn a new reviewer instance (type `picket:reviewer`) named `cumulative-reviewer`, with model `opus`. Never continue the instance that ran the cross-check or a checkpoint: its context holds the plan and its earlier verdicts, and that anchors it on the architect's reading of the story. Its message opens with the fixed sentence, then the fields:

```
You are reviewing a change you did not write. You have no context beyond what is below.
work: <id>
scope: cumulative
summary: <the JSON, verbatim>
step: reviewing/steps/15-traced.md
```

Re-reviews continue `cumulative-reviewer` by `SendMessage`, so its prior findings stay in context.

## Checkpoint: the same reviewer

Continue `reviewer` (spawn it, type `picket:reviewer`, named `reviewer` only if none exists for this item) with `work: <id>`, `scope: checkpoint`, `phase: <n>`, `summary: <the JSON, verbatim>`, `step: reviewing/steps/10-alignment.md`.

## The verdict

Wait for it. The hook routes it:

`APPROVED`: `picket next` says `close` (or the next phase after a checkpoint). On close, run `picket close <id>` and print the closing block from `SKILL.md`, adding `Questions: <the reviewer's line>` when it is not `none`, and `Repeats: <class> (<items>)` for each entry in the close result's `repeats` (a reviewer row id that two or more `CHANGES REQUIRED` reviews named). For each repeat, offer one follow-up request under the block: "Fix the <class> mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on <the past mistake's commit>". Then stop.

`CHANGES REQUIRED`: `SendMessage` the developer with `work: <id>`, `review: <the reviewer's findings verbatim>`, `phase: <the phase each finding belongs to>`. The developer fixes and ends with `PHASE DONE`; re-run this step, continuing the same reviewer instance. On the third `CHANGES REQUIRED` for this item, stop with the options `[c] continue with a fresh developer · [d] redesign · [x] accept as is`.

`AMENDMENT NEEDED: D-00x <reason>` above the verdict: the code followed a decision that turned out wrong. Continue the architect with `work: <id>`, `amend: <the line verbatim>`, `step: designing/steps/40-amend.md`; on `AMENDED`, continue the developer for the affected phase. The user is told in the closing block which decision moved and why.
