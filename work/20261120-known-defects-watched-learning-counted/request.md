Add known defects with their watching, and the counted learning at close (SDR 00004 follow-up TF-008, its D-011, and sections 3.10 and 7 of artifacts/strategy/drafts/testing-and-test-environment.md).

Known defects, from section 3.10 of the draft:
### 3.10 Known defects

- A defect outside the item's criteria, or one that the base shows too, does not block the item. It is recorded as a known defect and offered as a ticket through `picket:ticketing`, with the user's confirmation.
- Its scenario asserts the correct behaviour and carries `known: DF-xxxx`. Its failure does not count against an item or trip the breaker. Every regression run prints the open known defects with their age.
- When a known defect stops failing, the reason is stated:
  - it passes at the base too: fixed outside this item; the commit range since its last failing run is reported;
  - it fails at the base, passes on the item, and the item names it: fixed by this item on purpose;
  - it fails at the base, passes on the item, and the item does not name it: a side effect; the label stays and the case goes to the user's stop with the files that changed;
  - the item changed a mock, the catalog or the scenario's inputs: possibly masked; treated as the side-effect case.


Learning, from section 7 of the draft:
## 7. Learning

- Each defect keeps its entry after the fix, with scenario, expected, actual, evidence, root cause and `Escaped:`, a closed list: unit test, declared check, a review row id, or `none: not checkable earlier`.
- `picket close` counts escape points across items. At two or more, one line of prose goes to the memory of the role concerned and is listed in the closing summary. A project rule stays a change the user requests.

## 8. Measuring the tester

Out of this item: the browser adapter (TF-009); the sandbox spike and the review checklist row of SDR 00005 (TF-003, TF-004); any change to how the verdict tokens route.

## Brief
purpose: Keep a defect that is outside an item's criteria visible without blocking the item, say why when it stops failing, and count at close what the tester's rounds taught (SDR 00004 TF-008).
in scope: Recording a known defect and its scenario marked known; its failure not counting against an item or the breaker; the list of open known defects with their age on every regression run; the stated reason when one stops failing, and the user's stop when there is none; the ticket offer through picket:ticketing on the user's confirmation; the counted learning at close as section 7 of the draft describes
out of scope: The browser adapter (TF-009); SDR 00005 TF-003 and TF-004; new verdict tokens or routes; a pipeline run of scenarios; the setting testing
