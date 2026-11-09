# Picket

Four lanes, four agents, one kernel. Code decides what code can decide; the model fills the rest.

## Every request

1. A change request: in the Bash tool, run `picket admit --request - --human` with the request in a quoted heredoc and invoke the skill it names: `picket:expediting` (fast), `picket:ordering` (order), `picket:designing` (design), `picket:researching` (research). On `lane: pending`, find the files the change edits and re-run admit with `--touched <paths>`. Never load a second lane skill. Admit's lane stands even when a change looks small; only the user overrides it. A plain question: answer it. A strategy question: `picket:consulting`.
2. Read state in `work/<id>/` with `picket state <id>` and `picket next <id>`; never recall it. Only `picket route` changes state.
3. Send an agent exactly what `picket next <id>` prints: run its `first:` lines, then use its tool, name, type, model and message verbatim. While an agent works, end the turn; when it notifies, run `picket next <id>`.
4. Stop only at a user gate: print `picket packet <id>` verbatim and end the turn. Pass the reply to `picket reply <id> "<reply>"` and send what it prints. Never two stops in a row.
5. Verdict tokens are exact, alone on the last line: `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED`, `PHASE DONE`, `PHASE STALLED`, `ARTIFACT WRITTEN`, `REPORT WRITTEN`, `AMENDED`.

## Rules

Every session and agent gets the rules `prose`, `comments`, `work-items`, `security-paths`, `tests`, `untrusted`.

`picket init` rewrites this block; project lines go under `## Project facts`.
