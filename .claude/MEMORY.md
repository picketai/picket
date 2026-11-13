# Project Understanding

PicketAI (repository still named AISpec) is a software-development harness for Claude Code: four lanes, four agents, one kernel, and a benchmark that measures the harness itself. It is being reshaped into an installable product called Picket.

## Language

**Picket**:
The product as its users see it: the plugin, the `picket` CLI, the project settings and state folder `.picket/`, and every document a user reads.
_Avoid_: harness (internal discussion only), AISpec (the repository's old name)

**Harness**:
The internal word for the mechanism (lanes, agents, kernel, hooks) in design discussions among the people building Picket. Never in user-facing docs, file names or command names.
_Avoid_: framework

**Core**:
The read-only, versioned part of Picket that an update replaces whole: agents, skills, hooks, kernel.
_Avoid_: plugin (one packaging of the core for one host, not the core itself)

**Extension**:
A named, versioned folder under `.picket/extensions/<name>/` with an `extension.json` manifest, enabled by listing it in `.picket/config.json`. It adds text, review steps or preflight checks at named extension points; it never replaces or removes core behaviour. A project's own small additions are an extension too.
_Avoid_: override, plugin (a Claude Code plugin is a different, host-level bundle)

**Extension point**:
A named place where the core reads extension content: agent additions, review steps, preflight checks. The set of points is a public contract, versioned by the manifest's `schema` number.

**Floor**:
The part of Picket no extension can change: the verdict tokens, `picket` verbs as the only state mutators, with `route` the only one that records a verdict, the guards, the user gate, the budgets.

**Teammate**:
An agent the lead starts with the Agent tool, such as `picket:developer`; in Claude Code terms, a subagent. Not a member of a Claude Code agent team.
_Avoid_: agent team member

**Silenced move**:
An added checker suppression (`eslint-disable`, `@ts-expect-error`, `noqa`), a skipped or focused test, a weaker threshold, or a deleted test. `guard.silenced` denies one at the edit and the review summary lists each one.

**Waiver**:
The user's recorded approval of one silenced move on one path, written by `picket waive`. Only the lead or the user can run it.

**Quality bar**:
The `quality` block in `.picket/config.json` (`coverage_min`, `max_warnings`) that the guard reads to tell a weaker threshold.

**Mutant**:
One operator on a changed line inverted by `picket mutate` (`===` to `!==`) to test whether the tests notice. A mutant that survives is a finding.

**Mistake class**:
The reviewer row id (`Ts4`, `Rf8`) behind a Critical or Major finding. `picket close` reports a class named in two or more reviews.

**Procedure**:
The ordered steps for one task, kept in a step file of the skill that uses it. It has one owner; a shell or a SKILL.md points at it and never copies it.
_Avoid_: shared step, common step, shared procedure

**Checklist**:
A file in the reviewing skill's checklists folder that the reviewer loads by size, framework or concern; unlike a step file it is not run in order.
_Avoid_: review step

**Send**:
One message the lead gives an agent exactly as `picket next` prints it: tool, instance name, agent type and text.
_Avoid_: dispatch, prompt

**Gate reply**:
The user's answer at a stop (`a`, `r 9`, `x: <why>`), passed to `picket reply`, which routes it and prints the next send.
_Avoid_: approval message

**Instance tag**:
The four letters before the role in an agent's instance name (`fllf-developer`), from the sha256 of the work item id, so a send never reaches another item's agent.

**Shell**:
An agent's file under `src/agents/`: frontmatter, then the same six parts in order. Procedure lives in skills; a shell names only its preloaded skills.
_Avoid_: agent prompt, agent definition

**Entry**:
The `## Entry` part of a shell: what the agent reads first and which fields of the lead's send it expects.

## Decisions

- **Product name Picket, project PicketAI** (2026-10-10): npm `@picketai/picket`, GitHub `picketai/picket`, command `picket`; it replaced an earlier working name whose npm scope was taken. Rejected: Hitch (`hitch-cli` is a rival AI coding tool).
- **Packaging is a mix: one core, a Claude Code plugin, a CLI, and `picket init`** (2026-10-02): a bare plugin cannot carry rules, CLAUDE.md or permissions, and a bare installer leaves copies that drift. `npm run build` writes the plugin from `src/` to `dist/`.
- **Claude Code only until the alpha** (2026-10-04): other hosts are revisited after it; the only multi-host preparation kept is one paths module and hooks as thin shells over kernel verbs.
- **Customization through extensions with a manifest, not an anonymous override folder** (2026-10-04): a manifest gives identity, version and a compatibility check. Project-local only in the alpha; installing from a git URL comes later.
- **Settings in `.picket/config.json`** (2026-10-04), tracked; runtime state in `.picket/state/`, ignored by git.
- **Versioning: SemVer from 1.0.0-alpha.1** (2026-10-02).
- **The Claude side ships as a plugin, per SDR 00001** (2026-10-04): `picket init` writes only what a plugin cannot (the CLAUDE.md block, settings, `.picket/config.json`); skills and agents are always `picket:<name>`; rules reach the lead and each agent by hook injection; nothing writes under the plugin root, which updates replace.
- **Install is `npx @picketai/picket@alpha init`, once per project** (2026-11-08, -10): inline `settings` marketplace, npm source; no global copy, no marketplace repo. Update: marketplace, then `picket init` in session.
- **Session list merges into picket-status** (2026-11-02): a pane opened by `/picket-session`; it never opens or resumes a session. `artifacts/strategy/decisions/00002-session-list-merges-picket-status.md`
- **Closed is not done** (2026-11-02): a PR, its merge and the worktree follow `picket close`; only the developer marks a session done.
