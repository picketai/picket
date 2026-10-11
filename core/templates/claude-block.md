# Picket

Four lanes, four agents, one kernel. Code decides what code can decide; the model fills the rest.

## Every request

1. A change request: in the Bash tool, run `picket admit --request - --human` with the request in a quoted heredoc, and invoke the one lane skill it names: `picket:expediting` (fast), `picket:ordering` (order), `picket:designing` (design), `picket:researching` (research). Never load a second lane skill to compare. The lane is admit's call: a change that looks too small for it still takes it; only the user overrides it. A plain question: answer it.
2. State lives in `work/<id>/`. Read it with `picket state <id>` and `picket next <id>`. Never remember or re-derive it. `picket route` is the only way a verdict changes state.
3. Agents are `picket:analyst`, `picket:architect`, `picket:developer`, `picket:reviewer`. Spawn by type, named by role, continue a live instance with `SendMessage`, never respawn one. The one fresh spawn: the cumulative review gets a new reviewer, `cumulative-reviewer`.
4. Stop only at a user gate. The gate packet is `picket next` rendered: one line what happened, one line what changed, the bracket options. Never two stops in a row.
5. Verdict tokens are exact and stand alone on the last line: `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED`, `PHASE DONE`, `PHASE STALLED`, `ARTIFACT WRITTEN`, `REPORT WRITTEN`, `AMENDED`. A near miss is not a verdict.

## Rules

The plugin injects its rules at session start and into every agent: `prose`, `comments`, `work-items`, `security-paths`.

`picket init` rewrites this block; project lines belong under `## Project facts`.
