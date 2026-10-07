---
kind: report
title: [REPLACE: title]
date: [REPLACE: YYYY-MM-DD]
audience: [REPLACE: developer | collaborator | stakeholder]
sources: [REPLACE: every path, URL or ticket actually read]
confidence: [REPLACE: high | medium | low, the weakest marker that carries a top finding]
---
# Report: [REPLACE: title]

<!-- Caps: at most 50 findings, at most 120 words per finding, at most 3 top findings in the summary. Every finding carries exactly one marker: [VERIFIED] read directly, [INFERRED] deduced from verified facts, [ASSUMED] not grounded in the source. -->

## Summary
<!-- required; the answer in 3 to 5 sentences, each claim with its marker -->
[REPLACE]

## Context
<!-- required; what was asked, what was in scope, what was not read and why -->
[REPLACE]

## Structure
<!-- optional: the source is code or a document set; how it is organised, entry points, main flows -->
[REPLACE]

## Findings
<!-- required; one R-### per finding, encounter order, never renumbered; each: what, where (path:line or URL), why it matters -->
- **R-001** [VERIFIED] [REPLACE: finding]. `[REPLACE: path:line]`.
- **R-002** [INFERRED] [REPLACE: finding]. `[REPLACE: path:line]`.

## Dependencies and relationships
<!-- optional: external services, libraries, data stores, other modules the source relies on -->
[REPLACE]

## Risks and unknowns
<!-- required; [UNKNOWN] for a question the sources could not answer, [ASSUMPTION] for a coverage choice -->
- [UNKNOWN] [REPLACE]

## Recommendations
<!-- optional: only what the question asked for; describe, never design. A finding that needs a decision is flagged [ARCHITECT REVIEW NEEDED] -->
- [REPLACE]

## Sources for the deep pass
<!-- optional: outline pass only; one line per source with the reason to read it -->
- `[REPLACE: path]`: [REPLACE: why]

## Glossary
<!-- optional: a term the reader may not know; business meaning first, implementation pointer second -->
- **[REPLACE: term]**: [REPLACE]

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
