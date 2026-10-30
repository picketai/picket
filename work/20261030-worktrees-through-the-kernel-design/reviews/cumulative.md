## Review: 20261030-worktrees-through-the-kernel-design · cumulative

APPROVED: both findings from the last pass are fixed, every requirement and criterion still holds, and the amended D-005 matches the code.

Requirements: PASS (12)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "a new verb picket worktree (record the branch" | request.md:1 | PASS | src/lib/shared/checkouts.mts:127, src/lib/verbs/worktree/index.mts:44 |
| S-2 | "record none" | request.md:1 | PASS | src/lib/shared/checkouts.mts:139 |
| S-3 | "create or resume the worktrees of every nested repo the plan touches" | request.md:1 | PASS | src/lib/verbs/worktree/create.mts:177-187; test/cli/worktree.test.mjs:50, :95 |
| S-4 | "hydrate only uninitialised submodules" | request.md:1 | PASS | src/lib/verbs/worktree/create.mts:164-168; test/cli/worktree.test.mjs:77 |
| S-5 | "print the path map" | request.md:1 | PASS | src/lib/verbs/worktree/index.mts:81-91 |
| S-6 | "one mapping from plan paths into the item's worktrees used by verify, mutate, the phase commit and the review summary" | request.md:1 | PASS | checkouts.mts:52, 62; verify/index.mts:27; route/commit.mts:19; review-summary.mts planFiles |
| S-7 | "route commits each phase inside every touched nested repo, then work/ in the umbrella" | request.md:1 | PASS | src/lib/shared/route/apply.mts:92, commit.mts:36-48 |
| S-8 | "a create_worktrees user action in picket next, reply and packet before phase 1" | request.md:1 | PASS | next-step.mts:137, :166; reply/table.mts:79; packet.mjs:156 |
| S-9 | "the branching skill drops its developer claim and calls the verb" | request.md:1 | PASS | src/skills/branching/steps/create.md:4-5 |
| S-10 | "the developer works in per-item worktrees of nested repos without hand-made git commands or commits" | request.md:7 | PASS | send.mts:102; src/agents/developer.md:23 |
| S-11 | "out of scope: merge orchestration, runtime collisions between worktrees (ports, shared databases), benchmarking changes" | request.md:8 | PASS | none of these appears in the diff |
| S-12 | "nice-to-have items only when the caps allow" | request.md:7 | PASS | close and lint landed in phase 9; the fast-lane offer is moved out in design.md Scope, with a reason |

Alignment: PASS (58)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean
Classes: none
Checked: The new cases at src/lib/hooks/guard/bash/kernel.test.mts:66-67 kill the `&&` to `||` mutant: under it, `Number("1e0")` is 1 and the phase classifies `safe`, where the test expects `unknown`. The `mutation` record in summary.json (12:12) is from before this fix, so it still says `survived`. src/lib/verbs/reply/table.mts:25 now refuses gate words (`approve`, `go`, `continue`, `x`, `r`) as branch names, and D-005 (r3) plus its revision log line record the same list. The two touched test files pass, 18 of 18; I did not run the full suite.

APPROVED
