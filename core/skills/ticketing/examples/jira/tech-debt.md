# Reference Example — Technical Debt

This is a **complete, finished output sample**. Use it to calibrate the "Risk of NOT Doing This" section depth, code snippet usage in Current State, and the business justification tone.
Do NOT reproduce this in output unless the user is actually working on SignalR broadcast optimisation.

---

**Issue Type:** Task
**Input provided by:** Principal Engineer (Architecture Review, March 2026) — identified during a performance audit that the `StockHub` (SignalR) broadcasts book stock-level updates to ALL connected clients on each stock change, regardless of whether the client is currently viewing the relevant book. This creates unnecessary bandwidth and processing load that scales linearly with catalogue size.
**Priority:** High — already causing degraded WebSocket performance at 150+ concurrent connections; the catalogue is growing 20% quarter-over-quarter
**Labels:** `technical-debt`, `performance`, `realtime`, `inventory`

---

### Business Context

The `Shop.WebRealtime` service broadcasts live stock levels to support agents via SignalR. Every time a book's stock changes (approximately every 30 seconds per actively selling title), the server broadcasts the update to every connected support client — regardless of whether that client is looking at a stock dashboard or a book list that includes that specific title.

At the current size of ~180 actively selling titles and ~40 concurrent connections during peak hours, each stock tick generates up to 7,200 WebSocket messages per minute. As the catalogue grows, this number grows proportionally. Load testing at 300 titles and 80 concurrent users shows SignalR hub CPU usage spiking to 85% and average message delivery latency increasing from 120ms to 650ms — crossing the user-perceived lag threshold.

This was an acceptable simplification at launch (35 titles, <10 concurrent users) but is now actively degrading the stock dashboard for store staff and approaching a service availability risk.

### Risk of NOT Doing This

- **Incident risk:** At projected catalogue size (~280 actively selling titles, Q3 2026), the hub will be saturated during peak hours. Expected outcome: connection drops and the stock dashboard becoming unusable — the primary operational tool for store staff.
- **Velocity impact:** Every new feature that touches the realtime layer (planned: low-stock alerts, shipment delay notifications) must work around the broadcast model, adding complexity to each implementation.
- **Cost of delay:** The problem compounds with catalogue growth — rearchitecting at 300 titles will require a larger migration effort than at 180 titles. Every sprint of delay adds technical surface area.
- **Security / compliance risk:** None directly, but broadcasting all stock levels to all connected users means a user with limited access (e.g., managing only one partner store) currently receives stock data for every store — a data access control gap.

### Current State

`Shop.WebRealtime/Hubs/StockHub.cs` — hub broadcasts all stock updates to the `"stock-updates"` group, which all authenticated clients are added to on connection:

```csharp
// StockHub.cs — current (problematic)
public override async Task OnConnectedAsync()
{
    await Groups.AddToGroupAsync(Context.ConnectionId, "stock-updates");
    await base.OnConnectedAsync();
}
```

`Shop.WebRealtime/Consumers/StockLevelChangedConsumer.cs` — MassTransit consumer publishes to the single group:

```csharp
await _hubContext.Clients.Group("stock-updates").SendAsync("StockChanged", stockDto);
```

**Key locations:**

- `Shop/Shop/Shop.WebRealtime/Hubs/StockHub.cs` — hub connection management (broadcast to all)
- `Shop/Shop/Shop.WebRealtime/Consumers/StockLevelChangedConsumer.cs` — consumes stock events and broadcasts
- `src/StoreWebapp/src/features/stock/useStockLevels.ts` — client-side hook that receives all updates

### Desired State

Clients subscribe to specific book groups on demand. The hub manages per-book groups (`book-{bookId}`). Clients subscribe when they open a book on the dashboard and unsubscribe when they close it. The consumer publishes only to the relevant book group.

- Hub exposes `SubscribeToBook(bookId)` and `UnsubscribeFromBook(bookId)` methods
- Consumer broadcasts to `book-{bookId}` group instead of `"stock-updates"`
- Client subscribes on mount and unsubscribes on unmount
- A client watching 10 books receives exactly 10× the update volume of a client watching 1 book — linear scaling per user intent, not per catalogue size

### Proposed Approach

1. Add `SubscribeToBook` / `UnsubscribeFromBook` hub methods that add/remove the connection from `book-{bookId}` groups
2. Update `StockLevelChangedConsumer` to publish to `book-{bookId}` instead of `"stock-updates"`
3. Remove the `OnConnectedAsync` auto-enrollment in `"stock-updates"`
4. Update `useStockLevels` hook to call the new hub methods
5. Remove the now-unused `"stock-updates"` group

### Constraints & Risks

- The client-side hook `useStockLevels` must be updated atomically with the server change — a phased rollout is not feasible without a temporary compatibility shim
- Subscription management must handle reconnect scenarios (SignalR auto-reconnect must re-subscribe to groups)
- Load test before and after to confirm the improvement — target: P95 latency < 200ms at 300 titles / 80 connections

### Acceptance Criteria

- [ ] **AC1 — Selective broadcast:** Given 5 books are changing stock and a connected client has subscribed to 2 of them, when the hub delivers updates, then the client receives exactly 2 updates per stock cycle — not 5.
- [ ] **AC2 — Subscribe/unsubscribe methods:** The hub exposes `SubscribeToBook(string bookId)` and `UnsubscribeFromBook(string bookId)` methods callable from the client.
- [ ] **AC3 — No regression in dashboard behaviour:** The stock dashboard displays live stock levels for all subscribed books with the same visual behaviour as before this change.
- [ ] **AC4 — Reconnect resilience:** Given a client reconnects after a connection drop, when the SignalR connection is re-established, then subscriptions are restored automatically (no manual page reload required).
- [ ] **AC5 — Architecture compliance:** `dotnet test Shop.Architecture.Tests` passes with no new violations.
- [ ] **AC6 — Performance:** Load test at 300 titles / 80 concurrent connections shows P95 hub message delivery latency ≤ 200ms.

### Out of Scope

- Server-side push notifications (Expo) are not affected by this change
- Subscribing to book-level data beyond stock level (price, reviews) — separate story
- Fixing the data access control gap (all stores visible to all users) — separate security story

### Dependencies

| Dependency                                           | Type     | Status | Notes                       |
| ---------------------------------------------------- | -------- | ------ | --------------------------- |
| `useStockLevels` hook refactor (client)              | Blocking | Open   | Must be done in same sprint |
| Load testing environment with 300-title simulation   | Blocking | Open   | Coordinate with DevOps      |

### Definition of Done

- [ ] All acceptance criteria verified by peer code review and load test
- [ ] Architecture tests pass
- [ ] All existing realtime integration tests pass
- [ ] Client-side subscription logic peer-reviewed by a frontend engineer
- [ ] Load test report attached to this ticket
- [ ] Tech lead / architect sign-off
