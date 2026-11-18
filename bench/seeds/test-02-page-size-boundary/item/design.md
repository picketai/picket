---
kind: design
lane: design
title: Oversized pages are refused
date: 2026-01-01
audience: developer
sources: [request.md, src/http/handlers.ts, src/config.ts]
phases:
  - n: 1
    files: [src/http/handlers.ts, test/page-size.test.ts]
    tests: true
    drive:
      - covers: T-1.1
        service: ledgerlite
        method: GET
        path: /invoices?page=0&size=100
        status: 200
        contains: ["items"]
      - covers: T-1.1
        service: ledgerlite
        method: GET
        path: /invoices?size=500
        status: 400
        contains: ["size"]
      - covers: T-1.2
        service: ledgerlite
        method: GET
        path: /invoices?size=0
        status: 400
        contains: ["size"]
    security: false
---
# Design: Oversized pages are refused

## Problem
GET /invoices clamps `size` to `listing.maxPageSize` (`src/http/handlers.ts`), so a client never learns its page was cut.

## Decisions
### D-001: The handler refuses a size outside 1 to the maximum
**Decision:** The GET /invoices handler checks `size` before reading the store and answers 400 with `{ error: { field: "size", message } }` when it is outside the allowed range; the clamp goes.
**Instead of:** a header saying the page was cut: clients ignore headers they do not expect.
**Risks:**
- **RISK-001** A client that relied on the clamp now gets 400. Mitigation: the message names the maximum.

## Phase 1: GET /invoices refuses a size it will not serve
**Touch set:**
- `src/http/handlers.ts`: size check, clamp removed
- `test/page-size.test.ts`: new, the boundary and bad sizes

**Changes:** A small function returns the size error or null; the handler answers 400 on an error.

**Done when:**
- **T-1.1** Every `size` from 1 to `listing.maxPageSize` answers 200 with that many items at most, and every `size` above it answers 400 with `error.field` `size`.
- **T-1.2** A `size` of 0, a negative size or a size that is not a whole number answers 400 with `error.field` `size`.
- **T-1.3** `npm test` passes.

## Revision log
