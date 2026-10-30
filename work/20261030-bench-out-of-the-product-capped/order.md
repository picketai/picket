---
kind: order
lane: order
title: Bench out of the product, capped
date: 2026-10-30
audience: developer
sources: [request.md, artifacts/refactor/20-bench-guard.md, .claude/skills/benchmarking/SKILL.md, src/.claude-plugin/plugin.json, src/skills/benchmarking/SKILL.md, docs/reference/skills.md, CONTRIBUTING.md, test/repo/skills.test.mjs, test/repo/descriptions.test.mjs, test/repo/description-cases.json, test/repo/plugin-layout.test.mjs, test/repo/docs.test.mjs, test/support/routing.mts, test/timing/budgets.test.mjs, scripts/test.mjs, bench/run.mjs, bench/README.md, bench/adapters/plugin.mjs, bench/test/metrics.test.mjs, bench/tasks/]
phases:
  - n: 1
    files: [src/.claude-plugin/plugin.json, docs/reference/skills.md, CONTRIBUTING.md, test/repo/skills.test.mjs, test/repo/descriptions.test.mjs, test/repo/description-cases.json, test/repo/plugin-layout.test.mjs, test/timing/budgets.test.mjs]
    greps:
      - path: src/.claude-plugin/plugin.json
        pattern: '^(?![\s\S]*benchmarking)'
        flags: i
      - path: docs/reference/skills.md
        pattern: '^(?![\s\S]*benchmarking)'
        flags: i
      - path: CONTRIBUTING.md
        pattern: '^## Benchmarking\b'
      - path: CONTRIBUTING.md
        pattern: '\.claude/skills/benchmarking/SKILL\.md'
      - path: CONTRIBUTING.md
        pattern: '--max-usd'
      - path: test/repo/skills.test.mjs
        pattern: 'const UNCONVERTED_SKILLS = \[\]'
      - path: test/repo/description-cases.json
        pattern: '^(?![\s\S]*benchmarking)'
        flags: i
      - path: test/repo/description-cases.json
        pattern: '"walk me through how admit picks a lane", "owner": "explaining"'
      - path: test/repo/descriptions.test.mjs
        pattern: 'no plugin skill claims a bench prompt'
      - path: test/repo/plugin-layout.test.mjs
        pattern: '\.claude/skills/benchmarking/SKILL\.md'
      - path: test/repo/plugin-layout.test.mjs
        pattern: '\.length, 16\)'
      - path: test/timing/budgets.test.mjs
        pattern: 'join\(ROOT, "\.claude", "skills"\)'
    tests: true
    drive: false
  - n: 2
    files: [bench/lib/spend.mjs, bench/test/spend.test.mjs, bench/run.mjs, bench/README.md]
    greps:
      - path: bench/lib/spend.mjs
        pattern: 'export function taskBudget\b'
      - path: bench/lib/spend.mjs
        pattern: 'export function plannedSpend\b'
      - path: bench/lib/spend.mjs
        pattern: 'export function spendRefusal\b'
      - path: bench/run.mjs
        pattern: 'from "\./lib/spend\.mjs"'
      - path: bench/run.mjs
        pattern: '"--max-usd"'
      - path: bench/run.mjs
        pattern: '^(?![\s\S]*--runs 5 --out bench/results/trunk\.json)'
        flags: i
      - path: bench/test/spend.test.mjs
        pattern: 'leaves recorded runs out of a resumed plan'
      - path: bench/README.md
        pattern: '--max-usd'
    tests: true
    drive: true
  - n: 3
    files: [bench/lib/spend.mjs, bench/test/spend.test.mjs, bench/run.mjs, bench/README.md]
    greps:
      - path: bench/lib/spend.mjs
        pattern: 'export function openLedger\b'
      - path: bench/lib/spend.mjs
        pattern: 'export function charge\b'
      - path: bench/lib/spend.mjs
        pattern: 'export function capLeft\b'
      - path: bench/lib/spend.mjs
        pattern: 'export function callLimit\b'
      - path: bench/run.mjs
        pattern: 'callLimit\('
      - path: bench/run.mjs
        pattern: '^(?![\s\S]*maxBudgetUsd: taskBudget)'
        flags: i
      - path: bench/run.mjs
        pattern: 'cap reached: spent \$'
      - path: bench/test/spend.test.mjs
        pattern: 'limits a call to the cap left'
      - path: bench/test/spend.test.mjs
        pattern: 'stops the suite when no cap is left'
      - path: bench/test/spend.test.mjs
        pattern: 'leaves a resumed file.s recorded cost out of the cap'
    tests: true
    drive: true
---
# Order: Bench out of the product, capped

## Problem

`picket:benchmarking` ships in the plugin, so the model can start bench spend on its own (it did, three times), and users get a skill that runs `bench/`, which the npm package does not carry. The lead's commit 7ba21a4 added the tracked project skill `.claude/skills/benchmarking/SKILL.md` and the rule lines; this item takes the skill out of `src/`, moves its docs entry, and makes `bench/run.mjs` refuse a real run without a dollar cap or over it. Base 7ba21a4 has one red test, `.claude/ tracks no skills, agents or output styles` in `test/repo/plugin-layout.test.mjs`, which that commit broke, so phase 1 fixes it before anything else runs `npm test`.

## Decisions

### D-001 (r2): Planned and actual spend are pure functions that the runner and its tests share
**Decision:** a new `bench/lib/spend.mjs` exports three pure functions. `taskBudget(task, budgetUsd)` returns `budgetUsd ?? task.budget_usd ?? 10`, so the cap and the per-call limit read one expression. `plannedSpend({ tasks, runs, budgetUsd, records })` returns `{ rows, total }`: one row per task with `id`, `lane`, `budget` and `runs` (the run numbers 1 to `runs` that no record with the same `task` and `run` holds), and `total` as the sum of `budget × runs`. `spendRefusal(maxUsd, total)` returns `null` or the reason text. The planned check stays the first gate.

The user chose a hard cap on actual spend (2026-10-30): one run makes up to `max_stops + 1` calls, so the planned total alone does not bound it. The same module adds a ledger, a plain object `{ maxUsd, spentUsd }`, with four pure functions: `openLedger(maxUsd)` starts at `spentUsd: 0` and takes no records, so a resumed file's recorded cost never counts against the new cap; `charge(ledger, usd)` returns a new ledger; `capLeft(ledger)` returns the dollars left in whole cents (D-003), never below 0; `callLimit(ledger, budgetUsd)` returns `null` when `capLeft` is 0, else `min(budgetUsd, capLeft)`. Before every `claude -p` call `runOnce` passes `callLimit(ledger, taskBudget(task, args.budget))` as `maxBudgetUsd`. After the call it charges `res.total_cost_usd`. A call that ends with no result event is charged its whole limit, because its real cost is unknown. `main()` keeps the ledger across the suite: it checks `callLimit` before starting a run, and `runOnce` checks it before each gate reply. On `null` the suite stops before the call. It records nothing for a run that has not finished, prints `cap reached: spent $<spent> of --max-usd $<cap>; re-run with a new --max-usd to resume`, and exits 3, the code for a resumable stop that the quota stop already uses. `done` reports the ledger's `spentUsd`.
**Instead of:** the functions inside `bench/run.mjs`: it calls `main()` at import, so a test cannot import it without starting a run. For the hard cap, the strongest alternative was `max_stops + 1` times the budget in the plan: it bounds the spend without a ledger, but it inflates every plan about ninefold and refuses runs the user can afford.
**Risks:**
- **RISK-001** `runOnce` keeps its own budget expression and drifts from the plan. Mitigation: grep criteria name `taskBudget` and `callLimit` in `bench/run.mjs` and forbid `maxBudgetUsd: taskBudget`.
- **RISK-005** `--max-budget-usd` is checked by Claude Code between turns, so the last call can pass its limit by one turn (about $0.75 of prompt cache). Mitigation: the overshoot is charged, so the suite stops at the next check; the cap holds to within one turn.
- **RISK-006** A run stopped mid-way by the cap is lost and its spend with it; a resume runs it again from the start. Mitigation: the message says how much was spent, and a partial run is not a measurement.

### D-002: The plan is read and checked before anything is built or written
**Decision:** `main()` reads the `--out` file's records (when the file exists) before the `--dry` branch, computes the plan once, and prints it in one shape for both uses: a row `  <id> [<lane>] budget $<budget> × <runs to do>` per task, then `  planned $<total, two decimals> for <n> run(s)`. `--dry` prints it and returns. A real run with a refusal prints the same lines, writes `refused: <reason>` to stderr, sets exit code 1 and returns before `adapter.build`, `mkdirSync` and the first `save()`. `--max-usd` parses with `Number`; a missing flag, `NaN` or a negative value gets the reason "a real run needs --max-usd <dollars>"; a plan over the cap gets "planned $<total> is over --max-usd $<cap>".
**Instead of:** checking inside the run loop: the first refused task would come after `npm run build` and after the results file was written.
**Risks:**
- **RISK-002** `--dry` output changes shape (runs and a total line) and now reads `--out`. Mitigation: no code parses it; `bench/README.md` shows the new form.

### D-003: The cap compares whole cents
**Decision:** `spendRefusal` compares `Math.round(total * 100)` with `Math.round(maxUsd * 100)`, so a plan of three runs at $0.10 is exactly at a $0.30 cap and passes.
**Instead of:** a plain float compare: `0.1 * 3` is `0.30000000000000004` and would refuse a plan that is at the cap.

### D-004: "No plugin skill claims a bench prompt" is a vocabulary check
**Decision:** `test/repo/descriptions.test.mjs` gains the test `no plugin skill claims a bench prompt`: for the prompts "run the bench against trunk" and "benchmark the plugin and compare it with the baseline", the prompt's terms (through `terms` from `test/support/routing.mts`) that are in `BENCH_TERMS = ["bench", "benchmark", "baseline", "trunk"]` have no weight in the routing model (`MODEL.idf.has(term)` is false for each). Measured on 7ba21a4 with `benchmarking` left out of the model: none of the four terms appears in any other skill's description or `when_to_use`.
**Instead of:** a ceiling on the top cosine score: the generic words ("run", "against") give every prompt a small score (0.145 for `reviewing` today), so any ceiling is a guess that moves with unrelated descriptions.
**Risks:**
- **RISK-003** A future skill that says "trunk" for a good reason fails the test. Mitigation: the failure names the term, and `BENCH_TERMS` is where that is argued.

### D-005: The `.claude/` tracking test pins the project skills
**Decision:** the test in `test/repo/plugin-layout.test.mjs` becomes `.claude/ tracks no agents or output styles, and only the project skills`: `git ls-files -- .claude/agents .claude/output-styles` is empty, and `git ls-files -- .claude/skills` lists exactly `.claude/skills/benchmarking/SKILL.md`. The skill count in `a folder under skills/ without a SKILL.md is not a skill` goes from 17 to 16.
**Instead of:** dropping `.claude/skills` from the check: an untracked plugin skill copied into `.claude/` would then pass unnoticed.
**Risks:**
- **RISK-004** Each new project skill edits the test. Mitigation: that is the point; a project skill is a deliberate choice.

## Scope
**In:**
- `src/.claude-plugin/plugin.json` and `src/skills/benchmarking/` (removed); the docs entry from `docs/reference/skills.md` to `CONTRIBUTING.md`
- the routing case, `UNCONVERTED_SKILLS`, the `.claude/` tracking test and skill count, the budget test scanning `.claude/skills/`
- `bench/lib/spend.mjs`, its tests, `bench/run.mjs` refusing without or over `--max-usd`, `bench/README.md` commands
- the hard cap on actual spend: each call limited to the cap left, the suite stopping at zero (phase 3)

**Out:**
- editing `.claude/` (7ba21a4 holds the project skill and the rule lines)
- running the bench for real, at any cap
- `CHANGELOG.md`; the move of development's memory

## Phase 1: Benchmarking leaves the plugin
**Touch set:**
- `src/.claude-plugin/plugin.json`: drop the skill entry
- `src/skills/benchmarking/`: deleted
- `docs/reference/skills.md`: drop row and section
- `CONTRIBUTING.md`: new Benchmarking section
- `test/repo/skills.test.mjs`: empty `UNCONVERTED_SKILLS`
- `test/repo/description-cases.json`: drop case, replace negative
- `test/repo/descriptions.test.mjs`: bench prompt test
- `test/repo/plugin-layout.test.mjs`: tracking test, count 16
- `test/timing/budgets.test.mjs`: scan `.claude/skills/`
- `test/support/routing.mts`: read only, `terms`
**Changes:** Remove `"./skills/benchmarking"` from `plugin.json` and delete `src/skills/benchmarking/SKILL.md` with `git rm`; the block lists the old path. In `docs/reference/skills.md` delete the `picket:benchmarking` table row and its `## picket:benchmarking` section. In `CONTRIBUTING.md` add `## Benchmarking` before `## Folders outside the product`: the suite under `bench/` measures Picket itself (pass rate, lane agreement, cost, time to first reviewable output, stops, cache hit ratio); `/benchmarking` reaches it in this repository only (`.claude/skills/benchmarking/SKILL.md`), the model never starts it; `bench/` is not in the npm package; every real run passes `--max-usd` and `bench/run.mjs` refuses one without it or over it; `bench/README.md` has the commands. Cite no ignored path such as the spend log. In `skills.test.mjs` set `const UNCONVERTED_SKILLS = []` and keep the `.map` and `PENDING` wiring. In `description-cases.json` delete the `benchmarking` entry, and in the `inspecting` entry replace the negative owned by `benchmarking` with `{ "prompt": "walk me through how admit picks a lane", "owner": "explaining" }` (it ranks `explaining` first and `inspecting` eleventh on 7ba21a4; the share stays 62 of 64). Add the D-004 test to `descriptions.test.mjs`, importing `terms`. Apply D-005 to `plugin-layout.test.mjs`. In `budgets.test.mjs` add `SKILL_FOLDERS = [join(ROOT, "src", "skills"), join(ROOT, ".claude", "skills")]` beside `RULE_FOLDERS` and run the SKILL.md line budget and `overStepBudget` over both; `skillDescriptions` stays plugin-only because routing reads it.
**Done when:**
- **T-1.1** `src/skills/benchmarking/` no longer exists, and neither `src/.claude-plugin/plugin.json` nor `docs/reference/skills.md` contains `benchmarking`.
- **T-1.2** `CONTRIBUTING.md` has `## Benchmarking`, naming `/benchmarking`, `.claude/skills/benchmarking/SKILL.md`, `bench/README.md` and `--max-usd`.
- **T-1.3** `test/repo/description-cases.json` has no `benchmarking` entry or owner, and `descriptions.test.mjs` has `no plugin skill claims a bench prompt`, which passes.
- **T-1.4** `UNCONVERTED_SKILLS` is `[]` and every `PENDING.* names exactly the files that fail its check` test passes.
- **T-1.5** The renamed `.claude/` tracking test and the count of 16 pass; `budgets.test.mjs` walks `.claude/skills/` for the SKILL.md and step budgets.
- **T-1.6** `npm test` passes, the plugin-layout test that is red on 7ba21a4 included.

## Phase 2: The runner refuses without a cap or over it
**Touch set:**
- `bench/lib/spend.mjs`: new, pure plan functions
- `bench/test/spend.test.mjs`: new, the four cases
- `bench/run.mjs`: `--max-usd`, plan, refusal
- `bench/README.md`: commands carry `--max-usd`
- `bench/test/metrics.test.mjs`: read only, test style
**Changes:** Create `bench/lib/spend.mjs` per D-001 and D-003, no comments. In `bench/run.mjs`, `parseArgs` gains `maxUsd: null` and `--max-usd`; `runOnce` uses `taskBudget(task, args.budget)`; `main()` follows D-002. Delete the usage example in the header comment (the `//` line and the `node bench/run.mjs ... --runs 5 --out bench/results/trunk.json` line), which the cap makes stale; keep the rest of the header. Create `bench/test/spend.test.mjs` with `node:test` and `node:assert/strict`, fixture tasks `{ id: "fast-a", lane: "fast", budget_usd: 5 }` and `{ id: "order-b", lane: "order" }`: `refuses a real run without --max-usd` (`spendRefusal(null, 9)` and `spendRefusal(NaN, 9)` name `--max-usd`); `refuses a plan over the cap` (`spendRefusal(24.99, 25)`, cap $24.99 and plan $25, names `$25.00` and `$24.99`); `allows a plan exactly at the cap` (three runs at `budgetUsd` 0.1, cap 0.3, gives `null`); `leaves recorded runs out of a resumed plan` (runs 2, records `[{ task: "fast-a", run: 1 }]`: rows `fast-a` 1 run at $5 and `order-b` 2 runs at $10, total 25; with `budgetUsd` 3 the total is 9). In `bench/README.md` the two real-run commands gain `--max-usd 10` and `--max-usd 900`, and `## Cost of running it` says a real run without `--max-usd`, or with a plan over it, is refused and prints the plan.
**Done when:**
- **T-2.1** The four tests in `bench/test/spend.test.mjs` pass under `npm run bench:test`, and `npm test` passes.
- **T-2.2** `node bench/run.mjs --harness plugin --tasks lane:fast --runs 1 --dry --out <temp>/r.json` prints one row per fast task and `planned $44.00 for 8 run(s)`, and spends nothing.
- **T-2.3** `node bench/run.mjs --harness plugin --tasks fast-03-rename --runs 0 --out <temp>/r.json` exits 1, prints the row, the planned line and `refused:` naming `--max-usd`, and `<temp>/r.json` does not exist afterwards. `--runs 0` keeps the drive from spending even if the guard were broken; the over-cap path is proven by T-2.1 only, so no drive risks a run.
- **T-2.4** `bench/run.mjs` imports `taskBudget`, `plannedSpend` and `spendRefusal` from `./lib/spend.mjs` and contains no other `?? 10` budget fallback.
- **T-2.5** `bench/README.md` shows `--max-usd` on every real-run command.

## Phase 3: The cap bounds what the suite actually spends
**Touch set:**
- `bench/lib/spend.mjs`: ledger, `capLeft`, `callLimit`
- `bench/test/spend.test.mjs`: the three running-cap cases
- `bench/run.mjs`: ledger through `main` and `runOnce`
- `bench/README.md`: the cap is hard
- `bench/lib/claude.mjs`: read only, `--max-budget-usd`
**Changes:** Add `openLedger`, `charge`, `capLeft` and `callLimit` to `bench/lib/spend.mjs` per D-001 (r2), with no comments, and reuse `cents` from D-003. In `bench/run.mjs`, `main()` opens the ledger after the refusal check. Before each unrecorded run it calls `callLimit` and stops the suite on `null` (D-001 (r2) message, exit 3, nothing recorded, no fixture materialized). It passes the ledger to `runOnce`, which returns `{ record, ledger }`. In `runOnce`'s step loop, each call gets `maxBudgetUsd: callLimit(...)`. A `null` before a gate reply sets `record.terminal = "cap"` and breaks, so cleanup and the orphan sweep still run. A call is charged `res.total_cost_usd ?? 0`, or its whole limit when there is no result event. `main()` treats `terminal === "cap"` like the quota stop: no record, the message, exit 3. The `spent` counter gives way to the ledger, and `done` prints `ledger.spentUsd`. Calls of a suspended run count too. In `bench/test/spend.test.mjs` add three tests: `limits a call to the cap left` (`callLimit(charge(openLedger(10), 7.5), 5)` is 2.5; with 2 spent it is 5); `stops the suite when no cap is left` (`callLimit` is `null` at 10 spent, at 10.004 spent, and at 12 spent, where `capLeft` is 0); `leaves a resumed file's recorded cost out of the cap` (records with `cost_usd` summing 30, `plannedSpend` with cap 10 for one unrecorded $5 run passes, and `callLimit(openLedger(10), 5)` is 5). In `bench/README.md`, `## Cost of running it` says each call is limited to the task budget or the cap left, whichever is lower, that the suite stops when nothing is left and can be resumed with a new cap, and that the last call can pass the cap by about one turn.
**Done when:**
- **T-3.1** The three new tests pass under `npm run bench:test`, the earlier spend tests still pass, and `npm test` passes.
- **T-3.2** Every `maxBudgetUsd` in `bench/run.mjs` is the value `callLimit(...)` returned for that call, and the file contains no `maxBudgetUsd: taskBudget`.
- **T-3.3** `bench/run.mjs` checks `callLimit` before a run starts and before each gate reply. A `null` stops the suite with exit 3 and prints `cap reached: spent $` and `--max-usd`. The run is not pushed to the records.
- **T-3.4** A call with no result event charges the ledger with its whole limit.
- **T-3.5** Drive, after T-3.1 passes: `node bench/run.mjs --harness plugin --tasks fast-03-rename --runs 1 --budget-usd 0.001 --max-usd 0 --out <temp>/r.json` passes the planned gate ($0.001 rounds to 0 cents), exits 3 with `cap reached: spent $0.00 of --max-usd $0.00` before any `claude` call, and leaves `<temp>/r.json` with no records. If the stop were broken, the worst case is one call limited to $0.001, which Claude Code ends after its first turn.
- **T-3.6** `bench/README.md` states the per-call limit, the stop at zero and the one-turn overshoot.

## Open questions
none

## Revision log
- 2026-10-30: D-001 (r2): ledger limits each call to the cap left and stops the suite at zero; the user chose a hard cap on actual spend.
