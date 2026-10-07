# Reference Example — Analysis Report (SPIKE)

This is a **complete, finished output sample**. Use it to calibrate research question precision, deliverable specificity, constraint and assumption framing, and the neutral-investigative tone.
Do NOT reproduce this in output unless the user is actually working on MassTransit/RabbitMQ durability analysis.

---

**Issue Type:** Task
**Input provided by:** Architect (Tech Radar session, March 2026) — raised concern that the current MassTransit + RabbitMQ message broker setup has no dead-letter queue strategy and no observability beyond Sentry errors; before implementing the next generation of event-driven features, the team needs a clear decision on message durability and replay capabilities.
**Priority:** High — three upcoming features (driver alerts, billing automation, route deviation) all depend on reliable event delivery; building them on an unvalidated foundation creates compounding risk
**Story Points:** 0 — SPIKE: time-boxed at 3 days. Output is an analysis report and ADR draft.
**Timebox:** 3 days (by 2026-03-21)
**Labels:** `spike`, `analysis`, `messaging`, `infrastructure`

---

### Business Context

The `Rent.WebApi` and `Rent.WebRealtime` services communicate via MassTransit on RabbitMQ. This works well for the current load (< 50 events/minute) but the architecture was designed and deployed in 2024 without a formal decision on message durability, dead-letter handling, or observability. The team has been aware of this gap but has deferred the decision because existing features are not critically dependent on guaranteed delivery.

This changes in Q2 2026. Three upcoming features on the roadmap — real-time driver alerts (safety-critical), billing event automation (financial accuracy), and route deviation notifications (operational) — all require reliable, ordered, and observable event delivery. Designing these features without a clear understanding of the broker's capabilities and limitations risks building on a brittle foundation that will require expensive rework when the first production message loss event occurs.

This SPIKE will produce a definitive, evidence-backed recommendation that the architecture group can use to make a binding decision before sprint planning for Q2 begins.

### Problem Statement

The team must decide: given the current MassTransit + RabbitMQ setup, what changes (if any) are required to support guaranteed message delivery, dead-letter handling, and observable consumer health for the Q2 feature roadmap? The options range from configuration changes within the existing setup to introducing a complementary technology (e.g., outbox pattern, Postgres-backed durability, or a different broker).

### Research Questions

1. **Dead-letter behaviour (current):** What happens today when a consumer throws an unhandled exception? Does the message go to a dead-letter queue? Is it retried? How many times? Is there any alerting? Verify by intentionally triggering a consumer failure in the staging environment.

2. **Message durability:** Are RabbitMQ queues currently configured as durable? Are messages published as persistent? What is the risk of message loss in the event of a RabbitMQ restart or node failure?

3. **Outbox pattern feasibility:** Can MassTransit's built-in outbox pattern (Entity Framework-backed) be adopted without breaking the existing consumer/producer contracts? What is the migration path and what is the estimated effort?

4. **Observability options:** What tooling is available (natively in MassTransit or via RabbitMQ management plugin) to monitor queue depths, consumer lag, dead-letter rates, and processing times? Can it be integrated with the existing Sentry/Grafana stack?

5. **Ordering guarantees:** Do any of the Q2 features require ordered message delivery? If so, does the current setup support it, and at what cost (throughput trade-off)?

6. **Volume projections:** At projected Q2 event volume (~500 events/minute at peak from driver alert + billing triggers combined), does the current single-node RabbitMQ deployment have sufficient capacity, or does a cluster/scaling decision need to be made in parallel?

### Investigation Scope

#### In Scope

- Audit of current MassTransit configuration in `Rent.Infrastructure/Messaging/`
- Hands-on testing in the staging RabbitMQ instance (dead-letter, retry, persistence)
- Review of MassTransit documentation for outbox pattern (v8.x)
- Review of RabbitMQ management plugin and available metrics
- Comparison of two durability strategies: (a) MassTransit outbox + EF Core, (b) current setup with hardened retry/DLQ config

#### Out of Scope

- Evaluating alternative message brokers (Kafka, Azure Service Bus) — not in scope; RabbitMQ is the constraint
- Implementing any changes — this SPIKE produces a recommendation only; implementation is a separate sprint item
- Consumer performance optimisation

### Expected Deliverables

- [ ] Written analysis report answering all 6 research questions, with evidence from staging tests
- [ ] Side-by-side comparison table: current setup vs. outbox pattern vs. hardened retry config — comparing effort, risk, and capability gaps
- [ ] Clear recommendation: which approach the team should adopt for Q2, with rationale
- [ ] Draft ADR (Architecture Decision Record) for the recommended approach, ready for architecture group review
- [ ] Follow-up Jira tickets created for any identified implementation work

### Acceptance Criteria

- [ ] **AC1 — All research questions answered:** The output report provides a clear, evidence-backed finding for each of the 6 research questions — no "it depends" answers without full elaboration.
- [ ] **AC2 — Recommendation present:** A single recommended approach is stated with explicit reasoning; if a hybrid approach is recommended, each component is justified separately.
- [ ] **AC3 — Deliverables complete:** All 5 expected deliverables are present and have been reviewed by at least one other engineer before the report is shared with the architecture group.
- [ ] **AC4 — Timebox respected:** Investigation completed by 2026-03-21.
- [ ] **AC5 — Follow-up tickets created:** Any implementation work identified by this SPIKE is captured as separate Jira tickets (minimum: one ticket per recommended change) and linked to this SPIKE.

### Constraints

- Investigation must use the existing staging RabbitMQ instance — no new infrastructure may be provisioned for this SPIKE
- The recommendation must be compatible with MassTransit v8.x (currently used) — no major version upgrade in scope
- Any recommended approach must have a clear migration path that does not require a maintenance window

### Assumptions

- The existing `Rent.Messaging` submodule message contracts will not change as a result of this SPIKE
- RabbitMQ management plugin is already enabled on the staging instance (verify on day 1; escalate to DevOps if not)
- The Q2 feature roadmap is stable enough that the research questions above reflect the actual delivery requirements

### Dependencies

| Dependency                                   | Type          | Status      | Notes                                          |
| -------------------------------------------- | ------------- | ----------- | ---------------------------------------------- |
| RabbitMQ staging instance admin access       | Blocking      | Open        | Request from DevOps before SPIKE starts        |
| MassTransit v8 outbox documentation          | Informational | Available   | See MassTransit docs — persistence/saga        |
| Q2 feature specs (driver alerts, billing)    | Informational | In Progress | Needed to validate volume projections in RQ6   |

### Definition of Done

- [ ] All 6 research questions answered with evidence
- [ ] Recommendation documented with clear rationale
- [ ] ADR draft written and shared for review
- [ ] Follow-up implementation tickets created and linked
- [ ] Results presented to the architecture group
- [ ] SPIKE branch / notes archived or linked from this ticket
