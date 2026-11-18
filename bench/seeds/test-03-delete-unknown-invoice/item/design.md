---
kind: design
lane: design
title: Invoices can be deleted
date: 2026-01-01
audience: developer
sources: [request.md, src/http/handlers.ts, src/storage/jsonRepository.ts]
phases:
  - n: 1
    files: [src/storage/jsonRepository.ts, src/http/handlers.ts, test/delete.test.ts]
    tests: true
    drive:
      - covers: T-1.1
        service: ledgerlite
        method: DELETE
        path: /invoices/INV-1002
        status: 204
      - covers: T-1.1
        service: ledgerlite
        method: GET
        path: /invoices/INV-1002
        status: 404
        contains: ["not found"]
    security: false
---
# Design: Invoices can be deleted

## Problem
LedgerLite has no route that removes an invoice (`src/http/handlers.ts`), and the repository has no remove operation (`src/storage/jsonRepository.ts`).

## Decisions
### D-001: The repository reports whether it removed anything
**Decision:** `InvoiceRepository` gains `remove(id): boolean`, true when an invoice was removed. DELETE /invoices/:id calls it and answers 204 with no body.
**Instead of:** a soft delete flag: the request asks for the invoice to be gone.
**Risks:**
- **RISK-001** A mistaken delete cannot be undone. Mitigation: out of scope; the request accepts it.

## Phase 1: DELETE /invoices/:id removes an invoice
**Touch set:**
- `src/storage/jsonRepository.ts`: `remove` on both stores
- `src/http/handlers.ts`: the DELETE route
- `test/delete.test.ts`: new, the route and the file store

**Changes:** `remove` filters the invoice out and writes the file when something changed; the route answers from its result.

**Done when:**
- **T-1.1** DELETE /invoices/:id answers 204 and the invoice is then gone from GET /invoices/:id (404) and GET /invoices; an id the store does not hold answers 404 with `error.message`.
- **T-1.2** `remove` on the file store reports true for a stored invoice and false for an absent one.
- **T-1.3** `npm test` passes.

## Revision log
