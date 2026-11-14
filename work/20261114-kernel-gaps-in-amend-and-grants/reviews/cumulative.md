## Review: 20261114-kernel-gaps-in-amend-and-grants · cumulative

Approved: all three kernel gaps are closed in code. Each fix has a test that failed on the base and now passes, and the only finding is one Minor wording overstatement in the architect shell.

Requirements: PASS (5)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "The amend send must give the architect every Critical and Major finding of the cross-check (for example by naming the saved review file)" | request.md:3 | PASS | next-step.mts amendReview/amendStep; send.mts amendSend `review:` line; architect.md:75 reads every Critical and Major finding; send.test "an amend send names the saved review … (T-1.3)" |
| S-2 | "the re-check must not report ALIGNED while a Major finding of the previous cross-check is unaddressed." | request.md:3 | PASS | the hook writes `blocking` (verdict/index.mts blockingFindings). next-step.mts recheckDelta narrows only when every blocking anchor is a revised D-###. Otherwise a full pass runs, and crosscheck.md:32 turns any remaining Major into DRIFT DETECTED |
| S-3 | "`picket next` must keep printing the send until the developer has really been handed the phase." | request.md:5 | PASS | route.mts grantStamp + send.mts grantReaches; send.test "a grant set after the previous phase's PHASE DONE row … keeps the send (T-2.1)" |
| S-4 | "An approved amendment at that gate must be able to correct the declared check the amendment names (its `contains`, `exit_code` or command), with a revision log line, and nothing else in the frontmatter." | request.md:7 | PASS | amendment.mts namedChecks/frameDigest; next-step.mts isCountedAmended frame check; route test T-3.3 round trip; architect.md:81. The kernel does not guard title, date and sources, a trade-off D-004 records explicitly |
| S-5 | "Each fix needs a test that fails on the current code." | request.md:9 | PASS | each phase block's Red: line names a failing base test that calls the changed code |

Alignment: PASS (20 of 20 T-N.x criteria; T-1.6, T-2.5 and T-3.6 drive evidence comes from the phase blocks' Verified: lines)
Decisions: HONOURED
Regression: none (developerHandedOn is now stricter, so it sends more often; a PHASE DONE row's `through` now holds the grant stamp instead of the `--through` input, as D-003 mandates, and no other code reads it; the frame check runs only in amendAnswerStep, so crosscheck and checkpoint amendments are unaffected)
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] /mnt/work/development/github/picket/src/agents/architect.md:81: "any other frontmatter edit returns the amendment gate" overstates what the kernel does. frameDigest covers only phase entries, so an edit to title, date or sources passes the gate (D-004 records this). Narrow it to "any other edit to a phase entry".
Classes: none
Checked: blocking anchors only on non-decision paths, and an empty blocking list (both give a full pass); frame key reordering (canonical sorts the keys); a grant that stops at a security gate stamps null; review file names for checkpoint, phase and cumulative amend rows; an AMENDED reply loop after an out-of-frame gate (the next [a] gets a fresh `after`). Targeted tests: 228 of 228 passed. lint.craft is clean, silenced is empty, and the mutation at verdict/index.mts:109 (=== to !==) was killed.

APPROVED
