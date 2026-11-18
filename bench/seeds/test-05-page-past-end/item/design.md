---
kind: design
lane: design
title: Invoice listing reports its pages
date: 2026-01-01
audience: developer
sources: [request.md, src/http/handlers.ts]
phases:
  - n: 1
    files: [src/http/handlers.ts, test/pages.test.ts]
    tests: true
    drive:
      - covers: T-1.1
        service: ledgerlite
        method: GET
        path: /invoices?page=0&size=2
        status: 200
        contains: ["\"pages\":3"]
      - covers: T-1.2
        service: ledgerlite
        method: GET
        path: /invoices?page=3&size=2
        status: 200
        contains: ["\"items\":[]"]
      - covers: T-1.3
        service: ledgerlite
        method: GET
        path: /invoices?page=-1
        status: 400
        contains: ["page"]
    security: false
---
# Design: Invoice listing reports its pages

## Problem
GET /invoices gives no page count, and its `page` default of 1 skips the first page (`src/http/handlers.ts`).

## Decisions
### D-001: Pages count from 0 and a page past the end is an empty page
**Decision:** The handler defaults `page` to 0, adds `pages` as the ceiling of `total / size`, and serves any page at or past `pages` as 200 with an empty `items` list, as the request says.
**Instead of:** 404 for a page past the end: the request makes the empty list the client's stop signal.
**Risks:**
- **RISK-001** A client that sent `page=1` for the first page now gets the second. Mitigation: the request accepts it; the answer carries `page`.

## Phase 1: GET /invoices reports its pages
**Touch set:**
- `src/http/handlers.ts`: `pages`, page default and check
- `test/pages.test.ts`: new, count, default, last page, past the end, bad page

**Changes:** One check refuses a bad page; the slice is unchanged.

**Done when:**
- **T-1.1** GET /invoices answers `pages`, the page count at the requested size, and `page` defaults to 0.
- **T-1.2** A page at or past the last answers 200 with an empty `items` list and the same `total` and `pages`.
- **T-1.3** A negative or fractional `page` answers 400 with `error.field` `page`.
- **T-1.4** `npm test` passes.

## Revision log
