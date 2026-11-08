---
kind: design
lane: design
title: Plugin-only install without global npm
date: 2026-11-08
audience: developer
sources: [work/20261107-plugin-only-install/request.md, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, artifacts/strategy/decisions/00002-session-list-merges-picket-status.md, scripts/build.mjs, src/lib/verbs/init/init.mjs, src/lib/verbs/uninstall/uninstall.mts, src/lib/verbs/statusline/index.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/shared/ledger.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/close/close.mts, src/lib/mods.mts, .github/workflows/release.yml, Claude Code 2.1.319 binary strings]
phases:
  - n: 1
    files: [src/lib/shared/ledger.mts, src/lib/hooks/emit/ledger/index.mts, src/lib/verbs/cost/index.mts, src/lib/verbs/statusline/index.mts, src/lib/verbs/statusline/facts.mts, src/lib/verbs/statusline/layout.mts, src/lib/shared/paths.mts, src/skills/inspecting/SKILL.md, test/cli/cost.test.mjs, test/cli/statusline.test.mjs]
    greps:
      - path: src/lib/shared/ledger.mts
        pattern: '\bsession_cost_usd\b'
        absent: true
      - path: src/lib/shared/ledger.mts
        pattern: 'export function turnTokens\b'
      - path: src/lib/hooks/emit/ledger/index.mts
        pattern: '\bsessionCostPath\b'
        absent: true
      - path: src/lib/verbs/statusline/index.mts
        pattern: '\brecordSessionCost\b'
        absent: true
      - path: src/lib/verbs/statusline/facts.mts
        pattern: '\btotal_cost_usd\b'
        absent: true
      - path: src/lib/shared/paths.mts
        pattern: '\bsessionCostPath\b'
        absent: true
      - path: src/lib/verbs/cost/index.mts
        pattern: 'cost_usd'
        absent: true
      - path: src/lib/verbs/cost/index.mts
        pattern: '\bby_work\b'
      - path: src/skills/inspecting/SKILL.md
        pattern: 'Spent: \$'
        absent: true
    tests: true
    drive: true
    security: false
  - n: 2
    files: [src/lib/verbs/close/audit.mts, src/lib/verbs/close/audit.test.mts, src/lib/verbs/close/close.mts, src/lib/verbs/close/block.mts, src/lib/verbs/close/index.test.mts, test/cli/close.test.mjs, src/lib/shared/work/files.mts]
    greps:
      - path: src/lib/shared/work/files.mts
        pattern: '"audit\.txt"'
      - path: src/lib/verbs/close/block.mts
        pattern: 'Audit: '
      - path: src/lib/verbs/close/audit.mts
        pattern: '\bturnTokens\b'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [scripts/build.mjs, test/repo/build.test.mjs, src/lib/hooks.mts, src/lib/hooks/emit/statusline/index.mts, src/lib/hooks/emit/statusline/index.test.mts, test/repo/hook-list.test.mjs, src/lib/shared/install.mts, src/lib/shared/install.test.mts, src/lib/shared/styling/components/statusline/index.mts, src/lib/verbs/init/init.mjs, src/lib/verbs/uninstall/uninstall.mts, src/lib/verbs/uninstall/uninstall.test.mts, test/cli/statusline.test.mjs, src/lib/verbs.mts, docs/reference/hooks.md, docs/reference/cli.md]
    greps:
      - path: src/lib/hooks.mts
        pattern: '"emit\.statusline"'
      - path: src/lib/hooks/emit/statusline/index.mts
        pattern: 'CLAUDE_PLUGIN_DATA'
      - path: src/lib/shared/install.mts
        pattern: 'plugins/data/picket-picketai/statusline\.mjs'
      - path: src/lib/shared/install.mts
        pattern: 'export function isPicketStatusLine\b'
      - path: scripts/build.mjs
        pattern: 'statusline\.mjs'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [scripts/build.mjs, scripts/watch.mjs, scripts/test.mjs, scripts/docs.mjs, src/lib/mods.mts, src/lib/shared/mod-switch.mts, src/lib/shared/mod-switch.test.mts, src/lib/shared/config.mjs, src/lib/shared/config.schema.json, test/kernel/config.test.mjs, src/.claude-plugin/plugin.json, src/mods/types/index.d.ts, src/mods/index.tsx, src/mods/status/hooks/index.tsx, src/mods/status/hooks/index.test.tsx, src/mods/status/hooks/pane-actions.ts, src/mods/markdown/hooks/index.tsx, src/mods/markdown/hooks/index.test.tsx, src/mods/markdown/hooks/picket-markdown.test.tsx, src/mods/markdown/hooks/data.ts, src/lib/verbs/init/init.mjs, src/lib/verbs/uninstall/uninstall.mts, .claude-plugin/marketplace.json, docs/reference/mods.md, test/repo/mods.test.mjs, test/repo/mod-contracts.test.mjs, test/repo/plugin-layout.test.mjs]
    greps:
      - path: src/mods/index.tsx
        pattern: 'export const register\b'
      - path: src/mods/status/hooks/index.tsx
        pattern: 'export const register\b'
        absent: true
      - path: src/mods/markdown/hooks/index.tsx
        pattern: 'export const register\b'
        absent: true
      - path: scripts/build.mjs
        pattern: '\./mods/index\.tsx'
      - path: scripts/build.mjs
        pattern: '\./mods/status/hooks/index\.tsx'
        absent: true
      - path: src/lib/shared/mod-switch.mts
        pattern: 'export function modEnabled\b'
      - path: src/lib/shared/config.mjs
        pattern: '"mods"'
      - path: src/lib/mods.mts
        pattern: '\bRETIRED_PLUGINS\b'
      - path: src/.claude-plugin/plugin.json
        pattern: '"types"'
      - path: src/mods/types/index.d.ts
        pattern: '''picket'':'
      - path: src/mods/status/hooks/pane-actions.ts
        pattern: "plugin: 'picket-status'"
        absent: true
      - path: src/mods/markdown/hooks/data.ts
        pattern: "plugin: 'picket-markdown'"
        absent: true
      - path: .claude-plugin/marketplace.json
        pattern: '"renames"'
        absent: true
    tests: true
    drive: true
    security: false
  - n: 5
    files: [scripts/build.mjs, package.json, .github/workflows/release.yml, test/repo/package.test.mjs, test/repo/plugin-layout.test.mjs, test/repo/release.test.mjs]
    greps:
      - path: package.json
        pattern: '"private": true'
      - path: package.json
        pattern: '"test:mods"'
      - path: package.json
        pattern: '\bdist/mods/'
        absent: true
      - path: .github/workflows/release.yml
        pattern: 'npm publish \./dist\b'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [src/lib/shared/install.mts, test/repo/release.test.mjs, src/lib/verbs/init/init.mjs, src/lib/verbs/init/index.mts, src/lib/verbs/init/shadow.mts, src/lib/verbs/init/shadow.test.mts, src/lib/verbs/init/index.test.mts, test/cli/init.test.mjs, src/lib/verbs/uninstall/uninstall.mts, src/lib/verbs/uninstall/index.mts, src/lib/verbs/uninstall/uninstall.test.mts, src/lib/verbs/uninstall/index.test.mts, docs/reference/cli.md]
    greps:
      - path: src/lib/verbs/init/init.mjs
        pattern: '\bmarketplaceRoot\b'
        absent: true
      - path: src/lib/shared/install.mts
        pattern: '\bsource: "settings"'
      - path: src/lib/shared/install.mts
        pattern: '"@picketai/picket"'
      - path: src/lib/verbs/init/init.mjs
        pattern: 'marketplace add'
        absent: true
      - path: src/lib/verbs/init/shadow.mts
        pattern: 'npm uninstall -g @picketai/picket'
      - path: src/lib/verbs/init/shadow.mts
        pattern: '_npx'
      - path: src/lib/verbs/uninstall/index.mts
        pattern: 'npx @picketai/picket@alpha style remove --all'
    tests: true
    drive: true
    security: false
  - n: 7
    files: [docs/how-to.md, README.md, CONTRIBUTING.md, CHANGELOG.md]
    greps:
      - path: README.md
        pattern: '\bone plugin per mod\b'
        absent: true
      - path: CONTRIBUTING.md
        pattern: '\bthe three mods\b'
        absent: true
      - path: CONTRIBUTING.md
        pattern: 'picket-status@picketai'
        absent: true
      - path: README.md
        pattern: 'npx @picketai/picket@alpha init'
      - path: README.md
        pattern: 'npm install -g @picketai/picket'
        absent: true
      - path: docs/how-to.md
        pattern: 'init --statusline'
      - path: docs/how-to.md
        pattern: 'mods\.markdown'
      - path: docs/how-to.md
        pattern: '/plugin update'
      - path: CHANGELOG.md
        pattern: 'npm uninstall -g @picketai/picket'
    tests: true
    drive: false
    security: false
---
# Design: Plugin-only install without global npm

## Problem

Picket reaches a machine today as a global npm package plus four plugins (picket, picket-status, picket-markdown, the retired picket-session) served by a directory marketplace inside that npm folder, so `init` commits the folder's absolute path to `extraKnownMarketplaces` (`src/lib/verbs/init/init.mjs:149`, `marketplaceRoot()`), and every machine keeps a second copy on PATH. The status line is `picket statusline`, which needs a global `picket`: Claude Code 2.1.319 adds plugin `bin/` folders only to the Bash and PowerShell tool shells ("Shell: leaving plugin bin/ dirs off PATH", `powerShellPluginBinPaths` in the binary), and the verb writes a cost file the ledger hook reads (`src/lib/verbs/statusline/index.mts:24`, `src/lib/hooks/emit/ledger/index.mts:38`). SDR-00001 binds the shape: the plugin carries the whole core, `init` writes only what a plugin cannot, nothing writes under the plugin root, and `picket@picketai` is permanent once installed (its RISK-003). SDR-00002 binds the status mod's band, work pane and command names. The request (`work/20261107-plugin-only-install/request.md`, section 1) folds picket-status and picket-markdown into `picket@picketai` with a config off switch, which departs from SDR-00002 D-003 (`M↓` hidden when picket-markdown is not installed) and D-004 (the mods as separately named plugins); the product owner ruled on 2026-11-08 that the request, section 1, stands in for the superseding SDR (OQ-007), so D-002 and D-003 proceed with no SDR written first. Kernel verbs, lanes, agents, work-item state, the `npm run claude` flow and the bench stay as they are.

## Decisions

### D-001: One npm package whose root is the plugin
**Decision:** Infrastructural decision. `npm run build` writes `dist/package.json` (name, version, description, licence, author, repository, homepage, bugs, `type: module`, `engines`, `bin: {"picket": "bin/picket.mjs"}`, a `files` list that ends by excluding `**/*.test.*`, no scripts, no dependencies) and copies `LICENSE` and `README.md` into `dist/`, so the package root holds `.claude-plugin/plugin.json`, `bin/`, `hooks/` and `skills/` directly. The release job publishes `./dist` under the dist-tag `.github/scripts/release.mjs` already derives (`alpha` for `1.0.0-alpha.N`). The root `package.json` becomes `"private": true` and loses `bin` and `files`, so a publish from the root fails instead of shipping the source tree. The same package serves `npx @picketai/picket@alpha <verb>` and the npm plugin source of D-004. The first publish from `dist/` is [IRREVERSIBLE]: a published version cannot be reused.
**Instead of:** keep the repository root as the package with the plugin under `dist/`: an npm plugin source installs the package root as the plugin, so the plugin would sit one folder down and the manifest would not be found.
**Risks:**
- **RISK-001** A file the plugin needs at run time is left out of the tarball (the hidden `.claude-plugin/` folder, the status line bundle). Mitigation: a repo test packs `dist/` with `npm pack --dry-run --json` and names each required path; the release dry run prints the list.
- **RISK-002** `npm version` and `sync-version` keep writing the root and `src/.claude-plugin/plugin.json` only. Mitigation: the build copies the version from the root into `dist/package.json`, and a test compares the three.

### D-002 (r5): The status and Markdown mods are composed into the one hooks module of the picket plugin
**Decision:** Infrastructural decision. The build writes one `dist/hooks/hooks.json` holding Picket's command hooks and `"modules": ["./mods/index.tsx"]`, one entry: Claude Code 2.1.319 refuses a second ("hooks.json `modules` names one hooks module per plugin; a second entry is refused", `work/20261107-plugin-only-install/phases/4.block.md`). The built mods move from `dist/mods/<name>/` to `dist/hooks/mods/<name>/`, keeping their `hooks/` and `shared/` folders, so module paths stay below the folder of `hooks.json`; the existing mod manifests list `./index.tsx` beside their `hooks.json`, so a module path resolves from that folder, and the binary refuses one that leaves the plugin directory ("The module path leaves the plugin directory"). The one module is a new `src/mods/index.tsx`, built to `dist/hooks/mods/index.tsx`, and it alone exports `register`. Each mod's `hooks/index.tsx` exports its handlers as named functions with the engine's handler signature (`$, e, next`) and registers nothing. The composing module calls `on` once per event and matcher pair: a matched handler keeps its mod's matcher (`command.run` per command, `ui.render` and `ui.scroll` per component and pane id), and an event handled without a matcher is registered once, since the validator refuses a repeat ("on(\"session.start\") is registered twice without a matcher"). Today only `session.start` is unmatched in both mods; its one handler runs the status handler with a `next` that runs the Markdown handler with the real `next`, so each mod keeps its pass-through behaviour. Calling both mods' old `register` through a deduplicating `on` wrapper was rejected: it would copy the engine's duplicate rule into our code and hide which mod owns a handler. The two contract files merge into one self-contained `src/mods/types/index.d.ts`, built to `dist/hooks/mods/types/index.d.ts` and named by `"types"` in `src/.claude-plugin/plugin.json`; it declares `PluginState['picket']` with both mods' keys (they do not overlap) and renames the Markdown `PaneView` to `DocPaneView`. Every `atom({ plugin: ... })` names `picket`. The picket-session stub and its folder are deleted. Shipping the mods inside `picket@picketai` is the user's decision in the request, section 1; it departs from SDR-00002 D-004's separately named plugins (the command names `/picket-session` and `/picket-markdown` stay), and the product owner ruled on 2026-11-08 that the request stands in for the superseding SDR (OQ-007, resolved). `src/lib/mods.mts` keeps one entry per mod (summary, whether it has an off switch) and a `RETIRED_PLUGINS` list of the three old plugin names, which `init` and `uninstall` read; no marketplace carries renames for them.
**Instead of:** keep the mods as separate plugins served from the same npm package: each would need its own marketplace entry and npm source, and a user would still install and update three plugins.
**Risks:**
- **RISK-003** `$.store` and `$.state` are kept per plugin, so the work pane's Done list (`DONE_KEY` in `src/mods/status/hooks/pane-actions.ts:98`) starts empty after the move. Mitigation: the CHANGELOG says so and tells users to mark those sessions done again; no migration is attempted.
- **RISK-004** The engine's `$.process.run` may not see plugin `bin/` on PATH, so with no global copy the band's `picket list` call returns nothing. Mitigation: OQ-001 and a deferred live check before release.
- **RISK-013** The validator may also refuse a matched and an unmatched handler for one event (status's `tool.call` for `Bash` beside Markdown's unmatched `tool.call`); the developer's probe did not try it. Mitigation: T-4.3's validate run shows it; if refused, the composing module registers one unmatched `tool.call` and runs the status handler only for an event its `{ tool: 'Bash' }` matcher would select.

### D-003 (r3): The Markdown pane has an off switch in `.picket/config.json`
**Decision:** Infrastructural decision. `mods.markdown: false` in `.picket/config.json` turns the pane off; absent or `true` keeps it. One function, `modEnabled(config, name)` in a new `src/lib/shared/mod-switch.mts`, decides it; `config.mjs` uses it to check the key (`mods` joins `KNOWN_KEYS`, a non-boolean value warns), and the build copies it into the mods through `MOD_LIB_SHARED`, so the rule is unit-tested under Node. The Markdown module reads the file with `$.fs.read` under `$.session.root()` at `session.start`; when switched off it registers no command, starts no clock and passes every event through. The status band already hides `M↓` when no `picket-markdown` command is listed (`src/mods/status/hooks/index.tsx:198`), so it needs no change. The switch is the user's decision in the request, section 1. Ratified SDR-00002 D-003 says `M↓` is hidden when picket-markdown is not installed; the product owner ruled on 2026-11-08 that the request stands in for the superseding SDR (OQ-007, resolved), so the visibility rule "hidden when `mods.markdown` is false" applies from phase 4.
**Instead of:** let the user disable the Markdown plugin: after D-002 there is no separate plugin, and Claude Code enables or disables a plugin whole.
**Risks:**
- **RISK-005** The switch is read once per session. Mitigation: the how-to says a change applies from the next session.

### D-004 (r2): The marketplace is declared inline in the project settings, with an npm source
**Decision:** Infrastructural decision, on the user's ruling of 2026-11-08. The published catalog is an inline `settings` marketplace that `init` writes into `.claude/settings.json` as `extraKnownMarketplaces.picketai`: `{"source": {"source": "settings", "name": "picketai", "owner": {"name": "Vlad Apetre"}, "plugins": [{"name": "picket", "source": {"source": "npm", "package": "@picketai/picket", "version": "alpha"}}]}}`. The 2.1.319 binary has this source ("Inline marketplace manifest defined directly in settings.json"; `name` must match the `extraKnownMarketplaces` key; the reconciler writes a synthetic catalog and sees an edit as a source change). The value lives once, as `INSTALL.marketplace` in `src/lib/shared/install.mts`, and a repo test holds its package name and version in step with `package.json` and the dist-tag rule of D-001. The repository-root `.claude-plugin/marketplace.json` stays only for developing Picket: one `picket` entry from `./dist`, no mod entries, no `renames`, and it no longer ships. Committing the entry in user projects is [IRREVERSIBLE] for the marketplace name, as SDR-00001 RISK-003 already holds for `picket@picketai`.
**Instead of:** a GitHub marketplace whose repository-root catalog carries the npm entry: every machine fetches the repository for a one-entry catalog, and that file becomes a second published artifact to keep in step.
**Risks:**
- **RISK-006** The npm source may not accept a dist-tag as `version` (the schema text says "Specific version or version range"). Mitigation: OQ-002 with an exact-version fallback.
- **RISK-012** `claude plugin install` or the teammate install prompt may not handle a settings-declared marketplace whose plugin has an npm source. Mitigation: OQ-004 and the deferred checks T-5.7 and T-5.8.

### D-005: The status line is an optional, self-contained bundle in the plugin data folder
**Decision:** Infrastructural decision. The build bundles the statusline verb into one `dist/statusline.mjs` with every relative import inlined, written as an esbuild stdin entry like the hook entries (`entryOptions` in `scripts/build.mjs`); it reads the status line JSON from stdin, renders through `edgeContext` and prints one line. A new SessionStart hook, `emit.statusline`, copies it to `CLAUDE_PLUGIN_DATA` (set for plugin hooks, per the binary) when the copy is missing or differs, through a temporary file and a rename. `INSTALL.settings.statusLine` becomes `{"type": "command", "command": "node \"$HOME/.claude/plugins/data/picket-picketai/statusline.mjs\""}`, a stable path that survives plugin updates; the old `picket statusline` value stays known as a legacy value so `init`, `uninstall` and `style` treat both as Picket's. `init --statusline` writes it (D-008's phase); without the flag `init` writes none. The `picket statusline` verb stays and prints the same line with no side effects.
**Instead of:** point `statusLine` at the plugin's own copy: the cache path changes with every version, and the status line command gets no `${CLAUDE_PLUGIN_ROOT}`.
**Risks:**
- **RISK-007** The first session after install shows a blank line until the hook has copied the file. Mitigation: blank is the documented result of a failing command; a deferred check confirms it.
- **RISK-008** A user with `CLAUDE_CONFIG_DIR` has the data folder elsewhere. Mitigation: OQ-005; the how-to names the path to edit.

### D-006: Cost leaves Picket; the ledger stays at v2
**Decision:** Persistence of the ledger aggregate. Turn rows lose `session_cost_usd`; the hook stops reading `.picket/state/sessions/<id>.json`; `sessionCostPath` and `STATE_FILES.sessions` go. Rows keep `v: 2`, because `readLedger` drops every row whose `v` is not the current version (`src/lib/shared/ledger.mts:51`), and an old row's extra key is ignored. `src/lib/shared/ledger.mts` gains `turnTokens(row)` (the sum of the four usage fields, 0 when `usage` is null); `picket cost` reports tokens per agent (`by_agent[*].tokens`), per work item and, inside each item, per phase (`by_work[<id>].tokens`, `by_work[<id>].by_phase[<n or "none">]`), and drops every `cost_usd` field and `rowCosts`.
**Instead of:** ledger v3: the version filter would hide every recorded row from `picket cost`, the close repeat check and the escalation history until a migration ran.
**Risks:**
- **RISK-009** A reader elsewhere expects `session_cost_usd`. Mitigation: the only readers are `rowCosts` and the tests (grep of `src/`, `bench/`, `test/`); `bench/schema/ledger-v2.schema.json` never listed it.

### D-007: `picket close` saves an audit line in the work item
**Decision:** `close` computes one line from the item's ledger rows (`work_id` equal to the id) and its state: lane, phase count, tokens per agent through `turnTokens`, bounce and block counts, and wall time from the first to the last row's `ts`. It writes the line to `work/<id>/audit.txt` (added to `WORK_FILES`) before the close commit, so the commit carries it, and prints it as the closing block's `Audit:` line.
**Instead of:** print it only: it is gone once the terminal scrolls, and the close commit already carries `work/<id>/`.
**Risks:**
- **RISK-010** Lead turns without a work item heading carry `work_id: null` and are left out. Mitigation: the line says `tokens` per agent as recorded; it never claims a total for the session.

### D-008 (r2): `init` writes the settings marketplace, retires the old plugins and warns about a shadowing copy
**Decision:** `init` drops `marketplaceRoot()`, the `market` option and every `claude plugin marketplace` command. In order it uninstalls each `RETIRED_PLUGINS` id found in `enabledPlugins` (while the old marketplace still knows them), writes `extraKnownMarketplaces.picketai` as `INSTALL.marketplace` into `.claude/settings.json`, replacing any other value there (a directory path or a GitHub source) with a note naming the old source, and installs `picket@picketai` with project scope. With `--no-install` it still writes the entry and skips both commands. A legacy `picket statusline` value in the project settings is replaced with D-005's value under `--statusline` and removed without it, with a note either way. A new pure function in `src/lib/verbs/init/shadow.mts` walks PATH in order and returns the first `picket` launcher whose real path is outside `<config dir>/plugins/` (the config dir is `CLAUDE_CONFIG_DIR` or `~/.claude`) and outside any folder with an `_npx` segment; `init` prints it as a warning with `npm uninstall -g @picketai/picket`, and skips the check when `PICKET_CHECKOUT` is set (the `npm run claude` flow). `uninstall` removes the retired ids, both status line values, and its closing lines name `npx @picketai/picket@alpha style remove --all` and the global copy only as a leftover.
**Instead of:** compare each hit with the running script's real path: a global copy that runs `init` itself would then pass without a warning.
**Risks:**
- **RISK-011** Replacing the entry's source may leave the user-level marketplace record or the installed plugin from the old source. Mitigation: the install step follows the write; OQ-003 asks how the reconciler treats the change.

## Scope

**In:**
- `dist/package.json`, the release from `dist/`, the root package made private.
- The status and Markdown mods composed into the one hooks module of the picket plugin, one contract, the `mods.markdown` switch, the session stub deleted.
- The inline settings marketplace with an npm source, written by `init`; the root marketplace kept for development only; `init` retiring the old plugins, warning about a shadowing copy, `--statusline`; `uninstall` to match.
- The self-contained status line bundle and its SessionStart copy hook.
- Cost off the status line and the ledger; `picket cost` in tokens; the `close` audit line.
- `docs/how-to.md`, `README.md`, `CHANGELOG.md`, and the build-written `docs/reference/cli.md`, `hooks.md`, `mods.md`.

**Out:**
- `npm run claude` and `scripts/claude.mjs`.
- Kernel verbs other than `init`, `uninstall`, `cost`, `close`, `statusline` and `style`'s status line component; lanes, agents, work-item state fields.
- The bench and how it reads cost from `claude -p`; `bench/schema/ledger-v2.schema.json`.
- The verb class of `statusline` in the Bash guard.

## Phase 1: Cost leaves the status line and the ledger

**Touch set:**
- `src/lib/verbs/statusline/index.mts`: remove recordSessionCost and its imports
- `src/lib/verbs/statusline/facts.mts`: drop the cost fact
- `src/lib/verbs/statusline/layout.mts`: drop costGroup from both layouts
- `src/lib/verbs/statusline/facts.test.mts`: cost-free facts
- `src/lib/verbs/statusline/index.test.mts`: no write assertions
- `test/cli/statusline.test.mjs`: replaces the snapshot tests
- `src/lib/shared/paths.mts`: remove sessionCostPath and sessions
- `src/lib/shared/paths.test.mts`: export list and refusal test
- `src/lib/shared/ledger.mts`: TurnRow field, turnTokens
- `src/lib/shared/ledger.test.mts`: round trip and old rows
- `src/lib/hooks/emit/ledger/index.mts`: remove the cost-file reader
- `src/lib/hooks/emit/ledger/index.test.mts`: row without the field
- `src/lib/verbs/cost/index.mts`: tokens per agent, item, phase
- `src/lib/verbs/cost/index.test.mts`: token sums replace cost sums
- `test/cli/cost.test.mjs`: fixtures without session_cost_usd
- `src/lib/verbs.mts`: cost summary names tokens
- `docs/reference/cli.md`: regenerated by the build
- `src/skills/inspecting/SKILL.md`: Spent line in tokens

**Changes:** The statusline verb only renders: `recordSessionCost` goes, `Facts` loses `cost`, the layout loses its cost group, and `StatuslineInput` drops its `cost` field (the JSON still carries it; it is ignored). `paths.mts` loses `sessionCostPath` and `STATE_FILES.sessions`. `TurnRow` loses `session_cost_usd`; `ledger.mts` exports `turnTokens(row: TurnRow): number`; `VERSION` stays 2. The ledger hook writes the row without the field. `CostSummary` loses `cost_usd`; `AgentSummary` swaps `cost_usd` for `tokens`; a new `by_work: Record<string, { tokens: number; by_phase: Record<string, number> }>` keys phases by number, with `"none"` for a null phase; `rowCosts` goes. `renderCost` prints the total tokens where `$` stood (`<turns> turns · <tokens> tokens · cache ...`). The `cost` summary in `VERB_NAMES` names tokens instead of spend; stage the regenerated `docs/reference/cli.md` before `npm test`. The inspecting skill's output line becomes `Spent: <tokens> tokens · <turns> turns · cache <ratio> · <tok/line> tokens per accepted line`.

**Done when:**
- **T-1.1** `test/cli/statusline.test.mjs` runs `picket statusline` with `src/lib/verbs/statusline/statusline-input.test.json` (which carries `cost.total_cost_usd: 4.12`) under a temporary `CLAUDE_PROJECT_DIR` holding `.picket/`, and asserts a non-empty line containing no `$` and no folder `.picket/state/sessions` afterwards.
- **T-1.2** A ledger test appends a turn row through `appendLedger` and reads it with `readLedger`: the row has `v: 2`, its `usage`, and no `session_cost_usd` key.
- **T-1.3** `readLedger` on a file holding an old v2 turn row with `"session_cost_usd": 2.5` returns that row, and `summarizeLedger` counts its usage in `tokens_total`.
- **T-1.4** `summarizeLedger` on rows from `developer` and `reviewer` across phases 1, 2 and a null phase of `w1`, plus rows of `w2`, returns `by_agent.developer.tokens`, `by_work.w1.tokens`, `by_work.w1.by_phase["1"]`, `["2"]` and `["none"]`, each equal to the sum of the four usage fields of its rows, and its JSON text contains no `cost_usd`.
- **T-1.5** `picket cost --human` on the same rows prints `tokens` and no `$`.
- **T-1.6** Drive: with `CLAUDE_PROJECT_DIR` set to a temporary folder holding a copy of this repository's `.picket/state/ledger.jsonl` (v2 rows with `session_cost_usd: null`), `node dist/bin/picket.mjs cost --human` exits 0 and prints a token count, and `node dist/bin/picket.mjs cost` prints JSON with `by_work` and no `cost_usd`.
- **T-1.7** `npm test` passes with the regenerated `docs/reference/cli.md` staged.

## Phase 2: Close saves an audit line

**Touch set:**
- `src/lib/verbs/close/audit.mts`: new, builds the line
- `src/lib/verbs/close/audit.test.mts`: new unit tests
- `src/lib/verbs/close/close.mts`: write audit before commit
- `src/lib/verbs/close/block.mts`: print the Audit line
- `src/lib/verbs/close/index.test.mts`: block and commit assertions
- `test/cli/close.test.mjs`: spawned close writes the file
- `src/lib/shared/work/files.mts`: audit.txt in WORK_FILES
- `src/lib/shared/ledger.mts`: turnTokens from phase 1, read only
- `src/lib/shared/format.mts`: compactTokens and minutes, read only

**Changes:** `audit.mts` exports `auditLine(state: WorkState, phases: number, rows: LedgerRow[]): string`, pure, fed the item's rows (`work_id === id`). The line reads `<lane> · phases <n> · tokens <agent> <compactTokens>, ... · bounces <n> · blocks <n> · wall <minutes>`, agents in name order with a null agent shown as `unknown`, `tokens none` when no turn row exists, and `wall -` with fewer than two rows. `Closing` gains `audit: string`. `close()` computes it after `refuseUnlessClosable` and writes it with a trailing newline to `workFile(root, id, "audit.txt")` on both the repository and the no-repository path, before `commitClose`, so the `add: [workRel(id)]` of the close commit carries it. `closingBlock` prints `Audit: <line>` right after the lane line.

**Done when:**
- **T-2.1** `auditLine` on a design item with 2 phases and rows of `w1` (two `developer` turns, one `reviewer` turn, one `bounce`, one `block`, `ts` from 10:00:00 to 11:30:00) plus one `developer` turn of `w2` returns the lane, `phases 2`, `developer` and `reviewer` tokens equal to `compactTokens` of their `w1` sums only, `bounces 1`, `blocks 1` and `wall` equal to `minutes(5400000)`.
- **T-2.2** `auditLine` with no rows returns `tokens none`, `bounces 0`, `blocks 0` and `wall -`.
- **T-2.3** After `close` in a temporary git project, `work/<id>/audit.txt` holds exactly the line, and the result's `committed` list contains `work/<id>/audit.txt`.
- **T-2.4** `closingBlock` prints `Audit: ` followed by the same text as `audit.txt`, on the line after the lane line.
- **T-2.5** Drive: in a temporary git project (`CLAUDE_PROJECT_DIR` set to it), open a fast item with the built CLI, mark it done with `picket set <id> status=done`, then `node dist/bin/picket.mjs close <id> --human` prints an `Audit:` line and `work/<id>/audit.txt` exists.
- **T-2.6** `npm test` passes.

## Phase 3: The self-contained status line and its copy hook

**Touch set:**
- `scripts/build.mjs`: bundle dist/statusline.mjs
- `test/repo/build.test.mjs`: bundle imports only node modules
- `src/lib/hooks.mts`: emit.statusline on SessionStart
- `src/lib/hooks/emit/statusline/index.mts`: new copy hook
- `src/lib/hooks/emit/statusline/index.test.mts`: new unit tests
- `src/lib/hooks/hook-spec.mts`: HookContext carries env, read only
- `src/lib/shared/context.mts`: edgeContext for the entry, read only
- `test/repo/hook-list.test.mjs`: SessionStart group gains the hook
- `src/lib/shared/install.mts`: new statusLine, legacy value, matcher
- `src/lib/shared/install.test.mts`: matcher cases
- `src/lib/shared/styling/components/statusline/index.mts`: legacy value counts as Picket's
- `src/lib/verbs/init/init.mjs`: holder check uses the matcher
- `src/lib/verbs/uninstall/uninstall.mts`: removes either value
- `src/lib/verbs/uninstall/uninstall.test.mts`: both values removed
- `src/lib/verbs/statusline/statusline-input.test.json`: fixture for the bundle run
- `test/cli/statusline.test.mjs`: runs the bundle alone
- `src/lib/verbs.mts`: statusline summary
- `docs/reference/hooks.md`: regenerated by the build
- `docs/reference/cli.md`: regenerated by the build

**Changes:** The build adds one bundle, `dist/statusline.mjs`, from an esbuild stdin entry beside `entryOptions` (bundle on, no relative externals, the banner, `target: node22`): it reads stdin, runs the statusline verb's parse and run with `edgeContext`, writes the line and exits 0 whatever happens. The hook `emit.statusline` (`HOOKS` entry on SessionStart with no matcher, summary naming the copy) reads `CLAUDE_PLUGIN_DATA` from `ctx.env`; without it, or without the source file, it returns null. Otherwise it compares `<pluginRoot()>/statusline.mjs` with `<data>/statusline.mjs` byte for byte and, when they differ or the target is missing, writes a temporary file in the data folder and renames it over the target; it never throws and always returns null. `install.mts` sets `INSTALL.settings.statusLine` to D-005's command, adds `LEGACY_STATUS_LINE = { type: "command", command: "picket statusline" }` and `isPicketStatusLine(value)`, true for either; init's holder check, `uninstall`'s `picketEntries` and `withoutPicket`, and the style component's remove use it. `init` keeps writing a statusLine by default until phase 6. Stage the regenerated reference pages before `npm test`.

**Done when:**
- **T-3.1** After `npm run build`, `dist/statusline.mjs` exists, starts with the generated-file banner, and every import or require specifier in it starts with `node:` (build test).
- **T-3.2** A test copies `dist/statusline.mjs` alone into a new temporary folder, runs `node statusline.mjs` there with the fixture JSON on stdin, and gets exit 0 and a line containing `Opus 5.5`, the fixture's `display_name`.
- **T-3.3** The hook's unit tests, with `CLAUDE_PLUGIN_DATA` a temporary folder: it creates `statusline.mjs` when missing; leaves an identical copy's `mtimeMs` unchanged; replaces a copy with different bytes; and returns null with no file written when `CLAUDE_PLUGIN_DATA` is unset.
- **T-3.4** `dist/hooks/hooks.json` runs `emit.statusline.mjs` in the SessionStart group after the three inject hooks (`EXPECTED_GROUPS`), and the cold-start budget test covers it.
- **T-3.5** `uninstall` removes a project `statusLine` equal to `picket statusline` or to the new command and keeps `{"type": "command", "command": "other"}`; `isPicketStatusLine` is true for both values and false for that one.
- **T-3.6** [DEFERRED: QA, the release QA pass] On Windows, with Git Bash installed and again with PowerShell only, the project `statusLine` command `node "$HOME/.claude/plugins/data/picket-picketai/statusline.mjs"` draws the line.
- **T-3.7** [DEFERRED: QA, the release QA pass] In the first session after a fresh install the status line is blank, and it draws from the next refresh after SessionStart has run.
- **T-3.8** `npm test` passes with the regenerated `docs/reference/hooks.md` and `docs/reference/cli.md` staged.

## Phase 4: The mods fold into the picket plugin

**Touch set:**
- `scripts/build.mjs`: mods under dist/hooks/mods, modules, marketplace
- `scripts/watch.mjs`: rebuilds mods in the new place
- `scripts/test.mjs`: mods step validates dist
- `scripts/docs.mjs`: mods page columns
- `src/lib/mods.mts`: entry shape and RETIRED_PLUGINS
- `src/lib/shared/mod-switch.mts`: new, modEnabled
- `src/lib/shared/mod-switch.test.mts`: new unit tests
- `src/lib/shared/config.mjs`: mods key check
- `src/lib/shared/config.schema.json`: mods property
- `test/kernel/config.test.mjs`: warnings for mods
- `src/.claude-plugin/plugin.json`: types path
- `src/mods/types/index.d.ts`: new merged contract
- `src/mods/index.tsx`: new, the one composing module
- `src/mods/status/types/`: deleted, merged into the contract
- `src/mods/markdown/types/`: deleted, merged into the contract
- `src/mods/session/`: deleted, retired stub
- `src/mods/status/hooks/index.tsx`: exported handlers, atom plugin
- `src/mods/status/hooks/index.test.tsx`: runs under the composed module
- `src/mods/status/hooks/band.ts`: type import path
- `src/mods/status/hooks/detail.ts`: type import path
- `src/mods/status/hooks/pane.tsx`: type import path
- `src/mods/status/hooks/pane-actions.ts`: atom plugin, type path
- `src/mods/status/hooks/session-files.ts`: type import path
- `src/mods/status/hooks/work-pane.ts`: type import path
- `src/mods/status/hooks/band.test.ts`: type import path
- `src/mods/status/hooks/detail.test.ts`: type import path
- `src/mods/status/hooks/work-pane.test.ts`: type import path
- `src/mods/markdown/hooks/index.tsx`: exported handlers, off switch
- `src/mods/markdown/hooks/index.test.tsx`: off-state module test
- `src/mods/markdown/hooks/picket-markdown.test.tsx`: mounts name plugin picket
- `src/mods/markdown/hooks/data.ts`: atom plugin, type path
- `src/mods/markdown/hooks/actions.ts`: type import path
- `src/mods/markdown/hooks/view.tsx`: type import path
- `src/lib/verbs/init/init.mjs`: installs no mod plugins
- `src/lib/verbs/uninstall/uninstall.mts`: plugin ids from RETIRED_PLUGINS
- `.claude-plugin/marketplace.json`: build-written, picket from dist only
- `docs/reference/mods.md`: regenerated by the build
- `test/repo/mods.test.mjs`: new layout and leak scan
- `test/repo/mod-contracts.test.mjs`: merged contract path
- `test/repo/plugin-layout.test.mjs`: marketplace and mod manifests
- `test/repo/build.test.mjs`: test files under dist/hooks/mods
- `test/repo/package.test.mjs`: shipped mod paths
- `test/repo/release.test.mjs`: no built mod manifest
- `test/timing/budgets.test.mjs`: walks dist/hooks [INFERRED]
- `test/repo/markdown-paths.test.mjs`: cited dist paths [INFERRED]

**Changes:** Delete `src/mods/session/`, `src/mods/status/types/` and `src/mods/markdown/types/`; list them on the block so the route commits the deletions. The merged contract holds every exported type of both old files, `DocPaneView` for Markdown's `PaneView`, and one `PluginState['picket']` with the union of both key sets, with no import. Mods import it as `'../../types'`. `MODS` becomes `{ status: { summary, switch: null }, markdown: { summary, switch: "mods.markdown" } }`; `RETIRED_PLUGINS = ["picket-status", "picket-markdown", "picket-session"]`. `buildMods` copies each mod's `hooks/` and shared files to `dist/hooks/mods/<name>/`, `src/mods/index.tsx` to `dist/hooks/mods/index.tsx`, the contract to `dist/hooks/mods/types/index.d.ts`, writes no mod manifest, and `hooksJson` adds `modules: ["./mods/index.tsx"]`. Each mod's `hooks/index.tsx` drops `export const register` and exports its handlers by name; `src/mods/index.tsx` imports them from `'./status/hooks/index'` and `'./markdown/hooks/index'` and registers them as D-002 says. The mod tests run against the plugin's one module, so a test that counts registered commands or mounted views sees both mods; mounts name plugin `picket`. `MOD_LIB_SHARED` gains `mod-switch.mts`; `modEnabled(config: unknown, name: string): boolean` is false only for `config.mods[name] === false`. `config.mjs` adds `mods` to `KNOWN_KEYS` and warns on a non-object, an unknown mod name or a non-boolean. The Markdown module reads `<session root>/.picket/config.json` with `$.fs.read` at `session.start`, parses it in a try, and when `modEnabled` is false sets a module flag that makes every handler call `next(e)` only. `marketplaceJson` writes only the `picket` entry from `./dist`, for developing Picket (D-004). `scripts/test.mjs` runs `claude plugin validate --strict dist`, then `claude plugin test dist`.

**Done when:**
- **T-4.1** After `npm run build`, `dist/hooks/hooks.json` holds the command hook groups of `EXPECTED_GROUPS` and `"modules"` equal to `["./mods/index.tsx"]`, which resolves from the folder of `hooks.json` to a file whose text matches `^export const register\b` and holds exactly one `on(` call for `session.start`; neither `dist/hooks/mods/status/hooks/index.tsx` nor `dist/hooks/mods/markdown/hooks/index.tsx` matches `^export const register\b`.
- **T-4.2** `dist/mods/` does not exist, no `plugin.json` exists under `dist/hooks/mods/`, and `dist/.claude-plugin/plugin.json` names in `"types"` an existing file that declares `'picket'` in `PluginState` and holds no `import`.
- **T-4.3** Drive: after `npm run build`, `claude plugin validate --strict dist` prints `Validation passed`, and its output contains neither `a second entry is refused` nor `registered twice without a matcher`.
- **T-4.4** `modEnabled` is true for no config, a config without `mods`, and `mods.markdown: true`, and false for `mods.markdown: false`; the config check warns for `"mods": {"markdown": "no"}` and for `"mods": {"other": false}`, and not for `"mods": {"markdown": false}`.
- **T-4.5** The leak scan finds every import in a built mod to be the engine's module or a file under `dist/hooks/mods/`, and still reports its planted leaks.
- **T-4.6** `.claude-plugin/marketplace.json` lists only `picket` with source `./dist` and has no `renames` key; `docs/reference/mods.md` has rows for status and markdown, names `mods.markdown`, and has no `picket-session`; `npm test` passes with both files staged.
- **T-4.7** [DEFERRED: QA, the release QA pass] In a live session of an install with no global copy, the band shows the open item and its next step, and with `"mods": {"markdown": false}` the band shows no `M↓` and `/picket-markdown` is not offered.
- **T-4.8** `src/mods/markdown/hooks/index.test.tsx`, run by the mods step (`claude plugin test dist`, see OQ-006), mocks `fs.read` of `.picket/config.json` with `{"mods": {"markdown": false}}` and asserts that `session.start` registers no `picket-markdown` command and schedules no clock, and that an `AssistantMessage` render returns what `next` returns unchanged; with the config file absent it asserts that both `picket-markdown` and `picket-session` are registered.

## Phase 5: One package, published from dist

**Touch set:**
- `scripts/build.mjs`: dist/package.json, LICENSE, README
- `package.json`: private, no bin, no files, test:mods
- `.github/workflows/release.yml`: publish ./dist
- `test/repo/package.test.mjs`: packs dist
- `test/repo/plugin-layout.test.mjs`: package assertions
- `test/repo/release.test.mjs`: workflow pins

**Changes:** The build writes `dist/package.json` from the root `package.json` (D-001's fields; `version` copied; no `scripts`, `devDependencies`, `devEngines` or `imports`) and copies `LICENSE` and `README.md` into `dist/`. The root `.claude-plugin/marketplace.json` is no longer shipped (D-004 r2). The root `package.json` gains `"private": true` and drops `bin` and `files`. Its `test:status`, `test:markdown` and `test:session` scripts, which still name `dist/mods/`, give way to one `"test:mods": "claude plugin validate --strict dist && claude plugin test dist"`, the same two commands as the mods step, since the mods are now one plugin. Both publish steps of `release.yml` publish `./dist` with `--access public --tag "$DIST_TAG"`; the publish job still runs `npm ci`, which builds.

**Done when:**
- **T-5.1** After `npm run build`, `dist/package.json` has name `@picketai/picket`, the version of the root `package.json` and of `src/.claude-plugin/plugin.json`, `bin.picket` equal to `bin/picket.mjs`, `engines.node` `>=22`, and no `scripts` or `dependencies` key.
- **T-5.2** `npm pack --dry-run --json --ignore-scripts` run in `dist/` lists `package.json`, `.claude-plugin/plugin.json`, `bin/picket`, `bin/picket.cmd`, `bin/picket.mjs`, `hooks/hooks.json`, `hooks/mods/index.tsx`, `hooks/mods/status/hooks/index.tsx`, `hooks/mods/markdown/hooks/index.tsx`, `hooks/mods/types/index.d.ts`, `statusline.mjs`, `LICENSE` and `README.md`, and no path ending in `.mts` or containing `.test.`.
- **T-5.3** The root `package.json` has `"private": true`, no `bin` or `files` key, no `test:status`, `test:markdown` or `test:session` script, no text `dist/mods/`, and `scripts.test:mods` equal to `claude plugin validate --strict dist && claude plugin test dist`.
- **T-5.4** The T-5.2 file list holds no `marketplace.json` at any depth.
- **T-5.5** `release.test.mjs` asserts that the publish and dry-run steps run `npm publish` on `./dist` with `--tag "$DIST_TAG"`, after the test, build-on-22 and mods jobs.
- **T-5.6** Drive: `npm pack ./dist --pack-destination <scratch folder>`, then `npx --yes --package <tarball> picket help` prints the verb list.
- **T-5.7** [DEFERRED: operations, the first alpha publish] After the release job publishes, in a scratch project whose `.claude/settings.json` holds D-004's settings marketplace (written by `npx @picketai/picket@alpha init`), `claude plugin install picket@picketai --scope project` succeeds, and `claude plugin details picket@picketai` lists the skills, the four agents and the hooks.
- **T-5.8** [DEFERRED: operations, the first alpha publish] A fresh clone of that scratch project, opened in Claude Code on a machine without Picket, prompts to install `picket@picketai` from the settings-declared marketplace, and accepting installs it.

**Irreversible:** the publish runs in the release job after this phase. Before pushing the first tag, capture `npm view @picketai/picket dist-tags versions --json` and the T-5.2 file list.

## Phase 6: init and uninstall for the plugin-only install

**Touch set:**
- `src/lib/shared/install.mts`: settings marketplace constant
- `test/repo/release.test.mjs`: constant in step with package
- `.github/scripts/release.mjs`: distTag rule, read only
- `src/lib/verbs/init/init.mjs`: steps, statusline option, warnings
- `src/lib/verbs/init/index.mts`: --statusline flag, warning render
- `src/lib/verbs/init/shadow.mts`: new, PATH shadow rule
- `src/lib/verbs/init/shadow.test.mts`: new unit tests
- `src/lib/verbs/init/index.test.mts`: install order, status line
- `test/cli/init.test.mjs`: spawned init with --statusline
- `src/lib/verbs/uninstall/uninstall.mts`: retired ids
- `src/lib/verbs/uninstall/index.mts`: closing lines
- `src/lib/verbs/uninstall/uninstall.test.mts`: retired id plans
- `src/lib/verbs/uninstall/index.test.mts`: closing text
- `src/lib/util/process.mts`: programRunner, read only
- `docs/reference/cli.md`: regenerated by the build

**Changes:** `INSTALL.marketplace` is D-004's `extraKnownMarketplaces.picketai` value, with `source: "settings"`, `name: MARKETPLACE`, the owner, and the one `picket` plugin whose source is `{ source: "npm", package: "@picketai/picket", version: "alpha" }`; a repo test asserts the package equals the root `package.json` name and the version equals `distTag` of the root version. `init(root, { install, exec, home, env, statusline })` drops `market` and the `ADD_MARKETPLACE` command. After the four settings-file steps come the retired uninstalls (one `plugin uninstall <id> --scope project` per id in `enabledPlugins`, skipped under `--no-install`), a `marketplace` step that edits `.claude/settings.json` itself (unchanged when `extraKnownMarketplaces.picketai` deep-equals the constant, `created` when absent, `updated` with a `detail` naming the old source otherwise; it runs under `--no-install` too), and the `plugin` install (skipped under `--no-install`). The by-hand hint names only `claude plugin install picket@picketai --scope project`. `mergeSettings` writes `statusLine` only with `statusline: true` and no other holder; a legacy value is replaced under the flag and removed without it, each with a `detail` note. `shadowingPicket({ pathEnv, platform, home, configDir, realpath, isFile }): string | null` checks `picket` (POSIX) or `picket.cmd` (win32) in each PATH entry in order and skips hits whose real path is under `<configDir ?? home/.claude>/plugins/` or has an `_npx` segment. The report gains `warnings: string[]`, rendered as `WARNING: <line>`; it never fails `init`. `PICKET_CHECKOUT` skips the check. `uninstall` lists `RETIRED_PLUGINS` and `picket@picketai`; `CLOSING` names `npx @picketai/picket@alpha style remove --all` and `npm uninstall -g @picketai/picket` as removing a global copy left from an earlier install.

**Done when:**
- **T-6.1** With a recording exec and settings holding no marketplace, `init` leaves `extraKnownMarketplaces.picketai` deep-equal to `INSTALL.marketplace` and records exactly one command, `claude plugin install picket@picketai --scope project`; the repo test finds the constant's npm `package` equal to `@picketai/picket` from `package.json` and its `version` equal to `distTag` of the root version.
- **T-6.2** With settings whose `extraKnownMarketplaces.picketai` has a directory source, and again a `{"source": "github", "repo": "picketai/picket"}` source, plus `enabledPlugins` for picket-status, picket-markdown and picket-session: the recorded commands are the three `plugin uninstall <id>@picketai --scope project`, then `plugin install picket@picketai --scope project`, in that order; the entry ends deep-equal to `INSTALL.marketplace`; the marketplace step reports `updated` naming the old source; no command contains `marketplace`.
- **T-6.3** Without `--statusline`, `init` on fresh settings writes no `statusLine`, and on settings holding `picket statusline` removes it with a note; with `--statusline` it writes D-005's value or replaces the legacy one, and leaves settings unchanged with a note when `.claude/settings.local.json` holds a statusLine.
- **T-6.4** `shadowingPicket` with PATH `[<npx cache>/_npx/ab12/node_modules/.bin, /usr/local/bin, <home>/.claude/plugins/cache/picketai/picket/1.0.0/bin]`, each holding `picket`, returns `/usr/local/bin/picket`; with only the first and last it returns null; with `configDir` set it skips `<configDir>/plugins/` instead; on win32 it matches `picket.cmd` only.
- **T-6.5** `renderInit` prints `WARNING:` with the shadowing path and `npm uninstall -g @picketai/picket` when a shadow is found, and the action still returns done; with `PICKET_CHECKOUT` set no warning appears.
- **T-6.6** `uninstall --dry-run` on settings enabling `picket@picketai` and the three retired ids plans four uninstalls and the marketplace removal, and the closing lines contain `npx @picketai/picket@alpha style remove --all`.
- **T-6.7** Drive: `node dist/bin/picket.mjs init --root <temporary git project> --no-install --statusline` writes `.claude/settings.json` with D-005's `statusLine`, D-004's settings marketplace and no absolute path, and a second run reports `settings: unchanged` and `marketplace: unchanged`.
- **T-6.8** [DEFERRED: QA, the release QA pass] In a session of the plugin-only install, `command -v picket` in the Bash tool names `bin/picket` under the plugin cache, and on Windows the PowerShell tool resolves `picket.cmd` there.

## Phase 7: Docs and changelog

**Touch set:**
- `docs/how-to.md`: install, update, remove, troubleshooting
- `README.md`: install line, layout lines for mods
- `CONTRIBUTING.md`: mods folder, mods step, init paragraph
- `CHANGELOG.md`: alpha.6 migration notes
- `docs/reference/cli.md`: generated, read only
- `docs/reference/mods.md`: generated, read only
- `test/repo/markdown-paths.test.mjs`: cited paths must exist, read only
- `test/repo/dashes.test.mjs`: dash rule for docs, read only

**Changes:** `docs/how-to.md`: install with `npx @picketai/picket@alpha init`; check the install (`/plugin`, `picket list` in a session); a teammate who clones is prompted for the committed marketplace and plugin; update with `/plugin update`; uninstall with `npx @picketai/picket@alpha uninstall`; troubleshooting for `picket: command not found` (plugin not enabled, session not restarted) and for a global copy shadowing the plugin; the optional status line (`init --statusline`, the data folder path, `CLAUDE_CONFIG_DIR`); the Markdown pane switch (`"mods": {"markdown": false}`, next session); status and cost become status and tokens. `README.md` replaces the `npm install -g` sentence with the `npx` line, and its layout block stops describing three mod plugins: `src/mods/` holds the status and Markdown mods and the composing module, `dist/hooks/mods/` the built mods inside the picket plugin (D-002), and the root `.claude-plugin/` holds only `picket` from `dist/`, for development (D-004). `CONTRIBUTING.md`: `src/mods/` holds the two mods composed into one hooks module, not three mods; the `mods` test step runs `claude plugin validate --strict dist` and `claude plugin test dist` once; the init paragraph matches D-008 (settings marketplace, only `picket@picketai` installed, retired plugins uninstalled, status line only with `--statusline`). `CHANGELOG.md` under `1.0.0-alpha.6`, "Changed, act on these": re-run `npx @picketai/picket@alpha init`; run `npm uninstall -g @picketai/picket`; picket-status and picket-markdown are now part of picket and the work pane's Done list starts empty; the status line is opt-in; `picket cost` reports tokens, not dollars; the `close` audit line.

**Done when:**
- **T-7.1** `README.md` contains `npx @picketai/picket@alpha init` and none of `npm install -g @picketai/picket`, `one plugin per mod` and `the three mods`; `CONTRIBUTING.md` contains none of `the three mods`, `each mod's`, `picket-status@picketai` and `picket-markdown@picketai`.
- **T-7.2** `docs/how-to.md` contains `npx @picketai/picket@alpha init`, `/plugin update`, `init --statusline`, `mods.markdown`, `npm uninstall -g @picketai/picket` and `command not found`.
- **T-7.3** `CHANGELOG.md`'s `1.0.0-alpha.6` section names re-running init through `npx`, `npm uninstall -g @picketai/picket`, the empty Done list, the opt-in status line and tokens in `picket cost`.
- **T-7.4** Every `npm test` step passes, including the markdown path, dash and docs tests, except the 25 status pane and band tests that fail at 2646b20 on Claude Code 2.1.319 (OQ-008); the mods step fails on those 25 names only.
- **T-7.5** [DEFERRED: the follow-up work item that fixes the 25 status tests, when that item closes] `npm test` passes in full.

## Open questions

- **OQ-001** Does the engine's `$.process.run` see plugin `bin/` on PATH? The binary shows plugin bin folders added only to the Bash and PowerShell tool shells. Owner: QA (release QA pass, T-4.7). Fallback: the mods keep their `picket` launchers; if the band stays empty, a follow-up item has the SessionStart hook record the plugin root in the data folder for a `node <root>/bin/picket.mjs` launcher.
- **OQ-002** Does an npm plugin source accept the dist-tag `alpha` as `version`? Owner: operations (first alpha publish, T-5.7). Fallback: `INSTALL.marketplace` pins the exact package version, the repo test of T-6.1 compares it with `package.json`, and each release asks users to re-run `init`.
- **OQ-003** When `init` swaps an existing `picketai` entry (a directory path or a GitHub source) for the settings source, does the reconciler replace the user-level marketplace record and keep `picket@picketai` installable without a restart? The binary says an edit surfaces as a source change. Owner: QA (release QA pass). Fallback: `init`'s install step reports a failure with the by-hand command, and the how-to says to restart the session and run it.
- **OQ-004** Do `claude plugin install` and the teammate install prompt both work with a settings-declared marketplace whose plugin has an npm source? Owner: operations (first alpha publish, T-5.7 and T-5.8). Fallback: D-004 r1, a GitHub marketplace whose repository-root catalog holds the npm entry, through a further amendment.
- **OQ-005** The data folder name `picket-picketai` is inferred from `~/.claude/plugins/data/picket-inline`, the folder of this checkout's `--plugin-dir` plugin; is it the same for an npm-sourced install, and how should `CLAUDE_CONFIG_DIR` users point the status line? Owner: QA (release QA pass, T-3.6). Fallback: the path lives only in `INSTALL.settings.statusLine`, and the how-to tells `CLAUDE_CONFIG_DIR` users to edit it.
- **OQ-006** Does `claude plugin test dist` find the mod tests under `dist/hooks/mods/`, given it can also refuse with the rollout switch off? Owner: QA (release QA pass). Fallback: `scripts/test.mjs` keeps `validate --strict dist` as the gate and prints that `plugin test` found or ran nothing; T-4.8 then runs by hand with `claude plugin test` on the built Markdown mod folder, and the block records the result.
- **OQ-007** [resolved 2026-11-08] Should a superseding SDR record the user's decision in the request, section 1: the mods ship inside `picket@picketai` (superseding SDR-00002 D-004's plugin naming) and `M↓` is hidden when `mods.markdown` is false (superseding D-003's visibility wording)? Owner: the product owner. Ruling: the request, section 1, stands in for the superseding SDR 00003; phase 4 folds the mods into the picket plugin as D-002 and D-003 describe, with no SDR written first, and does not wait on it.
- **OQ-008** `claude plugin test dist` fails 25 status pane and band tests (`src/mods/status/hooks/index.test.tsx`, T-2.x to T-6.5) on Claude Code 2.1.319. The same 25 fail on clean builds of d8cb1c0 and 2646b20, before this item, so this item does not cause them (`work/20261107-plugin-only-install/phases/4.fixes.md`). Owner: a follow-up work item that fixes those tests. Fallback: until it lands, a criterion that `npm test` passes means every step passes except those 25 (T-7.4); the full pass is T-7.5. T-1.7, T-2.6, T-3.8 and T-4.6 stand as written, because their phases are approved; the lead reads them with the same exception.

## Revision log
- 2026-11-08: D-004 (r2): inline settings marketplace with an npm source replaces the GitHub catalog; root marketplace.json stays for development only; user ruling.
- 2026-11-08: D-008 (r2): init writes the settings marketplace itself and runs no marketplace command; replaces old directory or GitHub entries; user ruling.
- 2026-11-08: D-002 (r2): RETIRED_PLUGINS feeds only init and uninstall; marketplace renames dropped with the GitHub catalog.
- 2026-11-08: D-002 (r3): mods inside picket@picketai cited as the user's decision; departs from SDR-00002 D-004, flagged for a superseding SDR (OQ-007).
- 2026-11-08: D-003 (r2): no longer claims to replace SDR-00002 D-003; visibility rule waits on the superseding SDR; T-4.8 tests the off state.
- 2026-11-08: D-002 (r4): product owner ruled the request stands in for SDR 00003; OQ-007 resolved, strategic flag dropped, phase 4 no longer waits.
- 2026-11-08: D-003 (r3): visibility rule "hidden when mods.markdown is false" applies from phase 4 on the same ruling; strategic flag dropped.
- 2026-11-08: D-002 (r5): one composing module `./mods/index.tsx` registers both mods; 2.1.319 refuses two modules entries and a repeated unmatched event; T-4.1, T-4.3, T-4.8 follow.
