# Amend the record in place

The item is `blocked` after `DRIFT DETECTED` (cross-check) or `AMENDMENT NEEDED: D-00x <reason>` (a review), and `picket next <id>` says `amend`.

1. Send what `picket next <id>` prints: it continues the architect with `work:` and `amend:`, never a new one.
2. Wait for `AMENDED`. Then `picket set <id> status=open`, and `picket next` resumes the lane: a re-check of the changed decisions by the same reviewer (`scope: crosscheck`, `delta: D-00x`) when the amendment came from the cross-check, or straight back to the developer when it came from a review.
3. Batch user rulings that arrive at gates ("make it injectable", "merge those two ports") into one amendment message, not one per ruling.
4. Three amendment rounds on one item stop the lane: `picket next` returns the options, and your lane's table sends you to the gate.
5. Then run `picket next <id>` and follow your lane's table.
