---
kind: design
lane: design
title: Budget, schema, live session, admit fixes
date: 2026-11-09
audience: developer
sources: [work/20261109-fix-budget-schema-session-admit-findings/request.md, work/20261109-consistency-determinism-performance-since-alpha-/research.md, .claude/rules/harness-authoring.md, CLAUDE.md, src/templates/claude-block.md, src/lib/shared/install.mts, src/lib/verbs/init/init.mjs, test/timing/budgets.test.mjs, test/kernel/init.test.mjs, test/cli/init.test.mjs, test/repo/names.test.mjs, bench/schema/ledger-v2.schema.json, src/lib/shared/ledger.mts, src/lib/hooks/emit/ledger/index.test.mts, src/lib/shared/host-sessions.mts, src/lib/shared/host-sessions.test.mts, src/lib/verbs/list/index.mts, src/lib/verbs/list/index.test.mts, src/lib/shared/work/attention.mts, src/mods/status/hooks/session-files.ts, src/mods/status/hooks/index.test.tsx, scripts/build.mjs, src/lib/shared/mod-switch.mts, src/lib/verbs/worktree/create.mts, src/lib/shared/checkouts.mts, src/lib/shared/admission/lane.mts, src/lib/shared/admission/signals.mts, src/lib/shared/admission/admit.mts, src/lib/shared/admission/lane.test.mts, src/lib/shared/admission/admit-labelled.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/verbs/admit/index.test.mts, test/cli/cli.test.mjs, bench/test/tasks.test.mjs, src/skills/expediting/SKILL.md]
phases:
  - n: 1
    files: [CLAUDE.md, src/templates/claude-block.md, test/timing/budgets.test.mjs, bench/schema/ledger-v2.schema.json]
    greps:
      - path: test/timing/budgets.test.mjs
        pattern: 'claude_md_bytes: 2048\b'
      - path: bench/schema/ledger-v2.schema.json
        pattern: '"cost_usd"'
        absent: true
      - path: src/templates/claude-block.md
        pattern: '^## Every request\b'
      - path: src/templates/claude-block.md
        pattern: '^## Rules\b'
      - path: src/templates/claude-block.md
        pattern: '`REPORT WRITTEN`, `AMENDED`'
      - path: CLAUDE.md
        pattern: '^## Project facts\b'
    tests: true
    drive: false
    security: false
  - n: 2
    files: [src/lib/shared/live-session.mts, src/lib/shared/live-session.test.mts, src/lib/shared/host-sessions.mts, src/lib/shared/host-sessions.test.mts, src/lib/verbs/list/index.mts, src/lib/verbs/list/index.test.mts, src/mods/status/hooks/session-files.ts, src/mods/status/hooks/index.test.tsx, scripts/build.mjs]
    greps:
      - path: src/lib/shared/live-session.mts
        pattern: 'export function isProjectSession\b'
      - path: src/lib/shared/host-sessions.mts
        pattern: '\bisProjectSession\('
      - path: src/mods/status/hooks/session-files.ts
        pattern: '\bisProjectSession\('
      - path: src/mods/status/hooks/session-files.ts
        pattern: 'info\.cwd === root'
        absent: true
      - path: scripts/build.mjs
        pattern: 'live-session\.mts'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [src/lib/shared/admission/lane.mts, src/lib/shared/admission/lane.test.mts, src/lib/shared/admission/admit-labelled.test.json, src/lib/shared/admission/admit-labelled.test.mts, src/lib/verbs/admit/index.test.mts, test/cli/cli.test.mjs]
    greps:
      - path: src/lib/shared/admission/lane.mts
        pattern: 'touch set from the request: '
      - path: src/lib/shared/admission/admit-labelled.test.json
        pattern: '"lane": "pending"'
      - path: src/lib/shared/admission/admit-labelled.test.mts
        pattern: 'PENDING \? "fast"'
        absent: true
    tests: true
    drive: true
    security: false
---
# Design: Budget, schema, live session, admit fixes

## Problem

The research item `work/20261109-consistency-determinism-performance-since-alpha-/research.md` accepted four findings. R-001: `.claude/rules/harness-authoring.md:5` says CLAUDE.md is at most 2048 bytes, `test/timing/budgets.test.mjs:15` enforces 2560, and CLAUDE.md is 2352 bytes. R-014: `bench/schema/ledger-v2.schema.json` lists `cost_usd`, which the ledger no longer writes (`src/lib/hooks/emit/ledger/index.test.mts:32` asserts its absence). R-009: the kernel's `liveSessionIds` counts every registry file while the status mod's `liveSessions` requires `cwd === root`, so `picket list` and the pane disagree. R-015: since d0aa129 a small change that names existing files but passes no `--touched` answers `pending`, costing every fast item one more admit call and model turn. The binding constraints are that `CLAUDE.md` starts with the template byte for byte (`test/kernel/init.test.mjs:31`), that `picket init` finds the old block by the headings the new template owns (`claudeBlockSpan` in `src/lib/shared/install.mts`), and that the status mod imports only the files listed in `MOD_LIB_SHARED` (`scripts/build.mjs:24`).

## Decisions

### D-001: Trim the shipped block by rewording, keeping its headings and every name
**Decision:** Infrastructural decision. Shorten `src/templates/claude-block.md` and the identical first 1927 bytes of `CLAUDE.md` in one edit, from 1927 to at most 1623 bytes (1927 minus 304). The template keeps its three headings (`# Picket`, `## Every request`, `## Rules`), the five numbered items, every `picket` command it names today (`admit`, `state`, `next`, `route`, `packet`, `reply`, `init`), the four lane skills, `picket:consulting`, the six rule names and the nine verdict tokens in today's order. The cuts are wording, plus two sentences: the agent list in item 3 (every send `picket next` prints carries the agent type) and "A near miss is not a verdict." (the word "exact" carries it). The target leaves room for a CRLF checkout: CLAUDE.md's LF size plus its line count stays at most 2048. The repository-only sections of CLAUDE.md stay as they are.
**Instead of:** cutting the repository-only `## This repository` text: it reaches 304 bytes only by deleting it all, and it leaves every installed project's CLAUDE.md as heavy as before, while the request asks for the block and CLAUDE.md in step.
**Risks:**
- **RISK-001** Dropping or renaming a `##` heading would leave an upgraded project's old section behind, because `claudeBlockSpan` ends the block at the first heading the new template does not own. Mitigation: T-1.4 compares the heading list with the base.
- **RISK-002** A Windows checkout with `core.autocrlf` adds one byte per line, and the budget test reads the raw size. Mitigation: T-1.2 bounds the LF size plus the line count, not the LF size alone (the candidate measures 2022 bytes over 25 lines).

### D-002: Remove only `cost_usd` from the ledger schema
**Decision:** Infrastructural decision. Delete the `cost_usd` property from `bench/schema/ledger-v2.schema.json` and change nothing else in it. No code loads this file (grep of `src/`, `bench/`, `test/` and `scripts/` finds only the summary string in `src/lib/hooks.mts:72` and the README line), so the change cannot break a reader.
**Instead of:** bringing the schema up to every row type `src/lib/shared/ledger.mts` writes: that is outside this request and is put as OQ-002.
**Risks:**
- **RISK-003** An old ledger row carrying `cost_usd` no longer validates, because the schema sets `additionalProperties: false`. Mitigation: nothing validates against the schema, and the local `.picket/state/ledger.jsonl` holds no `cost_usd` key (checked 2026-11-09).

### D-003: One pure live-session predicate shared by the kernel and the mod
**Decision:** Infrastructural decision. A new module `src/lib/shared/live-session.mts` exports `isProjectSession(cwd: unknown, root: string): boolean` and imports nothing. `liveSessionIds` in `src/lib/shared/host-sessions.mts` and `liveSessions` in `src/mods/status/hooks/session-files.ts` both filter registry rows through it. The module joins `MOD_LIB_SHARED` in `scripts/build.mjs`, the same path `src/lib/shared/mod-switch.mts` takes to serve both `src/lib/shared/config.mjs` and the status mod. `liveSessionIds` gains the root: `liveSessionIds(configDir: string, root: string): Set<string>`, and `picket list` passes its context root.
**Instead of:** writing the rule twice, once per side, with a shared test table: the two copies are what drifted in R-009, and a table only catches drift where a test author thinks to look.
**Risks:**
- **RISK-004** A file in `MOD_LIB_SHARED` that imports anything outside the list breaks the built mod. Mitigation: the module imports nothing, and `test/repo/mods.test.mjs` checks that every listed file lands in each built mod.

### D-004: A worktree is a Picket worktree folder, decided from the path alone
**Decision:** Infrastructural decision. Picket creates every worktree at `<repo>/.worktrees/<name>`, where the repo is `.` or a nested repo path and the name holds no slash (`planWorktrees` in `src/lib/shared/checkouts.mts`, `worktreeDirName` replaces `/` and spaces). So `isProjectSession` holds when `cwd` is a string and, after both paths turn backslashes into slashes and lose trailing slashes, `cwd` equals `root`, or `cwd` is `root/` followed by zero or more segments, then `.worktrees/`, then one segment, with no `..` segment. With root `/p`: `/p`, `/p/.worktrees/fix-a` and `/p/src/Orders/.worktrees/fix-a` count; `/p/src`, `/p/.worktrees/fix-a/src`, `/p2` and `/q` do not. String comparison only, no regular expression built from the root, no file system and no git.
**Instead of:** asking git (`git worktree list --porcelain`) for the project's worktrees: run from the root it does not list a nested repo's worktrees, and the mod would spawn a process on every pane refresh. It gives up a worktree made by hand outside a `.worktrees/` folder, and a worktree `picket worktree` resumed from elsewhere (`openCheckout` in `src/lib/verbs/worktree/create.mts`); OQ-001 asks whether those must count.
**Risks:**
- **RISK-005** The registry spells a path differently from the root (a symlinked folder, a drive letter in another case). Mitigation: on this host the registry `cwd` is the resolved path (`/mnt/work/...`, not the `/home/vlad/Work` symlink) and `projectRoot` resolves too; the mod compared with `===` before, so separator and trailing slash folding only widens what matched.

### D-005: Existing files a request names stand in for the touch set
**Decision:** In `smallChangeResult` (`src/lib/shared/admission/lane.mts`) the answer is `pending` only when `signals.touched` is 0 and `signals.mentioned_paths` is empty. When `touched` is 0 and the request names 1 to `lanes.fast.max_files` existing files (3 by default, `src/lib/shared/config.mjs:18`), the answer is `fast` and its reasons end with one line `touch set from the request: <paths joined by ", ">`, in the sorted order `mentionedPaths` returns. A non-empty `--touched` keeps today's answer and reasons. The numbered-items rule and the file cap stay where they are, before this function.
**Instead of:** a new `touch_set` field on the `Admission` JSON: it widens the `picket admit` output contract that `picket open` reads, while nothing would read the field yet.
**Risks:**
- **RISK-006** A request names a file it only cites, so the fast answer rests on a wrong touch set. Mitigation: `src/skills/expediting/SKILL.md:21` still runs admit with `--touched <the real touch set>` before opening, and line 33 re-runs it whenever the set grows.

### D-006: The labelled corpus gains a `pending` label and stops folding it into `fast`
**Decision:** The four corpus entries labelled `fast` that name no existing fixture file are relabelled `pending`, `admit-labelled.test.mts` accepts `pending` as a label, its `answer` no longer maps `pending` to `fast`, and a new exact test requires every `pending`-labelled entry to answer `pending` and every `fast`-labelled entry that names a fixture file to answer `fast`. A one-off run of the proposed rule over the corpus on 2026-11-09 kept the agreement share at 127 of 134 (0.948, minimum 0.9) and left 26 `fast` entries (minimum 20).
**Instead of:** keeping the fold and pinning both cases in the lane tests only: the corpus then cannot tell `pending` from `fast`, and the request asks it to pin both.
**Risks:**
- **RISK-007** `bench/test/tasks.test.mjs` keeps its own `pending` to `fast` fold. Mitigation: under the new rule a task prompt can only move from `pending` to `fast`, which that fold already scores as `fast`, so the bench test needs no change.

## Scope

**In:**
- The shipped block in `src/templates/claude-block.md` and `CLAUDE.md`, and `claude_md_bytes` in `test/timing/budgets.test.mjs`.
- The `cost_usd` property of `bench/schema/ledger-v2.schema.json`.
- One live-session rule for `liveSessionIds` and `liveSessions`, with the build list that carries it to the mod.
- The admit fast and pending rule, with the labelled corpus, the lane tests, the admit verb tests and the CLI test that pin it.

**Out:**
- R-010, R-012 and R-013 (no change); R-016 and R-017 (undecided); the bench run.
- The rest of the ledger schema (OQ-002), the expediting skill's own admit call, and the `## This repository` and `## Project facts` text of CLAUDE.md.

## Phase 1: Budget and schema text

**Touch set:**
- `src/templates/claude-block.md`: the shipped block, trimmed
- `CLAUDE.md`: starts with the block verbatim
- `test/timing/budgets.test.mjs`: budget constant to 2048
- `bench/schema/ledger-v2.schema.json`: drop the `cost_usd` property
- `test/kernel/init.test.mjs`: pins CLAUDE.md prefix, read only
- `src/lib/shared/install.mts`: owned headings come from template, read only

**Changes:** Replace the template with a shorter text under D-001 and paste the same text over the first 1927 bytes of `CLAUDE.md`, leaving `## This repository` and `## Project facts` as they are. A candidate that meets every criterion (1597 bytes, measured; CLAUDE.md then 2022 bytes over 25 lines) follows; the developer may reword it within the criteria.

```text
# Picket

Four lanes, four agents, one kernel. Code decides what code can decide; the model fills the rest.

## Every request

1. A change request: in the Bash tool, run `picket admit --request - --human` with the request in a quoted heredoc and invoke the skill it names: `picket:expediting` (fast), `picket:ordering` (order), `picket:designing` (design), `picket:researching` (research). On `lane: pending`, find the files the change edits and re-run admit with `--touched <paths>`. Never load a second lane skill. Admit's lane stands even when a change looks small; only the user overrides it. A plain question: answer it. A strategy question: `picket:consulting`.
2. Read state in `work/<id>/` with `picket state <id>` and `picket next <id>`; never recall it. Only `picket route` changes state.
3. Send an agent exactly what `picket next <id>` prints: run its `first:` lines, then use its tool, name, type, model and message verbatim. While an agent works, end the turn; when it notifies, run `picket next <id>`.
4. Stop only at a user gate: print `picket packet <id>` verbatim and end the turn. Pass the reply to `picket reply <id> "<reply>"` and send what it prints. Never two stops in a row.
5. Verdict tokens are exact, alone on the last line: `APPROVED`, `CHANGES REQUIRED`, `ALIGNED`, `DRIFT DETECTED`, `PHASE DONE`, `PHASE STALLED`, `ARTIFACT WRITTEN`, `REPORT WRITTEN`, `AMENDED`.

## Rules

Every session and agent gets the rules `prose`, `comments`, `work-items`, `security-paths`, `tests`, `untrusted`.

`picket init` rewrites this block; project lines go under `## Project facts`.
```

Set `claude_md_bytes` to 2048 and keep the comment already on that line. Delete the `cost_usd` line from the schema's `properties`, keeping the JSON valid.

**Done when:**
- **T-1.1** `src/templates/claude-block.md` is at most 1623 bytes, at least 304 fewer than the base's 1927 (`git show 18bcd25:src/templates/claude-block.md | wc -c`).
- **T-1.2** `CLAUDE.md` starts with the template byte for byte (`test/kernel/init.test.mjs` passes), and its LF byte count plus its line count is at most 2048.
- **T-1.3** `test/timing/budgets.test.mjs` sets `claude_md_bytes: 2048`, and its CLAUDE.md budget test passes.
- **T-1.4** A one-off script comparing the template with `git show 18bcd25:src/templates/claude-block.md` finds the same `#` and `##` heading lines in the same order, the five numbered items, the same set of `picket <verb>` commands, the same `picket:<name>` names except the four agents of the base's item 3, the six rule names, and the nine verdict tokens in the base's order.
- **T-1.5** The schema parses as JSON, its `properties` hold no `cost_usd`, and it is deep-equal to the base's parsed schema (`git show 18bcd25:bench/schema/ledger-v2.schema.json`) with `properties.cost_usd` deleted.
- **T-1.6** `npm test` passes, `test/cli/init.test.mjs` and `test/repo/names.test.mjs` included.

## Phase 2: One live-session rule

**Touch set:**
- `src/lib/shared/live-session.mts`: new pure predicate, D-003 and D-004
- `src/lib/shared/live-session.test.mts`: new predicate unit tests
- `src/lib/shared/host-sessions.mts`: `liveSessionIds` takes the root, filters
- `src/lib/shared/host-sessions.test.mts`: registry fixtures gain `cwd`
- `src/lib/verbs/list/index.mts`: passes root to `liveSessionIds`
- `src/lib/verbs/list/index.test.mts`: attention follows the registry `cwd`
- `src/mods/status/hooks/session-files.ts`: `liveSessions` uses the predicate
- `src/mods/status/hooks/index.test.tsx`: registry fixture with three directories
- `scripts/build.mjs`: add the module to `MOD_LIB_SHARED`
- `src/lib/shared/work/attention.mts`: `working` needs a live session, read only
- `test/repo/mods.test.mjs`: checks copied shared files, read only

**Changes:**
- `src/lib/shared/live-session.mts` exports `isProjectSession(cwd: unknown, root: string): boolean` under the rule in D-004 and imports nothing. It never builds a regular expression from `root`.
- `src/lib/shared/host-sessions.mts`: `liveSessionIds(configDir: string, root: string): Set<string>`. The per-file reader returns `{ sessionId, cwd }` or nothing, and a row counts only when `isProjectSession(cwd, root)` holds. `hostConfigDir` is unchanged.
- `src/lib/verbs/list/index.mts`: the `ListScope` live set comes from `liveSessionIds(hostConfigDir(env, home), root)`.
- `src/mods/status/hooks/session-files.ts`: `liveSessions` keeps its `name` and `nameSource` handling and replaces `info.cwd === root` with `isProjectSession(info.cwd, root)`, imported from `../../../lib/shared/live-session.mts` as `index.tsx` imports `mod-switch.mts`.
- `scripts/build.mjs`: append `join(LIB_SHARED, "live-session.mts")` to `MOD_LIB_SHARED`.

**Done when:**
- **T-2.1** `src/lib/shared/live-session.test.mts`: with root `/p`, `isProjectSession` holds for `/p`, `/p/`, `/p/.worktrees/fix-a` and `/p/src/Orders/.worktrees/fix-a`, and with root `D:\repo` for `D:/repo/.worktrees/fix-a`; it fails for `/p/src`, `/p/.worktrees`, `/p/.worktrees/fix-a/src`, `/p/src/../.worktrees/fix-a`, `/p2`, `/q`, `null` and `42`.
- **T-2.2** `src/lib/shared/host-sessions.test.mts`: over registry files whose `cwd` is the root, a root worktree, a nested-repo worktree, a root subfolder and another folder, plus one without `cwd`, one without `sessionId` and one malformed, `liveSessionIds(config, root)` returns exactly the three ids of the first three files; a config with no sessions folder still returns an empty set.
- **T-2.3** `src/lib/verbs/list/index.test.mts`: an open item with no artifact whose state session is S lists with attention `working` when the registry under the context's `CLAUDE_CONFIG_DIR` holds S with `cwd` equal to the root, and `open` when that `cwd` is `<root>/src`.
- **T-2.4** `src/mods/status/hooks/index.test.tsx`: with registry files for a session in `D:/repo/.worktrees/fix-a` and a session in `D:/elsewhere`, both with transcripts in the project folder, renaming the worktree session is refused with the toast "That session is open in another window; rename it there." and writes nothing to its transcript, and renaming the other session appends its `agent-name` record.
- **T-2.5** Drive: after `npm run build`, in a scratch project with an item whose state session is S and a scratch `CLAUDE_CONFIG_DIR` whose registry holds S, `picket list` (run with `CLAUDE_PROJECT_DIR` set to the scratch project) reports attention `working` for a `cwd` of `<scratch>/.worktrees/x` and `open` for a `cwd` of `<scratch>/src`. Setting the item's session through `CLAUDE_CODE_SESSION_ID` at `picket open` is [INFERRED]; writing `state.yaml` in the scratch copy is the fallback.
- **T-2.6** `npm test` passes, its mods step included.

## Phase 3: Named files make a fast admission

**Touch set:**
- `src/lib/shared/admission/lane.mts`: `smallChangeResult` pending condition and reason
- `src/lib/shared/admission/lane.test.mts`: deep-equal pins for both cases
- `src/lib/shared/admission/admit-labelled.test.json`: four entries relabelled `pending`
- `src/lib/shared/admission/admit-labelled.test.mts`: accept `pending`, drop the fold
- `src/lib/verbs/admit/index.test.mts`: named-file tests now answer fast
- `test/cli/cli.test.mjs`: CLI admit of a named file
- `src/lib/shared/admission/signals.mts`: `mentionedPaths` sorts and checks existence, read only
- `bench/test/tasks.test.mjs`: keeps its own fold, read only (RISK-007)

**Changes:**
- `src/lib/shared/admission/lane.mts`: under D-005, `smallChangeResult` answers `pending` with today's two reasons only when `signals.touched === 0` and `signals.mentioned_paths` is empty. With `touched === 0` and named files it answers `fast` with the reasons `[small, "touch set from the request: " + mentioned_paths.join(", ")]`. With `touched > 0` it answers as today. `laneOf` is otherwise unchanged.
- `src/lib/shared/admission/admit-labelled.test.json`: relabel to `pending`, with a `why` saying the request names no existing file, the four entries whose requests are "Fix the README: the start command is `npm start`, not `npm run serve`.", "Find why the CSV export crashes on an empty list and fix it.", "Fix the typo in the hook table of `core/hooks/README.md`." and "Rename the `--deleted` flag of the waive verb in one file."
- `src/lib/shared/admission/admit-labelled.test.mts`: the label check accepts `PENDING`; `answer` returns `pending` as itself; a new test pins the two cases exactly (D-006).
- `src/lib/verbs/admit/index.test.mts` and `test/cli/cli.test.mjs`: assertions that a named existing file answers `pending` without `--touched` now expect `fast`; assertions on requests naming no file keep `pending`.

**Done when:**
- **T-3.1** `lane.test.mts`: a small change with `mentioned_paths: ["src/config.ts"]` and `touched: 0` deep-equals `{ lane: "fast", reasons: ["small change: 1 file(s) named, no new surface, no new dependency, no design question", "touch set from the request: src/config.ts"], signals }`; with three named paths the last reason lists all three in the given sorted order.
- **T-3.2** `lane.test.mts`: the existing case with no named file and no touch set still deep-equals the `pending` answer, and a case with one named file and `touched: 1` answers `fast` with only the `small change` reason.
- **T-3.3** `admit/index.test.mts`: "Fix the typo in `src/config.ts`." answers `fast` with and without `--touched`; of the six fast-lane prompts, the first (it names no file) answers `pending` alone and the other five answer `fast` alone and with their touch set; three named files at the cap answer `fast` alone, and the four-file touch set still answers `order`.
- **T-3.4** `admit/index.test.mts`: "Fix these typos in `src/config.ts`:" followed by three numbered items and no `--touched` answers `order` with the `3 numbered items` reason, and with two numbered items answers `fast`.
- **T-3.5** `admit-labelled.test.mts` passes with the four entries labelled `pending`: every `pending`-labelled entry answers `pending`, every `fast`-labelled entry naming a `bench/fixture` file answers `fast`, the agreement share stays at least 0.9, and at least 20 entries stay labelled `fast`.
- **T-3.6** `test/cli/cli.test.mjs`: in the spawned CLI, `picket admit --text` with the request at its line 51 (it names `src/a.ts`, which the test creates) answers `fast` with no `--touched`, and `picket admit --text "Fix the typo in the fee helper."` answers `pending`.
- **T-3.7** Drive: after `npm run build`, in a scratch project holding `src/a.ts`, the built `picket admit --request - --human` with the request "Fix the typo in `src/a.ts`." prints `lane: fast` and the reason `touch set from the request: src/a.ts`, and with "Fix the typo in `src/missing.ts`." prints `lane: pending`.
- **T-3.8** `npm test` passes, `bench/test/tasks.test.mjs` included.

## Open questions

- **OQ-001** Must a worktree outside a `.worktrees/` folder count as live: one made by hand, or one `picket worktree` resumed from wherever git already had it (recorded in `work/<id>/repos.yaml` as a path such as `../other`)? Owner: product owner. Fallback: no; D-004 counts only the root and `.worktrees/<name>` folders.
- **OQ-002** `bench/schema/ledger-v2.schema.json` lags the writer beyond `cost_usd`: its `event` enum lacks `accept`, `escalation` and `repeat`, and with `additionalProperties: false` it rejects their fields (`commit`, `hook`, `reason`, `outcome`, `why`, `key`, `command`, `class`, `items`), all written by `src/lib/shared/ledger.mts`. Bring it up to date in a later item? Owner: product owner. Fallback: this item removes only `cost_usd`.

## Revision log

- 2026-11-09: T-2.4 reworded: cleanup never filters live sessions; the criterion now names the rename refusal the code and its test cover; reword approved by the user.
