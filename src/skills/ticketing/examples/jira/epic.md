# Reference Example: Large Body of Work (Epic)

This is a **complete, finished output sample**. Use it to calibrate tone, section depth, metric specificity, and how far a child-item breakdown should go.
Do NOT reproduce this in output unless the user is actually working on the legacy order confirmation handshake.

---

**Issue Type:** Epic
**Input provided by:** Programme Lead: asked for a single umbrella covering removal of the synchronous legacy confirmation call, after the Q1 2026 incident review found it responsible for 3 of the 5 highest-impact support outages.
**Priority:** Critical: the legacy endpoint is the last synchronous dependency in the confirmation path, and its vendor support contract ends 2026-12-31
**Target release / quarter:** Q4 2026 (hard deadline: vendor support ends 2026-12-31)
**Labels:** `epic`, `orders`, `legacy-retirement`

---

### Goal

When this epic closes, a support agent confirms a book order entirely within Shop, and the order is created without any synchronous call to the legacy fulfilment system (LFS). Today every confirmation blocks on that call: the agent waits 12 seconds on average and up to 40 seconds at p95, and when the legacy endpoint is unavailable the agent cannot confirm at all, so the order is written on paper and reconciled by hand the next morning.

### Business Context

Confirmation is the highest-frequency write operation in the support application, running roughly 400 times a day across all stores. Every one of those confirmations makes a blocking HTTP call into the LFS order service, which owns the authoritative order number. The agent screen spins until LFS answers.

This coupling produces three recurring costs. First, latency: the p95 confirmation takes 40 seconds, and agents routinely start a second confirmation in another tab believing the first has hung, which creates duplicate orders. Second, availability: the LFS maintenance window overlaps European business hours on the first Sunday of each month, and every confirmation attempted in that window fails outright. The Q1 2026 incident review attributed 3 of the 5 highest-impact outages to this dependency. Third, reconciliation: when confirmation fails, agents fall back to a paper process, and the operations team spends an estimated 6 to 8 hours per week reconciling those orders by hand.

The vendor support contract for the LFS order service ends on 2026-12-31 and will not be renewed. After that date the endpoint keeps running but unsupported, which makes this epic a deadline rather than a preference: the confirmation path must not depend on an unsupported service.

The agreed direction is to make Shop the authority for order numbers, publish confirmations to LFS asynchronously during a transition period, then remove the LFS path entirely. The asynchronous phase exists because three downstream consumers still read orders out of LFS and cannot be migrated inside this window.

### Scope

#### In Scope

- Order number generation moved into Shop, in a format compatible with existing consumers (`SHOP-YYYY-NNNNN`)
- The support confirmation flow end to end, with no synchronous LFS call
- Asynchronous publication of confirmed orders to LFS for the transition period, with retry and dead-letter handling
- Backfill of the Shop-side order number for orders confirmed before the cutover
- Removal of the synchronous LFS client, its configuration, and its transition flag once the transition closes
- Operational dashboard covering publication lag and dead-letter depth

#### Out of Scope

- Migrating the three downstream LFS consumers off LFS (owned by the Integrations team, tracked separately; this epic only guarantees LFS keeps receiving the data)
- Order modification and cancellation, which call LFS separately under different business rules (follow-up epic)
- The mobile store application, which performs no confirmations
- Any change to the order number format itself, which printed packing slips depend on

### Success Metrics

| Metric                              | Baseline today          | Target                    | How it is measured                                                        |
| ----------------------------------- | ----------------------- | ------------------------- | ------------------------------------------------------------------------- |
| Confirmation latency (p95)          | 40s                     | under 2s                  | APM transaction trace, production, 7-day window                           |
| Confirmations failing on LFS        | ~180 per month          | 0                         | Error monitoring, filtered by the LFS client exception type               |
| Manual reconciliation effort        | 6 to 8 hours per week   | under 30 minutes per week | Operations team weekly timesheet                                          |
| Duplicate orders from retries       | ~12 per month           | 0                         | Same customer, same ISBN, same order date, created under 2 minutes apart  |
| Synchronous LFS calls in confirm    | 1 per confirmation      | 0                         | Code search plus the APM external-call breakdown                          |

### Acceptance Criteria (epic level)

- [ ] **AC1, Shop owns the number:** Given the legacy client is disabled, when an agent confirms a book order, then the order is created with a valid `SHOP-YYYY-NNNNN` number and no outbound request to LFS occurs during the agent request.
- [ ] **AC2, LFS still receives every confirmation:** Given a full business day of confirmations, when both datasets are reconciled, then every order confirmed in Shop is present in LFS within 5 minutes and no row is missing.
- [ ] **AC3, Degrades instead of failing:** Given LFS is fully unavailable for one hour, when agents confirm during that hour, then every confirmation succeeds, and each one reaches LFS within 15 minutes of LFS returning.
- [ ] **AC4, Backfill complete:** Given orders confirmed before the cutover, when any consumer queries them, then every row carries a Shop-side number and no query returns null.
- [ ] **AC-Retire, Legacy path removed:** Given the transition has closed, when the codebase is searched for the synchronous LFS client type, then no production reference exists: the client, its configuration keys, and the transition flag are deleted rather than switched off.

### Child Items (suggested breakdown)

> Proposed decomposition, not a commitment. Item 1 is a spike because the legacy contract is undocumented, and the shape of items 2 to 6 depends on what it finds.

| # | Proposed item                                                                                                                     | Flag       | Why it is separate                                                                                                       |
| - | --------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 | [Orders] Document the LFS order contract and its number-format guarantees                                                         | `--spike`  | The endpoint has no specification, so the format constraint behind AC1 is an assumption until this confirms it            |
| 2 | [Orders] As a support agent, I want confirmation to complete without waiting on LFS so that I can confirm during an LFS outage     | `--story`  | The user-visible outcome; ships behind the transition flag and is demonstrable on its own                                 |
| 3 | [Orders] Publish confirmed orders to LFS asynchronously with retry and dead-letter handling                                        | `--story`  | A separate deployable surface with its own failure modes and dashboard                                                    |
| 4 | [Orders] Order numbers are issued by Shop rather than LFS                                                                          | `--change` | Changes an agreed business rule about which system is authoritative, so it needs PO ratification, not just implementation |
| 5 | [Orders] Backfill Shop-side order numbers for pre-cutover orders                                                                   | `--story`  | A one-off data migration that must land before AC4 can be verified                                                        |
| 6 | [Orders] Delete the synchronous LFS order client and its transition flag                                                           | `--debt`   | Satisfies AC-Retire; deliberately last, and deliberately its own item so it cannot be quietly skipped                     |

### Technical Notes

- Direction already agreed with the architect: Shop becomes the authority for order numbers and LFS becomes a read-only downstream consumer for the transition period. Child items implement this; they do not re-litigate it.
- The `SHOP-YYYY-NNNNN` format is a hard constraint, not a preference: printed packing slips and two partner integrations parse it. Item 1 must establish whether LFS imposes any further constraint on length, checksum, or uniqueness scope.
- Sequencing is not negotiable. Item 4 must be ratified before item 2 ships, and item 6 must not start until AC2 has held for one full month in production.
- The transition flag is a kill switch, not a rollout tool: it exists so a failed cutover reverts in one deploy, and item 6 removes it.
- Publication must be transactionally safe, since a confirmation committed in Shop must never fail to enqueue its LFS publication. Reuse the outbox already in place for order invoicing rather than introducing a second mechanism.
- `REQUIRES INPUT: confirm whether the three downstream LFS consumers tolerate a 5-minute lag, or whether any of them needs sub-minute propagation.` The 5-minute figure in AC2 is provisional until this is answered.

### Dependencies

| Dependency                                            | Type          | Status          | Notes                                                                         |
| ----------------------------------------------------- | ------------- | --------------- | ----------------------------------------------------------------------------- |
| Integrations team: downstream LFS consumer inventory  | Blocking      | Open            | Needed to answer the REQUIRES INPUT above; blocks the target lag in AC2        |
| Vendor support for the LFS order service              | Informational | Ends 2026-12-31 | The deadline driving this epic; not extendable                                 |
| Outbox infrastructure used by order invoicing         | Informational | Done            | Reused by item 3 rather than rebuilt                                           |
| Operations team: reconciliation baseline measurement  | Related       | In Progress     | Establishes the 6 to 8 hour figure the third success metric is judged against  |

### Definition of Done (epic level)

- [ ] Every child item is closed, or explicitly moved out of scope with a recorded reason
- [ ] All five epic-level acceptance criteria verified, AC-Retire last
- [ ] Every success metric measured against its baseline over a 7-day production window, with results recorded as a comment on this epic
- [ ] The synchronous LFS client is gone from the codebase, confirmed by code search rather than by flag state
- [ ] Publication lag and dead-letter dashboards handed to the operations team with an agreed alert threshold
- [ ] OpenAPI spec and the internal order-numbering documentation updated to name Shop as the authority
- [ ] Outcome demonstrated to the Programme Lead and the Integrations team, not only to the delivery team
- [ ] Follow-up epic raised for the modification and cancellation paths still calling LFS
