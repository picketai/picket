# Reference Example — New Functionality (User Story)

This is a **complete, finished output sample**. Use it to calibrate tone, section depth, acceptance criteria specificity, and verbosity.
Do NOT reproduce this in output unless the user is actually working on reservation search functionality.

---

**Issue Type:** Story
**Input provided by:** Stakeholder (Operations Manager) — requested the ability for back-office agents to search reservations by driver name and vehicle plate without navigating to the full reservation list, because the current workflow requires 4–5 clicks to locate a specific active rental.
**Priority:** High — directly reduces average back-office task time for the most frequent daily operation
**Epic Link:** [Back-Office] Agents reach any active reservation in under 10 seconds
**Labels:** `new-feature`, `rentals`, `back-office`

---

### Business Context

Back-office agents process dozens of active rentals per day. The most common task is locating a specific reservation — either to answer a client phone call, to log a vehicle damage report, or to process a return. Currently, agents must navigate to the full reservations list, apply manual filters one at a time, and scroll through paginated results. For fleets with more than 200 active rentals, this takes an average of 45–90 seconds per lookup.

The absence of a quick-search capability is the single most cited friction point in the quarterly agent feedback survey (Q1 2026, n=24 respondents, 83% rated it a high-priority improvement). It also leads to errors: agents occasionally open and modify the wrong reservation when multiple vehicles of the same type are active for the same client company.

This story introduces a global quick-search bar in the back-office header that allows agents to find any active reservation in under 5 keystrokes. The search resolves against driver name (partial match), vehicle registration plate (exact or partial), and reservation number (exact).

### User Story

> As a **back-office agent**, I want to **search for active reservations by driver name, vehicle plate, or reservation number from a single search bar** so that **I can locate any reservation in under 10 seconds without navigating through filtered list views**.

When an agent receives an incoming call from a driver on the road, they need to pull up the active reservation immediately. With the new quick-search bar pinned in the application header, the agent types the driver's last name or the first three characters of the plate and sees a live-updating dropdown of matching active reservations — each showing the driver name, plate, vehicle type, and start date. Clicking any result opens the reservation detail page directly. The entire flow — from answering the phone to viewing the reservation — takes under 5 seconds.

### Scope

#### In Scope

- A search input in the back-office application header, always visible when the agent is authenticated
- Real-time search (debounced at 300ms) against active reservations only
- Search fields: driver full name (partial, case-insensitive), vehicle registration plate (partial, case-insensitive), reservation number (exact match)
- Dropdown results showing: driver name, plate number, vehicle category, reservation start date, current status
- Maximum 10 results displayed; if more match, show a "View all X results" link to the filtered list
- Keyboard navigation in the dropdown (arrow keys + Enter)
- Clicking a result navigates to the reservation detail page

#### Out of Scope

- Searching closed, cancelled, or archived reservations (deferred — separate story)
- Searching by client company name (deferred — Phase 2)
- Mobile/responsive layout for the search bar (desktop-only for now)
- Saved searches or search history

### Acceptance Criteria

- [ ] **AC1 — Search bar visibility:** Given an authenticated back-office agent on any page of the application, when the page loads, then the search bar is visible in the application header at all times (it does not disappear on specific pages).
- [ ] **AC2 — Driver name search:** Given an active reservation for driver "Laurent Dupont", when the agent types "laure" in the search bar, then the reservation appears in the dropdown within 500ms with the driver's full name, plate, vehicle type, and start date displayed.
- [ ] **AC3 — Plate search:** Given an active reservation for vehicle with plate "1-ABC-234", when the agent types "ABC" in the search bar, then the matching reservation appears in the dropdown.
- [ ] **AC4 — Reservation number search:** Given a reservation with number "RENT-2026-00451", when the agent types "RENT-2026-00451" (exact), then only that reservation appears in the dropdown.
- [ ] **AC5 — No results:** Given a search term that matches no active reservations, when the search resolves, then the dropdown shows "No reservations found" — no error state.
- [ ] **AC6 — Result limit:** Given a search term that matches more than 10 active reservations, when the dropdown renders, then exactly 10 results are shown with a "View all [N] results" link at the bottom that navigates to the reservation list pre-filtered by the search term.
- [ ] **AC7 — Keyboard navigation:** Given an open dropdown, when the agent presses the down arrow key, then focus moves to the first result; pressing Enter on a focused result navigates to that reservation's detail page.
- [ ] **AC8 — Scope (active only):** Given a reservation with status "Closed" or "Cancelled", when the agent searches by the driver's name, then that reservation does NOT appear in the dropdown.
- [ ] **AC9 — Tenancy:** Given agent A is authenticated under company Acme Fleet, when they search, then they only see reservations belonging to Acme Fleet — never another company's data.

### UX / Design Notes

- Use the existing `SearchInput` component from the design system; extend it with the dropdown behaviour
- Results dropdown should follow the `PopoverList` pattern already used in the vehicle selector
- Each result row: `[DriverName] · [Plate] · [VehicleCategory] · [StartDate]` — single line, truncate overflow with ellipsis
- Loading state: show a spinner inside the input field while the API call is in-flight

### Technical Notes

- New endpoint: `GET /api/reservations/quick-search?q={term}&limit=10` — returns active reservations only, scoped to authenticated company
- The endpoint must apply `UserId` / `UserInfo` company scoping from JWT claims (see `ApplicationController`)
- Use existing `IReservationRepository` — add a `QuickSearchAsync(string term, int companyId, int limit)` method
- Term matching: PostgreSQL `ILIKE` with `%term%` for name and plate; exact match for reservation number
- No full-text indexing needed at this scale — profile with 500+ active reservations before deciding on optimisation
- Debounce the frontend call at 300ms; cancel in-flight requests when a new keystroke arrives

### Dependencies

| Dependency                                            | Type          | Status | Notes             |
| ----------------------------------------------------- | ------------- | ------ | ----------------- |
| Design system `PopoverList` component                 | Informational | Done   | Already available |
| `GET /api/reservations` existing query infrastructure | Informational | Done   | Reuse repository  |

### Testing Requirements

- **Unit tests:** `QuickSearchAsync` repository method — test partial match, case-insensitivity, scope isolation, result limit
- **Integration tests:** `GET /api/reservations/quick-search` — authenticated request returns correct tenant-scoped results
- **E2E / Manual:** QA to verify dropdown rendering, keyboard navigation, and the "View all" link in a browser session
- **Edge cases to explicitly test:** empty string input (should return no results, not all records), SQL injection attempt in the `q` parameter, term with special characters (apostrophes in driver names)

### Definition of Done

- [ ] All acceptance criteria verified by QA
- [ ] Unit and integration tests pass in CI
- [ ] No new architecture violations (`dotnet test Rent.Architecture.Tests`)
- [ ] API contract updated in OpenAPI spec
- [ ] Code reviewed and approved by at least one senior developer
- [ ] No new Sentry errors introduced
- [ ] Feature demonstrated in sprint review
