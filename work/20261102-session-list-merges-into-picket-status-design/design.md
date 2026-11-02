---
kind: design
lane: design
title: Session list merges into picket-status
date: 2026-11-02
audience: developer
sources: request.md; artifacts/strategy/decisions/00002-session-list-merges-picket-status.md (Ratified); artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md (Ratified); src/mods/status/hooks/index.tsx; src/mods/status/hooks/band.ts; src/mods/status/types/index.d.ts; src/mods/session/hooks/*.ts(x) at b337dc7; src/mods/markdown/hooks/index.tsx, actions.ts, view.tsx, index.test.tsx; src/mods/shared/kernel.ts, theme.ts; src/lib/mods.mts; src/lib/verbs/list/index.mts; src/lib/shared/views.mts; src/lib/shared/work/next-view.mts, next-step.mts, snapshot.mts, state.mts, verdict-log.mts; src/lib/shared/route/apply.mts; src/lib/shared/repos.mts; src/lib/shared/checkouts.mts; src/lib/shared/context.mts; scripts/build.mjs; scripts/test.mjs; test/repo/dashes.test.mjs; test/repo/plugin-layout.test.mjs; CONTRIBUTING.md; CHANGELOG.md; Claude Code mod types (dist/mods/session/.claude-plugin/types/claude-code/index.d.ts); ~/.claude/sessions/*.json read 2026-11-02
phases:
  - n: 1
    files:
      - src/lib/shared/views.mts
      - src/lib/shared/work/attention.mts
      - src/lib/shared/work/attention.test.mts
      - src/lib/shared/host-sessions.mts
      - src/lib/shared/host-sessions.test.mts
      - src/lib/verbs/list/index.mts
      - src/lib/verbs/list/index.test.mts
      - CHANGELOG.md
    greps:
      - path: src/lib/shared/views.mts
        pattern: 'export type ListRowView\b'
      - path: src/lib/shared/views.mts
        pattern: '"needs-you"'
      - path: src/lib/shared/work/attention.mts
        pattern: 'export function attentionOf\b'
      - path: src/lib/shared/host-sessions.mts
        pattern: 'export function liveSessionIds\b'
      - path: src/lib/verbs/list/index.mts
        pattern: 'ListRowView'
      - path: CHANGELOG.md
        pattern: '## 1\.0\.0-alpha\.6 \(not released yet\)'
    tests: true
    drive: true
    security: false
  - n: 2
    files:
      - src/mods/markdown/hooks/index.tsx
      - src/mods/markdown/hooks/index.test.tsx
      - src/mods/markdown/hooks/picket-markdown.test.tsx
      - src/mods/markdown/hooks/actions.ts
      - src/mods/markdown/hooks/view.tsx
      - CHANGELOG.md
    greps:
      - path: src/mods/markdown/hooks/index.tsx
        pattern: 'immediate: true'
      - path: src/mods/markdown/hooks/index.tsx
        pattern: "'md'"
        absent: true
      - path: src/mods/markdown/hooks/index.test.tsx
        pattern: "command: 'md'"
        absent: true
      - path: src/mods/markdown/hooks/picket-markdown.test.tsx
        pattern: "command: 'md'"
        absent: true
      - path: src/mods/markdown/hooks/view.tsx
        pattern: 'run /md\b'
        absent: true
      - path: CHANGELOG.md
        pattern: '/picket-markdown'
    tests: true
    drive: true
    security: false
  - n: 3
    files:
      - src/mods/session/hooks/index.tsx
      - src/mods/session/hooks/index.test.tsx
      - src/mods/session/types/index.d.ts
      - src/mods/status/hooks/sessions.ts
      - src/mods/status/hooks/sessions.test.ts
      - src/mods/status/types/index.d.ts
      - src/mods/shared/theme.ts
      - src/lib/mods.mts
      - docs/reference/mods.md
      - .claude-plugin/marketplace.json
      - docs/how-to.md
      - README.md
      - test/repo/dashes.test.mjs
      - CHANGELOG.md
    greps:
      - path: src/mods/session/hooks/index.tsx
        pattern: 'claude plugin uninstall picket-session@picketai'
      - path: src/mods/session/hooks/index.tsx
        pattern: 'command\.register'
        absent: true
      - path: src/mods/shared/theme.ts
        pattern: '\bROLE_TONES\b'
        absent: true
      - path: docs/how-to.md
        pattern: 'claude plugin install picket-session@picketai'
        absent: true
      - path: test/repo/dashes.test.mjs
        pattern: 'src/mods/status/hooks/sessions\.ts'
      - path: CHANGELOG.md
        pattern: 'claude plugin uninstall picket-session@picketai'
    tests: true
    drive: true
    security: false
  - n: 4
    files:
      - src/mods/status/hooks/work-pane.ts
      - src/mods/status/hooks/work-pane.test.ts
      - src/mods/status/hooks/session-files.ts
      - src/mods/status/hooks/pane-actions.ts
      - src/mods/status/hooks/pane.tsx
      - src/mods/status/hooks/sessions.ts
      - src/mods/status/hooks/sessions.test.ts
      - src/mods/status/hooks/index.tsx
      - src/mods/status/hooks/index.test.tsx
      - src/mods/status/types/index.d.ts
      - src/lib/mods.mts
      - docs/reference/mods.md
      - .claude-plugin/marketplace.json
      - CHANGELOG.md
    greps:
      - path: src/mods/status/hooks/work-pane.ts
        pattern: 'NO WORK ITEM'
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: 'claude --resume '
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: '\$\.ui\.copy\('
      - path: src/mods/status/hooks/index.tsx
        pattern: "'picket-session'"
      - path: src/mods/status/hooks/index.tsx
        pattern: 'immediate: true'
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: "command: 'resume'"
        absent: true
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: "'/clear'"
        absent: true
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: '\$\.prompt\.fill\('
        absent: true
    tests: true
    drive: true
    security: false
  - n: 5
    files:
      - src/mods/status/hooks/work-pane.ts
      - src/mods/status/hooks/work-pane.test.ts
      - src/mods/status/hooks/session-files.ts
      - src/mods/status/hooks/pane-actions.ts
      - src/mods/status/hooks/pane.tsx
      - src/mods/status/hooks/index.test.tsx
      - src/mods/status/types/index.d.ts
    greps:
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: 'worktree remove'
      - path: src/mods/status/hooks/work-pane.ts
        pattern: '\b14\b'
    tests: true
    drive: true
    security: false
  - n: 6
    files:
      - src/mods/status/hooks/band.ts
      - src/mods/status/hooks/band.test.ts
      - src/mods/status/hooks/watch.ts
      - src/mods/status/hooks/watch.test.ts
      - src/mods/status/hooks/pane-actions.ts
      - src/mods/status/hooks/index.tsx
      - src/mods/status/hooks/index.test.tsx
      - src/mods/status/types/index.d.ts
      - CHANGELOG.md
    greps:
      - path: src/mods/status/hooks/band.ts
        pattern: 'need you'
      - path: src/mods/status/hooks/band.ts
        pattern: '☰'
      - path: src/mods/status/hooks/band.ts
        pattern: 'M↓'
      - path: src/mods/status/hooks/index.tsx
        pattern: "'picket-markdown'"
      - path: src/mods/status/hooks/index.tsx
        pattern: 'command\.list\('
    tests: true
    drive: true
    security: false
---
# Design: Session list merges into picket-status

## Problem

SDR-00002 (Ratified) moves the session list into picket-status as a work pane and retires the picket-session plugin; its tactical items TF-001 to TF-005 are this item. The binding constraints come from that SDR: sessions are the unit and an item counts only in its latest session (D-001), closed is not done and only the developer marks a session done (D-002), the band is the entry point and stays cheap (D-003), both commands are named after their plugin and run mid-turn (D-004), and one kernel function decides what needs the developer (D-005). The mods may read Picket data only through the kernel (CONTRIBUTING.md:99) and may import only the shared files `MOD_LIB_SHARED` lists (`scripts/build.mjs:21`). Nothing in the mod may open, resume or create a session.

## Decisions

### D-001: Attention is one kernel function of the next step and the latest session's liveness

**Decision:** A pure domain function `attentionOf(status, actor, isLive)` in `src/lib/shared/work/attention.mts` classes a work item. `closed` when the status is `done` or `abandoned`. `needs-you` when the next step's actor is `user` (every gate, a block, a sources pick, a worktree name; `src/lib/shared/work/next-step.mts:14-26`). Otherwise `working` when the item's latest session is live on this machine, and `open` when it is not, because nothing moves until the developer resumes it. Liveness comes from Claude Code's session registry, `<config dir>/sessions/*.json`, whose rows carry `sessionId` (read on this machine 2026-11-02, Claude Code 2.1.316); the config dir is `CLAUDE_CONFIG_DIR` or `<home>/.claude`, as the retired sidebar resolved it (`src/mods/session/hooks/data.ts:126-133` at b337dc7). The band count and the pane read this one answer, which is SDR-00002 D-005.
**Instead of:** classing by the actor alone (an agent or the lead acting means working): a session closed mid-plan would read WORKING forever, and OPEN would hold only lead steps.
**Risks:**
- **RISK-001** The registry is an undocumented host file; a format change or a file left behind by a crashed process misreads liveness. Mitigation: an unreadable folder or row counts as not live, so the item reads `open` and a `needs-you` is never hidden; liveness is an input of the function, so another source replaces it in one place.
- **RISK-002** The exact meaning of OPEN against WORKING comes from the canvas, which the architect could not read (OQ-001). Mitigation: one function with one test table; a different reading changes only that table.

### D-002: An item's sessions are its verdict rows' sessions, then its state's session, which is the latest

**Decision:** `sessionsOf(state, verdicts)` returns the distinct `session` values of `verdicts.jsonl` in first-seen order, then `state.session` moved to the end. Route claims the routing session into `state.session` on every verdict (`src/lib/shared/route/apply.mts:24-38`), so `state.session` is the latest session, the one where the item's live state counts (SDR-00002 D-001); the verdict rows add the earlier ones, where the item shows greyed. An item with neither gets `sessions: []` and `session: null` and belongs to no session row; 72 of the 87 verdict logs in this repository carry no `session` field (counted 2026-11-02 with `grep -L '"session"' work/*/verdicts.jsonl`).
**Instead of:** the verdict rows only, as the request words it: an item admitted but not yet routed (its architect still writing) would have no session, and its own session would show NO WORK ITEM.

### D-003: `picket list` rows widen in place, typed in the shared views module

**Decision:** Each JSON row of `picket list` adds `attention`, `sessions`, `session`, `branch` (null when unset) and `worktrees`, one `{ repo, path, present }` per `repos.yaml` entry that records a worktree, with `present` true when the folder exists under the root (`src/lib/shared/repos.mts:70-97`). The row type `ListRowView` and the union `Attention` live in `src/lib/shared/views.mts`, which the status mod may import (`scripts/build.mjs:21`). The human render (`--human`) stays byte for byte. The worktrees field is there because Cleanup lists closed items whose worktree is still on disk, and the kernel already reads `repos.yaml`.
**Instead of:** a new verb such as `picket sessions`: a second data path for the same facts, which SDR-00002 D-005 rules out.
**Risks:**
- **RISK-003** `picket list` gets slower by one registry read and a stat per recorded worktree. Its time before the change was 0.39 s for 152 items here (`time picket list`, 2026-11-02). Mitigation: the registry is read once per call, and the band calls `picket list` only when its signature changes (D-005).

### D-004: The work pane is new modules inside picket-status, and session grouping is a pure mod function

**Decision:** A pure function in `src/mods/status/hooks/work-pane.ts` groups the project's transcripts by the list rows: a session's group is the most urgent attention among the items whose latest session it is, in the order NEEDS YOU, WORKING, OPEN, CLOSED; a session holding only items continued in later sessions goes under CLOSED with those items greyed; a session with no item goes under NO WORK ITEM. Done session ids live in picket-status's own `$.store` under `done-sessions`, so they are kept per machine. The transcript folder listing, titles, registry and rename code is adapted from the retired sidebar into `src/mods/status/hooks/session-files.ts`. The kernel never reads transcripts for this. Maintenance cost: picket-status grows from four hook modules to about ten.
**Instead of:** a kernel `picket list --sessions` that reads transcripts: the kernel would parse host transcript titles on every refresh, while SDR-00002 D-003 wants titles read only while the pane is open.
**Risks:**
- **RISK-004** The old sidebar's Archived list (picket-session's store key `archived-sessions`) is not carried over, because a plugin writes only its own store. Mitigation: the CHANGELOG line says so; the developer marks those sessions done once.

### D-005: The band stays cheap by watching modification times of items that are not closed

**Decision:** On each tick of the band's existing 30-second timer and after any Bash `picket` call (`src/mods/status/hooks/index.tsx:67-80`), the band does one listing of the project's transcript folder (the `☰` count), one listing of `work/`, and a `$.fs.stat` of `state.yaml` and `verdicts.jsonl` for each item that was not `closed` at the last list, plus any new folder name. `picket list` runs only when that signature changes or the pane opens. Transcript titles are read only by the pane's refresh, only while the pane is open. This is SDR-00002 D-003.
**Instead of:** a stat of every item: 304 stats per tick for the 152 items here, most of them closed and never changing again.
**Risks:**
- **RISK-005** A closed item reopened by hand is missed until another item changes. Mitigation: opening the pane forces a list.

### D-006: `/picket-markdown` and `/picket-session` are immediate; the band's buttons reach them in process or by command

**Decision:** `/md` becomes `/picket-markdown` with no alias, and with nothing to reopen it opens the pane on its empty state. `/picket-markdown` and `/picket-session` register with `immediate: true` (`CommandSpec.immediate`, mod types line 1944). `☰` calls picket-status's own pane toggle in process. `M↓` calls `$.command.run({ command: 'picket-markdown' })` and is drawn only while `$.command.list()` lists that command (infrastructural decision).
**Instead of:** `M↓` signalling picket-markdown through a picket-status state key that picket-markdown hooks with `state.set`: it would run mid-turn for certain, but it couples two plugins through a private key.
**Risks:**
- **RISK-006** The mod types say a plugin's `$.command.run` is "queued and run once the session is idle" (line 3183), so `M↓` may wait for the turn to end (OQ-002). Mitigation: the mid-turn check is deferred to QA, and the state-key fallback above is one hook in each mod.

### D-007: picket-session retires to a one-release stub

**Decision:** The plugin id, its marketplace entry and its `MODS` entry stay (install `opt-in`), so an update reaches the users who installed it. Its hooks shrink to one toast at session start naming `claude plugin uninstall picket-session@picketai --scope project`, and it registers no command, which frees `/picket-session` for picket-status. The sidebar, agent cards and sprites are deleted; the pure session helpers (`sessions.ts` and its test) move to picket-status. Removing the entry from the marketplace and the mods list is the next release's change (SDR-00002 TF-005), not this item's.
**Instead of:** removing the plugin now: installed copies would stay on their last version, still registering `/picket-session`, with no notice.
**Risks:**
- **RISK-007** A user with both plugins before updating sees two providers of `/picket-session`. Mitigation: the stub's toast, and the stub no longer registers the command.

### D-008: Transcript deletion stays behind a confirmation, only on the Done tab and in Cleanup

**Decision:** Delete removes `<config dir>/projects/<slug>/<id>.jsonl` through `$.process.run` with Node's `unlinkSync`, as the sidebar did (`src/mods/session/hooks/actions.ts:16-35` at b337dc7), and only for an id that matches the session UUID pattern and is neither current nor live. Delete all on the Done tab deletes every eligible Done session after one confirmation and names the skipped ones in a toast. No key binding deletes (SDR-00002 RISK-001). Deleting a transcript is [IRREVERSIBLE] at runtime: it can no longer be resumed. The confirmation row shows the session's title and id as the evidence, and no phase's drive deletes a real transcript; tests use the mock engine's file system.
**Instead of:** moving transcripts to a trash folder: Claude Code would not list them either, and the folder would grow with nothing in the product to empty it.

## Scope

**In:**
- TF-003: `attentionOf`, `sessionsOf`, the registry reader and the widened `picket list` rows typed as `ListRowView`.
- TF-004: `/md` renamed `/picket-markdown`, both commands immediate, the empty-state open.
- TF-005: the picket-session stub, the deleted sidebar code, CHANGELOG, how-to and README lines.
- TF-001: the work pane with Active, Done and Cleanup tabs, Peek, copy, rename, mark done, delete and delete all.
- TF-002: the band's `◀ <n> need you`, `☰ <n>` and `M↓`, drawn in a session with no work item, with the cheap refresh of D-005.

**Out:**
- TF-006 session name prefixes; PR status; a day view; links from Peek.
- Any session open, resume, creation or terminal control.
- Removing picket-session from the marketplace and the mods list (the release after this one).

## Phase 1: Kernel attention and session fields in `picket list`

**Touch set:**
- `src/lib/shared/views.mts`: add `Attention`, `WorktreeView`, `ListRowView`
- `src/lib/shared/work/attention.mts`: new `attentionOf` and `sessionsOf`
- `src/lib/shared/work/attention.test.mts`: new unit tests
- `src/lib/shared/host-sessions.mts`: new registry reader
- `src/lib/shared/host-sessions.test.mts`: new temp-folder tests
- `src/lib/verbs/list/index.mts`: widen rows, compute attention
- `src/lib/verbs/list/index.test.mts`: row and render pin tests
- `CHANGELOG.md`: new heading, one Added line
- `src/lib/shared/work/next-view.mts`: read only, `nextOf` gives actor
- `src/lib/shared/work/snapshot.mts`: read only, snapshot fields
- `src/lib/shared/repos.mts`: read only, worktree layout
- `src/lib/shared/context.mts`: read only, `env` and `home`

**Changes:**
- In `views.mts`: `export type Attention = "needs-you" | "working" | "open" | "closed"`; `export type WorktreeView = { repo: string; path: string; present: boolean }`; `export type ListRowView = { id: string; lane: string; status: string; title: string; phases: string; next: string; attention: Attention; sessions: string[]; session: string | null; branch: string | null; worktrees: WorktreeView[] }`. `views.mts` keeps importing nothing.
- `attention.mts` exports `attentionOf(status: Status, actor: NextStep["actor"], isLive: boolean): Attention` (D-001) and `sessionsOf(state: WorkState, verdicts: readonly VerdictRow[]): string[]` (D-002). Both pure.
- `host-sessions.mts` exports `hostConfigDir(env: NodeJS.ProcessEnv, home: string): string` (`CLAUDE_CONFIG_DIR` when set, else `<home>/.claude`) and `liveSessionIds(configDir: string): Set<string>`, which reads the `*.json` files of `<configDir>/sessions` and keeps each string `sessionId`; a missing folder, an unreadable file or malformed JSON is skipped. It imports only `node:` modules and `src/lib/util/`.
- `list/index.mts`: drop the local `ListRow` type and return `ListRowView[]`. The action reads the live ids once per call from the context's `env` and `home`, then per item: `sessionsOf`, `session` as the last entry or null, `attention` from the item's status, `nextOf(...).actor` and whether `session` is live, `branch` from the state, `worktrees` from `snap.layout.repos` entries with a `worktree`, `present` by `existsSync` under the root. `renderList` is untouched.
- `CHANGELOG.md`: add `## 1.0.0-alpha.6 (not released yet)` above the alpha.5 entry, with a `### Added` line naming the new `picket list` fields.

**Done when:**
- **T-1.1** `attention.test.mts` covers one case per row and passes: `done` and `abandoned` give `closed` whether live or not; actor `user` gives `needs-you` live and not live; actor `developer` gives `working` when live and `open` when not; actor `lead` gives `working` when live.
- **T-1.2** `sessionsOf` tests pass: verdict sessions `[A, B, A]` with state session `B` give `[A, B]`; `[A, B]` with state session `A` give `[B, A]`; `[A]` with state session `C` give `[A, C]`; no session anywhere gives `[]`.
- **T-1.3** `host-sessions.test.mts` passes against a temporary folder it creates and removes: two valid registry files and one malformed file give the two ids; a missing `sessions` folder gives an empty set; `hostConfigDir` returns `CLAUDE_CONFIG_DIR` when it is set and `<home>/.claude` when not.
- **T-1.4** A list test over a temporary project passes: an item at `approve_phase` whose session is not live has `attention` `needs-you` and `session` equal to its state's session; a recorded worktree whose folder exists has `present: true` and a missing one `present: false`; an item with no branch has `branch: null`.
- **T-1.5** A pinning test of `verb.render` for one fixed row, written and passing on base b337dc7 before any edit, still passes, so the `--human` output is unchanged.
- **T-1.6** After `npm run build`, `picket list` in this repository prints a row for `20261101-checkpoint-changes-required-gets-a-fix-step` with `"attention":"closed"` and `"session":"43b73270-9af6-4c2f-be1b-deb7965a4c6c"` (its committed `done` status and state session, read 2026-11-02).
- **T-1.7** `npm test` passes.

## Phase 2: `/md` becomes `/picket-markdown`, immediate, with an empty-state open

**Touch set:**
- `src/mods/markdown/hooks/index.tsx`: rename command, set immediate
- `src/mods/markdown/hooks/actions.ts`: `reopen` opens an empty pane
- `src/mods/markdown/hooks/view.tsx`: empty-state hint names the command
- `src/mods/markdown/hooks/index.test.tsx`: rename runs, add empty-state test
- `src/mods/markdown/hooks/picket-markdown.test.tsx`: rename the run at line 400
- `src/mods/markdown/hooks/data.ts`: read only, `PANE` id
- `CHANGELOG.md`: one "act on these" line

**Changes:**
- `index.tsx`: register `{ name: 'picket-markdown', description, argumentHint: '[path]', immediate: true }` and serve it with `command.run` on `{ command: 'picket-markdown' }`; no hook answers `md` any more. With an empty argument the hook calls `reopen`; with nothing to reopen it reports that the empty pane opened instead of the old usage line.
- `actions.ts`: `reopen($)` opens the pane in both cases: on the last document as today, or on the empty state (`$.ui.open({ id: PANE, title: 'Markdown' })`) when there is none; it still returns the path or null.
- `view.tsx:336`: the empty-state hint names `/picket-markdown <path>` instead of `/md path`.
- Every `command: 'md'` in the two test files becomes `command: 'picket-markdown'`, with the same assertions.
- `CHANGELOG.md`, under the alpha.6 heading, `### Changed, act on these`: `/md` is now `/picket-markdown`, with no alias.

**Done when:**
- **T-2.1** The existing tests that ran `/md work/w2/design.md` and `/md work/w1/order.md` pass with `picket-markdown` as the command and their assertions unedited.
- **T-2.2** A new mod test runs `/picket-markdown` with no argument and no document: the pane `picket-markdown` opens and its render holds the empty-state text naming `/picket-markdown`.
- **T-2.3** A mod test that records `command.register` calls sees exactly one registration from the mod, named `picket-markdown` with `immediate: true`, and none named `md`.
- **T-2.4** No `'md'` literal is left in `index.tsx`, and no `command: 'md'` in either test file (absent greps).
- **T-2.5** `node scripts/test.mjs build mods` passes `claude plugin validate --strict` and `claude plugin test` for `dist/mods/markdown`.
- **T-2.6** [DEFERRED: QA, the release QA pass] In a live session, typing `/picket-markdown` while a model turn streams opens the pane before the turn ends.

## Phase 3: picket-session retires to a stub

**Touch set:**
- `src/mods/session/hooks/index.tsx`: stub, one toast, no command
- `src/mods/session/hooks/index.test.tsx`: stub test replaces sidebar tests
- `src/mods/session/types/index.d.ts`: declare no state keys
- `src/mods/session/hooks/sessions.ts`: moved to status
- `src/mods/session/hooks/sessions.test.ts`: moved to status
- `src/mods/status/hooks/sessions.ts`: moved helpers land here
- `src/mods/status/hooks/sessions.test.ts`: moved test lands here
- `src/mods/status/types/index.d.ts`: add `SessionEntry` for the moved file
- `src/mods/session/hooks/actions.ts`: deleted
- `src/mods/session/hooks/data.ts`: deleted
- `src/mods/session/hooks/data.test.ts`: deleted
- `src/mods/session/hooks/messages.test.tsx`: deleted
- `src/mods/session/hooks/sprite.ts`: deleted
- `src/mods/session/hooks/sprite.test.ts`: deleted
- `src/mods/session/hooks/view.tsx`: deleted
- `src/mods/shared/theme.ts`: drop unused `ROLE_TONES`
- `src/lib/mods.mts`: session summary and description say retired
- `docs/reference/mods.md`: regenerated by `npm run docs`
- `.claude-plugin/marketplace.json`: regenerated by the build
- `docs/how-to.md`: lines 17 to 20 and 337, uninstall advice
- `README.md`: line 29 mods line
- `test/repo/dashes.test.mjs`: line 67 module path
- `test/repo/plugin-layout.test.mjs`: read only, marketplace order stays
- `CHANGELOG.md`: retirement line

**Changes:**
- `git mv` the two `sessions` files into `src/mods/status/hooks/`; only import paths change. Add the `SessionEntry` type they import to `src/mods/status/types/index.d.ts` as it stands in the session types file today.
- Delete the seven sidebar files listed above. Read them at b337dc7 later (`git show b337dc7:<path>`): phases 4 and 5 adapt parts of `data.ts` and `actions.ts`.
- The stub `index.tsx` handles only `session.start`: it shows one toast, for example `picket-session is retired: the session list is now the work pane of picket-status (/picket-session). Uninstall it: claude plugin uninstall picket-session@picketai --scope project`, then passes the event on. It registers no command and opens no pane. Its types file declares no state keys.
- `src/lib/mods.mts`: the `session` entry keeps `plugin` and `install: "opt-in"`; `summary` and `description` say it is retired and point to picket-status. Run `npm run docs` and the build, and stage `docs/reference/mods.md` and `.claude-plugin/marketplace.json`.
- `docs/how-to.md` drops the install line and says to uninstall it; `README.md` stops describing it as a sidebar. `test/repo/dashes.test.mjs:67` names `src/mods/status/hooks/sessions.ts`.
- `CHANGELOG.md`, `### Changed, act on these`: picket-session is retired, its list moves to picket-status, the uninstall command, and that its Archived list is not carried over (RISK-004).

**Done when:**
- **T-3.1** A stub mod test passes: on `session.start` the stub raises exactly one toast whose text holds `claude plugin uninstall picket-session@picketai --scope project`, and it makes no `command.register` call.
- **T-3.2** `git ls-files src/mods/session` lists exactly `hooks/index.tsx`, `hooks/index.test.tsx` and `types/index.d.ts` under that folder.
- **T-3.3** The moved `sessions.test.ts` passes under `dist/mods/status` with its assertions unedited.
- **T-3.4** `test/repo/plugin-layout.test.mjs` still passes unedited, so the marketplace keeps serving `picket-session` from `./dist/mods/session`.
- **T-3.5** The absent greps hold: no `ROLE_TONES` in `theme.ts`, no `command.register` in the stub, no install line in `docs/how-to.md`.
- **T-3.6** `node scripts/test.mjs build mods` passes for all three mods, and `npm test` passes with the regenerated `docs/reference/mods.md` staged.

## Phase 4: The work pane with Active and Done tabs, Peek, copy and rename

**Touch set:**
- `src/mods/status/hooks/work-pane.ts`: new pure grouping and groups list
- `src/mods/status/hooks/work-pane.test.ts`: new grouping tests
- `src/mods/status/hooks/session-files.ts`: new transcripts, titles, registry, rename
- `src/mods/status/hooks/pane-actions.ts`: new atoms and press handlers
- `src/mods/status/hooks/pane.tsx`: new pane render
- `src/mods/status/hooks/sessions.ts`: drop archive-tab `visible`
- `src/mods/status/hooks/sessions.test.ts`: drop `visible` cases
- `src/mods/status/hooks/index.tsx`: command, pane hooks, refresh timer
- `src/mods/status/hooks/index.test.tsx`: pane tests
- `src/mods/status/types/index.d.ts`: pane state shapes
- `src/lib/mods.mts`: status summary names the pane
- `docs/reference/mods.md`: regenerated
- `.claude-plugin/marketplace.json`: regenerated
- `CHANGELOG.md`: one Added line
- `src/mods/shared/kernel.ts`: read only, `runPicket`

**Changes:**
- Types: `SessionGroup = 'needs-you' | 'working' | 'open' | 'closed' | 'none'`; `SessionEntry = { id; title; mtimeMs; isLive; isCurrent }`; `GroupedSession = { entry: SessionEntry; group: SessionGroup; items: ListRowView[]; greyed: ListRowView[] }` where `items` are rows whose `session` is this id and `greyed` rows that list it in `sessions` but end elsewhere; `PaneTab = 'active' | 'done' | 'cleanup'`; `PaneView = { tab; selectedId; renamingId; confirm: string | null; offset }`. `ListRowView` is imported from `src/lib/shared/views.mts`.
- `work-pane.ts`: `SESSION_GROUPS` (labels `NEEDS YOU`, `WORKING`, `OPEN`, `CLOSED`, `NO WORK ITEM`, in that order) and `groupSessions(entries, rows, done)` returning the Active groups (current session first, then newest) and the Done list, by D-004.
- `session-files.ts`: config dir, transcript listing of `<config>/projects/<projectSlug(root)>`, registry liveness and title cache, and `rename`, adapted from `data.ts:126-215` and `actions.ts:56-87` at b337dc7: the current session renames through `/rename`, a live other session is refused with a toast, a closed one gets an `agent-name` record appended.
- `pane-actions.ts`: atoms `rows`, `sessions`, `done`, `paneView`; `togglePane` (pane id `work`, title `Work`, 50 columns as the sidebar used, `index.tsx:19` at b337dc7); `select` (Peek); `copyResume` (`$.ui.copy({ text: 'claude --resume <id>', surface: press.surface })` and a toast); `startRename`; `markDone` and `back` (store key `done-sessions`); `selectTab`.
- `index.tsx`: on `session.start` register `{ name: 'picket-session', description: 'Show or hide the work pane', immediate: true }`; `command.run` toggles the pane; `ui.render` and `ui.scroll` for the pane. While the pane is open, a 15-second timer (the sidebar's `SESSIONS_MS`) refreshes transcripts and titles and runs `picket list`; opening the pane refreshes at once.
- Peek is read only: title, lane, attention, phases, branch per item, greyed ones dimmed. No link, no open, no resume.
- `CHANGELOG.md`, `### Added`: the work pane and `/picket-session`.

**Done when:**
- **T-4.1** `work-pane.test.ts` passes one case per group: needs-you plus working items give NEEDS YOU; working only gives WORKING; open gives OPEN; closed only gives CLOSED; a session holding only an item whose latest session is another gives CLOSED with that item in `greyed`; no item gives NO WORK ITEM; a Done id appears in Done and in no Active group.
- **T-4.2** A mod test runs `/picket-session` twice: the first opens pane `work`, the second closes it; the recorded registration carries `immediate: true`.
- **T-4.3** A mod test with a mocked transcript folder of three sessions and a mocked `picket list` answer renders the headers `NEEDS YOU`, `WORKING`, `NO WORK ITEM` in that order with the expected titles under each.
- **T-4.4** A mod test presses a row's copy button and sees one `ui.copy` with `claude --resume <that id>`; pressing the row shows Peek with its items, the greyed one dimmed.
- **T-4.5** A mod test marks a session done: it leaves Active, shows on the Done tab, and the store holds `done-sessions` with its id; pressing back returns it to Active.
- **T-4.6** A mod test renames a closed session (an `agent-name` record is appended to its mocked transcript) and is refused with a toast for a live other session.
- **T-4.7** The absent greps hold on `pane-actions.ts`: no `command: 'resume'`, no `'/clear'`, no `$.prompt.fill(`.
- **T-4.8** [DEFERRED: product owner, the release QA pass] In a live session the pane matches the canvas board WorkPane.dc.html (OQ-001).

## Phase 5: Delete on the Done tab, and the Cleanup tab

**Touch set:**
- `src/mods/status/hooks/work-pane.ts`: `cleanupOf` pure function
- `src/mods/status/hooks/work-pane.test.ts`: cleanup tests
- `src/mods/status/hooks/session-files.ts`: `deleteTranscript`
- `src/mods/status/hooks/pane-actions.ts`: confirm, delete, delete all, copy command
- `src/mods/status/hooks/pane.tsx`: confirmation rows, Cleanup tab
- `src/mods/status/hooks/index.test.tsx`: delete and cleanup tests
- `src/mods/status/types/index.d.ts`: cleanup row shape
- `src/lib/shared/checkouts.mts`: read only, worktree path form (line 125)

**Changes:**
- `work-pane.ts`: `CLEANUP_AGE_DAYS = 14` (from the request) and `cleanupOf(rows, entries, now)` returning `{ worktrees: { item: ListRowView; command: string }[]; sessions: SessionEntry[] }`: a worktree row for each `present` worktree of a `closed` item, with `command` `git -C <repo> worktree remove <path relative to repo>` (OQ-003); a session row for each transcript older than 14 days whose id no row lists in `sessions`.
- `session-files.ts`: `deleteTranscript(entry)` by D-008, adapted from `actions.ts:16-35` at b337dc7, refusing the current session, a live one and an id outside the UUID pattern.
- `pane-actions.ts`: `askDelete(id | 'all')`, `cancelDelete`, `confirmDelete`, `deleteAll` (eligible Done sessions, one toast naming how many were skipped), `copyCommand` for a Cleanup worktree row. Delete is offered only on the Done tab and the Cleanup tab's session rows, never on a key.
- `pane.tsx`: a confirmation row with the session's title and id in place of the row being deleted; the Cleanup tab with its two lists.

**Done when:**
- **T-5.1** `cleanupOf` tests pass: a closed item with `{ repo: 'svc', path: 'svc/.worktrees/feat', present: true }` gives `git -C svc worktree remove .worktrees/feat`; a missing worktree or an open item gives no row.
- **T-5.2** `cleanupOf` tests pass for age: a session 15 days old with no item is listed; one 13 days old is not; one 15 days old that an item lists is not.
- **T-5.3** A mod test on the Done tab presses delete: a confirmation row shows; confirming runs one `process.run` whose arguments end with `<config>/projects/<slug>/<id>.jsonl`; cancelling runs nothing.
- **T-5.4** A mod test tries to delete the current session, a live one and a non-UUID id: each shows a toast and runs no process.
- **T-5.5** A mod test presses Delete all with three Done sessions, one of them live: after one confirmation two unlinks run and one toast names one skipped.
- **T-5.6** A mod test presses copy on a Cleanup worktree row and sees one `ui.copy` with the `git -C` command.
- **T-5.7** `node scripts/test.mjs build mods` passes for `dist/mods/status`; no drive deletes a real transcript.

## Phase 6: The band's need-you count, `☰` and `M↓`

**Touch set:**
- `src/mods/status/hooks/band.ts`: entry pieces, line always drawn
- `src/mods/status/hooks/band.test.ts`: entry and line tests
- `src/mods/status/hooks/watch.ts`: new signature and counts
- `src/mods/status/hooks/watch.test.ts`: new pure tests
- `src/mods/status/hooks/pane-actions.ts`: signature-gated `refreshRows`
- `src/mods/status/hooks/index.tsx`: buttons, ticks, command list check
- `src/mods/status/hooks/index.test.tsx`: band tests
- `src/mods/status/types/index.d.ts`: `Piece.press`, `BandEntry`
- `CHANGELOG.md`: one Added line

**Changes:**
- Types: `Piece` gains `press?: 'work' | 'markdown'`; `BandEntry = { needYou: number; sessions: number; hasMarkdown: boolean }`.
- `band.ts`: `agentsLine(all, work, now, entry)` always returns a `Line`: left as today (empty when no agent works or waits), right `◀ <n> need you` in `TONES.warning` only while `n > 0`, then `☰ <sessions>` with `press: 'work'`, then `M↓` with `press: 'markdown'` only while `hasMarkdown`. Plain text glyphs, as SDR-00002 D-003 asks.
- `watch.ts`: `workSignature(stats)`, `needYouCount(rows, currentId)` (rows with `attention` `needs-you` whose `session` is not the current id, null included) and `activeSessionCount(transcriptNames, done)`.
- `pane-actions.ts`: `refreshRows($, { force })` builds the D-005 signature and runs `picket list` only when it changed or `force` is set; the pane's open and timer pass `force`.
- `index.tsx`: the 30-second tick and the Bash `picket` hook also call `refreshRows` and recount transcripts; `hasMarkdown` from `$.command.list()` on each tick. The `AbovePrompt` render draws even with no work item, and wraps each piece with `press` in a plain `Button`: `work` calls `togglePane`, `markdown` calls `$.command.run({ command: 'picket-markdown' })` (D-006).
- `CHANGELOG.md`, `### Added`: the band's `◀ <n> need you`, `☰` and `M↓`.

**Done when:**
- **T-6.1** `band.test.ts` passes: with no agents and no work, `agentsLine` gives a line whose right side reads `☰ 3` then `M↓`; with `needYou: 2` the right side starts with `◀ 2 need you` in `TONES.warning`; `needYou: 0` draws no `◀`; `hasMarkdown: false` draws no `M↓`.
- **T-6.2** `watch.test.ts` passes: `needYouCount` counts needs-you rows of another session and of no session, and skips the current session's and non-needs-you rows.
- **T-6.3** A mod test where `picket next --latest` answers no open item still renders the band with `☰`.
- **T-6.4** A mod test counts `picket list` runs: one at start, none over two ticks with unchanged stats, one more after a not-closed item's `verdicts.jsonl` mtime changes, none after only a closed item's `state.yaml` mtime changes.
- **T-6.5** A mod test presses `☰` and pane `work` opens; presses `M↓` and one `command.run` for `picket-markdown` is recorded; with a command list lacking `picket-markdown`, no `M↓` is drawn.
- **T-6.6** A mod test sees no `fs.read` of a `.jsonl` path over three ticks while the pane is closed.
- **T-6.7** The phase's diff of `band.test.ts` removes no line inside the existing `workLine` and `stepText` tests, and they pass, so the work line and the pinned `ACTION_TEXT` strings are unchanged.
- **T-6.8** [DEFERRED: QA, the release QA pass] In a live session during a model turn, pressing `☰` opens the work pane at once and pressing `M↓` opens the Markdown pane (OQ-002).

## Open questions

- **OQ-001** The canvas boards WorkPane.dc.html and BandEntry.dc.html (artifact JriMuvHWEkjXaiCQyZLiBe) are not in the repository or `.picket/state/scratch/canvas*/`, and the architect could not open the artifact, so the row layout, glyphs beyond those the request quotes, and the meaning of OPEN against WORKING come from the request text and D-001. Owner: product owner. Fallback: the request text and the retired sidebar's layout; T-4.8 checks the result against the board.
- **OQ-002** The mod types say a plugin's `$.command.run` is queued until the session is idle (line 3183); whether an `immediate` command run that way still waits is not documented. Owner: QA. Fallback: `M↓` uses `$.command.run`; if T-6.8 fails, a follow-up switches to the state-key signal named under D-006.
- **OQ-003** The request names `git worktree remove <path>`. Picket's worktrees live in nested repositories (`<repo>/.worktrees/<name>`, `src/lib/shared/checkouts.mts:125`), and in a scratch umbrella with a nested repo, `git worktree list` run from the umbrella did not list the nested repo's worktree, so the literal form fails from the project root. The pane copies `git -C <repo> worktree remove <path relative to repo>`, the same command run in the right repository. Owner: product owner. Fallback: the `git -C` form.

## Revision log
