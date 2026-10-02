# Harness

Four lanes, four agents, one kernel. Code decides what code can decide; the model fills the rest. `harness` below means `node .claude/bin/harness.mjs`.

## Every request

1. A change request: run `harness admit --text "<request>" --human` and invoke the one lane skill it names: `expediting` (fast), `ordering` (order), `designing` (design), `researching` (research). Never load a second lane skill to compare. A plain question: answer it.
2. State lives in `work/<id>/`. Read it with `harness state <id>` and `harness next <id>`. Never remember or re-derive it. `harness route` is the only way a verdict changes state.
3. Agents in `.claude/agents/`: analyst, architect, developer, reviewer. Spawn by role name, continue a live instance with `SendMessage`, never respawn one. The one fresh spawn: the cumulative review gets a new reviewer, `cumulative-reviewer`.
4. Stop only at a user gate. The gate packet is `harness next` rendered: one line what happened, one line what changed, the bracket options. Never two stops in a row.
5. Verdict tokens are exact and stand alone on the last line: `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED`, `PHASE DONE`, `PHASE STALLED`, `ARTIFACT WRITTEN`, `REPORT WRITTEN`, `AMENDED`. A near miss is not a verdict.

## Rules

`.claude/rules/` loads by path: `work-items` (work/**), `security-paths`, `harness-authoring` (.claude/**), `prose` (always), `comments` (always).

## Project facts

Operational one-liners every agent needs and none should rediscover. Append below.

- Sources (read-only repos such as `analysis`) are declared in `.claude/harness.json`; each root comes from its env var, set in the `env` block of `.claude/settings.local.json`. Reach them with `harness source find|grep` and the work item's snapshots; nothing writes under a source.
