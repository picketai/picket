## Review: 20261117-the-tester-checks-finished-items · cumulative

Approved: every story requirement and all 73 criteria hold. There is one Major (a redesign reply at the test stage's three-round stop loops back to the same stop), and Majors do not block.

Requirements: PASS (14)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-4 | "It tests a matrix of case kinds for each criterion, sized by one check for each risk with a cap by item size" | request.md:3 | UNCLEAR | caseCap is 6 per tested criterion (src/lib/shared/testing/derive.mts:30), not a cap by item size; design OQ-002 defers the numbers |

Alignment: PASS
Decisions: HONOURED
Regression: 1 unrequested behaviour change: guard.block now accepts only the stopping role's own tokens (src/lib/hooks/guard/block/index.mts:50-54,98), so a developer block ending APPROVED bounces at the stop instead of being refused by route. It is tighter, and the phase 5 block reports it.
Sources: none
Questions: S-4 should the per-round case cap scale with item size (small, medium, large) instead of 6 cases for each tested criterion?
Findings: 0 critical, 1 major, 2 minor
- [Major] /mnt/work/development/github/picket/src/lib/shared/work/test-stage.mts:90-95: at the test stage's resolve_rejections stop (the third fix round), "[d] redesign" never leaves the stop. redesign() records a reply that is not fresh (src/lib/verbs/reply/index.mts:80-84). rejectionsStep counts fix rounds since the latest fresh reply and returns null only when a developer row follows the tester. After [d] and the architect's AMENDED, `picket next` still prints "3 test rounds returned CHANGES REQUIRED since the last approval". I reproduced this with a scratchpad probe through nextStep: the same step comes back before [d], after [d], and after AMENDED. The existing rejectionsStep (src/lib/shared/work/next-step.mts:64-69) avoids this because it fires only while the rejection is the latest verdict. D-007 promises "the existing resolve_rejections stop", whose redesign option must lead to the amendment. Fix: also return null when any row (an architect AMENDED included) follows the tester in the stage, and add a test that [d] then AMENDED gives a developer fix or a retest. Likelihood: low. Leave it: at the third test-round stop, answer c or x; d returns to the same stop.
- [Minor] /mnt/work/development/github/picket/src/lib/shared/work/test-stage.mts:140-145: after the user rejects at approve_fixes, the developer's next PHASE DONE goes straight back to approve_fixes. Neither the cumulative reviewer nor the tester sees the reworked fix. The phase 8 block reports this, and the plan does not cover it. Fix: an architect decision on whether a rejected fix gets a re-review.
- [Minor] work/20261117-the-tester-checks-finished-items/design.md#D-008: "writes only PKT- data" is built as writesUnownedData (src/lib/shared/scenarios/keep.mts:80). That rule treats a login POST as a write. The testing skill makes login the first request of any authenticated case (src/skills/testing/steps/cases.md:20-30), so keep-cases.mts:11 never keeps an authenticated case. Fix (a note to the architect): exempt a request with no PKT- data that only captures a token, or say in D-008 that authenticated cases are not kept.

Classes: none
Checked: black-box fence (Grep with no path, the allow-listed test/ folder, a transcript with no work line, the tester's Bash allowlist and expansions), a forged tester verdict (route re-derives it at src/lib/shared/route/route.mts:59-69, and guard.block bounces a non-tester `## Test:` block), commit_fixes refusing before any write, and close's Tested and Not verified lines. lint.craft over 6d94f40f..HEAD: 0 errors, 0 candidates. 179 targeted unit tests pass. Mutation killed, silenced list empty.

Probe: /mnt/work/development/containers/podman/tmp/claude-1000/-mnt-work-development-github-picket/d09e885b-38d7-46ab-90a1-fca179743a5f/scratchpad/redesign-probe.mts

APPROVED
