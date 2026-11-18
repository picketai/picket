---
kind: design
lane: design
title: Invoices take credit notes
date: 2026-01-01
audience: developer
sources: [request.md, src/http/handlers.ts]
phases:
  - n: 1
    files: [src/http/credits.ts, src/http/handlers.ts, test/credits.test.ts]
    tests: true
    drive:
      - covers: T-1.1
        service: ledgerlite
        method: POST
        path: /invoices/INV-1001/credit
        status: 201
        contains: ["CN-"]
      - covers: T-1.2
        service: ledgerlite
        method: POST
        path: /invoices/INV-9999/credit
        status: 404
        contains: ["not found"]
      - covers: T-1.3
        service: ledgerlite
        method: POST
        path: /invoices/INV-1001/credit
        status: 400
        contains: ["amountCents"]
    security: false
---
# Design: Invoices take credit notes

## Problem
LedgerLite has no way to record a refund against an invoice (`src/http/handlers.ts`).

## Decisions
### D-001: Credit notes live in memory beside the router
**Decision:** `src/http/credits.ts` holds `creditError(body)` and a `CreditNotes` store that numbers notes `CN-1`, `CN-2`. `buildRouter` owns one store, as the request keeps notes in memory.
**Instead of:** credit notes in the invoice file: the request defers storage.
**Risks:**
- **RISK-001** A restart forgets the notes. Mitigation: accepted by the request.

## Phase 1: POST /invoices/:id/credit issues a credit note
**Touch set:**
- `src/http/credits.ts`: new, the body check and the store
- `src/http/handlers.ts`: the credit route
- `test/credits.test.ts`: new, issue, unknown invoice, bad amount, bad reason

**Changes:** The route checks the invoice, then the body, then issues the note.

**Done when:**
- **T-1.1** POST /invoices/:id/credit with a valid body answers 201 with the credit note's `id`, `invoiceId`, `amountCents` and `reason`.
- **T-1.2** An invoice the store does not hold answers 404.
- **T-1.3** An `amountCents` below 1 or not whole, or an empty `reason`, answers 400 with `error.field` naming it.
- **T-1.4** `npm test` passes.

## Revision log
