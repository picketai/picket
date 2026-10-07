# Reference Example — Large Body of Work (Epic)

This is a **complete, finished output sample**. Use it to calibrate tone, section depth, metric specificity, and how far a child-item breakdown should go.
Do NOT reproduce this in output unless the user is actually working on the legacy reservation confirmation handshake.

---

**Issue Type:** Epic
**Input provided by:** Programme Lead — asked for a single umbrella covering removal of the synchronous legacy confirmation call, after the Q1 2026 incident review found it responsible for 3 of the 5 highest-impact back-office outages.
**Priority:** Critical — the legacy endpoint is the last synchronous dependency in the confirmation path, and its vendor support contract ends 2026-12-31
**Target release / quarter:** Q4 2026 (hard deadline: vendor support ends 2026-12-31)
**Labels:** `epic`, `rentals`, `legacy-retirement`

---

### Goal

When this epic closes, a back-office agent confirms a rental order entirely within Rent, and the reservation is created without any synchronous call to the legacy B2A system. Today every confirmation blocks on that call: the agent waits 12 seconds on average and up to 40 seconds at p95, and when the legacy endpoint is unavailable the agent cannot confirm at all, so the booking is written on paper and reconciled by hand the next morning.

### Business Context

Confirmation is the highest-frequency write operation in the back-office application, running roughly 400 times a day across the fleet. Every one of those confirmations makes a blocking HTTP call into the legacy B2A reservation service, which owns the authoritative reservation number. The agent screen spins until B2A answers.

This coupling produces three recurring costs. First, latency: the p95 confirmation takes 40 seconds, and agents routinely start a second confirmation in another tab believing the first has hung, which creates duplicate reservations. Second, availability: the B2A maintenance window overlaps European business hours on the first Sunday of each month, and every confirmation attempted in that window fails outright. The Q1 2026 incident review attributed 3 of the 5 highest-impact outages to this dependency. Third, reconciliation: when confirmation fails, agents fall back to a paper process, and the operations team spends an estimated 6 to 8 hours per week reconciling those bookings by hand.

The vendor support contract for the B2A reservation service ends on 2026-12-31 and will not be renewed. After that date the endpoint keeps running but unsupported, which makes this epic a deadline rather than a preference: the confirmation path must not depend on an unsupported service.

The agreed direction is to make Rent the authority for reservation numbers, publish confirmations to B2A asynchronously during a transition period, then remove the B2A path entirely. The asynchronous phase exists because three downstream consumers still read reservations out of B2A and cannot be migrated inside this window.

### Scope

#### In Scope

- Reservation number generation moved into Rent, in a format compatible with existing consumers (`RENT-YYYY-NNNNN`)
- The back-office confirmation flow end to end, with no synchronous B2A call
- Asynchronous publication of confirmed reservations to B2A for the transition period, with retry and dead-letter handling
- Backfill of the Rent-side reservation number for reservations confirmed before the cutover
- Removal of the synchronous B2A client, its configuration, and its transition flag once the transition closes
- Operational dashboard covering publication lag and dead-letter depth

#### Out of Scope

- Migrating the three downstream B2A consumers off B2A (owned by the Integrations team, tracked separately; this epic only guarantees B2A keeps receiving the data)
- Reservation modification and cancellation, which call B2A separately under different business rules (follow-up epic)
- The mobile agent application, which performs no confirmations
- Any change to the reservation number format itself, which printed rental agreements depend on

### Success Metrics

| Metric                              | Baseline today          | Target                    | How it is measured                                                        |
| ----------------------------------- | ----------------------- | ------------------------- | ------------------------------------------------------------------------- |
| Confirmation latency (p95)          | 40s                     | under 2s                  | APM transaction trace, production, 7-day window                           |
| Confirmations failing on B2A        | ~180 per month          | 0                         | Error monitoring, filtered by the B2A client exception type               |
| Manual reconciliation effort        | 6 to 8 hours per week   | under 30 minutes per week | Operations team weekly timesheet                                          |
| Duplicate reservations from retries | ~12 per month           | 0                         | Same client, same vehicle, same start date, created under 2 minutes apart |
| Synchronous B2A calls in confirm    | 1 per confirmation      | 0                         | Code search plus the APM external-call breakdown                          |

### Acceptance Criteria (epic level)

- [ ] **AC1 — Rent owns the number:** Given the legacy client is disabled, when an agent confirms a rental order, then the reservation is created with a valid `RENT-YYYY-NNNNN` number and no outbound request to B2A occurs during the agent request.
- [ ] **AC2 — B2A still receives every confirmation:** Given a full business day of confirmations, when both datasets are reconciled, then every reservation confirmed in Rent is present in B2A within 5 minutes and no row is missing.
- [ ] **AC3 — Degrades instead of failing:** Given B2A is fully unavailable for one hour, when agents confirm during that hour, then every confirmation succeeds, and each one reaches B2A within 15 minutes of B2A returning.
- [ ] **AC4 — Backfill complete:** Given reservations confirmed before the cutover, when any consumer queries them, then every row carries a Rent-side number and no query returns null.
- [ ] **AC-Retire — Legacy path removed:** Given the transition has closed, when the codebase is searched for the synchronous B2A client type, then no production reference exists: the client, its configuration keys, and the transition flag are deleted rather than switched off.

### Child Items (suggested breakdown)

> Proposed decomposition, not a commitment. Item 1 is a spike because the legacy contract is undocumented, and the shape of items 2 to 6 depends on what it finds.

| # | Proposed item                                                                                                                     | Flag       | Why it is separate                                                                                                       |
| - | --------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 | [Rentals] Document the B2A reservation contract and its number-format guarantees                                                  | `--spike`  | The endpoint has no specification, so the format constraint behind AC1 is an assumption until this confirms it            |
| 2 | [Rentals] As a back-office agent, I want confirmation to complete without waiting on B2A so that I can confirm during a B2A outage | `--story`  | The user-visible outcome; ships behind the transition flag and is demonstrable on its own                                 |
| 3 | [Rentals] Publish confirmed reservations to B2A asynchronously with retry and dead-letter handling                                 | `--story`  | A separate deployable surface with its own failure modes and dashboard                                                    |
| 4 | [Rentals] Reservation numbers are issued by Rent rather than B2A                                                                   | `--change` | Changes an agreed business rule about which system is authoritative, so it needs PO ratification, not just implementation |
| 5 | [Rentals] Backfill Rent-side reservation numbers for pre-cutover reservations                                                      | `--story`  | A one-off data migration that must land before AC4 can be verified                                                        |
| 6 | [Rentals] Delete the synchronous B2A reservation client and its transition flag                                                    | `--debt`   | Satisfies AC-Retire; deliberately last, and deliberately its own item so it cannot be quietly skipped                     |

### Technical Notes

- Direction already agreed with the architect: Rent becomes the authority for reservation numbers and B2A becomes a read-only downstream consumer for the transition period. Child items implement this; they do not re-litigate it.
- The `RENT-YYYY-NNNNN` format is a hard constraint, not a preference: printed rental agreements and two partner integrations parse it. Item 1 must establish whether B2A imposes any further constraint on length, checksum, or uniqueness scope.
- Sequencing is not negotiable. Item 4 must be ratified before item 2 ships, and item 6 must not start until AC2 has held for one full month in production.
- The transition flag is a kill switch, not a rollout tool: it exists so a failed cutover reverts in one deploy, and item 6 removes it.
- Publication must be transactionally safe, since a confirmation committed in Rent must never fail to enqueue its B2A publication. Reuse the outbox already in place for rental invoicing rather than introducing a second mechanism.
- `REQUIRES INPUT: confirm whether the three downstream B2A consumers tolerate a 5-minute lag, or whether any of them needs sub-minute propagation.` The 5-minute figure in AC2 is provisional until this is answered.

### Dependencies

| Dependency                                            | Type          | Status          | Notes                                                                         |
| ----------------------------------------------------- | ------------- | --------------- | ----------------------------------------------------------------------------- |
| Integrations team: downstream B2A consumer inventory  | Blocking      | Open            | Needed to answer the REQUIRES INPUT above; blocks the target lag in AC2        |
| Vendor support for the B2A reservation service        | Informational | Ends 2026-12-31 | The deadline driving this epic; not extendable                                 |
| Outbox infrastructure used by rental invoicing        | Informational | Done            | Reused by item 3 rather than rebuilt                                           |
| Operations team: reconciliation baseline measurement  | Related       | In Progress     | Establishes the 6 to 8 hour figure the third success metric is judged against  |

### Definition of Done (epic level)

- [ ] Every child item is closed, or explicitly moved out of scope with a recorded reason
- [ ] All five epic-level acceptance criteria verified, AC-Retire last
- [ ] Every success metric measured against its baseline over a 7-day production window, with results recorded as a comment on this epic
- [ ] The synchronous B2A client is gone from the codebase, confirmed by code search rather than by flag state
- [ ] Publication lag and dead-letter dashboards handed to the operations team with an agreed alert threshold
- [ ] OpenAPI spec and the internal reservation-numbering documentation updated to name Rent as the authority
- [ ] Outcome demonstrated to the Programme Lead and the Integrations team, not only to the delivery team
- [ ] Follow-up epic raised for the modification and cancellation paths still calling B2A
