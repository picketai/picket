---
kind: order
lane: order
title: Agents cannot forge picket state by Bash
date: 2026-11-19
audience: developer
sources: [work/20261119-agents-cannot-forge-picket-state-by-bash/request.md, work/20261118-mock-format-stub-server-data-catalog/reviews/cumulative.md, work/20261118-mock-format-stub-server-data-catalog/design.md, src/lib/hooks/guard/bash/judge.mts, src/lib/hooks/guard/bash/payloads.mts, src/lib/hooks/guard/bash/rules.mts, src/lib/hooks/guard/bash/sources.mts, src/lib/hooks/guard/bash/kernel.mts, src/lib/hooks/guard/bash/index.mts, src/lib/hooks/guard/bash/payloads.variants.test.mts, src/lib/hooks/guard/bash/sources.variants.test.mts, src/lib/hooks/guard/scope/index.mts, src/lib/shared/paths.mts, src/lib/shared/work/files.mts, src/lib/shared/work/approvals.mts, src/lib/shared/data/approvals.mts, src/lib/shared/data/runs.mts, src/lib/verbs/data/run.mts, src/lib/verbs/data/run.test.mts, src/lib/verbs/drive/run.mts, src/lib/util/process.mts, test/support/hook.mts, test/support/variants.mts, test/repo/closures.test.mjs, .claude/settings.json, .picket/state/guard.log]
phases:
  - n: 1
    files:
      - src/lib/shared/kernel-records.mts
      - src/lib/hooks/guard/scope/index.mts
      - src/lib/hooks/guard/bash/records.mts
      - src/lib/hooks/guard/bash/records.test.mts
      - src/lib/hooks/guard/bash/records.variants.test.mts
      - src/lib/hooks/guard/bash/judge.mts
      - src/lib/hooks/guard/bash/payloads.mts
      - test/repo/closures.test.mjs
    greps:
      - path: src/lib/hooks/guard/bash/records.mts
        pattern: 'kernel record'
      - path: src/lib/shared/kernel-records.mts
        pattern: '\bisHookOnlyState\b'
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: 'shared/kernel-records\.mts'
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: '\bfunction isHookOnlyState\b'
        absent: true
      - path: test/repo/closures.test.mjs
        pattern: 'bash/records\.variants\.test\.mts'
    tests: true
    drive:
      - covers: T-1.6
        command: 'node -e ''process.stdout.write(JSON.stringify({hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:"echo x >> .picket/state/data/approvals.jsonl"},cwd:process.cwd(),agent_type:"abcd-developer"}))'' | node dist/hooks/guard.bash.mjs'
        exit_code: 0
        contains: ['"permissionDecision":"deny"', 'kernel record']
      - covers: T-1.7
        command: 'node -e ''process.stdout.write(JSON.stringify({hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:"echo hi >> .picket/state/check-command.log"},cwd:process.cwd(),agent_type:"abcd-developer"}))'' | node dist/hooks/guard.bash.mjs'
        exit_code: 0
        contains: ['"permissionDecision":"allow"']
  - n: 2
    files:
      - src/lib/shared/kernel-records.mts
      - src/lib/hooks/guard/scope/index.mts
      - src/lib/hooks/guard/bash/records.mts
      - src/lib/hooks/guard/bash/records.test.mts
      - src/lib/hooks/guard/bash/records.variants.test.mts
      - test/repo/closures.test.mjs
    greps:
      - path: src/lib/shared/kernel-records.mts
        pattern: 'comments\.jsonl'
      - path: src/lib/hooks/guard/scope/index.mts
        pattern: '\bKERNEL_OWNED_ENTRIES\s*='
        absent: true
      - path: src/lib/hooks/guard/bash/records.variants.test.mts
        pattern: 'work/20261116-x'
    tests: true
    drive:
      - covers: T-2.6
        command: 'node -e ''process.stdout.write(JSON.stringify({hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:"echo x >> work/20261119-x/comments.jsonl"},cwd:process.cwd(),agent_type:"abcd-developer"}))'' | node dist/hooks/guard.bash.mjs'
        exit_code: 0
        contains: ['"permissionDecision":"deny"', 'kernel record']
  - n: 3
    files:
      - src/lib/shared/data/approvals.mts
      - src/lib/shared/data/approvals.test.mts
      - src/lib/verbs/data/run.mts
      - src/lib/verbs/data/run.test.mts
      - src/lib/verbs/data/show.mts
    greps:
      - path: src/lib/verbs/data/run.mts
        pattern: 'sha256: fileDigest\('
        absent: true
    tests: true
    drive: false
---
# Order: Agents cannot forge picket state by Bash

## Problem
`picket data run` executes a SQL file when the last row for it in `.picket/state/data/approvals.jsonl` holds the file's sha256 (`approvalStatus`, `src/lib/shared/data/approvals.mts:38`), and guard.scope keeps agents' Edit and Write out of that folder, but guard.bash does not stop a Bash write there. Probed on base a7f5aa51 through `guardOutput` (`test/support/hook.mts:17`), guard.bash gives no decision at all, for `abcd-developer` and the lead alike, to `echo … >> .picket/state/data/approvals.jsonl`, `tee -a`, `cp`, `node -e appendFileSync`, `bash -c "cp …"` and PowerShell `Add-Content`; the review's word "allows" is wrong, the command falls through to Claude Code's own permission check, where a bypass mode or a hurried yes lets it run. One spelling needs no prompt at all: `picket drive --run "echo x >> .picket/state/data/approvals.jsonl"` also falls through, `drive` runs its `--run` text in a shell (`runShell`, `src/lib/util/process.mts:55`), and `.claude/settings.json` allows `Bash(picket *)`. Binding: the lead and the picket verbs keep writing the state folder, the scratch folder and the `.log` sinks directly in it keep today's decisions, every guard change keeps its closure closed with new seeds (C-020), and guard.scope's Edit and Write rules do not change.

## Decisions

### D-001: A record is guarded by the paths a command names, with a reader allowlist
**Decision:** Infrastructural decision. A new module `src/lib/hooks/guard/bash/records.mts` refuses a spawned agent's command (`isSpawnedAgent`, `payloads.mts:64`) when a non-reader segment names a kernel record, the way `sourceCheck` (`sources.mts:79`) protects a source root: every word of the segment, a `--flag=value` value included, is resolved against the effective cwd, and so is every redirect target against every cwd the command passed through. A reader is a segment `sourceAllowed` accepts (`cat`, `grep`, `tail`, `ls`, git reads, print-only `sed`, `Get-Content`) or an inert root (`echo`, `printf`); a bare `picket` call wrapping no command counts as a reader, because the kernel writes its own records. Writes hidden in program text (`node -e`, `python3 -c`, `awk`, `perl`) and in `tee`, `sed -i` and PowerShell writers come from the write-target collection `payloads.mts` already runs for code files: `codeWriteTarget` (`payloads.mts:271`) stops skipping the state prefix and classifies a target as `code` or `record`. The same check runs inside meta payloads (`bash -c`, `env`, `xargs`, `eval`) through the walk `codeWritesInside` already does, and inside `--run`, `--start` and `--only` text through `wrappedVerbCheck`. A word naming `.picket` or `.picket/state` itself counts as a record, so `cp -r /tmp/x .picket/state` is caught.
**Instead of:** a list of writer commands (`cp`, `mv`, `touch`, `install`, `rsync`, `ln`): any writer missing from the list writes freely, while an unknown command naming a record is refused under the allowlist.
**Risks:**
- **RISK-001** A read-only command the allowlist lacks (`test -f`, `git check-ignore`, `node script.mjs <record>`) is refused for agents. Mitigation: the reason names `cat`, `grep` and `picket state`; of 8706 guard.log rows, 54 name a state path outside the scratch folder and the log sinks, nearly all through `cat`, `grep`, `tail`, `ls` or `wc`.
- **RISK-002** A path built at run time (`$p`, `$(…)`) or a recursive write into the project root still falls through to the prompt, as today. Mitigation: the closure grammar's families pin every visible spelling; expansions never get an allow.

### D-002: One predicate for kernel records, shared with guard.scope
**Decision:** Infrastructural decision. A new `src/lib/shared/kernel-records.mts` owns the fact "which paths only the kernel writes": `isHookOnlyState` moves there unchanged from `src/lib/hooks/guard/scope/index.mts:39` (the state folder minus `scratch/`, `MODEL_WRITABLE_STATE_FILES` and PR ticket paths), and guard.scope imports it. `records.mts` defines a record as `isHookOnlyState` minus the `.log` sinks `isSanctionedLogSink` (`rules.mts:150`) already allows, so every state file added later is protected by default.
**Instead of:** a second list inside guard.bash: two copies of one fact drift, and a new state file would be guarded for Edit and open for Bash.
**Risks:**
- **RISK-003** Moving the predicate changes guard.scope's decisions. Mitigation: guard.scope's tests and closure run unchanged in phase 1.

### D-003: A record write is refused outright, never escalated
**Decision:** Infrastructural decision. The record check runs before `isEscalating` in `judgeSegments` (`judge.mts:47`), so `PICKET_ESCALATE="…" cp … .picket/state/data/approvals.jsonl` is denied, not asked. Every record has a picket verb that writes it (`picket data approve`, `picket comment`, `picket waive` for the lead), so the dialog would only invite the user to approve a forged approval.
**Instead of:** routing record writes through the escalation dialog as code writes are (`judge.mts:71`): the user would be asked to bless a raw append to their own approval log.

### D-004: The run row records the digest the approval check compared
**Decision:** Infrastructural decision. `approvalStatus` takes the digest as an input instead of reading the file itself; `approvedFile` in `src/lib/verbs/data/run.mts:39` reads the digest once, checks it and returns it with the file, and the run row stores that value instead of reading the file again after the run (`run.mts:73`). `data show` passes the digest it prints, so the shown digest and the shown status come from one read.
**Instead of:** a separate re-read check after the run that marks the row: two reads where one suffices, and the row would still not say which bytes were approved.
**Risks:**
- **RISK-004** The container reads the file by path after the check, so bytes changed in that window still run. Mitigation: OQ-002.

### D-005: Comments, waivers and phase markers are records too
**Decision:** Infrastructural decision. Phase 2 moves guard.scope's `KERNEL_OWNED_ENTRIES` (`scope/index.mts:13`) into `kernel-records.mts` and makes the same entries under `work/<id>/` records for guard.bash, folders such as `phases/` included, because `comments.jsonl` and `waivers.jsonl` live there (`WORK_FILES`, `src/lib/shared/work/files.mts:16`), not under `.picket/state/` as the request says. A forged `phases/1.approved` would fake the user's gate the same way.
**Instead of:** guarding only `.picket/state/` as the brief's in-scope line reads: the request's own example, comments and waivers, would stay forgeable.

## Scope
**In:**
- guard.bash denies a spawned agent's Bash and PowerShell write to a kernel record under `.picket/state/`, in plain commands, redirects, meta payloads, interpreter programs and picket-wrapped commands, with a closure test and its seeds.
- The same for the kernel-owned entries of `work/<id>/` (phase 2, per OQ-001).
- The data run row stores the approved digest.
**Out:**
- Database guards against the wrong database (TF-007).
- Signing or encrypting the state files.
- The other findings of the TF-006 review (duplicated code, the phase 1 grep, `stub.mts:106`).
- guard.scope's Edit and Write rules: the predicate moves, its decisions stay.
- Writes by the lead, by picket verbs and by hooks.

## Phase 1: guard.bash denies agent writes to state records
**Touch set:**
- `src/lib/shared/kernel-records.mts`: new home of isHookOnlyState
- `src/lib/hooks/guard/scope/index.mts`: imports the moved predicate
- `src/lib/hooks/guard/bash/records.mts`: new record check and reason
- `src/lib/hooks/guard/bash/records.test.mts`: unit tests for both agents
- `src/lib/hooks/guard/bash/records.variants.test.mts`: closure with record seeds
- `src/lib/hooks/guard/bash/judge.mts`: runs the check per segment
- `src/lib/hooks/guard/bash/payloads.mts`: record targets, wrapped commands
- `src/lib/hooks/guard/bash/sources.mts`: sourceAllowed reused as reader test
- `src/lib/hooks/guard/bash/rules.mts`: isSanctionedLogSink, inert roots
- `test/repo/closures.test.mjs`: two GUARDS entries for records
- `test/support/variants.mts`: sourceCommands, interpreterArgv, programSeeds
- `test/support/hook.mts`: guardOutput and decision helpers

**Changes:**
- `kernel-records.mts` exports `isHookOnlyState(rel)` with today's body; guard.scope imports it and drops its own copy.
- `records.mts` exports `isKernelRecord(rel)` (D-002, plus `.picket` and `.picket/state` themselves), `namedRecords(seg, cwd, root)` (records a non-reader segment names, D-001) and `recordDenial(rel)`, a `Refusal` with `why: "kernel_record"` whose reason starts `guard.bash: <rel> is a kernel record` and names `cat`, `grep` and `picket state` as the way to read it.
- `payloads.mts`: `CodeWrite` gains `kind: "code" | "record"`; `codeWriteTarget` returns a record for a state path where it now `continue`s; `codeWritesIn` adds `namedRecords` hits, so `codeWritesInside`'s payload walk carries them; `deniedCodeWrite` keeps to `kind: "code"`; a new `deniedRecordWrite(writes, agent)` returns the first record write of a spawned agent; `wrappedVerbCheck` refuses a spawned agent's wrapped command whose inner segments or redirect targets name a record.
- `judge.mts`: after the loop, record writes from segments and redirects are refused through `refuse` before `deniedCodeWrite` and before `isEscalating` (D-003). The lead (no spawned agent name) is never refused by this check.
- `records.variants.test.mts`: `closureTests` named `guard.bash kernel records` over `sourceCommands`, `SOURCE_PLACEHOLDER` replaced by `.picket/state/data`, seeds: `echo x >> {source}/approvals.jsonl`, `echo x | tee -a {source}/approvals.jsonl`, `cp a {source}/approvals.jsonl`, `mv a {source}/runs.jsonl`, `touch {source}/approvals.jsonl`, `cd {source} && cp /tmp/a approvals.jsonl`, `bash -c "cp a {source}/approvals.jsonl"`, `picket drive --run "echo x >> {source}/approvals.jsonl"`; and `guard.bash kernel records in programs` over `interpreterArgv` with `programSeeds` for `node` and `python3` appending to `.picket/state/data/approvals.jsonl`. Both run as `abcd-developer`, closed when the decision is `deny`.
- `closures.test.mjs`: one GUARDS entry per closure name, module `src/lib/hooks/guard/bash/records.mts`.

**Done when:**
- **T-1.1** `records.test.mts` asserts `deny` with a reason holding `kernel record` for `abcd-developer` on each of: `echo '{"path":"data/x.sql","sha256":"ab"}' >> .picket/state/data/approvals.jsonl`, `echo x | tee -a .picket/state/data/approvals.jsonl`, `cp /tmp/a .picket/state/data/approvals.jsonl`, `node -e "require('fs').appendFileSync('.picket/state/data/approvals.jsonl','x')"`, `bash -c "cp /tmp/a .picket/state/data/runs.jsonl"`, `picket drive --run "echo x >> .picket/state/data/approvals.jsonl"`, `cp -r /tmp/forged .picket/state`, `echo x >> .picket/state/ledger.jsonl`, `echo x >> .picket/state/statusline.mjs`, and PowerShell `Add-Content -Path .picket/state/data/approvals.jsonl -Value x`. Each gave no decision on base a7f5aa51.
- **T-1.2** `PICKET_ESCALATE="x" cp /tmp/a .picket/state/data/approvals.jsonl` from `abcd-developer` in permission mode `default` is `deny`, not `ask` (base: no decision).
- **T-1.3** For `abcd-developer`, `records.test.mts` pins the base a7f5aa51 decisions captured for this record: `allow` for `cat .picket/state/data/approvals.jsonl`, `grep x .picket/state/ledger.jsonl`, `tail -3 .picket/state/drive-log.jsonl`, `ls .picket/state` and `echo hi >> .picket/state/check-command.log`; no decision for `echo hi > .picket/state/scratch/x/notes.txt`, `mkdir -p .picket/state/scratch/20261119-x`, `echo x >> .picket/state/branching.yaml` and PowerShell `Get-Content .picket/state/data/approvals.jsonl`.
- **T-1.4** With no agent type (the lead), every T-1.1 command gives no decision, as on base a7f5aa51; `records.test.mts` pins it.
- **T-1.5** `node --test src/lib/hooks/guard/bash/records.variants.test.mts` passes: both closures are closed as written and under every family of their grammars; `test/repo/closures.test.mjs` passes with the two new entries.
- **T-1.6** Driven: the declared command pipes the T-1.1 `echo >>` event from `abcd-developer` into `dist/hooks/guard.bash.mjs` and prints `"permissionDecision":"deny"` with `kernel record` (base: empty output, exit 0).
- **T-1.7** Driven: the same pipe for `echo hi >> .picket/state/check-command.log` prints `"permissionDecision":"allow"`, as on base.
- **T-1.8** `TMPDIR=/tmp npm test` exits 0, guard.scope's and the other guard tests passing with their assertions unchanged.

## Phase 2: Comments, waivers and phase markers are records
**Touch set:**
- `src/lib/shared/kernel-records.mts`: gains the kernel-owned work entries
- `src/lib/hooks/guard/scope/index.mts`: imports the moved entries
- `src/lib/hooks/guard/bash/records.mts`: records include work entries
- `src/lib/hooks/guard/bash/records.test.mts`: work entry cases
- `src/lib/hooks/guard/bash/records.variants.test.mts`: third closure for work entries
- `test/repo/closures.test.mjs`: GUARDS entry for the third closure
- `src/lib/shared/work/files.mts`: where comments and waivers live
- `src/lib/shared/work/approvals.mts`: the verbs that append them

**Changes:**
- `kernel-records.mts` takes `KERNEL_OWNED_ENTRIES` and the `KERNEL_OWNED` pattern from `scope/index.mts:13-14` unchanged and exports `isKernelOwnedWorkPath(rel)`; guard.scope calls it where it tested `KERNEL_OWNED`, still on `samePathCase(rel, platform)`.
- `isKernelRecord` in `records.mts` also answers true for `isKernelOwnedWorkPath(rel)` and for a folder entry named without its trailing slash (`work/<id>/phases`, `work/<id>/sources`, `work/<id>/test`). The folder `work/<id>` itself is not a record, so `git add -A -- work/<id>/order.md` keeps today's decision.
- `records.variants.test.mts` gains `closureTests` named `guard.bash kernel records in work items` over `sourceCommands`, `SOURCE_PLACEHOLDER` replaced by `work/20261116-x`, as `abcd-developer`, seeds: `echo x >> {source}/comments.jsonl`, `cp a {source}/waivers.jsonl`, `touch {source}/phases/1.approved`, `echo x | tee -a {source}/verdicts.jsonl`, `cp -r /tmp/p {source}/phases`, `bash -c "cp a {source}/comments.jsonl"`, `picket drive --run "touch {source}/phases/1.approved"`.

**Done when:**
- **T-2.1** `records.test.mts` asserts `deny` with a reason holding `kernel record` for `abcd-developer` on each of: `echo x >> work/20261119-x/comments.jsonl`, `cp /tmp/a work/20261119-x/waivers.jsonl`, `touch work/20261119-x/phases/1.approved`, `echo x >> work/20261119-x/verdicts.jsonl`, `node -e "require('fs').appendFileSync('work/20261119-x/waivers.jsonl','x')"` and `picket drive --run "touch work/20261119-x/phases/1.approved"`. Each gave no decision on base a7f5aa51.
- **T-2.2** For `abcd-developer`, `records.test.mts` pins the base a7f5aa51 decisions: `allow` for `cat work/20261119-x/comments.jsonl`; no decision for `echo x > work/20261119-x/order.md` and `git add -A -- src/a.ts work/20261119-x/order.md`.
- **T-2.3** With no agent type (the lead), every T-2.1 command gives no decision, as on base a7f5aa51.
- **T-2.4** `node --test src/lib/hooks/guard/bash/records.variants.test.mts` passes with the third closure, closed as written and under every family of `sourceCommands`; `test/repo/closures.test.mjs` passes with its entry.
- **T-2.5** `KERNEL_OWNED_ENTRIES` is defined only in `src/lib/shared/kernel-records.mts`, and guard.scope's tests and closure pass with their assertions unchanged.
- **T-2.6** Driven: the declared command pipes `echo x >> work/20261119-x/comments.jsonl` from `abcd-developer` into `dist/hooks/guard.bash.mjs` and prints `"permissionDecision":"deny"` with `kernel record` (base: empty output, exit 0).
- **T-2.7** `TMPDIR=/tmp npm test` exits 0.

## Phase 3: The data run row records the approved digest
**Touch set:**
- `src/lib/shared/data/approvals.mts`: approvalStatus takes the digest
- `src/lib/shared/data/approvals.test.mts`: passes the digest in
- `src/lib/verbs/data/run.mts`: approvedFile returns its digest
- `src/lib/verbs/data/run.test.mts`: file changed during the run
- `src/lib/verbs/data/show.mts`: one digest for print and status
- `src/lib/verbs/data/approve.test.mts`: show's tests stay unchanged
- `src/lib/shared/data/runs.mts`: DataRun shape stays the same

**Changes:**
- `approvalStatus(root, file, sha256)` compares the latest approval with the digest it is given and reads no file.
- `approvedFile` in `run.mts` computes `fileDigest(file.abs)` once, passes it to `approvalStatus` and returns the file with that digest; `runSqlEntry` writes it into the `DataRun` row instead of calling `fileDigest` after the run.
- `show.mts` computes the digest once and passes the same value to the output and to `approvalStatus`.

**Done when:**
- **T-3.1** A test in `run.test.mts` whose fake engine runner rewrites `data/customer.sql` while the run executes finds a `runs.jsonl` row whose `sha256` equals the digest given to `recordApproval` and differs from the rewritten file's digest.
- **T-3.2** `src/lib/verbs/data/run.mts` holds no `sha256: fileDigest(` (grep, absent).
- **T-3.3** The existing `run.test.mts` tests (T-8.1, T-8.2, T-8.4, T-8.5 of the TF-006 item) and `approve.test.mts` (T-7.1 to T-7.4) pass with their assertions unchanged.
- **T-3.4** `approvals.test.mts` gets `not approved`, `changed since approval` and `approved` for the same three cases as on base, with the digest passed in.
- **T-3.5** [DEFERRED: QA, the release QA pass on a host where Compose can run a container] A real `picket data run` against a test database writes a `runs.jsonl` row whose `sha256` equals the approval row's.
- **T-3.6** `TMPDIR=/tmp npm test` exits 0.

## Open questions
- **OQ-001** The request places `comments.jsonl` and `waivers.jsonl` under `.picket/state/`, and the brief scopes the guard to that folder, but both files live in `work/<id>/` (`WORK_FILES`, `src/lib/shared/work/files.mts:16-17`; appended by `appendApproval`, `src/lib/shared/work/approvals.mts:29`). Should guard.bash protect the kernel-owned work entries too? Owner: product owner. Fallback: yes, the request's example decides; phase 2 does it, and dropping phase 2 at its gate leaves phases 1 and 3 whole.
- **OQ-002** The `data` container reads the SQL file by path (`-v <abs>:/picket/run.sql:ro`, `dataRunArgs` in `run.mts:57`) after the digest check, so bytes changed in between still run while the row names the approved digest. Close it by mounting a snapshot of the checked bytes? Owner: product owner. Fallback: phase 3 records the approved digest only, as the brief asks; the snapshot goes to a follow-up item or TF-007.

## Revision log
