---
kind: design
lane: design
title: Database guards and confirmed SQL runs
date: 2026-11-19
audience: developer
sources: [bench/probe-ask.mjs, bench/lib/ask-probe-hook.mjs, bench/lib/approver-mcp.mjs, work/20261119-database-guards-and-confirmed-sql-runs/request.md, artifacts/strategy/decisions/00004-testing-stage-saved-scenarios-standard.md, artifacts/strategy/decisions/00005-irreversible-actions-are-confirmed-point.md, work/20261119-agents-cannot-forge-picket-state-by-bash/order.md, work/20261016-guard-escalation-through-native-ask-dialog/design.md, bench/results/ask-probe.json, src/lib/verbs/data/run.mts, src/lib/verbs/data/approve.mts, src/lib/verbs/data/show.mts, src/lib/shared/data/connection.mts, src/lib/shared/data/approvals.mts, src/lib/shared/data/runs.mts, src/lib/shared/escalation.mts, src/lib/shared/saved-rules.mjs, src/lib/shared/install.mts, src/lib/shared/config.mjs, src/lib/shared/paths.mts, src/lib/shared/kernel-records.mts, src/lib/shared/env/standard.mts, src/lib/shared/catalog/entry.mts, src/lib/hooks/guard/bash/escalation.mts, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/kernel.mts, src/lib/hooks/guard/bash/index.mts, src/lib/hooks/observe/drive/index.mts, src/lib/verbs.mts, src/lib/verbs/env/check.mts, src/lib/verbs/packet/packet.mjs, src/lib/verbs/close/block.mts, test/support/hook.mts]
phases:
  - n: 1
    files:
      - src/lib/shared/data/connection.mts
      - src/lib/shared/data/connection.test.mts
      - src/lib/shared/data/targets.mts
      - src/lib/shared/data/targets.test.mts
      - src/lib/shared/data/plan.mts
      - src/lib/shared/data/plan.test.mts
      - src/lib/shared/config.mjs
      - src/lib/shared/config.schema.json
      - test/kernel/config.test.mjs
      - src/lib/verbs/data/run.mts
      - src/lib/verbs/data/run.test.mts
      - src/lib/verbs/env/check.mts
      - src/lib/verbs/env/check.test.mts
      - test/fixtures/env/data-guard/.picket/env/compose.yaml
      - test/fixtures/env/data-guard/.picket/env/catalog/customer.md
      - test/fixtures/env/data-guard/.picket/env/data/customer.sql
    greps:
      - path: src/lib/shared/config.mjs
        pattern: '"data_targets"'
      - path: src/lib/shared/data/connection.mts
        pattern: 'export function readTarget\('
      - path: src/lib/shared/data/plan.mts
        pattern: 'export function planRun\('
      - path: src/lib/verbs/data/run.mts
        pattern: 'planRun\('
      - path: src/lib/shared/data/targets.mts
        pattern: '"E14"'
    tests: true
    drive:
      - covers: T-1.6
        command: 'CLAUDE_PROJECT_DIR="$PWD/test/fixtures/env/data-guard" node dist/bin/picket.mjs env check'
        exit_code: 2
        contains: ["E14 orders-sql"]
    security: true
  - n: 2
    files:
      - bench/lib/ask-probe-hook.mjs
      - bench/lib/approver-mcp.mjs
      - bench/probe-ask.mjs
      - bench/test/probe-ask.test.mjs
      - bench/results/ask-probe.json
    greps:
      - path: bench/probe-ask.mjs
        pattern: '"ask\+update"'
      - path: bench/probe-ask.mjs
        pattern: 'ran_updated'
      - path: bench/lib/ask-probe-hook.mjs
        pattern: 'updatedInput'
      - path: bench/results/ask-probe.json
        pattern: '"ask\+refuse"'
    tests: true
    drive: false
    security: false
  - n: 3
    files:
      - src/lib/verbs.mts
      - src/lib/hooks/guard/bash/kernel.mts
      - src/lib/hooks/guard/bash/kernel.test.mts
      - src/lib/hooks/guard/bash/kernel.variants.test.mts
      - src/lib/hooks/guard/bash/escalation.mts
      - src/lib/hooks/guard/bash/escalation.test.mts
      - src/lib/hooks/guard/bash/escalation.variants.test.mts
      - src/lib/hooks/guard/bash/judge.mts
      - src/lib/shared/data/confirm.mts
      - src/lib/shared/data/confirm.test.mts
      - src/lib/shared/paths.mts
      - test/fixtures/guard/data-run-plain.json
      - test/fixtures/guard/data-run-marked.json
      - src/lib/hooks/output.mts
      - src/lib/shared/escalation.mts
      - src/lib/shared/escalation.test.mts
    greps:
      - path: src/lib/verbs.mts
        pattern: 'confirmed: true'
      - path: src/lib/shared/data/confirm.mts
        pattern: 'export function confirmRun\('
      - path: src/lib/hooks/guard/bash/escalation.mts
        pattern: 'confirmRun\('
      - path: src/lib/hooks/guard/bash/escalation.mts
        pattern: 'planRun\('
      - path: src/lib/shared/paths.mts
        pattern: 'dataConfirmations:'
      - path: src/lib/hooks/output.mts
        pattern: 'updatedInput'
      - path: src/lib/hooks/guard/bash/escalation.mts
        pattern: 'randomBytes\('
    tests: true
    drive:
      - covers: T-3.1
        command: 'node dist/hooks/guard.bash.mjs < test/fixtures/guard/data-run-plain.json'
        exit_code: 0
        contains: ['"permissionDecision":"deny"', 'PICKET_ESCALATE']
      - covers: T-3.2
        command: 'node dist/hooks/guard.bash.mjs < test/fixtures/guard/data-run-marked.json'
        exit_code: 0
        contains: ['"permissionDecision":"deny"', 'no catalog entry customer']
    security: true
  - n: 4
    files:
      - src/lib/verbs/data/run.mts
      - src/lib/verbs/data/run.test.mts
      - src/lib/shared/data/confirm.mts
      - src/lib/shared/data/confirm.test.mts
      - src/lib/shared/data/plan.mts
      - src/lib/shared/data/plan.test.mts
      - src/lib/shared/data/runs.mts
    greps:
      - path: src/lib/shared/data/confirm.mts
        pattern: 'export function takeConfirmation\('
      - path: src/lib/verbs/data/run.mts
        pattern: 'takeConfirmation\('
      - path: src/lib/shared/data/confirm.mts
        pattern: 'timingSafeEqual\('
      - path: src/lib/shared/data/runs.mts
        pattern: 'approved_at'
      - path: src/lib/shared/data/runs.mts
        pattern: 'confirmation'
    tests: true
    drive: false
    security: true
  - n: 5
    files:
      - src/lib/verbs/packet/packet.mjs
      - src/lib/verbs/packet/index.test.mts
      - src/lib/verbs/close/block.mts
      - src/lib/verbs/close/index.test.mts
    greps:
      - path: src/lib/verbs/packet/packet.mjs
        pattern: 'itemDataRuns\('
      - path: src/lib/verbs/close/block.mts
        pattern: 'approval not recorded'
    tests: true
    drive: false
    security: false
---
# Design: Database guards and confirmed SQL runs

## Problem
Today `picket data run` is authorised by a stored row: `approvedFile` (`src/lib/verbs/data/run.mts:41`) runs any file whose latest row in `.picket/state/data/approvals.jsonl` matches its digest, mounts the live file by path (`run.mts:60`), and reads the server and database only after compose returns, for the run row (`run.mts:75`). Nothing compares them with anything, which is SDR 00004 RISK-001, and no dialog stands in the way: on base b987c5a8 guard.bash gives no decision for the lead's `picket data run <id> customer`, with or without `PICKET_ESCALATE` (probed through `dist/hooks/guard.bash.mjs`), and `picket init` installs `Bash(picket *)` (`src/lib/shared/install.mts:23`), so the command runs unasked. SDR 00005 (Ratified) binds the answer: a live dialog through the escalation route on every run (D-002), the bytes that were shown (D-003), the approval kept as a record only (D-004). The reader must also be exact: `connectionTarget` picks synonyms by a fixed priority (`connection.mts:18`), so `Server=db01;Database=ShopTest;Data Source=prod01` reads as `db01` (probed) whatever the client takes. Every party runs as one operating system user, so a script an agent writes can forge any file the kernel checks; this item closes every route through Picket's own verbs and hooks and leaves that bar to SDR 00005 TF-003.

## Decisions

### D-001: Each data service declares the servers and databases it may reach
**Decision:** Infrastructural decision. `.picket/config.json` gains `data_targets`: an object keyed by data service name (the compose service a sql entry names in `service`), each value a non-empty list of `{ "server": string, "database": string }`. `picket data run` refuses any run whose connection names a pair not on its service's list, before the engine is touched. Comparison is exact string equality on the values the reader returns: `db01` and `DB01` are different targets. A malformed value warns and declares nothing for that service, so it fails closed. `picket env check` reports a sql entry whose service declares no target as rule E14, so the gap shows before a run. Edits to `.picket/config.json` already go through guard.scope's ask (`src/lib/hooks/guard/scope/index.mts:27`).
**Instead of:** an `x-picket` key on the data service in `.picket/env/compose.yaml`: `docker compose config` drops service-level `x-` keys and profile-disabled services, and every data service sits under the `picket-data` profile (rule E7), so the kernel's model would never see it.
**Risks:**
- **RISK-001** A user must list each spelling of one server (`db01`, `db01.corp`, `tcp:db01,1433`). Mitigation: the refusal prints the server and database as read, ready to copy into the list after the user checks them.

### D-002: One reader for every connection form, refusing what it cannot read for certain
**Decision:** Infrastructural decision. `readTarget(text)` in `src/lib/shared/data/connection.mts` returns `{ target: { server, database } }` or `{ problem }`. It reads two forms: a URL (`scheme://[user[:password]@]host[:port]/database`, the first path segment is the database) and a `;`-separated `key=value` list (ADO.NET and ODBC, the SQL Server 2016 forms) with the server keys `server`, `data source`, `address`, `addr`, `host` and the database keys `database`, `initial catalog`, `dbname`. It returns a problem when the server or the database is missing, when the server keys or the database keys together occur more than once (equal values included, which also defeats a `;Database=` hidden in a quoted password), and for text in neither form. A problem never quotes the connection string. `connectionTarget` is replaced; `maskConnection` stays.
**Instead of:** a reader per engine picked by a declared engine name: one more config field and a parser per engine, while the two generic forms already cover SQL Server, PostgreSQL and MySQL URLs. Other forms wait on OQ-003.
**Risks:**
- **RISK-002** The data service's own script may read the variable differently from Picket. Mitigation: the dialog and the run row show the pair Picket read, and the compose file is tracked and reviewed.

### D-003: The dialog is the escalation route, with the run planned by the guard
**Decision:** Infrastructural decision. `run` under `data` in `src/lib/verbs.mts` gains `confirmed: true`; guard.bash's `kernelClass` (`src/lib/hooks/guard/bash/kernel.mts:21`) classes a confirmed subverb `deny`, so the plain command is denied with a reason that names the marked form `PICKET_ESCALATE="<why>" picket data run <id> <entry>`. The marked form takes the existing route in `judgeEscalation` (`src/lib/hooks/guard/bash/escalation.mts`): one command alone, the lead only (the agent refusal in `judgeSegments` runs first), the words exactly `picket data run <id> <entry>`. Before the mode check the guard plans the run (D-004); a plan refusal denies with its cause in every mode. Then the route's own checks run unchanged: `ASKING_MODES`, a saved allow rule that could match the marked form, a refused earlier ask in the session. On `ask`, the reason shows the escalation reason, the entry, the file, the full 64-hex digest, the server, the database and the approval record. A data run denial never offers `! <command>`, because the verb refuses without a confirmation.
**Instead of:** asking for the plain form, which `bench/results/ask-probe.json` shows still prompts when an allow rule matches (cells `ask+rule`, default and auto): the route's saved-rule check is proven only for the marked form, and a second asking route would need its own probes and closure.
**Risks:**
- **RISK-003** The hook process may lack a variable the user set only in a shell profile. Mitigation: the plan refusal names the variable, and the verb compares its own reading with the confirmed pair (Phase 4).
- **RISK-004** After a refused dialog the route will not ask the same run again in that session (`refused_before`). Mitigation: the denial says so; a new session asks again.

### D-004 (r2): The hook snapshots the shown bytes, and only the accepted command can take them
**Decision:** Infrastructural decision. A shared `RunPlan` (`src/lib/shared/data/plan.mts`) holds `{ item, entry, service, variable, path, abs, sha256, target, approval }`, never the connection value; `planRun` checks the entry, the file, the approval (D-005), the variable, the reader and the declared list, then the item's status. On `ask`, guard.bash reads the file once, writes those bytes to `.picket/state/data/snapshots/<sha256>.sql`, draws a random 32-byte nonce, and appends a `Confirmation` `{ id, at, session, item, entry, service, path, sha256, server, database, snapshot, nonce_sha256 }` to `.picket/state/data/confirmations.jsonl`. The `ask` carries `updatedInput`: the marked command rebuilt from its parsed words with `--confirmation <nonce hex>` appended. Until a run takes the row, the nonce lives only in that rewritten command; no row, ledger line or guard.log trace holds it. A refused dialog never runs the command, so its row can never be taken. `picket data run` takes the untaken row for its session, item and entry whose `nonce_sha256` equals the hash of its `--confirmation` value (constant-time compare) and that is younger than the window (OQ-001), appends `{ id, taken_at }` before compose starts, checks the snapshot's digest and its own reading of the pair, and mounts the snapshot at `/picket/run.sql`. The guard's shape rule (exactly `picket data run <id> <entry>`) denies a command that already carries `--confirmation`. `commandKey` drops a trailing `--confirmation <hex>`, so the PostToolUse `ran` row matches the ask row. Both state paths are hook-only (`isHookOnlyState`, `src/lib/shared/kernel-records.mts`).
**Instead of:** a row that a PostToolUse hook marks accepted, as the crosscheck review proposed: PostToolUse fires after the command, so the verb has already run or refused before any mark lands. Feeding the bytes on stdin was also rejected: it breaks the `/picket/run.sql` contract every data service reads (`run.mts:22`).
**Risks:**
- **RISK-005** (r2) A script an agent writes can still forge a row around a nonce of its own, since every party is one operating system user. Mitigation: OQ-002 [STRATEGIC REVIEW NEEDED]; a refused dialog no longer leaves anything usable.
- **RISK-006** Claude Code may not run the rewritten command after an `ask`, or may write the rewritten input where an agent can read it when the user refuses. Mitigation: Phase 2's probe settles both before Phase 3 starts (OQ-004).
- **RISK-007** While the accepted run lasts, the same user can read the nonce from the process's command line. Mitigation: the verb takes the row first, and a row only runs its own snapshot against its own pair, which is the run the user accepted.

### D-005: The stored approval is a precondition and a record, never an authority
**Decision:** Infrastructural decision. `picket data approve` and `picket data show` keep their behaviour. `planRun` still refuses a file with no approval at its digest, and the verb checks the approval at the confirmed digest, but an approval with no confirmation runs nothing. The approval's time is shown in the dialog and stored on the run row as `approved_at`.
**Instead of:** an informational approval that a run no longer needs: the dialog shows a digest, not the SQL, so without the record nobody need have read the bytes the user confirms (SDR 00005 RISK-001).

### D-006: The gate packet and the close line print every run's target
**Decision:** Infrastructural decision. At `approve_phase` the packet lists every run of the item from `itemDataRuns` (`src/lib/shared/data/runs.mts`) under a `data` label, one line each: entry, server, database, exit. The close line (`src/lib/verbs/close/block.mts:50`) adds the approval time, or `approval not recorded` for rows written before this item.
**Instead of:** only the runs since the previous gate: that needs a time join with verdict rows, while an item holds few runs.

## Scope
**In:**
- `data_targets` in `.picket/config.json`, its validation and rule E14 in `picket env check`
- one connection reader for URL and `key=value` forms, refusing ambiguous or unreadable strings
- the marked `picket data run` asking through guard.bash's escalation route, and the plain form denied
- a probe that Claude Code runs a hook-rewritten command after `ask` and keeps it out of reach when the user refuses
- the hook's snapshot, confirmation and nonce, and the verb running that snapshot once
- the approval as precondition and record; run rows with `confirmation` and `approved_at`
- the `data` lines on the gate packet and the approval on the close line

**Out:**
- known defects (TF-008), the browser adapter (TF-009), the sandbox spike (SDR 00005 TF-003), the Se4 review checklist row (SDR 00005 TF-004)
- signing or encrypting state files; new guard.bash spellings for records; the `testing` setting
- connection forms other than the two above (OQ-003)
- an agent reaching the database with the connection variable and its own client, outside Picket (OQ-002)

## Phase 1: Declared targets and an exact connection reader
**Touch set:**
- `src/lib/shared/data/connection.mts`: replace connectionTarget with readTarget
- `src/lib/shared/data/connection.test.mts`: reader forms and refusals
- `src/lib/shared/data/targets.mts`: new, declared list and E14
- `src/lib/shared/data/targets.test.mts`: new, exact matching and findings
- `src/lib/shared/data/plan.mts`: new, RunPlan and planRun
- `src/lib/shared/data/plan.test.mts`: new, plan refusals in order
- `src/lib/shared/config.mjs`: data_targets key and validation
- `src/lib/shared/config.schema.json`: describe data_targets
- `test/kernel/config.test.mjs`: malformed data_targets warns
- `src/lib/verbs/data/run.mts`: call planRun before the engine
- `src/lib/verbs/data/run.test.mts`: undeclared target refused, declared runs
- `src/lib/verbs/env/check.mts`: add the E14 findings
- `src/lib/verbs/env/check.test.mts`: E14 reported and absent
- `test/fixtures/env/data-guard/.picket/env/compose.yaml`: new, one data service
- `test/fixtures/env/data-guard/.picket/env/catalog/customer.md`: new, sql entry
- `test/fixtures/env/data-guard/.picket/env/data/customer.sql`: new, the entry's file

**Changes:**
- `connection.mts`: `export type TargetRead = { target: ConnectionTarget } | { problem: string }` and `readTarget(text: string): TargetRead` as D-002 states; the key lists stay where they are. `connectionTarget` and its `unknown` placeholder go.
- `config.mjs`: `"data_targets"` joins `KNOWN_KEYS`, `CONFIG_DEFAULTS` holds `{}`, and `loadConfig` returns `data_targets: Record<string, { server: string; database: string }[]>` through a `checkDataTargets` that warns `data_targets.<service> ...` and drops a malformed service. The schema gains the matching object.
- `targets.mts`: `isDeclared(targets, service, target): boolean` (exact equality on both fields) and `targetFindings(entries, targets): Finding[]`, one E14 error per sql entry service with no declared target, message `picket data run refuses it until data_targets in .picket/config.json lists its server and database`.
- `plan.mts`: `RunPlan` as D-004 states and `planRun(root, env, id, entry): RunPlan`, throwing `Refused` in this order: no sql entry, file outside `data/`, file not approved or changed since approval, variable unset, `readTarget` problem, pair not declared (naming service, server and database), item closed. `approvedFile`, `connection` and `openState` move here from `run.mts`.
- `run.mts`: `runSqlEntry` calls `planRun` first and the engine only after it passes; the run row takes `plan.target`. The mount, `dataRunArgs` and `renderRun` do not change in this phase.
- `check.mts`: `environmentReport` adds `targetFindings` for the catalog's sql entries.
- The fixture holds a compose file with one service `orders-sql` (label `io.github.picketai.role: data`, profile `picket-data`), a sql entry `customer` naming `data/customer.sql` and `orders-sql`, the SQL file, and no `.picket/config.json`.

**Done when:**
- **T-1.1** `readTarget` returns `{ server: "DB01\SQL2016", database: "ShopTest" }` for `Data Source=DB01\SQL2016;Initial Catalog=ShopTest;Integrated Security=True`, `{ server: "tcp:db01.corp,1433", database: "ShopTest" }` for `Server=tcp:db01.corp,1433;Database=ShopTest;User Id=qa;Password=x`, and `{ server: "db01:5432", database: "shop" }` for `postgres://qa:pw@db01:5432/shop`.
- **T-1.2** `readTarget` returns a problem, and no target, for `Server=db01;Database=ShopTest;Data Source=prod01`, `Server=db01;Database=ShopTest;Server=db01`, `jdbc:sqlserver://db01:1433;databaseName=ShopTest`, `host=db01 port=5432 dbname=shop` and `Server=db01;Password=s3cret`; no problem text holds `s3cret`.
- **T-1.3** `loadConfig` returns the declared lists for a valid `data_targets`; for a non-object value, an empty list, or an entry with a missing or empty `server` or `database`, it warns with text naming `data_targets` and returns no targets for that service.
- **T-1.4** `runSqlEntry` with `Server=sql01;Database=orders_live;...` while `orders-sql` declares only `sql01`/`orders_test`, and again with `Server=SQL01;Database=orders_test;...`, is refused with no compose call on the fake runner; the refusal names `orders-sql`, the server and the database, and holds no password.
- **T-1.5** `runSqlEntry` with a declared target and an approved file calls compose once, and the run row holds the declared server and database; every existing `run.test.mts` case passes with a declared target added to its project.
- **T-1.6** `picket env check` on `test/fixtures/env/data-guard` prints `E14 orders-sql` and exits 2; `check.test.mts` shows no E14 once `data_targets` declares `orders-sql`.

## Phase 2: Probe that an asked command runs as the hook rewrote it
**Touch set:**
- `bench/lib/ask-probe-hook.mjs`: rewrite sentinels and log the nonce
- `bench/lib/approver-mcp.mjs`: refuse the refusal sentinel
- `bench/probe-ask.mjs`: two cells and their summary fields
- `bench/test/probe-ask.test.mjs`: cells, answer and summary
- `bench/results/ask-probe.json`: the record a real run writes

**Changes:**
- `ask-probe-hook.mjs`: for a PreToolUse command holding `picket-probe-update` or `picket-probe-refuse`, `answer` returns `ask` with `updatedInput: { command: "<original command> <nonce>" }`, the nonce 32 random bytes in hex. `logLine` records `nonce` (on the PreToolUse line only) and `transcript_path`.
- `approver-mcp.mjs`: `decide` denies a command holding `picket-probe-refuse` before its destructive check; every other answer is as today.
- `probe-ask.mjs`: `CELLS` gains `{ mode: "manual", scenario: "ask+update" }` (command `echo picket-probe-update`) and `{ mode: "manual", scenario: "ask+refuse" }` (command `echo picket-probe-refuse`). `summarizeCell` adds `ran_updated` (a PostToolUse line's command holds the PreToolUse nonce) and `nonce_found` (the files under the scratch project and the transcript's folder, the probe's own hook log left out, whose text holds the nonce). The other cells and their fields do not change. A full run is at most 10 cells × `MAX_BUDGET_USD` 0.05 = USD 0.50 on `haiku`, and runs only on the user's word.

**Done when:**
- **T-2.1** `answer` for a `picket-probe-update` command returns `ask` with an `updatedInput.command` holding the original command and 64 hex characters, two calls give different nonces, and `logLine` records the nonce and `transcript_path`.
- **T-2.2** `summarizeCell` sets `ran_updated` true when a PostToolUse command holds the PreToolUse nonce and false when it holds only the original command; `nonce_found` lists a scratch file holding the nonce and leaves out the hook log.
- **T-2.3** The approver denies `echo picket-probe-refuse` and still allows `echo picket-probe-ok`.
- **T-2.4** After `node bench/probe-ask.mjs` on this machine, `bench/results/ask-probe.json` holds an `ask+update` cell with `prompt_tool_called`, `command_ran` and `ran_updated` true, and an `ask+refuse` cell with `command_ran` false and an empty `nonce_found`; Phase 3 starts only when this holds.
- **T-2.5** [DEFERRED: the product owner, before Phase 3 starts] In an interactive session in default mode, the dialog for `echo picket-probe-update` shows the rewritten command and runs it after a yes.

## Phase 3: The marked run asks through the escalation route
**Touch set:**
- `src/lib/verbs.mts`: confirmed flag on data run
- `src/lib/hooks/guard/bash/kernel.mts`: confirmed subverb classes deny
- `src/lib/hooks/guard/bash/kernel.test.mts`: class of data run pinned
- `src/lib/hooks/guard/bash/kernel.variants.test.mts`: seeds for the new class
- `src/lib/hooks/guard/bash/escalation.mts`: plan, confirm and ask
- `src/lib/hooks/guard/bash/escalation.test.mts`: ask, deny and record cases
- `src/lib/hooks/guard/bash/escalation.variants.test.mts`: marked data run seeds
- `src/lib/hooks/guard/bash/judge.mts`: plain form denial reason
- `src/lib/hooks/output.mts`: ask carries updatedInput
- `src/lib/shared/escalation.mts`: commandKey drops the confirmation flag
- `src/lib/shared/escalation.test.mts`: key with and without flag
- `src/lib/shared/data/confirm.mts`: new, snapshot and confirmation rows
- `src/lib/shared/data/confirm.test.mts`: new, write and read back
- `src/lib/shared/paths.mts`: two new STATE_FILES entries
- `test/fixtures/guard/data-run-plain.json`: new, drive payload, plain form
- `test/fixtures/guard/data-run-marked.json`: new, drive payload, marked form

**Changes:**
- `verbs.mts`: `SubverbEntry` gains `confirmed?: true`; `data.subverbs.run` sets it. `kernel.mts`'s `VerbTable` reads it and `kernelClass` (with `classifyKernelCall`) returns `"deny"` for a confirmed subverb. No other verb sets the flag.
- `paths.mts`: `STATE_FILES.dataConfirmations = "data/confirmations.jsonl"` and `STATE_FILES.dataSnapshots = "data/snapshots"`.
- `confirm.mts`: `export type Confirmation = { id: string; at: string; session: string; item: string; entry: string; service: string; path: string; sha256: string; server: string; database: string; snapshot: string; nonce_sha256: string }` (`snapshot` is state-relative). `confirmRun(root, plan: RunPlan, bytes: Buffer, session: string, nonceSha256: string, now: Date): Confirmation` writes the bytes to `<dataSnapshots>/<sha256>.sql` (temporary name, then rename) and appends the row; `id` is random. The caller passes the bytes it digested, so the snapshot is the shown bytes. A null session refuses: no session, no confirmation.
- `escalation.mts`: `dataRunWords(segment): { id, entry } | null` recognises exactly `picket data run <id> <entry>` after the marker (any `kernelVerbStart` launcher, no other word). In `judgeEscalation`, when the escalated segment is a data run: other words under the marker deny with the shape cause `escalate data run as picket data run <id> <entry>, alone`; `planRun(root, ctx.env, id, entry)` runs before `escalationVerdict`, and its `Refused` denies with the message, logged with `why: "data_plan"`. On `ask`, the guard reads the file once, checks the digest against the plan, draws a 32-byte nonce with `randomBytes`, calls `confirmRun` with its sha256, and returns `ask` with `updatedInput: { command }`, the command rebuilt from the parsed words with the nonce appended: `PICKET_ESCALATE=<reason, single-quoted> <launcher> data run <id> <entry> --confirmation <nonce hex>` for Bash, `$env:PICKET_ESCALATE = '<reason>'; <launcher> data run <id> <entry> --confirmation <nonce hex>` for PowerShell. The reason is `guard.bash: data run by <agent or main>: "<reason>". entry <entry> · file <path> · sha256 <64 hex> · server <server> · database <database> · approved <approval at>. Approving runs this snapshot once; nothing carries over.` Denials for a data run end with `data run asks only in the default, acceptEdits and auto modes, through this marked command` in place of `run it yourself: ! <command>`.
- `output.mts`: `ask(reason, updatedInput?: Record<string, unknown>)` adds `updatedInput` to `hookSpecificOutput` when given.
- `src/lib/shared/escalation.mts`: `commandKey` drops a trailing `--confirmation <64 hex>` before hashing.
- `judge.mts`: when a segment's class is `deny` because its subverb is confirmed and no marker stands before it, the reason is `guard.bash: picket data run reaches a database, so it runs only through the permission dialog: PICKET_ESCALATE="<why>" picket data run <id> <entry>` instead of the generic destructive denial.
- The fixtures are PreToolUse payloads with no `cwd`, `tool_name` `Bash`, `permission_mode` `default`, `session_id` `fixture-data-run`, and the commands `picket data run 20261119-database-guards-and-confirmed-sql-runs customer` and `PICKET_ESCALATE="seed one customer" picket data run 20261119-database-guards-and-confirmed-sql-runs customer`. The marked one appends a denied escalation row to the ledger of the root it runs in.
- Closure (C-020): `kernel.variants.test.mts` seeds the plain form in Bash and PowerShell; `escalation.variants.test.mts` seeds the marked form and the marked form with an extra word.

**Done when:**
- **T-3.1** Driven through `dist/hooks/guard.bash.mjs`, the lead's plain `picket data run <id> customer` in default mode is denied with a reason holding `PICKET_ESCALATE`.
- **T-3.2** Driven through `dist/hooks/guard.bash.mjs` in a root with no catalog, the marked form is denied with `no catalog entry customer`; in a unit test an undeclared target is denied with the plan's cause in `bypassPermissions` mode as well, and neither case writes a confirmation row or a snapshot.
- **T-3.3** In a unit test with an approved file, a declared target and the variable set, the marked form in `default` mode gets `ask`; the reason holds `customer`, `data/customer.sql`, the file's full 64-hex digest, the server, the database and the approval's `at`; `confirmations.jsonl` holds one row with the session, item, entry, digest, server, database and snapshot; the snapshot's sha256 equals the row's digest; the output's `updatedInput.command` is the marked command plus `--confirmation <64 hex>`, the row's `nonce_sha256` is the sha256 of that hex, and the hex appears in no confirmation row, ledger row or guard.log line.
- **T-3.4** The same marked command in modes unset, `plan`, `bypassPermissions` and `dontAsk`, and in `default` with `Bash(*)` in the project's `.claude/settings.json`, is denied naming the mode or the rule, writes no confirmation, and the reason holds no `! picket data run`.
- **T-3.5** `abcd-developer`'s marked form is denied with the lead-only reason, and the lead's marked form with `--root x` added or `--confirmation` followed by 64 hex characters added, or followed by `&& echo x`, is denied with a shape cause; none writes a confirmation.
- **T-3.6** With the variable `Server=sql01;Database=orders_test;User Id=qa;Password=s3cret`, `s3cret` appears in no ask reason, confirmation row or ledger row.
- **T-3.7** `commandKey` gives the same key for the marked command with and without a trailing `--confirmation <64 hex>`.
- **T-3.8** `npm test` passes with the new seeds in `kernel.variants.test.mts` and `escalation.variants.test.mts` and every closure in `test/repo/closures.test.mjs` closed.

## Phase 4: The verb runs a confirmed snapshot once
**Touch set:**
- `src/lib/verbs/data/run.mts`: take the confirmation, mount the snapshot
- `src/lib/verbs/data/run.test.mts`: refusals, single use, snapshot mount
- `src/lib/shared/data/confirm.mts`: takeConfirmation and the taken row
- `src/lib/shared/data/confirm.test.mts`: window, newest row, single use
- `src/lib/shared/data/plan.mts`: plan at a confirmed digest
- `src/lib/shared/data/plan.test.mts`: approval at the confirmed digest
- `src/lib/shared/data/runs.mts`: confirmation and approved_at fields

**Changes:**
- `confirm.mts`: `CONFIRMATION_WINDOW_MS` (OQ-001) and `takeConfirmation(root, { session, item, entry, nonce }, now): Confirmation`, which picks the newest row for that session, item and entry whose `nonce_sha256` equals the sha256 of `nonce` (compared with `timingSafeEqual`), refuses when there is none, when it has a taken row, or when it is older than the window, then appends `{ id, taken_at }` and returns it. The refusal for no confirmation names the marked form and the asking modes.
- `plan.mts`: `planRun` takes an optional `{ sha256 }`; with it, the approval is checked at that digest and the live file is not read, so a file edited after the dialog does not block the snapshot the user saw.
- `runs.mts`: `DataRun` gains `confirmation: string` and `approved_at: string | null`; readers accept rows without them.
- `run.mts`: `parseRun` reads an optional `--confirmation` (64 lowercase hex, else a usage error) into `RunInput.confirmation: string | null`; `USAGE` stays `data run <id> <entry>`, because only the guard writes the flag. `runSqlEntry` takes the confirmation first (`ctx.session` or the flag null refuses), then `planRun` at the confirmed digest, then refuses when the snapshot's digest differs from the confirmed one or when its own reading of the variable gives a pair other than the confirmed server and database (naming both pairs, never the value). Only then the engine check and compose, with `dataRunArgs` given the snapshot's absolute path. The run row takes the confirmed digest, the pair, the confirmation id and the approval's `at`.

**Done when:**
- **T-4.1** With an approval row and a confirmation row for the session, item and entry, a run with no `--confirmation`, a run whose `--confirmation` hashes to no row (a refused dialog's case), and a run with `session` null are each `runSqlEntry` is refused naming `PICKET_ESCALATE`, and the fake runner gets no compose call.
- **T-4.2** With the clock injected, a confirmation older than `CONFIRMATION_WINDOW_MS` is refused and one inside it runs.
- **T-4.3** A second `runSqlEntry` on the same confirmation is refused, and the taken row is already in `confirmations.jsonl` when the fake runner receives the compose call.
- **T-4.4** After `data/customer.sql` is rewritten following the confirmation, the compose call mounts the snapshot path at `/picket/run.sql` and the run row holds the confirmed digest.
- **T-4.5** When the snapshot's bytes no longer match the confirmed digest, the run is refused with no compose call.
- **T-4.6** When the variable now reads `Server=sql02;Database=orders_test` (also declared) against a confirmation for `sql01`, the run is refused naming both pairs and no compose call is made.
- **T-4.7** The run row holds the confirmation's `id` and `approved_at` equal to the approval row's `at`.
- **T-4.8** [DEFERRED: QA, the release QA pass] In a live session in default mode, the lead's marked `picket data run` shows the dialog with the entry, file, digest, server and database, runs once against the product owner's SQL Server 2016 test database after a yes, and the same command afterwards is denied or refused; after a refused dialog, the same run started from a script is refused.

## Phase 5: Targets on the gate packet and the close line
**Touch set:**
- `src/lib/verbs/packet/packet.mjs`: data lines at approve_phase
- `src/lib/verbs/packet/index.test.mts`: lines present and absent
- `src/lib/verbs/close/block.mts`: approval on the data line
- `src/lib/verbs/close/index.test.mts`: approval and old rows

**Changes:**
- `packet.mjs`: in the `approve_phase` branch for design and order items, after `keepLines`, `listField("data", itemDataRuns(root, id).map(...), width)` with one item per run: `<entry> on server <server>, database <database>, exit <status>`. No runs, no lines.
- `block.mts`: `dataLine` appends `, approved <approved_at>`, or `, approval not recorded` when the row has no `approved_at`.

**Done when:**
- **T-5.1** The `approve_phase` packet of an item with two run rows holds a `data` field with `customer on server sql01, database orders_test, exit 0` and the second run on the next line.
- **T-5.2** Every packet test in `index.test.mts` that existed on base b987c5a8 passes unchanged, as the pin that a packet with no run rows is the same as before.
- **T-5.3** The close block for a run row with `approved_at` holds `Data: customer ran on server sql01, database orders_test, exit 0, approved 2026-11-18T09:00:00.000Z`.
- **T-5.4** A run row written before this item (no `confirmation`, no `approved_at`) renders on the packet and as `..., exit 0, approval not recorded` on the close line.

## Open questions
- **OQ-001** How long may a confirmation wait between the dialog and the run? Owner: the product owner. Fallback: `CONFIRMATION_WINDOW_MS` is 10 minutes, a placeholder this record picks, not a measured value.
- **OQ-002** [STRATEGIC REVIEW NEEDED] SDR 00005 D-001 holds SQL runs to a determined bypass and says an agent's script run through `picket drive --run` is closed, but with one operating system user such a script can still forge a confirmation and its snapshot, and agents' shells inherit the `PICKET_DATA_*` variable, so a client run outside Picket reaches the database. Owner: the product owner, through picket:consulting. Fallback: ship as designed, with RISK-005 open until SDR 00005 TF-003.
- **OQ-003** Which connection form does the product owner's SQL Server 2016 data service read: the `key=value` form, JDBC `jdbc:sqlserver://host:port;databaseName=...`, or another? Owner: the product owner. Fallback: forms other than URL and `key=value` are refused with a problem naming the two forms read.
- **OQ-004** Does Claude Code run the command a PreToolUse hook rewrote through `updatedInput` under `ask`, and keep the rewritten input out of every file an agent can read when the user refuses? Owner: the developer (Phase 2's probe) and the product owner (T-2.5). Fallback: Phase 3 does not start; Phase 1 ships alone and D-004 returns for amendment.

## Revision log
- 2026-11-19: D-004 (r2): only the hook-rewritten, accepted command holds the nonce that takes a confirmation, so a refused dialog leaves nothing usable; crosscheck review.
