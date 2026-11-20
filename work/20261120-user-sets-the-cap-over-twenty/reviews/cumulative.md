## Review: 20261120-user-sets-the-cap-over-twenty · cumulative

APPROVED: every request sentence and every T-1.x and T-2.x criterion is met in code with a test that asserts it, and nothing changed at 20 cases or under.

Requirements: PASS (7)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "six cases per criterion per round stays" | request.md:1 | PASS | src/lib/shared/testing/derive.mts:33 (`caseCap` unchanged) |
| S-2 | "the test stage stops at the user before the tester starts" | request.md:1 | PASS | src/lib/shared/work/test-stage.mts:51-61; T-2.1 test |
| S-3 | "shows the total and how it is made up (the criteria and six each)" | request.md:1 | PASS | src/lib/verbs/packet/packet.mjs:218-224; T-2.6 test |
| S-4 | "takes the total the user sets, lower or higher" | request.md:1 | PASS | src/lib/verbs/reply/table.mts:114, src/lib/verbs/reply/index.mts:88-92 |
| S-5 | "the brief then carries that number" | request.md:1 | PASS | src/lib/shared/testing/brief.mts:48-56; T-1.3 test |
| S-6 | "picket test case enforces it" | request.md:1 | PASS | src/lib/verbs/test/case.mts:48; T-1.4 and T-1.5 tests |
| S-7 | "At 20 or under nothing changes and nobody is asked" | request.md:1 | PASS | derive.mts:44; base tests unchanged |

Alignment: PASS (14)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] src/lib/verbs/reply/table.mts:114: a reply of 309 or more digits passes `/^[1-9]\d*$/`, but `Number()` turns it into `Infinity`, which `appendJsonl` writes as `"cases":null`. The user is then told "cases per round set: Infinity" and the gate asks again. A probe confirmed it: `JSON.stringify({cases:Infinity})` gives `{"cases":null}`. Refuse any total that is not `Number.isSafeInteger`.
Classes: none
Checked: every path to the tester goes through `caseCapGate` (test-stage.mts:87, 144, 167, 174). An old answer stops counting when the number of criteria changes (derive.mts:37). The existing tests in brief.test.mts, case.test.mts and test-stage.test.mts only gained lines. A `set_case_cap` reply resets `rowsSinceLastReply` (hooks/route/verdict/index.mts:88), which only affects duplicate-verdict detection. The 7 changed test files pass under `node --test` (197 of 197). The mutation was killed and `silenced` is empty.

APPROVED
