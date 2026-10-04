# Template — Technical Debt

Use this scaffold for every `--debt` issue. Follow the structure exactly. Omit no required section.

**Summary naming convention:** `[DEBT] [Module/Area]: [What needs to be improved and why it matters now]`
_Example: `[DEBT] [Common/Infrastructure] Replace synchronous HTTP client calls in payment module with async/await pattern`_

---

**Issue Type:** Task
**Input provided by:** [Principal Engineer / Architect / Tech Lead] — [one sentence characterising the technical concern they raised and how they identified it]
**Priority:** [Critical / High / Medium / Low] — [one-sentence justification linking to business risk]
**Labels:** `technical-debt`, [module label], [category e.g. `performance`, `security`, `maintainability`, `testability`]

---

### Business Context

> Why is this technical debt being surfaced now? What triggered the decision to prioritise it?
> Write 2–3 paragraphs for a non-technical stakeholder explaining the risk in business terms: what could happen if this debt continues to accumulate, how it slows the team down, or what incident/near-miss motivated addressing it now.

### Risk of NOT Doing This

> This section is mandatory for technical debt. It justifies prioritisation to stakeholders who see it as "invisible work".

[Describe the concrete business risks of leaving this debt unresolved:]

- **Incident risk:** [What failure mode does this debt create? How likely is it to cause a production incident?]
- **Velocity impact:** [How much is this debt currently slowing the team down? In what specific ways?]
- **Cost of delay:** [Does this debt compound over time — i.e., does it get more expensive to address the longer it is left?]
- **Security / compliance risk:** [If applicable]

### Current State

[Precise technical description of the current implementation and what is wrong with it. Reference specific file paths, class names, or patterns. A developer reading this should be able to confirm the current state by looking at the code without any additional guidance.]

**Key locations:**

- `[file path or module path]` — [what is here and what is wrong with it]
- `[file path or module path]` — [what is here and what is wrong with it]

### Desired State

[Precise description of the target state after the debt is resolved. Describe the pattern, architecture, or behaviour that should exist. This is not an implementation guide — it is the definition of what "clean" looks like.]

### Proposed Approach

[High-level description of how to get from current state to desired state. Written from the PO/architect perspective — enough detail for estimation and planning, not a step-by-step implementation guide. Reference any ADRs, architectural patterns, or prior decisions that apply.]

### Constraints & Risks

[What makes this work non-trivial? Performance regressions, data migration risks, third-party compatibility, required downtime, coordination with other teams, etc.]

### Acceptance Criteria

- [ ] **AC1 — Target pattern:** [Describe the specific pattern or behaviour that must be present after the work is done, verifiable by code review or automated test.]
- [ ] **AC2 — No regression:** Existing behaviour is preserved — all existing tests pass and no new errors are introduced in error monitoring.
- [ ] **AC3 — Coverage:** [Specific test coverage requirement for the refactored code, if applicable.]
- [ ] **AC4 — Architecture compliance:** The project's architecture/contract test suite passes with no new violations.
- [ ] [Add issue-specific criteria]

### Out of Scope

[Related areas of debt that are NOT being addressed in this ticket. Explicitly call out adjacent code that looks similar but is deferred.]

### Dependencies

| Dependency      | Type                 | Status   | Notes  |
| --------------- | -------------------- | -------- | ------ |
| [ticket / team] | [Blocking / Related] | [status] | [note] |

### Definition of Done

- [ ] All acceptance criteria verified by peer code review
- [ ] Architecture tests pass
- [ ] All existing tests pass
- [ ] Tech lead / architect sign-off on the solution approach
- [ ] [Issue-specific DoD items]
