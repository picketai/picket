# Tether

Four lanes, four agents, one kernel. Code decides what code can decide; the model fills the rest.

## Every request

1. A change request: run `tether admit --text "<request>" --human` and invoke the one lane skill it names: `tether:expediting` (fast), `tether:ordering` (order), `tether:designing` (design), `tether:researching` (research). Never load a second lane skill to compare. A plain question: answer it.
2. State lives in `work/<id>/`. Read it with `tether state <id>` and `tether next <id>`. Never remember or re-derive it. `tether route` is the only way a verdict changes state.
3. Agents are `tether:analyst`, `tether:architect`, `tether:developer`, `tether:reviewer`. Spawn by type, named by role, continue a live instance with `SendMessage`, never respawn one. The one fresh spawn: the cumulative review gets a new reviewer, `cumulative-reviewer`.
4. Stop only at a user gate. The gate packet is `tether next` rendered: one line what happened, one line what changed, the bracket options. Never two stops in a row.
5. Verdict tokens are exact and stand alone on the last line: `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED`, `PHASE DONE`, `PHASE STALLED`, `ARTIFACT WRITTEN`, `REPORT WRITTEN`, `AMENDED`. A near miss is not a verdict.

## Rules

The plugin injects its rules at session start and into every agent: `prose`, `comments`, `work-items`, `security-paths`.

`tether init` rewrites this block; project lines belong under `## Project facts`.
