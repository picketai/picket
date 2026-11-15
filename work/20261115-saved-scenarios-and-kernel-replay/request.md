Build step 3 of SDR 00004 (artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, TF-003; detail in sections 3.1 to 3.3, 3.8, 3.9 and 6 of artifacts/strategy/drafts/testing-and-test-environment.md): saved scenarios and replay. No new agent in this step.

1. Format. A saved scenario is a file Picket owns: a card in words over recorded steps, with the header `id`, `kind`, `covers`, `intent` and optionally `flow`, `supersedes`, `status`, and `format: 1`. Step words are a closed list: `request`, `expect`, `capture`, `wait`. No conditions, loops or includes. An unknown word fails with its name. The HTTP engine (Node's `fetch`) sits behind an adapter with a line budget that a test enforces, and so does the core.

2. Approved checks are kept. A declared check of a phase (build step 1, `picket verify`) that the user approved at the phase gate becomes a saved scenario. The kernel writes the file from what really ran, replays it once from the start on its own, and keeps it only when that replay passes. A captured secret is stored by name, never by value. A fixed date is refused in favour of a relative one.

3. Safety rules, checked by the kernel before it runs a file: a request goes only to a service of the environment named by its placeholder, never to a full address; a saved scenario has no command steps; a value comes only from the scenario's captures, the run key or a named test user, never from an arbitrary environment variable.

4. Replay and stored results. A verb replays saved scenarios against a work item's stack (the `picket env` stack of build step 2) with no model. Each result is passed, failed, blocked or not run, names the commit it ran on, and is stored as the last known result of that scenario for those commits. An item compares its results with the results stored for its base; a scenario already failing at the base is reported as failing before the item and is not blamed on it. A failure counts only after a second run confirms it; a scenario that flips is marked unstable.

5. Fast lane. With no tester, the fast lane replays the saved scenarios that call a service whose source the change touched and compares with the last known results. A change meant to alter tested behaviour leaves the fast lane for the order lane.

6. Replacing. A scenario replaced on purpose is never rewritten: the old one gets `status: deprecated` and `superseded_by`, the new one `supersedes`; ids are never reused and files never deleted. The architect names a foreseen replacement in the plan and the user approves it at the gate; nothing is replaced by an agent without that approval. A scenario changed by hand is noticed by its fingerprint, checked against the safety rules, replayed, and reported as changed by hand.

Out of this step: the tester agent and its recording verb, the data catalog and SQL files, mocks beyond what build step 2 has, the browser adapter, known defects, the database guards.

The standard must not be tied to one runtime or one database: the product owner's services are mostly dotnet and node with SQL Server 2016, and other stacks must fit.

## Brief
purpose: An approved declared check is kept as a saved scenario that the kernel replays with no model, so an item and the fast lane see what a change broke against the last known results
in scope: the scenario format and its HTTP adapter, keeping approved checks, the safety rules, the replay verb and stored results with the base comparison, the fast-lane replay, replacing and hand-changed scenarios
out of scope: the tester agent and its recording verb, the data catalog and SQL files, new mock features, the browser adapter, known defects, the database guards
