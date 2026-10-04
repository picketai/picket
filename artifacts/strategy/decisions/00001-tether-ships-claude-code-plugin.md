---
kind: sdr
title: "Tether ships to Claude Code as a plugin"
date: "2026-10-04"
audience: stakeholder
sources:
  - "work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md"
  - ".claude/MEMORY.md"
confidence: high
---

# SDR-00001: Tether ships to Claude Code as a plugin

**Status:** Ratified
**Affected contexts:** Tether core (no charter yet)

## Context

Tether is being reshaped from a harness copied into each project into an installable product. A copied harness drifts in every repository and conflicts on each update, so the 2026-10-02 decision chose a mix of one core, a Claude Code plugin, a CLI and `tether init`. That decision rested on documentation. The plugin spike of 2026-10-04 tested it: ten of eleven checks passed, and the whole current harness, packaged as a plugin, graded the same as the copy-in run on the same benchmark task (22/22 own tests, 3/3 hidden tests). The spike also surfaced four facts that bind how the core is written: names, rules, hook cost and where state lives.

## Decision

The Claude side of Tether ships as a Claude Code plugin that carries the whole core: agents, skills, hooks and the kernel CLI. `tether init` writes only what a plugin cannot carry. This keeps one copy of the core per installed version instead of one per project, and an update arrives with one command.

### D-001 Plugin for the core, `tether init` for the rest

The plugin carries agents with their frontmatter intact, skills, hooks on every event, and the CLI on the Bash tool's PATH. `tether init` writes the `CLAUDE.md` block, permissions and the other settings keys, `.tether/config.json`, the `.gitignore` line for `.tether/state/`, and the two keys a project-scope install uses (`extraKnownMarketplaces` and `enabledPlugins`). Committing those keys means anyone who clones the project is prompted to install the same plugin.

### D-002 Skills and agents are always named `tether:<name>`

Every contract, `CLAUDE.md` line, skill text and kernel message writes `tether:ordering` and `tether:developer`, never the bare name. A bare name loses to a project skill of the same name: in the spike, `/ordering` loaded the project's skill, not Tether's. The kernel accepts both forms and strips the prefix in one function that every hook uses. Extension manifests keep bare names.

### D-003 Rules reach the lead and every teammate by hook injection

The plugin carries a `rules/` folder. The SessionStart hook gives its text to the lead on every session source (startup, resume, clear, compact), and the SubagentStart hook gives it to each teammate. Each enabled extension's additions follow, in the order `.tether/config.json` lists them. The shipped rules are `prose`, `comments`, `work-items` and `security-paths`, 5,766 characters in total, under the 10,000-character SessionStart limit. `work-items` and `security-paths` become always-on; `harness-authoring` is for Tether's own developers and does not ship.

### D-004 Hooks stay one Node process each, under the 200 ms cold budget

Measured from the plugin folder, hook medians were 46 to 66 ms, within 6 ms of the same hooks run from the project, and 36 ms of each is Node starting up. The budget test moves to the plugin's hooks folder once `core/` exists.

### D-005 Nothing writes under the plugin root

The installed plugin lives in a user-level cache folder that every project on that version shares and that an update replaces. All state goes to `.tether/state/` through the paths module.

## Subdomain and investment implications

**Subdomain affected:** Tether distribution, Supporting
**Investment shift:** effort increases in the kernel's paths module, the two injection hooks, the name function and `tether init`. Effort decreases in per-project copies, update merges and drift support, which disappear.

## Consequences

**Gains:**
- One core per installed version; an update is one command, with no merge in each project.
- Extensions and core rules reach every agent through one path, so a project's additions need no copy of core files.
- Prefixed names make Tether's skills immune to a project skill with the same name.

**Costs:**
- Contracts and `CLAUDE.md` carry the `tether:` prefix, about 7 bytes per name against the 2048-byte `CLAUDE.md` budget.
- Rules no longer load natively; they depend on two hooks firing on every session and spawn.
- Claude Code keeps plugin files in a user-level cache even for a project-scope install.

**Risks:**
- **RISK-001** [major] The SubagentStart hook has an unmeasured text limit and could cut injected rules short. Mitigation: measure it in one run, and have `tether init` fail when core rules plus extensions exceed the limit.
- **RISK-002** [major] The plugin was graded on one fast-lane run, which starts no agents; today's hooks expect bare agent names (`.claude/hooks/lib/transcript.mjs:114`). Mitigation: land the name function, then run one order-lane task through the plugin before the alpha.
- **RISK-003** [critical] The marketplace name and the plugin name become permanent once users install, because their settings reference `tether@<marketplace>`. [IRREVERSIBLE] Mitigation: settle both with the npm, repository and organization names at the alpha, before the first install outside the team.

## Context-map impact

No change to the context map.

## Alternatives considered

### Alternative: vendored copy-in installer
Ruled out because every project would hold its own copy of the core, which drifts and conflicts on each update, the problem the product exists to remove.

### Alternative: bare names with a collision check in `tether init`
Ruled out because a project skill added after `init` would silently replace a Tether skill.

### Alternative: rules copied into `.claude/rules/` with a version stamp
Ruled out because it brings the per-project copies back for the one part users read most.

### Alternative: rules preloaded through agent `skills:` frontmatter
Ruled out because extensions cannot add to a plugin's frontmatter and the lead never receives it.

### Alternative: one dispatcher hook per event
Ruled out because the measured cost is already about a third of the budget, and one dispatcher would let one failing hook stop every other.

## Tactical follow-up

- **TF-001** [TACTICAL DESIGN NEEDED] The kernel function that turns `tether:<name>` into `<name>`, used by every hook that reads an agent type, starting with `.claude/hooks/lib/transcript.mjs:114`.
- **TF-002** [TACTICAL DESIGN NEEDED] The plugin's `rules/` folder and the SessionStart and SubagentStart injection, including extension additions and the size check.
- **TF-003** [TACTICAL DESIGN NEEDED] Move the `guard.bash` log from beside the hook to `.tether/state/`, with a test that fails on any write path built from the hook's own location.
- **TF-004** [TACTICAL DESIGN NEEDED] `tether init`: the `CLAUDE.md` block, settings and permission keys, `.tether/config.json`, the `.gitignore` line and the marketplace keys.
- **TF-005** [TACTICAL DESIGN NEEDED] Rename skills and agents to `tether:<name>` across `CLAUDE.md`, contracts, skills and kernel messages.
- **TF-006** [TACTICAL DESIGN NEEDED] Point the hook budget test at the plugin's hooks folder, with realistic sample events.
- **TF-007** [TACTICAL DESIGN NEEDED] One order-lane benchmark task through the plugin after TF-001 lands, as the check RISK-002 names.
