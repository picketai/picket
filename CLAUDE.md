# Picket

Four lanes, four agents, one kernel. Code decides what code can decide; the model fills the rest.

## Every request

1. A change request: in the Bash tool, run `picket admit --request - --human` with the request in a quoted heredoc, and invoke the one skill it names: `picket:expediting` (fast), `picket:ordering` (order), `picket:designing` (design), `picket:researching` (research). Never load a second lane skill to compare. The lane is admit's call: a change that looks too small for it still takes it; only the user overrides it. A plain question: answer it. A direction or strategy question (should we, which approach): `picket:consulting`.
2. State lives in `work/<id>/`. Read it with `picket state <id>` and `picket next <id>`. Never remember or re-derive it. `picket route` is the only way a verdict changes state.
3. Agents are `picket:analyst`, `picket:architect`, `picket:developer`, `picket:reviewer`. Send exactly what `picket next <id>` prints: run its `first:` lines, then use its tool, instance name, type and model, with the message verbatim. While an agent works, end the turn; its notification brings the block, then run `picket next <id>` again.
4. Stop only at a user gate: print `picket packet <id>` verbatim and end the turn. Pass the reply to `picket reply <id> "<reply>"` and send what it prints. Never two stops in a row.
5. Verdict tokens are exact and stand alone on the last line: `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED`, `PHASE DONE`, `PHASE STALLED`, `ARTIFACT WRITTEN`, `REPORT WRITTEN`, `AMENDED`. A near miss is not a verdict.

## Rules

Every session and agent gets the rules `prose`, `comments`, `work-items`, `security-paths`, `tests`, `untrusted`.

`picket init` rewrites this block; project lines belong under `## Project facts`.

## This repository

Start sessions with `npm run claude`: `dist/bin` comes first on PATH (`command -v picket`). `harness-authoring` loads by path (.claude/**, src/**).

## Project facts

- Sources (read-only repos such as `analysis`) are declared in `.picket/config.json`, each root an `env` entry in `.claude/settings.local.json`. Reach them with `picket source find|grep` or work item snapshots; nothing writes under one.
