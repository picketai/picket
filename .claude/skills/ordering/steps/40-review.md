# Ordering, step 4: the cumulative or checkpoint review

`harness next <id>` said `review_cumulative` (or `review_checkpoint` in the design lane). Compute the summary the reviewer needs; never let the reviewer detect it:

```
node .claude/bin/harness.mjs review-summary <id>
```

It prints `{ size, frameworks, concerns, security_path, changed_files, base, request, repos }` from the diff between the work item's base and HEAD, across the root and every nested repo.

## Cumulative: a fresh reviewer

Spawn a new reviewer instance named `cumulative-reviewer`, with model `opus`. Never continue the instance that ran the cross-check or a checkpoint: its context holds the plan and its earlier verdicts, and that anchors it on the architect's reading of the story. Its message opens with the fixed sentence, then the fields:

```
You are reviewing a change you did not write. You have no context beyond what is below.
work: <id>
scope: cumulative
summary: <the JSON, verbatim>
step: .claude/skills/reviewing/steps/15-traced.md
```

Re-reviews continue `cumulative-reviewer` by `SendMessage`, so its prior findings stay in context.

## Checkpoint: the same reviewer

Continue `reviewer` (spawn it named `reviewer` only if none exists for this item) with `work: <id>`, `scope: checkpoint`, `phase: <n>`, `summary: <the JSON, verbatim>`, `step: .claude/skills/reviewing/steps/10-alignment.md`.

## The verdict

Wait for it. The hook routes it:

`APPROVED`: `harness next` says `close` (or the next phase after a checkpoint). On close, run `harness set <id> status=done` and print the closing block from `SKILL.md`, adding `Questions: <the reviewer's line>` when it is not `none`; stop.

`CHANGES REQUIRED`: `SendMessage` the developer with `work: <id>`, `review: <the reviewer's findings verbatim>`, `phase: <the phase each finding belongs to>`. The developer fixes and ends with `PHASE DONE`; re-run this step, continuing the same reviewer instance. On the third `CHANGES REQUIRED` for this item, stop with the options `[c] continue with a fresh developer · [d] redesign · [x] accept as is`.

`AMENDMENT NEEDED: D-00x <reason>` above the verdict: the code followed a decision that turned out wrong. Continue the architect with `work: <id>`, `amend: <the line verbatim>`, `step: .claude/skills/designing/steps/40-amend.md`; on `AMENDED`, continue the developer for the affected phase. The user is told in the closing block which decision moved and why.
