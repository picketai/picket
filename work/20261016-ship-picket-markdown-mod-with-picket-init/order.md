---
kind: order
lane: order
title: Ship picket-markdown mod with picket init
date: 2026-10-16
audience: developer
sources: [request.md, ~/.claude/dev-mods/b59e492b-90c3-4415-85e4-b4a92826533c/picket-markdown, work/20261010-ship-picket-status-mod-with-picket-init/order.md, work/20261010-ship-picket-session-mod-with-picket-init/order.md, commits 2b19ebc and 9828dda, core/lib/init.mjs, .claude-plugin/marketplace.json, package.json, .gitignore, .github/scripts/release.mjs, .claude/settings.json, ~/.claude/plugins/known_marketplaces.json, session/.claude-plugin/plugin.json, test/kernel/plugin-layout.test.mjs, test/kernel/init.test.mjs, test/release.test.mjs, test/names-picket.test.mjs, CONTRIBUTING.md]
phases:
  - n: 1
    files: [markdown/.claude-plugin/plugin.json, markdown/hooks/hooks.json, markdown/hooks/register.tsx, markdown/hooks/links.ts, markdown/hooks/markdown.ts, markdown/hooks/tree.ts, markdown/hooks/work.ts, markdown/hooks/picket-markdown.test.tsx, markdown/types/index.d.ts, .claude-plugin/marketplace.json, package.json, .gitignore, .github/scripts/release.mjs, .claude/settings.json, test/kernel/plugin-layout.test.mjs, test/release.test.mjs]
    greps:
      - path: .claude-plugin/marketplace.json
        pattern: '"source": "\./markdown"'
      - path: markdown/.claude-plugin/plugin.json
        pattern: '"name": "picket-markdown"'
      - path: package.json
        pattern: '"test:markdown": "claude plugin validate --strict markdown && claude plugin test markdown"'
      - path: .github/scripts/release.mjs
        pattern: 'markdown/\.claude-plugin/plugin\.json'
      - path: .gitignore
        pattern: '^markdown/tsconfig\.json\r?$'
      - path: .claude/settings.json
        pattern: '"picket-markdown@picketai": true'
    tests: true
    drive: true
  - n: 2
    files: [core/lib/init.mjs, test/kernel/init.test.mjs]
    greps:
      - path: core/lib/init.mjs
        pattern: 'picket-markdown@'
      - path: test/kernel/init.test.mjs
        pattern: 'picket-markdown@picketai'
    tests: true
    drive: true
---
# Order: Ship picket-markdown mod with picket init

## Problem

The picket-markdown mod (a read-only markdown pane docked beside the transcript, opened from a clicked path or `/md <path>`) lives only in a session-scoped dev-mods folder. It must ship in `@picketai/picket` as the fourth plugin of the `picketai` marketplace, be installed in this repository, and be installed by `picket init` by default. The binding constraints are the ones the status and session orders named: the function-hooks API is early access, the core command hooks must keep working whatever happens to a mod, `npm test` stays green, and no code comments are added.

Verified premises. Only `picket-status` is installed by default today: commit 9828dda took `picket-session` out of init ("until it matures") and collapsed the mod table of 2b19ebc back to one literal `status` line (`core/lib/init.mjs:151-155`). So "like those mods" means like `picket-status`. `claude plugin validate --strict` on the dev copy fails on one warning only, no `author`, and lists state keys `picket-markdown.*`, the `md` command, and `$.fs.list|read|stat`, `$.process.run` (open in editor), `$.prompt.fill`, `$.ui.copy`. The dev copy holds 10 `test(` calls in `hooks/picket-markdown.test.tsx`, no comment lines, and no use of the old product name (`test/names-picket.test.mjs` scans tracked files). No `markdown/` folder exists in the repo. The `picketai` marketplace is known on this machine as a `directory` source at this checkout (`~/.claude/plugins/known_marketplaces.json`), and `.claude/settings.json` enables `picket@picketai` and `picket-status@picketai` at project scope. `core/bin/picket.mjs` carries an unrelated uncommitted change.

## Decisions

### D-001: A fourth plugin, picket-markdown, in markdown/
**Decision:** Ship the mod as its own plugin at `markdown/` (plugin name `picket-markdown`, id `picket-markdown@picketai`), listed in `.claude-plugin/marketplace.json` after `picket-session`. The folder follows the precedent: the plugin name without the `picket-` prefix. The name must stay `picket-markdown` because the code keys on it (the nine `atom({ plugin: 'picket-markdown', ... })` calls, `PluginState['picket-markdown']`, the pane id `PANE`), so the code ships unchanged. A separate plugin keeps an early-access module failure away from the core hooks and the other mods; the user disables one plugin. It gives up a single install: a fourth manifest and another init step to keep in step.
**Instead of:** a second module in `status/`: one fewer plugin, but the state key would change and one mod's load failure would take the band down too.
**Risks:**
- **RISK-001** `openInEditor` runs `cmd /c code <path>` for a Windows path, so `cmd` parses the path: a markdown file whose name holds `&` (for example `a&b.md`) splits the command. It runs only on the user's press, for a file the pane already loaded through `$.fs.stat`. Mitigation: out of scope here (copy byte for byte); a later item can pass the path to `code` without `cmd`.

### D-002: Copy the eight source files; ship only tracked plugin files
**Decision:** Copy `hooks/hooks.json`, `hooks/register.tsx`, `hooks/links.ts`, `hooks/markdown.ts`, `hooks/tree.ts`, `hooks/work.ts`, `hooks/picket-markdown.test.tsx` and `types/index.d.ts` byte for byte into `markdown/`, from the dev folder as it stands when phase 1 starts. Write `markdown/.claude-plugin/plugin.json` from the dev copy with two changes: add `"author": { "name": "Vlad Apetre" }` so `--strict` passes, and set `version` to the package version (D-003). The marketplace entry carries the manifest `description`. Skip `.claude-plugin/types/` (engine-written, with its own `.gitignore` of `*`) and the root `tsconfig.json`; add `markdown/tsconfig.json` to the root `.gitignore`. In `package.json` `files`, add `markdown/.claude-plugin/plugin.json`, `markdown/hooks/` and `markdown/types/`, never `markdown/`, because npm does not filter a `files` entry through `.gitignore`.
**Instead of:** `"markdown/"` in `files`: one line, but a stray generated `markdown/tsconfig.json` would ship.

### D-003: Version sync and CLI-run tests cover the markdown manifest
**Decision:** `PLUGIN_MANIFESTS` in `.github/scripts/release.mjs` gains `markdown/.claude-plugin/plugin.json`, and the npm `version` script stages all four manifests. Add `"test:markdown": "claude plugin validate --strict markdown && claude plugin test markdown"` after `test:session`. `npm test` stays Node-only and covers the shape (marketplace entries, package `files`, manifest versions, init steps), because the `.tsx` test imports `claude-code/testing`, which only the Claude Code binary provides. It gives up running the mod tests in CI (no Claude Code CLI on the release runner).
**Instead of:** one `test:mods` script over all three folders: one line, but it hides which mod failed, and two per-mod scripts are already published.

### D-004: init installs picket-markdown from a restored mod table
**Decision:** In `core/lib/init.mjs`, add `MARKDOWN_PLUGIN_ID = picket-markdown@${MARKETPLACE_NAME}` and bring back the mod table of 2b19ebc as `MOD_PLUGINS = [{ name: "status", id: STATUS_PLUGIN_ID }, { name: "markdown", id: MARKDOWN_PLUGIN_ID }]`. `installCommands` maps each entry to an install step with the key-presence done check `id in (enabledPlugins ?? {})`, so a `claude plugin disable` (value `false`) stays respected, and `byHand` builds its list from the same table. Step order: `marketplace`, `plugin`, `status`, `markdown`. `picket-session` stays out of the table, as 9828dda left it. With no marketplace beside the plugin (init run from the cache), `markdown` behaves like `status`: `unchanged` when its key is present, otherwise `failed` with no command run. It gives up the flat literal list, which a second mod no longer pays for.
**Instead of:** a second literal line beside `status`: one line fewer today, but the by-hand hint and each later mod need two edits that can drift apart.
**Risks:**
- **RISK-002** A project initialised before this change and rerun from the plugin cache now exits 2 on the `markdown` step, as status did when it was added. Mitigation: the detail names the by-hand command; OQ-002 of the session order (report `skipped` there) still covers it.

### D-005: Install locally through the marketplace, at project scope
**Decision:** Install the plugin in this repository with `claude plugin install picket-markdown@picketai --scope project`, run from the repo root, and commit the `"picket-markdown@picketai": true` line it writes into `.claude/settings.json`. The marketplace is a `directory` source at this checkout, so the CLI reads the new entry from `marketplace.json`; if it reports the plugin unknown, run `claude plugin marketplace update picketai` once and repeat. This is the same route `picket init` takes, so the local install also exercises what users get. It gives up `--plugin-dir markdown` in `npm run claude`, which would load the working copy live but differs from the shipped path.
**Instead of:** running `picket init` on this repo after phase 2: it installs the same key, but it also rewrites this repo's CLAUDE.md block and settings keys, which is wider than the request.
**Risks:**
- **RISK-003** In this session the dev-mods copy is loaded too; a resumed session with the same id would load both and show two panes with id `picket-markdown` and two `md` commands. Mitigation: plugins load at start and the dev-mods folder is session-scoped, so a new session loads only the installed copy; removing the dev-mods copy is out of scope.

## Scope

**In:** the `markdown/` plugin and its marketplace entry; the `files` entries, the `.gitignore` line and the `test:markdown` script; version sync for the fourth manifest; the local project-scope install; the mod table and the `markdown` step in `picket init`.

**Out:** any change to the mod's code beyond `plugin.json`; editing or removing the dev-mods copy; putting `picket-session` back into init (OQ-002); `CONTRIBUTING.md:23`, which still describes two `claude` commands (OQ-003); the cache-rerun exit 2 (RISK-002).

## Phase 1: Add picket-markdown to the marketplace, the package and this repo

**Touch set:**
- `markdown/.claude-plugin/plugin.json`: manifest with author, version
- `markdown/hooks/hooks.json`: copied module registration
- `markdown/hooks/register.tsx`: copied mod entry
- `markdown/hooks/links.ts`: copied link parsing helpers
- `markdown/hooks/markdown.ts`: copied markdown layout
- `markdown/hooks/tree.ts`: copied file tree rows
- `markdown/hooks/work.ts`: copied work item status
- `markdown/hooks/picket-markdown.test.tsx`: copied CLI-run tests
- `markdown/types/index.d.ts`: copied state types
- `.claude-plugin/marketplace.json`: list picket-markdown after picket-session
- `package.json`: files entries, scripts
- `.gitignore`: ignore generated markdown/tsconfig.json
- `.github/scripts/release.mjs`: sync fourth manifest
- `.claude/settings.json`: local install writes enabledPlugins key
- `test/kernel/plugin-layout.test.mjs`: marketplace, package, version assertions
- `test/release.test.mjs`: sync-version covers four manifests

**Changes:** Copy the eight files from `~/.claude/dev-mods/b59e492b-90c3-4415-85e4-b4a92826533c/picket-markdown/` as D-002 says, then compare with `cmp`. Write `markdown/.claude-plugin/plugin.json` with `name`, `version` `1.0.0-alpha.1`, the dev `description`, `author` and `types`, in the key order of `session/.claude-plugin/plugin.json`. Add the marketplace entry `{ "name": "picket-markdown", "source": "./markdown", "description": <the manifest description> }`. Add the three `files` entries after the session ones, the `test:markdown` script after `test:session`, and `markdown/.claude-plugin/plugin.json` to the `git add` of the `version` script. Add the manifest path to `PLUGIN_MANIFESTS`. In `plugin-layout.test.mjs`, `MOD_FOLDERS` gains `"markdown"`, and the marketplace test (title and deep-equal) expects four entries ending with `{ picket-markdown, ./markdown }`. In `release.test.mjs`, add a `MARKDOWN_MANIFEST` beside `SESSION_MANIFEST`, `project()` writes it, the CLI test asserts all four are rewritten, and the malformed-status test asserts the markdown manifest stays as written. Then run the D-005 install from the repo root. Stage only the touch set; `core/bin/picket.mjs` stays unstaged.

**Done when:**
- **T-1.1** `cmp` of each of the eight copied files against the dev folder, run after the copy, prints nothing.
- **T-1.2** `claude plugin validate --strict markdown` and `claude plugin validate --strict .` both exit 0; the second lists four plugins.
- **T-1.3** `claude plugin test markdown` reports 0 fail and a pass count equal to the `test(` calls in `markdown/hooks/picket-markdown.test.tsx` (10 today) (OQ-001 when the rollout message appears).
- **T-1.4** `npm pack --dry-run` lists `markdown/.claude-plugin/plugin.json`, `markdown/hooks/register.tsx` and `markdown/types/index.d.ts`, and no `markdown/tsconfig.json` and nothing under `markdown/.claude-plugin/types/`.
- **T-1.5** `git ls-files markdown` lists exactly the nine files of D-002.
- **T-1.6** Driven: `.claude/settings.json` holds `"picket-markdown@picketai": true` under `enabledPlugins`, and `~/.claude/plugins/installed_plugins.json` lists `picket-markdown@picketai` with `projectPath` this checkout and version `1.0.0-alpha.1`.
- **T-1.7** `node .github/scripts/release.mjs sync-version` on a copy with package version `9.9.9` rewrites all four manifests (covered by `test/release.test.mjs`).
- **T-1.8** `npm test` passes.

## Phase 2: picket init installs picket-markdown

**Touch set:**
- `core/lib/init.mjs`: mod table, markdown step
- `test/kernel/init.test.mjs`: four steps, disable, no marketplace

**Changes:** Add `MARKDOWN_PLUGIN_ID` and `MOD_PLUGINS` as D-004 says; build the `status` and `markdown` install commands and the `byHand` list from the table. `INSTALL_STEP_NAMES` keeps deriving from `installCommands(null)`, so `--no-install` reports `markdown: skipped` with no other change. In `init.test.mjs`, add `markdown: "skipped"` to the three `results(...)` deep-equals (lines 41, 58, 205), the fourth recorded call and `markdown: "created"` to the install-order test (line 221, title included), `"picket-markdown@picketai": true` to the two already-installed fixtures (lines 251, 280) and the status-disable fixture (line 266), `markdown` to the no-marketplace and failing-command tests, and extend the by-hand regex (line 316) with `, then claude plugin install picket-markdown@picketai --scope project$`. Add one test: `picket-markdown@picketai: false` with the rest installed runs no `claude` command, reports `markdown: unchanged`, and leaves the value `false`.

**Done when:**
- **T-2.1** `init(root, { exec })` on a fresh repo records four calls in order: marketplace add, then install of `picket@picketai`, `picket-status@picketai`, `picket-markdown@picketai`, each with `--scope project` and `cwd` the project root.
- **T-2.2** With `enabledPlugins` holding `"picket-markdown@picketai": false` and the rest installed, init runs no `claude` command, reports `markdown: unchanged`, and the value stays `false`.
- **T-2.3** With `market: null`, a project holding all three plugin keys reports every install step `unchanged`, and an empty project reports all four install steps `failed` with no command run.
- **T-2.4** `picket init --no-install` reports `marketplace`, `plugin`, `status` and `markdown` all `skipped`.
- **T-2.5** Driven: `node core/bin/picket.mjs init --root <new scratch git repo>` exits 0 and that repo's `.claude/settings.json` has `picket@picketai`, `picket-status@picketai` and `picket-markdown@picketai` all `true` under `enabledPlugins`, and no `picket-session@picketai` key. It leaves a copy under `~/.claude/plugins/cache/picketai/`, as every init does.
- **T-2.6** `npm test` passes.

## Open questions

- **OQ-001** `claude plugin test` has refused before with "hooks modules are turned off in this process: the rollout switch was saved off", from a subagent shell. Owner: the user (start `claude` once with network access, then rerun). Fallback: the developer runs `npm run test:markdown`; if the message appears, the phase reports T-1.3 as not run with the quoted message, and the gate shows it.
- **OQ-002** The request says "like those mods", but only `picket-status` is installed by default; 9828dda took `picket-session` out. Should init install `picket-session` again? Owner: the user. Fallback: D-004 as written, session stays opt-in.
- **OQ-003** `CONTRIBUTING.md:23` names two `claude` commands and a two-command undo; after phase 2 init runs four. Owner: the lead. Fallback: a fast-lane follow-up after phase 2 is approved.

## Revision log
