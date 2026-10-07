# Template — Change Request

Use this scaffold for every `--change` issue. Follow the structure exactly. Omit no required section.

**Summary naming convention:** `[CR] [Module/Area]: Change [what] from [current state] to [desired state]`
_Example: `[CR] [Rentals] Change reservation type selection from manual input to dropdown with predefined values`_

---

**Issue Type:** Story
**Input provided by:** [Business Analyst / Stakeholder / Domain Expert] — [one sentence describing the change they requested and the trigger for it]
**Priority:** [Critical / High / Medium / Low] — [one-sentence justification]
**Epic Link:** [Epic name or key]
**Labels:** `change-request`, [module label]

---

### Business Context

> What triggered this change request? What changed in the business, regulation, or user need that makes the current behaviour insufficient?
> Write 2–4 paragraphs covering: the history/context, who requested it, what the business impact of NOT changing is, and what the expected outcome looks like.

### Current Behaviour

[Precise description of what the system currently does. Be specific: name the screens, fields, workflows, API responses, or data values involved. A developer should be able to verify this description by looking at the running system today.]

### Desired Behaviour

[Precise description of what the system should do after this change. Match the same level of specificity as the Current Behaviour section. Describe the end-state, not the implementation path.]

### Gap Analysis

[Side-by-side comparison of the key differences between current and desired behaviour. Use a table where helpful:]

| Aspect              | Current                   | Desired                   |
| ------------------- | ------------------------- | ------------------------- |
| [Field / behaviour] | [Current value/behaviour] | [Desired value/behaviour] |

### Impact Analysis

**Systems / modules affected:**
[List every system, module, service, or integration that will be affected by this change.]

**Data migration:**
[Does existing data need to be migrated, transformed, or backfilled? If yes, describe the scope. If no, state "No data migration required."]

**Breaking changes:**
[Will any existing API contracts, integrations, or client behaviour be broken? If yes, describe versioning or migration strategy.]

**Rollback plan:**
[How can this change be rolled back if it causes issues in production? What is the risk window?]

### Acceptance Criteria

- [ ] **AC1 — [label]:** Given [context], when [action], then [outcome].
- [ ] **AC-Migration — Data integrity:** If migration is required, all existing records are transformed correctly with zero data loss, verified by [specific check].
- [ ] **AC-Rollback:** The change can be rolled back within [time window] without data loss.
- [ ] [Add issue-specific criteria]

### Out of Scope

[What adjacent things will NOT change as part of this CR. Be explicit about related areas that might seem like natural candidates but are intentionally deferred.]

### Dependencies

| Dependency                | Type                 | Status        | Notes  |
| ------------------------- | -------------------- | ------------- | ------ |
| [ticket / service / team] | [Blocking / Related] | [Open / Done] | [note] |

### Definition of Done

- [ ] All acceptance criteria verified by QA
- [ ] Current behaviour documented before change (for rollback reference)
- [ ] Migration script reviewed and approved (if applicable)
- [ ] API contract versioned or updated (if applicable)
- [ ] Tests pass in CI
- [ ] No regression in dependent systems
- [ ] Code reviewed and approved by at least one senior developer
- [ ] [Issue-specific DoD items]
