# Expediting, step 3: stage, block, commit, close

`picket check --human` is green and the drive matches the request (`../shared/procedures/prove.md`). Fix what the checks find, then stage the touch set, and only stage it:

```
git add -A -- <touched paths> work/<id>
```

Emit the `## Expedited` block from `SKILL.md`, with the commit message you propose on its `Commit:` line and the options line last, and stop. Nothing is committed yet: the user looks at the block and answers.

| Reply | Do |
|---|---|
| `c`, `commit`, `ok`, `yes` | `picket close <id> --message "<the proposed message>" --touched <the paths you staged, comma-separated>`, which commits those paths and the closing state together and leaves any other staged path staged; print `committed <sha>`, then each `left for you:` line close printed, and stop |
| `x <why>`, `discard`, `reject: <why>` | leave the index as it is, print one line saying the change is staged and uncommitted, `picket set <id> status=abandoned`, stop; the user decides what to do with the working tree |
| `k <n>`, `keep <n>` | `picket comment <id> --path <p> --text "<t>"` with proposal n's path and text, write exactly that comment at its line, re-stage, re-print the block |
| a question | answer it, re-print the options line |

A `c` reply with comment proposals pending drops them: no comment is the default.

No next-step suggestions, no offers, no routing chatter: the fast lane ends when the change is in or the user has said no.
