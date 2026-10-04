# Project Understanding

TetherAI (repository still named AISpec) is a software-development harness for Claude Code: four lanes, four agents, one kernel, and a benchmark that measures the harness itself. It is being reshaped into an installable product called Tether.

## Language

**Tether**:
The product as its users see it: the plugin, the `tether` CLI, the project settings and state folder `.tether/`, and every document a user reads.
_Avoid_: harness (internal discussion only), AISpec (the repository's old name)

**Harness**:
The internal word for the mechanism (lanes, agents, kernel, hooks) in design discussions among the people building Tether. Never in user-facing docs, file names or command names.
_Avoid_: framework

**Core**:
The read-only, versioned part of Tether that an update replaces whole: agents, skills, hooks, kernel.
_Avoid_: plugin (one packaging of the core for one host, not the core itself)

**Extension**:
A named, versioned folder under `.tether/extensions/<name>/` with an `extension.json` manifest, enabled by listing it in `.tether/config.json`. It adds text, review steps or preflight checks at named extension points; it never replaces or removes core behaviour. A project's own small additions are an extension too.
_Avoid_: override, plugin (a Claude Code plugin is a different, host-level bundle)

**Extension point**:
A named place where the core reads extension content: agent additions, review steps, preflight checks. The set of points is a public contract, versioned by the manifest's `schema` number.

**Floor**:
The part of Tether no extension can change: the verdict tokens, `route` as the only state mutator, the guards, the user gate, the budgets.

## Decisions

- **Product name Tether, project TetherAI** (2026-10-02): plugin and CLI are `tether`, state lives in `.tether/`. npm, repository and organization names are settled at the alpha (2026-10-04); npm `tether` is taken, so expect a scope. Report: https://claude.ai/artifact/QyPJqATUoenwE4Cdc3R5km
- **Packaging is a mix: one core, a Claude Code plugin, a CLI, and `tether init`** (2026-10-02): a bare plugin cannot carry rules, CLAUDE.md or permissions, and a bare installer CLI leaves copies that drift. The plugin folder is `core/` itself, no build step (2026-10-04).
- **Claude Code only until the alpha** (2026-10-04): other hosts are revisited after the alpha; the only multi-host preparation kept is one paths module and hooks as thin shells over kernel verbs, which pay for themselves in tests anyway.
- **Customization through extensions with a manifest, not an anonymous override folder** (2026-10-04): `.tether/extensions/<name>/extension.json`, enabled and ordered by `.tether/config.json`; chosen for maintainability (identity, version, compatibility check). Project-local only in the alpha; installing from a git URL comes later.
- **Settings in `.tether/config.json`** (2026-10-04), tracked; runtime state in `.tether/state/`, ignored by git.
- **Versioning: SemVer from 1.0.0-alpha.1, developed on the `framework` worktree until a shippable alpha** (2026-10-02).
