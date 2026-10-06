---
kind: design
lane: design
title: Package core as the Tether plugin
date: 2026-10-06
audience: developer
sources: [work/20261006-package-core-as-the-plugin-design/request.md, .claude/MEMORY.md, artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md, work/20261004-tether-plugin-spike-eleven-packaging-checks/research.md, work/20261005-tether-spike-follow-up-four-open-checks/research.md, work/20261005-separate-core-paths-state-and-config/design.md, .claude/settings.json, .claude/lib/paths.mjs, .claude/lib/hook.mjs, .claude/lib/agent-name.mjs, .claude/lib/gate.mjs, .claude/lib/next.mjs, .claude/lib/verify.mjs, .claude/lib/hooks/inject.state.mjs, .claude/lib/hooks/guard.scope.mjs, .claude/lib/hooks/guard.bash.mjs, .claude/hooks/inject.state.mjs, .claude/bin/harness.mjs, .claude/bin/statusline.mjs, .claude/rules/harness-authoring.md, .claude/rules/security-paths.md, .claude/agents/architect.md, CLAUDE.md, package.json, .gitignore, bench/adapters/plugin.mjs, bench/adapters/rework.mjs, bench/run.mjs, bench/test/adapters.test.mjs, bench/results/rework-clean.json, bench/results/rework.json, spike/build-full.mjs, spike/tether/skills/where/SKILL.md, spike/out/7.jsonl, test/budgets.test.mjs, test/markdown-paths.test.mjs, test/kernel/kernel-sources.mjs, claude plugin install --help and validate --help (Claude Code 2.1.282)]
phases:
  - n: 1
    files: [core/lib/paths.mjs, core/lib/hook.mjs, core/lib/hooks/guard.bash.mjs, core/hooks/hooks.json, core/hooks/guard.bash.mjs, core/hooks/route.verdict.mjs, core/hooks/README.md, core/bin/tether.mjs, core/bin/tether, .claude/hooks/guard.bash.mjs, .claude/hooks/route.verdict.mjs, .claude/bin/harness.mjs, .claude/bin/statusline.mjs, bench/adapters/rework.mjs, test/kernel/kernel-sources.mjs, test/kernel/plugin-layout.test.mjs, test/hooks/hooks.test.mjs, test/budgets.test.mjs, package.json]
    greps:
      - path: core/hooks/hooks.json
        pattern: "\\$\\{CLAUDE_PLUGIN_ROOT\\}/hooks/guard\\.bash\\.mjs"
      - path: .claude/hooks/guard.bash.mjs
        pattern: "core/hooks/guard\\.bash\\.mjs"
      - path: .claude/bin/harness.mjs
        pattern: "core/bin/tether\\.mjs"
      - path: core/bin/tether
        pattern: "tether\\.mjs"
      - path: test/kernel/kernel-sources.mjs
        pattern: "core/lib"
      - path: core/lib/hooks/guard.bash.mjs
        pattern: "tether"
    tests: true
    drive: true
    security: true
  - n: 2
    files: [spike/run.mjs, spike/tether/hooks/hooks.json, spike/tether/hooks/inject-size.mjs, spike/tether/hooks/stop.mjs, spike/tether/agents/probe-prefixed.md, spike/tether/output-styles/probe.md, spike/fixtures/11/CLAUDE.md, spike/fixtures/11/.claude/rules/spike-rule.md, spike/out/probe-step3.json]
    greps:
      - path: spike/out/probe-step3.json
        pattern: "\"subagent_start\""
      - path: spike/out/probe-step3.json
        pattern: "\"session_start\""
      - path: spike/out/probe-step3.json
        pattern: "\"output_style_name\""
      - path: spike/tether/agents/probe-prefixed.md
        pattern: "tether:where"
    tests: true
    drive: true
    security: false
  - n: 3
    files: [core/rules/prose.md, core/rules/comments.md, core/rules/work-items.md, core/rules/security-paths.md, core/lib/paths.mjs, core/lib/hooks/inject.rules.mjs, core/hooks/inject.rules.mjs, .claude/hooks/inject.rules.mjs, core/hooks/hooks.json, .claude/settings.json, .claude/rules/harness-authoring.md, CLAUDE.md, test/hooks/handlers.test.mjs, test/kernel/paths.test.mjs, test/budgets.test.mjs, bench/adapters/rework.mjs, bench/test/adapters.test.mjs]
    greps:
      - path: core/lib/paths.mjs
        pattern: "export function pluginRoot\\("
      - path: core/lib/paths.mjs
        pattern: "export function rulesDir\\("
      - path: core/hooks/hooks.json
        pattern: "SubagentStart"
      - path: .claude/settings.json
        pattern: "inject\\.rules\\.mjs"
      - path: test/hooks/handlers.test.mjs
        pattern: "injectRules"
      - path: .claude/rules/harness-authoring.md
        pattern: "core/\\*\\*"
    tests: true
    drive: true
    security: true
  - n: 4
    files: [core/.claude-plugin/plugin.json, core/skills/ordering/SKILL.md, core/skills/ordering/steps/20-phase.md, core/skills/designing/SKILL.md, core/skills/documenting/SKILL.md, core/agents/analyst.md, core/agents/architect.md, core/agents/developer.md, core/agents/reviewer.md, core/output-styles/custom.md, core/rules/work-items.md, core/lib/next.mjs, core/lib/hooks/inject.state.mjs, core/lib/hooks/guard.scope.mjs, CLAUDE.md, .claude/settings.json, .claude/agent-memory/tether-architect/MEMORY.md, .claude/agent-memory/tether-reviewer/MEMORY.md, test/kernel/names.test.mjs, test/kernel/plugin-layout.test.mjs, test/budgets.test.mjs, test/markdown-paths.test.mjs, package.json]
    greps:
      - path: core/.claude-plugin/plugin.json
        pattern: "\"name\": \"tether\""
      - path: core/.claude-plugin/plugin.json
        pattern: "\"version\": \"1\\.0\\.0-alpha\\.0\""
      - path: CLAUDE.md
        pattern: "tether:ordering"
      - path: CLAUDE.md
        pattern: "--plugin-dir core"
      - path: .claude/settings.json
        pattern: "Bash\\(tether \\*\\)"
      - path: core/lib/hooks/inject.state.mjs
        pattern: "/tether:resuming"
      - path: core/skills/ordering/steps/20-phase.md
        pattern: "tether:developer"
      - path: package.json
        pattern: "claude --plugin-dir core"
    tests: true
    drive: true
    security: true
  - n: 5
    files: [bench/adapters/plugin.mjs, bench/run.mjs, bench/test/adapters.test.mjs, bench/README.md, .claude/rules/harness-authoring.md, package.json]
    greps:
      - path: bench/adapters/plugin.mjs
        pattern: "\"core\""
      - path: bench/adapters/plugin.mjs
        pattern: "Bash\\(tether \\*\\)"
      - path: bench/run.mjs
        pattern: "\"plugin\""
      - path: package.json
        pattern: "--harness plugin"
      - path: .claude/rules/harness-authoring.md
        pattern: "--harness plugin"
    tests: true
    drive: true
    security: false
  - n: 6
    files: [.claude-plugin/marketplace.json, .claude/settings.json, test/kernel/plugin-layout.test.mjs, test/hooks/hooks.test.mjs, package.json]
    greps:
      - path: .claude-plugin/marketplace.json
        pattern: "\"source\": \"\\./core\""
      - path: .claude-plugin/marketplace.json
        pattern: "\"name\": \"tether-dev\""
      - path: package.json
        pattern: "\"tether\": \"node core/bin/tether\\.mjs\""
    tests: true
    drive: true
    security: true
  - n: 7
    files: [bench/results/plugin-core.json]
    greps:
      - path: bench/results/plugin-core.json
        pattern: "\"harness\": \"plugin\""
      - path: bench/results/plugin-core.json
        pattern: "gate-14-status-migration"
      - path: bench/results/plugin-core.json
        pattern: "research-12-lifecycle"
    tests: true
    drive: true
    security: false
---
# Design: Package core as the Tether plugin

## Problem

Step 3 of the Tether plan makes `core/` the Claude Code plugin with no build step, injects rules by hook, renames every skill and agent to `tether:<name>`, adds a local marketplace, and runs this repository and the bench on the plugin (request items 1 to 6). SDR-00001 (`artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md`) and `.claude/MEMORY.md` bind the shape: plugin for the core, rules by SessionStart and SubagentStart, `tether:` names, one Node process per hook under 200 ms, nothing written under the plugin root; the Separate record (`work/20261005-separate-core-paths-state-and-config/design.md`) binds `paths.mjs` as the one owner of locations and hooks as thin shells over handlers. The hard force is that this session runs on the harness being moved: its hooks were captured at start as `node ${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>.mjs`, and a hook that fails to import exits non-zero, which Claude Code treats as non-blocking, so a careless move turns the guards off without a signal. Two premises are unmeasured (SDR RISK-001, the SubagentStart text limit; and whether the limit is per hook or per event), and the full benchmark costs about 42 to 47 dollars of subscription quota.

## Decisions

### D-001: `core/` is the plugin tree, moved with `git mv`, never copied
**Decision:** Infrastructural decision. Files move from `.claude/` to `core/` with `git mv`, so history follows them and no second tree exists. The plugin layout is `core/.claude-plugin/plugin.json`, `core/agents/`, `core/skills/`, `core/rules/`, `core/output-styles/`, `core/hooks/` (`hooks.json`, the `<kind>.<name>.mjs` shells, `README.md`), `core/bin/tether` (a POSIX launcher, git mode 100755) and `core/bin/tether.mjs` (today's `harness.mjs`), and `core/lib/` (kernel, handlers in `core/lib/hooks/`, `vendor/`). `.claude/` keeps only what this repository uses as a host: `settings.json`, `settings.local.json`, `MEMORY.md`, `PROJECT-MAP.md`, `agent-memory/`, `rules/harness-authoring.md`, `scripts/`, `bin/statusline.mjs`, `ccstatusline.json`. Every module under `core/` imports only Node built-ins and paths inside `core/`, because an installed plugin is a cache copy of `core/` alone. `paths.mjs` keeps `HOST_DIR = ".claude"` for the host-owned files and gains `pluginRoot()`, the one read of its own location, which Separate D-006 RISK-010 reserved for exactly this.
**Instead of:** keeping `spike/build-full.mjs` to generate the plugin from `.claude/`: the request forbids a build step, and two trees drift.
**Risks:**
- **RISK-001** A kernel module reaches outside `core/` (a `../../bench` import) and only the installed plugin breaks. Mitigation: a layout test in phase 1 fails on any import that is neither a Node built-in nor inside `core/`.
- **RISK-002** The launcher loses its execute bit on a Windows checkout and `tether` is not runnable on macOS or Linux. Mitigation: set the mode with `git update-index --chmod=+x`; the layout test reads `git ls-files -s core/bin/tether`.

### D-002: The move runs behind forwarders, with one restart
**Decision:** Infrastructural decision. From phase 1 to phase 6, each `.claude/hooks/<name>.mjs` is a one-line forwarder, `import "../../core/hooks/<name>.mjs";`, and `.claude/bin/harness.mjs` is `import "../../core/bin/tether.mjs";`, so the hook commands this session captured at start and every `node .claude/bin/harness.mjs` call keep working. Until phase 4, `.claude/settings.json` carries the hooks and `core/hooks/hooks.json` mirrors them (a test pins the two equal after swapping `${CLAUDE_PROJECT_DIR}/.claude/hooks/` for `${CLAUDE_PLUGIN_ROOT}/hooks/`). Phase 4 deletes the settings hooks block, and at its gate the owner restarts on `claude --plugin-dir core` and resumes with `/tether:resuming <id>`, so the hook set is loaded from exactly one place at any time. Each move that this session reads from (kernel in phase 1, rules in phase 3, skills, agents and output style in phase 4) runs as one Bash call that moves the files and writes the forwarders together, from a scratch script outside the repository, so no tool call runs on a half-moved tree. Phase 6 deletes the forwarders once the session runs on the plugin.
**Instead of:** one phase that moves everything and restarts: a hook that cannot import fails open for the rest of the session with no signal, and that phase could not be reviewed in one sitting.
**Risks:**
- **RISK-003** If Claude Code reloads settings hooks live, deleting the hooks block in phase 4 drops the guards and the verdict router for the old session before the restart. Mitigation: the developer deletes the block as the last edit of phase 4, after `npm test`; if `harness next` still says `implement_phase` after `PHASE DONE`, the lead routes it with `node .claude/bin/harness.mjs route`, which the forwarder still serves.
- **RISK-004** Between phase 3 and the restart, `work-items` and `security-paths` no longer load natively, and a teammate spawned by the old session gets no rules if its hook snapshot predates `inject.rules`. Mitigation: the only spawns in that window are continuations of the live developer, which already holds the rules; the checkpoint reviewer after phase 4 starts on the plugin.

### D-003: This repository runs on `claude --plugin-dir core`
**Decision:** Infrastructural decision. Sessions in this repository load the plugin in place with `claude --plugin-dir core` (also `npm run claude`), so a core edit runs at the next hook call exactly as it does today. `.claude/settings.json` keeps no hooks and no `enabledPlugins`; `CLAUDE.md` names the launch command in its first lines.
**Instead of:** a project-scope install from the root marketplace: Claude Code runs an installed plugin from a copy under `~/.claude/plugins/cache/` (spike R-022), so every core edit would need `claude plugin update` first, and this repository would commit `tether@<marketplace>` before OQ-001 settles the name.
**Risks:**
- **RISK-005** A session started without the flag runs with no Tether hooks, so no guards. Mitigation: the `tether` CLI and the `tether:` lane skills are missing too, so the first request fails loudly at `tether admit`; `CLAUDE.md` and `CONTRIBUTING.md` name the flag.

### D-004: Rules reach every agent through one handler on two events
**Decision:** Infrastructural decision. `prose`, `comments`, `work-items` and `security-paths` move to `core/rules/` without `paths:` frontmatter, so all four are always on (SDR-00001 D-003). A new handler `injectRules(event, ctx)` in `core/lib/hooks/inject.rules.mjs`, behind the shell `core/hooks/inject.rules.mjs`, returns `{ hookSpecificOutput: { hookEventName: event.hook_event_name, additionalContext } }` with the four files in that order, joined by a blank line. It is registered with no matcher on SessionStart (every source: startup, resume, clear, compact) and SubagentStart (every agent type). It stays apart from `inject.state`, which keeps SessionStart only. `paths.mjs` gains `rulesDir()` under `pluginRoot()`. `test/budgets.test.mjs` caps the injected text at the limit phase 2 measures. `harness-authoring` stays native in `.claude/rules/`, its `paths:` widened to `core/**` and `.claude-plugin/**`.
**Instead of:** appending the rules to `inject.state`: its glossary (4,536 characters today, up to 6,000), open items and sources plus 5,888 characters of rules exceed the 10,000-character SessionStart limit.
**Risks:**
- **RISK-006** SubagentStart cuts the text below 5,888 characters, or the limit is per event and the two SessionStart hooks together pass it. Mitigation: phase 2 measures both; a per-hook limit below the total gives one registration per rule file; a per-event SessionStart limit lowers `GLOSSARY_CHARS` until the worst case fits; a SubagentStart limit below one rule file is OQ-004.
- **RISK-007** Every agent type, built-in ones included, pays about 1,500 tokens per spawn. Mitigation: accepted for now; the ledger shows the cost, and a matcher can narrow it later.

### D-005: Skills and agents are `tether:<name>`, the CLI is `tether`
**Decision:** Infrastructural decision. Every Markdown file under `core/`, `CLAUDE.md` and every free-text kernel message write skills as `tether:<skill>` (slash form `/tether:resuming`), agent types in spawn instructions as `tether:<role>`, and the CLI as `tether <verb>`, which resolves because the plugin's `bin/` is on the Bash tool's PATH (spike R-018). Instance names used with `SendMessage` (`developer`, `cumulative-reviewer`) and kernel data fields (`actor` in `harness next`, `agent` in a verdict) stay bare; `bareAgentName` in `agent-name.mjs` (TF-001, landed) strips the prefix wherever an agent type is read. Plugin file references: a `SKILL.md` names its folder as `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`, which Claude Code substitutes in skill text (`spike/out/7.jsonl`); step and template files cite skill-folder-relative paths such as `documenting/templates/order.md`; agent files name skills, never paths. `guard.bash` classifies `tether <verb>` and `node …/tether.mjs` as kernel wrappers, as it does `harness.mjs`. Agent memory moves from `.claude/agent-memory/<role>/` to `tether-<role>/`, where plugin agents write (spike R-015). Agent `skills:` frontmatter uses the form phase 2 proves. A names test enforces all of this.
**Instead of:** a `tether path <file>` verb that prints absolute plugin paths: one CLI round trip before every file read, for what substitution already gives.
**Risks:**
- **RISK-008** `${CLAUDE_PLUGIN_ROOT}` is not substituted in a skill preloaded through `skills:` frontmatter, so the architect cannot find the `documenting` scripts. Mitigation: phase 2 checks it; if absent, the lead's spawn message carries the absolute script folder from its own substituted `SKILL.md`.
- **RISK-009** The prefixes push `CLAUDE.md` past 2,048 bytes (1,839 today). Mitigation: the budget test; shorten wording, never raise the cap.

### D-006: A root marketplace with a provisional name
**Decision:** Infrastructural decision. `.claude-plugin/marketplace.json` at the repository root lists one plugin, `{ "name": "tether", "source": "./core" }`, under the marketplace name `tether-dev`, provisional until OQ-001. `core/.claude-plugin/plugin.json` carries `name: "tether"`, `version: "1.0.0-alpha.0"`, description, author, and an explicit `skills` list of the 15 `./skills/<name>` folders. The plugin name `tether` is fixed by SDR-00001 and `.claude/MEMORY.md`; it becomes permanent at the first install outside the team [IRREVERSIBLE], and no such install happens in this record. A fresh project installs with `claude plugin marketplace add <repo> --scope project` and `claude plugin install tether@tether-dev --scope project`; `claude plugin install` resolves only known marketplaces (`--help`, Claude Code 2.1.282), so the single command the request names is OQ-002. `claude plugin validate` checks both manifests offline.
**Instead of:** naming the marketplace `tether` now: SDR RISK-003 makes that name permanent at the first outside install, and the npm, repository and organization names are settled only at the alpha.
**Risks:**
- **RISK-010** The install check leaves user-level traces under `~/.claude/plugins` (spike R-022). Mitigation: uninstall and remove the marketplace with `--scope project` afterwards, and list leftover cache folders in the phase block instead of deleting them.

### D-007: The bench runs the plugin straight from `core/`
**Decision:** Infrastructural decision. `bench/adapters/plugin.mjs` points `pluginDir` at `core/` and installs only what a project holds: `CLAUDE.md`, `.tether/config.json`, `work/`, and a `.claude/settings.json` with no hooks and the plugin's output style; its tool list adds `Bash(tether *)`. `defaultHarnessRoot("plugin")` returns this checkout (spike R-006). The `rework` adapter retires: its gate, signal and report functions move into `plugin.mjs`; `spike/build-full.mjs` and `spike/tether-full/` are deleted. The hook budget test walks `core/hooks` from phase 1 (TF-006). Phase 7 runs `node bench/run.mjs --harness plugin --tasks all --runs 1 --out bench/results/plugin-core.json` and passes at 14 of 14. Expected spend is 42 to 47 dollars (first-run sums of `rework-clean.json` and `rework.json`); the ceiling is the sum of task budgets that `--dry` prints. Phase 6 is marked security, so its gate always stops; the lead puts phase 5's dry run and the quote in that packet, and approving phase 6 is the owner's go.
**Instead of:** five runs per task for pass^k: five times the quota to measure a packaging change; the paired check against `rework-clean.json` is reported for information.
**Risks:**
- **RISK-011** One flaky task fails its single run (`rework-separate-core.json` passed 6 of 7). Mitigation: re-run only that task once, behind its own go; a second failure is `PHASE STALLED` with the failing checks.

### D-008: Probe the unmeasured premises before building on them
**Decision:** Infrastructural decision. Phase 2 runs, inside `spike/` only, the checks this record rests on: (a) the SubagentStart cut size and whether it applies per hook or per event (outline check 12), (b) the same for SessionStart, (c) whether a subagent loads project `CLAUDE.md` and `.claude/rules/` (outline check 11), (d) whether agent frontmatter `skills: tether:<name>` preloads and whether `${CLAUDE_PLUGIN_ROOT}` is substituted in preloaded skill text, (e) the name a plugin output style takes in `outputStyle`. Results land in `spike/out/probe-step3.json`, which phases 3 and 4 read. Outline checks 13 (plugin and project hook order) and 14 (version pinning) do not run: after phase 4 this repository has no project hooks and pins nothing (OQ-003). Phase 1 is marked security, so its gate carries the probe quote (10 to 13 haiku runs, about 1 dollar, each capped at 1 dollar) and approving it is the owner's go.
**Instead of:** designing on documented behaviour alone: SDR RISK-001 names the SubagentStart limit unmeasured, and a cut rule set fails silently in every teammate.
**Risks:**
- **RISK-012** Haiku quotes markers unreliably (outline R-004). Mitigation: the evidence is the probe's transcript copied through `agent_transcript_path` and the hook logs, as the outline prescribes, not the model's summary.

## Scope

**In:**
- `core/` as the plugin: manifest, agents, skills, rules, output style, hooks, `bin/tether` and `bin/tether.mjs`, kernel.
- Forwarders in `.claude/` for the transition, deleted in phase 6.
- Rule injection on SessionStart and SubagentStart; `harness-authoring` kept native.
- `tether:` names and the `tether` CLI in Markdown and kernel messages; the names test.
- The probe of phase 2, inside `spike/`.
- The root marketplace and a fresh-fixture install check.
- The `plugin` bench adapter on `core/`, the hook budget test on `core/hooks`, and one 14-task run.

**Out:**
- `tether init`, `doctor`, `map`, `which` (step 4), including the permission keys a user project needs.
- Extensions and their rule additions (step 5).
- Outline checks 13 and 14 (OQ-003).
- The final marketplace, npm and organization names (OQ-001).
- `.claude/scripts/`, `statusline.mjs` and `ccstatusline.json`: they stay as this repository's own tools.
- Rule texts that state default caps (Separate RISK-005).

## Phase 1: Kernel, hooks and CLI move into `core/` behind forwarders
**Touch set:**
- `.claude/lib/`: moved whole to `core/lib/`
- `.claude/hooks/*.mjs`: ten shells moved to `core/hooks/`
- `.claude/hooks/README.md`: moved to `core/hooks/README.md`
- `.claude/bin/harness.mjs`: moved to `core/bin/tether.mjs`; forwarder left
- `core/bin/tether`: new POSIX launcher, mode 100755
- `core/hooks/hooks.json`: new, plugin form of settings hooks
- `core/lib/hooks/guard.bash.mjs`: classify `tether` wrappers too
- `.claude/hooks/<name>.mjs` (ten): one-line forwarders into `core/hooks/`
- `.claude/bin/statusline.mjs`: imports from `core/lib/`
- `.claude/settings.json`: read only; hooks unchanged
- `.claude/rules/harness-authoring.md`: `paths:` adds `core/**`; route path
- `bench/adapters/rework.mjs`: install copies `core/` too
- `test/kernel/`: import specifiers point at `core/lib/`
- `test/hooks/`: spawn `core/hooks/`; forwarder and `tether` cases
- `test/kernel/kernel-sources.mjs`: `KERNEL_DIRS` under `core/`
- `test/kernel/plugin-layout.test.mjs`: new, parity, imports, launcher mode
- `test/budgets.test.mjs`: hook budget walks `core/hooks`
- `test/markdown-paths.test.mjs`: `ELSEWHERE` entries for moved paths [INFERRED]
- `package.json`: `harness` script runs `core/bin/tether.mjs`
- `README.md`, `CONTRIBUTING.md`: moved paths named in docs [INFERRED]
**Changes:** One Bash call (a scratch script outside the repository) runs `git mv .claude/lib core/lib`, moves the ten hook shells and `README.md` into `core/hooks/`, moves `.claude/bin/harness.mjs` to `core/bin/tether.mjs`, and writes the eleven forwarders, so no tool call sees a half-moved tree. The shells keep their relative imports (`../lib/hook.mjs`), which still resolve because `core/hooks` and `core/lib` are siblings. `core/bin/tether` is `#!/bin/sh` plus `exec node "$(dirname "$0")/tether.mjs" "$@"`, as in `spike/tether/bin/tether`. `core/hooks/hooks.json` is `{ "hooks": <settings.json hooks block> }` with `${CLAUDE_PROJECT_DIR}/.claude/hooks/` replaced by `${CLAUDE_PLUGIN_ROOT}/hooks/`; no plugin manifest yet, so nothing loads it. In `guard.bash`, the wrapper test that today matches `node …/harness.mjs` also matches `node …/tether.mjs` and a first word of `tether` or a path ending in `/tether`, and judges the wrapped command the same way; no other decision changes. `plugin-layout.test.mjs` checks: hooks.json equals the swapped settings block; every `import` under `core/` is a Node built-in (`module.builtinModules`, with or without `node:`) or resolves inside `core/`; every `.claude/hooks/*.mjs` and `.claude/bin/harness.mjs` is one import of its `core/` counterpart; `git ls-files -s core/bin/tether` reports mode 100755. The Separate scans (self-location ban, no `.claude` literal outside `paths.mjs`) now walk `core/lib`, `core/hooks` and `core/bin`.
**Done when:**
- **T-1.1** `.claude/lib/` does not exist; `core/lib/`, the ten `core/hooks/*.mjs` shells and `core/bin/tether.mjs` exist, and `git ls-files -s core/bin/tether` shows mode 100755.
- **T-1.2** A hook test pipes the same payloads into `.claude/hooks/guard.bash.mjs` and `core/hooks/guard.bash.mjs`, and into both `inject.state.mjs` files, and gets byte-identical stdout.
- **T-1.3** `plugin-layout.test.mjs` passes, and fails when a planted `import "../../bench/run.mjs"` sits in a `core/lib` module or when hooks.json drops one settings entry.
- **T-1.4** `guard.bash` denies `tether drive --run "rm -rf src"`, `node core/bin/tether.mjs check --only "git push --force origin trunk"` and `core/bin/tether drive --start "sudo node server.mjs" --hit /health`, and returns no decision for `tether state x`, matching the existing `harness.mjs` cases.
- **T-1.5** The hook cold-start budget test walks `core/hooks` and passes; the self-location and `.claude`-literal scans cover `core/` and pass.
- **T-1.6** `node .claude/bin/harness.mjs state <this id>`, `node core/bin/tether.mjs state <this id>` and `sh core/bin/tether state <this id>` print the same JSON, and `.tether/state/ledger.jsonl` gains rows after the move, so `emit.ledger` fires through its forwarder.
- **T-1.7** `npm test` passes, including the `rework` install test from `bench/test/adapters.test.mjs`.

## Phase 2: Probe the premises (spends quota)
**Touch set:**
- `spike/run.mjs`: per-run `env`; new runs; size arguments
- `spike/tether/hooks/hooks.json`: sized injection entries, both events
- `spike/tether/hooks/inject-size.mjs`: new, marker text of N characters
- `spike/tether/hooks/stop.mjs`: log `agent_transcript_path`
- `spike/tether/agents/probe-prefixed.md`: new, `skills: tether:where`
- `spike/tether/output-styles/probe.md`: new plugin output style
- `spike/fixtures/11/CLAUDE.md`: new, marker C-11
- `spike/fixtures/11/.claude/rules/spike-rule.md`: new, marker R-11
- `spike/out/probe-step3.json`: new, the results this record reads
- `work/20261005-tether-spike-follow-up-four-open-checks/research.md`: read only; method for checks 11 and 12
**Changes:** Starts only after the owner approves phase 1 with the quote in its packet. Run the preflight of the outline (no `ANTHROPIC_API_KEY`, no `apiKeyHelper`, `claude --version` recorded), then, serially, with `--model haiku`, `--max-budget-usd 1` and `--plugin-dir spike/tether`: check 11 as the outline words it (runs `11` and `11-general`); check 12 for SubagentStart at 6,000, 10,000 and 20,000 characters, refined to within 1,000 characters of the cut, plus the split run with two hooks of 6,000; the same sizes and split for SessionStart, read from the lead before any spawn; and one run where the lead invokes `tether:where`, spawns `probe-prefixed`, and reports both the probe's quoted root and the session's `output_style` from the init event while `.claude/settings.json` in the fixture selects the plugin style. Evidence comes from transcripts and hook logs, never from the model's summary alone. Write `spike/out/probe-step3.json` with this shape:
```
{ "claude_version": "2.1.x",
  "subagent_start": { "largest_whole": 0, "smallest_cut": null, "mechanism": "", "scope": "hook|event" },
  "session_start":  { "largest_whole": 0, "smallest_cut": null, "mechanism": "", "scope": "hook|event" },
  "subagent_loads": { "claude_md": false, "rules": false },
  "prefixed_skill_preloads": false, "plugin_root_in_preloaded_skill": false,
  "output_style_name": "",
  "runs": [{ "name": "", "log": "spike/out/...", "cost_usd": 0 }], "total_cost_usd": 0 }
```
`smallest_cut` is `null` when nothing up to 20,000 characters was cut. Outline checks 13 and 14 do not run (D-008).
**Done when:**
- **T-2.1** `spike/out/probe-step3.json` exists, parses, has every key above with a non-empty value or an explicit `null` for `smallest_cut`, and every `runs[].log` file exists.
- **T-2.2** For both events the cut is bracketed within 1,000 characters, or `smallest_cut` is `null`; `mechanism` names what happened (truncated with a notice, spilled to a file, rejected whole, or passed whole) and `scope` is decided by the split run.
- **T-2.3** `total_cost_usd` is at most 2, no single run reports more than 1 dollar, and the preflight output precedes the first run in the developer's block.
- **T-2.4** `git status --porcelain` lists changes only under `spike/` and `work/`.
- **T-2.5** `npm test` passes.

## Phase 3: Rules reach the lead and every teammate by injection
**Touch set:**
- `.claude/rules/prose.md`, `comments.md`, `work-items.md`, `security-paths.md`: moved to `core/rules/`
- `core/rules/work-items.md`, `core/rules/security-paths.md`: `paths:` frontmatter dropped
- `core/lib/paths.mjs`: `pluginRoot()` and `rulesDir()`
- `core/lib/hooks/inject.rules.mjs`: new handler `injectRules`
- `core/hooks/inject.rules.mjs`: new four-line shell
- `.claude/hooks/inject.rules.mjs`: new forwarder
- `core/hooks/hooks.json`: SessionStart and SubagentStart entries
- `.claude/settings.json`: the same two entries, parity
- `.claude/rules/harness-authoring.md`: `paths:` adds `.claude-plugin/**`
- `CLAUDE.md`: the Rules line names injection
- `test/hooks/handlers.test.mjs`: `injectRules` cases
- `test/kernel/paths.test.mjs`: allow-list `paths.mjs`; root test
- `test/budgets.test.mjs`: rule lines over both folders; injection cap
- `bench/adapters/rework.mjs`, `bench/test/adapters.test.mjs`: rules now under `core/rules/`
- `spike/out/probe-step3.json`: read only; the measured limits
**Changes:** Marked security because it changes how the `security-paths` rule reaches agents. One Bash call moves the four rule files with `git mv` and writes the forwarder. `prose` and `comments` have no frontmatter today; `work-items` and `security-paths` lose theirs, and `security-paths` keeps its pointer to `security_paths` in `.tether/config.json` for the path list. `pluginRoot()` returns the folder two levels above `paths.mjs` (`core/` in this checkout, the cache folder when installed), and is the only self-location read the Separate scan allows; `rulesDir()` is `<pluginRoot>/rules`. `injectRules(event, { root })` reads the four files in the order prose, comments, work-items, security-paths, joins them with one blank line, and returns the D-004 output for `event.hook_event_name`, or `null` when the folder is missing. Registration follows `probe-step3.json`: one entry per event when `scope` is `event` or the total fits one hook; one entry per rule file when the limit is per hook and the total does not fit. When SessionStart's limit is per event, lower `GLOSSARY_CHARS` in `inject.state` so its worst case plus the rules fits. A SubagentStart limit below 2,291 characters (the largest rule) stops the phase as `PHASE STALLED` with OQ-004. The budget test adds `inject_chars` set to the measured limit, or 10,000 when nothing was cut, with no comment beside it.
**Done when:**
- **T-3.1** Piping `{"hook_event_name":"SubagentStart","agent_type":"tether:developer"}` into `core/hooks/inject.rules.mjs` prints `additionalContext` that holds the headings `# Writing rules`, `# Comments in code`, `# Work items`, `# Security paths` in that order and no `paths:` line; the same holds for `{"hook_event_name":"SessionStart","source":"compact"}`.
- **T-3.2** `test/budgets.test.mjs` fails when the joined rule text, or the SessionStart worst case where the limit is per event, exceeds `inject_chars`, and passes on the tree.
- **T-3.3** `.claude/rules/` holds only `harness-authoring.md`, whose `paths:` lists `core/**` and `.claude-plugin/**`.
- **T-3.4** The paths test passes with `paths.mjs` as the only module that reads its own location, and `pluginRoot()` returns the folder that holds `rules/` and `lib/`.
- **T-3.5** The phase 1 parity test passes with both new registrations in `core/hooks/hooks.json` and `.claude/settings.json`.
- **T-3.6** `npm test` passes; a `rework` install holds the four rules under `core/rules/` and no `harness-authoring.md` anywhere.

## Phase 4: Cut over: manifest, skills, agents and `tether:` names
**Touch set:**
- `.claude/skills/`: moved whole to `core/skills/`; names, CLI, paths
- `.claude/agents/`: moved to `core/agents/`; names, `skills:` form
- `.claude/output-styles/custom.md`: moved to `core/output-styles/`
- `.claude/agent-memory/architect/`, `reviewer/`: moved to `tether-architect/`, `tether-reviewer/`
- `core/.claude-plugin/plugin.json`: new manifest with explicit skills
- `core/rules/work-items.md`, `core/rules/security-paths.md`: `tether` CLI and names
- `core/bin/tether.mjs`: usage text names `tether`
- `core/hooks/README.md`: CLI name
- `core/lib/check.mjs`, `drive.mjs`, `migrate.mjs`, `next.mjs`, `packet.mjs`, `pr.mjs`, `preflight.mjs`, `repos.mjs`, `review.mjs`, `sources.mjs`, `unsafe.mjs`, `work.mjs`: messages name `tether`
- `core/lib/hooks/guard.bash.mjs`, `guard.scope.mjs`, `inject.state.mjs`, `route.verdict.mjs`: messages name `tether`
- `CLAUDE.md`: launch line, `tether` CLI, `tether:` skills
- `.claude/settings.json`: hooks block deleted; output style; `Bash(tether *)`
- `.claude/rules/harness-authoring.md`: names line uses `tether:`
- `package.json`: `claude` script
- `test/kernel/names.test.mjs`: new, the naming contract
- `test/kernel/plugin-layout.test.mjs`: no settings hooks; manifest skills list
- `test/budgets.test.mjs`: scans `core/agents`, `core/skills`
- `test/markdown-paths.test.mjs`: `ELSEWHERE` and skill example prefix
- `test/kernel/`, `test/hooks/`: message assertions say `tether` [INFERRED]
- `README.md`, `CONTRIBUTING.md`: launch and names
- `spike/out/probe-step3.json`: read only; frontmatter form, style name
**Changes:** Marked security: it rewrites the permission allow list and moves the guards' only loader. One Bash call moves skills, agents, output style and the two tracked agent-memory folders. `plugin.json` per D-006, its `skills` array listing the 15 folders under `core/skills/` in name order. Rename per D-005: `node .claude/bin/harness.mjs <verb>` and prose `harness <verb>` become `tether <verb>`; skill and slash names take `tether:`; spawn instructions name the type `tether:<role>` and keep the instance name; each `SKILL.md` says that the paths it and its step files cite are relative to `${CLAUDE_PLUGIN_ROOT}/skills/`, and `.claude/skills/<s>/<rest>` citations become `<s>/<rest>`; the `documenting` script calls become `node "${CLAUDE_PLUGIN_ROOT}/skills/documenting/scripts/<script>.mjs"` (or follow the RISK-008 fallback when `plugin_root_in_preloaded_skill` is false). Agent `skills:` entries take `tether:` only when `prefixed_skill_preloads` is true. Kernel `actor` and verdict `agent` values stay bare. Comments the rename makes stale, such as the usage header of `tether.mjs`, are deleted, never reworded. `names.test.mjs` scans `core/**/*.md` (skill `examples/` excluded), `CLAUDE.md` and string literals under `core/lib`, and fails on a bare skill name in backticks or after `/`, on `node .claude/bin/harness.mjs`, on `harness <verb>` for any CLI verb, and on `.claude/skills/` or `.claude/agents/`. `settings.json`: `outputStyle` takes `output_style_name`, `Bash(tether *)` joins the allow list, the `.claude/bin/harness.mjs` rule stays for the forwarder until phase 6, and the `hooks` block is deleted as the last edit (RISK-003). `CLAUDE.md` opens with `claude --plugin-dir core` and stays within 2,048 bytes. At the gate the lead tells the owner to restart on `claude --plugin-dir core` and resume with `/tether:resuming <id>`.
**Done when:**
- **T-4.1** `claude plugin validate core` exits 0, and `claude --plugin-dir core plugin details tether` lists 15 skills each once, the agents `analyst`, `architect`, `developer`, `reviewer`, and hooks on SessionStart, SubagentStart, PreToolUse, PostToolUse, Stop and SubagentStop.
- **T-4.2** `names.test.mjs` passes on the tree and fails on a planted `/ordering`, a backticked `designing`, a `node .claude/bin/harness.mjs` line, and a `harness route` string in a `core/lib` module.
- **T-4.3** `.claude/settings.json` has no `hooks` key, and `.claude/` holds no `skills/`, `agents/` or `output-styles/` folder; the layout test asserts both.
- **T-4.4** The forwarders still serve the old session: `node .claude/bin/harness.mjs next <this id>` prints the next action.
- **T-4.5** `CLAUDE.md` is at most 2,048 bytes and names `claude --plugin-dir core`, `tether:expediting`, `tether:ordering`, `tether:designing` and `tether:researching`.
- **T-4.6** `.claude/agent-memory/tether-architect/` and `tether-reviewer/` hold the four moved files, and `.claude/agent-memory/architect/` and `reviewer/` hold none.
- **T-4.7** `npm test` passes.
**Irreversible:** `core/.claude-plugin/plugin.json` publishes the plugin name `tether` [IRREVERSIBLE] at the first install outside the team; nothing in this record installs outside the team.

## Phase 5: The bench runs the plugin from `core/`
**Touch set:**
- `bench/adapters/plugin.mjs`: `pluginDir` is `core/`; install; tools; gate functions
- `bench/adapters/rework.mjs`: deleted; shared functions moved out
- `bench/run.mjs`: adapter table, `defaultHarnessRoot`, `harness_dirty` covers `core`
- `bench/test/adapters.test.mjs`: plugin install cases replace rework ones
- `bench/README.md`: adapter list [INFERRED]
- `.claude/rules/harness-authoring.md`: bench command uses `--harness plugin`
- `package.json`: `bench:dry` uses `--harness plugin`
- `spike/build-full.mjs`, `spike/tether-full/`: deleted
**Changes:** `plugin.install(repo, harnessRoot)` copies `CLAUDE.md`, calls `copyConfig`, creates `work/`, and writes `.claude/settings.json` from this repository's settings minus `hooks`, keeping `outputStyle`; it copies no rules and no part of `core/`. `pluginDir` resolves to `<harnessRoot>/core` and the install throws when `core/.claude-plugin/plugin.json` is missing. `allowedTools` is the trunk list plus `Bash(tether *)`. `gate`, `signals`, `reportFiles`, `copyConfig` and `isRepositoryOnly` move from `rework.mjs` into `plugin.mjs` unchanged, and `rework.mjs` is deleted. `bench/run.mjs` maps `plugin` to `harnessRoot = ROOT` and answers `--harness rework` with an error naming `plugin`. Then run `node bench/run.mjs --harness plugin --tasks all --dry` and put its task list and budget sum in the block with the 42 to 47 dollar estimate (D-007).
**Done when:**
- **T-5.1** An adapter test installs into a temporary repo and finds `CLAUDE.md`, `.tether/config.json`, `work/`, and a `.claude/settings.json` with no `hooks` key, and no `.claude/rules/`, `.claude/skills/` or `core/` folder.
- **T-5.2** `node bench/run.mjs --harness plugin --tasks all --dry` exits 0 and lists 14 tasks with their budgets, with no build step before it.
- **T-5.3** `bench/adapters/rework.mjs`, `spike/build-full.mjs` and `spike/tether-full/` do not exist, and `node bench/run.mjs --harness rework --dry` exits non-zero naming `plugin`.
- **T-5.4** The developer's block quotes the dry-run budget sum and the expected spend.
- **T-5.5** `npm test` passes.

## Phase 6: Marketplace, local install, and the forwarders retire
**Touch set:**
- `.claude-plugin/marketplace.json`: new root marketplace, provisional name
- `.claude/hooks/`: forwarders deleted, folder gone
- `.claude/bin/harness.mjs`: forwarder deleted
- `.claude/settings.json`: old CLI and skill-script allow rules removed
- `test/kernel/plugin-layout.test.mjs`: marketplace and no-forwarder checks
- `test/hooks/hooks.test.mjs`: forwarder cases removed
- `package.json`: `harness` script becomes `tether`
- `CONTRIBUTING.md`: install from a local path [INFERRED]
**Changes:** Marked security: it narrows the permission allow list, and its gate carries phase 5's quote as the owner's go for phase 7. Runs in the restarted session on the plugin. `marketplace.json` per D-006 with `owner` and one plugin entry. Delete the eleven forwarders and `Bash(node .claude/bin/harness.mjs*)` and `Bash(node .claude/skills/documenting/scripts/*)`; `guard.bash` keeps classifying `harness.mjs`, since dropping a deny path gains nothing. The install check runs outside the repository: copy `bench/fixture` (without `node_modules`) to a temporary folder, `git init` it, run `claude plugin marketplace add <this checkout> --scope project` and `claude plugin install tether@tether-dev --scope project` there, record `claude plugin list` and the fixture's `.claude/settings.json`, then `claude plugin uninstall` and `claude plugin marketplace remove` with `--scope project`, and list leftover folders under `~/.claude/plugins` (RISK-010). No model call runs.
**Done when:**
- **T-6.1** `claude plugin validate .` exits 0 for the root marketplace.
- **T-6.2** In the temporary fixture, `claude plugin list` shows `tether` from `tether-dev` at `1.0.0-alpha.0` with project scope, and the fixture's `.claude/settings.json` holds only `extraKnownMarketplaces` and `enabledPlugins`.
- **T-6.3** After cleanup, `claude plugin marketplace list` no longer shows `tether-dev`, and the block lists any leftover cache folder.
- **T-6.4** `.claude/hooks/` and `.claude/bin/harness.mjs` do not exist, and no allow rule in `.claude/settings.json` names `.claude/bin/` or `.claude/skills/`.
- **T-6.5** In this session, `tether next <this id>` from the Bash tool prints the next action, and a test Write of a commented line into a scratch `.mjs` is denied by `guard.comments` from the plugin.
- **T-6.6** `npm test` passes.

## Phase 7: Fourteen tasks on the plugin (spends quota)
**Touch set:**
- `bench/results/plugin-core.json`: new run record
- `bench/results/spend.log`: appended by the runner, ignored by git
- `bench/results/rework-clean.json`: read only; information baseline
**Changes:** Starts only after the owner approves phase 6 with the quote. Run `node bench/run.mjs --harness plugin --tasks all --runs 1 --out bench/results/plugin-core.json` from a clean tree at the phase 6 commit. On a single failed task, stop and ask for a go to re-run that task alone (RISK-011); merge the re-run into the record only through the runner's own `--out` of a second file named in the block. Then run `node bench/report.mjs bench/results/rework-clean.json bench/results/plugin-core.json` and quote the paired check for information.
**Done when:**
- **T-7.1** `bench/results/plugin-core.json` holds 14 records, its manifest names `harness: plugin` and the phase 6 commit, and `harness_dirty` is false.
- **T-7.2** All 14 records have `pass: true`, counting at most one approved re-run per task.
- **T-7.3** The spend of the run, from `spend.log`, is within the ceiling quoted at phase 6's gate.
- **T-7.4** The report renders, and the block quotes its paired-check lines.
- **T-7.5** `npm test` passes.

## Open questions
- **OQ-001** [STRATEGIC] What is the marketplace name, settled with the repository, npm and organization names that SDR RISK-003 ties it to? Owner: owner, at the alpha, through consulting. Fallback: `tether-dev`, nothing committed names it, and no install outside the team.
- **OQ-002** The request asks for a one-command install from a local path, but Claude Code 2.1.282 installs only from a known marketplace. Owner: owner. Fallback: phase 6 runs the two calls; a single command belongs to `tether init` in step 4.
- **OQ-003** Outline checks 13 (plugin and project hook order, deny between them) and 14 (version pinning) stay unrun. Owner: the step 4 design, where `init` writes project settings. Fallback: after phase 4 this repository has no project hooks and pins no version.
- **OQ-004** [STRATEGIC] If phase 2 finds that SubagentStart cuts below 2,291 characters, hook injection cannot carry the largest rule, and SDR-00001 D-003 needs amending. Owner: owner, through consulting. Fallback: phase 3 stalls with the measurement; phases 1 and 2 stand.
- **OQ-005** If phase 2 shows that settings cannot select a plugin output style, item 1's output style cannot ship in the plugin. Owner: owner. Fallback: `custom.md` stays in `.claude/output-styles/` as this repository's own, and `core/` ships none.

## Revision log
