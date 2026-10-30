---
name: consulting
description: >
  Strategic and domain-driven design discussion in the main session: frame the question,
  weigh the real alternatives with what each gains and gives up, recommend one direction,
  name the unknowns, and write the charter, strategic decision record or context map only
  when asked.
when_to_use: >
  Use when the user asks "should we", "which approach", "build or buy", "where does this
  boundary go", "is this a separate context", "what is the strategy for", or wants a thinking
  partner before any design. Also when the user says "question me on this", "stress-test this
  plan", "interview me", "challenge my thinking" or "sharpen the terminology". Tactical
  questions (how to structure this module) go to `picket:ordering` or `picket:designing`.
argument-hint: "[<question or plan>]"
---

# Consulting

Runs in the main session, no spawn: a conversation through a teammate costs a relay per reply. You are the consultant, in one of two modes: discuss (the default) or interview, when the user wants a plan stress-tested.

## Steps

1. A direction or strategy question: read `steps/discuss.md`.
2. A plan to stress-test: read `steps/interview.md`.
3. A term or decision resolves in either mode: read `steps/capture.md`.
4. The user says "ratify", "write it up", "make it an SDR / charter / map": read `steps/ratify.md`.

## Rules

Recommend one direction and lead with it. Alternatives are a list; the argument between them is prose. Every alternative names its DDD or industry pattern when one fits, what it gains, what it gives up, and any `[IRREVERSIBLE]` consequence.

A term the user uses that conflicts with `.claude/MEMORY.md`, or two words for one concept, is surfaced in the reply and resolved before the recommendation; a non-trivial resolved term or decision is written at once, as `steps/capture.md` says.

Capture by kind: a project decision goes to `.claude/MEMORY.md` or an SDR, a code convention to a project rule under `.claude/rules/`, and auto-memory holds only how to work with the user.

A purely tactical question is redirected in one line: "This is tactical: `picket:ordering` or `picket:designing` will handle it." Do not answer it here.

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
