---
name: researching
description: >
  The research lane: a question about code, documents, data or tickets that needs a report,
  not a change. The analyst returns an outline in one turn (summary, section headings, the
  sources it will read) so the user can redirect, then a deep pass fills it. Use when
  `harness admit` answers `research`, or when the user says "how does X work", "explain",
  "map the flow", "write a report on", "before we touch this I need to understand", or "no
  code changes". A plain question with a one-paragraph answer needs no lane: answer it.
user-invocable: true
---

# Researching

Runs in the main session. One analyst per work item, spawned for the outline and continued for the deep pass and for later delta questions on the same sources.

Lane check for this request:

!`node "${CLAUDE_PLUGIN_ROOT}/bin/harness.mjs" admit --text "$ARGUMENTS" --human`

`research` continues here. A change request runs its own lane.

## Steps

| `harness next` says | Read |
|---|---|
| `write_artifact` by analyst | `steps/10-outline.md`: open the work item, spawn the analyst for the outline |
| `approve_phase` by user (outline present) | render the packet below, stop; on `d`, `steps/20-deep.md`; on `a`, close |
| `close` | `harness set <id> status=done`, print the closing block below, stop |

## The packet

Rendered by code from the report on disk; print it verbatim and nothing else:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/harness.mjs" packet <id>
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
## Report: <id>

<the report's one-sentence answer>
Report: work/<id>/research.md · findings: <n> · architect review: <yes: R-00x | no>
```

## Rules of the lane

The analyst writes `work/<id>/research.md` only and never proposes designs; a finding that needs a decision is flagged `[ARCHITECT REVIEW NEEDED]` and the lead offers `ordering` or `designing` in the closing line. Ticket pulls are part of ingestion; any ticket write is surfaced for the user's confirmation before it happens.
