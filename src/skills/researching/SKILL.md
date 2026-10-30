---
name: researching
description: >
  The research lane: a question about code, documents, data or tickets that needs a report,
  not a change. The analyst returns an outline in one turn (summary, section headings, the
  sources it will read) so the user can redirect, then a deep pass fills it.
when_to_use: >
  Use when `picket admit` answers `research`, or when the user says "how does X work", "map
  the flow", "write a report on", "before we touch this I need to understand", or "no code
  changes". A plain question with a one-paragraph answer needs no lane: answer it. One scenario
  explained with worked data, step by step, goes to `picket:explaining`; a failure to diagnose
  goes to `picket:debugging`.
---

# Researching

You lead the research lane from the main session: one analyst per work item, spawned for the outline and continued for the deep pass and for later delta questions on the same sources, with the user deciding at each packet.

## Steps

1. Open the item and get the outline as `steps/outline.md` says.
2. At the outline packet, map the user's reply yourself: `a` closes; `p` runs `picket reply <id> p`, then closes as `a` does; `d` runs `steps/deep.md`; `x <what>` continues the analyst with the redirect and asks for a new outline, then prints the next packet.
3. After a deep pass, the packet comes back headed `report ready`; `a` closes; `p` runs `picket reply <id> p`, then closes as `a` does; `x <what>` sends one more bounded pass.
4. Close: print the report's one-sentence answer, then run `picket close <id> --human` and print its output verbatim under it. Stop.

## Rules

The analyst writes `work/<id>/research.md` only and never proposes designs. A finding that needs a decision is flagged `[ARCHITECT REVIEW NEEDED]`; `picket close` names those ids, and you offer `picket:ordering` or `picket:designing` in your closing sentence. A finding flagged `[STRATEGIC REVIEW NEEDED]` appears as `strategic review: <ids>`; offer `picket:consulting` for those ids.

On a research item `picket reply` takes `p` only, which approves the report and copies it to the `artifacts/reports/` path the option names. The `a`, `d` and `x` replies are yours to apply as the Steps say; never route them through the kernel.

A third redirect means the question is not a research question: say so and offer `picket:consulting` or `picket:ordering`.

Ticket pulls are part of ingestion; any ticket write is shown to the user for confirmation before it happens.

## Output

The packet is rendered by code from the report on disk. Print `picket packet <id>` verbatim inside one ```` ```text ```` fence, so its columns survive, and nothing else; send a push notification when the tool exists, and end the turn:

```
▶ outline ready · <id>
  <the report's first Summary sentence>

  report    work/<id>/research.md
  findings  4

[a] accept   [p] accept and publish to artifacts/reports/<slug>.md   [d] deeper pass   [x] reject: <why>
```

The closing block is `picket close <id> --human` under your one sentence: `## Research closed: <id>`, then `Report: work/<id>/research.md · findings: <n> · architect review: <R-ids | no>`, ending ` · strategic review: <R-ids>` when a finding carries that flag, and the `Left for you` and `Left staged` lines when there are any.
