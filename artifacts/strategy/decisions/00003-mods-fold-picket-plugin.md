---
kind: sdr
title: "Mods fold into the picket plugin"
date: "2026-11-08"
audience: stakeholder
sources:
  - "work/20261107-plugin-only-install/request.md"
  - "work/20261107-plugin-only-install/design.md"
  - "work/20261108-session-switch-project-status-line/order.md"
  - "artifacts/strategy/decisions/00002-session-list-merges-picket-status.md"
confidence: high
---

# SDR-00003: Mods fold into the picket plugin

**Status:** Ratified
**Affected contexts:** Picket mods (no charter yet)
**Supersedes:** SDR-00002 D-003 (the `M↓` visibility wording and "always ends with `☰`") and SDR-00002 D-004 (the mods as separately named plugins). The rest of SDR-00002 stands.

## Context

Picket reached a machine as a global npm package plus separate plugins for picket-status and picket-markdown, each installed and updated on its own. The product owner wants Picket to reach a machine only as one Claude Code plugin, with no global copy and settings a team can commit (`work/20261107-plugin-only-install/request.md`, section 1). Separate mod plugins work against that: every project lists three plugins, and an update can leave them at different versions.

## Decision

The status and Markdown mods ship inside `picket@picketai`, composed into the plugin's one hooks module, and the separate picket-status and picket-markdown plugins retire. Anyone who installs Picket gets both panes from one install and one update. The Markdown pane gets an off switch, `"mods": { "markdown": false }` in `.picket/config.json`, because a plugin can only be enabled or disabled whole.

### D-001 One plugin carries the mods

The mods are part of `picket@picketai`, not plugins named after themselves. The command names from SDR-00002 D-004 stay: the work pane opens with `/picket-session` and the Markdown pane with `/picket-markdown`, both immediate commands. `init` uninstalls picket-status, picket-markdown and picket-session where it finds them.

### D-002 The Markdown pane is switched off in config

`M↓` on the band is hidden when `mods.markdown` is false in `.picket/config.json`, in place of "hidden when picket-markdown is not installed". The switch is read at the start of each session; when it is off, the Markdown module registers no command, starts no clock and passes every event through.

### D-003 The work pane is switched off in config

`☰ <sessions>` on the band is hidden when `mods.session` is false in `.picket/config.json`, in place of "the agents line always ends with `☰`". The band itself stays, with its agents line, `◀ <n> need you` and `M↓`. When the switch is off, the status mod registers no `/picket-session`, runs no pane refresh and scans no session or transcript folder. The product owner decided this on 2026-11-08 (`work/20261108-session-switch-project-status-line/request.md`).

## Subdomain and investment implications

**Subdomain affected:** Developer experience mods, Supporting
**Investment shift:** effort moves into one plugin build that composes both mods and into a config switch; it leaves the per-mod manifests, marketplace entries and install steps, which stop being maintained.

## Consequences

**Gains:**
- One install and one update bring the whole of Picket, so the mods cannot drift from the core's version.
- A project commits one marketplace entry and one plugin, which a teammate is prompted to install.

**Costs:**
- A user who wants only the core cannot uninstall the status mod; the band always draws.
- The two mods share one hooks module, so each event without a matcher has one handler that calls both.
- Stored mod state starts afresh under the new plugin name, so the work pane's Done list starts empty once.

**Risks:**
- **RISK-001** [minor] Claude Code's validator allows one hooks module per plugin and one unmatched handler per event; a third mod has to fit into the same composing module. Mitigation: the composing module calls named handlers from each mod folder, so adding a mod adds calls, not registrations.

## Context-map impact

No change to the context map.

## Alternatives considered

### Alternative: Keep picket-status and picket-markdown as separate plugins
Ruled out because three plugins per project is the drift and install cost the plugin-only install exists to remove.

### Alternative: Fold the mods in with no off switch
Ruled out because the Markdown pane is optional for many users, and without a plugin of its own there is no other way to turn it off.

## Tactical follow-up

None. `work/20261107-plugin-only-install` (phase 4) built D-001 and D-002, and `work/20261108-session-switch-project-status-line` (phase 1) built D-003; both closed on 2026-11-08.
