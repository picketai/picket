---
kind: order
lane: order
title: Failed tool calls and patterns report
date: 2026-11-22
audience: developer
sources: work/20261122-ledger-failed-tool-calls-and-patterns-report/request.md, artifacts/reports/lessons-three-unread-assets-transcripts.md (R-014, R-031, R-032), src/lib/shared/transcript/entries.mts, src/lib/shared/transcript/turn.mts, src/lib/shared/ledger.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/close/close.mts, src/lib/shared/work/replies.mts, src/lib/verbs/reply/table.mts, src/lib/verbs.mts, src/lib/hooks/guard/bash/kernel.test.mts, .picket/state/ledger.jsonl, work/*/replies.jsonl, work/*/verdicts.jsonl, session transcripts under the host projects folder
phases:
  - n: 1
    files:
      - src/lib/shared/transcript/turn.mts
      - src/lib/shared/ledger.mts
      - src/lib/hooks/emit/ledger/index.mts
      - src/lib/hooks/emit/ledger/index.test.mts
      - test/hooks/emit.ledger.test.mjs
    greps:
      - path: src/lib/shared/ledger.mts
        pattern: 'failed_tool_calls\?: number'
      - path: src/lib/shared/ledger.mts
        pattern: 'failed_tools\?: Record<string, number>'
      - path: src/lib/hooks/emit/ledger/index.mts
        pattern: 'failed_tools'
      - path: src/lib/shared/transcript/turn.mts
        pattern: 'is_error'
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/verbs/patterns/index.mts
      - src/lib/verbs/patterns/index.test.mts
      - src/lib/verbs.mts
      - src/lib/cli/registry.mts
      - src/lib/shared/work/replies.mts
      - src/lib/verbs/reply/table.mts
      - src/lib/hooks/guard/bash/kernel.test.mts
      - docs/reference/cli.md
    greps:
      - path: src/lib/verbs.mts
        pattern: '\bpatterns:\s*\{'
      - path: src/lib/cli/registry.mts
        pattern: 'verbs/patterns/index\.mts'
      - path: src/lib/shared/work/replies.mts
        pattern: 'export const REJECT_REPLY\b'
      - path: src/lib/verbs/reply/table.mts
        pattern: '\bREJECT_REPLY\b'
      - path: src/lib/verbs/reply/table.mts
        pattern: 'x:\?\|reject:'
        absent: true
      - path: src/lib/hooks/guard/bash/kernel.test.mts
        pattern: '"patterns"'
      - path: docs/reference/cli.md
        pattern: '^## picket patterns\b'
    tests: true
    drive:
      - covers: T-2.6
        command: node dist/bin/picket.mjs patterns --human
        exit_code: 0
        contains: ["denials:", "rejections:", "failed tool calls:"]
      - covers: T-2.7
        command: node dist/bin/picket.mjs patterns
        exit_code: 0
        contains: ['"denials"', '"rejections"', '"failed_tools"']
---
# Order: Failed tool calls and patterns report

## Problem
A run that works around a stale instruction leaves no trace in the ledger except a larger `tool_calls` and a longer `duration_ms` on its turn row (R-031). The host transcript already marks every failed call: a `tool_result` item with `is_error: true` whose `tool_use_id` names the `tool_use` that failed (checked on two session transcripts: 16 of 16 and 4 of 4 failed results link to a tool name). The ledger also holds 447 `block` and `bounce` rows and `work/*/replies.jsonl` holds the user's `x` reasons, but nothing reads them across items (R-032); only `repeatedClasses` (`src/lib/verbs/close/close.mts:204`) does this, for review classes. Both changes must stay read-only toward skills, agents, rules, guards and routing.

## Decisions
### D-001: Count failures per turn from the transcript at Stop
**Decision:** `emit.ledger` adds two fields to each turn row it writes: `failed_tool_calls` (a number) and `failed_tools` (a map from tool name to count, such as `{"Bash": 1, "Edit": 2}`). A new scan in `src/lib/shared/transcript/turn.mts` reads the current turn only, with the boundary `currentTurnAssistantEntries` already uses: entries from the end back to the last `user` entry that is not a tool result, within `TURN_BYTES`. It counts `tool_result` items with `is_error === true` and names each through the `tool_use` whose `id` equals its `tool_use_id`; a result whose tool use is not in the window counts under `unknown`. The fields are optional in `TurnRow` because older v2 rows lack them, and the ledger version stays 2, since `readLedger` drops every row whose `v` is not the current one and a bump would hide all history from `picket cost`.
**Instead of:** a `PostToolUseFailure` hook that appends one ledger row per failure: it needs a new hook wiring and a process per failed call, while the Stop hook already reads the transcript that holds the same facts.
**Risks:**
- **RISK-001** `tool_calls` on the same row counts the whole transcript (lead rows in session b636881f grow 29, 48, 49, 62 and so on), while the new fields count the turn. Mixing the two on one row can mislead a reader. Mitigation: the report of phase 2 sums only the new fields; cumulative counts cannot be summed per agent because rows carry no instance id (two architect instances interleave in session d09e885b).
- **RISK-002** A guard denial is also a failed call in the transcript (`Permission denied for Write: PreToolUse:...`), so it shows both as a `block` row and in `failed_tools`. Mitigation: the report shows the two in separate sections and never adds them together.

### D-002: One read-only verb, `picket patterns`
**Decision:** a new verb `picket patterns` (`readOnly: true`, no flags) reads the whole ledger and every work item's `replies.jsonl` and returns three sections: `denials`, `rejections`, `failed_tools`. Denials group `block` and `bounce` rows by event, hook and a reason key. The key is the reason with its `<hook>: ` prefix removed, double-quoted and backticked spans masked as `<q>`, then cut at the first `; `, `: ` or `. `, then paths (a run of segments joined by `/`) and bare file names with an extension masked as `<path>`, and whole numbers masked as `<n>`. Example from the ledger: `guard.scope: read ../../CONTRIBUTING.md with the Read tool before editing it; the file may have changed since you last saw it` gives `read <path> with the Read tool before editing it`. A one-off script with these rules folded the 447 denial rows on this machine's ledger at base aa8f6cb0 into 24 keys. Each group keeps its first raw reason as `example`. Failed tool calls group turn rows by agent and tool and sum `failed_tools`; rows without the field are skipped.
**Instead of:** new sections in `picket cost`: its JSON is a per-session token summary that its CLI tests pin, and its human render is one line.
**Risks:**
- **RISK-003** The key masks too little (a quoted command split across keys) or too much (two different refusals share a key). Mitigation: the `example` field shows one real reason per group, and the unit tests pin the key on real reasons from three hooks.

### D-003: A pattern recurs in two work items
**Decision:** a denial or failed-tool group is `recurring` when its rows name at least two distinct work items (rows with a null `work_id` add none), the same threshold `repeatedClasses` uses (`MIN_REPEATS = 2`, `src/lib/verbs/close/close.mts:78`). The report holds its own constant, because one verb may not import another (`test/repo/conventions.test.mjs`). Groups sort by count, highest first, then by hook and key.
**Instead of:** distinct sessions as the measure: a session that runs three items would count once, and the request asks for patterns across work items.
**Risks:**
- **RISK-004** The two constants can drift apart. Mitigation: both are 2 today; a later change to one is a visible edit in a reviewed phase.

### D-004: Rejections read with the reply verb's own pattern
**Decision:** the reject form's regex in `src/lib/verbs/reply/table.mts:75` moves to `src/lib/shared/work/replies.mts` as `REJECT_REPLY`, and the table imports it. The report keeps every reply row whose `reply` matches it, with `work_id`, `phase`, `action`, `ts` and the captured reason, sorted by `ts`. Reasons are listed, not grouped: free text has no key without model scoring, which is out of scope. Four reply rows on disk match today.
**Instead of:** reading the user's `rejected` rows in `verdicts.jsonl`: none of the nine such rows on disk carries a reason.

## Scope
**In:**
- `failed_tool_calls` and `failed_tools` on every new turn row (`stop`, `subagent_stop`, `gate`)
- `picket patterns`, JSON by default and a text render with `--human`, its entry in `VERB_NAMES`, the registry and `docs/reference/cli.md`
- moving the reject regex to the shared replies module

**Out:**
- any automatic edit to skills, agents or rules; LLM scoring; a score trend over time; bench tasks from work items; changes to guards or routing
- new fields in `picket cost`, a `--work` or `--since` filter, joining denials to failed calls
- rewriting old ledger rows

## Phase 1: Failed tool calls on the turn row
**Touch set:**
- `src/lib/shared/transcript/turn.mts`: turn boundary and the failure scan
- `src/lib/shared/transcript/entries.mts`: `ToolUse`, `TranscriptEntry` types, read only
- `src/lib/shared/ledger.mts`: `TurnRow` gains two optional fields
- `src/lib/hooks/emit/ledger/index.mts`: writes the two fields
- `src/lib/hooks/emit/ledger/index.test.mts`: unit tests for the row
- `test/hooks/emit.ledger.test.mjs`: built bundle writes the fields
- `test/support/hook.mts`: transcript and tool use helpers, read only
- `test/cli/cost.test.mjs`: pinning test, read only

**Changes:** add an exported turn failure scan to `turn.mts` that returns `{ count, tools }` per D-001. Add `failed_tool_calls?: number` and `failed_tools?: Record<string, number>` to `TurnRow`. `emitLedger` calls the scan on the same `path` it passes to `toolStats` and writes both fields on every row, `0` and `{}` when nothing failed. The test helper `toolUse` gives every call the id `t`; the tests build tool uses with distinct ids so results link to the right name.

**Done when:**
- **T-1.1** A unit test runs `emitLedger` on a `SubagentStop` whose transcript's last turn holds three tool uses (Bash, Edit, Read) and their results, Bash and Edit with `is_error: true`; the row has `failed_tool_calls` 2 and `failed_tools` `{"Bash":1,"Edit":1}`.
- **T-1.2** A unit test with a failed Read in the first turn, then a user text entry, then a second turn with no failed result writes `failed_tool_calls` 0 and `failed_tools` `{}`.
- **T-1.3** A unit test with a result whose `is_error` is `false` and one with no `is_error` key counts neither.
- **T-1.4** A test in `test/hooks/emit.ledger.test.mjs` runs the built `emit.ledger` bundle through `runHookBundle` on a transcript with one failed Bash call and reads `failed_tools` `{"Bash":1}` from the ledger.
- **T-1.5** `git diff aa8f6cb0 -- test/cli/cost.test.mjs` is empty and that file passes, so rows without the new fields still sum as before.
- **T-1.6** `TMPDIR=/tmp npm test` exits 0, typecheck included. The base fails `test/cli/init.test.mjs:104` when TMPDIR lies under HOME, as this session's does.

## Phase 2: The `picket patterns` report
**Touch set:**
- `src/lib/verbs/patterns/index.mts`: new verb, aggregation and render
- `src/lib/verbs/patterns/index.test.mts`: unit and round-trip tests
- `src/lib/verbs.mts`: `patterns` entry, `readOnly: true`
- `src/lib/cli/registry.mts`: lazy import of the verb
- `src/lib/shared/work/replies.mts`: exports `REJECT_REPLY`, `readReplies`
- `src/lib/verbs/reply/table.mts`: reject form imports `REJECT_REPLY`
- `src/lib/hooks/guard/bash/kernel.test.mts`: `READ_VERBS` gains `patterns`
- `docs/reference/cli.md`: regenerated by `npm run docs`
- `src/lib/verbs/cost/index.mts`: verb shape to copy, read only
- `src/lib/shared/work/state.mts`: `listWork`, read only
- `src/lib/verbs/reply/index.test.mts`: pinning test, read only

**Changes:** add `src/lib/verbs/patterns/index.mts` on the `cost` verb's shape (`VerbSpec`, `action`, `done`). Its result is `{ rows, skipped, denials, rejections, failed_tools }`: `rows` and `skipped` from `readLedger`; each denial `{ event, hook, key, count, items, recurring, example }`; each rejection `{ work_id, phase, action, ts, reason }`; each failed-tool group `{ agent, tool, count, items, recurring }` (D-002, D-003, D-004). The reason key is an exported pure function. The `--human` render prints three headed blocks that start with `denials:`, `rejections:` and `failed tool calls:`, each header with its total and, for the two grouped sections, how many groups recur; the headers print even when a section is empty. Register the verb, add `patterns` to `READ_VERBS`, move the reject regex to `REJECT_REPLY`, and run `npm run docs`.

**Done when:**
- **T-2.1** A unit test pins the reason key on three real reasons: the `guard.scope` example in D-002, `guard.block: the commit subject is 74 characters; ...` to `the commit subject is <n> characters`, and two `guard.bash` reasons `a/b/x.mts is code; ...` and `c/y.mts is code; ...` to one key `<path> is code`.
- **T-2.2** A round-trip unit test writes turn rows with `emitLedger` (phase 1's writer) for two work items, each with a failed Bash call by agent `developer`, and the report returns one failed-tool group `developer`, `Bash`, count 2, both items, `recurring` true; a group seen in one item has `recurring` false.
- **T-2.3** A round-trip unit test writes replies with `appendReply` (`x: shorten the subject`, `reject: wrong file`, `a`, `r 3`) and the report lists exactly the two rejections with reasons `shorten the subject` and `wrong file`.
- **T-2.4** A unit test runs the report on a temporary project and finds the ledger and every `replies.jsonl` byte for byte the same afterwards.
- **T-2.5** `git diff aa8f6cb0 -- src/lib/verbs/reply/index.test.mts` is empty and the file passes, so the reject form behaves as before the move.
- **T-2.6** `node dist/bin/picket.mjs patterns --human` exits 0 and prints `denials:`, `rejections:` and `failed tool calls:`.
- **T-2.7** `node dist/bin/picket.mjs patterns` exits 0 with JSON holding `denials`, `rejections` and `failed_tools`.
- **T-2.8** `TMPDIR=/tmp npm test` exits 0, including the `kernelClass` test with `patterns` as a read verb and the `cli.md` heading test.

## Open questions
none

## Revision log
