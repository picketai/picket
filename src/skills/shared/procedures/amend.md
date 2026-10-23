# Amend the record in place

The item is `blocked` after `DRIFT DETECTED` (cross-check) or `AMENDMENT NEEDED: D-00x <reason>` (a review). Continue the architect, never spawn a new one:

```
work: <id>
amend: <the reviewer's drift or amendment line(s), verbatim>
phase: <the phase the finding cites, if any>
step: shared/procedures/amend.md (architect section below)
```

Wait for `AMENDED`. Then `picket set <id> status=open`, and `picket next` resumes the lane: a re-check of the changed decisions by the same reviewer (`scope: crosscheck`, `delta: D-00x`) when the amendment came from the cross-check, or straight back to the developer when it came from a review. Batch user rulings that arrive at gates ("make it injectable", "merge those two ports") into one amendment message, not one per ruling.

Three amendment rounds on one item stop the lane: `picket next` returns the options, and your lane's table sends you to the gate.

Then run `picket next <id>` and follow your lane's table.

## Architect section

Load only what the finding names: the cited `### D-###` sections, the cited phase, and the cited `file:line` hunks with ten lines of context. Do not re-read the whole record, the source tree or your original constraints.

Classify the finding first. Code drifted from a correct decision: change nothing in the record, reply with the line `RECONCILE: D-00x <what the code must restore, file:line>` and the token `AMENDED`. A decision was wrong or outgrown: amend it in place in the format the `work-items` rule gives (the bumped marker, the revision log line, a withdrawn decision keeping its ID, the caps), and edit any future phase whose criteria change.

Never touch a phase that has an `.approved` marker. If the amendment would require redoing one, say so on the `Open questions:` line and let the lead put it to the user.

End with the architect output block (`Revision:` filled) and `AMENDED`.
