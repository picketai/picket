---
kind: order
lane: order
title: Fix the alpha.5 upgrade path gaps
date: 2026-11-11
audience: developer
sources: work/20261111-fix-the-alpha-5-upgrade-path-gaps/request.md, work/20261111-fix-the-alpha-5-upgrade-path-gaps/preflight.txt, src/lib/verbs/init/init.mjs, src/lib/verbs/init/index.mts, src/lib/verbs/init/index.test.mts, src/lib/shared/install.mts, src/lib/shared/install.test.mts, src/lib/verbs/uninstall/index.mts, src/lib/verbs/uninstall/index.test.mts, src/lib/verbs/uninstall/uninstall.mts, src/lib/verbs/uninstall/uninstall.test.mts, src/lib/shared/styling/components/statusline/index.mts, src/lib/shared/context.mts, src/lib/util/process.mts, test/support/context.mts, test/cli/init.test.mjs, docs/how-to.md, CHANGELOG.md, CONTRIBUTING.md, claude plugin marketplace update --help (Claude Code 2.1.322), a probe of init on the base commit 4a2b7e2
phases:
  - n: 1
    files: [src/lib/verbs/init/init.mjs, src/lib/verbs/init/index.test.mts, CHANGELOG.md]
    greps:
      - path: src/lib/verbs/init/init.mjs
        pattern: '"marketplace",\s*"update"'
      - path: src/lib/verbs/init/index.test.mts
        pattern: 'claude plugin marketplace update picketai'
      - path: CHANGELOG.md
        pattern: '^## 1\.0\.0-alpha\.7 \(not released yet\)'
    tests: true
    drive: true
  - n: 2
    files: [src/lib/shared/install.mts, src/lib/shared/install.test.mts, src/lib/verbs/init/init.mjs, src/lib/verbs/init/index.test.mts, src/lib/verbs/uninstall/index.mts, src/lib/verbs/uninstall/index.test.mts, docs/how-to.md, CHANGELOG.md]
    greps:
      - path: src/lib/shared/install.mts
        pattern: 'export function holdsPicketStatusLine\b'
      - path: src/lib/shared/install.mts
        pattern: 'it holds an old Picket status line'
      - path: src/lib/verbs/init/init.mjs
        pattern: '\boldStatusLineNote\b'
      - path: src/lib/verbs/uninstall/index.mts
        pattern: '\boldStatusLineNote\b'
      - path: docs/how-to.md
        pattern: 'old Picket status line'
    tests: true
    drive: true
---
# Order: Fix the alpha.5 upgrade path gaps

## Problem

A Windows reinstall from alpha.5 to alpha.6 hit two gaps, both confirmed on the base commit by a probe that calls `init` from `src/lib/verbs/init/init.mjs`. First, `pluginStep` (`init.mjs:237`) runs `claude plugin install picket@picketai --scope project` once; with alpha.5's cached `picketai` marketplace it fails with `Plugin "picket" not found in marketplace "picketai"` and init reports `plugin: failed`. Second, `statusLineHolder` (`init.mjs:152`) treats the first settings file holding any `statusLine` as the holder and marks it ours only in the project's `settings.json`, so `picket statusline` in `~/.claude/settings.json` or in `.claude/settings.local.json` makes `init --statusline` write nothing and report `statusLine already set in <that file>` (probe output on base, both files). Init must never edit user settings or the local file, so the stale entry there is only named.

## Decisions

### D-001: One refresh and one retry for any failed plugin install
**Decision:** When the first `claude plugin install picket@picketai --scope project` throws, `pluginStep` runs `claude plugin marketplace update picketai` (the command the CLI's own error names; `marketplace update` takes no `--scope` in Claude Code 2.1.322) and then the install once more, whatever the first error said and whether the update succeeded. The step is `created` when either install succeeds, with detail `installed after claude plugin marketplace update picketai` when the retry did it, and `failed` only when the retry throws, with detail `<retry's last line>; run by hand: claude plugin marketplace update picketai, then claude plugin install picket@picketai --scope project`. This gives up the update's own error text when both it and the retry fail; the two commands to run by hand reproduce it.
**Instead of:** retry only when the error text matches `not found in marketplace`: the text is Claude Code's, not a contract, and it changes between versions, so a match would silently stop retrying.
**Risks:**
- **RISK-001** A real failure (no network) now costs two more `claude` runs before init reports it. Mitigation: the extra runs happen only on failure, and the detail names both commands.

### D-002 (r2): A Picket value in another settings file is not a holder
**Decision:** `statusLineHolder` skips a candidate other than the project's `.claude/settings.json` whose `statusLine` passes `isPicketStatusLine`, so with `--statusline` init writes the project value whenever no foreign value is held anywhere. One value is exempt: `DATA_FOLDER_STATUS_LINE` in `~/.claude/settings.json` is the line `picket style apply` sets on purpose, so there `statusLineHolder` returns `{ path: <user file>, ours: true }`, init writes no project value over it and adds no note. Separately, and with or without the flag, init adds one warning per file among `.claude/settings.local.json` and `~/.claude/settings.json` that holds an old Picket value (D-003). Init edits neither file. This gives up a working status line while the local file still holds the old value, since Claude Code ranks local settings above project settings; the warning names that file. The exemption gives up the project copy for a style user, who keeps the data folder line until `picket style remove`.
**Instead of:** remove the stale entry from `settings.local.json` too: the brief keeps init out of the user's personal files, and a silent edit there surprises more than a warning.

### D-003 (r2): One reader and one note text in shared/install.mts
**Decision:** `src/lib/shared/install.mts` gains `userSettingsPath(home)` (`<home>/.claude/settings.json`, the path `statusLineHolder` reads today), `holdsPicketStatusLine(path, file)` with `file` either `"local"` or `"user"` and no default (true when the file parses and its `statusLine` passes `isPicketStatusLine`, except that for `"user"` a `statusLine` equal to `DATA_FOLDER_STATUS_LINE` gives false; false when missing or not valid JSON) and `oldStatusLineNote(path)`, which returns exactly `remove the statusLine entry from <path>: it holds an old Picket status line`. Init puts the note in `report.warnings` (rendered `WARNING: …`); uninstall's `uninstallFrom` in `src/lib/verbs/uninstall/index.mts` appends it to `report.manual` from `context.home` read as `"user"`, so `runUninstall` and its deps stay as they are. The `file` argument is a required string rather than an options object because init passes paths one by one: a bare `.filter(holdsPicketStatusLine)` would hand the array index as `file`, and an index never equals `"user"`, so T-2.8 fails instead of the exemption silently vanishing. This gives up a home-aware `runUninstall`; only the action wrapper sees home.
**Instead of:** add `home` to `UninstallDeps`: every `runUninstall` call in `uninstall.test.mts` would change for one output line.

## Scope

**In:**
- init retries the plugin install after `claude plugin marketplace update picketai`
- init `--statusline` writes over a Picket value held in another settings file; init warns about that file with or without the flag
- uninstall's manual steps name a Picket value in user settings
- unit tests; the `docs/how-to.md` status line paragraph and a `CHANGELOG.md` entry, since the shipped behaviour they describe changes

**Out:**
- editing user settings or `settings.local.json`
- other upgrade paths, the DEP0190 shell warning, the global picket shadow warning
- `CLAUDE_CONFIG_DIR`: user settings stay at `<home>/.claude/settings.json`, as the existing holder and the style component read them

## Phase 1: Retry the plugin install after a marketplace refresh

**Touch set:**
- `src/lib/verbs/init/init.mjs`: `pluginStep` and `claudeStep` retry
- `src/lib/verbs/init/index.test.mts`: plugin step tests
- `CHANGELOG.md`: alpha.7 Fixed entry
- `src/lib/util/process.mts`: `ProgramRunner` signature, read only

**Changes:** `pluginStep` follows D-001: install, on a throw `claude plugin marketplace update picketai` (a throw there is swallowed), then the install again; the step's `name`, `path` and the `unchanged`/`skipped` branches stay as they are. `retireSteps` keeps one attempt. Tests use a recording `ProgramRunner` that throws on chosen calls. The existing test `a failing install names the one command to run by hand` changes its expected detail to the D-001 text. `CHANGELOG.md` gains `## 1.0.0-alpha.7 (not released yet)` above `## 1.0.0-alpha.6` with a `### Fixed` bullet; do not quote Claude Code's error text there, since it holds an em dash that `test/repo/dashes.test.mjs` rejects.

**Done when:**
- **T-1.1** With a runner that throws on the first install only, the calls are exactly `claude plugin install picket@picketai --scope project`, `claude plugin marketplace update picketai`, `claude plugin install picket@picketai --scope project`, and the plugin step is `created` with detail `installed after claude plugin marketplace update picketai`.
- **T-1.2** With a runner that throws on the first install and on the update, the retry still runs (three calls) and the plugin step is `created` with the same detail.
- **T-1.3** With a runner that throws on every call, three calls run and the plugin step is `failed` with detail `plugin not found; run by hand: claude plugin marketplace update picketai, then claude plugin install picket@picketai --scope project`.
- **T-1.4** The base tests `on settings with no marketplace, init writes the settings marketplace and runs only the picket install (T-6.1)` and `--no-install runs no command but still writes the marketplace, and a rerun leaves it unchanged` pass unedited, pinning one call on success and none without install.
- **T-1.5** Drive: after `npm run build`, `node dist/bin/picket.mjs init --root <scratch git repo>` with a fake `claude` script first on `PATH` that logs its arguments and exits 1 on its first `plugin install` prints a line starting `plugin: created` and ending `installed after claude plugin marketplace update picketai`, and the log holds the three calls of T-1.1 in order.
- **T-1.6** `npm test` passes, including `test/repo/names.test.mjs` and `test/repo/dashes.test.mjs` over the new changelog entry.
- **T-1.7** [DEFERRED: QA, the release QA pass] On a Windows machine that still holds alpha.5's cached `picketai` marketplace, `npx @picketai/picket@alpha init` in an alpha.5 project ends with `plugin: created` and no manual step.

## Phase 2: Write over and name an old Picket status line

**Touch set:**
- `src/lib/shared/install.mts`: reader, path and note
- `src/lib/shared/install.test.mts`: reader and note tests
- `src/lib/verbs/init/init.mjs`: holder skip and warnings
- `src/lib/verbs/init/index.test.mts`: user and local cases
- `src/lib/verbs/uninstall/index.mts`: manual note in `uninstallFrom`
- `src/lib/verbs/uninstall/index.test.mts`: manual note tests
- `docs/how-to.md`: status line paragraph, line 86
- `CHANGELOG.md`: second Fixed bullet
- `test/support/context.mts`: `fixedContext` home defaults to root, read only
- `test/cli/init.test.mjs`: foreign line pinning tests, read only

**Changes:** Add the three `install.mts` exports of D-003. In `init.mjs`, `statusLineHolder` skips the other-file Picket values and returns an `ours: true` holder for the user file's `DATA_FOLDER_STATUS_LINE` (D-002), and reads the user file through `userSettingsPath`; `init` returns `warnings` as the notes for the local file (`"local"`) then the user file (`"user"`), followed by `initWarnings(...)`. The notes are not gated by `PICKET_CHECKOUT`. In `uninstall/index.mts`, `uninstallFrom` appends `oldStatusLineNote(userSettingsPath(context.home))` to `report.manual` when `holdsPicketStatusLine(<that path>, "user")` is true, in every mode (dry run, declined, applied). Tests pass a `home` separate from the root, because `fixedContext` defaults `home` to the root. `docs/how-to.md:86` says init writes over an old Picket value in local or user settings and warns `remove the statusLine entry from <file>: it holds an old Picket status line`, and still leaves a status line of your own or the one `picket style apply` set in user settings. A second `### Fixed` bullet goes under the alpha.7 heading.

**Done when:**
- **T-2.1** With `{"statusLine":{"type":"command","command":"picket statusline"}}` in `<home>/.claude/settings.json` and no project `statusLine`, `init --statusline` writes `INSTALL.settings.statusLine` into `.claude/settings.json`, leaves the user file's bytes unchanged, and `warnings` equals `["remove the statusLine entry from <home>/.claude/settings.json: it holds an old Picket status line"]`.
- **T-2.2** With the same value in `.claude/settings.local.json` instead, `init --statusline` writes the project value, leaves the local file's bytes unchanged, and `warnings` holds the note naming the local file.
- **T-2.3** Without `--statusline`, both setups of T-2.1 and T-2.2 leave `statusLine` out of `.claude/settings.json` and give the same single warning.
- **T-2.4** A foreign value (`local-line`, `user-line`) still blocks the write with `statusLine already set in <file>` and gives no status line warning; the base tests in `test/cli/init.test.mjs` and `src/lib/verbs/init/index.test.mts` for those values pass unedited, and `npm test` passes.
- **T-2.5** `uninstallFrom` with `fixedContext(root, { home })`, where the home settings hold `picket statusline`, returns `manual` containing the note in a dry run and with `--yes`, and leaves the home file's bytes unchanged; with a clean home `manual` holds no note.
- **T-2.6** `holdsPicketStatusLine(path, "local")` is true for each of the three values in `isPicketStatusLine`'s list and false for a foreign value, a missing file and a file that is not valid JSON; `holdsPicketStatusLine(path, "user")` is false for `DATA_FOLDER_STATUS_LINE` and true for `INSTALL.settings.statusLine` and `LEGACY_STATUS_LINE`; `oldStatusLineNote("/h/.claude/settings.json")` equals the D-003 text.
- **T-2.7** Drive: in a scratch git repo with `HOME` set to a scratch folder whose `.claude/settings.json` holds `picket statusline`, `node dist/bin/picket.mjs init --root <repo> --no-install --statusline` prints `WARNING: remove the statusLine entry from <home>/.claude/settings.json: it holds an old Picket status line`, and `node dist/bin/picket.mjs uninstall --dry-run` run in the repo with `CLAUDE_PROJECT_DIR` unset prints that note under `Manual steps:`.
- **T-2.8** With `DATA_FOLDER_STATUS_LINE` in `<home>/.claude/settings.json` and no project or local `statusLine`, `init --statusline` leaves `statusLine` out of `.claude/settings.json`, leaves the user file's bytes unchanged, gives `warnings` with no status line note and a settings step detail without `statusLine already set`; `uninstallFrom` with that home returns `manual` without the note; with the same value in `.claude/settings.local.json` instead, `init --statusline` writes the project value and `warnings` holds the note naming the local file.

## Open questions

- **OQ-001** [resolved 2026-11-12: the user ruled "exempt"; see D-002 (r2), D-003 (r2), T-2.6 and T-2.8] `picket style apply` writes `DATA_FOLDER_STATUS_LINE` into `~/.claude/settings.json` today (`src/lib/shared/styling/components/statusline/index.mts:12`, `:56`) and `style remove` takes it out, yet the request counts every value `isPicketStatusLine` knows as old, so init and uninstall would tell a style user to remove a line style set on purpose. Should that value in user settings be left out of `holdsPicketStatusLine` for the user file? Owner: product owner. Fallback: the request's reading, every known value; no criterion tests the data folder value in user settings.

## Revision log

- 2026-11-12: D-002 (r2): the style data folder line in user settings is an ours holder, so init neither writes over it nor warns; user ruling on OQ-001.
- 2026-11-12: D-003 (r2): holdsPicketStatusLine takes a required "local" or "user" argument and gives false for the data folder line in "user"; OQ-001 ruling.
- 2026-11-12: Phase 2: T-2.6 covers the user exemption, new T-2.8 tests it in init and uninstall, and `npm test` moves into T-2.4.
