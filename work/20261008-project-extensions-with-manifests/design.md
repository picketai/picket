---
kind: design
lane: design
title: Project extensions with manifests
date: 2026-10-08
audience: developer
sources: request.md; .claude/MEMORY.md (glossary Extension, Extension point, Floor; Decisions); artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md (D-003, D-005, RISK-001); spike/out/probe-step3.json (per-hook injection limit); spike/out/11-hook-log.jsonl (SubagentStart carries agent_type); core/lib/hooks/inject.rules.mjs; core/hooks/hooks.json; core/lib/hook.mjs; core/lib/config.mjs; core/lib/config.schema.json; core/lib/preflight.mjs; core/lib/review.mjs; core/lib/hooks/guard.scope.mjs; core/lib/paths.mjs; core/lib/init.mjs; core/skills/reviewing/SKILL.md; core/agents/reviewer.md; test/budgets.test.mjs; test/kernel/config.test.mjs
phases:
  - n: 1
    files:
      - core/lib/extensions.mjs
      - core/lib/extension.schema.json
      - core/lib/config.mjs
      - core/lib/config.schema.json
      - core/bin/tether.mjs
      - test/kernel/extensions.test.mjs
      - test/kernel/config.test.mjs
      - test/kernel/names.test.mjs
    greps:
      - path: core/lib/extensions.mjs
        pattern: SUPPORTED_SCHEMAS
      - path: core/lib/config.mjs
        pattern: "\"extensions\""
      - path: core/bin/tether.mjs
        pattern: case "extensions"
    tests: true
    drive: true
    security: false
  - n: 2
    files:
      - core/lib/hooks/inject.extensions.mjs
      - core/hooks/inject.extensions.mjs
      - core/hooks/hooks.json
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
      - test/budgets.test.mjs
    greps:
      - path: core/hooks/hooks.json
        pattern: inject\.extensions\.mjs
      - path: core/lib/hooks/inject.extensions.mjs
        pattern: bareAgentName
    tests: true
    drive: true
    security: false
  - n: 3
    files:
      - core/lib/review.mjs
      - core/skills/reviewing/SKILL.md
      - core/agents/reviewer.md
      - test/kernel/review.test.mjs
    greps:
      - path: core/lib/review.mjs
        pattern: extension_steps
      - path: core/skills/reviewing/SKILL.md
        pattern: extension_steps
    tests: true
    drive: true
    security: false
  - n: 4
    files:
      - core/lib/preflight.mjs
      - test/kernel/preflight.test.mjs
    greps:
      - path: core/lib/preflight.mjs
        pattern: command_on_path
    tests: true
    drive: true
    security: false
  - n: 5
    files:
      - core/lib/hooks/guard.scope.mjs
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
    greps:
      - path: core/lib/hooks/guard.scope.mjs
        pattern: "\"ask\""
    tests: true
    drive: true
    security: true
  - n: 6
    files:
      - core/lib/extensions.mjs
      - core/bin/tether.mjs
      - test/kernel/extensions.test.mjs
      - test/kernel/names.test.mjs
    greps:
      - path: core/bin/tether.mjs
        pattern: case "extension"
    tests: true
    drive: true
    security: false
---
# Design: Project extensions with manifests

## Problem

A project needs to add its own instructions, review checks and preflight checks to Tether without editing the core, which an update replaces whole and which lives in a shared user-level cache that nothing may write (SDR-00001 D-005). `.claude/MEMORY.md` fixes the shape: an extension is a folder `.tether/extensions/<name>/` with an `extension.json` manifest, enabled and ordered by `.tether/config.json`, project-local in the alpha; it adds content at named extension points and never replaces or removes core behaviour; the floor (verdict tokens, `tether route` as the only state mutator, the guards, the user gate, the budgets) is out of its reach; the set of points is a public contract versioned by the manifest's `schema`. Two measured facts bind the delivery: a hook's `additionalContext` arrives whole up to 10,000 characters and is spilled to a file above that, and the limit applies per hook, not per event (`spike/out/probe-step3.json`, Claude Code 2.1.282); and a SubagentStart event names the agent in `agent_type` (`spike/out/11-hook-log.jsonl`). Nothing under `core/` reads extensions today, the core rules already take 5,850 of their hook's 10,000 characters, and every hook must stay under the 200 ms cold budget.

## Decisions

### D-001: a strict manifest, enabled and ordered by name in the config
**Decision:** Infrastructural decision. A manifest is `.tether/extensions/<name>/extension.json` with required `name` (equal to the folder name, `^[a-z0-9][a-z0-9-]{0,39}$`), `version` (a SemVer string) and `schema` (an integer), optional `description`, and the point keys of D-002. Any other top-level key refuses the extension, so a typo or a hoped-for `replace` key fails loudly instead of doing nothing. `.tether/config.json` gains `extensions`, an ordered list of names, default `[]`; an extension is enabled only when listed, and the list order is the injection and load order. A folder not listed is ignored; a listed name with no folder or no manifest is refused. Everything is project-local: names resolve under `<root>/.tether/extensions/` only.
**Instead of:** enabling by presence of the folder, with an order field in each manifest: two extensions could claim the same position, and disabling one would mean deleting or renaming a folder instead of editing one list.
**Risks:**
- **RISK-001** `dirtyPaths` treats all of `.tether/` as bookkeeping, so an uncommitted manifest change does not show in preflight's tree check. Mitigation: Phase 4 adds an `extensions` preflight line that names each enabled extension with its version, so a change is visible at every lane start.

### D-002: schema 1 has four additive points, and the kernel refuses any other schema [IRREVERSIBLE]
**Decision:** Infrastructural decision. Schema 1 defines exactly four points, each a list of Markdown files or declarative records inside the extension folder: `rules` (text for the lead and every agent), `agents` (an object keyed by `lead`, `analyst`, `architect`, `developer`, `reviewer`, each a list of text files for that role only), `review_steps` (checklist files, each `{ "path", "min_size": "small"|"medium"|"large" }`), and `preflight` (checks, D-006). `core/lib/extensions.mjs` exports `SUPPORTED_SCHEMAS = [1]`; an enabled extension whose `schema` is not in that list is refused, with the reason `schema <n> is not supported by this Tether (supports 1)`. A refused extension contributes nothing anywhere. `core/lib/extension.schema.json` publishes the manifest, with a description per field, the same way `config.schema.json` publishes the config. Once a released core ships schema 1 and projects write manifests against it, its points and field meanings can only be extended by a new schema number, never changed; that publication is the irreversible step.
**Instead of:** an open point list where any key names a core file to append to: it couples every project to core file names that an update renames, and makes "never replaces core behaviour" a promise instead of a property of the loader.
**Risks:**
- **RISK-002** A point added later forces every project to bump `schema` to use it. Mitigation: `SUPPORTED_SCHEMAS` keeps old numbers for as long as the core can serve them, so an existing extension keeps working.

### D-003: the floor is enforced by construction, not by checking content
**Decision:** Infrastructural decision. The loader returns data only (file texts and records); it never returns code, commands or paths outside the extension folder. Every listed path is resolved and refused when its real path (after symlinks) leaves `<root>/.tether/extensions/<name>/`, when it is absolute, or when the file is missing. A test asserts that `core/lib/route.mjs`, `core/lib/gate.mjs`, `core/lib/next.mjs`, every `core/lib/hooks/guard.*.mjs` and `core/lib/hooks/route.verdict.mjs` never import `extensions.mjs`, directly or through another module, so no extension can reach state changes, verdict routing, gates or guards. Injected text also may not contain a line that is exactly a verdict token from `VERDICTS` in `core/lib/route.mjs`; such a file is refused, so an addition cannot hand an agent a ready verdict line. Core budgets in `test/budgets.test.mjs` stay as they are and count no extension text.
**Instead of:** scanning extension text for instructions that contradict the floor ("skip the gate"): no code can judge intent in prose, and the floor already holds in code whatever an agent is told.
**Risks:**
- **RISK-003** An extension's text persuades an agent to try something the floor forbids. Mitigation: the attempt fails in code (`route` owner checks, guards, gates); D-007 makes every edit to extension files a user decision.

### D-004: extension text arrives through its own hook, after core, within its own 10,000 characters
**Decision:** Infrastructural decision. A new hook `core/hooks/inject.extensions.mjs` (handler `core/lib/hooks/inject.extensions.mjs`) is registered on SessionStart and SubagentStart after `inject.rules`, as a separate entry, so its text has its own 10,000-character limit (the limit is per hook) and a failure in it cannot stop the core rules. For SessionStart it emits, per enabled extension in config order, its `rules` then its `agents.lead`; for SubagentStart, its `rules` then `agents.<role>`, where `<role>` is `bareAgentName(event.agent_type)`; an agent outside the four roles gets `rules` only. Each extension's block starts with `## Extension <name> <version>` so the reader sees where text comes from. When the total would pass 10,000 characters, the hook keeps whole extensions in order while they fit and ends with one line naming the ones left out; it never cuts a file in half. Refused extensions add one line each: `Extension <name> refused: <reason>`.
**Instead of:** appending extension text inside `inject.rules`: the core rules already use 5,850 of that hook's 10,000 characters, so extensions would get about 4,000, and one bad manifest would put the core rules at risk.
**Risks:**
- **RISK-004** Reading the config and every manifest pushes the hook past 200 ms cold. Mitigation: the loader is synchronous with no imports outside `core/lib/`, and `test/budgets.test.mjs` times the new hook with three extensions like the other hooks.

### D-005: review steps reach the reviewer through the review summary
**Decision:** Infrastructural decision. `reviewSummary` and `reviewSummaryRange` gain `extension_steps`, a list of `{ extension, path }` with `path` root-relative, holding every enabled extension's `review_steps` whose `min_size` is at or below the summary's `size` (small < medium < large), in config order. `security_path: true` loads all of them, whatever the size, matching the core rule. The `reviewing` load table gains one line: after the core set, load every file in `extension_steps`; its rows use the same shape and severities, and an extension row can raise a finding but never waive a core one. The kernel decides which files load; the reviewer only reads the list.
**Instead of:** naming extension steps in the agent addition text for the reviewer: the reviewer would then decide which apply by size, which the kernel already computes.

### D-006: preflight checks are declarative in schema 1
**Decision:** Infrastructural decision. A `preflight` entry is `{ "id", "kind", "value", "level": "warn"|"fail", "message" }` with three kinds: `path_exists` (a root-relative path exists), `env_set` (an environment variable is set and not empty) and `command_on_path` (a program name is found on PATH, looked up without being run). `preflight()` adds one check per entry, named `ext:<name>:<id>`, after the core checks; a failing `fail` entry stops the lane like a core failure. An enabled extension that is refused is a `fail` check, `ext:<name>`, because a project that relies on its review steps must not proceed without them.
**Instead of:** checks that run a command and test its exit code: `tether preflight` runs under `Bash(tether *)` without a prompt, so a check command would run project text through the kernel unseen, the gap `guard.bash` closes for `--run` and `--only`.
**Risks:**
- **RISK-005** A project needs a check the three kinds cannot express (a service is up). Mitigation: a later schema can add a kind; meanwhile the project's `commands` and the drive cover runtime checks.

### D-007: editing extension files or the config asks the user
**Decision:** Infrastructural decision that changes how the system stops the user. `guard.scope` returns `permissionDecision: "ask"` for a Write or Edit whose target is under `.tether/extensions/` or is `.tether/config.json`, with a reason naming the file and that its text reaches every agent or changes what the kernel loads. The hooks reference (code.claude.com/docs/en/hooks, `permissionDecision`) says a hook's `"ask"` prompts the user to confirm and forces a prompt even in auto mode, and that in a `-p` run with no one to answer, the call is denied with the reason; so no agent changes what later agents are told, or which extensions load, without the user seeing it.
**Instead of:** a `deny`: the user could not have Claude help write their own extension, and "a project's own small additions are an extension too" means agents will draft them.
**Risks:**
- **RISK-006** A Bash redirect (`cat > .tether/extensions/x/rules/a.md`) skips `guard.scope`. Mitigation: `guard.bash` never allows a write redirect on its own, so it falls to Claude Code's rules; Phase 5 adds a `guard.bash` test that such a redirect gets no allow.

### D-008: `tether extension new <name>` scaffolds and enables one
**Decision:** Infrastructural decision. A verb `tether extension new <name>` creates `.tether/extensions/<name>/extension.json` with `name`, `version: "0.1.0"`, `schema: 1` and empty `rules`, and appends `<name>` to `extensions` in `.tether/config.json`, refusing a name that exists or fails D-001's pattern. `tether extensions` (Phase 1) lists enabled, refused and unlisted extensions. This is how "a project's own small additions" start: one command, then the user edits the files.
**Instead of:** having `tether init` create a default `project` extension: an empty extension in every project is noise, and init writes only what a plugin cannot.

## Scope

**In:** the manifest, its schema file and the loader; `extensions` in the config; the four schema-1 points (rules and agent additions by hook, review steps by the review summary, declarative preflight checks); the floor tests; `guard.scope` asking on extension and config edits; `tether extensions` and `tether extension new`.
**Out:** a personal, git-ignored layer (OQ-001 [STRATEGIC]); installing extensions from a git URL or a registry (later than the alpha, per `.claude/MEMORY.md`); command-running preflight checks (D-006); new skills, agents or hooks contributed by an extension (no such point in schema 1); any change to the core rules' hook or its budget.

## Phase 1: Manifest, loader and the extensions key [IRREVERSIBLE]

**Touch set:**
- `core/lib/extensions.mjs`: load, validate, refuse, order
- `core/lib/extension.schema.json`: the published schema-1 contract
- `core/lib/config.mjs`: `extensions` key, default `[]`
- `core/lib/config.schema.json`: `extensions` property and default
- `core/bin/tether.mjs`: `extensions` verb, verb list
- `test/kernel/extensions.test.mjs`: manifests, refusals, floor imports
- `test/kernel/config.test.mjs`: the new key and default
- `test/kernel/names.test.mjs`: add `extensions` to CLI_VERBS

**Changes:** `loadExtensions(root)` returns `{ enabled: [{ name, version, schema, dir, rules: [{ path, text }], agents: { <role>: [{ path, text }] }, review_steps: [{ path, min_size }], preflight: [check] }], refused: [{ name, reason }], unlisted: [name] }`, synchronous, reading `loadConfig(root).extensions` for order. It applies D-001 (strict keys, name pattern, folder match, SemVer), D-002 (`SUPPORTED_SCHEMAS = [1]`) and D-003 (path confinement by real path, verdict-token lines refused); a refused extension carries one reason. `config.mjs` adds `extensions` to `KNOWN_KEYS` and `CONFIG_DEFAULTS` (a non-list or a non-string entry warns and is dropped). `extension.schema.json` describes every manifest field. `tether extensions [--human]` prints the three lists. The floor test of D-003 walks the import graph of the named modules.

**Done when:**
- **T-1.1** A temp project with `extensions: ["acme", "local"]` and two valid manifests returns both in `enabled`, in that order, with their files' texts; a third folder not listed appears in `unlisted`.
- **T-1.2** Each of these refuses its extension with a one-line reason: an unknown top-level key, `name` differing from the folder, `version: "1"`, `schema: 2`, a `rules` path of `../../CLAUDE.md`, a symlink inside the folder pointing outside it, a missing listed file, and a rules file holding a line `APPROVED`.
- **T-1.3** The test of `extension.schema.json` asserts its top-level properties equal the loader's known manifest keys, as `config.test.mjs` does for the config.
- **T-1.4** `loadConfig` returns `extensions: []` by default and keeps a valid list; `extensions: "acme"` warns and yields `[]`; `config.schema.json` names `extensions` with default `[]`.
- **T-1.5** The floor test passes: no module reachable from `route.mjs`, `gate.mjs`, `next.mjs`, `guard.*.mjs` or `route.verdict.mjs` imports `extensions.mjs`; adding such an import makes it fail.
- **T-1.6** Drive: in a temp project, `node core/bin/tether.mjs extensions --human` lists the enabled, refused and unlisted extensions with reasons.
- **T-1.7** `npm test` passes.
**Irreversible:** shipping `core/lib/extension.schema.json` with `schema: 1` in a released core fixes the four points and their fields; later changes need schema 2.

## Phase 2: Rules and agent additions by their own hook

**Touch set:**
- `core/lib/hooks/inject.extensions.mjs`: build the per-event text
- `core/hooks/inject.extensions.mjs`: shell over the handler
- `core/hooks/hooks.json`: register after `inject.rules`
- `test/hooks/handlers.test.mjs`: roles, order, budget, refusals
- `test/hooks/hooks.test.mjs`: spawned hook, both events
- `test/budgets.test.mjs`: time the new hook cold

**Changes:** Per D-004, `injectExtensions(event, { root })` calls `loadExtensions(root)` and returns `{ hookSpecificOutput: { hookEventName, additionalContext } }`, or `null` when no extension is enabled and none is refused. The role is `lead` on SessionStart and `bareAgentName(event.agent_type)` on SubagentStart. Blocks follow config order, each headed `## Extension <name> <version>`, holding `rules` texts then the role's texts, joined by blank lines; refused extensions add `Extension <name> refused: <reason>` lines; whole blocks that would pass 10,000 characters are left out and named in a last line. `hooks.json` adds the hook as its own entry on SessionStart and SubagentStart, after `inject.rules`. The budget test adds the hook to the cold-start set with a fixture of three enabled extensions.

**Done when:**
- **T-2.1** With `extensions: ["acme", "local"]`, SessionStart output holds `## Extension acme` before `## Extension local`, each with its `rules` text and then its `agents.lead` text, and no `agents.developer` text.
- **T-2.2** A SubagentStart event with `agent_type: "tether:developer"` gets each extension's `rules` and `agents.developer` texts only; `agent_type: "general-purpose"` gets `rules` only.
- **T-2.3** With three extensions of 4,000 characters each, the output holds the first two whole, stays at or under 10,000 characters, and ends with a line naming the third as left out.
- **T-2.4** A refused extension adds exactly one `Extension <name> refused: <reason>` line and no text; no enabled and no refused extension gives no output.
- **T-2.5** The core rules hook output is byte-identical with and without extensions enabled.
- **T-2.6** Drive: the spawned hook, fed a SubagentStart event for `tether:reviewer` in a temp project, prints JSON whose `additionalContext` holds the reviewer addition; `test/budgets.test.mjs` passes with the new hook under 200 ms cold.
- **T-2.7** `npm test` passes.

## Phase 3: Review steps through the review summary

**Touch set:**
- `core/lib/review.mjs`: `extension_steps` in both summaries
- `core/skills/reviewing/SKILL.md`: load table names `extension_steps`
- `core/agents/reviewer.md`: summary fields list it
- `test/kernel/review.test.mjs`: size filter, security override, order

**Changes:** Per D-005, both summary functions add `extension_steps: [{ extension, path }]` from `loadExtensions(root).enabled`, filtered by `min_size` against the computed `size` (all of them when `security_path` is true), in config order, `path` root-relative with forward slashes. The `## The review summary` example and field list in `SKILL.md` gain the field; the load table gains one sentence: after the row's set, load every `extension_steps` file; extension rows may add findings and never waive a core row. `reviewer.md` adds `extension_steps` to the summary fields it names.

**Done when:**
- **T-3.1** With steps at `min_size` small, medium and large, a small summary lists only the small one, a medium summary the first two, a large summary all three, in config order across extensions.
- **T-3.2** A small change touching a security path lists all three.
- **T-3.3** With no extension enabled, `extension_steps` is `[]`, and every other summary field is unchanged from today's output for the same diff.
- **T-3.4** `SKILL.md` and `reviewer.md` name `extension_steps`; `test/budgets.test.mjs` passes for both.
- **T-3.5** Drive: `node core/bin/tether.mjs review-summary <id>` in a temp project with one extension prints `extension_steps` with its root-relative path.
- **T-3.6** `npm test` passes.

## Phase 4: Declarative preflight checks

**Touch set:**
- `core/lib/preflight.mjs`: extension line and checks
- `test/kernel/preflight.test.mjs`: kinds, levels, refusals

**Changes:** Per D-006 and D-001 RISK-001, `preflight()` adds after the core checks one `extensions` line (`ok` naming each enabled extension as `<name>@<version>`, or `ok: none`), one `fail` check `ext:<name>` per refused extension with its reason, and one check `ext:<name>:<id>` per `preflight` entry: `path_exists` resolves the value under the root and refuses a path that leaves it; `env_set` reads `process.env`; `command_on_path` searches each PATH folder for the name (with PATHEXT extensions on Windows) without running anything. A passing entry is `ok`; a failing one takes its `level` and its `message`. The loader refuses an entry with another `kind`, a missing `id`, or a `level` other than `warn` or `fail`.

**Done when:**
- **T-4.1** `path_exists` on `package.json` is `ok` in a temp project that has it and `fail` with the entry's message when the entry's level is `fail` and the file is gone; `../outside` is refused at load.
- **T-4.2** `env_set` on a variable set in the child's env is `ok`, and on an unset one takes the entry's level.
- **T-4.3** `command_on_path` finds `node` (`ok`) and reports `nosuchprogram-xyz` with the entry's level, and a spy shows no process was started for the lookup.
- **T-4.4** A refused enabled extension makes `preflight` return `ok: false` with an `ext:<name>` `fail` check naming the reason; an unlisted folder adds nothing.
- **T-4.5** Drive: `node core/bin/tether.mjs preflight <id> --human` in a temp project prints the `extensions` line and each `ext:` check, and prints `PREFLIGHT FAILED` with exit 2 when a `fail` entry fails.
- **T-4.6** `npm test` passes.

## Phase 5: Edits to extensions and the config ask the user

**Touch set:**
- `core/lib/hooks/guard.scope.mjs`: `ask` for the two targets
- `test/hooks/handlers.test.mjs`: decisions per target
- `test/hooks/hooks.test.mjs`: spawned hook, one ask, one redirect

**Changes:** Per D-007, after the existing deny checks, `guardScope` returns `{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason } }` when the target's root-relative path starts with `.tether/extensions/` or equals `.tether/config.json`, case-insensitive on Windows. The reason names the file and says its text reaches every agent or changes what the kernel loads. Existing denials (kernel-owned files, hook-only state, sources, unread edits) keep precedence. A `guard.bash` test pins that `cat > .tether/extensions/x/rules/a.md <<'EOF'` gets no allow.

**Done when:**
- **T-5.1** A Write to `.tether/extensions/acme/rules/a.md` and an Edit of `.tether/config.json` (after a Read) each get `ask` with a reason naming the file.
- **T-5.2** A Write to `.tether/state/ledger.jsonl` still gets `deny`, and a Write to `src/a.ts` still gets no decision.
- **T-5.3** An Edit of `.tether/extensions/acme/extension.json` that was not read first gets the existing `deny` for unread edits, not `ask`.
- **T-5.4** The `guard.bash` decision for the redirect above is not `allow`.
- **T-5.5** Drive: the spawned `guard.scope` hook, fed a PreToolUse Write event for an extension file on stdin, prints `permissionDecision` `ask`.
- **T-5.6** `npm test` passes.

## Phase 6: `tether extension new` scaffolds one

**Touch set:**
- `core/lib/extensions.mjs`: `scaffoldExtension(root, name)`
- `core/bin/tether.mjs`: `extension new <name>` case
- `test/kernel/extensions.test.mjs`: scaffold, refusals, load
- `test/kernel/names.test.mjs`: add `extension` to CLI_VERBS

**Changes:** Per D-008, `scaffoldExtension(root, name)` validates the name (D-001 pattern), refuses an existing folder or a name already listed, writes `extension.json` (`name`, `version: "0.1.0"`, `schema: 1`, `rules: []`, two-space JSON, trailing newline), and appends the name to `extensions` in `.tether/config.json` (creating `{ "version": 1, "extensions": [name] }` when the file is missing, keeping every other key). The CLI prints the folder and the next step, editing the manifest to list files.

**Done when:**
- **T-6.1** In a temp project, `node core/bin/tether.mjs extension new local` creates the manifest and lists `local` last in `extensions`, keeping an existing `sources` key; `tether extensions` then shows `local@0.1.0` enabled.
- **T-6.2** `extension new Local`, `extension new ../x` and a second `extension new local` exit 1 with a reason and write nothing.
- **T-6.3** A run on a project without `.tether/config.json` creates it with `version` 1 and the one name.
- **T-6.4** `npm test` passes.

## Open questions

- **OQ-001** [STRATEGIC] Whether a personal, git-ignored layer exists (for example `.tether/extensions.local.json` or a user-level folder), and how it orders against the project list. Owner: owner, through consulting. Fallback: schema 1 reads only the committed `extensions` list in `.tether/config.json`; a personal addition is a listed extension the user keeps uncommitted.
- **OQ-002** When schema 1 counts as published, which fixes the [IRREVERSIBLE] point of Phase 1: the first tagged alpha, or the first install outside the team. Owner: owner. Fallback: Phase 1 is treated as irreversible at its gate, so the user confirms the point set there.

## Revision log
