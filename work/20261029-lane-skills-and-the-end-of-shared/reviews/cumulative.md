## Review: 20261029-lane-skills-and-the-end-of-shared · cumulative

Approved: every requirement in the request has code and a test behind it, all plan criteria and decisions hold, and the only finding is a minor stale test pattern.

Requirements: PASS (10)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "the four lane skills ... in bundle 2's shape (description plus when_to_use, no user-invocable: true, purpose paragraph, ## Steps as one ordered list, ## Rules, ## Output, kebab step names with no number prefix, step headers "# <Skill>: <name>")" | request.md:1 | PASS | src/skills/ordering/SKILL.md:8,18,28,44; designing/SKILL.md:9,18,29,45; expediting/SKILL.md:8,18,29,45; researching/SKILL.md:7,19,26,36; steps/open.md, outline.md, deep.md; skills.test.mjs passes with the four removed from `UNCONVERTED_SKILLS` |
| S-2 | "the lane check paragraph removed from all four" | request.md:1 | PASS | the `no picket admit answer` prose is gone from all four; test/cli/lane-check.test.mjs drops `PROSE_STEP` |
| S-3 | "src/skills/shared/ removed" | request.md:1 | PASS | `git ls-tree HEAD src/skills/shared` is empty; no `shared/procedures` reference left in src or docs |
| S-4 | "CLAUDE.md block rules 3 and 4 (send exactly what picket next prints; at a gate print picket packet verbatim, end the turn, pass the reply to picket reply and send what it prints)" | request.md:1 | PASS | CLAUDE.md:9-10, src/templates/claude-block.md (same text) |
| S-5 | "jira-intake.md replaced by picket:ticketing --pull <KEY> --story" | request.md:1 | PASS | src/skills/ticketing/steps/20-jira.md:25-29, ticketing/SKILL.md:38, ordering/SKILL.md:20, designing/SKILL.md:20 |
| S-6 | "picket open refuses a lane lighter than admit's answer unless --user-lane (recorded in the verdict log)" | request.md:1 | PASS | src/lib/verbs/open/index.mts:86-94, shared/admission/admit.mts:12-16; open/index.test.mts covers refusal, heavier pass and the `user-lane` row with `admitted: "order"` |
| S-7 | "picket close <id> --human prints the lane's whole closing block (Questions from reviews/cumulative.md, Left for you, Left staged, repeat follow-up offers)" | request.md:1 | PASS | src/lib/verbs/close/block.mts:48-61, close/index.mts:24, shared/work/reviews.mts:36-40; close/index.test.mts and test/cli/close.test.mjs |
| S-8 | "picket next sends the cross-check delta re-check (scope crosscheck, delta: the amended D-### ids) after an AMENDED that answered a DRIFT DETECTED" | request.md:1 | PASS | src/lib/shared/work/next-step.mts:74-86,148; send.mts:107-110; route/plan.mts:84-89 reopens the item so the step is reachable; next-step.test.mts asserts `delta: D-003` |
| S-9 | "The skills test PENDING lists lose the four lane skills' entries" | request.md:1 | PASS | test/repo/skills.test.mjs:23-79, `repeats: []` |
| S-10 | "references.test.mjs drops "shared"" | request.md:1 | PASS | test/repo/references.test.mjs:23 |

Alignment: PASS (20)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 1 minor
- [Minor] test/timing/budgets.test.mjs:41: `STEP_FILE` still matches `shared[\\/]procedures`, and the test at :63 still says it "covers ... shared/procedures/". It now only covers a folder it creates for itself. The file was in phase 2's touch set. Fix: drop that branch from the pattern and from the planted fixture.
Classes: none
Checked: these all hold. AMENDED is routed with a snapshot taken before the row is appended (route.mts:50-53), so rounds 1 and 2 reopen the item and round 3 leaves it stalled. `admit` is still re-exported for bench. The new close render has no other consumer. An order-lane redesign (`reply` says to abandon and open again in the design lane) and a fast-to-order escalation both open a heavier lane and pass the refusal. An empty delta falls back to a full pass.

One gap the plan chose on purpose (D-001). The expediting skill opens with a title only, so `open`'s refusal never runs for the fast lane, and its old lane-check paragraph is gone. A fast lane picked by mistake is now caught only by the re-admit in step 4, in the same tool batch as the first edit. This is plan-mandated, so it is not a finding.

Targeted tests, not the full suite: open, close, next-step, plan, send, admit, and the skills, references and agents repo tests ran 116 of 116 passing.

APPROVED
