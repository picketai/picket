---
kind: order
lane: order
title: Ship picket-status mod with picket init
date: 2026-10-10
audience: developer
sources: [request.md, ~/.claude/dev-mods/8201c917-9661-457e-8cfd-c7e258af389f/picket-status, core/lib/init.mjs, core/hooks/hooks.json, core/.claude-plugin/plugin.json, .claude-plugin/marketplace.json, package.json, .gitignore, .github/scripts/release.mjs, .github/workflows/release.yml, scripts/test.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/init.test.mjs, test/release.test.mjs, bench/adapters/plugin.mjs, CONTRIBUTING.md]
phases:
  - n: 1
    files: [status/.claude-plugin/plugin.json, status/hooks/hooks.json, status/hooks/register.tsx, status/hooks/format.ts, status/hooks/format.test.ts, status/types/index.d.ts, .claude-plugin/marketplace.json, package.json, .gitignore, .github/scripts/release.mjs, test/kernel/plugin-layout.test.mjs, test/release.test.mjs]
    greps:
      - path: .claude-plugin/marketplace.json
        pattern: '"source": "\./status"'
      - path: status/.claude-plugin/plugin.json
        pattern: '"name": "picket-status"'
      - path: package.json
        pattern: '"test:status": "claude plugin validate --strict status && claude plugin test status"'
      - path: .github/scripts/release.mjs
        pattern: 'status/\.claude-plugin/plugin\.json'
      - path: .gitignore
        pattern: '^status/tsconfig\.json\r?$'
    tests: true
    drive: true
  - n: 2
    files: [core/lib/init.mjs, test/kernel/init.test.mjs]
    greps:
      - path: core/lib/init.mjs
        pattern: 'picket-status@'
      - path: test/kernel/init.test.mjs
        pattern: 'picket-status@picketai'
    tests: true
    drive: true
---
# Order: Ship picket-status mod with picket init

## Problem

The picket-status mod (a band above the prompt with model, thinking effort, last skill, the five-hour and seven-day rate-limit windows, context fill and cache reads) lives only in a session-scoped dev-mods folder. It must ship in the `@picketai/picket` package and be installed by `picket init` together with the `picket` plugin. The binding constraints: the function-hooks API is early access and changes between Claude Code releases (the mod is built against 2.1.296), the core command hooks must keep working whatever happens to the mod, `npm test` and the budgets stay green, and no code comments are added.

Verified premises. One `hooks/hooks.json` may hold both `"modules"` and command `"hooks"`: a scratch plugin with both passed `claude plugin validate --strict` except for the missing author, and `plugin details` listed its SessionStart hook. The dev copy passes `claude plugin test` (5 of 5) with only `.claude-plugin/plugin.json`, `hooks/` and `types/` present, so the engine-generated `.claude-plugin/types/` and root `tsconfig.json` are not needed. `claude plugin validate --strict` on the dev copy fails on one warning only: no `author`. `claude plugin validate --strict .` passes on the repo root today. `init` finds the marketplace as the parent of `core/` (`core/lib/init.mjs:136-139`), and `bench/adapters/plugin.mjs:38` runs init with `--no-install`, so bench is unaffected. The only CI is `.github/workflows/release.yml`: Node 22, `npm ci`, `npm test`, no Claude Code CLI.

## Decisions

### D-001: A second plugin, picket-status, in the picketai marketplace
**Decision:** Ship the mod as its own plugin at `status/` (plugin name `picket-status`, id `picket-status@picketai`) and list it in `.claude-plugin/marketplace.json` after `picket`. A separate plugin keeps the early-access module loader away from the core command hooks: if a Claude Code release breaks the function-hooks API, the user disables one plugin and Picket's guards, injectors and verdict routing still load. It also keeps the mod's state key (`atom({ plugin: 'picket-status', ... })` and `PluginState['picket-status']` in `types/index.d.ts`) matching its plugin name, so the code ships unchanged. It gives up a single install: two plugin entries to keep in step, which D-003 and D-004 cover.
**Instead of:** adding `"modules": ["./register.tsx"]` to `core/hooks/hooks.json`: one hooks.json accepts both keys, but a module load failure would sit in the same plugin as every Picket guard, the user could not drop the band without dropping Picket, and the state key would have to change to `picket`.
**Risks:**
- **RISK-001** A Claude Code release changes the function-hooks API and the band errors or disappears. Mitigation: `claude plugin disable picket-status@picketai --scope project`; D-004 keeps that choice across init reruns; the core plugin is untouched.

### D-002: Copy the six source files; ship only tracked plugin files
**Decision:** Copy `hooks/hooks.json`, `hooks/register.tsx`, `hooks/format.ts`, `hooks/format.test.ts` and `types/index.d.ts` byte for byte from the dev copy into `status/`. Copy `.claude-plugin/plugin.json` with two changes: add `"author": { "name": "Vlad Apetre" }` so `--strict` passes, and set `version` to the package version (D-003). Do not copy `.claude-plugin/types/` (the engine writes it with its own `.gitignore` of `*`) or the root `tsconfig.json`; add `status/tsconfig.json` to the root `.gitignore` so an engine-written copy stays untracked. In `package.json` `files`, list `status/.claude-plugin/plugin.json`, `status/hooks/` and `status/types/` rather than `status/`, so a local `npm pack` never picks up a generated `tsconfig.json`.
**Instead of:** `"status/"` in `files`: one line shorter, but npm's root `.gitignore` does not filter paths named in `files`, so a stray generated `status/tsconfig.json` would ship.

### D-003: The status manifest follows the package version
**Decision:** `.github/scripts/release.mjs` `sync-version` rewrites the version in both `core/.claude-plugin/plugin.json` and `status/.claude-plugin/plugin.json`, using the existing `syncPluginVersion` per file and failing if either holds other than one version value. The npm `version` script stages both manifests. Claude Code refreshes a cached plugin when its version changes, so a status manifest frozen at `0.1.0` would leave users on the first copy after every upgrade. It gives up an independent version number for the mod.
**Instead of:** an independent semver for `picket-status`: it needs a manual bump per change and a second release rule, for one package that ships both plugins together.

### D-004: init installs picket-status as its own step, and respects a disable
**Decision:** `init` gains a third install step, `status`, after `plugin`: `claude plugin install picket-status@picketai --scope project`, run from the project root like the other two, skipped by `--no-install`, failed with the same "no marketplace beside the plugin" detail when `market` is null. Its done check is key presence, `"picket-status@picketai" in (enabledPlugins ?? {})`, so a project where the user ran `claude plugin disable` (value `false`) reports `unchanged` and init never turns the band back on. A failed `status` step is a failed step like the others (CLI exit 2). The by-hand hint names all three commands. The `picket` step's done check stays as it is.
**Instead of:** a `--no-status` init flag: more CLI surface, and it does not survive the next init run; the disable-respecting done check gives the same opt-out with no flag.
**Risks:**
- **RISK-002** A user on a Claude Code release without function hooks gets an installed plugin that does nothing or warns at startup. Mitigation: the same disable command; OQ-001 decides whether CI checks the mod against the CLI.

### D-005: Mod tests run through the Claude Code CLI, outside npm test
**Decision:** Add the npm script `"test:status": "claude plugin validate --strict status && claude plugin test status"`. `format.test.ts` imports `claude-code/testing`, which only the Claude Code binary provides, so `node --test` cannot run it and `npm test` keeps its Node-only file list (`scripts/test.mjs` matches `*.test.mjs` under `test/` and `bench/test/`, so the `.ts` file is never picked up). `npm test` covers the shape instead: the marketplace lists both plugins, the package ships the status files, both manifests carry the package version, and init's three install steps. CI does not run `test:status`, because the release runner has no Claude Code CLI (OQ-001).
**Instead of:** running `format.ts` under Node 22 with `--experimental-strip-types` from a duplicate `.mjs` test: it copies five tests into a second runner and flags into `scripts/test.mjs` for code the CLI already tests.

## Scope

**In:**
- the `status/` plugin and its marketplace entry
- the package `files` entries, the `.gitignore` line and the `test:status` script
- version sync for both manifests
- the `status` install step in `picket init`

**Out:**
- any change to the mod's behaviour or code beyond `plugin.json`
- loading `status/` in this repo's own sessions (`npm run claude`): the user's dev-mods copy is still active and two bands would show
- removing the dev-mods copy
- `core/hooks/hooks.json` and the core plugin manifest beyond its version line
- the `CONTRIBUTING.md` description of init (OQ-002)

## Phase 1: Add the picket-status plugin to the marketplace and package

**Touch set:**
- `status/.claude-plugin/plugin.json`: new manifest with author, version
- `status/hooks/hooks.json`: copied module registration
- `status/hooks/register.tsx`: copied mod entry
- `status/hooks/format.ts`: copied pure formatters
- `status/hooks/format.test.ts`: copied CLI-run tests
- `status/types/index.d.ts`: copied state types
- `.claude-plugin/marketplace.json`: list picket-status after picket
- `package.json`: files entries and test:status script
- `.gitignore`: ignore generated status/tsconfig.json
- `.github/scripts/release.mjs`: sync both plugin manifests
- `test/kernel/plugin-layout.test.mjs`: marketplace, package, version assertions
- `test/release.test.mjs`: sync-version covers both manifests

**Changes:** Copy the five files from `~/.claude/dev-mods/8201c917-9661-457e-8cfd-c7e258af389f/picket-status/` as D-002 says, and write `status/.claude-plugin/plugin.json` with `name`, `version` (the `package.json` version, today `1.0.0-alpha.1`), the existing `description`, `author` and `types`. Add the marketplace entry `{ "name": "picket-status", "source": "./status", "description": <the manifest description> }`. Add the three `files` entries, the `test:status` script, and `status/.claude-plugin/plugin.json` to the `git add` in the `version` script. Replace the single `PLUGIN_MANIFEST` in `release.mjs` with the list of both manifest paths and sync each. In `plugin-layout.test.mjs`, the marketplace test expects `[{ picket, ./core }, { picket-status, ./status }]`, the package test also asserts the three status `files` entries and that the status manifest version equals the package version. In `release.test.mjs`, `project()` writes both manifests and the CLI test asserts both are rewritten.

**Done when:**
- **T-1.1** `diff` of each of the five copied files against the dev copy prints nothing.
- **T-1.2** `npm run test:status` exits 0: strict validation passes and `claude plugin test status` reports 5 pass, 0 fail.
- **T-1.3** `claude plugin validate --strict .` exits 0 with both plugins listed.
- **T-1.4** `npm pack --dry-run` lists `status/.claude-plugin/plugin.json`, `status/hooks/register.tsx` and `status/types/index.d.ts`, and no path under `status/.claude-plugin/types/` and no `status/tsconfig.json`.
- **T-1.5** `git ls-files status` lists exactly the six files of D-002.
- **T-1.6** `node .github/scripts/release.mjs sync-version` on a copy with package version `9.9.9` rewrites both manifests to `9.9.9` (covered by `test/release.test.mjs`).
- **T-1.7** `npm test` passes.

## Phase 2: picket init installs picket-status

**Touch set:**
- `core/lib/init.mjs`: third install step, disable-respecting check
- `test/kernel/init.test.mjs`: three steps, opt-out, skipped, failed

**Changes:** In `installCommands`, add the `status` entry after `plugin` with args `plugin install picket-status@picketai --scope project` and the key-presence done check of D-004; name the id from `MARKETPLACE_NAME` like `PLUGIN_ID`. The `!install` branch returns `skipped` for all three names. `byHand` lists the three commands in order. Update the three `results(...)` deep-equals in `init.test.mjs` (lines 41, 58, 205) with `status: "skipped"`, the recorded-calls test (line 222) with the third call, the already-installed tests (lines 243 and 258) with `"picket-status@picketai": true`, and the no-marketplace and `--no-install` tests with the `status` result. Add one test: settings with `"picket-status@picketai": false` and the other two installed run no claude command and report `status: "unchanged"`.

**Done when:**
- **T-2.1** `init(root, { exec })` on a fresh repo records three calls in order: marketplace add, `plugin install picket@picketai`, `plugin install picket-status@picketai`, each with `--scope project` and `cwd` the project root.
- **T-2.2** With `enabledPlugins` holding `"picket-status@picketai": false`, init runs no `claude` command for that step and reports `status: unchanged`.
- **T-2.3** `picket init --no-install` reports `marketplace`, `plugin` and `status` all `skipped`.
- **T-2.4** With `market: null` and nothing installed, all three install steps report `failed` and no command runs.
- **T-2.5** Driven: `node core/bin/picket.mjs init --root <new scratch git repo>` exits 0 and that repo's `.claude/settings.json` has `enabledPlugins` with both `picket@picketai` and `picket-status@picketai` set to `true`. This leaves a copy under `~/.claude/plugins/cache/picketai/`, as every init does.
- **T-2.6** `npm test` passes.

## Open questions

- **OQ-001** Should the release workflow install the Claude Code CLI and run `npm run test:status` before publishing? It is unverified whether the public CLI on the runner has function hooks and runs `plugin test` without login. Owner: the user. Fallback: run `npm run test:status` locally before tagging; CI runs `npm test` only.
- **OQ-002** `CONTRIBUTING.md:23` says init runs two `claude` commands and gives a two-command undo; after phase 2 it is three. Owner: the lead. Fallback: a follow-up fast-lane item updates that paragraph after phase 2 is approved.

## Revision log
