---
kind: context-map
title: "[REPLACE: scope]"
date: "[REPLACE: YYYY-MM-DD]"
audience: stakeholder
sources: []
# sources: every charter, SDR, report or URL the map draws on, one quoted string each
confidence: high
# confidence: high | medium | low
---

# Context Map: [REPLACE: Scope]

<!-- location: this work item's directory, or artifacts/<kind>/<scope>.md. Scope is "current" when the map covers the whole system; use a scoped name (payments-subsystem) only for a deliberate subset when current.md already exists. -->
<!-- one map per scope. When one exists, update it in place: bump Revision and add a Revision history line. -->
<!-- IDs: REL-###, zero-padded, encounter order in the table, never renumbered after publication. Withdraw by setting Pattern to Separate Ways with [withdrawn] appended, or remove the row and never reuse the number. Cross-artifact reference: <scope>#REL-004 -->

**Status:** [REPLACE: Draft | Ratified]
**Revision:** [REPLACE: N]

## Contexts in scope
<!-- required -->
<!-- at most 20. Each links its charter; a context with no charter is invalid, so write the charter first or drop the context. Past 20, split into scoped sub-maps and keep current.md as the overview. -->
- **[REPLACE: Context Name]**: see [[charter-[REPLACE: context-name]]]

## Relationships
<!-- required -->
<!-- at most 25 rows, one per directed relationship, upstream to downstream (the downstream depends on the upstream). Past 25, split into scoped sub-maps. -->
<!-- Pattern is exactly one of: Partnership (succeed or fail together), Customer-Supplier (downstream influences upstream's backlog), Conformist (downstream accepts upstream's model as is), Anticorruption Layer (downstream translates at its boundary), Open Host Service (upstream publishes a stable protocol for many), Published Language (shared versioned interchange format), Shared Kernel (small jointly owned model), Separate Ways (no integration), Big Ball of Mud (boundary unclear or violated; flag as tech debt). Any other pattern: stop and surface it to the user; never invent one. -->

| ID      | Upstream        | Downstream      | Pattern            | Integration                                             | Notes                       |
|---------|-----------------|-----------------|--------------------|---------------------------------------------------------|-----------------------------|
| REL-001 | [REPLACE: name] | [REPLACE: name] | [REPLACE: pattern] | [REPLACE: sync REST, async event, shared DB, file drop] | [REPLACE: one-sentence why] |

## Diagram
<!-- required -->
<!-- ASCII or Mermaid. Contexts as nodes, relationships as labelled edges, arrows pointing downstream to match the table. At most 20 nodes; past that, one diagram per subsystem. -->
```
[REPLACE: diagram]
```

## Notable absences
<!-- optional: two contexts could plausibly relate but intentionally do not -->
<!-- one bullet per absent relationship with the reason ("Identity and Billing share no kernel, to keep PCI scope minimal") -->
- [REPLACE: context A] and [REPLACE: context B]: [REPLACE: why they stay apart]

## Revision history
<!-- required -->
- v[REPLACE: N] ([REPLACE: YYYY-MM-DD]): [REPLACE: one-sentence summary]

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
