# Reference Example: Change Request

This is a **complete, finished output sample**. Use it to calibrate tone, section depth, Gap Analysis table style, and Impact Analysis verbosity.
Do NOT reproduce this in output unless the user is actually working on email notification changes.

---

**Issue Type:** Story
**Input provided by:** Domain Expert (Head of Store Operations): requested that the order confirmation email sent to customers be updated to include the pickup store address and the customer support phone number, which are currently absent and cause customers to call support for information already known to the system.
**Priority:** Medium: reduces support call volume but does not block any business process
**Epic Link:** Customer Communication Improvements
**Labels:** `change-request`, `orders`, `notifications`

---

### Business Context

The current order confirmation email sent to customers upon order confirmation contains: order number, book titles, pickup date, collection deadline, and the store name. It does not include the physical pickup address (where the customer must collect the books) or a support phone number to call if they encounter a problem.

This information exists in the system: the pickup store is stored on the order as `PickupStoreId` (resolved to a full address) and the support contact is a store-level configuration field. The omission is not a technical gap; it is a historical oversight from the initial email template design.

The impact is measurable: the support team logs an average of 35 inbound calls per weekday from customers asking "where do I pick up my books?" and "who do I call if there's a problem?", approximately 60% of total customer-initiated support volume. Adding these two fields to the confirmation email is expected to reduce this call volume by an estimated 40 to 50%.

### Current Behaviour

The order confirmation email (triggered when an order with delivery type `PICKUP` transitions to `Confirmed` status) contains:

- Order reference number
- Customer full name (salutation)
- Book titles (e.g. "Dune", "Middlemarch")
- Pickup date and collection deadline
- Store name and logo

The email does **not** contain:

- Pickup store name or address
- Support contact phone number

### Desired Behaviour

The order confirmation email contains all current fields plus:

- **Pickup store:** display name of the store (e.g. "Brussels Central, Ground Floor") and the full street address
- **Support contact:** the store's support phone number (formatted, with country code)

Both fields appear in a clearly labelled section titled "Your Pickup Information" placed between the book titles and the date block.

### Gap Analysis

| Aspect               | Current             | Desired                                          |
| -------------------- | ------------------- | ------------------------------------------------ |
| Pickup store         | Not shown           | Store display name + full address                |
| Support phone        | Not shown           | Store support phone number with country code     |
| Email section layout | Flat list of fields | New "Your Pickup Information" section added      |

### Impact Analysis

**Systems / modules affected:**

- `Shop.Orders.Core`: The `OrderConfirmedEvent` payload must include `PickupStoreAddress` and `SupportPhoneNumber`
- `Shop.Notifications.Emails`: The email template (`order-confirmed.html`) must be updated
- `Shop.WebRealtime` (MassTransit consumer): The consumer that triggers the email must map the new fields from the event

**Data migration:** No data migration required. Both fields exist today: `PickupStore` on the order entity and `SupportPhone` on the store configuration.

**Breaking changes:** The `OrderConfirmedEvent` schema is extended with two new optional fields. Consumers that do not use these fields are unaffected. No API contract changes.

**Rollback plan:** Email template changes can be rolled back within one deployment cycle (< 1 hour). The event schema addition is backwards-compatible and requires no rollback procedure.

### Acceptance Criteria

- [ ] **AC1, Store in email:** Given a confirmed order with a pickup store assigned, when the confirmation email is sent, then the email body contains the pickup store display name and full street address under a "Your Pickup Information" heading.
- [ ] **AC2, Support phone in email:** Given the store has a support phone number configured, when the confirmation email is sent, then the support phone number appears in the email formatted as `+[countryCode] [localNumber]`.
- [ ] **AC3, No store fallback:** Given a confirmed order where no pickup store is assigned (edge case: data quality gap), when the confirmation email is sent, then the "Your Pickup Information" section is omitted entirely from the email (no broken or empty field shown to the customer).
- [ ] **AC4, No phone fallback:** Given a store with no support phone configured, when the confirmation email is sent, then the support phone line is omitted from the email.
- [ ] **AC5, Existing fields unchanged:** All fields present in the current email (order number, customer name, book titles, dates, store name) are present and unchanged in the updated email.

### Out of Scope

- Changes to any other email templates (shipping confirmation, cancellation notice, etc.): deferred
- Adding a map link or directions to the pickup store: deferred to Phase 2
- Allowing customers to reply to the confirmation email: separate story

### Dependencies

| Dependency                                            | Type          | Status | Notes                               |
| ----------------------------------------------------- | ------------- | ------ | ----------------------------------- |
| `PickupStore` entity with address fields populated    | Informational | Done   | Confirm data quality in production  |
| Store `SupportPhone` field                            | Informational | Done   | Confirm field exists in all tenants |

### Definition of Done

- [ ] All acceptance criteria verified by QA against sent email content
- [ ] Email template peer-reviewed for formatting and mobile rendering
- [ ] No regression in existing email sending flow
- [ ] Event schema change is backwards-compatible (existing consumers tested)
- [ ] Code reviewed and approved by at least one senior developer
