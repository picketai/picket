## Review: 20261120-known-defects-watched-learning-counted · cumulative

APPROVED: code and tests cover every request sentence and all 22 plan criteria. The two open points are unclear wording in the request, not defects in the code.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A defect outside the item's criteria, or one that the base shows too, does not block the item. It is recorded as a known defect and offered as a ticket through `picket:ticketing`, with the user's confirmation." | request.md:6 | UNCLEAR | The base-shows-too case is covered: src/lib/verbs/close/defects.mts:56-62 and the ticket offer in ordering, designing and expediting `SKILL.md`. A defect the tester finds outside every criterion has no way to be recorded (order.md OQ-001). |
| S-9 | "Each defect keeps its entry after the fix, with scenario, expected, actual, evidence, root cause and `Escaped:`" | request.md:17 | UNCLEAR | Tester product cases are covered: src/lib/verbs/close/defects.mts:107-128. A scenario known defect that the item fixes gets no `root_cause` and no `escaped`: src/lib/verbs/close/defects.mts:72. |

Alignment: PASS (22)
Decisions: HONOURED
Regression: none
Sources: none
Questions: S-1 the tester cannot record a defect outside every tested criterion (`picket test case` refuses one), so how should such a defect be found and recorded (order.md OQ-001)?; S-9 does section 7's "each defect" include a scenario known defect that an item fixes on purpose? Today that entry closes with no root cause and no `escaped`, so it is never counted.
Findings: clean
Checked: the callers of `classify` (src/lib/verbs/env/replay.mts:91; base rows pass `null`); the readers of `RESULT_CLASSES` and `HEADER_KEYS`; the new escape rows against every reader of `roundRows` (the case cap, classify, packet and rerun read only case and class rows); `restoreKept` removes new defect entries and restores relabelled cards when the commit fails; relabelled cards stay signed (src/lib/shared/scenarios/files.mts:39); `changedSince` includes the working tree; `isBlamed` is unchanged, so known-defect, side-effect and masked rows never reach the fix route, the breaker or the fast-close refusal; the scenario core is 570 lines against its 600-line budget; `lint.craft` is clean; `silenced` is empty; the mutant at src/lib/shared/route/route.mts:77 was killed.

APPROVED
