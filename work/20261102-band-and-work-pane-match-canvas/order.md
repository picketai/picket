---
kind: order
lane: order
title: Band and work pane match canvas
date: 2026-11-02
audience: developer
sources: request.md; tmp/canvas-spec/project/BandEntry.dc.html; tmp/canvas-spec/project/WorkPane.dc.html; artifacts/strategy/decisions/00002-session-list-merges-picket-status.md (Ratified); work/20261102-session-list-merges-into-picket-status-design/design.md; src/mods/status/hooks/band.ts, band.test.ts, index.tsx, index.test.tsx, pane.tsx, pane-actions.ts, work-pane.ts, work-pane.test.ts, sessions.ts, session-files.ts, watch.ts; src/mods/status/types/index.d.ts; src/mods/shared/theme.ts; src/mods/markdown/hooks/index.tsx, actions.ts, view.tsx, data.ts, index.test.tsx, picket-markdown.test.tsx; lead's message of 2026-11-02 adding item 10 (pane spacing, from the user's screenshots); src/lib/shared/views.mts; src/lib/shared/work/action-text.mts, attention.mts, next-step.mts; src/lib/verbs/list/index.mts, index.test.mts; scripts/build.mjs; CHANGELOG.md; Claude Code mod types (dist/mods/session/.claude-plugin/types/claude-code/index.d.ts)
phases:
  - n: 1
    files:
      - src/mods/status/hooks/band.ts
      - src/mods/status/hooks/band.test.ts
      - src/mods/markdown/hooks/actions.ts
      - src/mods/markdown/hooks/index.tsx
      - src/mods/markdown/hooks/index.test.tsx
      - src/mods/markdown/hooks/view.tsx
      - src/mods/markdown/hooks/picket-markdown.test.tsx
      - src/mods/shared/theme.ts
      - src/mods/status/hooks/pane.tsx
      - CHANGELOG.md
    greps:
      - path: src/mods/shared/theme.ts
        pattern: 'export const PANE_PADDING\b'
      - path: src/mods/markdown/hooks/view.tsx
        pattern: 'PANE_PADDING'
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'PANE_PADDING'
      - path: src/mods/status/hooks/band.ts
        pattern: 'TONES\.control'
      - path: src/mods/status/hooks/band.test.ts
        pattern: '◀ 3 need you · ☰ 12 · M↓'
      - path: src/mods/markdown/hooks/actions.ts
        pattern: 'ui\.close\('
      - path: src/mods/markdown/hooks/index.tsx
        pattern: 'Markdown pane closed\.'
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/views.mts
      - src/lib/verbs/list/index.mts
      - src/lib/verbs/list/index.test.mts
      - src/mods/status/types/index.d.ts
      - src/mods/status/hooks/detail.ts
      - src/mods/status/hooks/detail.test.ts
      - src/mods/status/hooks/pane.tsx
      - src/mods/status/hooks/pane-actions.ts
      - src/mods/status/hooks/sessions.ts
      - src/mods/status/hooks/sessions.test.ts
      - src/mods/status/hooks/index.test.tsx
      - src/mods/status/hooks/work-pane.test.ts
      - src/mods/status/hooks/watch.test.ts
      - CHANGELOG.md
    greps:
      - path: src/lib/verbs/list/index.test.mts
        pattern: 'phases_approved: 0'
      - path: src/lib/verbs/list/index.test.mts
        pattern: 'phase_count: 1'
      - path: src/mods/status/hooks/detail.ts
        pattern: 'ACTION_TEXT'
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'nothing waits'
      - path: src/mods/status/hooks/pane.tsx
        pattern: '\bunderline\b'
      - path: src/mods/status/types/index.d.ts
        pattern: '\bfolded\b'
      - path: src/mods/status/hooks/index.test.tsx
        pattern: '▸ NO WORK ITEM'
      - path: src/mods/status/hooks/pane.tsx
        pattern: '\bwindowLabel\b'
        absent: true
    tests: true
    drive: true
  - n: 3
    files:
      - src/mods/status/types/index.d.ts
      - src/mods/status/hooks/pane.tsx
      - src/mods/status/hooks/session-files.ts
      - src/mods/status/hooks/sessions.ts
      - src/mods/status/hooks/sessions.test.ts
      - src/mods/status/hooks/index.test.tsx
      - src/mods/status/hooks/work-pane.test.ts
      - CHANGELOG.md
    greps:
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'PEEK'
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'read-only'
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'WORKTREES ON DISK'
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'Closed items whose worktree is still there\.'
      - path: src/mods/status/hooks/pane.tsx
        pattern: 'days old, no work item\.'
      - path: src/mods/status/hooks/pane.tsx
        pattern: '\bWORKTREES OF CLOSED ITEMS\b'
        absent: true
      - path: src/mods/status/types/index.d.ts
        pattern: 'size: number'
      - path: src/mods/status/hooks/sessions.ts
        pattern: '\bsizeLabel\b'
    tests: true
    drive: true
---
# Order: Band and work pane match canvas

## Problem
The design item for SDR-00002 shipped the band buttons and the work pane, but drew them differently from the approved boards `tmp/canvas-spec/project/BandEntry.dc.html` and `tmp/canvas-spec/project/WorkPane.dc.html` (default tweak "every row"). The boards are the visual spec; their data is sample data and their hex colours map to the theme keys in `src/mods/shared/theme.ts`. The only kernel change allowed is what the session detail row needs: today a `picket list` row carries `next` as an action name and `phases` as a `"2/4"` string, which is not enough to draw `you approve phase 3` or the phase dots. Session name prefixes (SDR TF-006) stay out.

## Decisions

### D-001: List rows carry the step inputs; the mod writes the step text
**Decision:** `ListRowView` (`src/lib/shared/views.mts:53`) gains five additive fields filled in `rowOf` (`src/lib/verbs/list/index.mts:23`): `phase: number | null`, `actor: string | null` and `detail: string` from `nextOf`, and `phases_approved: number` and `phase_count: number` from `stateView`. The mod renders the step with `ACTION_TEXT[next]({ actor, phase, lane, detail }, 'user')` from `src/lib/shared/work/action-text.mts`, the same table and voice the band's `stepText` uses (`src/mods/status/hooks/band.ts:104`), and the build already copies that file into the mods (`MOD_LIB_SHARED`, `scripts/build.mjs:21`). For a blocked item `detail` is the blocked reason (`next-step.mts:120`), so `resolve_block` reads `blocked: <reason>`. The `--human` render and the `phases` string stay as they are.
**Instead of:** a rendered `step` string in the kernel row: the tone still needs `status` and `attention`, and a second copy of the step wording would drift from the band's.
**Risks:**
- **RISK-001** A long blocked reason overflows the 50-column pane. Mitigation: the detail row is drawn with `wrap="truncate-end"`.

### D-002 (r2): The detail row shows the session's most urgent item
**Decision:** A new pure module `src/mods/status/hooks/detail.ts` exports `detailPieces(session: GroupedSession): Piece[]`. It returns `[]` when `session.items` is empty (no work item, or only items continued elsewhere), so no detail row is drawn. Otherwise it takes the item first in `SESSION_GROUPS` order (`work-pane.ts:8`), list order on a tie, and appends `  +<n>` (muted) for the other items. A closed item reads `closed` (success; `abandoned` in muted when the status is `abandoned`), `  ⎇ <branch>` (accent, left out when `branch` is null) and `  worktree` (warning, while any of its worktrees is present). Any other item reads the lane (accent), then, when `phase_count > 0`, two spaces and `●` per approved phase (accent) and `○` per open one (rule), then two spaces and the step: status `blocked` gives error bold with ` ◀`; attention `needs-you` gives warning bold with ` ◀`; `working` gives accent with ` ⋯`, as the band's `stepText` ends a working step (the user's ruling on OQ-001, 2026-11-02); `open` gives muted. The separators are two spaces, as the board's `detailOf` draws them.
**Instead of:** one detail row per item: three rows per session is the board's fixed shape, and Peek already lists every item.

### D-003 (r2): Peek is a fixed bottom section and the list keeps its height
**Decision:** Peek leaves the list and becomes the pane's last section: a rule row of `─` repeated over the line width in the rule tone (a drawn Text, since the engine types promise no top border on a Box), a `PEEK` (muted bold) and `read-only` (muted) row, the selected session's title in bold, then the item lines `peekLines` draws today. Its height is `PEEK_ROWS = 10`: rule, header, gap and title (4) plus three items at two rows each (6), one more item than the board's largest sample session holds. The list Box gets the height that remains, `bodyRows - 2 * PANE_PADDING - CHROME_ROWS - 1 (the more row) - PEEK_ROWS`, never below 3 (one session's three rows), so Peek starts on the same row whatever is selected. Pressing a title selects it (it no longer toggles), and with no valid selection the first session in group order is selected, as the board does.
**Instead of:** Peek inline under the selected row (today): the boards draw it as its own section, and inline lines shift every row below the selection.
**Risks:**
- **RISK-002** On a short terminal the list keeps only 3 rows. Mitigation: the list still scrolls with `ui.scroll` and `↓ <n> more` says what is below.

### D-004: Group folding lives in the pane view
**Decision:** `PaneView` (`src/mods/status/types/index.d.ts:89`) gains `folded: (SessionGroup | 'done')[]`, default `['none']` in `VIEW_DEFAULTS` (`pane-actions.ts:17`), and `pane-actions.ts` exports `toggleGroup($, group)`. A group header is a Button keyed `group-<group>` (`group-done` on the Done tab) that flips its membership; a folded group draws only its header, with `▸` in place of `▾`. Changing tab keeps the folds.
**Instead of:** keeping folds in the mod store: the board keeps them only in view state, and a fold that outlives the session hides a group the developer forgot about.

### D-005 (r2): Cleanup rows follow the board, with no delete
**Decision:** Each Cleanup row draws `⧉ ✓` right-aligned above the title, the title, and the worktree path or `<age> old` below, indented two columns. ⧉ copies the remove command (worktree rows) or `claude --resume <id>` (old sessions); ✓ marks done `item.session` (not drawn when it is null) or the old session. The `⊘` delete leaves Cleanup: an old session is deleted by marking it done and deleting it on the Done tab, behind the same confirmation. `SessionEntry` gains `size: number`, the transcript's `file.size` from the folder listing `listSessions` already makes (`session-files.ts:91`), shown through `sizeLabel(bytes)` in `sessions.ts` (1024 steps, `B`, `KB`, `MB`, `GB`, one decimal below 10, whole numbers from 10). Only old-session rows show this size on the right of the title. Worktree rows show no size and carry their path below the title: the user decided this on OQ-002 (2026-11-02), because a size means walking every file of the worktree.
**Instead of:** keeping `⊘` in Cleanup: the board and the request draw `⧉ ✓` only, and SDR-00002 RISK-001 allows delete on the Done tab alone.
**Risks:**
- **RISK-003** A user who deleted old sessions straight from Cleanup now takes two presses. Mitigation: a CHANGELOG line says so.

## Scope
**In:**
- Band: ` · ` separators in the rule tone, `☰ <n>` and `M↓` in the control tone, `/picket-markdown` with no argument toggling its pane.
- Item 10: the Markdown pane and the work pane share one inset (one row and one column on every side) in every state, so switching their dock tabs never shifts where the content starts.
- Work pane: header summary, tabs, coloured foldable group headers, three-row sessions with action and detail rows, Peek as the bottom section with a fixed list height, Cleanup layout and sizes.
- Kernel: the five `picket list` row fields of D-001.

**Out:**
- Session name prefixes (SDR TF-006) and the board's sample Peek prose (summaries, files, tests).
- The worktree size on Cleanup rows, decided out by the user on OQ-002 (D-005 r2).
- The delete confirmation texts and `isDeletable` rules; they stay as shipped.

## Phase 1: Band separators, button colours, the Markdown toggle and one pane inset
**Touch set:**
- `src/mods/status/hooks/band.ts`: entry separators and button tones
- `src/mods/status/hooks/band.test.ts`: pins entry text and tones
- `src/mods/markdown/hooks/actions.ts`: `reopen` becomes a toggle
- `src/mods/markdown/hooks/index.tsx`: command reply for closing
- `src/mods/markdown/hooks/index.test.tsx`: toggle and inset mock tests
- `src/mods/markdown/hooks/view.tsx`: root Box takes the inset
- `src/mods/markdown/hooks/data.ts`: `paneView` read for `treeTop`
- `src/mods/markdown/hooks/picket-markdown.test.tsx`: layout tests follow the inset
- `src/mods/shared/theme.ts`: shared `PANE_PADDING` constant
- `src/mods/status/hooks/pane.tsx`: `PADDING` becomes the shared constant
- `src/mods/status/hooks/index.test.tsx`: band press test stays green
- `CHANGELOG.md`: alpha.6 band and command lines

**Changes:**
- `entryPieces` joins its parts with the existing `DOT` piece (` · ` in `TONES.rule`) instead of `ENTRY_GAP`; the `☰ <n>` and `M↓` pieces gain `color: TONES.control`, not bold; `◀ <n> need you` keeps warning bold.
- In `actions.ts`, `reopen` becomes `toggle($)`: when `$.ui.panes()` lists `PANE`, it calls `$.ui.close({ id: PANE })` and leaves the document atoms untouched; otherwise it opens as `reopen` does today. The no-argument branch of the command handler replies `Markdown pane closed.` after a close and keeps today's replies after an open. A run with a path always shows that file, open pane or not.
- Item 10: `src/mods/shared/theme.ts` exports `PANE_PADDING = 1`; `pane.tsx` uses it in place of its own `PADDING` (the work pane already pads 1 on every side, `pane.tsx:309`). In `view.tsx` both `renderPane` returns, the empty state and the document state (body, footer and file list or outline), sit in a root Box with `paddingX` and `paddingY` of `PANE_PADDING` and the pane background, so the empty-state text no longer starts flush left under the tab strip. The document state drops its leading blank row (`top[0]`, `view.tsx:349`), which the top padding replaces; its row and column budgets subtract `2 * PANE_PADDING`; and `treeTop` adds `PANE_PADDING`, because the wheel pointer's row counts from the body's first row (`scrollPane`, `actions.ts:165`). The two-column change gutter stays as part of the content, as the work pane's live-dot column does.
- CHANGELOG alpha.6: line 9 says a no-argument `/picket-markdown` closes the pane when it is open, so `M↓` toggles it; line 14 shows the separators.

**Done when:**
- **T-1.1** `band.test.ts` asserts `entryPieces({ needYou: 3, sessions: 12, hasMarkdown: true })` reads `◀ 3 need you · ☰ 12 · M↓`, each ` · ` piece in `TONES.rule`; with `needYou: 0` it reads `☰ 12 · M↓`; with `hasMarkdown: false` it reads `☰ 12`.
- **T-1.2** In the same test the `☰ 12` and `M↓` pieces carry `color: TONES.control` and their `press` values, and the `◀` piece carries `TONES.warning` and `bold: true`.
- **T-1.3** A mock-engine test in `src/mods/markdown/hooks/index.test.tsx` opens a document, runs `/picket-markdown` with no argument while `ui.panes` lists `picket-markdown`, and sees the pane closed and the reply `Markdown pane closed.`; a second no-argument run opens the pane again on the same document.
- **T-1.4** A mock-engine test runs `/picket-markdown <path>` while the pane is open and sees that file shown and no close.
- **T-1.5** The existing status test T-6.5 (`☰ 3`, `◀ 1 need you`, `band-markdown` runs `picket-markdown`) and markdown test T-2.2 pass unchanged.
- **T-1.6** `npm test` passes, and `node scripts/test.mjs build mods` passes for `dist/mods/status` and `dist/mods/markdown`.
- **T-1.7** A mock-engine test in `src/mods/markdown/hooks/index.test.tsx` finds the Markdown pane's outermost Box with `paddingX` and `paddingY` equal to `PANE_PADDING` in the empty state, with a document in Files mode and with a document in Outline mode, and the work pane's outermost Box with the same two values.
- **T-1.8** With a document open, the first drawn body row holds the document's first line (no blank row before it), and after the render `paneView().treeTop` equals the document area's row count plus `PANE_PADDING`.

## Phase 2: List row fields, header, tabs, folding groups and three-row sessions
**Touch set:**
- `src/lib/shared/views.mts`: five `ListRowView` fields
- `src/lib/verbs/list/index.mts`: fill the fields in `rowOf`
- `src/lib/verbs/list/index.test.mts`: row deepEqual and human pin
- `src/mods/status/hooks/detail.ts`: new detail-row pieces module
- `src/mods/status/hooks/detail.test.ts`: detail-row unit tests
- `src/mods/status/types/index.d.ts`: `folded` in `PaneView`
- `src/mods/status/hooks/pane-actions.ts`: `toggleGroup`, select sets, defaults
- `src/mods/status/hooks/pane.tsx`: header, tabs, groups, session rows
- `src/mods/status/hooks/sessions.ts`: drop `windowLabel`
- `src/mods/status/hooks/sessions.test.ts`: drop `windowLabel` tests
- `src/mods/status/hooks/work-pane.ts`: `SESSION_GROUPS` order reused
- `src/mods/status/hooks/index.test.tsx`: pane mock tests and fixtures
- `src/mods/status/hooks/work-pane.test.ts`: row fixture gains fields
- `src/mods/status/hooks/watch.test.ts`: row fixture gains fields
- `CHANGELOG.md`: alpha.6 list fields and pane

**Changes:**
- D-001 in the kernel; D-002 in `detail.ts`; D-004 in the view and actions.
- Header: `WORK` muted bold left; right `◀ <n> need you` warning bold, n the active sessions in NEEDS YOU, else `nothing waits` muted. `windowLabel` goes.
- Tabs: `Active <n>`, `Done <n>`, `Cleanup <n>` (worktrees plus old sessions from `cleanupOf`), two spaces apart (OQ-001), keys unchanged; the selected one bold, `underline` and in the text tone, the others `dimColor`, no background. On the Done tab with done sessions, an `⊘` Button keyed `ask-delete-all` in error sits at the right of the tab row; the `Delete all` row goes and the confirmation keeps its text, below the tab row.
- Group headers: Button `group-<group>` with `▾ <LABEL>`/`▸ <LABEL>` bold, colours NEEDS YOU warning, WORKING accent, OPEN muted, CLOSED success, NO WORK ITEM and DONE muted; count right-aligned muted. The Done tab draws one DONE group.
- Session: one column Box holding an action row right-aligned (`⧉ ✎ ✓`, Done tab `⧉ ✎ ↺ ⊘`, keys unchanged; ⧉ ✎ ✓ ↺ in `TONES.control`, ✓ in `TONES.success` in CLOSED, ⊘ in `TONES.error` per OQ-001), the title row (dot, title, age right muted, Button `peek-<id>`) and the `detailPieces` row with `paddingLeft={2}` when not empty. The selected session's Box takes `SURFACES.row`; selection follows D-003. The selected session's item lines stay under its rows until phase 3.
- Below the list a muted `↓ <n> more` row, n the sessions below the window.

**Done when:**
- **T-2.1** `picket list` rows carry `phase`, `actor`, `detail`, `phases_approved` and `phase_count` (the T-1.4 deepEqual in `src/lib/verbs/list/index.test.mts` holds `phase: 1`, `actor: "user"`, `phases_approved: 0`, `phase_count: 1`), and the existing byte-for-byte human render test passes unchanged.
- **T-2.2** `detail.test.ts` asserts every piece's text, colour and bold for three board rows: order 2 of 3 at `approve_phase` 3 needs-you reads `order  ●●○  you approve phase 3 ◀`; design 1 of 4 blocked `3 tests fail` with a second item reads `design  ●○○○  blocked: 3 tests fail ◀  +1` in error bold; research with 0 phases at `resolve_sources` reads `research  you pick source versions ◀`.
- **T-2.3** `detail.test.ts` asserts a working item's step in accent with no `◀`, an open item's in muted, `closed  ⎇ fix/markdown-paths  worktree` with success, accent and warning, `abandoned` in muted, a closed item with no branch and no present worktree reading `closed`, and `[]` for a session with no items.
- **T-2.4** A pane mock test draws `◀ 1 need you` (warning, bold) with one NEEDS YOU session and `nothing waits` (dimmed) with none.
- **T-2.5** A pane mock test draws `Active 3`, `Done 0`, `Cleanup 0`; the selected tab's Text has `bold` and `underline` and no `backgroundColor`; on the Done tab with done sessions the `ask-delete-all` Button draws `⊘` and no `Delete all` text draws; T-5.5 passes with its confirmation text unchanged.
- **T-2.6** The outline test reads `▾ NEEDS YOU`, its session, `▾ WORKING`, its session, `▸ NO WORK ITEM`, with `Read the logs` not drawn; pressing `group-none` draws it under `▾ NO WORK ITEM`; pressing `group-needs-you` hides its session.
- **T-2.7** A pane mock test finds each session's action Buttons in the order `copy-`, `rename-`, `done-` in `TONES.control`, `done-` in `TONES.success` for a CLOSED session, `copy-`, `rename-`, `back-`, `ask-delete-` on the Done tab, and `SURFACES.row` on the first session's Box before any press and on the pressed one after `peek-<id>`.
- **T-2.8** With `bodyRows` too small for every session the pane draws `↓ <n> more` with n the hidden sessions; T-4.4, T-4.5, T-4.6, T-5.3 and T-5.4 pass with their keys and confirmation texts unchanged (unfolding NO WORK ITEM first where they press its session); `node scripts/test.mjs build mods` passes for `dist/mods/status`.

## Phase 3: Peek section, fixed list height and the Cleanup layout
**Touch set:**
- `src/mods/status/hooks/pane.tsx`: Peek section, list height, Cleanup
- `src/mods/status/types/index.d.ts`: `size` in `SessionEntry`
- `src/mods/status/hooks/session-files.ts`: fill `size` from the listing
- `src/mods/status/hooks/sessions.ts`: `sizeLabel` formatter
- `src/mods/status/hooks/sessions.test.ts`: `sizeLabel` cases
- `src/mods/status/hooks/work-pane.ts`: `cleanupOf` and `CLEANUP_AGE_DAYS`
- `src/mods/status/hooks/index.test.tsx`: Peek and Cleanup mock tests
- `src/mods/status/hooks/work-pane.test.ts`: entry fixture gains `size`
- `CHANGELOG.md`: alpha.6 pane and Cleanup lines

**Changes:**
- D-003: the item lines leave the session rows; the list Box (key `list`) takes its fixed height; Peek draws below it. With no session on the tab Peek shows `Nothing selected` and `Click a title to peek at it.` muted.
- D-005 on the Cleanup tab: `WORKTREES ON DISK` (warning bold) with `Closed items whose worktree is still there.`, `OLD SESSIONS` (muted bold) with `Over ${CLEANUP_AGE_DAYS} days old, no work item.`, each with its count right muted and drawn only when it has rows; `Nothing to clean up.` when both are empty; a muted footer `⧉ copies a command; the pane never runs it.`. Row keys: `copy-command-<key>` stays; old-session ⧉ is `copy-<id>`, ✓ keys are unique per row.

**Done when:**
- **T-3.1** A pane mock test finds, after the last session row, a Text of `─` repeated, `PEEK`, `read-only`, the selected session's title in bold and its items' title lines; pressing another session's `peek-<id>` changes the Peek title, and no item line draws between session rows.
- **T-3.2** In a pane mock test the Box keyed `list` has `height` equal to `bodyRows - 2 * PANE_PADDING - CHROME_ROWS - 1 - PEEK_ROWS` for two different selections, and 3 when that sum is smaller.
- **T-3.3** `sessions.test.ts` asserts `sizeLabel` gives `6.2 MB` for 6500000, `214 MB` for 224395264, `3.1 MB` for 3250586 and `512 B` for 512.
- **T-3.4** A Cleanup mock test with a closed item whose worktree is present and a 20-day-old session with no item draws `WORKTREES ON DISK` in warning, its hint, the item title and the worktree path below; `OLD SESSIONS`, its hint, the session title with its `sizeLabel` size and `20d old` below; and no `ask-delete-` Button.
- **T-3.5** On the Cleanup tab the old session's ⧉ copies `claude --resume <id>` and its ✓ stores the id under `done-sessions`; the worktree row's ✓ stores the item's session; T-5.6 passes unchanged.
- **T-3.6** A Cleanup mock test with nothing to clean draws `Nothing to clean up.` and neither section label.
- **T-3.7** `npm test` passes, and `node scripts/test.mjs build mods` passes for `dist/mods/status`.

## Open questions
- **OQ-001** The request and the WorkPane board disagree in three places: the request puts `⋯` after a working step, the board draws none; the request puts the Done-tab `⊘` in the control tone, the board draws it (and the Delete-all `⊘`) in error; the request spaces the tabs three columns apart, the board two (`gap: 2ch`). Owner: product owner. Answered 2026-11-02 for two of the three: the working step keeps the request's ` ⋯` (D-002 r2), and the tabs keep the board's two spaces. Still open: the Done-tab `⊘` colour. Fallback: the board (error), as shipped.
- **OQ-002** The board shows a worktree's size (`214 MB`); measuring it means walking every file of the worktree while the Cleanup tab draws, and the allowed kernel change covers only the detail row. Owner: product owner. Answered 2026-11-02: worktree rows show no size and their path below the title; old-session rows keep the transcript size (D-005 r2).

## Revision log
- 2026-11-02: D-003 (r2): list height formula names PANE_PADDING; item 10 moves the pane padding into theme.ts
- 2026-11-02: D-002 (r2): a working step ends with " ⋯" in accent; user ruling on OQ-001
- 2026-11-02: D-005 (r2): worktree rows show no size, path below the title; user ruling on OQ-002
