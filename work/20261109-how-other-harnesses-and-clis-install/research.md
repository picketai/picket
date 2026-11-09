---
kind: report
title: How other harnesses and CLIs install, compared with Picket
date: 2026-11-09
audience: developer
sources:
  - work/20261109-how-other-harnesses-and-clis-install/request.md
  - .claude/MEMORY.md
  - package.json
  - dist/package.json
  - dist/.claude-plugin/plugin.json
  - .claude-plugin/marketplace.json
  - src/lib/verbs/init/init.mjs
  - src/lib/verbs/init/shadow.mts (lines 1 to 50)
  - src/lib/shared/install.mts
  - src/lib/verbs/uninstall/uninstall.mts (plan and plugin sections)
  - .github/workflows/release.yml
  - .github/scripts/release.mjs
  - docs/how-to.md (install, status line, updating, removing)
  - README.md
  - artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md
  - npm registry view of @picketai/picket (dist-tags, versions)
  - mattpocock/skills: README.md, .claude-plugin/marketplace.json, .claude-plugin/plugin.json
  - bmad-code-org/BMAD-METHOD: README.md
  - Fission-AI/OpenSpec: README.md, install.md, package.json
  - github/spec-kit: README.md, docs/upgrade.md
  - SuperClaude-Org/SuperClaude_Framework: README.md, PLUGIN_INSTALL.md, package.json
  - eyaltoledano/claude-task-master: README.md, CLAUDE_CODE_PLUGIN.md, package.json
  - buildermethods/agent-os: README.md, CHANGELOG.md, scripts/project-install.sh (header and option lines)
  - shotgun-sh/shotgun: README.md, PIPX_MIGRATION.md
  - gsd-build/get-shit-done: package.json, bin/install.js (help text, option parsing, manifest and patch names by grep)
  - attilaszasz/sdd-pilot: README.md (installation lines)
  - sirmalloc/ccstatusline 2.2.34: README.md
  - jdforsythe/forge: README.md, .claude-plugin/plugin.json
  - microsoft/azure-devops-mcp: docs/GETTINGSTARTED.md, package.json, mcp.json
  - colinhacks/zod 4.6.7: README.md, packages/zod/package.json (grep)
confidence: medium
---
# Report: How other harnesses and CLIs install, compared with Picket

## Summary
Picket's install is a hybrid no peer repeats: `npx @picketai/picket@alpha init` writes project files and then shells out to `claude plugin install`, and every update repeats both tools [VERIFIED]. The peers that target Claude Code use one channel each: a plugin marketplace that updates itself (mattpocock), a file-copying installer with its own update verb (GSD, OpenSpec, spec-kit, agent-os), or an npx entry in a settings file (task-master, ccstatusline) [VERIFIED]. What most likely does not sit right is that Picket needs two tools and a restart to install or update, has no `autoUpdate` on its inline marketplace, and puts its CLI on PATH only inside a session [INFERRED]. A second candidate is the breadth of writes to the shared `.claude/settings.json` (experimental agent-teams flag, permission rules) and an install shape that changed in each alpha [VERIFIED]. The peers' installers were read at their documented entry points, not line by line, so the comparison is about shape, not internals [ASSUMPTION].

## Context
Scope as understood: find what in Picket's install (npx init, plugin and marketplace, what init writes, update, uninstall) differs from the install and update paths of the 14 opensrc repos, and which differences are likely what the user finds off. Changing Picket, unrelated lane or kernel behaviour, and other repos are out of scope.

I read Picket's install code, docs and SDR in full. For each peer I read the README install section and the installer entry point or update guide it points to. I did not read the full source of the large installers (GSD `bin/install.js` is 11,376 lines; I read its option parsing and help text and grepped for its manifest and patch handling). zod and azure-devops-mcp are libraries or servers, not harnesses, and serve only as a baseline.

## Structure
Picket install path: `npx` runs the published `dist/` (`.github/workflows/release.yml:131`, `npm publish ./dist --tag alpha`). `init` runs claude-md, config, gitignore, settings, retire, marketplace, plugin (`src/lib/verbs/init/init.mjs:236-241`). Constants are in `src/lib/shared/install.mts:20-39`.

Peer install shapes, from the sources:

| Repo | Channel | Scope | Update | Uninstall |
|---|---|---|---|---|
| mattpocock/skills | `claude plugin install ...@claude-plugins-official`; also `npx skills` | user | automatic (README) | not documented |
| BMAD-METHOD | `npx bmad-method install`, `npx skills add`, plugin marketplace | project | `bmad setup` (runs `npx skills update`) | not documented |
| OpenSpec | curl, PowerShell or npm global; then `openspec init` | global CLI, project files | `openspec update`, offers CLI upgrade | CLI verbs for stores only |
| spec-kit | `uv tool install specify-cli`; `specify init` | global CLI, project files | `specify self upgrade`, `specify integration upgrade` | not found |
| SuperClaude | `pipx install` then `superclaude install` | user | pipx; plugin route "not yet available" | not found |
| task-master | `claude mcp add ... npx -y`, or global npm then `task-master init` | MCP entry or project | `npx -y ...@latest` | not found |
| agent-os | clone base, then `project-install.sh` | project | rerun with `--commands-only` | not found |
| shotgun | `uvx shotgun-sh@latest` | none | `@latest` each run | `uv tool uninstall` |
| get-shit-done | `npx get-shit-done-cc` with `--claude --global/--local` | user or project | `gsd update` with manifest and patch backup | `--uninstall` |
| sdd-pilot | release archives copied into the project | project | manual replace | not found |
| ccstatusline | `npx -y ccstatusline@latest` TUI writes `statusLine` | user | `@latest` or pinned global | TUI uninstall |
| forge | `/plugin add <url>` or `npx add-skill` | user | not documented | not documented |
| azure-devops-mcp | `npx -y @azure-devops/mcp` in an MCP entry | none | `npx` | remove the entry |
| zod | `npm install zod` | dependency | npm | npm |

## Findings
- **R-001** [VERIFIED] Install is two steps in two tools: `init` writes files, then runs `claude plugin install picket@picketai --scope project` as a subprocess; on failure it reports `failed` and prints the command to run by hand. `src/lib/verbs/init/init.mjs:12,176-184,217-219`.
- **R-002** [VERIFIED] The marketplace is declared inline in project `settings.json` (`source: "settings"`) with the plugin sourced from the npm package at the dist-tag `alpha`. It sets no `autoUpdate`. A different marketplace file at the repo root serves `./dist` for Picket's own development. `src/lib/shared/install.mts:30-38`, `.claude-plugin/marketplace.json:7-10`; no `autoUpdate` match in `src`, `docs` or `README.md`.
- **R-003** [VERIFIED] Install is per project and leaves nothing global; `picket` is on PATH only through the plugin inside a session. Outside one, every verb, including `uninstall`, needs `npx @picketai/picket@alpha <verb>`. `docs/how-to.md:13,39,367-375`. OpenSpec, spec-kit and SuperClaude install a global CLI and write per project; ccstatusline and shotgun, like Picket, run through npx or uvx. OpenSpec `README.md:123-132`, spec-kit `README.md:80`.
- **R-004** [VERIFIED] Update is two steps plus a restart: `claude plugin update picket@picketai --scope project`, restart Claude Code, then rerun `npx ... init` in each project. `docs/how-to.md:361`. Peers give one verb: `bmad setup` (BMAD `README.md:61`), `openspec update` (OpenSpec `README.md:214`), `specify self upgrade` (spec-kit `docs/upgrade.md`), `npx skills@latest update` (mattpocock `README.md:95`). spec-kit separates tool upgrade from project refresh as Picket does, but gives each its own verb and a `self check`.
- **R-005** [VERIFIED] The Claude Code route of mattpocock/skills is a single `claude plugin install` with a claim that it "Updates itself by default"; its Copilot instructions set `"autoUpdate": true` on the marketplace entry in settings. Picket's equivalent inline entry sets none. mattpocock `README.md:33-60`; Picket `install.mts:30-38`. Whether Claude Code auto-updates a non-official marketplace entry without that flag is not verified here [UNKNOWN].
- **R-006** [VERIFIED] `init` edits the team's shared `.claude/settings.json`: allow and ask rules, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, the marketplace key, optionally `statusLine`; plus a `CLAUDE.md` block and a `.gitignore` line. `install.mts:23-29`, `init.mjs:130-137`. Peers that write config write skill or command files into the agent folder (agent-os `.claude/commands/agent-os/`, OpenSpec per-tool files, GSD global or local config dir) or one `statusLine` or MCP entry (ccstatusline, task-master). None grepped sets an experimental env flag.
- **R-007** [VERIFIED] The status line is opt-in (`--statusline`) and can be blank in the first session because the plugin copies `statusline.mjs` into `.picket/state/` only at session start. `docs/how-to.md:83-86`. ccstatusline writes a self-contained command (`npx -y ccstatusline@latest`) and documents the repaint cost of that choice (README: 1082 ms under npx). Picket's command is a local `node` file, so it avoids that cost but has the first-session gap.
- **R-008** [VERIFIED] Uninstall is a separate user-run verb with seven choosable groups, `--dry-run`, and a refusal when not interactive. It shells out to `claude plugin uninstall` and `claude plugin marketplace remove`. `src/lib/verbs/uninstall/uninstall.mts:12,28-30,296-297`. Only GSD (`--uninstall`), shotgun and ccstatusline document an uninstall among the peers; GSD also keeps `gsd-file-manifest.json` and `gsd-local-patches/` so an update does not lose the user's edits (`bin/install.js:7382-7383,7671`).
- **R-009** [VERIFIED] The install shape changed in each alpha, and `init` carries cleanup for the past: a global npm copy (warning only), three retired mod plugins, an older marketplace source (folder or GitHub), a legacy and a data-folder `statusLine`. `init.mjs:196-201,148-157`, `install.mts:41-45`, `docs/how-to.md:45-51,363`. Peers show comparable churn (BMAD v6 to v7, shotgun pipx to uvx, SuperClaude plugin planned) but none carries cleanup of four earlier shapes in one command.
- **R-010** [VERIFIED, corrects the outline] No peer combines an npx file writer with a plugin install. The outline listed SuperClaude among marketplace users: its README says the plugin route is "not yet available" and the working route is `pipx install` then `superclaude install`. forge, mattpocock and BMAD publish plugin marketplaces; BMAD, GSD, task-master and mattpocock also offer an npx or skills-based copy path as an alternative, never together. SuperClaude `README.md:112-130,160-165`.
- **R-011** [VERIFIED] The published package is `dist/` with its own `package.json`; its `files` lists `.claude-plugin` and `dist/.claude-plugin/` holds only `plugin.json`. The npm registry shows versions alpha.1 to alpha.5, and both `latest` and `alpha` point at alpha.5. `dist/package.json:19-35`, `npm view @picketai/picket dist-tags`. Docs say to keep `@alpha`; `latest` would currently resolve to the same build, but the settings marketplace pins `alpha`, so a future stable `latest` will not move existing installs [INFERRED].
- **R-012** [INFERRED] The design reason for the hybrid is recorded: a plugin cannot carry rules, `CLAUDE.md` or permissions, and a pure installer drifts (SDR 00001, ratified, D-001 and Alternatives). The cost named there is risk RISK-003 (marketplace and plugin names become permanent), not the two-step install or update. `artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md`, `.claude/MEMORY.md` Decisions. This makes the two-step cost an unlisted consequence of a ratified decision. [STRATEGIC REVIEW NEEDED]
- **R-013** [VERIFIED] Several peers detect the install channel or leave an escape: spec-kit `self upgrade` detects `uv tool`, `pipx`, `uvx` and a source checkout; OpenSpec `install.md` says never to switch an existing install on its own because "that leaves two copies competing on PATH"; Picket detects a shadowing global copy and warns. `docs/upgrade.md`, OpenSpec `install.md:25`, `shadow.mts:34-50`. Picket's warning prints the remove command and never fails `init`.

## Dependencies and relationships
Picket's install depends on the `claude` CLI on PATH, Node 22 or later, git, and npm registry access when Claude Code fetches the plugin (`docs/how-to.md:21-28`). Peers depend on one runtime each (uv for spec-kit, shotgun and BMAD; Node for GSD, OpenSpec and ccstatusline).

## Risks and unknowns
- [UNKNOWN] Whether Claude Code auto-updates a plugin from an inline `settings` marketplace without `autoUpdate`; neither Picket's docs nor the peer sources settle it.
- [UNKNOWN] Whether `claude plugin install` fails with a clear message on a Claude Code older than the tested 2.1.302; only the failure printing path was read.
- [UNKNOWN] What the user means by "does not sit right"; the report ranks candidates (R-001, R-003, R-004, R-005, R-006) and cannot confirm which one.
- [ASSUMPTION] Peer installers were read at documented entry points. GSD `bin/install.js` (11,376 lines), OpenSpec `src/core/init.ts`, spec-kit `src/` and BMAD `tools/` were not read in full.
- [ASSUMPTION] Coverage: 14 repos, under 60 files in total; README and install or upgrade docs chosen over source because the question concerns user-visible install paths.
- [UNKNOWN] Uninstall paths of OpenSpec, spec-kit, SuperClaude, task-master, agent-os, sdd-pilot and forge: none found in what was read; absence is not confirmed [INFERRED].

## Recommendations
Describing only. The differences most likely to be the unease, in order: the two-tool, restart-needing install and update (R-001, R-004); the missing `autoUpdate` set against mattpocock's self-updating plugin (R-002, R-005); no global `picket` outside a session (R-003); the experimental env flag and permission writes in shared settings (R-006). Whether to keep the hybrid, add an `init` update verb, or change the update path is a design decision [ARCHITECT REVIEW NEEDED].

## Glossary
- **Inline marketplace**: a marketplace declared inside `settings.json` instead of a repository or file, here with an npm package as the plugin source.
- **dist-tag**: a movable npm label (`alpha`, `latest`) that points at one published version.
