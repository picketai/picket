---
name: researching
description: >
  The research lane: a question about code, documents, data or tickets that needs a report,
  not a change. The analyst returns an outline in one turn (summary, section headings, the
  sources it will read) so the user can redirect, then a deep pass fills it. Use when
  `picket admit` answers `research`, or when the user says "how does X work", "map the flow",
  "write a report on", "before we touch this I need to understand", or "no code changes". A
  plain question with a one-paragraph answer needs no lane: answer it. One scenario explained
  with worked data, step by step, goes to `picket:explaining`.
user-invocable: true
---

# Researching

Paths cited here and in this skill's step files, such as `researching/SKILL.md`, are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`.

Runs in the main session. One analyst per work item, spawned for the outline and continued for the deep pass and for later delta questions on the same sources.

Lane check for this request:

If this conversation has no `picket admit` answer for the request yet, run `picket admit --request - --human <<'PICKET_REQUEST_END'` with the request on the lines after it and `PICKET_REQUEST_END` alone on the last line.

`research` continues here. A change request runs its own lane.

## Steps

| `picket next` says | Read |
|---|---|
| `write_artifact` by analyst | `steps/10-outline.md`: open the work item, spawn the analyst for the outline |
| `approve_phase` by user (outline present) | render the packet below, stop; on `d`, `steps/20-deep.md`; on `a`, close |
| `close` | `picket close <id>`, print the closing block below, stop |

## The packet

Rendered by code from the report on disk; print it verbatim inside one ```` ```text ```` code fence, so its columns survive, and nothing else:

```
picket packet <id>
```

```
▶ outline ready · <id>
  <the report's first Summary sentence>

  report    work/<id>/research.md
  findings  4

[a] accept   [d] deeper pass   [x] reject: <why>
```

`d` continues the analyst with `work: <id>`, `deep pass`, plus any redirect. `x <what>` continues it with the redirect and asks for a new outline. The deep pass ends with the same packet, headed `report ready`.

## Closing block

```
## Research closed: <id>

<the report's one-sentence answer>
Report: work/<id>/research.md · findings: <n> · architect review: <yes: R-00x | no>
Left for you: <picket close's left lines; omit when there are none>
```

## Rules of the lane

The analyst writes `work/<id>/research.md` only and never proposes designs; a finding that needs a decision is flagged `[ARCHITECT REVIEW NEEDED]` and the lead offers `picket:ordering` or `picket:designing` in the closing line. Ticket pulls are part of ingestion; any ticket write is surfaced for the user's confirmation before it happens.
