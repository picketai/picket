---
kind: order
lane: order
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
        absent: [REPLACE: true when the text must not appear; omit the key otherwise]
    tests: true
    drive:
      # one check per criterion a request or command shows; drive: true for an endpoint, CLI, worker or startup wiring with no request to declare, false for none
      - covers: [REPLACE: the T-1.x criterion this request shows]
        method: [REPLACE: GET, POST, PUT, PATCH or DELETE]
        path: [REPLACE: the path as the request sends it, starting with /]
        status: [REPLACE: the expected status code]
        contains: [REPLACE: literal strings the response body must hold, or omit the key]
        service: [REPLACE: optional; the environment service the request goes to when several apps share the phase, or omit the key]
        replaces: [REPLACE: optional; the saved scenario S-<id> this check changes on purpose, or omit the key]
      - covers: [REPLACE: the T-1.x criterion this command shows]
        command: [REPLACE: the exact command picket drive --run runs]
        exit_code: [REPLACE: the expected exit code]
        contains: [REPLACE: literal strings the output must hold, or omit the key]
---
# Order: [REPLACE: title]

<!-- Caps: at most 3 phases, at most 5 decisions, 3 to 8 criteria per phase, phase body at most 80 lines. Over any cap, this is design-lane work. -->

## Problem
<!-- required -->
[REPLACE: what forces this work and the binding constraints, 2 to 4 sentences]

## Decisions
<!-- required -->
### D-001: [REPLACE: name]
**Decision:** [REPLACE: the choice and why it satisfies the constraint, one paragraph]
**Instead of:** [REPLACE: strongest alternative]: [REPLACE: the one reason it lost]
**Risks:**
- **RISK-001** [REPLACE: what could go wrong] Mitigation: [REPLACE: how]

## Scope
<!-- required -->
**In:** [REPLACE: bullets]
**Out:** [REPLACE: bullets]

## Phase 1: [REPLACE: title]
<!-- required -->
**Touch set:**
- `[REPLACE: repo-relative path]`: [REPLACE: three to six words on why]
**Changes:** [REPLACE: what is created or modified]
**Done when:**
- **T-1.1** [REPLACE: observable fact]
- **T-1.2** [REPLACE: observable fact]
- **T-1.3** [REPLACE: observable fact]

## Phase 2: [REPLACE: title]
<!-- optional: the work needs a second independently shippable step -->

## Phase 3: [REPLACE: title]
<!-- optional: the work needs a third step; a fourth means the design lane -->

## Open questions
<!-- required; write "none" when empty -->
- **OQ-001** [REPLACE: question]. Owner: [REPLACE: who]. Fallback: [REPLACE: what the phase does meanwhile]

## Revision log
<!-- required; empty at first write; one line per amendment: - YYYY-MM-DD: D-00x (rN): what changed; why -->

<!-- strip every [REPLACE] and every <!-- --> comment before writing -->
