# Template — Bug Report / Development Defect

Use this scaffold for every `--bug` issue. Follow the structure exactly. Omit no required section.

**Summary naming convention:** `[BUG] [Module/Area]: [Concise description of the failure — what breaks and in what context]`
_Example: `[BUG] [Rentals] Confirm reservation endpoint returns 500 when vehicle type is RTF and voucher is absent`_

---

**Issue Type:** Bug
**Input provided by:** [QA Engineer / End User / Developer / Monitoring Alert] — [one sentence describing how the defect was discovered and who reported it]
**Priority:** [Critical / High / Medium / Low] — [one-sentence justification based on user impact and frequency]
**Severity:** [Blocker / Major / Minor / Trivial] — [one-sentence justification]
**Labels:** `bug`, [module label], [environment label e.g. `production`, `staging`]
**Affected Version:** [Release version or branch where the bug was found]

---

### Bug Summary

[2–3 sentences describing the defect: what the system does wrong, what the user experiences, and what the business/technical impact is. Write this as an executive summary — it must be understandable without reading the rest of the ticket.]

### Environment

| Property            | Value                                                        |
| ------------------- | ------------------------------------------------------------ |
| Environment         | [Production / Staging / Development / All]                   |
| Browser / Client    | [If applicable]                                              |
| OS / Platform       | [If applicable]                                              |
| User role           | [The role/permissions of the affected user]                  |
| Tenant / Account    | [If multi-tenant: which account or `All accounts`]           |
| Date first observed | [Date or date range]                                         |
| Frequency           | [Always / Intermittent / Rare — with observed rate if known] |

### Steps to Reproduce

[Number each step precisely. Include exact input values, navigation paths, API payloads, or data states needed to reproduce. A QA engineer who was not present when the bug was found must be able to reproduce it by following these steps exactly.]

1. [Step 1: starting state / setup]
2. [Step 2: navigate to / call / configure]
3. [Step 3: enter specific value / trigger action]
4. [Observe: what happens]

**Test data / preconditions:**
[Any specific data that must exist in the system for the bug to be reproducible.]

### Expected Behaviour

[What the system should do according to the specification, design, or reasonable user expectation. Reference the relevant acceptance criteria, API contract, or design document if one exists.]

### Actual Behaviour

[What the system actually does. Be precise: error message text, HTTP status code, wrong field value, missing UI element, incorrect data. Paste the exact error or stack trace if available.]

### Evidence

[Attach or link: screenshots, screen recordings, error-monitoring issue links, log excerpts, API response payloads, HAR files. If none available, write `> ⚠️ REQUIRES INPUT: evidence needed to confirm reproducibility`.]

- **Error-monitoring issue:** [link or `N/A`]
- **Screenshot / recording:** [link or `N/A`]
- **Log excerpt:**

```
[paste relevant log lines here, or write N/A]
```

### Root Cause (if known)

[If the cause has already been identified, describe it here: which code path, which condition, which data state triggers the bug. If unknown, write `Unknown — investigation required as first step of implementation.`]

### Acceptance Criteria (Fix Verification)

- [ ] **AC1 — Defect resolved:** The steps to reproduce no longer produce the erroneous behaviour.
- [ ] **AC2 — Expected behaviour confirmed:** The system behaves as described in "Expected Behaviour" under all described conditions.
- [ ] **AC3 — Regression:** Existing tests pass; no new failures introduced in the affected module.
- [ ] **AC4 — Edge cases:** [Describe any related edge cases that must also be verified to confirm the fix is complete and not a partial patch.]
- [ ] **AC5 — Monitoring:** No new errors of the same type appear in error monitoring in the 24 hours following deployment.

### Out of Scope

[Related issues that are NOT being fixed in this ticket. Important for preventing creep when the root cause turns out to affect multiple behaviours.]

### Definition of Done

- [ ] Root cause identified and documented in the ticket
- [ ] Fix implemented and peer-reviewed
- [ ] All fix verification ACs confirmed by QA
- [ ] Regression tests added to prevent reoccurrence
- [ ] Deployed to staging and retested
- [ ] No error-monitoring regressions after staging deployment
- [ ] [Issue-specific DoD items]
