---
paths:
  - ".claude/**"
  - "src/**"
  - ".claude-plugin/**"
  - "CLAUDE.md"
---
# Authoring the harness

These rules apply when editing the harness itself, not when using it. Layout, tests, commits and folders are in `CONTRIBUTING.md`.

Budgets are tests, not guidance (`test/timing/budgets.test.mjs`): CLAUDE.md at most 2048 bytes; an agent shell at most 120 lines; a SKILL.md at most 150 lines; a step file at most 80 lines; a rule at most 60 lines; a hook at most 200 ms cold. Raising a number needs a one-line rationale next to it in the test.

Names: agents are `analyst`, `architect`, `developer`, `reviewer`. Skills are verbs ending in `-ing` (`picket:ordering`, `picket:consulting`, `picket:debugging`). Verdict tokens are the closed list in CLAUDE.md; add one only in `src/lib/shared/verdicts.mjs` first.

Code decides what code can decide. Before writing a rule in prose, ask whether `picket` can compute it: lane admission, next action, must_haves, verdict routing, cost. A rule that can be a function is a function with a test, and the prose says only "run the verb".

One copy of every fact. Procedure lives in the step file of the skill that uses it; the shell and SKILL.md point at it. A skill's `when_to_use` (or, until it is converted, its description) carries `Use when` followed by concrete trigger phrasings; the description stays at most 1024 characters. References follow the reach table of item 08a (D-008): a skill or its steps cite their own folders and the document kit (`src/skills/documenting/templates/`, `src/skills/documenting/scripts/`); a rule and the output style cite only the document kit; an agent names only the skills in its `skills:` frontmatter, and its messages carry no `step:` line.

A shape one module writes and another reads gets a round-trip test: the test feeds the writer's real output to the reader, never a fixture written for the reader. Prose counts as a writer: a template's example lines (`src/skills/documenting/templates/report.md`) go through the code that parses them, such as `lint.schema`. Example: the summary found an item's commits by the work folder that `commitOwned` was assumed to add, so its test commits through `commitOwned` without that folder and expects the summary to find the commit.

Run `npm test` before committing. It covers the kernel, the budgets, and the bench statistics. After a contract change, offer the fast lane comparison (`/benchmarking`, `--tasks lane:fast --runs 1`, worst case $44) and run it only on the user's answer, with the cap they name as `--max-usd`; compare with `node bench/report.mjs bench/results/baseline-trunk.json <new>`.
