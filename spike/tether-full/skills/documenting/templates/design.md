---
kind: design
lane: design
title: [REPLACE: six-word title]
date: [REPLACE: YYYY-MM-DD]
audience: developer
sources: [REPLACE: request, reports, files read]
phases:
  - n: 1
    files: [REPLACE: every path phase 1 creates or edits]
    greps:
      - path: [REPLACE: repo-relative path]
        pattern: [REPLACE: regex a criterion makes true]
    tests: true
    drive: [REPLACE: true when the phase touches a runtime surface]
---
# Design: [REPLACE: title]

<!-- Caps: 1 to 10 phases, at most 8 decisions, 3 to 8 criteria per phase, phase body at most 80 lines, revision log line at most 30 words. Write the file in two saves: Problem, Decisions, Scope and Phase 1 first; the rest second. -->

## Problem
<!-- required -->
[REPLACE: what forces this work and the binding constraints, 2 to 5 sentences; cite reports and rulings by path]

## Decisions
<!-- required -->
### D-001: [REPLACE: name]
**Decision:** [REPLACE: the choice and why it satisfies the constraint; tactical DDD terms where domain logic or persistence is touched, or "infrastructural decision"]
**Instead of:** [REPLACE: strongest alternative]: [REPLACE: the one reason it lost]
**Risks:**
- **RISK-001** [REPLACE: what could go wrong] Mitigation: [REPLACE: how]
<!-- mark steps that cannot be undone [IRREVERSIBLE] inline -->

## Scope
<!-- required -->
**In:** [REPLACE: bullets]
**Out:** [REPLACE: bullets]

## Phase 1: [REPLACE: title]
<!-- required; each phase independently shippable, in execution order -->
**Touch set:**
- `[REPLACE: repo-relative path]`: [REPLACE: three to six words on why; [INFERRED] when unsure]
**Changes:** [REPLACE: what is created or modified; interfaces and data shapes, no function bodies]
**Done when:**
- **T-1.1** [REPLACE: observable fact]
- **T-1.2** [REPLACE: observable fact]
- **T-1.3** [REPLACE: observable fact]
**Irreversible:** [REPLACE: the step, or omit the line]

## Phase 2: [REPLACE: title]
<!-- optional: repeat the phase block; a security-path phase never shares a run grant -->

## Open questions
<!-- required; write "none" when empty; [STRATEGIC] flags a question for consulting -->
- **OQ-001** [REPLACE: question]. Owner: [REPLACE: who]. Fallback: [REPLACE: what the phase does meanwhile]

## Revision log
<!-- required; empty at first write; one line per amendment: - YYYY-MM-DD: D-00x (rN): what changed; why -->

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
