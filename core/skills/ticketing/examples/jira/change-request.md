# Reference Example — Change Request

This is a **complete, finished output sample**. Use it to calibrate tone, section depth, Gap Analysis table style, and Impact Analysis verbosity.
Do NOT reproduce this in output unless the user is actually working on email notification changes.

---

**Issue Type:** Story
**Input provided by:** Domain Expert (Head of Fleet Operations) — requested that the reservation confirmation email sent to drivers be updated to include the vehicle handover location address and the emergency contact phone number, which are currently absent and cause drivers to call support for information already known to the system.
**Priority:** Medium — reduces support call volume but does not block any business process
**Epic Link:** Driver Communication Improvements
**Labels:** `change-request`, `rentals`, `notifications`

---

### Business Context

The current reservation confirmation email sent to drivers upon booking confirmation contains: reservation number, vehicle category, start date, end date, and the rental company name. It does not include the physical handover address (where the driver must collect the vehicle) or an emergency phone number to call if they encounter a problem.

This information exists in the system: the handover location is stored on the reservation as `PickupLocationId` (resolved to a full address) and the emergency contact is a company-level configuration field. The omission is not a technical gap — it is a historical oversight from the initial email template design.

The impact is measurable: the support team logs an average of 35 inbound calls per weekday from drivers asking "where do I pick up the car?" and "who do I call if there's a problem?" — approximately 60% of total driver-initiated support volume. Adding these two fields to the confirmation email is expected to reduce this call volume by an estimated 40–50%.

### Current Behaviour

The reservation confirmation email (triggered when a reservation transitions to `Confirmed` status) contains:

- Reservation reference number
- Driver full name (salutation)
- Vehicle category (e.g. "Compact", "SUV")
- Pickup date and return date
- Rental company name and logo

The email does **not** contain:

- Pickup location name or address
- Emergency/support contact phone number

### Desired Behaviour

The reservation confirmation email contains all current fields plus:

- **Pickup location:** display name of the location (e.g. "Brussels Airport — Terminal 1") and the full street address
- **Emergency contact:** the rental company's emergency phone number (formatted, with country code)

Both fields appear in a clearly labelled section titled "Your Pickup Information" placed between the vehicle category and the date block.

### Gap Analysis

| Aspect               | Current             | Desired                                          |
| -------------------- | ------------------- | ------------------------------------------------ |
| Pickup location      | Not shown           | Location display name + full address             |
| Emergency phone      | Not shown           | Company emergency phone number with country code |
| Email section layout | Flat list of fields | New "Your Pickup Information" section added      |

### Impact Analysis

**Systems / modules affected:**

- `Rent.Rentals.Core`: The `ReservationConfirmedEvent` payload must include `PickupLocationAddress` and `EmergencyPhoneNumber`
- `Rent.LTNT.Emails`: The email template (`reservation-confirmed.html`) must be updated
- `Rent.WebRealtime` (MassTransit consumer): The consumer that triggers the email must map the new fields from the event

**Data migration:** No data migration required. Both fields exist today — `PickupLocation` on the reservation entity and `EmergencyPhone` on the company configuration.

**Breaking changes:** The `ReservationConfirmedEvent` schema is extended with two new optional fields. Consumers that do not use these fields are unaffected. No API contract changes.

**Rollback plan:** Email template changes can be rolled back within one deployment cycle (< 1 hour). The event schema addition is backwards-compatible and requires no rollback procedure.

### Acceptance Criteria

- [ ] **AC1 — Location in email:** Given a confirmed reservation with a pickup location assigned, when the confirmation email is sent, then the email body contains the pickup location display name and full street address under a "Your Pickup Information" heading.
- [ ] **AC2 — Emergency phone in email:** Given the rental company has an emergency phone number configured, when the confirmation email is sent, then the emergency phone number appears in the email formatted as `+[countryCode] [localNumber]`.
- [ ] **AC3 — No location fallback:** Given a confirmed reservation where no pickup location is assigned (edge case — data quality gap), when the confirmation email is sent, then the "Your Pickup Information" section is omitted entirely from the email (no broken or empty field shown to the driver).
- [ ] **AC4 — No phone fallback:** Given a company with no emergency phone configured, when the confirmation email is sent, then the emergency phone line is omitted from the email.
- [ ] **AC5 — Existing fields unchanged:** All fields present in the current email (reservation number, driver name, vehicle category, dates, company name) are present and unchanged in the updated email.

### Out of Scope

- Changes to any other email templates (return confirmation, cancellation notice, etc.) — deferred
- Adding a map link or directions to the pickup location — deferred to Phase 2
- Allowing drivers to reply to the confirmation email — separate story

### Dependencies

| Dependency                                            | Type          | Status | Notes                               |
| ----------------------------------------------------- | ------------- | ------ | ----------------------------------- |
| `PickupLocation` entity with address fields populated | Informational | Done   | Confirm data quality in production  |
| Company `EmergencyPhone` field                        | Informational | Done   | Confirm field exists in all tenants |

### Definition of Done

- [ ] All acceptance criteria verified by QA against sent email content
- [ ] Email template peer-reviewed for formatting and mobile rendering
- [ ] No regression in existing email sending flow
- [ ] Event schema change is backwards-compatible (existing consumers tested)
- [ ] Code reviewed and approved by at least one senior developer
