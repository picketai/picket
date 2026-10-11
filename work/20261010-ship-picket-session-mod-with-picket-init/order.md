---
kind: order
lane: order
title: Ship picket-session mod with picket init
date: 2026-10-10
audience: developer
sources: [request.md, ~/.claude/dev-mods/de97e3bc-8880-46d8-ace6-e34748490980/picket-session, work/20261010-ship-picket-status-mod-with-picket-init/order.md, commits 29260b7 and 37f2a44, core/lib/init.mjs, .claude-plugin/marketplace.json, package.json, .gitignore, .github/scripts/release.mjs, scripts/test.mjs, status/.claude-plugin/plugin.json, test/kernel/plugin-layout.test.mjs, test/kernel/init.test.mjs, test/release.test.mjs, test/names-picket.test.mjs, CONTRIBUTING.md]
phases:
  - n: 1
    files: [session/.claude-plugin/plugin.json, session/hooks/hooks.json, session/hooks/register.tsx, session/hooks/format.ts, session/hooks/format.test.ts, session/hooks/sessions.ts, session/hooks/sessions.test.ts, session/types/index.d.ts, .claude-plugin/marketplace.json, package.json, .gitignore, .github/scripts/release.mjs, test/kernel/plugin-layout.test.mjs, test/release.test.mjs]
    greps:
      - path: .claude-plugin/marketplace.json
        pattern: '"source": "\./session"'
      - path: session/.claude-plugin/plugin.json
        pattern: '"name": "picket-session"'
      - path: package.json
        pattern: '"test:session": "claude plugin validate --strict session && claude plugin test session"'
      - path: .github/scripts/release.mjs
        pattern: 'session/\.claude-plugin/plugin\.json'
      - path: .gitignore
        pattern: '^session/tsconfig\.json\r?$'
    tests: true
    drive: true
  - n: 2
    files: [core/lib/init.mjs, test/kernel/init.test.mjs]
    greps:
      - path: core/lib/init.mjs
        pattern: 'picket-session@'
      - path: test/kernel/init.test.mjs
        pattern: 'picket-session@picketai'
    tests: true
    drive: true
---
# Order: Ship picket-session mod with picket init

## Problem

The picket-session mod (a docked sidebar: the project's sessions in the top third with switch, rename, archive and delete; one card per agent with a Picket head sprite, phase progress, context and time in the bottom two thirds) lives only in a session-scoped dev-mods folder. It must ship in `@picketai/picket` and be installed by `picket init`, exactly as picket-status now ships. The binding constraints are the same as for picket-status: the function-hooks API is early access (built against Claude Code 2.1.296), the core command hooks must keep working whatever happens to a mod, `npm test` and the budgets stay green, and no code comments are added.

Verified premises. `claude plugin validate --strict` passes on the dev copy today: its manifest already carries `author`, and it lists state keys `picket-session.session`, `.view`, `.sessions`, env reads `CLAUDE_CONFIG_DIR`, `HOME`, `USERPROFILE`, and `$.process.run` via `deleteSession` and `readTitleRecords`. The dev copy is still changing (scrolling of each half through `ui.scroll` landed after the first draft); re-checked after that change, `validate --strict` still passes, the two test files hold 11 and 7 `test(` calls, and none of the seven source files has a comment line. `status/` is unreleased: tag `v1.0.0-alpha.1` predates commits 29260b7 and 37f2a44, so status and session reach users in the same release. `claude plugin test` cannot run in this environment right now: on both `status` and a clean copy of the mod it prints "hooks modules are turned off in this process: the rollout switch was saved off" and exits 1 (OQ-001).

## Decisions

### D-001: A third plugin, picket-session, in session/
**Decision:** Ship the mod as its own plugin at `session/` (plugin name `picket-session`, id `picket-session@picketai`), listed in `.claude-plugin/marketplace.json` after `picket-status`. The folder follows the status precedent: the plugin name without the `picket-` prefix, beside `status/`. The plugin name must stay `picket-session` because the code keys on it in four places (`atom({ plugin: 'picket-session', ... })`, `PluginState['picket-session']`, the pane id and the `/picket-session` command), so the code ships unchanged. A separate plugin keeps an early-access module failure away from both the core hooks and the status band; the user disables one plugin. It gives up a single install: a fourth init step and a third manifest to keep in step.
**Instead of:** adding `./register.tsx` as a second module of the `status/` plugin: one fewer plugin, but the state key would change to `picket-status`, a user could not keep the band and drop the sidebar, and one mod's load failure would take the other down.
**Risks:**
- **RISK-001** The mod writes and deletes the user's own transcripts. Rename of a closed session appends one `agent-name` record to `<config>/projects/<slug>/<id>.jsonl`; delete runs `node -e unlinkSync` on that path after a confirm row, only for a UUID-shaped id that is neither the current nor a live session. "Live" comes from `<config>/sessions/*.json` read every 15 s, so a closed session resumed in another window within that 15 s window can be deleted. Nothing is touched outside `<config>/projects/<slug>/`. Mitigation: the confirm row, the guards, and D-003's disable. Changing this behaviour is out of scope (copy byte for byte); a later item can re-check liveness inside `deleteSession`.
- **RISK-002** The mod spawns `node` from the Claude Code process for delete and for title scans of transcripts over 4 MiB. With no `node` on that PATH, delete shows "Could not delete" and a large session shows `Session <first 8 id chars>` as its title. Mitigation: Picket's CLI already needs Node 22 on PATH; nothing fails silently.

### D-002 (r2): Copy the seven source files; ship only tracked plugin files
**Decision:** Copy `hooks/hooks.json`, `hooks/register.tsx`, `hooks/format.ts`, `hooks/format.test.ts`, `hooks/sessions.ts`, `hooks/sessions.test.ts` and `types/index.d.ts` byte for byte into `session/`, from the dev folder as it stands when phase 1 starts, never from an earlier snapshot. Write `session/.claude-plugin/plugin.json` from the dev copy with two changes: `version` becomes the package version, and `description` becomes "Sessions of this project and every agent of this one, in a docked sidebar", because the dev description ("every agent of the session") predates the session manager. The marketplace entry carries the same description. Skip `.claude-plugin/types/` and the root `tsconfig.json`; add `session/tsconfig.json` to the root `.gitignore`. In `package.json` `files`, add `session/.claude-plugin/plugin.json`, `session/hooks/` and `session/types/`, never `session/`, for the reason D-002 of the status order gives (npm does not filter a `files` entry through `.gitignore`).
**Instead of:** keeping the dev description: it is shorter to copy, but the marketplace listing would describe half the mod.

### D-003: init installs mods from one list, each respecting a disable
**Decision:** In `core/lib/init.mjs`, replace the single `status` command with a list of mod plugins, `[{ name: "status", id: STATUS_PLUGIN_ID }, { name: "session", id: SESSION_PLUGIN_ID }]`, where `SESSION_PLUGIN_ID` is `picket-session@${MARKETPLACE_NAME}`. `installCommands` maps each to an install step with the key-presence done check `id in (enabledPlugins ?? {})`, so a `claude plugin disable` (value `false`) stays respected, and `byHand` builds its command list from the same table. Step order: `marketplace`, `plugin`, `status`, `session`. With a second mod the table pays for itself: the step names, the by-hand hint and a third mod are one line each. It gives up the flat literal list the file has today.
Without a marketplace beside the plugin (init run from the plugin cache), the `session` step behaves exactly like `status`: `unchanged` when its key is present, otherwise `failed` with "no marketplace beside the plugin" and no command run. This does not change any exit code a user can reach today: since `status` is unreleased, every project initialised from a published package lacks both keys, and its cache rerun already exits 2 on `status`. The only new exit 2 is a project initialised from this checkout between 37f2a44 and this change, then re-initialised from the cache; its detail names the by-hand command.
**Instead of:** reporting a mod step `skipped` when no marketplace is beside the plugin: it would end the exit 2 for both mods, but it changes the status step's contract, which the lead kept out of scope (OQ-002).

### D-004: Version sync and CLI-run tests cover the session manifest
**Decision:** `PLUGIN_MANIFESTS` in `.github/scripts/release.mjs` gains `session/.claude-plugin/plugin.json`; `syncVersion` already checks every manifest before it writes any. The npm `version` script stages all three manifests. Add `"test:session": "claude plugin validate --strict session && claude plugin test session"` beside `test:status`. `npm test` stays Node-only and covers the shape: marketplace entries, package `files`, manifest versions, init steps. CI does not run the mod tests (no Claude Code CLI on the release runner, OQ-001 of the status order).
**Instead of:** one `test:mods` script for both folders: it saves a line but hides which mod failed, and the status script is already published in `package.json`.

## Scope

**In:** the `session/` plugin and its marketplace entry; the `files` entries, `.gitignore` line and `test:session` script; version sync for the third manifest; the mod table and the `session` step in `picket init`.

**Out:** any change to the mod's code; enabling `picket-session@picketai` in this repo's `.claude/settings.json` (the dev-mods copy is active here and two panes with id `picket-session` would collide); removing the dev-mods copy; the cache-rerun exit 2 (OQ-002); `CONTRIBUTING.md:23`, which still describes two `claude` commands (OQ-003).

## Phase 1: Add the picket-session plugin to the marketplace and package

**Touch set:**
- `session/.claude-plugin/plugin.json`: manifest with version, new description
- `session/hooks/hooks.json`: copied module registration
- `session/hooks/register.tsx`: copied mod entry
- `session/hooks/format.ts`: copied card formatters
- `session/hooks/format.test.ts`: copied CLI-run tests
- `session/hooks/sessions.ts`: copied session list helpers
- `session/hooks/sessions.test.ts`: copied CLI-run tests
- `session/types/index.d.ts`: copied state types
- `.claude-plugin/marketplace.json`: list picket-session after picket-status
- `package.json`: files entries, scripts
- `.gitignore`: ignore generated session/tsconfig.json
- `.github/scripts/release.mjs`: sync third manifest
- `test/kernel/plugin-layout.test.mjs`: marketplace, package, version assertions
- `test/release.test.mjs`: sync-version covers three manifests

**Changes:** Copy the seven files from `~/.claude/dev-mods/de97e3bc-8880-46d8-ace6-e34748490980/picket-session/` as D-002 says, at implementation time (copy, then compare with `cmp`). Write `session/.claude-plugin/plugin.json` with `name`, `version` `1.0.0-alpha.1`, the D-002 description, `author` and `types`, in the dev copy's key order. Add the marketplace entry `{ "name": "picket-session", "source": "./session", "description": <the manifest description> }`. Add the three `files` entries after the status ones, the `test:session` script after `test:status`, and `session/.claude-plugin/plugin.json` to the `git add` of the `version` script. Add the manifest path to `PLUGIN_MANIFESTS`. In `plugin-layout.test.mjs`, the marketplace test expects three entries ending with `{ picket-session, ./session }`; turn `STATUS_FILES` and `STATUS_MANIFEST` into a list over the mod folders `status` and `session` so the package test asserts each folder's three `files` entries, the absence of the bare folder, and the manifest version. In `release.test.mjs`, `project()` writes a session manifest too and the CLI test asserts all three are rewritten.

**Done when:**
- **T-1.1** `cmp` of each of the seven copied files against the dev folder, run after the copy, prints nothing.
- **T-1.2** `claude plugin validate --strict session` and `claude plugin validate --strict .` both exit 0; the second lists three plugins.
- **T-1.3** `claude plugin test session` reports 0 fail and a pass count equal to the `test(` calls in `session/hooks/*.test.ts` (18 today) (see OQ-001 when the rollout message appears).
- **T-1.4** `npm pack --dry-run` lists `session/.claude-plugin/plugin.json`, `session/hooks/sessions.ts` and `session/types/index.d.ts`, and no `session/tsconfig.json` and nothing under `session/.claude-plugin/types/`.
- **T-1.5** `git ls-files session` lists exactly the eight files of D-002.
- **T-1.6** `node .github/scripts/release.mjs sync-version` on a copy with package version `9.9.9` rewrites all three manifests (covered by `test/release.test.mjs`).
- **T-1.7** `npm test` passes.

## Phase 2: picket init installs picket-session

**Touch set:**
- `core/lib/init.mjs`: mod table, session step
- `test/kernel/init.test.mjs`: four steps, disable, no marketplace

**Changes:** Introduce `SESSION_PLUGIN_ID` and the mod table of D-003; build the `status` and `session` install commands and the `byHand` list from it. `INSTALL_STEP_NAMES` keeps deriving from `installCommands(null)`, so `--no-install` reports `session: skipped` with no other change. In `init.test.mjs`, add `session: "skipped"` to the three `results(...)` deep-equals, the fourth recorded call to the install-order test, `"picket-session@picketai": true` to the two already-installed fixtures, `session` to the no-marketplace and failing-command tests, and extend the by-hand regex with `, then claude plugin install picket-session@picketai --scope project$`. Add one test: `picket-session@picketai: false` with the rest installed runs no `claude` command, reports `session: unchanged`, and leaves the value `false`.

**Done when:**
- **T-2.1** `init(root, { exec })` on a fresh repo records four calls in order: marketplace add, then install of `picket@picketai`, `picket-status@picketai`, `picket-session@picketai`, each with `--scope project` and `cwd` the project root.
- **T-2.2** With `enabledPlugins` holding `"picket-session@picketai": false` and the rest installed, init runs no `claude` command, reports `session: unchanged`, and the value stays `false`.
- **T-2.3** With `market: null`, a project holding all four keys reports every install step `unchanged`, and an empty project reports all four `failed` with no command run.
- **T-2.4** `picket init --no-install` reports `marketplace`, `plugin`, `status` and `session` all `skipped`.
- **T-2.5** Driven: `node core/bin/picket.mjs init --root <new scratch git repo>` exits 0 and that repo's `.claude/settings.json` has `picket@picketai`, `picket-status@picketai` and `picket-session@picketai` all `true` under `enabledPlugins`. It leaves a copy under `~/.claude/plugins/cache/picketai/`, as every init does.
- **T-2.6** `npm test` passes.

## Open questions

- **OQ-001** `claude plugin test` prints "hooks modules are turned off in this process: the rollout switch was saved off by an earlier session" on this machine today, for `status` too. Owner: the user (start `claude` once with network access, then rerun). Fallback: the developer runs `npm run test:session`; if the message appears, the phase reports T-1.3 as not run with the quoted message, and the gate shows it for the user to decide.
- **OQ-002** Should mod steps report `skipped` instead of `failed` when init runs from the plugin cache with no marketplace beside it? That would end the exit 2 the previous reviewer found, for status and session alike. Owner: the lead. Fallback: D-003 as written; a follow-up item.
- **OQ-003** `CONTRIBUTING.md:23` names two `claude` commands and a two-command undo; after phase 2 init runs four. Owner: the lead. Fallback: a fast-lane follow-up after phase 2 is approved, covering status and session together.

## Revision log

- 2026-10-10: D-002 (r2): copy the dev folder at implementation time; test count no longer fixed; the dev copy gained section scrolling
