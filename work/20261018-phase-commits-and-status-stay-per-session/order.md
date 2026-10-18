---
kind: order
lane: order
title: Phase commits and status stay per-session
date: 2026-10-18
audience: developer
sources: [request.md, core/lib/git.mjs, core/lib/route.mjs, core/lib/close.mjs, core/lib/gate.mjs, core/lib/next.mjs, core/lib/work.mjs, core/lib/hooks/route.verdict.mjs, core/bin/picket.mjs, core/lib/statusline.mjs, core/agents/developer.md, core/skills/expediting/steps/30-check.md, status/hooks/register.tsx, status/hooks/band.ts, status/hooks/format.ts, status/types/index.d.ts, session/hooks/register.tsx, work/20261018-fill-ledger-cost-lines-bounces-blocks/phases/2.block.md]
phases:
  - n: 1
    files: [core/lib/git.mjs, core/lib/gate.mjs, core/lib/route.mjs, core/lib/close.mjs, core/bin/picket.mjs, core/skills/expediting/steps/30-check.md, test/kernel/git.test.mjs, test/kernel/route.test.mjs, test/kernel/close.test.mjs, test/kernel/gate.test.mjs]
    greps:
      - path: core/lib/git.mjs
        pattern: 'GIT_INDEX_FILE'
      - path: core/lib/git.mjs
        pattern: '^(?![\s\S]*commitStaged)'
        flags: i
      - path: core/lib/gate.mjs
        pattern: 'export function phasePaths\b'
      - path: core/lib/close.mjs
        pattern: 'left_staged'
      - path: core/skills/expediting/steps/30-check.md
        pattern: '--touched'
    tests: true
    drive: true
  - n: 2
    files: [core/lib/work.mjs, core/lib/next.mjs, core/lib/route.mjs, core/lib/hooks/route.verdict.mjs, core/bin/picket.mjs, test/kernel/work.test.mjs, test/kernel/next.test.mjs, test/kernel/route.test.mjs, test/kernel/cli.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: core/lib/work.mjs
        pattern: '\bsession\b'
      - path: core/lib/next.mjs
        pattern: 'other_session'
      - path: core/bin/picket.mjs
        pattern: 'CLAUDE_CODE_SESSION_ID'
      - path: core/lib/hooks/route.verdict.mjs
        pattern: 'session_id'
    tests: true
    drive: true
  - n: 3
    files: [status/hooks/register.tsx, status/hooks/band.ts, status/hooks/format.ts, status/types/index.d.ts, status/hooks/register.test.tsx, status/hooks/band.test.ts, status/hooks/format.test.ts]
    greps:
      - path: status/hooks/register.tsx
        pattern: 'session\.id\(\)'
      - path: status/hooks/register.tsx
        pattern: '--session'
      - path: status/types/index.d.ts
        pattern: 'other_session'
      - path: status/hooks/band.ts
        pattern: 'other session'
    tests: true
    drive: false
---
# Order: Phase commits and status stay per-session

## Problem

Two Claude sessions share one working tree and one git index. `commitStaged` in `core/lib/git.mjs` commits the whole index, so `picket route --verdict approved` (through `commitPhase` in `core/lib/route.mjs`) and `picket close --message` (in `core/lib/close.mjs`) take whatever another session staged: commit 27af15f carried README.md and `work/20261018-add-maintainer-note-to-readme/*` into phase 2 of `20261018-fill-ledger-cost-lines-bounces-blocks`. Separately, the `status/` mod draws `picket next --latest`, which picks the newest open item in the tree with no notion of session; `core/lib/statusline.mjs` renders no work item, so it is not involved. Work items carry no session id today; Claude Code exports `CLAUDE_CODE_SESSION_ID` to Bash commands (seen in this session's environment) and mods can read `$.session.id()` (used by `session/hooks/register.tsx:145`).

## Decisions

### D-001: Commit through a temporary index
**Decision:** Replace `commitStaged` with `commitOwned(root, message, { add, owns })` returning `{ sha, committed, left_staged }`. It runs `git add -A -- <add>` on the real index as today, lists staged paths with `git diff --cached --name-only --no-renames` (so a rename gives both its old and new path), splits them with the `owns(path)` predicate, and when any path is owned: builds a temporary index from `HEAD` (`GIT_INDEX_FILE=<git-path picket-commit.index> git read-tree HEAD`), copies the owned entries from the real index into it (`git ls-files -s -z` piped to `update-index -z --index-info`; an owned path absent from the real index is a staged deletion, so `update-index --force-remove`), and runs `git commit -q -m <message>` with `GIT_INDEX_FILE` set to the temporary file. Every git call that takes paths runs with `--literal-pathspecs`, so `app/[id]/page.tsx` is a path, not a glob. After a successful commit it runs `git reset -q -- <committed>` on the real index, and it always deletes the temporary file. The commit holds the index content, not the working tree content, git hooks still run, and the real index is never rewritten for a path the commit does not own, so another session's staged files stay staged exactly as staged.
**Instead of:** `git commit --only -- <paths>`: it commits the working tree content of those paths, so an edit made after the developer staged would ride into the phase commit unseen.
**Risks:**
- **RISK-001** Another session commits between `read-tree HEAD` and `git commit`, and the new commit silently drops that session's change. Mitigation: read `HEAD` before building the temporary index; after the commit compare it with `git rev-parse <sha>^`, and on a mismatch add `HEAD moved during the commit; check <sha>` to the result instead of retrying.
- **RISK-002** A pre-commit hook that re-stages files (lint-staged) writes into the temporary index only. Mitigation: the `git reset -q -- <committed>` step aligns the real index with the new `HEAD` for those paths.

### D-002: What a phase owns
**Decision:** A phase commit owns a staged path when it is under `work/<id>/`, equals a path in the phase's frontmatter `files` or its `**Touch set:**`, sits under a listed entry that ends in `/`, or is a test path. This mirrors the developer's write permission in `core/agents/developer.md` ("the phase's touch set plus new files the phase names, plus tests"), so whatever the developer may write, its phase commit takes. `gate.mjs` already parses both lists for `ownGate`; it exports `phasePaths(id, n, root)` returning their union, and `git.mjs` gets a pure `isTestPath(path)`: true when a directory segment is `test`, `tests`, `__tests__` or `spec`, or ends in `Tests` after a dot (`src/Fee.Tests/`), or the file name matches `.test.` or `.spec.` before its extension, `_test.go`, `test_*.py` or `*Tests.cs`. Examples: `test/kernel/cost.test.mjs` and `src/Fee.Tests/RoundingTests.cs` are test paths; `src/latest.mjs` and `docs/testing.md` are not. Listed paths are project-root relative and staged paths are repo-root relative, so both sides go through `repoPrefix(root)` as `close.mjs` does today. `commitPhase` adds two lines to `applied` when they are not empty: `committed outside phase <n>'s files: <paths>` (owned only as a test path) and `left staged, not phase <n>'s: <paths>`.
**Instead of:** frontmatter `files` plus `work/<id>/` only, as the request words it: a test file the developer adds beyond the list (`test/kernel/cost.test.mjs` in phase 2 of `20261018-fill-ledger-cost-lines-bounces-blocks`) would stay staged forever and the phase commit would miss its own tests.
**Risks:**
- **RISK-003** A test file another session staged rides into a phase commit. Mitigation: the `committed outside phase <n>'s files` line names it at the gate, and the developer's block already lists its files to compare against.

### D-003: Close commits only the item's paths
**Decision:** `close` drops `refuseForeignStaged` and commits through `commitOwned`. A fast item owns `work/<id>/` plus the paths given in a new `--touched <p1,p2>` flag (the same comma-separated shape as `picket admit --touched`), with no test rule; when a fast item has a staged path outside `work/<id>/` and no `--touched`, close refuses with exit 2 and names those paths, so a lead that forgot the flag sees it before anything is committed. An order or design item owns `work/<id>/`, every phase's `phasePaths`, test paths and any `--touched` path, which also covers cumulative-review fixes staged after the last phase commit. A research item owns `work/<id>/` plus `--touched`. `--message` only sets the message. The result gains `left_staged` (paths left in the index), and `--human` prints `left staged (not this item's): <paths>` when it is not empty. `core/skills/expediting/steps/30-check.md` closes with `picket close <id> --message "<m>" --touched <the paths you staged>`.
**Instead of:** a fast-lane record of staged paths written at stage time by a new `picket stage` verb: it adds a verb and a state file to carry what one flag on the existing close call carries.

### D-004: Work items carry the session that drives them
**Decision:** `state.yaml` gains an optional `session` field. `createWork` takes `session` and writes it when it is a non-empty string; `picket new` passes `--session` or else `process.env.CLAUDE_CODE_SESSION_ID`. `route` takes `session` and, when it is a non-empty string different from `String(state.session)`, writes it, so the session that routes a verdict claims the item (a fresh session that resumes yesterday's item owns it from its first verdict). `picket route` passes the environment variable; the `route.verdict` hook passes `event.session_id`. `validateState` accepts the key. Items without the field keep working.
**Instead of:** reading ownership from the ledger rows, which already carry `session` and `work_id`: the first row for a new item lands only at the first agent stop, and every 30 second band refresh would read a log that grows with history.
**Risks:**
- **RISK-004** Kernel tests that spawn `picket new` inherit the developer's real `CLAUDE_CODE_SESSION_ID` and stamp it into fixtures. Mitigation: those tests set or delete the variable in the spawned environment explicitly.
- **RISK-005** An older picket CLI reading a stamped `state.yaml` rejects `session` as an unknown field. Mitigation: the CLI and plugin ship as one package; no mitigation in code.

### D-005: This session's item first, another session's item marked
**Decision:** `latest(root, { session })` picks the newest open item stamped with `session`; when there is none, it picks the newest open item overall, as today. Its answer gains `session` (the stamp or null) and `other_session` (true only when `session` was given and the picked item's stamp differs, unstamped items included). Without `session` the pick and every field but these two are unchanged. `picket next --latest --session <sid>` passes it; `--human` appends ` (other session)`. The `status/` mod calls it with `$.session.id()`, and on `other_session` draws the work line muted with an `other session` piece, a muted step without the user-gate ask or `◀`, and no agent in the `waiting` state.
**Instead of:** showing only this session's items: work items outlive sessions, so a fresh session continuing an item would show an empty band until its first verdict claims it, and every item from before this change would vanish.

## Scope

**In:**
- scoped commits for `picket route` approvals (user and run grant) and `picket close`
- a session stamp on work items and session-aware `picket next --latest`
- the `status/` mod's work line and agent states

**Out:**
- `core/lib/statusline.mjs` (renders no work item) and the `session/` mod
- `openWorkItem` in `core/lib/hooks/guard.bash.mjs`, which tags escalations with any open item
- the prose of the `work-items` rule (see OQ-002)

## Phase 1: Commit only the item's own paths

**Touch set:**
- `core/lib/git.mjs`: commitOwned replaces commitStaged, isTestPath
- `core/lib/gate.mjs`: export phasePaths from parsed lists
- `core/lib/route.mjs`: commitPhase uses the phase predicate
- `core/lib/close.mjs`: lane-based ownership, left_staged, refusal
- `core/bin/picket.mjs`: close takes --touched, prints left_staged
- `core/skills/expediting/steps/30-check.md`: close command names its paths
- `test/kernel/git.test.mjs`: commitOwned and isTestPath cases
- `test/kernel/route.test.mjs`: approval leaves foreign paths staged
- `test/kernel/close.test.mjs`: rewrite foreign refusal and fast cases
- `test/kernel/gate.test.mjs`: phasePaths union

**Changes:** D-001, D-002 and D-003 as written. `stagedFiles` stays exported for any other caller. The temporary index lives at `git rev-parse --git-path picket-commit.index`. `recordAccept` and its `lines_added` now see only the owned commit, with no change to its code. Existing close tests that stage a product file on a fast item and pass `--message` add `--touched`.

**Done when:**
- **T-1.1** In a fixture repo with an order item whose phase 1 lists `src/a.js`, staged `src/a.js` and `README.md`: `picket route <id> --verdict approved --agent user --phase 1` makes a commit whose `git show --name-only` lists `src/a.js` and `work/<id>/` paths and not `README.md`, and `git diff --cached --name-only` afterwards prints `README.md`; `applied` holds `left staged, not phase 1's: README.md`.
- **T-1.2** A phase file staged with content A and then edited to B in the working tree is committed with content A, and stays modified (unstaged) after the commit.
- **T-1.3** A staged `test/b.test.js` not in the phase lists is in the phase commit and named on a `committed outside phase 1's files` line; a staged deletion of a listed file removes it from `HEAD`.
- **T-1.4** A run-grant approval routed from a developer `PHASE DONE` commits through the same predicate (route test with `run_through` set).
- **T-1.5** `picket close <fast-id> --message "fix: a" --touched src/a.js` commits `src/a.js` and `work/<id>/`, leaves a staged `README.md` staged, and answers `left_staged: ["README.md"]`; the same close without `--touched` exits 2, names `src/a.js`, and leaves `HEAD` unchanged.
- **T-1.6** With a `commit-msg` hook that exits 1, close and route report `git commit failed`, `HEAD` is unchanged, every path staged before stays staged, and no `picket-commit.index` file remains under `.git`.
- **T-1.7** `isTestPath` answers true for `test/kernel/cost.test.mjs`, `src/Fee.Tests/RoundingTests.cs`, `pkg/fee_test.go` and false for `src/latest.mjs`, `docs/testing.md`.
- **T-1.8** `npm test` passes, and `picket drive --run "node .picket/state/scratch/drive-scoped-commit.mjs"` (a script building a temp repo with a foreign staged file, then running `picket route` and `picket close` against it) shows the foreign file still staged after both commits.

## Phase 2: Work items carry their session

**Touch set:**
- `core/lib/work.mjs`: session in createWork and validateState
- `core/lib/next.mjs`: latest prefers own, marks other
- `core/lib/route.mjs`: claim the item for the session
- `core/lib/hooks/route.verdict.mjs`: pass event.session_id to route
- `core/bin/picket.mjs`: new, route, next --latest session wiring
- `test/kernel/work.test.mjs`: stamp written, legacy state valid
- `test/kernel/next.test.mjs`: own first, other marked cases
- `test/kernel/route.test.mjs`: claim on a different session
- `test/kernel/cli.test.mjs`: env stamping and --session flag
- `test/hooks/handlers.test.mjs` [INFERRED]: hook passes session_id

**Changes:** D-004 and D-005 (kernel half) as written. The `--human` line for `next --latest` keeps its current shape plus the ` (other session)` suffix. Session comparison is by `String()` on both sides.

**Done when:**
- **T-2.1** `picket new --lane fast --title t` spawned with `CLAUDE_CODE_SESSION_ID=s1` writes `session: s1` to `state.yaml`; spawned with the variable deleted, `state.yaml` has no `session` line.
- **T-2.2** With open item A stamped `s1` (newer) and B stamped `s2` (older), `latest(root, { session: "s2" })` answers B with `other_session: false`.
- **T-2.3** With only `s1` items, `latest(root, { session: "s2" })` answers the newest with `other_session: true`; an unstamped item counts as another session's; `latest(root)` with no session answers the same item and fields as before plus `other_session: false`.
- **T-2.4** `route` with `session: "s2"` on an item stamped `s1` leaves `session: s2` in `state.yaml`; with the same session it does not rewrite `state.yaml`.
- **T-2.5** `routeVerdict` on a developer `PHASE DONE` event with `session_id: "s3"` leaves the item stamped `s3`.
- **T-2.6** `picket drive --run "picket next --latest --session drive-test --human"` prints a line ending in ` (other session)` while an open item stamped otherwise exists, and `npm test` passes.

## Phase 3: The status band knows its session

**Touch set:**
- `status/hooks/register.tsx`: pass $.session.id() to next --latest
- `status/hooks/band.ts`: other-session work line, no waiting
- `status/hooks/format.ts`: muted step text for other sessions
- `status/types/index.d.ts`: Work gains session, other_session
- `status/hooks/register.test.tsx`: argv carries --session, fallback
- `status/hooks/band.test.ts`: other-session rendering cases
- `status/hooks/format.test.ts`: muted step strings

**Changes:** D-005 (mod half). `runLatest` reads `$.session.id()` once per refresh and appends `--session <id>`; when the call throws or answers an empty value, it runs `next --latest` alone. On `other_session`, `workLine` adds ` · other session` in `TONE.muted` after the progress dots, and `stepText` answers one muted piece: `waits for approval of phase <n>` for a user gate, `waits for source picks` for `resolve_sources`, `blocked: <reason>` for a blocked item, otherwise `<actor> <verb>` with no `⋯`. `agentState` never answers `waiting` for another session's item. The testing engine may need a `session.id` handler [INFERRED]; the existing `isLatest` helper matches on `next --latest` anywhere in argv.

**Done when:**
- **T-3.1** A register test sees `['picket', 'next', '--latest', '--session', '<id>']` with the id the engine's `$.session.id()` answers, and `['picket', 'next', '--latest']` when it throws.
- **T-3.2** With `other_session: true` and `actor: 'user'`, the band shows `other session` and `waits for approval of phase 1`, and shows no `you approve` text and no `◀`.
- **T-3.3** With `other_session: true` and an idle developer whose role matches `by`, the agents line shows no `waiting`.
- **T-3.4** Every existing test in `status/hooks/` passes unchanged in what it asserts for `other_session: false`.
- **T-3.5** `claude plugin validate status --strict` exits 0 and `claude plugin test status` passes (see OQ-001).

## Open questions

- **OQ-001** `claude plugin test status` can refuse with "hooks modules are turned off in this process" from a subagent shell. Owner: developer. Fallback: report T-3.5's test half as not run with the refusal line quoted, keep `validate --strict` green, and the user runs `claude plugin test status` at the gate.
- **OQ-002** The `work-items` rule says `picket route ... --verdict approved` "commits the index"; after phase 1 it commits only the phase's own paths. Owner: user. Fallback: the rule text stays as is; this order does not edit it.
- **OQ-003** `harness-authoring` asks for a fast-lane bench run after a contract change, and phase 1 changes the fast lane's close command. Owner: lead. Fallback: after phase 1, ask the user before running `node bench/run.mjs --harness plugin --tasks lane:fast --runs 1`, since it spends model quota.

## Revision log
