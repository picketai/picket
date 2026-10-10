# Rework plan: a harness built for speed, measured from day one

Written 2026-09-07 on branch `rework`. Status: built, measured and tuned; see section 4 (updated 2026-09-11).

## 1. What the research says

### 1.1 Where the current harness spends time and money (measured)

| Fact | Number | Source |
|---|---|---|
| Wall-clock spent waiting on the user | ~80% of a working session | host ledger, session 766c4c44 |
| Median user stop | ~2 min, with 5 to 30 min away-gaps that cost more than all model time | same |
| Contract text loaded on turns and spawns | 317 KB across CLAUDE.md, agents, assets, skills | `wc -c`, trunk today |
| Fixed load of one developer spawn | ~100 KB (~25k tokens) before plan, memory, source | `wc -c` on the spawn set |
| CLAUDE.md alone, on every turn of every agent | 29 KB | trunk today |
| Cache reads vs output tokens (host, all sessions) | 3.34 B cache-read vs 13.2 M output | host `report.mjs` |
| Cross-check catches drift | ~30% of chains | reviewer memory, 30 chains |
| Cumulative review requires changes | ~35% of chains | same |
| Hook cold start | ~100 ms per call | measured locally |

Three conclusions. The unit of latency is the user stop, not the model turn. Cost is dominated by re-reading a large static prefix, so cache hit ratio and prefix size are the cost levers. The two review gates earn their keep and must stay, but nothing says they must sit on the critical path.

### 1.2 What the other harnesses do that we should copy

Verified in source under `.opensrc/` (details in the mining report from this session):

- **Numeric admission gates for a fast lane** (GSD `fast.md`: ≤3 file edits, no new deps, no research; names the escalation target).
- **Ceremony as opt-in flags**, not opt-out (GSD `quick --validate --research`).
- **State in a regex-parseable file** (`active_phase`, `next_action`, `progress.percent`) read by the status line and by a resumed session without history replay (GSD STATE.md).
- **"File exists means done", three states only** (OpenSpec `detectCompleted`).
- **Typed mutation verbs with golden parity tests**; agents never hand-edit state (GSD sdk).
- **Goal-backward `must_haves` carried planner → executor → verifier** (GSD).
- **Context monitor hook with constants** (35% warn, 25% critical, 5-call debounce) and **stall detection** (5 reads with no write; issue count not decreasing between rounds).
- **CI-enforced prompt size budgets** (GSD `agent-size-budget.test.cjs`).
- **HARD/SOFT evaluators with an optional judge** and `--no-judge` (shotgun evals).
- **Honest per-call cost printing** (task-master `_calculateCost`).

Not copied: 1800-line workflow files, menus at every step, unvalidated round-number caps, estimated token counts, wide-open permission lists.

### 1.3 What the platform gives us now (Claude Code 2.1.261)

Confirmed against docs: hook events incl. `SubagentStart/Stop`, `PostToolUseFailure`, `PermissionRequest`, `FileChanged`, `PreCompact`; hook handler types `command`, `prompt`, `agent`, async hooks; skills with `context: fork`, `!`cmd`` dynamic injection, `allowed-tools`; `.claude/rules/` with path-scoped frontmatter; agent frontmatter `model`, `effort`, `isolation: worktree`, `maxTurns`, `memory`; `claude -p --output-format json` with `total_cost_usd`, `num_turns`, `duration_ms`, `duration_api_ms`, `modelUsage`; `--json-schema` structured output; status line JSON with `prompt_cache.hit_ratio` and `last_miss_cause`; OTEL export with `cost.usage` by `agent.name`; Workflow tool with `agent()/parallel()/pipeline()` and shared-prefix caching across fanned agents; `promptCacheTtl: 1h`.

Unconfirmed and treated as absent: hook stdin timing fields (we stamp receipt time ourselves), a time-to-first-token metric (we use time-to-first-reviewable instead).

## 2. The design

### 2.1 Five principles

1. **Code decides, the model fills.** Every decision computable from files (lane admission, pre-flight, next phase, verdict routing, state transitions) is a CLI verb returning JSON. The model never re-derives it.
2. **The filesystem is the state machine.** One directory per work item; a small `state.yaml`; closed status vocabulary; `next_action` computed, never remembered.
3. **The always-on contract is tiny.** CLAUDE.md under 2 KB. Rules scoped by path in `.claude/rules/`. Everything else is read at the step that needs it.
4. **No mechanical hop passes through a person or a lead turn.** Exact-match verdicts are routed by hooks and scripts. The lead spawns and stops only at genuine user gates.
5. **Measured from the first commit.** The benchmark runner lands before the harness does, and runs against the trunk harness first so every later change has a number to beat.

### 2.2 Lanes

Admission is computed by `harness admit` from the request plus a cheap touch-set probe. Any failed condition escalates one lane up and says why.

| Lane | Admission (all must hold) | Who runs it | Artifacts | Gates |
|---|---|---|---|---|
| **fast** | ≤3 files, single repo, no security path, no schema/migration, no new dependency, no open design question | main session, no spawn | none (ledger row only) | tests + lint + craft lint, then done. No chatter. |
| **order** | ≤3 phases, ≤5 local decisions, no security path, no `[IRREVERSIBLE]`, no cross-context contract change | architect writes one work order; developer executes | one file: `work/<id>/order.md` (decisions inline, phases, must_haves) | per-phase user gate with a run offer; cumulative review (sonnet) at end. No cross-check. |
| **design** | everything else | architect, developer, reviewer | `work/<id>/design.md` + `state.yaml` | architect emits decisions + Phase 1 first; developer starts Phase 1 while the cross-check runs **concurrently**; DRIFT stops the phase. Cumulative review (opus) at end. |
| **research** | a question, not a change | analyst | `work/<id>/report.md` | outline first (one turn, reviewable), deep pass only after the user nods or stays silent past a timeout flag. |

Strategic discussion (the old consultant) becomes the main-session skill `consulting`: a conversation with a teammate costs a relay hop per reply, which is the opposite of snappy.

### 2.3 Roles (4 agents, lead + teammates shape kept)

| Agent | Job | Default model | Tools |
|---|---|---|---|
| `analyst` | ingest code/docs/tickets, write reports, maintain the project map | sonnet (opus for fresh large ingests) | read-only + Write to `work/*/report.md` |
| `architect` | work orders, design records, amendments in place | opus, effort high | read + Write to `work/*/{order,design}.md` |
| `developer` | implement phases, verify by driving, commit | opus | full, write scope = phase touch set |
| `reviewer` | concurrent cross-check, cumulative review | sonnet when no threshold tripped, else opus | read-only |

Agents are shells of ≤120 lines. Procedure lives in step files loaded one at a time by the skill that owns the lane.

### 2.4 The kernel: `harness` CLI

`node .claude/bin/harness.mjs <verb> [--json]`, tested with golden-output tests.

- `admit <request-file>` → lane + reasons.
- `preflight <work-id>` → inputs exist, tree clean, branch sane, detectors, blockers. Zero LLM.
- `state get|advance|block|stamp <work-id>` → the only way state changes; Zod-validated.
- `next <work-id>` → the single next action and who does it.
- `verify <work-id> <phase>` → must_haves checked against the tree and the drive log.
- `drive --hit "GET /path" | --run "<cmd>"` → starts the app on a free port, hits it, stops it, writes the evidence row. Zero permission prompts.
- `route <verdict>` → what a verdict means for the state machine (used by the SubagentStop hook).
- `cost` → session cost, cache hit ratio, tokens per accepted line, from the ledger.

### 2.5 Hooks (fewer, sharper, all with JSON envelopes)

| Event | Hook | Does |
|---|---|---|
| SessionStart | inject.state | first 20 lines of the active `state.yaml` and `next_action`, nothing else |
| PreToolUse Write/Edit | guard.scope | write roots by agent and lane; read-before-edit guard |
| PreToolUse Bash | guard.bash | keep the current evaluator (it works), add `harness` verbs to the allow list |
| PostToolUse * | monitor.context | context tiers (warn/critical), stall detector, re-read counter |
| PostToolUse Bash | observe.drive | keep the drive-evidence log |
| PostToolUse Write/Edit | lint.schema | Zod check on `state.yaml`, order/design frontmatter, must_haves |
| Stop / SubagentStop | guard.block | output block legal and within budget (keep, simplify) |
| Stop / SubagentStop | route.verdict | record the verdict, advance state, emit the next action; the lead reads one line |
| Stop / SubagentStop | emit.ledger | ledger v2 row: agent, lane, work id, duration, verdict, tool counts, re-reads, bounces, first-reviewable stamp |
| Notification / gate | notify | PushNotification at user gates only |

### 2.6 UX

- **Status line**: `lane · work-id · phase 2/3 · next: approve · ctx 41% · $1.20 · cache 0.93`.
- **Gate packet**: every stop is one message: what happened, what changed, one question, bracket options (`[a] approve · [r] run through 3 · [x] reject: <why>`). Never two stops in a row.
- **`/next`** shows the computed next action; **`/status`** the state table; **`/resume <id>`** re-enters from `state.yaml` with no history replay.
- Fast lane prints the result and stops. No routing suggestions.

### 2.7 Skills

Skill names are verbs ending in `-ing`. Every skill is a `SKILL.md` of at most 150 lines with a `<capability>. Use when <triggers>.` description, plus `steps/NN-<name>.md` files (≤80 lines each, loaded one at a time) and templates read on demand. References go one hop deep, never further. A `skills index` test asserts that every skill is reachable by exactly one route (auto-loaded, deferred, or user-only) and within budget.

| Skill | Route | Runs in | Does |
|---|---|---|---|
| `expediting` | model + user | main session | The fast lane, rewritten around `harness admit`: the five-condition gate becomes code, the skill carries only the run loop, and refuses by naming the lane to use instead. |
| `ordering` | model + user | main session, spawns architect then developer | The order lane. Step files carry the work-order template, the phase loop, the run offer, the cumulative review hand-off. |
| `designing` | model + user | main session, spawns architect, developer, reviewer | The design lane. Decisions + Phase 1 first, concurrent cross-check, in-place amendments. |
| `researching` | model + user | main session, spawns analyst | The research lane. Outline turn first, deep pass second. |
| `consulting` | model + user | main session, no spawn | Strategic and DDD discussion with a recommendation. Writes charters, SDRs and glossary entries through `documenting` only when asked. |
| `understanding` | user | main session | Structured questioning against the glossary and code. Re-cut to budget, behaviour unchanged. |
| `documenting` | auto-loaded on analyst and architect; user | any | Rewritten as a ~60-line registry for report, order, design record, charter, SDR, glossary, API doc. Filename derivation, stamping and template validation move to `harness` verbs; templates gain machine-checked frontmatter and lose prose rules. |
| `reviewing` | auto-loaded on reviewer | reviewer | Rewritten: size class and framework detection move to `harness verify`; the skill keeps the checklists as step files loaded per size class. |
| `ticketing` | deferred; user | analyst or main session | Jira pull, create, update, draft. Re-cut to budget with step files; templates unchanged. |
| `branching` | deferred; user | main session or developer | Worktree create, resume, list, remove. Manifest lifecycle and worktree survey become tested `harness` verbs; SKILL.md drops to the operation table and safety rules. |
| `proofreading`, `summarizing` | user only | main session | Re-cut to budget, behaviour unchanged. |
| `benchmarking` | user | main session | `run`, `baseline`, `check`, `report`: drives the golden suite and prints the metric table. |
| `resuming` | user | main session | `/resuming <work-id>`: re-enter a work item from its state file, print the gate packet for the current position. |
| `inspecting` | user | main session | Status table, computed next action, session cost and cache ratio from `harness cost`. |

**Every existing skill is rewritten**, not carried over: the new budgets, the step-file layout and the code-decides principle apply to all fourteen, and each gets a golden task in the bench so the re-cut is measured rather than assumed.

Lane skills use `!`harness admit`` and `!`harness state get`` dynamic injection so the first turn already holds the lane decision and the state as JSON, instead of spending a tool call to fetch them. The developer carries no auto-loaded skill: the lane skill hands it the step file path it needs for the phase.

### 2.8 Benchmarks (the requirement)

**Telemetry, free, every session** (ledger v2 + OTEL file exporter):

| Metric | Property | Definition |
|---|---|---|
| cost per work item, by agent | cost | `total_cost_usd` and OTEL `cost.usage{agent.name}` |
| cache hit ratio + last miss cause | cost | status line `prompt_cache` fields |
| tokens per accepted line | efficiency | all token types / lines added on approved phases |
| hook bounce rate | efficiency | Stop bounces + guard blocks / turns |
| interruptions per work item | predictability | permission prompts + questions |
| time to first reviewable | performance | first artifact write or first gate minus start, p50/p90 |
| stops per work item | performance | Stop events at user gates |

**Golden suite, scripted** (`bench/`): fixture repo at a pinned SHA, fresh worktree per run, 14 tasks (6 fast, 4 order, 2 research, 2 gate-trippers: one security path, one migration), N=5 runs each via `claude -p --output-format json` with the harness loaded explicitly. Reports pass@1 **and** pass^5, route agreement (same lane, same verdicts), structural pass (artifacts validate), cost mean and coefficient of variation, duration p50/p90, TTFR. Regression rule: a drop in pass^5 or a rise in bounce rate beyond two standard errors fails `npm run bench:check`.

**Static budgets, in `npm test`**: CLAUDE.md ≤2 KB, agent shell ≤120 lines, skill body ≤150 lines, step file ≤80 lines, hooks ≤200 ms cold. A raise needs a written rationale in the test file.

**Baseline first**: the suite runs against the trunk harness before anything else lands, so the rework is judged against numbers, not against feel.

## 3. Build plan

Each phase is one or more commits on `rework`, benchmarks re-run at the end of each.

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | `bench/` runner, fixture repo, 14 golden tasks, ledger v2 schema | baseline numbers for trunk recorded in `bench/results/baseline-trunk.json` |
| 1 | `harness` CLI with `admit/preflight/state/next/verify/route/cost`, Zod schemas, golden tests, size-budget tests | `npm test` green; every verb has a parity test |
| 2 | Contract: 2 KB CLAUDE.md, `.claude/rules/`, 4 agent shells, lane skills with step files, templates | `harness admit` routes all 14 golden tasks to the intended lane |
| 3 | Hooks per 2.5, settings.json, permissions | bounce rate and guard blocks visible in the ledger; no hook over 200 ms |
| 4 | UX: status line, gate packets, `/next` `/status` `/resume`, notifications | one stop per gate on every golden order/design task |
| 5 | Full bench run new vs trunk; tune thresholds from the numbers; README | report published; every metric in 2.7 has before/after |

## 4. Status (updated 2026-09-11)

| Phase | State | Evidence |
|---|---|---|
| 0 bench | landed (1316d88) | `bench/` runner, LedgerLite fixture, 14 tasks, 10 hidden test sets; `selfcheck.mjs` proves every hidden set fails on the untouched fixture; trunk baseline: 14 tasks at N=1 in `bench/results/baseline-trunk.json` |
| 1 kernel | landed (4bc24a2, 4929fb4) | `harness` CLI: admit, new, list, state, set, next, preflight, verify, route, review-summary, cost, find-verdict, drive, check; 33 kernel tests |
| 2 contract | landed (d8d4f90) | CLAUDE.md 1.5 KB; 4 rules; 4 agents ≤120 lines; 14 skills with step files; budgets test green |
| 3 hooks | landed (c563f09) | 9 hooks, 7 hook tests, all under 200 ms cold; ledger v2 rows verified in a bench run |
| 4 UX | landed with 3 | gate packets in the lane skills, `/resuming`, `/inspecting`, `statusline.mjs`; notifications are in the step files |
| 5 bench head-to-head | done (2026-09-14) | clean run at a380774 in `bench/results/rework-clean.json`: 26/26, no re-runs except two host-suspension kills and one grader rewrite (section 4.2); tuning-era | 14 tasks both harnesses; rework fast lane at N=3, heavier lanes at N=1; report in `bench/results/comparison.md`; three tuning rounds (4929fb4, 3c82928, 56379b6), each re-run on the tasks it touched; $201 of bench spend in total |

### 4.1 Head-to-head during tuning, 2026-09-11 (superseded by 4.2)

Trunk at 18adac4, rework at 4929fb4, same fixture commit, same scripted approver, Claude Code 2.1.263 to 2.1.268. Full tables: `bench/results/comparison.md`.

| metric (14 tasks) | trunk | rework | read |
|---|---|---|---|
| pass@1 | 93% | 100% | trunk answered research-11 in chat and wrote no report |
| lane as intended | 57% | 100% | trunk sent all four order tasks through its expedited path, no plan, no gates |
| cost per task | $3.37 | $3.35 | parity; the order and design lanes pay for the gates trunk skipped, the fast lane pays them back |
| wall p50 | 374 s | 429 s | order and design gates |
| first reviewable output p50 | 130 s | 106 s | design lane 393 s → 209 s |
| stops per task | 0.5 | 1.0 | one gate per order (run grant), one more before a security path |
| permission prompts per task | 3.1 | 2.4 | 0 on every tuned re-run (`harness check`, `harness drive`); order lane 5.0 → 2.8 |
| cache hit ratio | 91% | 97% | small CLAUDE.md, rules by path, step files on demand |
| tokens per added line | 54.7k | 36.5k | |

| lane (tasks) | trunk cost · wall · TTFR | rework cost · wall · TTFR | pass |
|---|---|---|---|
| fast (6, rework N=3) | $1.59 · 111 s · 42 s | $1.23 · 110 s · 53 s (29 s after the step fold) | 6/6 vs 6/6 |
| order (4) | $3.76 · 398 s · 141 s | $3.79 · 440 s · 152 s | 4/4 vs 4/4 |
| design (2) | $9.30 · 1298 s · 393 s | $9.45 · 1370 s · 209 s | 2/2 vs 2/2 |
| research (2) | $2.02 · 192 s · 112 s | $2.73 · 425 s · 73 s | 1/2 vs 2/2 |

Reading: the rework wins on correctness, routing predictability, time to the first thing a reviewer can look at, permission prompts, cache and tokens per line, at the same cost per task; the fast lane (the median request) is 23% cheaper at the same wall time with zero stops. It is slower on the heavier lanes because it runs the process trunk skipped: one user gate per order (the run grant covers the rest), a cross-check on design records, and a stop before any phase that enters a security path. Cost variance on the fast lane at N=3 is 5%. Heavier lanes are N=1, so their deltas carry wide errors; three more runs of the eight heavier tasks cost about $60.

Caveats: the scripted user approves everything, so stops measure gates shown, not judgement exercised. Trunk gate-14 needed three runs before the detector understood the lead's own approval and confirmation wording; the kept run is the third. Rework gate-13 first failed a hidden assertion that only accepted a `(handler, key)` guard signature; the developer's `(handler, { apiKey })` is a legitimate reading of "read the key from config", so the hidden test now accepts both and the kept run was re-graded, not re-run. Trunk's earlier gate-13 pass stands: the broadened test is a superset.

Second and third tuning rounds, from the kept run logs: every hook payload names the main session transcript even for a tool call inside a subagent, so the read-before-edit guard denied 17 legitimate developer edits in one design run (fixed in 3c82928: hooks resolve the agent's own transcript under `<session>/subagents/`; gate-13 went from $9.80 and 1418 s to $7.35 and 936 s, re-reads 20 to 8). A run grant now approves the phases it covers and a passed review closes without a gate, so an order stops once (order-08 and order-09: 2 stops to 1). The YAML reader kept doubled backslashes in quoted grep patterns, so a correct `"lines\\[0\\]\\.quantity"` could never match and the developer stalled on a must_have it could not fix (fixed in 56379b6, with a schema lint that rejects a pattern that does not compile). The lead now invokes the lane skill directly instead of running admit twice, and spawn messages carry the step section inline.

### 4.2 Clean run, 2026-09-14

An adversarial review of the work found that the 4.1 table mixed single-shot trunk records with rework records re-run after each harness fix. This run is the un-cherry-picked number: the whole suite once at a380774 (fast lane three times), against the same trunk baseline, in `bench/results/rework-clean.json` with the report in `bench/results/comparison-clean.md`. The as-run file with nothing dropped is `rework-clean-raw.json`.

| metric (14 tasks) | trunk | rework, clean | read |
|---|---|---|---|
| pass@1 | 93% | 100% | 26/26 records |
| lane as intended | 57% | 100% | |
| cost per task | $3.37 | $2.97 | design lane $9.30 → $7.25; research $2.02 → $3.47 |
| wall p50 | 374 s | 370 s | design lane 1298 s → 902 s; research 192 s → 601 s |
| first reviewable output p50 | 130 s | 96 s | fast lane 42 s → 31 s, design 393 s → 180 s |
| stops per task | 0.5 | 0.8 | order 1.0 (run grant), research 2.0 (outline gate), design 1.5 |
| permission prompts per task | 3.1 | 0.4 | 0.0 on the order lane; every run trusted the workspace |
| cache hit ratio | 91% | 97% | |
| tokens per added line | 54.7k | 41.9k | |

Paired per task: pass^k +7% ±7% (worse on none), cost $-0.40 ±$0.46 (dearer on 5 of 14: the two research tasks, two orders, one fast). The research lane is the one lane the rework loses: the outline gate costs a stop and about 400 s, and the deep pass re-reads the sources (13.5 re-reads per task). Trunk failed one of the two research tasks by answering in chat.

Three records of the 26 were not first attempts, all disclosed: two fast runs were killed after 3.4 h and 19.5 h because the laptop slept mid-run (the runner now marks these suspended and re-runs them), and gate-13 first failed a hidden test that guessed the guard's signature and missed a third legitimate design; that test now boots the app with `API_KEY` set and checks the HTTP surface, and the task was run once more under it. The review also found that every run so far, both harnesses, ran with the workspace untrusted, so Claude Code ignored each harness's own `permissions.allow` list and only the shared CLI list applied; symmetric, but not interactive behaviour. The clean run is the first with trusted workspaces. 71 rate-limit events were seen on the rework side (throttling by the API, not harness latency); the bench now counts them. Total bench spend across the project: about $275.

Decisions taken during the build, beyond the plan: `harness check` and drive side-effect restore came out of the head-to-head (order-08 closed with a record the drive's POST had written into `data/invoices.json`, which the developer rightly refused to touch; test-and-lint redirects to the ledger cost a permission prompt on every run); `harness drive` was added after the first rework smoke run spent 5 of its 7 permission prompts and about 60 s hunting a port collision with an orphaned fixture server (the bench now gives every run its own PORT and kills leftovers); the kernel carries no runtime dependency (`yaml-lite` instead of a YAML package) so it can be copied into any host project; `harness set` and `harness review-summary` were added because the lane skills needed them; `guard.bash` and the drive-evidence classifier are kept from trunk because they were tested and correct; the bench routes permission prompts to an auto-approving MCP tool and counts them as interruptions instead of letting headless mode deny them.

## 5. Decisions I need from you

1. **Fixture repo for the bench.** Recommended: a small TypeScript service I create inside `bench/fixture/` (fast to run, portable). Alternative: a slice of the .NET host project (closer to real work, slower and needs dotnet on the bench machine).
2. **Consultant folded into a main-session skill.** Recommended for latency. Alternative: keep it as a fifth agent.
3. **Side by side or replace.** Recommended: build on `rework`, run both harnesses through the bench, merge only when the numbers win.

Everything else in this plan I will decide myself and record in the work item's decisions.
