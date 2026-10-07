# Template — New Functionality (User Story)

Use this scaffold for every `--story` issue. Follow the structure exactly. Omit no required section.

**Summary naming convention:** `[Module/Area] As a [role], I want to [action] so that [benefit]`
_Example: `[Rentals] As a back-office agent, I want to confirm a rental order so that the reservation is created in the legacy system`_

---

**Issue Type:** Story
**Input provided by:** [Stakeholder / Product Manager / Business Analyst] — [one sentence describing what they requested and why]
**Priority:** [Critical / High / Medium / Low] — [one-sentence justification]
**Epic Link:** [Epic name or key, or `REQUIRES INPUT: confirm which epic this belongs to`]
**Labels:** `new-feature`, [module label e.g. `rentals`, `logistics`, `payments`]

---

### Business Context

> Why does this feature need to exist? What business problem or user need is being addressed?
> Write 2–4 paragraphs that a new team member could read to understand the motivation completely.
> Include: who is affected, what currently happens without this feature, and what value it delivers when implemented.

### User Story

> As a **[role]**, I want to **[goal/action]** so that **[business benefit/outcome]**.

[Expand the one-liner into a narrative paragraph. Describe the end-to-end experience from the user's perspective: what they do, what happens, what they see. Write this as if explaining it to a stakeholder during a sprint review.]

### Scope

#### In Scope

[Bulleted list of exactly what this story covers. Be specific — name the screens, endpoints, modules, data changes, or user interactions that ARE included.]

#### Out of Scope

[Bulleted list of adjacent functionality that is explicitly NOT part of this story. This prevents scope creep and sets clear expectations. If the boundary is subtle, add a sentence of explanation.]

### Acceptance Criteria

[Write each criterion as a checkbox. Use Given/When/Then where behaviour is conditional. Be precise about field names, status codes, UI labels, and data values.]

- [ ] **AC1 — [short label]:** Given [context/precondition], when [action], then [observable, testable outcome].
- [ ] **AC2 — [short label]:** Given [context/precondition], when [action], then [observable, testable outcome].
- [ ] **AC3 — [short label]:** [Add as many as needed. There is no maximum. A story with 2 ACs is almost certainly under-specified.]
- [ ] **AC-Edge — [edge case label]:** [Cover the most important error conditions and boundary cases explicitly.]

### UX / Design Notes

[Wireframes, design system components to use, interaction patterns, copy requirements, accessibility requirements. If none exist yet, write `> ⚠️ REQUIRES INPUT: UX design needed before implementation can begin`.]

### Technical Notes

[Any architectural constraints, API contracts, data model changes, migration requirements, performance budgets, or technical decisions that constrain implementation. Written from the PO perspective based on architect/lead input — not implementation instructions.]

### Dependencies

| Dependency                     | Type                                 | Status                      | Notes        |
| ------------------------------ | ------------------------------------ | --------------------------- | ------------ |
| [Jira ticket / service / team] | [Blocking / Related / Informational] | [Open / In Progress / Done] | [Brief note] |

### Testing Requirements

- **Unit tests:** [What must be unit-tested]
- **Integration tests:** [What must be integration-tested]
- **E2E / Manual:** [What QA must verify manually or via E2E automation]
- **Edge cases to explicitly test:** [List the most important edge cases]

### Definition of Done

- [ ] All acceptance criteria verified by QA
- [ ] Unit and integration tests pass in CI
- [ ] No new architecture violations (run the project's architecture/contract test suite)
- [ ] API contract updated in OpenAPI spec (if endpoint was added or modified)
- [ ] Code reviewed and approved by at least one senior developer
- [ ] No new errors introduced in error monitoring
- [ ] Feature demonstrated in sprint review (if applicable)
- [ ] [Issue-specific DoD items]
