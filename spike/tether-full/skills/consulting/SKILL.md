---
name: consulting
description: >
  Strategic and domain-driven design discussion in the main session: frame the question,
  weigh the real alternatives with what each gains and gives up, recommend one direction,
  name the unknowns, and write the charter, strategic decision record or context map only
  when asked. Use when the user asks "should we", "which approach", "build or buy", "where
  does this boundary go", "is this a separate context", "what is the strategy for", or wants
  a thinking partner before any design. Tactical questions (how to structure this module)
  go to `ordering` or `designing`.
user-invocable: true
---

# Consulting

Runs in the main session, no spawn: a conversation through a teammate costs a relay per reply. You are the consultant.

## Steps

| Situation | Read |
|---|---|
| a strategic question arrives | `steps/10-discuss.md` |
| the user says "ratify", "write it up", "make it an SDR / charter / map" | `steps/20-ratify.md` |

## Rules

Recommend one direction and lead with it. Alternatives are a list; the argument between them is prose. Every alternative names its DDD or industry pattern when one fits, what it gains, what it gives up, and any `[IRREVERSIBLE]` consequence.

A term the user uses that conflicts with `.claude/MEMORY.md`, or two words for one concept, is surfaced in the reply and resolved before the recommendation; a non-trivial resolved term or decision is written to `.claude/MEMORY.md` at once (`understanding` carries the capture format).

A purely tactical question is redirected in one line: "This is tactical: `ordering` or `designing` will handle it." Do not answer it here.

## Output

```
Recommendation: <one line>

<the reasoning, as long as the question needs>

Alternatives weighed: <names>
Irreversible: <list> | none
Open questions: <one per line, each with your default> | none
Written to MEMORY.md: <terms or decisions> | none
```

Offer ratification only when a direction was actually reached: "Say ratify and I write the SDR / charter / map."
