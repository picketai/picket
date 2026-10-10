# Reference Example — Bug Report / Development Defect

This is a **complete, finished output sample**. Use it to calibrate reproduction step precision, evidence formatting, root cause depth, and fix-verification AC style.
Do NOT reproduce this in output unless the user is actually working on stock availability caching bugs.

---

**Issue Type:** Bug
**Input provided by:** QA Engineer (Dana K.) — discovered during regression testing of sprint 14 that the stock availability endpoint returns stale data when the same book is requested within 60 seconds of a status change.
**Priority:** High — affects all consumers of the availability endpoint; could lead to overselling the last copy in production
**Severity:** Major — incorrect data returned but system does not crash; an order can still proceed on stale result
**Labels:** `bug`, `orders`, `caching`, `staging`
**Affected Version:** v2.14.0-rc1

---

### Bug Summary

The `GET /api/stock/availability` endpoint returns stale book availability data for up to 60 seconds after a copy's status changes (e.g., from `Available` to `Reserved`). This creates a window during which a second order for the same last copy succeeds at the API layer, producing an oversold copy that is only caught (and rejected) at the database constraint level — resulting in a 500 error rather than a user-friendly 409 conflict response.

### Environment

| Property            | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| Environment         | Staging (confirmed); Production (suspected, not verified) |
| Browser / Client    | All (backend API issue)                                   |
| OS / Platform       | N/A                                                       |
| User role           | Any authenticated support agent                           |
| Tenant / Account    | All tenants                                               |
| Date first observed | 2026-03-16                                                |
| Frequency           | Always — reproducible within the 60-second TTL window     |

### Steps to Reproduce

**Preconditions:** Two browser sessions authenticated as different support agents; the last copy of the book with ISBN `978-1-4028-9462-6` must have status `Available`.

1. In Session A: Call `GET /api/stock/availability?date=2026-03-20&genreId=3` — confirm ISBN `978-1-4028-9462-6` appears in the response with `"status": "Available"`.
2. In Session A: Submit an order for ISBN `978-1-4028-9462-6` for date `2026-03-20`. Confirm the order succeeds and the copy's status changes to `Reserved`.
3. **Immediately** (within 60 seconds of step 2): In Session B: Call `GET /api/stock/availability?date=2026-03-20&genreId=3`.
4. **Observe:** ISBN `978-1-4028-9462-6` still appears in the response with `"status": "Available"` despite being ordered in step 2.
5. In Session B: Attempt to order the same copy of ISBN `978-1-4028-9462-6` for the same date.
6. **Observe:** The API returns `500 Internal Server Error` instead of `409 Conflict` or `422 Unprocessable Entity`.

**Test data:** Any book with a known `genreId`, one copy in stock and `Available` status in staging.

### Expected Behaviour

- In step 3: the availability response should reflect the updated status — ISBN `978-1-4028-9462-6` should either be absent from the results or marked `"status": "Reserved"`.
- In step 5 (even if stale data is shown): if a second order for the last copy reaches the database, the system should return `409 Conflict` with a human-readable message — not `500 Internal Server Error`.

### Actual Behaviour

- The availability endpoint returns `"status": "Available"` for up to 60 seconds after an order is confirmed (cache TTL not invalidated on status change).
- A second order within that window reaches the database unique constraint, which throws an unhandled exception caught as a generic 500 error.

### Evidence

- **Sentry issue:** `SHOP-1847` — `Npgsql.PostgresException: duplicate key value violates unique constraint "IX_OrderLines_CopyId_Date"`
- **Screenshot / recording:** [attached in Sentry issue SHOP-1847]
- **Log excerpt:**

```
[2026-03-16 14:23:11] ERR  Npgsql.PostgresException (0x80004005): 23505: duplicate key value violates unique constraint "IX_OrderLines_CopyId_Date"
   at Shop.Orders.Infrastructure.Repositories.OrderRepository.CreateAsync(Order order)
   at Shop.Orders.Core.Components.Orders.Commands.CreateOrderCommandHandler.Handle(CreateOrderCommand request)
```

### Root Cause (if known)

Likely cause: `StockAvailabilityQuery` results are cached with a hard-coded 60-second TTL in `StockAvailabilityCacheDecorator`. The cache is not invalidated when an `OrderConfirmedEvent` is published. The 500 error is a secondary issue: the `CreateOrderCommandHandler` does not catch `PostgresException` with code `23505` and translate it to a domain-level conflict response.

### Acceptance Criteria (Fix Verification)

- [ ] **AC1 — Defect resolved:** After an order is confirmed for the last copy of ISBN `978-1-4028-9462-6`, a subsequent call to `GET /api/stock/availability` within 60 seconds no longer returns that book as `Available`.
- [ ] **AC2 — Expected behaviour confirmed:** Cache is invalidated (or bypassed) for the affected book/date combination when an `OrderConfirmedEvent` is processed.
- [ ] **AC3 — Conflict response:** If a race condition does result in a second order for the last copy reaching the database, the API returns `409 Conflict` with `ProblemDetails` body — not `500 Internal Server Error`.
- [ ] **AC4 — Regression:** All existing stock availability endpoint tests pass; no performance regression on the endpoint (response time P95 < 200ms with cache warm).
- [ ] **AC5 — Monitoring:** No new `23505` constraint violation errors appear in Sentry in the 24 hours after deployment to staging.

### Out of Scope

- Redesigning the caching strategy for the availability endpoint beyond the TTL invalidation fix
- Adding optimistic locking to the order creation flow (separate tech debt ticket)

### Definition of Done

- [ ] Root cause confirmed and documented
- [ ] Cache invalidation on `OrderConfirmedEvent` implemented
- [ ] `23505` exception handled as `409 Conflict`
- [ ] Fix verified by QA using the reproduction steps above
- [ ] Regression test added to `Shop.Orders.Tests` to prevent reoccurrence
- [ ] Deployed to staging and retested with zero new Sentry errors
