# Reference Example — New Functionality (User Story)

This is a **complete, finished output sample**. Use it to calibrate tone, section depth, acceptance criteria specificity, and verbosity.
Do NOT reproduce this in output unless the user is actually working on order search functionality.

---

**Issue Type:** Story
**Input provided by:** Stakeholder (Operations Manager) — requested the ability for support agents to search orders by customer name and ISBN without navigating to the full order list, because the current workflow requires 4–5 clicks to locate a specific open order.
**Priority:** High — directly reduces average support task time for the most frequent daily operation
**Epic Link:** [Support] Agents reach any open order in under 10 seconds
**Labels:** `new-feature`, `orders`, `support`

---

### Business Context

Support agents process dozens of open orders per day. The most common task is locating a specific order — either to answer a customer phone call, to log a damaged-book report, or to process a return. Currently, agents must navigate to the full orders list, apply manual filters one at a time, and scroll through paginated results. For stores with more than 200 open orders, this takes an average of 45–90 seconds per lookup.

The absence of a quick-search capability is the single most cited friction point in the quarterly agent feedback survey (Q1 2026, n=24 respondents, 83% rated it a high-priority improvement). It also leads to errors: agents occasionally open and modify the wrong order when several orders for the same title are open for the same partner store.

This story introduces a global quick-search bar in the support application header that allows agents to find any open order in under 5 keystrokes. The search resolves against customer name (partial match), ISBN (exact or partial), and order number (exact).

### User Story

> As a **support agent**, I want to **search for open orders by customer name, ISBN, or order number from a single search bar** so that **I can locate any order in under 10 seconds without navigating through filtered list views**.

When an agent receives an incoming call from a customer, they need to pull up the open order immediately. With the new quick-search bar pinned in the application header, the agent types the customer's last name or the first digits of the ISBN and sees a live-updating dropdown of matching open orders — each showing the customer name, ISBN, delivery type, and order date. Clicking any result opens the order detail page directly. The entire flow — from answering the phone to viewing the order — takes under 5 seconds.

### Scope

#### In Scope

- A search input in the support application header, always visible when the agent is authenticated
- Real-time search (debounced at 300ms) against open orders only
- Search fields: customer full name (partial, case-insensitive), ISBN (partial, hyphens ignored), order number (exact match)
- Dropdown results showing: customer name, ISBN, delivery type, order date, current status
- Maximum 10 results displayed; if more match, show a "View all X results" link to the filtered list
- Keyboard navigation in the dropdown (arrow keys + Enter)
- Clicking a result navigates to the order detail page

#### Out of Scope

- Searching closed, cancelled, or archived orders (deferred — separate story)
- Searching by partner store name (deferred — Phase 2)
- Mobile/responsive layout for the search bar (desktop-only for now)
- Saved searches or search history

### Acceptance Criteria

- [ ] **AC1 — Search bar visibility:** Given an authenticated support agent on any page of the application, when the page loads, then the search bar is visible in the application header at all times (it does not disappear on specific pages).
- [ ] **AC2 — Customer name search:** Given an open order for customer "Laurent Dupont", when the agent types "laure" in the search bar, then the order appears in the dropdown within 500ms with the customer's full name, ISBN, delivery type, and order date displayed.
- [ ] **AC3 — ISBN search:** Given an open order for the book with ISBN "978-0-14-118776-1", when the agent types "118776" in the search bar, then the matching order appears in the dropdown.
- [ ] **AC4 — Order number search:** Given an order with number "SHOP-2026-00451", when the agent types "SHOP-2026-00451" (exact), then only that order appears in the dropdown.
- [ ] **AC5 — No results:** Given a search term that matches no open orders, when the search resolves, then the dropdown shows "No orders found" — no error state.
- [ ] **AC6 — Result limit:** Given a search term that matches more than 10 open orders, when the dropdown renders, then exactly 10 results are shown with a "View all [N] results" link at the bottom that navigates to the order list pre-filtered by the search term.
- [ ] **AC7 — Keyboard navigation:** Given an open dropdown, when the agent presses the down arrow key, then focus moves to the first result; pressing Enter on a focused result navigates to that order's detail page.
- [ ] **AC8 — Scope (open only):** Given an order with status "Closed" or "Cancelled", when the agent searches by the customer's name, then that order does NOT appear in the dropdown.
- [ ] **AC9 — Tenancy:** Given agent A is authenticated under partner store Acme Books, when they search, then they only see orders belonging to Acme Books — never another store's data.

### UX / Design Notes

- Use the existing `SearchInput` component from the design system; extend it with the dropdown behaviour
- Results dropdown should follow the `PopoverList` pattern already used in the book selector
- Each result row: `[CustomerName] · [ISBN] · [DeliveryType] · [OrderDate]` — single line, truncate overflow with ellipsis
- Loading state: show a spinner inside the input field while the API call is in-flight

### Technical Notes

- New endpoint: `GET /api/orders/quick-search?q={term}&limit=10` — returns open orders only, scoped to authenticated store
- The endpoint must apply `UserId` / `UserInfo` store scoping from JWT claims (see `ApplicationController`)
- Use existing `IOrderRepository` — add a `QuickSearchAsync(string term, int storeId, int limit)` method
- Term matching: PostgreSQL `ILIKE` with `%term%` for name and ISBN; exact match for order number
- No full-text indexing needed at this scale — profile with 500+ open orders before deciding on optimisation
- Debounce the frontend call at 300ms; cancel in-flight requests when a new keystroke arrives

### Dependencies

| Dependency                                            | Type          | Status | Notes             |
| ----------------------------------------------------- | ------------- | ------ | ----------------- |
| Design system `PopoverList` component                 | Informational | Done   | Already available |
| `GET /api/orders` existing query infrastructure       | Informational | Done   | Reuse repository  |

### Testing Requirements

- **Unit tests:** `QuickSearchAsync` repository method — test partial match, case-insensitivity, scope isolation, result limit
- **Integration tests:** `GET /api/orders/quick-search` — authenticated request returns correct tenant-scoped results
- **E2E / Manual:** QA to verify dropdown rendering, keyboard navigation, and the "View all" link in a browser session
- **Edge cases to explicitly test:** empty string input (should return no results, not all records), SQL injection attempt in the `q` parameter, term with special characters (apostrophes in customer names)

### Definition of Done

- [ ] All acceptance criteria verified by QA
- [ ] Unit and integration tests pass in CI
- [ ] No new architecture violations (`dotnet test Shop.Architecture.Tests`)
- [ ] API contract updated in OpenAPI spec
- [ ] Code reviewed and approved by at least one senior developer
- [ ] No new Sentry errors introduced
- [ ] Feature demonstrated in sprint review
