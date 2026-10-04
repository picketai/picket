# Step 3: capture

The single output is `.claude/MEMORY.md` at project root, the project's shared glossary and decision log. It is not a spec, a scratch pad, or a place for implementation notes. Create it on the first resolved term or decision, never before. Update it inline the moment something resolves.

## Structure

```md
# Project Understanding

{One or two sentences naming the project and what it does.}

## Language

**{Term}**:
{One or two sentence definition of what it IS, not what it does.}
_Avoid_: {alias-1}, {alias-2}

## Flagged ambiguities

- **{Term}**: {how it was used ambiguously, and the resolution.}

## Decisions

- **{Short decision title}**: {at most 3 sentences: the choice, why, and what was rejected.} {Pointer to the owning artifact (SDR or ADR path) when one exists.}
```

## Rules

Be opinionated. Several words for one concept: pick the canonical one and list the rest under `_Avoid_`.

Define what a term IS, in one or two sentences. Project-specific terms only; general programming concepts do not belong.

Decisions are hooks, not essays. An entry is at most 3 sentences plus a pointer to the artifact holding the detail (SDR, ADR, charter). A decision whose detail has no artifact home is the signal to ratify it into an SDR, never to inline the detail here; this file is loaded on every consultant turn, so every excess word is a recurring tax. Log a decision when it is non-trivial: hard to reverse, surprising without context, or the result of a real trade-off.

Flag conflicts explicitly. A term used two ways in one session goes under Flagged ambiguities with its resolution.

Group under subheadings only when natural clusters emerge.

Never overwrite an existing entry silently. On conflict with an existing entry, surface it to the user and reconcile before writing.

## Closing summary

One paragraph when a termination condition from step 2 fires: terms added, ambiguities flagged, decisions recorded, open branches deferred, and which termination condition fired.
