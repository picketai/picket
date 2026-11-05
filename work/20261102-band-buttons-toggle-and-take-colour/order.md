---
kind: order
lane: order
title: Band buttons toggle and take colour
date: 2026-11-02
audience: developer
sources: request.md; artifacts/strategy/decisions/00002-session-list-merges-picket-status.md (Ratified); work/20261102-session-list-merges-into-picket-status-design/design.md (D-006, Phase 6); docs/design/picketai-design-system/project/README.md; src/mods/status/hooks/band.ts; src/mods/status/hooks/band.test.ts; src/mods/status/hooks/index.tsx; src/mods/status/hooks/index.test.tsx; src/mods/status/hooks/pane-actions.ts; src/mods/shared/theme.ts; src/mods/markdown/hooks/index.tsx; src/mods/markdown/hooks/actions.ts; src/mods/markdown/hooks/index.test.tsx; scripts/test.mjs; CHANGELOG.md; Claude Code mod types (dist/mods/session/.claude-plugin/types/claude-code/index.d.ts)
phases:
  - n: 1
    files:
      - src/mods/status/hooks/band.ts
      - src/mods/status/hooks/band.test.ts
      - src/mods/status/hooks/index.test.tsx
    greps:
      - path: src/mods/status/hooks/band.ts
        pattern: '\bTONES\.control\b'
      - path: src/mods/status/hooks/band.test.ts
        pattern: 'claudeShimmer|TONES\.control'
      - path: src/mods/status/hooks/index.test.tsx
        pattern: 'claudeShimmer'
    tests: true
    drive: true
  - n: 2
    files:
      - src/mods/markdown/hooks/index.tsx
      - src/mods/markdown/hooks/actions.ts
      - src/mods/markdown/hooks/index.test.tsx
      - CHANGELOG.md
    greps:
      - path: src/mods/markdown/hooks/actions.ts
        pattern: '\$\.ui\.panes\(\)'
      - path: src/mods/markdown/hooks/index.tsx
        pattern: '\$\.ui\.close\('
      - path: src/mods/markdown/hooks/index.tsx
        pattern: 'or hide the pane'
      - path: src/mods/markdown/hooks/index.test.tsx
        pattern: 'ui\.close'
      - path: CHANGELOG.md
        pattern: 'shows or hides the Markdown pane'
      - path: CHANGELOG.md
        pattern: 'which opens the Markdown pane'
        absent: true
    tests: true
    drive: true
---
# Order: Band buttons toggle and take colour

## Problem

The picket-status band's `☰ <n>` and `M↓` buttons are drawn with no colour (`src/mods/status/hooks/band.ts:78-79`), so the terminal shows them in default white, while the PicketAI design system gives every clickable icon `accent-shimmer`, theme key `claudeShimmer` (`docs/design/picketai-design-system/project/README.md:11`, `:33`), already exposed as `TONES.control` (`src/mods/shared/theme.ts:12`). The `M↓` button runs `/picket-markdown` with no argument (`src/mods/status/hooks/index.tsx:206-212`), and that command only ever opens or reopens its pane (`src/mods/markdown/hooks/index.tsx:44-53`), so the button cannot hide the pane the way `/picket-session` hides the work pane (`src/mods/status/hooks/pane-actions.ts:129-137`). SDR-00002 is ratified and binds the band's shape; `◀ <n> need you` stays in the warning tone.

## Decisions

### D-001: The band's pieces carry the control tone
**Decision:** `entryPieces` in `band.ts` gives the `☰ <sessions>` and `M↓` pieces `color: TONES.control`, next to their `press`. Rendering stays as it is: `pressPiece` already draws a piece through `pieceText`, which passes `piece.color` to `Text` (`src/mods/status/hooks/index.tsx:162-178`). The `◀ <n> need you` piece keeps `TONES.warning` and `bold`. This keeps colour where every other band colour lives, in `band.ts`, where the unit tests pin it.
**Instead of:** colouring every `press` piece in `pressPiece` at render time: `band.ts` would not need to know, but the colour would be invisible to `band.test.ts` and would override any colour a future press piece sets for itself.

### D-002: Only the bare command toggles
**Decision:** `/picket-markdown` with no argument closes the Markdown pane when it is open and opens or reopens it otherwise. `/picket-markdown <path>` always shows that path, open pane or not. `M↓` runs the bare command, so it toggles with no change on the status side. This gives up the literal reading of the request ("run while its pane is open, it closes the pane") for a path argument.
**Instead of:** any run while the pane is open closes it: typing `/picket-markdown work/x/design.md` to fill an open pane would close it instead, which is the opposite of what the path asks for.
**Risks:**
- **RISK-001** The product owner meant every run to close (OQ-001). Mitigation: the branch is one condition in the `command.run` hook; dropping the `asked === ''` guard on it is a one-line change with its test.

### D-003: Open state is read from the engine, closing keeps the document
**Decision:** The markdown mod asks `$.ui.panes()` on each bare run whether its pane `picket-markdown` is open, as picket-status does (`src/mods/status/hooks/pane-actions.ts:125-127`); the mod types say `panes()` lists this plugin's own open panes. Closing calls `$.ui.close({ id: PANE })` and nothing else: the last document, history and offsets stay, so the next bare run reopens the same file through the existing `reopen`.
**Instead of:** a remembered "pane is open" flag set on open: it goes stale when the user closes the pane by other means (Escape, the dismiss control), and the next run would then close a pane that is already gone.

## Scope

**In:**
- `☰ <n>` and `M↓` drawn in `TONES.control` (`claudeShimmer`); `◀ <n> need you` stays `TONES.warning`.
- `/picket-markdown` with no argument closes its pane while the pane is open; its registered description and the unreleased alpha.6 `CHANGELOG.md` line say so.

**Out:**
- Any other band or pane change, the work pane's behaviour, the `☰` changelog wording.
- Release and QA items the design item deferred (its T-6.8 and OQ-002 on `$.command.run` queueing).

## Phase 1: Band buttons take the control tone

**Touch set:**
- `src/mods/status/hooks/band.ts`: `entryPieces` adds the colour
- `src/mods/status/hooks/band.test.ts`: T-6.1 expectations gain the colour
- `src/mods/status/hooks/index.test.tsx`: mounted band colour assertions
- `src/mods/status/hooks/index.tsx`: read only, `pieceText` passes colour
- `src/mods/shared/theme.ts`: read only, `TONES.control` is claudeShimmer
- `docs/design/picketai-design-system/project/README.md`: read only, clickable icons rule

**Changes:**
- `band.ts`: in `entryPieces`, the `☰ ${sessions}` piece becomes `{ text, press: 'work', color: TONES.control }` and the `M↓` piece `{ text: 'M↓', press: 'markdown', color: TONES.control }`. The `◀` piece is unchanged.
- `band.test.ts`: the test "with no agents and no work the line still draws" (lines 148 to 156) expects both press pieces with `color: 'claudeShimmer'`.
- `index.test.tsx`: the T-6.5 test (line 525) or a new test beside it asserts the mounted band's `Text` colours.

**Done when:**
- **T-1.1** In `band.test.ts`, `agentsLine([], null, NOW, ENTRY).right` filtered to press pieces equals `[{ text: '☰ 3', press: 'work', color: 'claudeShimmer' }, { text: 'M↓', press: 'markdown', color: 'claudeShimmer' }]`.
- **T-1.2** The existing assertion that the first right piece with `needYou: 2` equals `{ text: '◀ 2 need you', color: TONES.warning, bold: true }` (`band.test.ts:161`, on the base before the first edit) passes unedited; it is the pin that `◀` stays warning.
- **T-1.3** A status mod test mounts the band and finds `Text` `'☰ 3'` and `'M↓'` with `props.color` `'claudeShimmer'`, and `'◀ 1 need you'` with `props.color` `'warning'`.
- **T-1.4** The phase greps hold: `TONES.control` in `band.ts`, `claudeShimmer` or `TONES.control` in `band.test.ts`, `claudeShimmer` in the status `index.test.tsx`.
- **T-1.5** `npm run typecheck` passes, and `node scripts/test.mjs build mods` passes `claude plugin validate --strict` and `claude plugin test` for `dist/mods/status` (OQ-002).
- **T-1.6** [DEFERRED: QA, the release QA pass] In a live terminal, `☰ <n>` and `M↓` draw in the highlight orange (#FFB27A) and `◀ <n> need you` in the warning colour.

## Phase 2: /picket-markdown toggles its pane

**Touch set:**
- `src/mods/markdown/hooks/index.tsx`: bare-run branch, description text
- `src/mods/markdown/hooks/actions.ts`: `isPaneOpen` beside `reopen`
- `src/mods/markdown/hooks/index.test.tsx`: world gains panes and close
- `CHANGELOG.md`: alpha.6 lines for `M↓` and `/picket-markdown`
- `src/mods/status/hooks/pane-actions.ts`: read only, toggle pattern
- `src/mods/status/hooks/index.tsx`: read only, `M↓` runs bare command

**Changes:**
- `actions.ts`: `export async function isPaneOpen($: EngineInterface): Promise<boolean>`, true when `$.ui.panes()` lists a pane whose `id` is `PANE`.
- `index.tsx`: in the `command.run` hook, when `asked === ''` and `isPaneOpen($)` is true, call `$.ui.close({ id: PANE })` and reply `{ text: 'Markdown pane closed.' }`; otherwise the existing branches run unchanged. The registered description becomes `Show a markdown file read-only in the side pane, or hide the pane`.
- `index.test.tsx`: the `world` helper tracks open panes the way `paneWorld` does (`src/mods/status/hooks/index.test.tsx:286-330`): `ui.open` adds the id, `ui.panes` returns them, `ui.close` records and removes the id; it returns `closed`.
- `CHANGELOG.md`, `## 1.0.0-alpha.6`: in `### Added`, `M↓` reads `(which shows or hides the Markdown pane while picket-markdown is installed)`; in `### Changed, act on these`, the `/picket-markdown` line adds that run again with no argument while its pane is open, it closes the pane.

**Done when:**
- **T-2.1** A markdown mod test runs bare `/picket-markdown` three times: the first opens pane `picket-markdown`, the second records one close of `picket-markdown` and replies `Markdown pane closed.`, the third opens it again.
- **T-2.2** A markdown mod test runs `/picket-markdown work/w2/design.md`, then bare `/picket-markdown` (closes), then bare again: the last reply starts with `Reopened` and ends with `work/w2/design.md`.
- **T-2.3** A markdown mod test with the pane open runs `/picket-markdown work/w2/design.md`: no close is recorded and the pane is open (D-002).
- **T-2.4** The existing test "/picket-markdown with no argument and no document opens the empty pane naming the command (T-2.2)" passes with its assertions unedited.
- **T-2.5** The status test "the band counts sessions that need you outside this one, and its ☰ and M↓ open the panes (T-6.5)" passes unedited: `M↓` still runs `picket-markdown` with no argument.
- **T-2.6** The phase greps hold, including no `which opens the Markdown pane` left in `CHANGELOG.md`.
- **T-2.7** `npm run typecheck` passes, and `node scripts/test.mjs build mods` passes `claude plugin validate --strict` and `claude plugin test` for `dist/mods/markdown` (OQ-002).
- **T-2.8** [DEFERRED: QA, the release QA pass] In a live session, pressing `M↓` with the Markdown pane open closes it, and pressing it again reopens the last document.

## Open questions

- **OQ-001** The request says the command closes its pane when run while the pane is open, with no word on a path argument. D-002 toggles only the bare command. Owner: product owner. Fallback: D-002; a path argument always shows the path.
- **OQ-002** `claude plugin test` has refused to run from a subagent shell with "hooks modules are turned off in this process" (seen 2026-10-10). Owner: lead. Fallback: the lead runs `npm run test:status` and `npm run test:markdown` in their own session and attaches the output to the phase gate.

## Revision log
