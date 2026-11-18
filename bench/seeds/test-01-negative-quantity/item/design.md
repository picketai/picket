---
kind: design
lane: design
title: New invoices are validated
date: 2026-01-01
audience: developer
sources: [request.md, src/http/handlers.ts, src/domain/invoice.ts, src/domain/pricing.ts]
phases:
  - n: 1
    files: [src/http/validation.ts, src/http/handlers.ts, test/validation.test.ts]
    tests: true
    drive:
      - covers: T-1.1
        service: ledgerlite
        method: POST
        path: /invoices
        status: 201
        contains: ["totals"]
      - covers: T-1.2
        service: ledgerlite
        method: GET
        path: /invoices
        status: 200
        contains: ["total"]
    security: false
---
# Design: New invoices are validated

## Problem
POST /invoices stores any body (`src/http/handlers.ts`), so a missing customer or a negative quantity reaches the file store and breaks `computeTotals` later.

## Decisions
### D-001: Validation is one pure function in its own module
**Decision:** `src/http/validation.ts` exports `newInvoiceError(body)`, which returns the first offending field and a message, or null. The POST handler calls it before anything is stored and answers 400 with `{ error: { field, message } }`.
**Instead of:** checks inside the handler: a pure function is tested without the router.
**Risks:**
- **RISK-001** A rule is missed in the function. Mitigation: one unit test per field.

## Phase 1: POST /invoices refuses an invalid body
**Touch set:**
- `src/http/validation.ts`: new, `newInvoiceError`
- `src/http/handlers.ts`: POST calls it first
- `test/validation.test.ts`: new, the rules and the route

**Changes:** The rules of the request, checked in order: customer, currency, lines, then each line's description, quantity and unitPriceCents.

**Done when:**
- **T-1.1** POST /invoices answers 201 with the invoice and its totals for a valid body, and 400 with `error.field` naming the first offending field for a body that breaks a rule of the request.
- **T-1.2** A refused body stores nothing: the `total` of GET /invoices is unchanged after it.
- **T-1.3** `npm test` passes.

## Revision log
