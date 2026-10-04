# Template — Large Body of Work (Epic)

Use this scaffold for every `--epic` issue. An epic groups stories, tasks and spikes under one business outcome; it is never implemented directly. Follow the structure exactly. Omit no required section.

**Summary naming convention:** `[Module/Area] <outcome-shaped theme>`
_Example: `[Rentals] Replace the legacy reservation handshake`_

---

**Issue Type:** Epic
**Input provided by:** [Stakeholder / Product Manager / Programme Lead] — [one sentence describing what they requested and why]
**Priority:** [Critical / High / Medium / Low] — [one-sentence justification]
**Target release / quarter:** [Release name, quarter, or `REQUIRES INPUT: confirm the target window`]
**Labels:** `epic`, [module label e.g. `rentals`, `logistics`, `payments`]

---

### Goal

> One paragraph, outcome-shaped rather than activity-shaped. State the business capability that exists when this epic closes, and what is impossible or painful today without it.
> Weak: "Refactor the reservation module." Strong: "Back-office agents can confirm a rental without the legacy handshake, cutting confirmation from 40 seconds to under 5."

### Business Context

> Why now? Write 2 to 4 paragraphs a new team member could read to understand the motivation completely.
> Include: who is affected, what currently happens, what forced the timing (a contract, a deprecation, a volume threshold), and what value closing this epic delivers.

### Scope

#### In Scope

[Bulleted list of the areas this epic covers: modules, flows, integrations, data migrations. Name them specifically enough that a reader can tell whether a given story belongs here.]

#### Out of Scope

[Bulleted list of adjacent work explicitly excluded, each with a one-line reason. On an epic this section carries more weight than on a story: it is the boundary every child item is checked against, and it is what stops the epic absorbing unrelated work for two quarters.]

### Success Metrics

> How will anyone know this epic succeeded? Each metric needs a current baseline and a target, both measurable without a judgement call. An epic whose success cannot be measured is a label, not an epic.

| Metric                        | Baseline today          | Target                  | How it is measured             |
| ----------------------------- | ----------------------- | ----------------------- | ------------------------------ |
| [e.g. Confirmation latency]   | [e.g. 40s p95]          | [e.g. under 5s p95]     | [e.g. APM dashboard, prod]     |
| [e.g. Manual reconciliations] | [e.g. ~120 per week]    | [e.g. fewer than 10]    | [e.g. ops weekly report]       |

### Acceptance Criteria (epic level)

[Milestone-shaped, not implementation-shaped. Each criterion is an observable capability, verifiable without reading code. Aim for 3 to 6; an epic with one criterion is a story.]

- [ ] **AC1 — [short label]:** [Observable capability that exists when this milestone is reached.]
- [ ] **AC2 — [short label]:** [Another milestone.]
- [ ] **AC-Retire — [short label]:** [Where the epic replaces something, state explicitly that the old path is removed or disabled. Epics that add without retiring leave both paths live forever.]

### Child Items (suggested breakdown)

> Proposed decomposition, not a commitment. Each row becomes its own item via the flag named, drafted from its own template. Order the rows so that each is shippable on its own where possible.
> Mark anything whose shape is still unknown as a spike rather than guessing a story.

| # | Proposed item                        | Flag       | Why it is separate                       |
| - | ------------------------------------ | ---------- | ---------------------------------------- |
| 1 | [Title, summary-convention shaped]   | `--spike`  | [e.g. contract of the legacy endpoint is undocumented] |
| 2 | [Title]                              | `--story`  | [e.g. user-facing, ships independently]  |
| 3 | [Title]                              | `--change` | [e.g. alters an agreed business rule]    |
| 4 | [Title]                              | `--debt`   | [e.g. removes the path AC-Retire names]  |

### Technical Notes

[Cross-cutting constraints that bind the whole epic: architectural decisions already taken, contract surfaces that must not move, migration ordering, performance budgets, feature-flag strategy. Written from the PO perspective based on architect input, not implementation instructions. Where a decision is still open, write `REQUIRES INPUT: <the open decision>` rather than assuming one.]

### Dependencies

| Dependency                     | Type                                 | Status                      | Notes        |
| ------------------------------ | ------------------------------------ | --------------------------- | ------------ |
| [Jira epic / service / team]   | [Blocking / Related / Informational] | [Open / In Progress / Done] | [Brief note] |

### Definition of Done (epic level)

- [ ] Every child item is closed, or explicitly moved out of scope with a recorded reason
- [ ] All epic-level acceptance criteria verified
- [ ] Every success metric measured against its baseline, with the result recorded on this epic
- [ ] The retired path (if any) is removed from the codebase, not merely disabled
- [ ] Documentation and API contracts updated for the capability as shipped
- [ ] Outcome demonstrated to stakeholders, not only to the team
- [ ] [Epic-specific DoD items]
