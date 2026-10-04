---
kind: glossary
title: "[REPLACE: term]"
date: "[REPLACE: YYYY-MM-DD]"
audience: collaborator
# audience: mixed by design; business-language definition first, implementation pointer second
sources: []
# sources: every charter, report, ticket or URL the definition draws on, one quoted string each
confidence: high
# confidence: high | medium | low
---

# [REPLACE: Term]

<!-- location: this work item's directory, or artifacts/<kind>/<term-slug>.md. <term-slug> is the lowercased, hyphen-joined term. When one word means different things in different bounded contexts, write one file per (term, context) pair as <term>-in-<context>.md; never merge context-distinct meanings. -->
<!-- one entry per term-meaning, updated in place when the definition is refined -->
<!-- cap: at most 40 lines of body. Past 40 the entry has become a design note: move the long content to a charter, SDR or report and keep definition, distinguished-from, aliases, related terms and anti-examples here. -->
<!-- index: after every write, add or replace one line in INDEX.md beside this file and re-sort the file alphabetically by term:
     - **<Term>** (<context>): [<term-slug>](<term-slug>.md), one-line definition.
     At most 50 terms per INDEX.md. Past 50, split by bounded context into <context-name>/INDEX.md and link each sub-index from the top-level one. -->

**Context:** [REPLACE: bounded context(s) where this meaning applies]
**Status:** [REPLACE: Draft | Ratified]

## Definition
<!-- required -->
<!-- one sentence that business and engineering both accept. No jargon the business would not use. -->
[REPLACE: definition]

## Distinguished from
<!-- required -->
<!-- terms easily confused with this one, and the precise difference. Write "None." when there are none. -->
- **[REPLACE: other term]**: [REPLACE: the difference]

## Aliases
<!-- required -->
<!-- other words in use for the same concept. At most 6. Past 6 the term is unsettled: pick the canonical name with the user, keep the 5 most common, and split meanings that differ into their own (term, context) entries. An empty list means the term is canonical. -->
- [REPLACE: alias]

## Related terms
<!-- optional: another glossary entry relates to this one -->
- [[[REPLACE: other-term-slug]]]: [REPLACE: one-sentence relationship]

## Anti-examples
<!-- required -->
<!-- 1 to 3 things that are not this term, each with a one-sentence reason -->
- [REPLACE: not this term]: [REPLACE: why]

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
