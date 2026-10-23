---
kind: design
lane: design
title: Refactor item 04d, reading and reporting
date: 2026-10-23
audience: developer
sources: [request.md, artifacts/refactor/04d-reading-and-reporting.md, artifacts/refactor/00-conventions.md, artifacts/refactor/04a-work-item-model.md, artifacts/refactor/04b-sources-and-intake.md, artifacts/refactor/04c-running-things.md, artifacts/refactor/05-hooks.md, artifacts/refactor/07a-mods.md, artifacts/refactor/07b-styling.md, artifacts/refactor/08a-instructions.md, work/20261022-refactor-item-03-kernel-cli-and-layout/design.md, work/20261023-refactor-item-04a-work-item-model/design.md, work/20261023-refactor-item-04b-sources-and-intake/design.md, work/20261023-refactor-item-04c-running-things/design.md, scripts/build.mjs, tsconfig.json, src/lib/util/yaml-lite.mjs, src/lib/util/io.mts, src/lib/util/git.mts, src/lib/util/process.mts, src/lib/shared/repos.mts, src/lib/shared/config.mjs, src/lib/shared/security-paths.mts, src/lib/shared/paths.mts, src/lib/shared/context.mts, src/lib/shared/git.mts, src/lib/shared/ledger.mjs, src/lib/shared/escalation.mjs, src/lib/shared/review-summary.mjs, src/lib/shared/transcript/transcript.mjs, src/lib/shared/transcript/turn-block.mjs, src/lib/shared/work/block.mts, src/lib/shared/styling/terminal.mjs, src/lib/hooks/emit.ledger.mjs, src/lib/hooks/hook.mjs, src/lib/hooks/guard.bash.mjs, src/lib/hooks/observe.drive.mjs, src/lib/verbs/admit, src/lib/verbs/cost, src/lib/verbs/statusline, src/lib/verbs/summary/index.mts, src/lib/verbs/pullrequest, src/lib/verbs/close/close.mts, src/lib/verbs/route/commit.mts, test/kernel/conventions.test.mjs, test/kernel/admit-labelled.test.mjs, test/kernel/admit.test.mjs, test/kernel/review.test.mjs, test/kernel/pr.test.mjs, test/kernel/cost.test.mjs, test/kernel/statusline.test.mjs, test/kernel/yaml-lite.test.mjs, test/hooks/handlers.test.mjs, test/budgets.test.mjs]
phases:
  - n: 1
    files: [src/lib/util/yaml-lite.mts, src/lib/shared/repos.mts, src/lib/shared/sources/intake.mts, src/lib/shared/work/state.mts, src/lib/shared/work/artifact.mts, test/kernel/yaml-lite.test.mjs, test/kernel/yaml-lite-corpus.json]
    greps:
      - path: src/lib/util/yaml-lite.mts
        pattern: 'export function readValue\(raw: string, line: number\): YamlValue'
      - path: src/lib/util/yaml-lite.mts
        pattern: 'unsupported value at line'
      - path: src/lib/shared/repos.mts
        pattern: '^(?![\s\S]*uncomment)'
        flags: i
      - path: test/kernel/yaml-lite.test.mjs
        pattern: 'yaml-lite-corpus\.json'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/shared/transcript/tail.mts, src/lib/shared/transcript/entries.mts, src/lib/shared/transcript/turn.mts, src/lib/shared/transcript/agent.mts, src/lib/shared/agent-name.mts, src/lib/shared/work/block.mts, src/lib/hooks/emit.ledger.mjs, src/lib/hooks/guard.block.mjs, src/lib/hooks/guard.scope.mjs, src/lib/hooks/monitor.context.mjs, src/lib/hooks/route.verdict.mjs, src/lib/verbs/statusline/statusline.mjs, src/lib/verbs/route/index.mts, test/hooks/handlers.test.mjs, test/kernel/transcript.test.mjs]
    greps:
      - path: src/lib/shared/transcript/tail.mts
        pattern: 'export function\* entriesFromEnd\(path: string'
      - path: src/lib/shared/work/block.mts
        pattern: 'export const BLOCK_HEADINGS'
      - path: src/lib/shared/work/block.mts
        pattern: 'export function detectBlock\(text: string'
      - path: test/hooks/handlers.test.mjs
        pattern: 'shared/transcript/tail\.mts'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/ledger.mts, src/lib/shared/escalation.mts, src/lib/hooks/emit.ledger.mjs, src/lib/hooks/hook.mjs, src/lib/hooks/guard.bash.mjs, src/lib/hooks/observe.drive.mjs, src/lib/verbs/close/close.mts, src/lib/verbs/route/commit.mts, src/lib/verbs/route/apply.mts, src/lib/verbs/cost/index.mts, test/kernel/ledger.test.mjs, test/kernel/cost.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: src/lib/shared/ledger.mts
        pattern: 'export type LedgerRow = TurnRow \| AcceptRow \| DenialRow \| EscalationRow'
      - path: src/lib/shared/ledger.mts
        pattern: 'export function appendLedger\(root: string, row: NewRow, now: Date\): void'
      - path: src/lib/shared/escalation.mts
        pattern: 'appendLedger\('
      - path: src/lib/hooks/emit.ledger.mjs
        pattern: '^(?![\s\S]*"unknown")'
        flags: i
      - path: src/lib/verbs/cost/index.mts
        pattern: 'export function summarizeLedger\('
    tests: true
    drive: true
    security: false
  - n: 4
    files: [src/lib/util/text-width.mts, src/lib/shared/paths.mts, src/lib/shared/styling/terminal.mjs, src/lib/verbs/statusline/index.mts, src/lib/verbs/statusline/facts.mts, src/lib/verbs/statusline/layout.mts, src/lib/verbs/statusline/paint.mts, src/lib/verbs/statusline/probe.mts, test/kernel/statusline.test.mjs, test/kernel/git.test.mjs, test/kernel/styling/terminal.test.mjs, test/kernel/paths.test.mjs]
    greps:
      - path: src/lib/shared/paths.mts
        pattern: 'export function userConfigPath\(home: string\): string'
      - path: src/lib/shared/paths.mts
        pattern: 'export function workspaceRoot\(dir: string \| null, fallback: string\): string'
      - path: src/lib/util/text-width.mts
        pattern: 'export function displayWidth\(text: string\): number'
      - path: src/lib/verbs/statusline/layout.mts
        pattern: 'export function layout\(facts: Facts'
      - path: src/lib/verbs/statusline/probe.mts
        pattern: 'entriesFromEnd\('
    tests: true
    drive: true
    security: false
  - n: 5
    files: [src/lib/verbs/admit/signals.mts, src/lib/verbs/admit/lane.mts, src/lib/verbs/admit/index.mts, test/kernel/admit.test.mjs, test/kernel/admit-labelled.test.mjs, bench/test/tasks.test.mjs]
    greps:
      - path: src/lib/verbs/admit/signals.mts
        pattern: 'securityPathOf\('
      - path: src/lib/verbs/admit/lane.mts
        pattern: 'export function laneOf\(signals: Signals, caps: LaneCaps\): Admission'
      - path: test/kernel/admit-labelled.test.mjs
        pattern: 'laneOf\(signalsOf\('
      - path: test/kernel/admit.test.mjs
        pattern: 'src/payments/fees\.ts'
    tests: true
    drive: true
    security: true
  - n: 6
    files: [src/lib/shared/review-summary.mts, src/lib/shared/git.mts, src/lib/verbs/summary/index.mts, src/lib/verbs/pullrequest/pr.mjs, src/lib/verbs/pullrequest/prepare.mts, test/kernel/review.test.mjs, test/kernel/mutate.test.mjs]
    greps:
      - path: src/lib/shared/review-summary.mts
        pattern: 'export function summarize\(root: string, changes: ChangeSet, config: SummaryConfig\): Summary'
      - path: src/lib/shared/review-summary.mts
        pattern: 'securityPathOf\('
      - path: src/lib/shared/review-summary.mts
        pattern: '^(?![\s\S]*execFileSync)'
        flags: i
      - path: src/lib/shared/git.mts
        pattern: 'export function diffStat\('
      - path: test/kernel/review.test.mjs
        pattern: 'Authentication/Login\.cs'
    tests: true
    drive: true
    security: true
  - n: 7
    files: [src/lib/verbs/pullrequest/pull-request.mts, src/lib/verbs/pullrequest/remote.mts, src/lib/verbs/pullrequest/threads.mts, src/lib/verbs/pullrequest/azdo.mts, src/lib/verbs/pullrequest/prepare.mts, src/lib/verbs/pullrequest/post.mts, src/lib/util/git.mts, src/lib/util/process.mts, test/kernel/pr.test.mjs, test/kernel/process.test.mjs]
    greps:
      - path: src/lib/verbs/pullrequest/pull-request.mts
        pattern: 'export function patOf\(env: NodeJS\.ProcessEnv, root: string\): string \| null'
      - path: src/lib/verbs/pullrequest/post.mts
        pattern: 'patOf\((ctx\.)?env, (ctx\.)?root\)'
      - path: src/lib/verbs/pullrequest/prepare.mts
        pattern: 'patOf\((ctx\.)?env, (ctx\.)?root\)'
      - path: src/lib/util/process.mts
        pattern: 'export function runProgram\('
      - path: test/kernel/pr.test.mjs
        pattern: 'pat-marker-04d'
    tests: true
    drive: true
    security: true
---
# Design: Refactor item 04d, reading and reporting

## Problem

The modules that read and report (`admit`, the review summary, `pullrequest`, the ledger and `cost`, `statusline`, the transcript readers and `yaml-lite`) mix deciding with reading, keep two or three copies of one reader, write the ledger with no declared row shape, match security paths with a bare `startsWith` in `admit` and both summaries (B3), and `yaml-lite` silently misreads a trailing comment or an inline map (B10). The user approved item 04d (`artifacts/refactor/04d-reading-and-reporting.md`: P-1 to P-7, its migration, risks R-1 to R-4) and the conventions C-001 to C-019 (`artifacts/refactor/00-conventions.md`); this record carries them into phases, re-decides none, and records where the code read on 2026-10-23 forces a detail the draft did not see. Binding constraints: items 03 to 04c fixed the layout (`verbs/<verb>/`, `shared/`, `util/`), `securityPathOf` (04a D-005), `currentItem` and `runShell` (04c), and the `pullrequest prepare` and `post` names (03 D-007, so only the internals move here); every converted module passes the scans of `test/kernel/conventions.test.mjs` (no `projectRoot(`, `process.env`, `homedir(`, `new Date(` outside `cli/`, `context.mts`, `paths.mts`). The build copies `.mjs` files verbatim (`scripts/build.mjs:51`), so an import inside a `.mjs` file keeps naming `.mjs`, while a converted `.mts` module names `.mts` (C-002). Every phase leaves `npm test` green and the CLI working, because this session drives the harness through `dist/`; a path a phase deletes goes on its block's Files line, since `picket verify` checks that each `files` path exists.

## Decisions

### D-001: `yaml-lite` reads comments and inline maps, and throws on the rest (fixes B10)
**Decision:** Infrastructural decision, carrying P-7 as prototyped (draft "yaml-lite", 11 value cases). `src/lib/util/yaml-lite.mts` replaces `yaml-lite.mjs` and exports `YamlScalar = string | number | boolean | null`, `YamlValue = YamlScalar | YamlValue[] | YamlMap`, `YamlMap = { [key: string]: YamlValue }`, `parse(text: string, firstLine = 1): YamlMap`, `readValue(raw: string, line: number): YamlValue`, `stringify(obj: YamlMap, indent = 0): string` (unchanged output) and `frontmatter(text): { front: YamlMap; body: string }`. `parse` keeps today's line structure (maps, block lists, one nesting level in list items) and hands every value to `readValue`. The value reader: a `#` outside quotes that starts the value or follows whitespace ends it (`1 # one` is `1`; `https://x.example/y#z` stays whole); `{key: value, ...}` of plain or quoted scalars is a map, and `[...]` holds scalars or such maps; a value that starts with `|`, `>`, `&`, `*` or `!`, a `{` or `[` inside `{...}`, or an unclosed bracket throws `yaml-lite: unsupported value at line <n>: <value>` or `yaml-lite: nested {...} or [...] inside {...} at line <n>`. A key line whose value is only a comment (`files: # later`) reads like `files:`. `frontmatter` passes `firstLine: 2`, so the number names the line in the file. `repos.mts`'s `uncomment`, which worked around B10 for the branching manifest, goes.
**Instead of:** vendoring a YAML parser: the files are written by Picket and its agents, a loud error covers anything outside the subset, and the user chose this on 2026-10-22 (P-7).
**Risks:**
- **RISK-001** A file that relied on the misread changes meaning, or a plain value that starts with `*`, `!`, `&`, `|` or `>` now throws (draft R-1). Mitigation: a corpus test holds every YAML document under `work/` read by the old parser at `3206f31` and requires the new parser to read each the same; a value that needs ` #` or a leading `*` is quoted, and `stringify` already quotes any string holding `#`.

### D-002: One transcript reader in `shared/transcript/`; block headings in `block.mts`
**Decision:** Infrastructural decision, carrying P-6 and 05's "Affects" line (one heading table, 04a and 04d). `shared/transcript/` becomes four `.mts` files and `transcript.mjs` and `turn-block.mjs` go. `tail.mts`: `TAIL_WINDOWS = [512 KiB, 4 MiB, Infinity]`, `tailText(path, maxBytes): string` (today's `readTail`, the partial first line dropped) and `entriesFromEnd(path, { maxBytes = Infinity, contains }: TailOptions): Iterable<TranscriptEntry>`, a generator that yields parsed entries newest first, reads the windows in turn and only the bytes the previous window did not cover, stops at `maxBytes`, skips unparsable lines, and with `contains` parses only lines holding that text. `entries.mts`: `TranscriptEntry`, `isUserText`, `messageText`, `toolUses(entry)`, `spawnHints`, `latestHints`, `toolStats`, `wasRead`. `turn.mts`: `turnSpan`, `readTurn`, `currentTurnAssistantEntries`, `blockLines`. `agent.mts`: `agentName`, `agentTranscript`, `isSubagentTurn`. Every reader keeps today's bound, so answers do not change: `readTurn`'s last assistant entry unbounded with `contains: '"assistant"'`, its turn entries and `wasRead` 4 MiB, `turnSpan` 512 KiB, `agentName` `tailText` 256 KiB, the hints and `toolStats` the whole file, the statusline's last skill 4 MiB with `contains: '"name":"Skill"'`. `shared/work/block.mts` gains `BLOCK_HEADINGS` (today's `BLOCKS`, same names and order) and `detectBlock(text)`. `detectVerdict`, `detectClassification`, `detectScope`, the second `VERDICTS` and the re-export go.
**Instead of:** one fixed 4 MiB window for every reader: `turnSpan` reads 512 KiB on every Stop and `lastAssistantEntry` must reach a huge last line, so one size is either slower or wrong for someone.
**Risks:**
- **RISK-002** A reader's bound changes by accident and a hook slows past its 200 ms cold budget or answers differently. Mitigation: the bounds are named per call above; `budgets.test.mjs` times every hook cold, and the `hooks.test.mjs` and `handlers.test.mjs` transcript cases pass unchanged.

### D-003: The ledger row is a typed union; `cost` is a pure `summarizeLedger`
**Decision:** Infrastructural decision, carrying P-4 and C-010. `shared/ledger.mts` replaces `ledger.mjs` and exports the draft's `Common`, `TurnRow`, `AcceptRow`, `DenialRow`, `EscalationRow` and `LedgerRow`, `NewRow` (a `LedgerRow` without `v` and `ts`), `appendLedger(root, row: NewRow, now: Date): void` through `appendJsonl`, `readLedger(root): JsonlRead<LedgerRow>` through `readJsonl`, keeping only `v === 2` rows (a row of another version is neither returned nor counted), and `recordAccept(root, id, commit, phase, now)`. Two details the code forces, verified on 2026-10-23: `EscalationRow.outcome` is `"ask" | "ran" | "denied"`, the values `guard.bash.mjs:1330-1338` and `observe.drive.mjs:55` write (the draft's `"asked"` and `"not_run"` are `cost`'s summary keys, and "not run" is computed by `notRunAsks`); `TurnRow.usage` is `Usage | null`, since `emit.ledger.mjs` writes `null` when the tail holds no assistant entry. `gate_kind` is `"approval" | "stall" | "irreversible" | null`. `shared/escalation.mts` replaces `escalation.mjs`; `recordEscalation(root, row, now)` builds an `EscalationRow` and calls `appendLedger`. A missing session is `null` in every row (R-2). `verbs/cost/index.mts` holds `summarizeLedger(rows, { session, work_id })` (today's `summarize`, output unchanged) and the action reads, then summarizes; `cost.mjs` goes.
**Instead of:** validating each row on read: the ledger is written only by Picket, and a field-by-field check costs every `cost` call for rows the compiler already shapes at the `.mts` writers.
**Risks:**
- **RISK-003** The `.mjs` writers (`emit.ledger.mjs`, `hook.mjs`) are not type-checked until item 05 converts them. Mitigation: their rows keep today's keys; `hooks.test.mjs` asserts the emitted turn row, and a new case asserts `session: null` when the event has no `session_id`.

### D-004: `statusline` splits into facts, layout, paint and probe
**Decision:** Infrastructural decision, carrying P-5 and C-007. `verbs/statusline/facts.mts`: `Facts`, `prettyModel`, `workspaceDir`, `factsOf(input, { now, skill, git }): Facts`. `layout.mts`: `Piece`, `Row = Piece[]`, `compactTokens`, `untilReset`, `levelColor`, `contextColor`, `cacheLeft`, `layout(facts, { columns, icons }): Row[]`, which returns the placed lines (today's `layout` then `placed`). `paint.mts`: `paint(rows: Row[]): string`, the ANSI codes and the line join. `probe.mts`: `iconsMode(home)`, `lastSkill(path)` over `entriesFromEnd` (D-002), and `liveProbe({ cacheDir, now, readGit, readSkill })`. `index.mts`: `renderStatusline(input, { now, columns, icons, probe })`, `recordSessionCost(root, input, now: Date)` and the action. `util/text-width.mts` exports `charWidth` and `displayWidth` with the East Asian table. `shared/paths.mts` gains `userConfigPath(home)` (`styling/terminal.mjs` imports it) and `workspaceRoot(dir: string | null, fallback: string): string`, the project root above `dir`, or `fallback` when `dir` is `null`, so the cost file is found from the input's `workspace.project_dir` without a `projectRoot(` call outside `paths.mts`. `compactTokens` and `prettyModel` stay as they print today; item 07a moves them to `shared/format.mts` (draft revision log line 1, 07a M-4, M-8).
**Instead of:** recording the cost under `ctx.root`: Claude Code runs the status line in the session's directory, which is not always the project, so a cost file would be lost; `paths.mts` already resolves roots from an event (`repoRelative`).
**Risks:**
- **RISK-004** The split changes the line every user sees, or slows it (draft R-4; 65 ms in item 03). Mitigation: `statusline.test.mjs` passes with only its import lines and the `recordSessionCost` call changed, and the phase measures the cold median against the base build.

### D-005: `admit` is two pure steps (fixes B3 in `admit`)
**Decision:** Domain service over the lane-admission policy, carrying P-1. `verbs/admit/signals.mts` exports `Signals` (today's keys in today's order), `forcedLane(text)`, `mentionedPaths(text, exists: (path: string) => boolean)` and `signalsOf(text, mentioned, touched, securityPaths): Signals`, where `security_path_hits` are the sorted unique paths with `securityPathOf(path, securityPaths) !== null`. `lane.mts` exports `NO_LANE`, `LaneCaps = { fast: { max_files: number } }`, `Admission = { lane: Lane | "none"; skill?: "debugging"; reasons: string[]; signals: Signals }` and `laneOf(signals, caps): Admission`, today's ladder with its order and reason wording. `index.mts` exports `admit(root, text, touched = [])`, which reads the config and the paths on disk and returns `laneOf(signalsOf(...))`, the action, and the verb. `admit.mjs` goes, and with it `recheck`, `CAPS`, the duplicate `securityPaths` and the `DEFAULT_SECURITY_PATHS` re-export. `config.mjs` stays `.mjs` (OQ-001); `index.mts` reads it through one typed view `{ security_paths: string[]; lanes: LaneCaps }`, as `open/index.mts` does for sources.
**Instead of:** passing the root into `signalsOf` so it can test paths itself: the labelled corpus would then need the bench fixture on disk to test the ladder, which is what P-1 removes.
**Risks:**
- **RISK-005** `securityPathOf` widens what counts as a hit: `Authentication/` now matches at any depth (`src/Api/Authentication/Login.cs`), where `startsWith` matched only at the root. Mitigation: that is B3's fix; a test pins it, and a scratch comparison over `admit-labelled.json` shows no other answer moves.

### D-006: One `summarize` behind every summary (fixes B3 in the summary)
**Decision:** Infrastructural decision, carrying P-2 and C-010. `shared/review-summary.mts` replaces `review-summary.mjs` and exports `ChangeSet` (the draft's fields, with `silencedInputs` the per-repository `{ dir, base, head, files, prefix }` inputs to the silenced scan), `changesOfItem(root, snap: WorkSnapshot, base: string)`, `changesOfRange(root, base, head)`, `SummaryConfig = { security_paths: readonly string[]; quality: QualityBar }`, `Summary` (size, changed_files, lines_added, lines_removed, frameworks, concerns, security_path, extension_steps, silenced), `summarize(root, changes, config): Summary`, `markWaived(moves, waivers, platform)` and `renderSummary(summary): string`, the one human line `<size> · <n> file(s), +a/-r · frameworks … · concerns … · security yes|no`. `security_path` is true when any changed file has `securityPathOf(file, config.security_paths) !== null`. `shared/git.mts` gains `diffStat(root, base, head: string | null): { added; removed }` (every file, as today's private `numstat`) and `rangeFiles(root, base, head)`, both over `gitRead`. `verbs/summary/index.mts` adds the item fields to `summarize`'s result in today's key order (`review.test.mjs:186`); `pullrequest prepare` uses `changesOfRange` and `summarize` as is. JSON keys and values stay.
**Instead of:** one function with an `id | range` switch: the item path reads the snapshot, nested repositories and waivers that a pull request never has, and a switch puts both inside one body.
**Risks:**
- **RISK-006** A field drifts between the item and range summaries, or the key order changes. Mitigation: `review.test.mjs` keeps its key-order assertion and its 16 cases; the range case compares against today's output for a fixed two-commit repository.

### D-007: `pullrequest` internals: the PAT from `ctx.env`, processes through `util/`
**Decision:** Infrastructural decision on a secret's path, carrying P-3 and the security-paths rule. `pr.mjs` splits inside `verbs/pullrequest/`: `pull-request.mts` (`PullRequest`, `parsePullRequestUrl`, `PAT_VARS`, `patOf(env, root): string | null`, which reads `env` first, then `.claude/settings.local.json` under `root`), `remote.mts` (`locateRepo`, `findRemote`, `fetchPullRequest` over `gitRead` and `gitRun`), `threads.mts` (`parseFindings`, `buildThreads`, pure), `azdo.mts` (`azdoRequest`, `pullRequestMeta`, `postThreads`). `prepare.mts` and `post.mts` pass `patOf(ctx.env, ctx.root)`; no function has a `process.env` or `process.cwd()` default. `util/git.mts`'s `GitRunOptions` gains `timeoutMs` for the 120 s fetch; `util/process.mts` gains `runProgram(program, args, { cwd, timeoutMs }): string`, throwing `ProgramFailed` with the last stderr line, for `gh pr view`. The PAT appears only in the `Authorization` header: never in a thrown message, a returned value or a rendered line. Error exit codes stay as today.
**Instead of:** keeping `pr.mjs` whole and typing it: four jobs (URL, git, Azure DevOps HTTP, finding parse) in one 211-line file, and the parse is the part item 08a changes next.
**Risks:**
- **RISK-007** The PAT leaks into output through an error path. Mitigation: a test posts to a local HTTP server that answers 401 with `AZDO_PAT` set to a marker value, and asserts the marker is absent from stdout and stderr while the server saw it in the header; the phase has its own gate.

## Scope

**In:**
- `util/yaml-lite.mts`, `util/text-width.mts`, `runProgram` and `GitRunOptions.timeoutMs` in `util/` (D-001, D-004, D-007).
- `shared/transcript/` (`tail`, `entries`, `turn`, `agent`), `BLOCK_HEADINGS` in `shared/work/block.mts`, `shared/ledger.mts`, `shared/escalation.mts`, `shared/review-summary.mts`, `diffStat` and `rangeFiles` in `shared/git.mts`, `userConfigPath` and `workspaceRoot` in `shared/paths.mts` (D-002 to D-004, D-006).
- `verbs/admit`, `verbs/cost`, `verbs/statusline`, `verbs/summary`, `verbs/pullrequest` split and converted; `admit.mjs`, `cost.mjs`, `statusline.mjs`, `pr.mjs`, `transcript.mjs`, `turn-block.mjs`, `ledger.mjs`, `escalation.mjs`, `review-summary.mjs`, `yaml-lite.mjs` deleted (D-001 to D-007).
- Callers repointed: `emit.ledger.mjs`, `guard.block.mjs`, `guard.scope.mjs`, `monitor.context.mjs`, `route.verdict.mjs`, `hook.mjs`, `guard.bash.mjs`, `observe.drive.mjs`, `close.mts`, `route/commit.mts`, `route/apply.mts`, `route/index.mts`, `styling/terminal.mjs`, `bench/test/tasks.test.mjs`; their tests. `agent-name.mjs` converts to `.mts` with the transcript reader that imports it.
- C-003 exceptions, as 04c D-003 took for `tooling.mts`: the new `.mts` modules import `config.mjs`, `extensions.mjs`, `silenced.mjs`, `mutation.mjs` (the summary, `admit`) and `styling/palette.mjs` (the status line), each still `.mjs` (OQ-001; 07b for the palette).

**Out:**
- Converting `config.mjs` to `.mts` (OQ-001); converting the hooks or giving them a `Context` (item 05).
- `shared/format.mts` and the `200k` token format (07a M-4, M-8; draft revision log line 1); parsing the colon finding form `path:line: text` (08a I-6, its migration line 168; draft revision log line 2). Reviewers still write the dash form today (`src/agents/reviewer.md:56`).
- A work item field in the status line: 04c's "Affects" line names `statusline` reading `currentItem`, but `statusline.mjs` reads no current item today, so there is no call to switch; adding one is a feature.
- `palette.mts` (07b); moving tests beside their code (item 06); the `pullrequest` names (done in item 03).

## Phase 1: `yaml-lite` reads comments and inline maps (B10)

**Touch set:**
- `src/lib/util/yaml-lite.mjs` to `src/lib/util/yaml-lite.mts`: `git mv`, typed, value reader (D-001)
- `src/lib/shared/repos.mts:7,17-20,34`: import names `.mts`; `uncomment` goes
- `src/lib/shared/sources/intake.mts:4`, `src/lib/shared/work/state.mts:6`, `src/lib/shared/work/artifact.mts:1`: import names `yaml-lite.mts`
- `src/lib/hooks/lint.schema.mjs:4`: read only, keeps `../util/yaml-lite.mjs`
- `test/kernel/yaml-lite.test.mjs`: value table, corpus, round trip, line numbers
- `test/kernel/yaml-lite-corpus.json`: new, generated at the base
- `test/kernel/intake.test.mjs`, `test/kernel/sources.test.mjs`: read only, must pass

**Changes:**
- Before touching the parser, a scratch script under `.picket/state/scratch/` runs the base build's `parse` and `frontmatter` over every `work/*/state.yaml`, `work/*/sources.yaml` and the frontmatter of every `work/*/order.md`, `design.md` and `research.md`, and writes `test/kernel/yaml-lite-corpus.json` as `[{ "path", "text", "expected" }]`, `text` being the YAML handed to `parse`.
- `yaml-lite.mts` per D-001. `readValue` is exported for its table test; the line structure functions stay private. Messages keep the `yaml-lite: ` prefix and `at line <n>`.
- `repos.mts` reads `path` and `default_branch` as strings with no comment stripping; its manifest fallback on a parse error stays.
- Behaviour change, draft table: `n: 1 # one` is `1`; an inline `greps` map is checked; a block scalar or anchor fails with its line number.

**Done when:**
- **T-1.1** The paths in this phase's `files` exist and `src/lib/util/yaml-lite.mjs` does not; `npm run typecheck` exits 0; `npm test` passes with no fewer passing tests than at `3206f31`, plus the new ones.
- **T-1.2** `yaml-lite.test.mjs` runs the draft's 11 value cases (`artifacts/refactor/04d-reading-and-reporting.md:174-184`) through `readValue(raw, 7)` and gets each listed result or error message exactly, for example `{path: a, more: {b: 1}}` throwing `yaml-lite: nested {...} or [...] inside {...} at line 7`.
- **T-1.3** `yaml-lite-corpus.json` holds at least 152 documents, and the test shows `parse(text)` deep-equal to `expected` for every one.
- **T-1.4** The test shows `frontmatter` of a file whose line 5 is `notes: |` throwing a message ending `at line 5: |`; `parse("files: # later\n  - a")` giving `{ files: ["a"] }`; and a branching manifest line `  - path: src/Orders # the orders repo` giving the nested repository `src/Orders` through `repos.mts`.
- **T-1.5** `parse(stringify({ a: "x #y", u: "https://x.example/y#z", m: "{x", n: 3 }))` deep-equals its input.
- **T-1.6** Driven through `picket drive --run`: in a temp root, `picket verify <id> 1` on a design item whose phase 1 entry is written `n: 1 # first` with `greps:` holding `- {path: a.txt, pattern: hello}` reports the grep true when `a.txt` holds `hello` and false after it is emptied, and never `frontmatter has no phases[] entry`.

## Phase 2: One transcript reader; block headings in `block.mts`

**Touch set:**
- `src/lib/shared/transcript/transcript.mjs`, `turn-block.mjs`: deleted; contents to the four files below
- `src/lib/shared/transcript/tail.mts`, `entries.mts`, `turn.mts`, `agent.mts`: new (D-002)
- `src/lib/shared/agent-name.mjs` to `src/lib/shared/agent-name.mts`: `git mv`, typed
- `src/lib/shared/work/block.mts`: `BLOCK_HEADINGS`, `detectBlock`
- `src/lib/hooks/emit.ledger.mjs:2`, `guard.block.mjs:1`, `guard.scope.mjs:3`, `monitor.context.mjs:1`, `route.verdict.mjs:2`: imports from the new files, `.mjs` names
- `src/lib/hooks/guard.bash.mjs:33`, `hook.mjs:2`, `inject.extensions.mjs:1`, `observe.drive.mjs:3`: read only, keep `agent-name.mjs`
- `src/lib/verbs/route/index.mts:2`: imports `agent-name.mts`
- `src/lib/verbs/statusline/statusline.mjs:7,327`: `tailText` from `tail.mjs` until phase 4
- `test/hooks/handlers.test.mjs:20,388`: hints from `entries.mjs`; the helper list names the new files
- `test/kernel/transcript.test.mjs`: new
- `test/hooks/hooks.test.mjs`, `test/budgets.test.mjs`: read only, must pass

**Changes:**
- `tail.mts` per D-002. `entriesFromEnd` yields newest first; when it grows from 512 KiB to 4 MiB it reads only the bytes before the first window, joins the cut line, and never yields an entry twice. `TailOptions = { maxBytes?: number; contains?: string }`.
- `entries.mts`: `TranscriptEntry = { type?: string; timestamp?: string; message?: { role?: string; model?: string; content?: unknown; usage?: Usage } }` plus unknown keys; `spawnHints`, `latestHints`, `toolStats` and `wasRead` keep their return shapes and read through `entriesFromEnd` with the bounds of D-002, reversing where they need file order.
- `turn.mts`: `readTurn(data, { includeToolPayloads })`, `turnSpan(path)`, `currentTurnAssistantEntries(path)` and `blockLines(text)`, with `SEND_TOOLS`, `BODY_KEYS` and the candidate order unchanged; `readTurn` calls `detectBlock` from `../work/block.mts`.
- `agent.mts`: `agentTranscript(data)`, `isSubagentTurn(data)`, `agentName(data, path)` over `tailText(path, 256 KiB)`.
- `block.mts`: `BLOCK_HEADINGS` as a readonly list of `[name, regex]`, the five entries of `turn-block.mjs:127-133` in order; `detectBlock(text: string | null | undefined): BlockKind | null`. The hooks' own regexes (`guard.block`'s `CONTRACT`, `route.verdict`'s `HEADINGS`, `emit.ledger`'s `HEADING`) stay for item 05.
- Hook event payloads stay untyped `Record<string, unknown>` reads at the boundary; no hook behaviour changes.

**Done when:**
- **T-2.1** The paths in this phase's `files` exist; `transcript.mjs`, `turn-block.mjs` and `agent-name.mjs` do not; `git grep -nE "transcript/(transcript|turn-block)|detectVerdict|detectClassification|detectScope" -- src test` finds nothing; `npm run typecheck` exits 0; `npm test` passes, with `hooks.test.mjs` unchanged and `handlers.test.mjs` changed only in its import line and helper list.
- **T-2.2** `transcript.test.mjs` writes a transcript of 6000 lines of about 1 KiB each and shows `entriesFromEnd` yielding all 6000 entries exactly once in reverse file order; with `maxBytes: 512 * 1024` only entries that end inside the last 512 KiB; with `contains: '"Skill"'` only those lines; one corrupt line skipped; a last line with no newline included.
- **T-2.3** The same test shows `detectBlock` giving `phase` for `## Phase 2 of a-b`, `review` for `## Review: a-b`, `artifact` for `## Design: a-b`, `report`, `expedited`, and `null` for plain text, and `detectBlock` exported only by `src/lib/shared/work/block.mts`.
- **T-2.4** A scratch script under `.picket/state/scratch/` runs the base build (`3206f31`, built in a temporary worktree) and this build over the five largest closed transcripts under this project's Claude Code folder, calling `readTurn`, `turnSpan`, `toolStats` (without `read_paths`), `spawnHints`, `latestHints`, `agentName` and `wasRead` for one read path each, and reports identical JSON; the block holds the counts.
- **T-2.5** Driven: `budgets.test.mjs`'s cold hook test passes, and `node dist/hooks/emit.ledger.mjs` fed a Stop event on a fixture transcript ending in a `## Phase 1 of <id>` block appends a row with that `work_id` and `phase: 1`.

## Phase 3: The ledger row as a typed union; `cost` over `summarizeLedger`

**Touch set:**
- `src/lib/shared/ledger.mjs` to `src/lib/shared/ledger.mts`: `git mv`, row types (D-003)
- `src/lib/shared/escalation.mjs` to `src/lib/shared/escalation.mts`: `git mv`, typed, `recordEscalation` through `appendLedger`
- `src/lib/shared/saved-rules.mjs:3`, `src/lib/hooks/powershell-text.mjs:2`: read only, keep `escalation.mjs`
- `src/lib/hooks/emit.ledger.mjs:45-75`: `session: event.session_id ?? null`; `appendLedger(root, row, new Date())`
- `src/lib/hooks/hook.mjs:38-50`: `appendLedger(..., new Date())`
- `src/lib/hooks/guard.bash.mjs:1344,1366`, `src/lib/hooks/observe.drive.mjs:54-55`: `readLedger(root).rows`; `recordEscalation(..., new Date())`
- `src/lib/verbs/close/close.mts:4,33,111`, `src/lib/verbs/route/commit.mts:2,8,11,28,41`, `src/lib/verbs/route/apply.mts:44`: typed `recordAccept` with `now`; the casts go
- `src/lib/verbs/cost/cost.mjs`: deleted; contents to `src/lib/verbs/cost/index.mts`
- `test/kernel/ledger.test.mjs`: new
- `test/kernel/cost.test.mjs:8`: imports `summarizeLedger`, `rowCosts` from `index.mjs`
- `test/hooks/hooks.test.mjs:858`: `recordEscalation(root, row, new Date())`; a no-session case

**Changes:**
- `ledger.mts` per D-003. `Usage = { input_tokens; cache_read_input_tokens; cache_creation_input_tokens; output_tokens: number }`. `NewRow` is the union with `v` and `ts` removed from each member, so a writer that sets a field of another row type fails the compile.
- `escalation.mts` keeps every export and regex of `escalation.mjs` byte for byte; only `recordEscalation(root, row, now)` changes, returning the row it appended. `notRunAsks` and `notRunBefore` take `LedgerRow[]`.
- `verbs/cost/index.mts`: `rowCosts`, `cacheHitRatio`, `summarizeLedger(rows: LedgerRow[], { session = null, work_id = null }: LedgerScope = {})` with `LedgerScope = { session?: string | null; work_id?: string | null }`, the action `readLedger(ctx.root).rows` then `summarizeLedger`; `CostSummary` gains the fields today's JSON has; `renderCost` unchanged.
- `commitPhase(root, snap, phase, env, now)`; `close` passes its `now`.
- Behaviour change, R-2: a turn row with no session id writes `session: null` where it wrote `"unknown"`; old rows on disk are read as they are.

**Done when:**
- **T-3.1** The paths in this phase's `files` exist; `ledger.mjs`, `escalation.mjs` and `cost.mjs` do not; `git grep -nE "appendFileSync|new Date\(" -- src/lib/shared/ledger.mts src/lib/shared/escalation.mts` and `git grep -n "as unknown as RecordAccept" -- src` find nothing; `npm run typecheck` exits 0; `npm test` passes, with `cost.test.mjs` changed only in its import line and the function name.
- **T-3.2** `ledger.test.mjs` shows `appendLedger(root, { event: "accept", session: null, agent: null, work_id: "w1", phase: 1, commit: "abc1234", lines_added: 3 }, new Date("2026-10-23T10:00:00.000Z"))` writing the line `{"v":2,"ts":"2026-10-23T10:00:00.000Z","event":"accept",...}` on its own line after a file that ends mid-line, and `readLedger` returning the good rows with `skipped: 1` for one bad line and leaving out a `"v":1` row without counting it.
- **T-3.3** `hooks.test.mjs` shows `emit.ledger` fed a Stop event with no `session_id` writing a turn row with `"session":null`, and with `session_id: "s2"` writing `"s2"`.
- **T-3.4** `hooks.test.mjs`'s escalation cases pass with the new call, and a row written by `recordEscalation` carries `v: 2`, the given `ts`, `event: "escalation"`, `outcome: "ask"` and a 64-character `key`.
- **T-3.5** Driven through `picket drive --run`: `picket cost --root <tmp> --human` over a fixture ledger (two turn rows from sessions `a` and `b` at $0.50 each, one accept of 10 lines, one `ask` escalation never run, one `"unknown"` turn row) prints the same `--human` line and the same JSON as the base build (`3206f31`) for that fixture, the line starting `3 turns` and ending `escalations 1 asked, 0 ran, 1 not run, 0 denied`, and `picket cost --session unknown --root <tmp>` still counts the old row.

## Phase 4: `statusline` in facts, layout, paint and probe

**Touch set:**
- `src/lib/verbs/statusline/statusline.mjs`: deleted; contents split as D-004
- `src/lib/verbs/statusline/facts.mts`, `layout.mts`, `paint.mts`, `probe.mts`: new
- `src/lib/verbs/statusline/index.mts`: `renderStatusline`, `recordSessionCost`, the action
- `src/lib/util/text-width.mts`: new, `charWidth`, `displayWidth`
- `src/lib/shared/paths.mts`: `userConfigPath`, `workspaceRoot`
- `src/lib/shared/styling/terminal.mjs:25-27`: `userConfigPath` from `../paths.mjs`
- `src/lib/shared/styling/palette.mjs`, `src/lib/shared/git.mts`, `src/lib/shared/transcript/tail.mts`: read only
- `test/kernel/statusline.test.mjs:7`, `test/kernel/git.test.mjs:9`, `test/kernel/styling/terminal.test.mjs:5`: import lines; `recordSessionCost(root, input, now)` calls
- `test/kernel/paths.test.mjs`: `userConfigPath`, `workspaceRoot` cases

**Changes:**
- `facts.mts`, `layout.mts`, `paint.mts`, `probe.mts` per D-004, moving today's functions with their bodies; `Facts`, `Piece = { text; color?; bg?; bold? }` and `Row` typed; `GLYPHS`, `COLORS` and the layout constants stay private to `layout.mts` and `paint.mts`.
- `probe.mts`: `lastSkill(path)` walks `entriesFromEnd(path, { maxBytes: 4 MiB, contains: '"name":"Skill"' })` and returns the last `Skill` call's `input.skill`; `iconsMode(home)` reads `userConfigPath(home)` with `readJson`; `liveProbe` unchanged.
- `index.mts`: the action computes `now().getTime()`, the probe in `join(tmpdir(), "picket-statusline")`, `layout`, `paint`, then `recordSessionCost(workspaceRoot(input.workspace?.project_dir ?? workspaceDir(input), ctx.root), input, now())`; the cost file's `ts` comes from `now`.
- `workspaceRoot(dir, fallback)` returns `projectRoot(dir)` for a directory and `fallback` for `null`.

**Done when:**
- **T-4.1** The paths in this phase's `files` exist and `statusline.mjs` does not; `npm run typecheck` exits 0; `npm test` passes, with `statusline.test.mjs`, `git.test.mjs` and `styling/terminal.test.mjs` changed only in import lines and `recordSessionCost` call lines.
- **T-4.2** `git grep -nE "projectRoot\(|new Date\(|process\.env|homedir\(" -- src/lib/verbs/statusline` finds nothing, and `git grep -n "picketai/config.json" -- src/lib` shows only `src/lib/shared/paths.mts`.
- **T-4.3** `paths.test.mjs` shows `userConfigPath("/h")` equal to `join("/h", ".picketai/config.json")`, `workspaceRoot(join(tmp, "a", "b"), "/f")` giving `tmp` for a temp project marked as `projectRoot` marks one, and `workspaceRoot(null, "/f")` giving `/f`.
- **T-4.4** Driven: `picket statusline` fed `test/kernel/statusline-input.json` with `session_id` set to a valid session id and `workspace.project_dir` set to a temp project holding `.picket/` prints the line set and writes the file `sessionCostPath(<tmp>, <id>)` names, with its `cost_usd`.
- **T-4.5** Measured: 40 interleaved cold runs each of `echo {} | node dist/bin/picket.mjs statusline` with the base build (`3206f31`, temporary worktree) and this build give a median for this build of at most 200 ms and at most 10 ms above the base median; both medians are in the block.

## Phase 5: `admit` as two pure steps (B3 in `admit`)

**Touch set:**
- `src/lib/verbs/admit/admit.mjs`: deleted; contents to `signals.mts` and `lane.mts`
- `src/lib/verbs/admit/signals.mts`, `lane.mts`: new (D-005)
- `src/lib/verbs/admit/index.mts`: `admit(root, text, touched)`, the action
- `src/lib/shared/security-paths.mts`, `src/lib/shared/config.mjs`, `src/lib/shared/work/state.mts`: read only (`securityPathOf`, `loadConfig`, `Lane`)
- `test/kernel/admit.test.mjs:7` and its `admit(text, { root })` calls: `admit(root, text)`; the `recheck` case goes; B3 cases
- `test/kernel/admit-labelled.test.mjs:5,41`: `laneOf(signalsOf(...))`
- `bench/test/tasks.test.mjs:5,26,28`: imports `admit` from `index.mjs`, root first

**Changes:**
- `signals.mts`: the regexes of `admit.mjs:21-37`, `forcedLane`, `mentionedPaths(text, exists)`, `withoutNonCredentialTokens`, `isDiagnosis`, `signalsOf(text, mentioned, touched, securityPaths)` per D-005; `touched` is the list and `signals.touched` its length, as today.
- `lane.mts`: `laneOf` holds `forcedResult` and the ladder of `admit.mjs:127-160`, reasons word for word; it reads `caps.fast.max_files`.
- `index.mts`: `admit(root, text, touched = [])` loads the config once, builds `exists = (p) => existsSync(join(root, p))`, and returns `laneOf(signalsOf(text, mentionedPaths(text, exists), touched, config.security_paths), config.lanes)`; the action keeps `NO_TEXT`, `requestText`, the usage line and `renderAdmission`.
- Behaviour change: a mentioned or touched path under a configured glob entry (`src/payments/**`) or under `Authentication/` at any depth now counts as a security path hit.

**Done when:**
- **T-5.1** The paths in this phase's `files` exist and `admit.mjs` does not; `git grep -nE "recheck|securityPathHits|\bCAPS\b|DEFAULT_SECURITY_PATHS" -- src/lib/verbs/admit test/kernel/admit.test.mjs` finds nothing; `npm run typecheck` exits 0; `npm test` passes, the bench task test included.
- **T-5.2** `admit-labelled.test.mjs` computes every answer as `laneOf(signalsOf(request, mentionedPaths(request, exists), [], DEFAULT_SECURITY_PATHS), { fast: { max_files: 3 } })` with `exists` over `bench/fixture`, and its share stays at least 0.9; a scratch comparison of the base build's `admit` and this build over every entry of `admit-labelled.json` shows identical lane, skill and reasons for all of them.
- **T-5.3** `admit.test.mjs` shows, with `security_paths: ["src/payments/**"]` and the file present, `admit(root, "Tidy the rounding in src/payments/fees.ts")` landing in `design` with `security_path_hits: ["src/payments/fees.ts"]`; under the defaults, `src/Api/Authentication/Login.cs` touched gives a hit and `src/authx/a.ts` touched gives none.
- **T-5.4** `admit.test.mjs` calls `laneOf` on a hand-built `Signals` value (every flag false, `small_change: true`, no paths) with `{ fast: { max_files: 3 } }` and gets `fast` with the reason `small change: no file(s) named, no new surface, no new dependency, no design question`, with no temp folder.
- **T-5.5** Driven through `picket drive --run`: `picket admit --text "Tidy the rounding in src/payments/fees.ts" --root <tmp> --human` on that temp root prints `lane: design (touches a security path or an authentication concern)` and exits 0; `picket admit --text ""` prints the `(none)` line as before.

## Phase 6: One `summarize` behind every summary (B3 in the summary)

**Touch set:**
- `src/lib/shared/review-summary.mjs` to `src/lib/shared/review-summary.mts`: `git mv`, split per D-006
- `src/lib/shared/git.mts`: `diffStat`, `rangeFiles`
- `src/lib/verbs/summary/index.mts`: `itemSummary`, `rangeSummary`, the action, `renderSummary` from shared
- `src/lib/verbs/pullrequest/pr.mjs:9,208`: `summarize(root, changesOfRange(...), loadConfig(root))` until phase 7
- `src/lib/verbs/pullrequest/prepare.mts:219,255-257`: the summary line from `renderSummary`
- `src/lib/shared/work/snapshot.mts`, `approvals.mts`, `files.mts`, `src/lib/shared/sources/drift.mts`, `src/lib/shared/repos.mts`, `src/lib/shared/extensions.mjs`, `src/lib/shared/silenced.mjs`, `src/lib/shared/mutation.mjs`, `src/lib/shared/config.mjs`: read only
- `test/kernel/review.test.mjs:9` and its calls: `itemSummary`, `rangeSummary` from `verbs/summary/index.mjs`; B3 cases
- `test/kernel/mutate.test.mjs:11`: `itemSummary` from the summary verb

**Changes:**
- `review-summary.mts` per D-006: `SIZE`, `sizeClass`, `extensionSteps`, `detectFrameworks`, `detectConcerns`, `changesOfItem`, `changesOfRange`, `summarize`, `markWaived`, `renderSummary`, with today's logic; `numstat` and the two `execFileSync` calls give way to `diffStat` and `rangeFiles`; `pathKey` takes `platform`.
- `verbs/summary/index.mts`: `itemSummary(root, id, { base, env, platform })` reads the snapshot, `loadConfig(root, env)`, `changesOfItem`, `summarize`, and builds the JSON in the order `work_id, base, request, size, changed_files, lines_added, lines_removed, frameworks, concerns, security_path, extension_steps, phases, repos, sources, silenced, mutation`, with `silenced` through `markWaived(..., itemWaivers(root, id), platform)` and `request` through `workFile`; `rangeSummary(root, base, head, env)` returns `{ base, head, ...summarize(...) }` in today's order. The action passes `ctx.env` and `ctx.platform`; the human line is `renderSummary` plus today's tail.
- `prepare.mts`'s summary line and `summary`'s first part are the one `renderSummary`.

**Done when:**
- **T-6.1** The paths in this phase's `files` exist and `review-summary.mjs` does not; `npm run typecheck` exits 0; `npm test` passes, with `review.test.mjs` keeping its 16 cases and its key-order assertion, changed only in imports and call form, plus the new cases.
- **T-6.2** `review.test.mjs` shows, in a temp repository, an item summary with `security_paths: ["src/payments/**"]` and a changed `src/payments/fees.ts` giving `security_path: true`; under the defaults, a changed `src/Api/Authentication/Login.cs` giving `true` and a changed `src/authx/a.ts` giving `false`; the same three for `rangeSummary` over a two-commit range.
- **T-6.3** `git grep -n "file(s), +" -- src` shows only `src/lib/shared/review-summary.mts`, and `git grep -n "reviewSummary" -- src test` finds nothing.
- **T-6.4** Driven through `picket drive --run`: on one fixture repository with a work item and two commits, `picket summary <id> --root <tmp>`, `picket summary --range <a>..<b> --root <tmp>` and their `--human` forms print the same output from this build as from the base build (`3206f31`, temporary worktree).

## Phase 7: `pullrequest` internals; the PAT from the context

**Touch set:**
- `src/lib/verbs/pullrequest/pr.mjs`: deleted; contents to the four files below
- `src/lib/verbs/pullrequest/pull-request.mts`, `remote.mts`, `threads.mts`, `azdo.mts`: new (D-007)
- `src/lib/verbs/pullrequest/prepare.mts`, `post.mts`: typed calls, `patOf(ctx.env, ctx.root)`, the casts go
- `src/lib/util/git.mts`: `GitRunOptions.timeoutMs`
- `src/lib/util/process.mts`: `runProgram`, `ProgramFailed`
- `src/lib/shared/review-summary.mts`, `src/lib/shared/paths.mts`: read only (`changesOfRange`, `summarize`, `hostPath`)
- `src/skills/reviewing/SKILL.md:106,109`: read only, commands unchanged
- `test/kernel/pr.test.mjs:7` and its calls: new imports, root-first `preparePullRequest`, `patOf`; the leak test
- `test/kernel/process.test.mjs`: `runProgram` cases

**Changes:**
- `pull-request.mts`: `PullRequest` (today's object, typed), `parsePullRequestUrl`, `PAT_VARS`, `patOf(env, root)`.
- `remote.mts`: `locateRepo(root, pr)`, `findRemote(root, pr)`, `fetchPullRequest(root, remote, id)` over `gitRead` and `gitRun(..., { timeoutMs: 120_000 })`; messages unchanged.
- `threads.mts`: `Finding`, `Thread`, `parseFindings(text)` (today's regex, dash form), `buildThreads(reviewText)`.
- `azdo.mts`: `azdoRequest(pr, path, { method, body, pat, apiVersion })` with the 7.1 then 6.0 fallback, `pullRequestMeta(pr, { pat, root })` (GitHub through `runProgram("gh", [...], { cwd: root, timeoutMs: 30_000 })`), `postThreads(pr, reviewText, { pat, dryRun })`; no default reads the process.
- `prepare.mts`: `preparePullRequest(root, url, { repo, pat, env })` builds the summary with `summarize(repoRoot, changesOfRange(repoRoot, base, head), loadConfig(repoRoot, env))`; output JSON unchanged.
- `post.mts`: unchanged JSON and lines; `patOf` takes `ctx.root`, so the local settings file is read under `--root`, not the shell's folder.

**Done when:**
- **T-7.1** The paths in this phase's `files` exist and `pr.mjs` does not; `git grep -nE "process\.|execFileSync|as unknown as" -- src/lib/verbs/pullrequest` finds nothing; `npm run typecheck` exits 0; `npm test` passes, with `pr.test.mjs` changed only in imports, call form and the new cases.
- **T-7.2** `pr.test.mjs` shows `patOf({}, root)` null, `from-local-settings` from `<root>/.claude/settings.local.json`, `AZDO_PAT` winning over the file, and `AZURE_DEVOPS_EXT_PAT` read with no file.
- **T-7.3** `pr.test.mjs` starts a local HTTP server answering 401 with body `{"message":"denied"}`, spawns `picket pullrequest post http://127.0.0.1:<port>/c/p/_git/r/pullrequest/7 --file review.md --root <tmp>` with `AZDO_PAT=pat-marker-04d`, and shows a non-zero exit, `pat-marker-04d` and its base64 form absent from stdout and stderr, and the server's `Authorization` header equal to `Basic ` plus the base64 of `:pat-marker-04d`.
- **T-7.4** The same test, with the PAT only in `<tmp>/.claude/settings.local.json` and the process started in another folder, shows the header carrying that PAT.
- **T-7.5** `process.test.mjs` shows `runProgram("node", ["-e", "process.stdout.write('ok')"], { cwd, timeoutMs: 5000 })` returning `ok`, and a program that writes `boom` to stderr and exits 3 throwing `ProgramFailed` with a message ending `boom`.
- **T-7.6** Driven: `pr.test.mjs`'s prepare case over the local remote publishing `refs/pull/7/merge` passes, and `picket pullrequest prepare <url> --repo <clone> --human` on that fixture prints its summary line in the `renderSummary` form.

## Open questions

- **OQ-001** Who converts `config.mjs` (and `extensions.mjs`, `silenced.mjs`, `mutation.mjs`) to `.mts`? Items 04b and 04c deferred `config.mjs` to 04d, but the 04d draft does not list it, and its `env = process.env` default touches every `.mjs` caller that reads sources. Owner: the lead, with the user. Fallback: they stay `.mjs`; `admit` and the summary read them through one typed view each (D-005, D-006), named as C-003 exceptions in Scope.

## Revision log
