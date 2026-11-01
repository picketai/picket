## Review: 20261101-checkpoint-changes-required-gets-a-fix-step · cumulative

Approved: a checkpoint CHANGES REQUIRED now routes to a developer fix that names reviews/checkpoint.md and returns to review_checkpoint, while the cumulative path routes as before.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
| S-1 | checkpoint CHANGES REQUIRED routes to fix_findings for the developer | request.md | PASS | src/lib/shared/work/next-step.mts:128-130, test T-1.1 |
| S-2 | the send names reviews/checkpoint.md, not a hardcoded cumulative file | request.md | PASS | src/lib/shared/work/send.mts:145-154, test T-1.4 |
| S-3 | back to review_checkpoint after PHASE DONE, next phase only once reviewed | request.md | PASS | next-step.mts:93-96, 133; plan.mts phaseReviewed writes N.reviewed; tests T-1.2, T-1.3 |
| S-4 | action text fits both reviews | request.md | PASS | src/lib/shared/work/action-text.mts:20, band.test.ts:90 |
| S-5 | unit tests for the routing and the send | request.md | PASS | next-step.test.mts:248-282, send.test.mts:163-168 |
Alignment: PASS
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 1 minor
- [Minor] src/agents/developer.md:21: the contract says `review:` comes "in place of `phase:`" only after a cumulative review. The checkpoint fix send (D-003) now carries both `review:` and `phase: 3`. The developer still gets the right inputs (verify on phase 3, read the review), but the contract does not describe this message shape. The agent contract was outside the order's touch set, so this is a note for a later item, not a defect in this change.
Classes: none
Checked: findingsOpen's cumulative branch is still equivalent (the scope filter already applies, so `verdict === "CHANGES REQUIRED"` matches isCumulativeRejection). A phase 3 PHASE DONE routed with phase 3 already approved adds no approval and no commit (runGrantChanges returns [] on marks.approved). nextView copies only named fields, so `review` does not reach the wire view. Every existing cumulative assertion changes only by `review: "cumulative"`. 60/60 unit tests pass in the three touched suites. tsc --noEmit is clean. The mutation at next-step.mts:94 was killed.

APPROVED
