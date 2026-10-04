# Template — Analysis Report (SPIKE)

Use this scaffold for every `--spike` issue. Follow the structure exactly. Omit no required section.

**Summary naming convention:** `[SPIKE] [Module/Area]: Investigate [topic] to determine [specific decision or deliverable]`
_Example: `[SPIKE] [Payments] Investigate Stripe vs Adyen integration options to determine recommended payment gateway for v2`_

---

**Issue Type:** Task
**Input provided by:** [Architect / Principal Engineer / Product Manager] — [one sentence describing what question or decision triggered this investigation]
**Priority:** [Critical / High / Medium / Low] — [one-sentence justification for why this investigation is urgent]
**Timebox:** [e.g. 3 days / 1 sprint / by [date]]
**Labels:** `spike`, `analysis`, [module label]

---

### Business Context

> What decision, risk, or uncertainty triggered this SPIKE?
> Write 2–3 paragraphs explaining: what the team is trying to decide or understand, why that decision cannot be made without investigation, and what the consequence of making a wrong decision would be.

### Problem Statement

[One precise paragraph stating the open question or uncertainty that this SPIKE must resolve. This is the "north star" for the investigation — everything done during the SPIKE should contribute to answering this question.]

### Research Questions

[This section is the heart of the SPIKE. List every specific question that must be answered by the investigation. A SPIKE with vague research questions produces a vague report. Be precise.]

1. **[Question 1]:** [Detailed question that can be answered with a clear finding]
2. **[Question 2]:** [Detailed question that can be answered with a clear finding]
3. **[Question 3]:** [Continue for all questions. Typical SPIKEs have 3–8 research questions. More is fine — vague is not.]

### Investigation Scope

#### In Scope

[What approaches, technologies, patterns, or scenarios must be investigated to answer the research questions above.]

#### Out of Scope

[Adjacent topics that might seem relevant but are explicitly NOT being investigated in this SPIKE, and why.]

### Expected Deliverables

[Precisely what must be produced by the end of the SPIKE. These are the outputs, not the findings.]

- [ ] [Deliverable 1: e.g. Written recommendation with rationale for each research question]
- [ ] [Deliverable 2: e.g. Proof-of-concept implementation in `spikes/[feature-name]` branch]
- [ ] [Deliverable 3: e.g. Risk register identifying top 3 risks and mitigation options]
- [ ] [Deliverable 4: e.g. Briefing presented to the architecture group]

### Acceptance Criteria

- [ ] **AC1 — All research questions answered:** The output report explicitly answers every research question listed above with a clear finding (not "it depends" without elaboration).
- [ ] **AC2 — Recommendation present:** A clear recommendation is made (or, if no clear winner exists, the trade-offs are documented with a recommended next step).
- [ ] **AC3 — Deliverables complete:** All expected deliverables listed above are present and reviewed.
- [ ] **AC4 — Timebox respected:** The investigation is completed within the agreed timebox.
- [ ] **AC5 — Follow-up tickets created:** Any implementation work identified by the SPIKE has been created as separate Jira tickets linked to this one.

### Constraints

[What limits the investigation: available environments, budget for tooling, team expertise, time constraints, existing architectural decisions that cannot be overridden.]

### Assumptions

[What the investigator is allowed to assume is true for the purpose of this SPIKE. State assumptions explicitly so findings can be requalified if assumptions turn out to be wrong.]

### Dependencies

| Dependency                 | Type                       | Status   | Notes  |
| -------------------------- | -------------------------- | -------- | ------ |
| [access / team / document] | [Blocking / Informational] | [status] | [note] |

### Definition of Done

- [ ] All research questions answered with evidence-backed findings
- [ ] Clear recommendation or decision documented
- [ ] All deliverables produced and peer-reviewed
- [ ] Results presented to relevant stakeholders (architect, tech lead, PO)
- [ ] Follow-up tickets created for any identified implementation work
- [ ] SPIKE branch / PoC cleaned up or archived
