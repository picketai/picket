---
kind: order
lane: order
title: Fill ledger cost, lines, bounces, blocks
date: 2026-10-18
audience: developer
sources: [work/20261018-fill-ledger-cost-lines-bounces-blocks/request.md, work/20261017-compare-agent-skills-with-picket-skills/research.md, core/lib/hooks/emit.ledger.mjs, core/lib/cost.mjs, core/lib/statusline.mjs, core/bin/picket.mjs, core/lib/init.mjs, core/lib/paths.mjs, core/lib/hook.mjs, core/hooks/hooks.json, core/hooks/README.md, core/lib/hooks/guard.scope.mjs, core/lib/hooks/guard.comments.mjs, core/lib/hooks/guard.bash.mjs, core/lib/hooks/guard.block.mjs, core/lib/hooks/lint.schema.mjs, core/lib/hooks/observe.drive.mjs, core/lib/escalation.mjs, core/lib/route.mjs, core/lib/close.mjs, core/lib/git.mjs, core/lib/review.mjs, core/lib/agent-name.mjs, core/lib/transcript.mjs, core/skills/inspecting/SKILL.md, bench/schema/ledger-v2.schema.json, test/kernel/statusline.test.mjs, test/kernel/statusline-input.json, test/budgets.test.mjs, .picket/state/ledger.jsonl]
phases:
  - n: 1
    files: [core/lib/paths.mjs, core/lib/statusline.mjs, core/bin/picket.mjs, core/lib/hooks/emit.ledger.mjs, core/lib/cost.mjs, test/kernel/statusline.test.mjs, test/kernel/cost.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: core/lib/paths.mjs
        pattern: 'export function sessionCostPath'
      - path: core/lib/statusline.mjs
        pattern: 'export function recordSessionCost'
      - path: core/bin/picket.mjs
        pattern: 'recordSessionCost'
      - path: core/lib/hooks/emit.ledger.mjs
        pattern: 'session_cost_usd'
      - path: core/lib/hooks/emit.ledger.mjs
        pattern: '^(?![\s\S]*cost_usd: null)'
        flags: i
      - path: core/lib/cost.mjs
        pattern: 'export function rowCosts'
    tests: true
    drive: true
  - n: 2
    files: [core/lib/ledger.mjs, core/lib/hook.mjs, core/lib/cost.mjs, core/lib/hooks/emit.ledger.mjs, test/hooks/hooks.test.mjs, test/kernel/cost.test.mjs]
    greps:
      - path: core/lib/ledger.mjs
        pattern: 'export function appendLedger'
      - path: core/lib/hook.mjs
        pattern: 'appendLedger'
      - path: core/lib/cost.mjs
        pattern: '"bounce"'
      - path: core/lib/cost.mjs
        pattern: '"block"'
      - path: core/lib/hooks/emit.ledger.mjs
        pattern: '^(?![\s\S]*bounces: 0)'
        flags: i
    tests: true
    drive: true
  - n: 3
    files: [core/lib/git.mjs, core/lib/route.mjs, core/lib/close.mjs, core/lib/cost.mjs, core/lib/hooks/emit.ledger.mjs, test/kernel/git.test.mjs, test/kernel/route.test.mjs, test/kernel/close.test.mjs, test/kernel/cost.test.mjs]
    greps:
      - path: core/lib/git.mjs
        pattern: 'export function productLinesAdded'
      - path: core/lib/route.mjs
        pattern: 'productLinesAdded'
      - path: core/lib/close.mjs
        pattern: 'productLinesAdded'
      - path: core/lib/cost.mjs
        pattern: '"accept"'
      - path: core/lib/hooks/emit.ledger.mjs
        pattern: '^(?![\s\S]*lines_added)'
        flags: i
    tests: true
    drive: true
---
# Order: Fill ledger cost, lines, bounces, blocks

## Problem

`core/lib/hooks/emit.ledger.mjs:60-65` writes `bounces: 0`, `blocks: 0`, `cost_usd: null` and `lines_added: null` on every turn row, and nothing else in `core/` writes those fields (R-073, now verified by grep). `summarize` in `core/lib/cost.mjs:48-87` sums them, so `picket cost --human` prints `$0.00`, `-` tok/line and `bounces 0`; the live ledger confirms it (every row of session `556ab53a…` on 2026-10-18 carries `"cost_usd":null`). Binding constraints: hooks start cold under 200 ms (`test/budgets.test.mjs:19`), a hook never fails the tool call on its own error (`core/lib/hook.mjs`), the status line goes blank on a nonzero exit, and `.picket/state/` is written by hooks and the kernel only (`guard.scope`).

## Decisions

### D-001: Session cost comes from the status line, stored raw on each row
**Decision:** `picket statusline` already receives Claude Code's own `cost.total_cost_usd` for the session (`core/lib/statusline.mjs:155`) and runs every 5 seconds (`refreshInterval: 5`, `core/lib/init.mjs:15`). After rendering, it writes `.picket/state/sessions/<session_id>.json` as `{ "session": "…", "cost_usd": 4.12, "ts": "…" }`, only when `<root>/.picket` exists, `session_id` matches `^[A-Za-z0-9_-]{1,128}$` (it becomes a file name), and the cost is a finite number. `emit.ledger` reads that file for `event.session_id` and stores the number as `session_cost_usd` on the row (`null` when absent); it stops writing `cost_usd`. The kernel derives the per-row cost (D-002). The stored fact is the raw cumulative total, so no hook keeps a "billed so far" mark and two hooks finishing at once cannot double count.
**Instead of:** a per-model price table in the kernel applied to each row's `usage`: it would attribute cost exactly per agent, but the repo holds no prices for the Claude 5 models, the table goes stale on every price change, and pricing the cache correctly needs the 5m and 1h cache-write split that `ledgerUsage` folds away.
**Risks:**
- **RISK-001** A project without Picket's status line (another `statusLine` holds the slot, `core/lib/init.mjs:156-160`) gets no snapshot. Mitigation: the row carries `null`, `summarize` returns `cost_usd: null`, and the human line prints `$-` instead of a false `$0.00`.
- **RISK-002** The snapshot can lag the turn's last message by one refresh. Mitigation: the lagging amount lands on the session's next row, so the session total stays exact up to the last refresh; only the final turn of a session can miss its tail.
- **RISK-003** Whether `total_cost_usd` includes subagent spend is not verified from the docs here. Mitigation: OQ-001; phase 1's drive settles it.

### D-002: Row cost is the session's delta since its previous row
**Decision:** A pure `rowCosts(rows)` in `core/lib/cost.mjs` walks the turn rows (`stop`, `subagent_stop`, `gate`) in ledger order, grouped by `session`, and gives each row with a `session_cost_usd` the difference from the previous such row of its session. The first row of a session gets its whole snapshot; a snapshot lower than the previous one (a restarted process) also counts in full; a row without a snapshot gets `null` and leaves the previous value alone. `summarize` computes costs on all rows first and filters by `--session` or `--work` after, so a work item's cost is the sum of its rows' deltas. Example: rows at 0.40, 0.40 (a subagent stop in the same second), 1.10 give 0.40, 0, 0.70. Per session the figure is exact; per agent it is the spend observed between two rows, which under Picket's one-agent-at-a-time flow is close to that agent's spend, and with parallel agents mixes them.
**Instead of:** splitting each session delta across rows by their token share: it looks precise while resting on the guess that all tokens cost the same, which cache reads (a tenth of input price) break.

### D-003 (r2): Guard denials and Stop bounces are their own ledger rows, written once in runHook
**Decision:** A new `core/lib/ledger.mjs` exports `appendLedger(root, row)` (adds `v: 2` and `ts`, creates the state folder, appends one JSON line). `runHook` in `core/lib/hook.mjs` classifies the handler's output by Claude Code's contract: `hookSpecificOutput.permissionDecision === "deny"` is a `block`, a top-level `decision === "block"` is a `bounce`. For either it appends `{ event, session, agent, hook, work_id, reason }`: `agent` is `bareAgentName(event.agent_type) ?? "lead"`, `hook` is the handler's function name split at its first capital (`guardScope` becomes `guard.scope`), `work_id` comes from `openWorkItem(root)` imported lazily on this path only, `reason` is cut to 300 characters. A failure here is swallowed and never changes the printed output. `summarize` counts scoped `block` and `bounce` rows, per agent too; `emit.ledger` stops writing `bounces` and `blocks`. Today this records `guard.scope`, `guard.comments` and `guard.bash` denials and `guard.block` bounces; a `guard.bash` deny also stays in `guard.log`, which is a trace, not a count.
**Instead of:** having `emit.ledger` count the turn's denials into its own row: Claude Code runs the hooks of one event in parallel, so `emit.ledger` cannot see the bounce `guard.block` returns for the same Stop, and it would need to scan the ledger for the turn's blocks on every stop.
**Risks:**
- **RISK-004** A bounced Stop also runs `emit.ledger`, so it still writes a turn row before the agent re-emits. Mitigation: none here; the bounce row now makes the extra turn visible, and changing turn counting is out of scope.

### D-004: Accepted lines are the product lines each kernel commit adds
**Decision:** `productLinesAdded(root, sha)` in `core/lib/git.mjs` sums the added column of `git show --numstat --format= <sha>` for paths where `isNonProduct` is false (`work/`, `.claude/`, `.picket/`, `artifacts/` excluded; binary `-` counts 0). After each kernel commit, the phase commit in `commitPhase` (`core/lib/route.mjs:16-28`, run grants included) and the close commit in `close` (`core/lib/close.mjs:55`), the kernel appends `{ event: "accept", session: null, agent: null, work_id, phase, commit, lines_added }` through `appendLedger`. `summarize` takes `lines_added` from scoped `accept` rows; `emit.ledger` stops writing `lines_added`. This counts lines the user approved into history in every lane: phase commits in order and design, the close commit in fast.
**Instead of:** counting lines at the reviewer's `APPROVED` or at `PHASE DONE`: those lines can still be rejected at the gate, and only the commit is the acceptance.
**Risks:**
- **RISK-005** The kernel CLI does not know the session, so `picket cost --session <id>` shows `-` tok/line. Mitigation: the project and `--work` views, which `picket:inspecting` renders, carry the figure.

## Scope

**In:**
- A session cost snapshot written by `picket statusline`, the row's `session_cost_usd`, and derived row, agent, work and session cost in `picket cost`.
- `block` and `bounce` ledger rows from `runHook`, counted by `picket cost`.
- `accept` ledger rows from the phase and close commits, giving tokens per accepted line.

**Out:**
- A price table, and cost for sessions without Picket's status line.
- `bench/schema/ledger-v2.schema.json`, which already does not describe `escalation` rows and is validated by nothing (OQ-002).
- Turn counting for bounced stops (RISK-004), and the `picket:inspecting` text, which already promises these figures.

## Phase 1: Session cost from the status line

**Touch set:**
- `core/lib/paths.mjs`: sessions folder and safe path
- `core/lib/statusline.mjs`: write the session cost snapshot
- `core/bin/picket.mjs`: call the writer, print `$-`
- `core/lib/hooks/emit.ledger.mjs`: read snapshot, drop `cost_usd`
- `core/lib/cost.mjs`: derive row costs, null when unknown
- `test/kernel/statusline.test.mjs`: writer tests, temp project root
- `test/kernel/cost.test.mjs`: delta and filter tests
- `test/hooks/handlers.test.mjs`: emitLedger stores the snapshot

**Changes:** `STATE_FILES` gains `sessions: "sessions"`; `sessionCostPath(root, session)` returns the file path, or `null` for an id outside the D-001 pattern. `recordSessionCost(input, { root })` writes the D-001 snapshot and swallows every error; the `statusline` case in `core/bin/picket.mjs` calls it after rendering with `root = projectRoot(input.workspace?.project_dir ?? workspaceDir(input) ?? undefined)`. `emitLedger` adds `session_cost_usd` and no longer writes `cost_usd`. `rowCosts(rows)` returns one cost or `null` per row, per D-002. `summarize` builds costs before filtering; `cost_usd` is the sum of the scoped rows' known costs, or `null` when none is known; `by_agent[*].cost_usd` sums known costs. The `cost` human line prints `$-` for `null`. The existing statusline CLI tests spawn with `CLAUDE_PROJECT_DIR` set to a temporary folder, so `npm test` never writes into this repository's `.picket/state/sessions/`.

**Done when:**
- **T-1.1** `picket statusline` fed `test/kernel/statusline-input.json` with `CLAUDE_PROJECT_DIR` at a temp project holding `.picket/` writes `.picket/state/sessions/statusline-fixture.json` with `cost_usd` 4.12, and prints the same lines as before.
- **T-1.2** Without a `.picket` folder at the root, with `session_id` `../x`, or with no `cost` field, the status line prints and exits 0 and no sessions file exists.
- **T-1.3** `emitLedger` on a Stop for session `s1` with a snapshot of 2.5 appends a row with `"session_cost_usd":2.5` and no `cost_usd` key; with no snapshot the value is `null`.
- **T-1.4** `rowCosts` on one session's rows with snapshots 0.40, 0.40, 1.10, then 0.30 returns 0.40, 0, 0.70, 0.30; a row without a snapshot returns `null` and the next row's delta is taken from 1.10.
- **T-1.5** `summarize(rows, { work_id: "w2" })` returns the sum of w2's row deltas even when the session's earlier rows belong to w1.
- **T-1.6** `picket cost --human` prints `$-` on a ledger whose turn rows have no `session_cost_usd`, and `$1.10` on one whose last snapshot is 1.10.
- **T-1.7** After deleting `.picket/state/sessions/` and running `npm test`, no `.picket/state/sessions/statusline-fixture.json` exists in this repository (the folder is gitignored, so `git status` cannot show it).

## Phase 2: Blocks and bounces as ledger rows

**Touch set:**
- `core/lib/ledger.mjs`: new, one ledger append function
- `core/lib/hook.mjs`: classify output, append denial row
- `core/lib/cost.mjs`: count block and bounce rows
- `core/lib/hooks/emit.ledger.mjs`: drop `bounces` and `blocks`
- `test/hooks/hooks.test.mjs`: spawned guards write rows
- `test/kernel/cost.test.mjs`: counts, per agent too

**Changes:** Create `core/lib/ledger.mjs` with `appendLedger(root, row)` per D-003, importing only `node:fs` and `./paths.mjs`. `runHook` computes `root` once, passes it to the handler, and after the handler returns appends a `block` or `bounce` row per D-003; `openWorkItem` is imported from `./hooks/observe.drive.mjs` with a dynamic `import()` inside the denial branch, the way `guard.comments.mjs:20` loads `work.mjs`. `summarize` sets `bounces` and `blocks` to the counts of scoped rows with those events and adds them to `by_agent` under each row's `agent`, creating the entry with `turns: 0` when the agent has no turn row. `emitLedger` no longer writes `bounces` or `blocks`.

**Done when:**
- **T-2.1** Spawning `guard.scope.mjs` with a Write to `work/x/state.yaml` and `agent_type: "picket:developer"` appends one row with `"event":"block"`, `"hook":"guard.scope"`, `"agent":"developer"` and the payload's `session_id`.
- **T-2.2** Spawning `guard.block.mjs` on a Stop whose transcript ends a contract block without a verdict token appends one row with `"event":"bounce"`, `"hook":"guard.block"`, `"agent":"lead"`.
- **T-2.3** A guard that allows or falls through (`guard.bash.mjs` with `git status`) appends no ledger row, and its stdout is unchanged from today.
- **T-2.4** With an unwritable state folder the denying hook still prints its deny JSON and exits 0.
- **T-2.5** `summarize` on two `block` rows and one `bounce` row returns `blocks: 2`, `bounces: 1`, and per-agent counts that add up to the same.
- **T-2.6** `npm test` passes, the budget test included (`hooks start cold under the budget`).

## Phase 3: Accepted lines from kernel commits

**Touch set:**
- `core/lib/git.mjs`: product lines added by commit
- `core/lib/route.mjs`: accept row after phase commit
- `core/lib/close.mjs`: accept row after close commit
- `core/lib/cost.mjs`: lines from accept rows
- `core/lib/hooks/emit.ledger.mjs`: drop `lines_added`
- `test/kernel/git.test.mjs`: product line count
- `test/kernel/route.test.mjs`: approval writes accept row
- `test/kernel/close.test.mjs`: close writes accept row
- `test/kernel/cost.test.mjs`: tokens per accepted line

**Changes:** Add `productLinesAdded(root, sha)` per D-004, returning 0 when git fails. In `commitPhase`, when `commitStaged` returns a sha, call `appendLedger(root, { event: "accept", session: null, agent: null, work_id: id, phase: Number(phase), commit: sha, lines_added: productLinesAdded(root, sha) })`; in `close`, the same with `phase: null` after its commit. `summarize` sets `lines_added` to the sum over scoped `accept` rows, and `tokens_per_accepted_line` keeps dividing turn tokens by it. `emitLedger` no longer writes `lines_added`.

**Done when:**
- **T-3.1** In a temp repo, a commit adding 12 lines to `src/a.ts` and 30 to `work/x/order.md` gives `productLinesAdded` 12.
- **T-3.2** `picket route <id> 1 --verdict approved` with staged product work appends one `accept` row whose `commit` equals `git log -1 --format=%h -- work/<id>/phases/1.approved` and whose `lines_added` matches T-3.1's count for that commit.
- **T-3.3** `picket close <id>` on a fast item with 5 staged product lines appends an `accept` row with `lines_added` 5 and `phase` null; a route or close that commits nothing appends no row.
- **T-3.4** `summarize(rows, { work_id })` on 10,000 turn tokens and accept rows of 40 and 60 lines returns `lines_added: 100` and `tokens_per_accepted_line: 100`.
- **T-3.5** A row from `emitLedger` has no `lines_added`, `bounces`, `blocks` or `cost_usd` key.

## Open questions

- **OQ-001** Does the status line's `cost.total_cost_usd` include subagent spend? Owner: developer, phase 1 drive: run `claude -p --output-format stream-json` with Picket's status line in a scratch project, spawn one subagent, and compare the last snapshot with the result's `total_cost_usd`. Fallback: if it excludes subagents, the figure is the lead's spend; the developer reports it in the phase block and the lead decides whether D-001 needs an amendment before phase 2.
- **OQ-002** Update `bench/schema/ledger-v2.schema.json` to the rows the hooks write now (`escalation`, `block`, `bounce`, `accept`, `session_cost_usd`), or retire it? Owner: lead. Fallback: left as is; nothing validates against it.

## Revision log

- 2026-10-18: D-003 (r2): hook name comes from the handler's function name, because paths.test bans process.argv[1]; all twelve hooks keep the same names
