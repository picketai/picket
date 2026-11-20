## Review: 20261120-tester-records-defects-fixed-ones-counted · cumulative

Approved: every request sentence and every T-1.x and T-2.x criterion has code and a test behind it, and I found no regression outside the plan.

Requirements: PASS (6)

| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Give the tester a verb that records one with its request, the expected and the actual answer and the evidence" | request.md:2 | PASS | /mnt/work/development/github/picket/src/lib/verbs/test/defect.mts:46-60; defect.test.mts T-1.2 |
| S-2 | "so it becomes a known defect at close" | request.md:2 | PASS | /mnt/work/development/github/picket/src/lib/verbs/close/defects.mts:145-157; close/index.test.mts T-1.5 |
| S-3 | "does not count against the item or the breaker" | request.md:2 | PASS | derive.test.mts T-1.4 (same verdict, route and counts with a defect row) |
| S-4 | "is offered as a ticket through picket:ticketing on the user's confirmation" | request.md:2 | PASS | the close line `DF-0001 recorded from K-01 (S-0001)` (defects.mts:154) meets ordering/SKILL.md:26, designing/SKILL.md:27, expediting/SKILL.md:37 |
| S-5 | "The developer records its root cause and escape point with picket test escape" | request.md:3 | PASS | /mnt/work/development/github/picket/src/lib/verbs/test/escape.mts:24-33; record.test.mts T-2.1 |
| S-6 | "close counts it with the others" | request.md:3 | PASS | defects.mts:71-74, 176; close/index.test.mts T-2.5, T-2.6 |
| S-7 | "the testing skill's steps for both" | request.md:7 | UNCLEAR | the escape step went to src/agents/developer.md:21 and expediting/SKILL.md step 5, not the testing skill (OQ-001 fallback) |

Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-7 the brief puts "the testing skill's steps for both" in scope, but the developer, not the tester, records the escape point. The plan's OQ-001 fallback put that step in developer.md and the expediting skill. Confirm that placement.
Findings: 0 critical, 0 major, 2 minor
- [Minor] /mnt/work/development/github/picket/src/lib/verbs/close/defects.mts:148: `foundDefect` silently drops a defect row whose card no longer parses (`if ("problems" in built) return null`), so the closing block says nothing about a K-row that never became a known defect. Add a `K-01 not recorded: <problems>` line, as keep.mts does for a card that does not parse.
- [Minor] /mnt/work/development/github/picket/src/lib/verbs/close/defects.mts:156: a defect row from round 1 is turned into an open known defect even when a later fix round fixed it, because defect rows are never rerun. The next item's replay then passes the card and closes it as `fixed outside this item` with `no failing run recorded`. D-002 asks for this behaviour, so it is a follow-up and not something to fix here.

Classes: none
Checked: the route refusal at the last phase only and with no current phase (route.mts:92, 176); the fast-close refusal before any write (close.mts:375); DF and K ids kept apart from C ids in nextCaseId, the dedupe and newestEscape; nextScenarioId running after keepCandidates writes its cards; the learnFromDefects filter (a superset of found_in); no comments added; the T-1.1 drive exits 1 with the usage; 9 changed test files with 203 passing under TMPDIR=/tmp; the mutant at route.mts:93 was killed

APPROVED
