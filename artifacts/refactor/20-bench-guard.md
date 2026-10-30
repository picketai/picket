# 20: Benchmarking out of the product, and a spend cap

Status: approved (2026-10-30).

Step 5, fourth standalone item, of the suggested order in `artifacts/reports/instructions-candidates-2026-10-25.md`: D9 as approved on 2026-10-28. `benchmarking` leaves the plugin for a tracked project skill the model never invokes on its own; `bench/run.mjs` refuses a real run without a dollar cap or over it; `harness-authoring.md` stops telling the model to run the bench.

## Today

| Fact | Value |
|---|---|
| Skill | `src/skills/benchmarking/SKILL.md`, 2,613 bytes, listed in `src/.claude-plugin/plugin.json`; its description triggers "after any edit to an agent, skill, hook or CLAUDE.md"; the model invoked it 3 times here, twice from that trigger |
| Package | `package.json` ships `dist/`, so the skill reaches users while `bench/` does not |
| Runner | `bench/run.mjs` has `--dry` and a per-task `--budget-usd`; no total cap. Worst case: $44 for `lane:fast`, $166 for all tasks once, $830 for the 5-run baseline |
| Rule | `.claude/rules/harness-authoring.md:20` says "Run `node bench/run.mjs ... --tasks lane:fast --runs 1` after a contract change"; line 14 names `picket:benchmarking` as a skill name example |
| Tests | `test/repo/skills.test.mjs` keeps `benchmarking` in `UNCONVERTED_SKILLS`; `test/repo/description-cases.json` has a routing case for it; `test/timing/budgets.test.mjs` scans only `src/skills/` |
| Docs | `docs/reference/skills.md` lists `picket:benchmarking` (row and section) |

## Target

### The skill

`.claude/skills/benchmarking/SKILL.md` (tracked; `/benchmarking` in this repository only), with `disable-model-invocation: true` and no "after any edit" trigger. Its procedure gains the cap: a real run always passes `--max-usd`, the value the user gave. The plugin no longer lists it; `src/skills/benchmarking/` goes; its docs entry moves from `docs/reference/skills.md` to `CONTRIBUTING.md`.

### The cap

`bench/run.mjs` refuses a run that is not `--dry` unless `--max-usd <n>` is given, and refuses when the planned spend is over it. The planned spend is each task's budget (`--budget-usd`, else the task's `budget_usd`, else 10) times the runs still to do, so runs already in a resumed results file do not count. Both refusals print the task list and the total in `--dry`'s shape, then exit 1 before any run starts. The planned-spend function is pure and unit tested: refused without a cap, over the cap, exactly at the cap, and resumed (recorded runs left out).

### Tests

The routing case changes to: no plugin skill claims a bench prompt ("run the bench against trunk" ranks no plugin skill as its owner). `UNCONVERTED_SKILLS` becomes empty, and the test keeps its shape for the next exception. The budget test also scans `.claude/skills/`.

### The rule

`harness-authoring.md:20` becomes: after a contract change, offer the fast lane comparison with its worst case, and run it only on the user's answer, with that answer as `--max-usd`. The naming example on line 14 drops `picket:benchmarking`.

## Split

Agents never edit `.claude/`, so the lead writes `.claude/skills/benchmarking/SKILL.md` and the two rule lines, as their own commit before the work item opens, from the text above. The work item owns everything under `src/`, `bench/`, `test/`, `docs/` and `CONTRIBUTING.md`.

## Decisions

- **D-1 The bench is the repository's tool, not the product's.** Users install Picket without `bench/`, so a plugin skill that runs it cannot work for them.
- **D-2 The user starts every spend.** `disable-model-invocation` and the rule's "offer, run on the answer" remove the two paths by which the model started a run on its own.
- **D-3 The cap is code.** A prose "dry-run first" did not hold; a runner that refuses without a cap does.
- **D-4 Resumed runs are not charged twice.** A results file that resumes has already paid for its recorded runs.

## Migration

1. The lead's commit: the project skill and the rule lines.
2. The work item: plugin list, `src/skills/benchmarking/` removed, docs moved, the cap and its tests, the routing case, `UNCONVERTED_SKILLS`, the budget test.

## Risks

- One run makes up to `max_stops + 1` calls, each capped at the task budget, so a planned cap alone does not bound real spend. The user chose a hard cap on 2026-10-30: the runner also keeps a running total, gives each call at most the cap left, and stops the suite when none is left.
- A contributor who knew `/picket:benchmarking` finds `/benchmarking`; `CONTRIBUTING.md` names it.

## Affects

`.claude/skills/benchmarking/SKILL.md` and `.claude/rules/harness-authoring.md` (lead only), `src/.claude-plugin/plugin.json`, `src/skills/benchmarking/` (removed), `bench/run.mjs` and a test under `bench/test/`, `test/repo/{skills.test.mjs,description-cases.json}`, `test/timing/budgets.test.mjs`, `docs/reference/skills.md`, `CONTRIBUTING.md`.

## Open questions

None.
