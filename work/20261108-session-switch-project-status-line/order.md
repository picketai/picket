---
kind: order
lane: order
title: Session switch and project status line
date: 2026-11-08
audience: developer
sources:
  - work/20261108-session-switch-project-status-line/request.md
  - artifacts/strategy/decisions/00002-session-list-merges-picket-status.md
  - artifacts/strategy/decisions/00003-mods-fold-picket-plugin.md
  - src/lib/shared/mod-switch.mts
  - src/lib/shared/config.mjs
  - src/lib/mods.mts
  - scripts/docs.mjs
  - src/mods/index.tsx
  - src/mods/status/hooks/index.tsx
  - src/mods/status/hooks/pane-actions.ts
  - src/mods/status/hooks/band.ts
  - src/mods/markdown/hooks/index.tsx
  - src/lib/hooks/emit/statusline/index.mts
  - src/lib/shared/install.mts
  - src/lib/verbs/init/init.mjs
  - src/lib/verbs/uninstall/uninstall.mts
  - src/lib/shared/styling/components/statusline/index.mts
  - Claude Code 2.1.319 binary (executeStatusLineCommand and the command hook runner)
phases:
  - n: 1
    files:
      - src/lib/shared/mod-switch.mts
      - src/lib/shared/mod-switch.test.mts
      - src/lib/shared/config.schema.json
      - test/kernel/config.test.mjs
      - src/lib/mods.mts
      - scripts/docs.mjs
      - test/repo/docs.test.mjs
      - test/repo/mods.test.mjs
      - docs/reference/mods.md
      - src/mods/shared/project-config.ts
      - src/mods/markdown/hooks/index.tsx
      - src/mods/types/index.d.ts
      - src/mods/status/hooks/index.tsx
      - src/mods/status/hooks/pane-actions.ts
      - src/mods/status/hooks/band.ts
      - src/mods/status/hooks/band.test.ts
      - src/mods/status/hooks/index.test.tsx
      - docs/how-to.md
      - CHANGELOG.md
    greps:
      - path: src/lib/shared/mod-switch.mts
        pattern: '"session"'
      - path: src/lib/shared/config.schema.json
        pattern: '"session"'
      - path: src/lib/mods.mts
        pattern: 'mods\.session'
      - path: src/mods/shared/project-config.ts
        pattern: '\.picket/config\.json'
      - path: src/mods/status/hooks/index.tsx
        pattern: 'modEnabled\('
      - path: src/mods/markdown/hooks/index.tsx
        pattern: '\bfs\.read\b'
        absent: true
      - path: docs/reference/mods.md
        pattern: 'mods\.session'
      - path: docs/how-to.md
        pattern: '"session": false'
      - path: CHANGELOG.md
        pattern: '"session": false'
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/install.mts
      - src/lib/shared/install.test.mts
      - src/lib/hooks/emit/statusline/index.mts
      - src/lib/hooks/emit/statusline/index.test.mts
      - src/lib/hooks.mts
      - docs/reference/hooks.md
      - src/lib/verbs/init/init.mjs
      - src/lib/verbs/init/index.test.mts
      - test/cli/init.test.mjs
      - src/lib/verbs/uninstall/uninstall.test.mts
      - src/lib/shared/styling/components/statusline/index.mts
      - src/lib/shared/styling/plan.test.mts
      - src/lib/shared/styling/removal.test.mts
      - docs/how-to.md
      - CHANGELOG.md
    greps:
      - path: src/lib/shared/install.mts
        pattern: 'CLAUDE_PROJECT_DIR'
      - path: src/lib/hooks/emit/statusline/index.mts
        pattern: 'CLAUDE_PLUGIN_DATA'
      - path: src/lib/shared/styling/components/statusline/index.mts
        pattern: 'INSTALL\.settings\.statusLine'
        absent: true
      - path: docs/how-to.md
        pattern: '\.picket/state/statusline\.mjs'
      - path: CHANGELOG.md
        pattern: '\.picket/state/statusline\.mjs'
    tests: true
    drive: true
---
# Order: Session switch and project status line

## Problem

A project cannot turn off the status mod's work pane: since SDR-00003 the mods ship inside one plugin, so the only off switch is `mods.markdown`, and the work pane always registers `/picket-session`, draws `☰ <n>` and lists the transcript folder every 30 seconds. The `init --statusline` value runs a copy in the plugin data folder through `$HOME`, which is wrong under `CLAUDE_CONFIG_DIR` and lives outside the project. The request makes the project copy conditional on Claude Code 2.1.319 giving the status line command an absolute project path; that premise was read from the 2.1.319 binary and holds (D-004). `style apply` writes the same data folder value into user settings, where a project path would point at nothing in projects without Picket, so that value must stay.

## Decisions

### D-001: The work pane switch lives inside the status mod [STRATEGIC REVIEW NEEDED]
**Decision:** `startStatus` reads `mods.session` once per session, the same way the Markdown mod reads its switch, and keeps the answer in a module-level flag. When it is false, the status mod registers no `picket-session` command, schedules no pane refresh clock (`PANE_REFRESH_MS`, 15,000 ms), never loads the Done list from the store and never lists the transcript folder (`listTranscriptIds`) or the sessions folder (`listSessions`). The band still draws the work line, the agents' pieces, `◀ <n> need you` (it comes from `picket list` rows, which are work item state, not session scanning) and `M↓`; only `☰ <n>` goes, carried as `BandEntry.sessions: null`. The composing module `src/mods/index.tsx` stays as it is: its `picket-session` and work pane handlers never fire when the command is not registered and the pane never opens. This gives up a band that always ends with `☰`, which SDR-00002 D-003 states (see OQ-001).
**Instead of:** gating in the composing module `src/mods/index.tsx`: it is copied to the built mods folder with only `./status` and `./markdown` imports, so it cannot reach `modEnabled` in `src/lib/shared/`, and the build copies one folder per `MODS` key, so the pane cannot become a mod of its own.
**Risks:**
- **RISK-001** A user with the switch off still sees `◀ <n> need you` and has no pane to open from it. Mitigation: the count is plain text with no press target; the how-to section says the count stays.

### D-002: An off switch names the part it turns off
**Decision:** `ModEntry.switch` in `src/lib/mods.mts` becomes `{ key: string; part: string | null } | null`. The status entry gets `{ key: "mods.session", part: "the work pane" }`, the Markdown entry `{ key: "mods.markdown", part: null }` (the whole mod). `switchCell` in `scripts/docs.mjs` prints `` `mods.markdown`: false `` for a whole-mod switch, as today, and `` `mods.session`: false turns off the work pane only `` for a part. `MOD_SWITCHES` in `src/lib/shared/mod-switch.mts` becomes `["session", "markdown"]`, in `MODS` order, so `config.mjs` accepts the new key with no other change. The repo test that ties `MODS` to `MOD_SWITCHES` compares keys only, since the status row's name is not its switch name.
**Instead of:** leaving the status switch `null` and mentioning `mods.session` in its summary: the generated page would print "none" in the Off switch column for a mod that has one, and the key test could not see the switch.

### D-003: One reader of the project config for both mods
**Decision:** A new `src/mods/shared/project-config.ts` exports one function that reads `<session root>/.picket/config.json` through `$.fs.read` and returns the parsed value, or `undefined` when the file is missing or not JSON. Both mods call `modEnabled(<that value>, "<name>")`, imported from `src/lib/shared/mod-switch.mts` as the Markdown mod does today. The Markdown mod's private `isSwitchedOn` reader and `CONFIG_FILE` constant go; its behaviour stays the same, pinned by its existing switch tests. The new file imports only `claude-code` types, because a file in `src/mods/shared/` lands beside the copied shared files and the build rewrites only the `../../shared/` and `../../../lib/shared/` import forms of the hooks folders.
**Instead of:** a second copy of the reader in the status mod: two copies of the path and the fall-back-to-on rule can drift, and touching the Markdown mod here is a move with no behaviour change.

### D-004: The init status line runs the project copy through CLAUDE_PROJECT_DIR
**Decision:** `INSTALL.settings.statusLine` becomes `{ type: "command", command: 'node "${CLAUDE_PROJECT_DIR}/.picket/state/statusline.mjs"' }`, built from `stateRel` and one `STATUSLINE_FILE` constant that moves to `src/lib/shared/install.mts`. Read from the 2.1.319 binary: `executeStatusLineCommand` runs the status line through the same runner as command hooks, and that runner sets `CLAUDE_PROJECT_DIR` in the child's environment to the session's `projectRoot`. A new session sets `projectRoot`, `originalCwd` and `cwd` to the one launch folder, and project settings are read from `<launch folder>/.claude/settings.json`, so whenever init's project value is loaded, `CLAUDE_PROJECT_DIR` is the folder that holds it. The command's working folder is the session's current folder, which follows a `cd` and falls back to the launch folder only when it no longer exists, so the path must not be relative. The braced form is required: under PowerShell the runner rewrites `${CLAUDE_PROJECT_DIR}` to `${env:CLAUDE_PROJECT_DIR}` and warns that a bare `$CLAUDE_PROJECT_DIR` reads as `$null`. On Windows outside PowerShell it passes the value with forward slashes. SessionStart hooks get the same variable from the same runner, so the copy that D-005 writes and the command that runs it name one folder. This gives up a value that works in a session started in a subfolder that has no settings file of its own, but project settings do not load there either.
**Instead of:** a relative `.picket/state/statusline.mjs` resolved against the working folder: the working folder is the session's current folder, so the line breaks after the session changes folder. A literal absolute path loses too, because `.claude/settings.json` is committed and each clone's path differs.
**Risks:**
- **RISK-002** A later Claude Code stops setting `CLAUDE_PROJECT_DIR` for the status line, which the status line page does not promise. Mitigation: D-005 keeps the data folder copy fresh, so going back is one settings edit, and `init` still recognises that value.

### D-005: The hook keeps both copies; init upgrades only on request
**Decision:** `emitStatusline` writes the plugin's `statusline.mjs` to `<ctx.root>/.picket/state/statusline.mjs` when `<ctx.root>/.picket/config.json` exists, with the same compare, temp-file and rename steps as `copyStatusline`, and it still writes the data folder copy from `CLAUDE_PLUGIN_DATA`. Each copy is tried on its own, so one failure does not skip the other. The data folder copy stays because `style apply` writes the data folder value into `~/.claude/settings.json`, and project settings written by earlier alpha.6 inits run it. `install.mts` names three values: the init value (D-004), `DATA_FOLDER_STATUS_LINE` (today's value, which `style apply` keeps writing) and `LEGACY_STATUS_LINE`. `isPicketStatusLine` is true for all three, so `uninstall` and the style revert treat each one as Picket's. With `--statusline`, `init` replaces a data folder value in the project `settings.json` with the init value and notes `replaced the data folder statusLine with the project copy`. It replaces the legacy value as it does today. Without the flag it removes the legacy value as today and leaves a data folder value alone, because that value keeps working.
**Instead of:** retiring the data folder copy: the user-level line from `style apply` runs in every project, including ones without `.picket/`, where a project path has no copy to run.
**Risks:**
- **RISK-003** The hook writes into this repository when a test passes `process.cwd()` as the root, because this repository holds `.picket/config.json`. Mitigation: every hook test passes a temp root (Phase 2 changes).

## Scope

**In:**
- The `mods.session` switch: config key, schema, generated mods page, the status mod's command, `☰` button and session scanning.
- The project copy of `statusline.mjs`, the `init --statusline` value, and `init`, `uninstall` and `style` recognising the old values.
- `docs/how-to.md`, the generated reference pages and the alpha.6 CHANGELOG.

**Out:**
- Turning off the whole status mod; the agents' pieces of the band; other mods' behaviour (the Markdown mod changes only its config reader, D-003).
- The plugin cache and data folder locations; `style apply`'s user-level value.
- An SDR amendment for SDR-00002 D-003 (OQ-001).

## Phase 1: The mods.session switch

**Touch set:**
- `src/lib/shared/mod-switch.mts`: add the session switch name
- `src/lib/shared/mod-switch.test.mts`: session switch cases
- `src/lib/shared/config.schema.json`: session boolean and description
- `test/kernel/config.test.mjs`: session switch load and warning
- `src/lib/mods.mts`: switch key and part shape
- `scripts/docs.mjs`: switch cell and page intro
- `test/repo/docs.test.mjs`: modsPage fixture shape, session row
- `test/repo/mods.test.mjs`: switch keys match config names
- `docs/reference/mods.md`: regenerated by npm run docs
- `src/mods/shared/project-config.ts`: new shared config reader
- `src/mods/markdown/hooks/index.tsx`: use the shared reader
- `src/mods/types/index.d.ts`: BandEntry sessions may be null
- `src/mods/status/hooks/index.tsx`: read switch, skip pane wiring
- `src/mods/status/hooks/pane-actions.ts`: skip Done load and transcripts
- `src/mods/status/hooks/band.ts`: no ☰ when sessions null
- `src/mods/status/hooks/band.test.ts`: entry pieces without ☰
- `src/mods/status/hooks/index.test.tsx`: switched-off session tests
- `docs/how-to.md`: work pane switch section
- `CHANGELOG.md`: alpha.6 switch note

**Changes:**
- Config side (D-002): add `"session"` to `MOD_SWITCHES`, add `session: { type: boolean }` to the schema's `mods` properties and name it in the description, change `ModEntry.switch` and both `MODS` entries, and print the part in `switchCell`. Reword `MODS_INTRO` so a switch turns off its mod or only the part its row names. Regenerate the page with `npm run docs`; the markdown row must stay byte-identical.
- Mod side (D-001, D-003): add the shared reader and move the Markdown mod onto it. `startStatus` reads `mods.session` before it starts the band. When the switch is off, `startBand` and `refreshBand` skip `loadDone` and `listTranscriptIds`, `readBandEntry` returns `sessions: null`, `entryPieces` drops the `☰` part, and `startStatus` skips the `picket-session` registration and the `PANE_REFRESH_MS` clock. Everything else in `startStatus` runs as today. `BandEntry.sessions` becomes `number | null` in the merged contract.
- Tests: the status mod's test world has no `fs.read` handler, so its existing tests run with the switch on. The new tests answer the config path the way `src/mods/markdown/hooks/index.test.tsx` does (`CONFIG`, `modelled`).
- Docs: add a work pane section after "The Markdown pane" in `docs/how-to.md`, with the JSON line `{ "version": 1, "mods": { "session": false } }`. Say what goes (`/picket-session`, `☰ <n>`, session scanning) and what stays (the band, its agents, `◀ <n> need you`, `M↓`). Add the switch to the alpha.6 CHANGELOG next to the Markdown switch.

**Done when:**
- **T-1.1** With `.picket/config.json` holding `{"version":1,"mods":{"session":false}}`, a started session registers no `picket-session` command, schedules no 15,000 ms clock and makes no `fs.list` call under the Claude config folder (`index.test.tsx`).
- **T-1.2** In that session the band's right side has no `☰` piece: with `needYou` 2 and the Markdown command present it reads `◀ 2 need you · M↓`, and the work line and the agent pieces equal those of the same session with the switch on (`index.test.tsx`; `band.test.ts` for `entryPieces` with `sessions: null`).
- **T-1.3** With no config file the status mod behaves as before: every status mod test that exists on the base passes with only the `BandEntry` type touched (the before-image is those test files at the base commit). One new test shows `"session": true` registering the command and drawing `☰ <n>`.
- **T-1.4** The Markdown mod's existing switch tests in `src/mods/markdown/hooks/index.test.tsx` pass unchanged after its reader moves to `src/mods/shared/project-config.ts`.
- **T-1.5** `loadConfig` keeps `mods: { session: false }` with no warning and drops `session: "no"` with the warning `mods.session must be true or false; the mod stays on`; `modEnabled({ mods: { session: false } }, "session")` is false and leaves `"markdown"` on (`test/kernel/config.test.mjs`, `mod-switch.test.mts`).
- **T-1.6** `docs/reference/mods.md`, written by `npm run docs`, shows the status row's switch as `` `mods.session`: false turns off the work pane only `` and the markdown row unchanged; `test/repo/docs.test.mjs` and `test/repo/mods.test.mjs` pass.
- **T-1.7** After `npm run build`, `claude plugin validate --strict dist` and `claude plugin test dist` both exit 0 (OQ-002 names the fallback).

## Phase 2: Project copy of the status line

**Touch set:**
- `src/lib/shared/install.mts`: three values, file name constant
- `src/lib/shared/install.test.mts`: values and recognition
- `src/lib/hooks/emit/statusline/index.mts`: write the project copy too
- `src/lib/hooks/emit/statusline/index.test.mts`: project copy, temp roots
- `src/lib/hooks.mts`: emit.statusline summary
- `docs/reference/hooks.md`: regenerated by npm run docs
- `src/lib/verbs/init/init.mjs`: upgrade a data folder value
- `src/lib/verbs/init/index.test.mts`: init status line cases
- `test/cli/init.test.mjs`: CLI status line value
- `src/lib/verbs/uninstall/uninstall.test.mts`: remove all three values
- `src/lib/shared/styling/components/statusline/index.mts`: keep the data folder value
- `src/lib/shared/styling/plan.test.mts`: style value constant
- `src/lib/shared/styling/removal.test.mts`: style value constant
- `docs/how-to.md`: status line section
- `CHANGELOG.md`: alpha.6 status line bullet

**Changes:**
- `install.mts` (D-004, D-005): the init value, `DATA_FOLDER_STATUS_LINE` holding today's command unchanged, `LEGACY_STATUS_LINE`, `STATUSLINE_FILE`, and `isPicketStatusLine` over all three.
- The style component and its two tests use `DATA_FOLDER_STATUS_LINE`, so `style apply` writes exactly what it writes today.
- `emitStatusline` (D-005): the project copy goes under `ctx.root` and only when its `.picket/config.json` exists. The data folder copy stays. Each copy sits in its own try. Update the `emit.statusline` summary in `src/lib/hooks.mts` and run `npm run docs`. Every hook test builds its context on a temp root made with `withProject`, never `process.cwd()`.
- `statusLineChange` in `init.mjs` (D-005): with `--statusline`, a project `settings.json` holding `DATA_FOLDER_STATUS_LINE` is replaced with the init value, with the note quoted in D-005. The legacy branch and the "already set in" branch stay as they are.
- Docs: in "The status line" in `docs/how-to.md`, give the new value and say the plugin copies `statusline.mjs` into the project's git-ignored `.picket/state/` at each session start. Drop the `CLAUDE_CONFIG_DIR` edit advice for the init value, and say `init --statusline` replaces a data folder value from an earlier alpha.6. Rewrite the alpha.6 CHANGELOG status line bullet to match.

**Done when:**
- **T-2.1** When `<root>/.picket/config.json` exists, `emitStatusline` writes `<root>/.picket/state/statusline.mjs` with the bundle's bytes and the data folder copy too. Run again on identical copies, it leaves both mtimes unchanged. With no `.picket/config.json`, it creates no `.picket/` folder under the root and still writes the data folder copy (`index.test.mts`, temp roots).
- **T-2.2** `INSTALL.settings.statusLine` deep-equals `{ type: "command", command: 'node "${CLAUDE_PROJECT_DIR}/.picket/state/statusline.mjs"' }`. `isPicketStatusLine` is true for it, for `DATA_FOLDER_STATUS_LINE` and for `{ type: "command", command: "picket statusline" }`, and false for `{ type: "command", command: "local-line" }` (`install.test.mts`).
- **T-2.3** `init --statusline` writes the init value into a fresh project. Over a data folder value in the project `settings.json`, it writes the init value with the note `replaced the data folder statusLine with the project copy`. A rerun reports settings `unchanged` and the file holds no absolute path (`index.test.mts`, `test/cli/init.test.mjs`).
- **T-2.4** Without `--statusline`, `init` leaves a data folder value in place with no note and still removes the legacy value with `removed the legacy statusLine "picket statusline"` (`index.test.mts`).
- **T-2.5** `uninstall` removes each of the three values from `.claude/settings.json` and keeps `{ type: "command", command: "local-line" }` (`uninstall.test.mts`).
- **T-2.6** `style apply` still writes `node "$HOME/.claude/plugins/data/picket-picketai/statusline.mjs"`: `src/lib/shared/styling/components/theme/index.test.mts`, untouched from the base, passes.
- **T-2.7** After `npm run build`, with temp folders P (holding `.picket/config.json` as `{"version":1}`) and D, running `node dist/hooks/emit.statusline.mjs` with `CLAUDE_PROJECT_DIR=P` and `CLAUDE_PLUGIN_DATA=D`, fed a SessionStart payload, creates `P/.picket/state/statusline.mjs` and `D/statusline.mjs`. Then `CLAUDE_PROJECT_DIR=P bash -c 'node "${CLAUDE_PROJECT_DIR}/.picket/state/statusline.mjs"' < src/lib/verbs/statusline/statusline-input.test.json` exits 0 and prints at least one non-empty line.
- **T-2.8** [DEFERRED: QA, the alpha.6 release QA pass] In a live Claude Code 2.1.319 session started at a project root after `init --statusline`, the status line draws from `.picket/state/statusline.mjs`, and keeps drawing after the Bash tool runs `cd` into a subfolder.

## Open questions

- **OQ-001** SDR-00002 D-003 (Ratified) says the agents line "always ends with `☰ <sessions>`"; D-001 hides `☰` when `mods.session` is false. Does this need an SDR amendment like SDR-00003's? Owner: product owner. Fallback: build as requested; the item's close names D-001 for `picket:consulting`.
- **OQ-002** `claude plugin test` can refuse in a subagent shell with "hooks modules are turned off in this process". Owner: lead. Fallback: the developer records the refusal on the block, `validate --strict` still runs, and the lead runs `npm run test:mods` in the main session before the phase 1 gate.

## Revision log
- 2026-11-08: T-2.7: "prints one non-empty line" now "at least one"; the bundle prints 3 rows; user's go-ahead for approved phase 2
