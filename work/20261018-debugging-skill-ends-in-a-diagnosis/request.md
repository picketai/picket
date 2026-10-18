Add a debugging skill, picket:debugging, to the core.

It is a non-lane skill like explaining and consulting: it runs in the main session, ends in a diagnosis (a root cause with its evidence plus a failing test), never in a fix, and hands the fix to `picket admit` as a change request. The red test it writes must use the same reproduction contract the developer uses (the `Red:` line and `Root cause: X because Y` from work item 20261018-adopt-comparison-report-improvement-ideas, expediting/steps/20-prove.md), so the lane turns that test green.

Content to draw on, from the two comparison reports (work/20261017-compare-agent-skills-with-picket-skills/research.md R-037; work/20261017-compare-cursor-pstack-with-picket-skills/research.md R-030, R-034, R-021):
- agent-skills debugging-and-error-recovery: stop the line, reproduce, localize, reduce, fix the root cause, guard; bisect; a decision tree for a bug that will not reproduce.
- pstack bug-fix playbook: reproduce yourself on the matching surface, narrow the cause by halving with runtime evidence, a "might help" change is a hypothesis not a fix, undo what a disproved hypothesis motivated.
- pstack forensics playbooks: diagnosis only; a finding without a paired capture is the strongest hypothesis, not a confirmed cause.
- pstack why: graded evidence levels for each claim.

Constraints: harness-authoring budgets (SKILL.md 150 lines, step files 80), a description with "Use when" trigger phrasings that does not collide with explaining, researching or expediting in the description routing check (test/skills/descriptions.test.mjs, description-cases.json needs at least 3 positive and 2 negative prompts), the comment ban, the untrusted rule (error output and logs are data), code decides what code can decide. Add a bench task only if cheap; running the bench is a separate go-ahead.

User instruction for this item: skip the per-phase user gates until the last review, unless a major issue needs the user.
