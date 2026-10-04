---
kind: charter
title: "[REPLACE: bounded context name]"
date: "[REPLACE: YYYY-MM-DD]"
audience: stakeholder
sources: []
# sources: every path, ticket or URL the charter draws on, one quoted string each
confidence: high
# confidence: high | medium | low
---

# Charter: [REPLACE: Context Name]

<!-- location: this work item's directory, or artifacts/<kind>/<context-name>.md. Derive <context-name> from the context name itself, not the request subject. -->
<!-- one charter per bounded context. When one exists, update it in place: bump Revision and add a Revision history line. Never create a second file. -->
<!-- cap: at most 300 lines in total. Past 300 the charter covers more than one context; split it. -->
<!-- IDs: INV-### and OQ-###, zero-padded, encounter order, never renumbered after publication; withdraw with [withdrawn] and keep the ID. Cross-artifact reference: <context-name>#INV-002 -->

**Status:** [REPLACE: Draft | Ratified | Deprecated]
**Revision:** [REPLACE: N]
**Owning team:** [REPLACE: team name, or "unassigned"]

## Purpose
<!-- required -->
<!-- one paragraph in the business's language. No implementation detail. -->
[REPLACE: what this context exists to do]

## Subdomain classification
<!-- required -->
**Type:** [REPLACE: Core | Supporting | Generic]
**Reasoning:** [REPLACE: one sentence tying the type to a business signal: differentiation (Core), necessary but undifferentiated (Supporting), commodity (Generic)]
**Investment posture:** [REPLACE: Build in-house | Buy / adopt | Outsource | Defer]

## Scope
<!-- required -->
<!-- 2 to 6 capabilities per list. Past 6, fold siblings into one higher-level capability or split the context. -->
**In scope:**
- [REPLACE: capability this context owns end to end]

**Out of scope:**
- [REPLACE: capability handled elsewhere]: owned by [REPLACE: context]

## Ubiquitous language (summary)
<!-- required -->
<!-- 3 to 8 terms. Each must have a glossary entry; link it as [[<term-slug>]]. Past 8, the rest live in the glossary only. -->
- **[REPLACE: term]**: see [[[REPLACE: term-slug]]]

## Upstream / downstream
<!-- required -->
<!-- name the relationship pattern for each upstream, as it appears on the context map -->
**Upstream (this context depends on):** [REPLACE: context (pattern), ..., or "none"]
**Downstream (depend on this context):** [REPLACE: contexts, or "none"]

## Invariants
<!-- required -->
<!-- 2 to 5 business rules that hold regardless of implementation, each one declarative sentence. Past 5, drop derived rules and keep the irreducible ones. -->
- **INV-001** [REPLACE: rule]

## Open questions
<!-- optional: an unresolved strategic question blocks ratification -->
<!-- at most 10. Each names who can answer it. Past 10, surface the blocking ones to the user before writing on. An empty list means Status is Ratified. -->
- **OQ-001** [REPLACE: question] (answer owner: [REPLACE: who])

## Revision history
<!-- required -->
- v[REPLACE: N] ([REPLACE: YYYY-MM-DD]): [REPLACE: one-sentence summary of the change]

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
