---
kind: sdr
title: "[REPLACE: decision as a noun phrase]"
date: "[REPLACE: YYYY-MM-DD]"
audience: stakeholder
sources: []
# sources: every report, charter, ticket or URL the decision draws on, one quoted string each
confidence: high
# confidence: high | medium | low
---

# SDR-[REPLACE: NNNNN]: [REPLACE: title]

<!-- location: this work item's directory, or artifacts/<kind>/NNNNN-<short-title>.md. NNNNN is a zero-padded 5-digit sequence, independent of any tactical ADR counter; scripts/filename.mjs derives it. Re-derive immediately before writing; on a collision retry up to 3 times, then stop and surface it. -->
<!-- cap: at most 400 lines excluding fenced code. Past 400, split into two SDRs linked by Supersedes lines. -->
<!-- IDs: D-### for sub-decisions (only when one SDR truly holds several decisions; prefer one per SDR), RISK-### under Consequences, TF-### under Tactical follow-up. Zero-padded, encounter order, never renumbered after publication; withdraw with [withdrawn] and keep the ID. Cross-artifact reference: <short-title>#TF-003. Severity tags: critical | major | minor | pre-existing -->

**Status:** [REPLACE: Proposed | Ratified | Superseded by SDR-NNNNN]
**Affected contexts:** [REPLACE: context names; each must have a charter]

## Context
<!-- required -->
<!-- 2 to 4 sentences. State the business driver in plain language: the constraint, deadline, stakeholder ask or competitive pressure that makes this strategic rather than tactical. -->
[REPLACE: what forced this decision]

## Decision
<!-- required -->
<!-- one paragraph. The chosen direction in strategic terms (which subdomain to invest in, which boundary to draw, which relationship pattern, build / buy / outsource), never in implementation terms. -->
[REPLACE: the decision and why it serves the business]

### D-001 [REPLACE: sub-decision title]
<!-- optional: the SDR captures more than one strategic decision -->
[REPLACE: one paragraph]

## Subdomain and investment implications
<!-- required -->
**Subdomain affected:** [REPLACE: name, Core | Supporting | Generic]
**Investment shift:** [REPLACE: where effort increases and where it decreases; name both]

## Consequences
<!-- required -->
<!-- 2 to 4 bullets per side, at most 7. Past 7 the decision is unsettled: consolidate, or move the tail to a sibling note and cite it on the last bullet. -->
**Gains:**
- [REPLACE: what improves at the business or portfolio level]

**Costs:**
- [REPLACE: what gets harder, more expensive or more constrained]

**Risks:**
- **RISK-001** [[REPLACE: severity]] [REPLACE: what could go wrong]. Mitigation: [REPLACE: one mitigation]

## Context-map impact
<!-- required -->
<!-- name every relationship that changes, with its pattern before and after (Conformist to Anticorruption Layer). Cite the map by path. If the map needs a revision, add a TF item below. -->
[REPLACE: relationships added or changed, or "No change to the context map."]

## Alternatives considered
<!-- required -->
<!-- at most 5. Past 5, the exploration belongs in an analyst report: cite it under Context. -->
### Alternative: [REPLACE: name]
Ruled out because: [REPLACE: one sentence citing the business reason, not implementation difficulty]

## Tactical follow-up
<!-- required -->
<!-- at most 10 items the architect must turn into design records. Past 10, split the SDR. Write "None." when there are none. -->
- **TF-001** [TACTICAL DESIGN NEEDED] [REPLACE: what the architect must design]

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
