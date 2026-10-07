# Reference Example — Bug Report / Development Defect

This is a **complete, finished output sample**. Use it to calibrate reproduction step precision, evidence formatting, root cause depth, and fix-verification AC style.
Do NOT reproduce this in output unless the user is actually working on fleet availability caching bugs.

---

**Issue Type:** Bug
**Input provided by:** QA Engineer (Michaela V.) — discovered during regression testing of sprint 14 that the fleet availability endpoint returns stale data when the same vehicle is requested within 60 seconds of a status change.
**Priority:** High — affects all consumers of the availability endpoint; could lead to double-booking in production
**Severity:** Major — incorrect data returned but system does not crash; booking can still proceed on stale result
**Labels:** `bug`, `rentals`, `caching`, `staging`
**Affected Version:** v2.14.0-rc1

---

### Bug Summary

The `GET /api/fleet/availability` endpoint returns stale vehicle availability data for up to 60 seconds after a vehicle's status changes (e.g., from `Available` to `Reserved`). This creates a window during which a second booking attempt on the same vehicle succeeds at the API layer, producing a double-booking that is only caught (and rejected) at the database constraint level — resulting in a 500 error rather than a user-friendly 409 conflict response.

### Environment

| Property            | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| Environment         | Staging (confirmed); Production (suspected, not verified) |
| Browser / Client    | All (backend API issue)                                   |
| OS / Platform       | N/A                                                       |
| User role           | Any authenticated back-office user                        |
| Tenant / Account    | All tenants                                               |
| Date first observed | 2026-03-16                                                |
| Frequency           | Always — reproducible within the 60-second TTL window     |

### Steps to Reproduce

**Preconditions:** Two browser sessions authenticated as different back-office agents; vehicle with plate `1-XYZ-999` must have status `Available`.

1. In Session A: Call `GET /api/fleet/availability?date=2026-03-20&vehicleCategoryId=3` — confirm vehicle `1-XYZ-999` appears in the response with `"status": "Available"`.
2. In Session A: Submit a reservation for vehicle `1-XYZ-999` for date `2026-03-20`. Confirm the reservation succeeds and vehicle status changes to `Reserved`.
3. **Immediately** (within 60 seconds of step 2): In Session B: Call `GET /api/fleet/availability?date=2026-03-20&vehicleCategoryId=3`.
4. **Observe:** Vehicle `1-XYZ-999` still appears in the response with `"status": "Available"` despite being reserved in step 2.
5. In Session B: Attempt to reserve the same vehicle `1-XYZ-999` for the same date.
6. **Observe:** The API returns `500 Internal Server Error` instead of `409 Conflict` or `422 Unprocessable Entity`.

**Test data:** Any vehicle with a known `vehicleCategoryId` and `Available` status in staging.

### Expected Behaviour

- In step 3: the availability response should reflect the updated status — vehicle `1-XYZ-999` should either be absent from the results or marked `"status": "Reserved"`.
- In step 5 (even if stale data is shown): if a double-booking attempt reaches the database, the system should return `409 Conflict` with a human-readable message — not `500 Internal Server Error`.

### Actual Behaviour

- The availability endpoint returns `"status": "Available"` for up to 60 seconds after a reservation is confirmed (cache TTL not invalidated on status change).
- A second booking attempt within that window reaches the database unique constraint, which throws an unhandled exception caught as a generic 500 error.

### Evidence

- **Sentry issue:** `RENT-1847` — `Npgsql.PostgresException: duplicate key value violates unique constraint "IX_Reservations_VehicleId_Date"`
- **Screenshot / recording:** [attached in Sentry issue RENT-1847]
- **Log excerpt:**

```
[2026-03-16 14:23:11] ERR  Npgsql.PostgresException (0x80004005): 23505: duplicate key value violates unique constraint "IX_Reservations_VehicleId_Date"
   at Rent.Rentals.Infrastructure.Repositories.ReservationRepository.CreateAsync(Reservation reservation)
   at Rent.Rentals.Core.Components.Rentals.Commands.CreateReservationCommandHandler.Handle(CreateReservationCommand request)
```

### Root Cause (if known)

Likely cause: `FleetAvailabilityQuery` results are cached with a hard-coded 60-second TTL in `FleetAvailabilityCacheDecorator`. The cache is not invalidated when a `ReservationConfirmedEvent` is published. The 500 error is a secondary issue: the `CreateReservationCommandHandler` does not catch `PostgresException` with code `23505` and translate it to a domain-level conflict response.

### Acceptance Criteria (Fix Verification)

- [ ] **AC1 — Defect resolved:** After a reservation is confirmed for vehicle `1-XYZ-999`, a subsequent call to `GET /api/fleet/availability` within 60 seconds no longer returns that vehicle as `Available`.
- [ ] **AC2 — Expected behaviour confirmed:** Cache is invalidated (or bypassed) for the affected vehicle/date combination when a `ReservationConfirmedEvent` is processed.
- [ ] **AC3 — Conflict response:** If a race condition does result in a double-booking attempt reaching the database, the API returns `409 Conflict` with `ProblemDetails` body — not `500 Internal Server Error`.
- [ ] **AC4 — Regression:** All existing fleet availability endpoint tests pass; no performance regression on the endpoint (response time P95 < 200ms with cache warm).
- [ ] **AC5 — Monitoring:** No new `23505` constraint violation errors appear in Sentry in the 24 hours after deployment to staging.

### Out of Scope

- Redesigning the caching strategy for the availability endpoint beyond the TTL invalidation fix
- Adding optimistic locking to the reservation creation flow (separate tech debt ticket)

### Definition of Done

- [ ] Root cause confirmed and documented
- [ ] Cache invalidation on `ReservationConfirmedEvent` implemented
- [ ] `23505` exception handled as `409 Conflict`
- [ ] Fix verified by QA using the reproduction steps above
- [ ] Regression test added to `Rent.Rentals.Tests` to prevent reoccurrence
- [ ] Deployed to staging and retested with zero new Sentry errors
