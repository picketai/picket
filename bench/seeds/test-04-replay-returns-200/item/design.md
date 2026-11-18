---
kind: design
lane: design
title: Invoice creation is idempotent
date: 2026-01-01
audience: developer
sources: [request.md, src/http/handlers.ts, src/http/server.ts]
phases:
  - n: 1
    files: [src/http/handlers.ts, test/idempotency.test.ts]
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
        method: POST
        path: /invoices
        status: 200
        contains: ["totals"]
    security: false
---
# Design: Invoice creation is idempotent

## Problem
A retried POST /invoices creates a second invoice (`src/http/handlers.ts`).

## Decisions
### D-001: The router keeps created invoices by key in memory
**Decision:** `buildRouter` holds a map from `Idempotency-Key` to the created invoice. A known key answers 200 with the stored invoice and creates nothing.
**Instead of:** keys in the file store: the request keeps them in memory while the service runs.
**Risks:**
- **RISK-001** A restart forgets the keys. Mitigation: accepted by the request.

## Phase 1: A replayed key answers the original invoice
**Touch set:**
- `src/http/handlers.ts`: the key map on POST /invoices
- `test/idempotency.test.ts`: new, first use, replay, other key, no key

**Changes:** The POST handler reads the `idempotency-key` header (Node lower-cases header names) before creating.

**Done when:**
- **T-1.1** POST /invoices with a new `Idempotency-Key`, or with none, creates the invoice and answers 201.
- **T-1.2** A second POST /invoices with the same key creates nothing and answers 200 with the invoice of the first request.
- **T-1.3** `npm test` passes.

## Revision log
