---
kind: order
lane: order
title: Picket updates from inside the session
date: 2026-11-10
audience: developer
sources:
  - work/20261110-picket-updates-from-inside-the-session/request.md
  - .claude/MEMORY.md
  - artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md
  - src/lib/shared/install.mts
  - src/lib/verbs/init/init.mjs
  - src/lib/verbs/uninstall/uninstall.mts
  - src/lib/shared/config.mjs
  - src/lib/shared/config.schema.json
  - src/lib/shared/paths.mts
  - src/lib/hooks/inject/state/index.mts
  - src/lib/hooks/output.mts
  - src/lib/cli/main.mts
  - docs/how-to.md
  - Claude Code 2.1.322 binary (/home/vlad/.local/share/claude/versions/2.1.322), read with grep -a
phases:
  - n: 1
    files:
      - src/lib/shared/install.mts
      - src/lib/verbs/init/init.mjs
      - src/lib/verbs/init/index.test.mts
      - src/lib/verbs/uninstall/uninstall.mts
      - src/lib/verbs/uninstall/uninstall.test.mts
    greps:
      - path: src/lib/shared/install.mts
        pattern: "autoUpdate: true"
      - path: src/lib/verbs/uninstall/uninstall.mts
        pattern: "INSTALL\\.marketplace\\.source"
    tests: true
    drive: true
  - n: 2
    files:
      - src/lib/shared/picket-version.mts
      - src/lib/shared/picket-version.test.mts
      - src/lib/cli/main.mts
      - src/lib/shared/config.mjs
      - src/lib/shared/config.schema.json
      - test/kernel/config.test.mjs
      - src/lib/verbs/init/init.mjs
      - src/lib/verbs/init/index.test.mts
    greps:
      - path: src/lib/shared/config.mjs
        pattern: "\"picket_version\""
      - path: src/lib/shared/config.schema.json
        pattern: "\"picket_version\""
      - path: src/lib/verbs/init/init.mjs
        pattern: "picket_version"
      - path: src/lib/cli/main.mts
        pattern: "picketVersion\\("
    tests: true
    drive: true
  - n: 3
    files:
      - src/lib/shared/picket-version.mts
      - src/lib/shared/picket-version.test.mts
      - src/lib/shared/paths.mts
      - src/lib/hooks/inject/state/index.mts
      - src/lib/hooks/inject/state/index.test.mts
      - src/lib/hooks.mts
      - docs/reference/hooks.md
      - docs/how-to.md
    greps:
      - path: src/lib/hooks/inject/state/index.mts
        pattern: "Picket updated to "
      - path: src/lib/hooks/inject/state/index.mts
        pattern: "to refresh this project\\."
      - path: src/lib/shared/paths.mts
        pattern: "update-notice\\.json"
      - path: docs/how-to.md
        pattern: "Restart Claude Code to load the new version"
        absent: true
      - path: docs/how-to.md
        pattern: "/reload-plugins"
      - path: docs/how-to.md
        pattern: "/plugin update picket@picketai"
    tests: true
    drive: true
---
# Order: Picket updates from inside the session

## Problem

Updating Picket today takes a `/plugin update`, a restart of Claude Code and `npx @picketai/picket@alpha init` in every project (`docs/how-to.md:353-361`). The request keeps the inline `settings` marketplace and the one-time npx install, but wants the plugin to update itself and the session to tell the user when the project needs `picket init`. Binding constraints: nothing writes under the plugin root (SDR 00001 D-005); hooks stay one Node process each under 200 ms cold (SDR 00001 D-004); the hook only tells, it never rewrites project files.

## Decisions

### D-001: Init's marketplace entry carries autoUpdate true, and an explicit false is kept
**Decision:** `INSTALL.marketplace` in `src/lib/shared/install.mts` gains `autoUpdate: true` beside `source`, so `picket init` writes `extraKnownMarketplaces.picketai = { source: <unchanged>, autoUpdate: true }`. The required check was done on the Claude Code 2.1.322 binary with `grep -a`. The settings schema describes the entry field `autoUpdate` as "Whether to automatically update this marketplace and its installed plugins on startup". The startup pass collects every known marketplace for which `y4e(name, entry, IGe(name, declared))` is true. `IGe` returns the settings declaration's `autoUpdate` and restricts that to user, `--settings` and managed settings only for `anthropic-plugin-directory`, so a project settings entry for `picketai` counts. A `settings` source refresh is a no-op ("Skipping refresh for settings-sourced marketplace … no upstream"). An npm plugin update then re-resolves its recorded version spec against the registry ("is already at the latest version (tracking alpha)"). Claude Code then shows "Plugins changed. Run /reload-plugins to activate." So the notice keeps the request's wording, and `/plugin update picket@picketai` moves to the docs as the manual path. When the project's entry already has picketai's source and `autoUpdate: false`, init leaves it as it is and says so: switching updates off is the team's choice.
**Instead of:** leaving autoUpdate out and having the notice name `/plugin update picket@picketai`: the binary shows the field is honoured on a project-declared, non-official marketplace, so the user would run a step Claude Code already does.
**Risks:**
- **RISK-001** The check reads the code but has not watched a live update. Mitigation: T-1.6 is deferred to the release QA pass, and the docs keep `/plugin update picket@picketai` as the manual path.
- **RISK-002** The background pass first waits `Math.floor(Math.random()*oe)` ms with `oe=600000`, so an update lands up to 10 minutes after a session starts, and it is skipped when Claude Code's auto-updater is turned off. Mitigation: the docs say the update arrives in the background and name the manual command.

### D-002: Uninstall recognises init's marketplace entry by its source
**Decision:** `holdsInitMarketplace` in `src/lib/verbs/uninstall/uninstall.mts` compares only `entry.source` with `INSTALL.marketplace.source`, so entries from before this change (no `autoUpdate`) and entries the team set to `false` still count as init's. Uninstall removes the settings entry without running `claude plugin marketplace remove`.
**Instead of:** keeping the whole-entry deep equality: every project initialised before this change would fall into the "older marketplace" branch and get a `claude plugin marketplace remove` command it does not need.

### D-003: Init records the running version as `picket_version` in `.picket/config.json`
**Decision:** a new module `src/lib/shared/picket-version.mts` exports `picketVersion(): string`, which reads `version` from the plugin manifest at `pluginManifestPath()`. `installedVersion()` in `src/lib/cli/main.mts` moves to it so one function reads the version. The config loader learns the key `picket_version` (string, default `null`), and init's config step writes it on every run: it creates `{ "version": 1, "picket_version": "<running>" }`, or sets the key in an existing file, keeping other keys, their order and the file's line endings. Malformed JSON fails the step and leaves the file as it is, as the settings step does.
**Instead of:** a version file under `.picket/state/`: that folder is gitignored, so every fresh clone would look out of date. The recorded version describes the tracked `CLAUDE.md` block and settings that init wrote, so it belongs in the tracked config.
**Risks:**
- **RISK-003** Teammates on different versions keep changing a tracked file. Mitigation: D-004 tells only when the running version is newer, so a teammate on an older plugin is not asked to run init.

### D-004: The notice rides `inject.state`, once per running version
**Decision:** `injectState` in `src/lib/hooks/inject/state/index.mts` adds one check. It runs when the project holds `.picket/config.json` and either no `picket_version` is recorded or the running version is newer by SemVer precedence (`isNewerVersion(running, recorded)` in `picket-version.mts`). If `.picket/state/update-notice.json` does not already hold the running version, the hook returns the request's exact line as `systemMessage` ("Warning message shown to the user" in the 2.1.322 hook output schema): "Picket updated to X; run `picket init` to refresh this project.", with X the running version. It adds the same line to the lead's context and writes `{ "version": "<running>" }` to that state file. It reads two small JSON files and writes one, and never touches a tracked file.
**Instead of:** a new `inject.update` SessionStart hook: that adds a Node process to every session start and a new `HOOKS` entry with its hooks.json and test couplings, for a check that needs only the root and config `inject.state` already has. Telling on any version difference lost too: an older plugin would tell the user to run init and roll the tracked block back.
**Risks:**
- **RISK-004** A user who ignores the notice hears nothing more until the next version. Mitigation: the docs' update section names `picket init` as the step after every update.

## Scope

**In:**
- `autoUpdate: true` on the marketplace entry init writes, with the binary check recorded in D-001
- uninstall still recognising init's entry
- `picket_version` written by init and read by the config loader
- the once-per-version session-start notice
- the `## Updating` section of `docs/how-to.md`, and the regenerated `docs/reference/hooks.md`
- unit tests for each

**Out:**
- a hosted marketplace repository
- any change to the first install (`npx @picketai/picket@alpha init` once per project)
- a hook that rewrites project files
- the `latest` dist-tag
- a global `picket`

## Phase 1: Marketplace entry with autoUpdate

**Touch set:**
- `src/lib/shared/install.mts`: `INSTALL.marketplace` gains autoUpdate
- `src/lib/verbs/init/init.mjs`: marketplace step keeps explicit false
- `src/lib/verbs/init/index.test.mts`: marketplace step cases
- `src/lib/verbs/uninstall/uninstall.mts`: recognise entry by source
- `src/lib/verbs/uninstall/uninstall.test.mts`: old and new entry cases

**Changes:** add `autoUpdate: true` to `INSTALL.marketplace` next to `source`. In `marketplaceStep`, three cases. An entry whose source equals `INSTALL.marketplace.source` and whose `autoUpdate` is `false` stays as it is, result `unchanged`, with a detail saying autoUpdate is off in this project. An entry with the same source and no `autoUpdate` gets the new entry, result `updated`, with a detail naming autoUpdate rather than "replaced the old source". A different source keeps today's `replaced the old source …` detail. In uninstall, `holdsInitMarketplace` compares `entry.source` with `INSTALL.marketplace.source` (D-002).

**Done when:**
- **T-1.1** On settings with no marketplace, `init` writes `extraKnownMarketplaces.picketai` deep-equal to `{ source: INSTALL.marketplace.source, autoUpdate: true }` and reports `marketplace created`; a rerun reports `marketplace unchanged`.
- **T-1.2** On settings holding picketai's source with no `autoUpdate`, `init` reports `marketplace updated`, writes `autoUpdate: true`, and the detail does not contain `replaced the old source`.
- **T-1.3** On settings holding picketai's source with `autoUpdate: false`, `init` reports `marketplace unchanged` and the file still holds `false`.
- **T-1.4** Uninstall's plan for a settings entry with picketai's source and no `autoUpdate`, and for one with `autoUpdate: true`, lists `extraKnownMarketplaces.picketai` and contains no `marketplace remove` command; an entry with another source still yields `claude plugin marketplace remove picketai --scope project`.
- **T-1.5** Drive: after `npm run build`, `picket init --root <scratch git repo> --no-install` prints `marketplace: created`, and the scratch `.claude/settings.json` holds `"autoUpdate": true` under `extraKnownMarketplaces.picketai`.
- **T-1.6** [DEFERRED: QA, the release QA pass of the next alpha] In a project initialised by this build, publishing a newer `alpha` makes Claude Code install it in the background, without `/plugin update`, and show "Plugins changed. Run /reload-plugins to activate."

## Phase 2: Init records the Picket version

**Touch set:**
- `src/lib/shared/picket-version.mts`: new, reads the manifest version
- `src/lib/shared/picket-version.test.mts`: new, version read test
- `src/lib/cli/main.mts`: `installedVersion` uses the module
- `src/lib/shared/config.mjs`: known key, default, loader field
- `src/lib/shared/config.schema.json`: `picket_version` property
- `test/kernel/config.test.mjs`: full-shape and new key cases
- `src/lib/verbs/init/init.mjs`: config step writes the version
- `src/lib/verbs/init/index.test.mts`: config step cases

**Changes:** create `picket-version.mts` with `picketVersion()` (reads `version` from `pluginManifestPath()`), and replace `installedVersion()` in `main.mts` with it. In `config.mjs`, add `picket_version` to `KNOWN_KEYS` and `CONFIG_DEFAULTS` (`null`), and return `picket_version` from `loadConfig`: the string when it is a non-empty string, otherwise `null`, with a warning when present and not a string. In the schema, add `picket_version` with `"type": ["string", "null"]` and `"default": null` so the existing schema-matches-defaults test holds. Rewrite `configStep` per D-003; the detail on `updated` names the recorded version.

**Done when:**
- **T-2.1** `init` on a project with no config creates `.picket/config.json` parsing to `{ version: 1, picket_version: <version in src/.claude-plugin/plugin.json> }` and reports `config created`.
- **T-2.2** On a config holding `security_paths`, `sources` and `picket_version: "0.0.1"`, written with CRLF line endings, `init` reports `config updated`. The file keeps the other keys in their order and its CRLF endings, and holds the running version. A rerun reports `config unchanged`.
- **T-2.3** On a config that is not valid JSON, the config step reports `failed` and the file's bytes are unchanged.
- **T-2.4** `loadConfig` returns `picket_version` as the recorded string, `null` when absent, and `null` with a warning when it is a number; a config holding `picket_version` gives no `unknown key` warning.
- **T-2.5** `picketVersion()` equals the `version` field of `src/.claude-plugin/plugin.json`, and drive: `picket --version` prints that same value.
- **T-2.6** Drive: after `npm run build`, `picket init --root <scratch git repo> --no-install` run twice prints `config: created`, then `config: unchanged`, and the scratch config holds `"picket_version"`.

## Phase 3: Session-start notice and the update docs

**Touch set:**
- `src/lib/shared/picket-version.mts`: add `isNewerVersion`
- `src/lib/shared/picket-version.test.mts`: precedence cases
- `src/lib/shared/paths.mts`: `STATE_FILES.updateNotice` entry
- `src/lib/hooks/inject/state/index.mts`: notice check and output
- `src/lib/hooks/inject/state/index.test.mts`: notice cases
- `src/lib/hooks.mts`: `inject.state` summary names the notice
- `docs/reference/hooks.md`: regenerated from the summary
- `docs/how-to.md`: rewrite `## Updating`

**Changes:** add `isNewerVersion(candidate, recorded)` using SemVer 2.0 precedence for `MAJOR.MINOR.PATCH[-pre]`, with numeric prerelease identifiers compared as numbers; a recorded value that does not parse counts as older. Add `updateNotice: "update-notice.json"` to `STATE_FILES`. In `inject.state`, compute the notice per D-004 in its own `try`, so a failure there never drops the other parts. Return `context("SessionStart", text, notice)` with the line also as a part headed `# Picket update`. Update the `inject.state` summary in `HOOKS` and regenerate `docs/reference/hooks.md` with `npm run docs`. Rewrite `## Updating` so a regular update reads: Claude Code updates the plugin in the background, run `/reload-plugins` or start a new session, then run `picket init` in the session when Picket says so. Keep `/plugin update picket@picketai` as the manual path, and keep the paragraph for users coming from 1.0.0-alpha.5 or earlier and the alpha.4 rename paragraph.

**Done when:**
- **T-3.1** `isNewerVersion` returns true for (`1.0.0-alpha.10`, `1.0.0-alpha.9`), (`1.0.0`, `1.0.0-alpha.5`) and (`1.0.0-alpha.5`, `not-a-version`), and false for (`1.0.0-alpha.5`, `1.0.0-alpha.5`) and (`1.0.0-alpha.5`, `1.0.0-alpha.6`).
- **T-3.2** With a config recording `picket_version: "0.0.1"`, `injectState` returns `systemMessage` equal to "Picket updated to X; run `picket init` to refresh this project." with X the running version, and `.picket/state/update-notice.json` then holds that version; a second call returns no `systemMessage`.
- **T-3.3** With a config recording no `picket_version`, the first call returns the same `systemMessage`.
- **T-3.4** With a config recording the running version, or `99.0.0`, and with no `.picket/config.json` at all, `injectState` returns no `systemMessage` and writes no `update-notice.json`.
- **T-3.5** `docs/how-to.md` no longer holds "Restart Claude Code to load the new version", and its `## Updating` section names `/reload-plugins`, `picket init` and `/plugin update picket@picketai`.
- **T-3.6** `npm test` passes, the docs staleness test on `docs/reference/hooks.md` and the 200 ms hook budget included.
- **T-3.7** Drive: after `npm run build`, piping `{"hook_event_name":"SessionStart","cwd":"<scratch>"}` into `node dist/hooks/inject.state.mjs` with `CLAUDE_PROJECT_DIR=<scratch>` and a scratch config recording `0.0.1` prints JSON whose `systemMessage` names the running version; a second run prints none.

## Open questions

- **OQ-001** Does `/reload-plugins` fire SessionStart hooks, and does the Bash tool's PATH then point at the new plugin's `bin`? The binary holds a `"reload"` literal, but its meaning was not traced. Owner: QA at the release QA pass. Fallback: the notice appears at the next session start, where the PATH holds the new plugin; the docs tell the user to run `picket init` after `/reload-plugins` either way.

## Revision log
