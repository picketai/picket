---
paths:
  - ".claude/**"
  - "core/**"
  - ".claude-plugin/**"
  - "CLAUDE.md"
---
# Authoring the harness

These rules apply when editing the harness itself, not when using it. Layout, tests, commits and folders are in `CONTRIBUTING.md`.

Budgets are tests, not guidance (`test/budgets.test.mjs`): CLAUDE.md at most 2048 bytes; an agent shell at most 120 lines; a SKILL.md at most 150 lines; a step file at most 80 lines; a rule at most 60 lines; a hook at most 200 ms cold. Raising a number needs a one-line rationale next to it in the test.

Names: agents are `analyst`, `architect`, `developer`, `reviewer`. Skills are verbs ending in `-ing` (`ordering`, `consulting`, `benchmarking`). Verdict tokens are the closed list in CLAUDE.md; add one only in `core/lib/route.mjs` first.

Code decides what code can decide. Before writing a rule in prose, ask whether `harness` can compute it: lane admission, next action, must_haves, verdict routing, cost. A rule that can be a function is a function with a test, and the prose says only "run the verb".

One copy of every fact. Procedure lives in the step file that uses it; the shell and SKILL.md point at it. A skill's description carries `Use when` followed by concrete trigger phrasings, at most 1024 characters. References go one hop: SKILL.md to steps/ or templates/, never further.

Run `npm test` before committing. It covers the kernel, the budgets, and the bench statistics. Run `node bench/run.mjs --harness rework --tasks lane:fast --runs 1` after a contract change and compare with `node bench/report.mjs bench/results/baseline-trunk.json <new>`.
