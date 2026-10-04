# Reference Example — Technical Debt

This is a **complete, finished output sample**. Use it to calibrate the "Risk of NOT Doing This" section depth, code snippet usage in Current State, and the business justification tone.
Do NOT reproduce this in output unless the user is actually working on SignalR broadcast optimisation.

---

**Issue Type:** Task
**Input provided by:** Principal Engineer (Architecture Review, March 2026) — identified during a performance audit that the `LogisticsHub` (SignalR) broadcasts vehicle position updates to ALL connected clients on each GPS ping, regardless of whether the client is currently viewing the relevant vehicle. This creates unnecessary bandwidth and processing load that scales linearly with fleet size.
**Priority:** High — already causing degraded WebSocket performance at 150+ concurrent connections; fleet size is growing 20% quarter-over-quarter
**Labels:** `technical-debt`, `performance`, `realtime`, `logistics`

---

### Business Context

The `Rent.WebRealtime` service broadcasts live GPS position updates to back-office users via SignalR. Every time a vehicle transmits a GPS ping (approximately every 30 seconds per active vehicle), the server broadcasts the update to every connected back-office client — regardless of whether that client is looking at a map or a vehicle list that includes that specific vehicle.

At the current fleet size of ~180 active vehicles and ~40 concurrent connections during peak hours, each GPS tick generates up to 7,200 WebSocket messages per minute. As the fleet grows, this number grows proportionally. Load testing at 300 vehicles and 80 concurrent users shows SignalR hub CPU usage spiking to 85% and average message delivery latency increasing from 120ms to 650ms — crossing the user-perceived lag threshold.

This was an acceptable simplification at launch (35 vehicles, <10 concurrent users) but is now actively degrading the map experience for dispatchers and approaching a service availability risk.

### Risk of NOT Doing This

- **Incident risk:** At projected fleet size (~280 vehicles, Q3 2026), the hub will be saturated during peak hours. Expected outcome: connection drops and supervisor map view becoming unusable — the primary operational tool for dispatch.
- **Velocity impact:** Every new feature that touches the realtime layer (planned: driver alerts, route deviation notifications) must work around the broadcast model, adding complexity to each implementation.
- **Cost of delay:** The problem compounds with fleet growth — rearchitecting at 300 vehicles will require a larger migration effort than at 180 vehicles. Every sprint of delay adds technical surface area.
- **Security / compliance risk:** None directly, but broadcasting all vehicle positions to all connected users means a user with limited access (e.g., managing only one sub-fleet) currently receives position data for all vehicles — a data access control gap.

### Current State

`Rent.WebRealtime/Hubs/LogisticsHub.cs` — hub broadcasts all position updates to the `"map-updates"` group, which all authenticated clients are added to on connection:

```csharp
// LogisticsHub.cs — current (problematic)
public override async Task OnConnectedAsync()
{
    await Groups.AddToGroupAsync(Context.ConnectionId, "map-updates");
    await base.OnConnectedAsync();
}
```

`Rent.WebRealtime/Consumers/VehiclePositionUpdatedConsumer.cs` — MassTransit consumer publishes to the single group:

```csharp
await _hubContext.Clients.Group("map-updates").SendAsync("PositionUpdated", positionDto);
```

**Key locations:**

- `Rent/Rent/Rent.WebRealtime/Hubs/LogisticsHub.cs` — hub connection management (broadcast to all)
- `Rent/Rent/Rent.WebRealtime/Consumers/VehiclePositionUpdatedConsumer.cs` — consumes GPS events and broadcasts
- `src/DriverPlatformWebapp/src/features/map/useVehiclePositions.ts` — client-side hook that receives all updates

### Desired State

Clients subscribe to specific vehicle groups on demand. The hub manages per-vehicle groups (`vehicle-{vehicleId}`). Clients subscribe when they open a vehicle on the map and unsubscribe when they close it. The consumer publishes only to the relevant vehicle group.

- Hub exposes `SubscribeToVehicle(vehicleId)` and `UnsubscribeFromVehicle(vehicleId)` methods
- Consumer broadcasts to `vehicle-{vehicleId}` group instead of `"map-updates"`
- Client subscribes on mount and unsubscribes on unmount
- A client watching 10 vehicles receives exactly 10× the update volume of a client watching 1 vehicle — linear scaling per user intent, not per fleet size

### Proposed Approach

1. Add `SubscribeToVehicle` / `UnsubscribeFromVehicle` hub methods that add/remove the connection from `vehicle-{vehicleId}` groups
2. Update `VehiclePositionUpdatedConsumer` to publish to `vehicle-{vehicleId}` instead of `"map-updates"`
3. Remove the `OnConnectedAsync` auto-enrollment in `"map-updates"`
4. Update `useVehiclePositions` hook to call the new hub methods
5. Remove the now-unused `"map-updates"` group

### Constraints & Risks

- The client-side hook `useVehiclePositions` must be updated atomically with the server change — a phased rollout is not feasible without a temporary compatibility shim
- Subscription management must handle reconnect scenarios (SignalR auto-reconnect must re-subscribe to groups)
- Load test before and after to confirm the improvement — target: P95 latency < 200ms at 300 vehicles / 80 connections

### Acceptance Criteria

- [ ] **AC1 — Selective broadcast:** Given 5 vehicles are transmitting GPS pings and a connected client has subscribed to 2 of them, when the hub delivers updates, then the client receives exactly 2 updates per ping cycle — not 5.
- [ ] **AC2 — Subscribe/unsubscribe methods:** The hub exposes `SubscribeToVehicle(string vehicleId)` and `UnsubscribeFromVehicle(string vehicleId)` methods callable from the client.
- [ ] **AC3 — No regression in map behaviour:** The map view displays live position updates for all subscribed vehicles with the same visual behaviour as before this change.
- [ ] **AC4 — Reconnect resilience:** Given a client reconnects after a connection drop, when the SignalR connection is re-established, then subscriptions are restored automatically (no manual page reload required).
- [ ] **AC5 — Architecture compliance:** `dotnet test Rent.Architecture.Tests` passes with no new violations.
- [ ] **AC6 — Performance:** Load test at 300 vehicles / 80 concurrent connections shows P95 hub message delivery latency ≤ 200ms.

### Out of Scope

- Server-side push notifications (Expo) are not affected by this change
- Subscribing to vehicle-level telemetry beyond GPS position (fuel level, door state) — separate story
- Fixing the data access control gap (all vehicles visible to all users) — separate security story

### Dependencies

| Dependency                                           | Type     | Status | Notes                       |
| ---------------------------------------------------- | -------- | ------ | --------------------------- |
| `useVehiclePositions` hook refactor (client)         | Blocking | Open   | Must be done in same sprint |
| Load testing environment with 300-vehicle simulation | Blocking | Open   | Coordinate with DevOps      |

### Definition of Done

- [ ] All acceptance criteria verified by peer code review and load test
- [ ] Architecture tests pass
- [ ] All existing realtime integration tests pass
- [ ] Client-side subscription logic peer-reviewed by a frontend engineer
- [ ] Load test report attached to this ticket
- [ ] Tech lead / architect sign-off
