## Review: 20261108-kernel-and-template-gaps-order · cumulative

Approved: all seven request items are met in code with tests, every T criterion has evidence, and no Critical or Major finding survived the disproof pass.

Requirements: PASS (7)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "A bare `r` should mean run through the last phase." | request.md:2 | PASS | src/lib/verbs/reply/table.mts:68, runToLimit; reply test T-2.1 |
| S-2 | "`picket next` still printed the implement_phase sends instead of the `amend` send ... After AMENDED it printed no `review_crosscheck` send either" | request.md:3 | PASS | src/lib/shared/work/next-step.mts:122-126 blockStep; plugin replay tests T-1.1, T-1.2 |
| S-3 | "A checkpoint reviewer's CHANGES REQUIRED was recorded with scope null" | request.md:4 | PASS | src/lib/hooks/route/verdict/index.mts:45-48, :149; built-hook test T-1.4 |
| S-4 | "A missing base should be found later (from the item's ledger accept rows or its first phase commit) or reported, never HEAD." | request.md:5 | PASS | src/lib/shared/review-summary.mts:190-195; src/lib/verbs/summary/index.mts:60-65 |
| S-5 | "guard.bash denies read-only `git config --get` and `git config --list` as destructive." | request.md:6 | PASS | src/lib/hooks/guard/bash/rules.mts:196-202 |
| S-6 | "A repeat after a rejection should be routed, or bounced with a message." | request.md:7 | PASS | src/lib/hooks/route/verdict/index.mts:87-99 |
| S-7 | "The closing-block templates ... do not show the `Audit:` line" | request.md:8 | PASS | src/skills/{ordering,designing,researching}/SKILL.md; order matches close/block.mts:59-62 |
Alignment: PASS (20 of 20; T-x.6 and T-x.7 suites green per the mutation baseline, which ran `npm test` and got `killed`; the 4 changed unit test files ran here: 82 pass)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: clean, 0 critical, 0 major, 1 minor
- [Minor] src/lib/shared/work/next-step.mts:108: `isRepeatStall` lives in next-step, while the Phase 1 Changes bullet puts it in `stall.mts`. The developer logged this deviation, and D-001's list of what stall.mts owns is still met. Move it only if a second caller appears.
- [Nit] pre-existing: src/lib/verbs/mutate/index.mts:68 still uses `state.base ?? "HEAD"`. The request keeps this out of scope.
Classes: none
Checked: guard probes found no write form allowed (`--get ... --unset`, `-l -e`, `--edit --list` all denied; `$(...)` operands go to the prompt, as at base). T-3.5 driven here: base 2646b200 and 98 files, the same as with `--base 79e51c2^`. A resumed phase-headed reviewer can only be rescoped when the latest `work:` message says checkpoint, and next-step emits no phase-review send. The removed guards (`--global` as a write, the repeat-block drop, the HEAD fallback) are each mandated by D-005, D-003 and D-004. silenced is empty and the mutant at rules.mts:199 was killed.

APPROVED
