---
kind: design
lane: design
title: Rename Tether to Picket
date: 2026-10-10
audience: developer
sources: request.md; .claude/MEMORY.md (Product name Picket, 2026-10-10; glossary); artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md (RISK-003); core/lib/paths.mjs; core/lib/migrate.mjs; core/lib/init.mjs; core/lib/agent-name.mjs; core/lib/kernel-call.mjs; core/lib/hooks/guard.bash.mjs; core/lib/hooks/guard.scope.mjs; core/lib/hooks/route.verdict.mjs; core/lib/extensions.mjs; core/lib/extension.schema.json; core/lib/config.schema.json; core/bin/tether, tether.cmd, tether.mjs; core/.claude-plugin/plugin.json; .claude-plugin/marketplace.json; core/templates/claude-block.md; .claude/settings.json; .claude/agent-memory/; .gitignore; package.json; README.md; CONTRIBUTING.md; bench/adapters/plugin.mjs; bench/run.mjs; bench/lib/grade.mjs; git grep counts (501 occurrences of "tether" outside work/, spike/, bench/results/ and artifacts/)
phases:
  - n: 1
    files:
      - core/lib/paths.mjs
      - core/lib/init.mjs
      - core/lib/extensions.mjs
      - core/lib/hooks/guard.scope.mjs
      - core/lib/config.schema.json
      - core/lib/extension.schema.json
      - core/hooks/README.md
      - core/agents/developer.md
      - core/rules/security-paths.md
      - core/skills/branching/SKILL.md
      - core/skills/designing/steps/10-design.md
      - core/skills/expediting/steps/30-check.md
      - core/skills/inspecting/SKILL.md
      - core/skills/ordering/steps/10-order.md
      - core/skills/reviewing/SKILL.md
      - core/skills/summarizing/SKILL.md
      - CLAUDE.md
      - .gitignore
      - .picket/config.json
      - bench/adapters/plugin.mjs
      - bench/run.mjs
      - bench/lib/grade.mjs
      - bench/test/adapters.test.mjs
      - test/budgets.test.mjs
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
      - test/kernel/close.test.mjs
      - test/kernel/config.test.mjs
      - test/kernel/drive.test.mjs
      - test/kernel/extensions.test.mjs
      - test/kernel/init.test.mjs
      - test/kernel/paths.test.mjs
      - test/kernel/preflight.test.mjs
      - test/kernel/review.test.mjs
      - test/markdown-paths.test.mjs
      - test/skills/filename.test.mjs
    greps:
      - path: core/lib/paths.mjs
        pattern: "\\.picket"
      - path: .gitignore
        pattern: ^\.picket/state/$
    tests: true
    drive: true
    security: true
  - n: 2
    files:
      - .claude/rules/harness-authoring.md
      - .claude/settings.json
      - bench/adapters/plugin.mjs
      - bench/run.mjs
      - bench/test/adapters.test.mjs
      - CLAUDE.md
      - core/agents/analyst.md
      - core/agents/architect.md
      - core/agents/developer.md
      - core/agents/reviewer.md
      - core/bin/picket
      - core/bin/picket.cmd
      - core/bin/picket.mjs
      - core/bin/tether
      - core/bin/tether.cmd
      - core/bin/tether.mjs
      - core/hooks/README.md
      - core/lib/check.mjs
      - core/lib/drive.mjs
      - core/lib/extension.schema.json
      - core/lib/hooks/guard.bash.mjs
      - core/lib/hooks/guard.scope.mjs
      - core/lib/hooks/inject.state.mjs
      - core/lib/hooks/route.verdict.mjs
      - core/lib/init.mjs
      - core/lib/kernel-call.mjs
      - core/lib/migrate.mjs
      - core/lib/next.mjs
      - core/lib/paths.mjs
      - core/lib/preflight.mjs
      - core/rules/comments.md
      - core/rules/security-paths.md
      - core/rules/work-items.md
      - core/skills/branching/steps/10-create.md
      - core/skills/designing/SKILL.md
      - core/skills/designing/steps/10-design.md
      - core/skills/designing/steps/20-crosscheck.md
      - core/skills/designing/steps/40-amend.md
      - core/skills/expediting/SKILL.md
      - core/skills/expediting/steps/30-check.md
      - core/skills/inspecting/SKILL.md
      - core/skills/ordering/SKILL.md
      - core/skills/ordering/steps/10-order.md
      - core/skills/ordering/steps/20-phase.md
      - core/skills/ordering/steps/30-gate.md
      - core/skills/ordering/steps/40-review.md
      - core/skills/researching/SKILL.md
      - core/skills/researching/steps/10-outline.md
      - core/skills/resuming/SKILL.md
      - core/skills/reviewing/SKILL.md
      - core/skills/summarizing/SKILL.md
      - core/templates/claude-block.md
      - package.json
      - test/budgets.test.mjs
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
      - test/kernel/check.test.mjs
      - test/kernel/cli.test.mjs
      - test/kernel/close.test.mjs
      - test/kernel/drive.test.mjs
      - test/kernel/extensions.test.mjs
      - test/kernel/init.test.mjs
      - test/kernel/migrate.test.mjs
      - test/kernel/names.test.mjs
      - test/kernel/next.test.mjs
      - test/kernel/paths.test.mjs
      - test/kernel/plugin-layout.test.mjs
      - test/kernel/preflight.test.mjs
      - test/kernel/review.test.mjs
      - test/kernel/sources.test.mjs
      - test/kernel/work.test.mjs
      - test/skills/filename.test.mjs
      - test/skills/lane-check.test.mjs
    greps:
      - path: core/lib/kernel-call.mjs
        pattern: picket
      - path: core/lib/init.mjs
        pattern: Bash\(picket \*\)
      - path: package.json
        pattern: "@picketai/picket"
    tests: true
    drive: true
    security: true
  - n: 3
    files:
      - .claude/MEMORY.md
      - .claude/rules/harness-authoring.md
      - .claude/settings.json
      - .claude-plugin/marketplace.json
      - bench/test/adapters.test.mjs
      - CLAUDE.md
      - CONTRIBUTING.md
      - README.md
      - core/.claude-plugin/plugin.json
      - core/agents/analyst.md
      - core/agents/architect.md
      - core/agents/reviewer.md
      - core/bin/picket.mjs
      - core/lib/agent-name.mjs
      - core/lib/config.schema.json
      - core/lib/extension.schema.json
      - core/lib/extensions.mjs
      - core/lib/hooks/inject.state.mjs
      - core/lib/hooks/route.verdict.mjs
      - core/lib/init.mjs
      - core/rules/comments.md
      - core/rules/security-paths.md
      - core/skills/benchmarking/SKILL.md
      - core/skills/branching/SKILL.md
      - core/skills/consulting/SKILL.md
      - core/skills/designing/SKILL.md
      - core/skills/documenting/SKILL.md
      - core/skills/expediting/SKILL.md
      - core/skills/inspecting/SKILL.md
      - core/skills/ordering/SKILL.md
      - core/skills/proofreading/SKILL.md
      - core/skills/researching/SKILL.md
      - core/skills/resuming/SKILL.md
      - core/skills/reviewing/SKILL.md
      - core/skills/summarizing/SKILL.md
      - core/skills/ticketing/SKILL.md
      - core/skills/understanding/SKILL.md
      - core/skills/branching/steps/10-create.md
      - core/skills/consulting/steps/20-ratify.md
      - core/skills/designing/steps/10-design.md
      - core/skills/designing/steps/20-crosscheck.md
      - core/skills/ordering/steps/10-order.md
      - core/skills/ordering/steps/20-phase.md
      - core/skills/ordering/steps/40-review.md
      - core/skills/researching/steps/10-outline.md
      - core/skills/researching/steps/20-deep.md
      - core/skills/reviewing/steps/10-alignment.md
      - core/skills/reviewing/templates/patterns.md
      - core/templates/claude-block.md
      - .claude/agent-memory/picket-architect/MEMORY.md
      - .claude/agent-memory/picket-architect/claude-cli-plugin-facts.md
      - .claude/agent-memory/picket-architect/transcript-facts.md
      - .claude/agent-memory/picket-reviewer/MEMORY.md
      - .claude/agent-memory/picket-reviewer/review-summary-drops-claude-paths.md
      - test/budgets.test.mjs
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
      - test/kernel/admit.test.mjs
      - test/kernel/extensions.test.mjs
      - test/kernel/init.test.mjs
      - test/kernel/names.test.mjs
      - test/kernel/plugin-layout.test.mjs
      - test/kernel/route.test.mjs
      - test/skills/lane-check.test.mjs
    greps:
      - path: core/.claude-plugin/plugin.json
        pattern: "name": "picket"
      - path: .claude-plugin/marketplace.json
        pattern: picket-dev
      - path: core/templates/claude-block.md
        pattern: ^# Picket$
    tests: true
    drive: true
    security: true
  - n: 4
    files:
      - test/markdown-paths.test.mjs
      - core/lib/kernel-call.mjs
      - core/lib/hooks/guard.bash.mjs
      - core/lib/agent-name.mjs
      - .claude/settings.json
      - test/names-picket.test.mjs
      - test/hooks/handlers.test.mjs
      - test/kernel/names.test.mjs
      - test/kernel/route.test.mjs
      - test/kernel/plugin-layout.test.mjs
      - test/skills/lane-check.test.mjs
    greps:
      - path: test/names-picket.test.mjs
        pattern: superseded
    tests: true
    drive: true
    security: true
---
# Design: Rename Tether to Picket

## Problem

The product is renamed from Tether to Picket before the alpha tag (`.claude/MEMORY.md`, 2026-10-10: npm `@picketai/picket`, GitHub `picketai/picket`, command `picket`). Everything a user reads or types moves: the CLI, the `.tether/` folder, the plugin name and its `tether:` prefix, the marketplace `tether-dev`, the rules `tether init` writes, the CLAUDE.md block, hooks, rules, skills, agents, templates, README.md, CONTRIBUTING.md and the glossary. That is 501 occurrences outside `work/`, `spike/`, `bench/results/` and `artifacts/`. The hard force is that this session runs on the plugin being renamed. It loads `core/` with `--plugin-dir`, invokes `tether:` skills, spawns `tether:` agents, and calls `tether` on every step. Its plugin name, skill names and agent types are fixed when it starts, while hook code, the CLI and the files on PATH are read live. Only this repository has ever used the old name, so no shipped code or doc keeps backward support for it; this repository's `.tether/` moves once inside a phase (user ruling, 2026-10-10). Records (`work/`, `artifacts/`, `bench/results/`, `spike/`, git history, superseded memory lines) keep the old name, and `harness` stays an internal word.

## Decisions

### D-001 (r3): four phases with a window in which both names resolve, and one session restart
**Decision:** Infrastructural decision. The rename lands in four phases, each leaving the lead able to work. Only this repository has ever used the old name, so no shipped code or doc keeps backward support for it (user ruling, 2026-10-10). The two-name window below exists only so this live session survives the rename, and Phase 4 deletes everything the window added.
- **Phase 1:** the folder. The code switches to `.picket/`, and this repository's own `.tether/` moves once, by hand, inside the phase. Code paths are read live, so no restart is needed.
- **Phase 2:** the command. `picket` becomes the CLI, `tether` keeps working as a forwarding alias, and every text that tells someone to type a verb says `picket`. New files in the plugin's `bin/` resolve on the PATH the session already has, so no restart is needed.
- **Phase 3:** the plugin identity. The plugin, the marketplace and the `picket:` prefix change, and the kernel accepts both prefixes. **After the Phase 3 gate is approved and committed, the lead must end this session and start a new one with `claude --plugin-dir core`. Between that commit and the restart, the lead spawns nothing, continues no agent, and invokes no skill: every SessionStart and SubagentStart injection and every skill text from then on says `picket:<name>`, which the live session cannot resolve.** Until then, the live session still knows its skills and agents as `tether:*`, while the texts say `picket:*`.
- **Phase 4:** closing the window. It runs in the new session and deletes every alias the window added: the `tether` launchers, both-name acceptance in `kernel-call.mjs` and `guard.bash`, `tether:` stripping in `agent-name.mjs`, `Bash(tether *)` in this repository's settings, and the window-era tests that name the old word. A test then pins that no tracked file outside the records names it.

No step is irreversible. Every change is in git, and the one-off folder move uses `git mv` for the tracked file and a plain move for the ignored state. The names become permanent only at the first install outside the team or the first npm publish (SDR-00001 RISK-003), and both are the user's, outside this record.
**Instead of:** one big phase with a restart in the middle: the developer would edit the skills the lead is running mid-phase, and a failed phase would leave the lead on a half-renamed plugin with no gate to stop at.
**Risks:**
- **RISK-001** The lead keeps working past the Phase 3 gate without restarting and invokes `picket:ordering`, which the session does not know. Mitigation: no new code, because the window must add nothing that outlives Phase 4. The Phase 3 developer block carries the restart instruction in its `Decisions:` field, and the gate packet renders that field on its `decisions` line (`core/lib/packet.mjs`, `b.fields.decisions`), so the user and the lead see it at the gate (T-3.8). `tether next` and `picket next` both still work in the old session, so the work item state survives the restart.

### D-002 (r2): `.picket/` replaces `.tether/`, and this repository moves its folder once
**Decision:** Infrastructural decision. `paths.mjs` renames `TETHER_DIR` to `PICKET_DIR = ".picket"`, and state, config and extensions all follow it through the existing helpers. `ROOT_MARKERS`, `BOOKKEEPING_PREFIXES`, `guard.scope`'s extension and config ask rules, `init`'s `.gitignore` line and the bench's filters name `.picket/` only. The shipped code carries no trace of the old folder: no `migrate` step, no `LEGACY` entry, no guard and no preflight warning for it. This repository moves its own folder once, inside Phase 1, as a one-off step that is never shipped:
- `git mv .tether/config.json .picket/config.json` for the tracked file;
- a plain move of the ignored `.tether/state/` files into `.picket/state/`;
- removal of the empty `.tether/`.

The `.gitignore` line `.tether/state/` becomes `.picket/state/`.
**Instead of:** a `migrate` step from `.tether/` to `.picket/`: no project but this one ever had the old folder, so the step would ship backward support for a name nobody else knows, which the user ruled out.
**Risks:**
- **RISK-002** Between the code switch and the move, the live hooks already write new rows to `.picket/state/`, so a plain rename of the folder would clash or drop them. Mitigation: the one-off move appends each old `.jsonl` and `.log` file to its new namesake (`cat old >> new`, then delete old), renames the files that have no namesake, and runs straight after the code switch in the same phase; T-1.5 checks the row counts.

### D-003: the CLI is `picket`, with `tether` as an alias until Phase 4
**Decision:** Infrastructural decision that changes what runs without a prompt. `core/bin/tether.mjs` becomes `core/bin/picket.mjs`, with new launchers `picket` and `picket.cmd`. `tether`, `tether.cmd` and a one-line `tether.mjs` (`import "./picket.mjs";`) stay as forwarders until Phase 4. `kernel-call.mjs` accepts `picket`, `tether` and the `picket.mjs`, `tether.mjs` and `harness.mjs` scripts. `guard.bash`'s bare-kernel class accepts `picket` and `tether`. `init` writes `Bash(picket *)`, `PowerShell(picket *)`, `PowerShell(picket drive *)` and `PowerShell(picket check *)`, and this repository's `.claude/settings.json` carries `Bash(picket *)` beside `Bash(tether *)` until Phase 4. Every message the kernel and hooks print names `picket` (for example `picket: ARTIFACT WRITTEN applied to …`). `package.json` takes `"name": "@picketai/picket"`, `"bin": { "picket": "core/bin/picket.mjs" }` and the script `picket`. The heredoc delimiter in the lane skills becomes `PICKET_REQUEST_END`.
**Instead of:** switching the command in one step: the live session's loaded CLAUDE.md, and every agent spawned before the restart, still say `tether`, so a session without the alias would fail its next call.
**Risks:**
- **RISK-003** During the window, guard.bash allows a compound with bare `tether` or `picket` pieces, which is two names for one rule. Mitigation: both names run the same `picket.mjs`, and Phase 4 drops `tether` from both lists in the same commit as the launchers.

### D-004 (r2): the plugin is `picket` from marketplace `picket-dev`, and the prefix is `picket:`
**Decision:** Infrastructural decision. The plugin and marketplace manifests change:
- `core/.claude-plugin/plugin.json` takes `"name": "picket"` and the Picket description.
- `.claude-plugin/marketplace.json` takes `"name": "picket-dev"` with plugin `picket`.

Every `tether:<skill>`, `tether:<agent>` and `tether:custom` in skills, agents, rules, templates, hooks, CLAUDE.md, README.md, CONTRIBUTING.md and `.claude/settings.json` (`outputStyle`) becomes `picket:`. `agent-name.mjs` strips `picket:`, and also `tether:` during the window only, so the agents the old session spawns still route; Phase 4 deletes that. `init`'s marketplace constant becomes `picket-dev`, its plugin id `picket@picket-dev`, its cache read rule `Read(~/.claude/plugins/cache/picket-dev/**)`, and its block heading `# Picket`. It does not recognise the old heading: this repository's `CLAUDE.md` block is rewritten by hand from the template in Phase 3. `.claude/agent-memory/tether-<role>/` folders move to `picket-<role>/` with `git mv`, so the agents keep their memory after the restart, and their notes are edited so they no longer name the old word. The glossary and current Decisions lines in `.claude/MEMORY.md` name Picket. Superseded lines are records and keep their words. `extension.schema.json` has no `$id`, so only its title and descriptions change, and `SUPPORTED_SCHEMAS` stays `[1]`.
**Instead of:** keeping the plugin name `tether` and changing only the visible words: the `tether:` prefix is typed by users in every slash command, and SDR-00001 RISK-003 says the plugin name freezes at the first outside install, which has not happened yet.

### D-005 (r3): only records keep the old name, and `harness` stays
**Decision:** Infrastructural decision. Only records keep their text as written:
- work items under `work/` and the git history;
- `artifacts/` (the SDRs and reports, with `00001-tether-ships-claude-code-plugin.md` keeping its file name);
- `bench/results/` and `spike/`;
- superseded lines in `.claude/MEMORY.md`.

No code, test, doc or setting outside them names the old word after Phase 4. Records are also outside the Markdown path check: from Phase 4, `test/markdown-paths.test.mjs` skips `artifacts/` and the superseded lines of `.claude/MEMORY.md`, so a record may cite a path that no longer exists. Until then, its one `ELSEWHERE` entry lists the old `.tether/` paths those files cite. The internal `harness` names stay: `.claude/rules/harness-authoring.md`, `--harness plugin|trunk`, `harnessRoot`, `HARNESS_SOURCE_ANALYSIS`, the bench's `harness` manifest field, and `harness.mjs` in `KERNEL_SCRIPT`. They are internal per the glossary, and renaming `--harness` would split the bench's result history. Phase 4 adds `test/names-picket.test.mjs`. It fails when any tracked file contains the old word, case-insensitive, unless the file is under one of the four record folders, or the line is a superseded line in `.claude/MEMORY.md` (a line holding `[superseded`). Those are the only exceptions. The test file itself necessarily names the word it forbids, and it is skipped by its own path; OQ-002 asks the user to confirm that.
**Instead of:** renaming every occurrence including history: rewriting closed work items breaks their traces against `request.md` and their commit messages, and the request keeps them as written.

## Scope

**In:** the CLI, launchers and `package.json`; `.picket/` and this repository's one-off move of its folder; the plugin, marketplace and prefix; `init`'s rules, block and marketplace; every user-facing text in `core/`, README.md, CONTRIBUTING.md, CLAUDE.md, `.claude/settings.json`, `.claude/rules/harness-authoring.md`'s examples and `.claude/MEMORY.md`'s glossary; the agent memory folders; the bench adapter, grader and run filter; the tests that name either.
**Out:** registering `@picketai` on npm and creating the `picketai` GitHub organization and repository (the user's); `package.json`'s `repository`, `homepage` and `bugs` URLs (OQ-001); removing `tether-dev` marketplace keys from other projects (none exists: only this repository was set up, and it loads the plugin with `--plugin-dir`); the internal `harness` names (D-005); anything under `work/`, `artifacts/`, `bench/results/` and `spike/`.

## Phase 1: `.picket/` and the one-off move

**Touch set:**
- `core/lib/paths.mjs`: `PICKET_DIR`, markers, bookkeeping prefix
- `core/lib/init.mjs`: `.picket/state/` ignore line
- `core/lib/extensions.mjs`: folder through `PICKET_DIR`
- `core/lib/hooks/guard.scope.mjs`: ask rules name `.picket/`
- `core/lib/config.schema.json`: descriptions say `.picket/`
- `core/lib/extension.schema.json`: descriptions say `.picket/`
- `core/hooks/README.md`: state paths say `.picket/`
- `core/agents/developer.md`: scratch path says `.picket/`
- `core/rules/security-paths.md`: config path says `.picket/`
- `core/skills/branching/SKILL.md`: manifest path says `.picket/`
- `core/skills/designing/steps/10-design.md`: scratch path says `.picket/`
- `core/skills/expediting/steps/30-check.md`: state paths say `.picket/`
- `core/skills/inspecting/SKILL.md`: state paths say `.picket/`
- `core/skills/ordering/steps/10-order.md`: scratch path says `.picket/`
- `core/skills/reviewing/SKILL.md`: extension paths say `.picket/`
- `core/skills/summarizing/SKILL.md`: state paths say `.picket/`
- `CLAUDE.md`: the sources project fact
- `.gitignore`: `.picket/state/` replaces `.tether/state/`
- `.picket/config.json`: moved once with `git mv`
- `bench/adapters/plugin.mjs`: config copied from `.picket/`
- `bench/run.mjs`: dirty check and changed-files filter
- `bench/lib/grade.mjs`: `HARNESS_DIRS` names `.picket/`
- `bench/test/adapters.test.mjs`: installed config path
- `test/budgets.test.mjs`, `test/hooks/hooks.test.mjs`, `test/kernel/close.test.mjs`, `test/kernel/config.test.mjs`, `test/kernel/drive.test.mjs`, `test/kernel/extensions.test.mjs`, `test/kernel/preflight.test.mjs`, `test/kernel/review.test.mjs`, `test/skills/filename.test.mjs`: fixture paths move
- `test/kernel/paths.test.mjs`: constants and markers
- `test/kernel/init.test.mjs`: ignore line
- `test/hooks/handlers.test.mjs`: guard.scope decisions
- `test/markdown-paths.test.mjs`: `ELSEWHERE` paths move

**Changes:** Per D-002. Every `.tether/` mention in the files above changes to `.picket/` in this phase, because it names a path that has just moved (for example `.tether/state/scratch/` and `.tether/extensions/<name>/`). The command word `tether`, the `tether:` prefix and the word Tether do not change yet. README.md, CONTRIBUTING.md and `.claude/MEMORY.md` change once, in Phase 3. No code knows the old folder afterwards. Straight after the code switch, do the one-off move of D-002 on this repository: `git mv .tether/config.json .picket/config.json`; append each `.tether/state/*.jsonl` and `*.log` to its `.picket/state/` namesake, or move it when there is none; move the other state files; remove the empty `.tether/`. The move is a shell step in this phase, not a command or script in the repository.

**Done when:**
- **T-1.1** `paths.mjs` exports `PICKET_DIR = ".picket"`, and `stateDir`, `configPath` and the extensions folder resolve under `<root>/.picket/`; `ROOT_MARKERS` and `BOOKKEEPING_PREFIXES` name `.picket` and not the old folder.
- **T-1.2** `guard.scope` asks for `.picket/config.json` and `.picket/extensions/a/rules/r.md`, still denies `.picket/state/ledger.jsonl`, and has no rule for the old folder.
- **T-1.3** A fresh `init` writes the `.gitignore` line `.picket/state/`, and `migrate`, `preflight` and `paths.mjs` contain no reference to the old folder.
- **T-1.4** After the one-off move, `.tether/` does not exist, `git status` shows `.tether/config.json` renamed to `.picket/config.json`, and `tether next 20261010-rename-tether-to-picket` still answers.
- **T-1.5** `.picket/state/ledger.jsonl` exists, every line parses as JSON (no torn line where the old rows were appended), and its oldest row is dated before this phase began, so the old rows were carried over; the next hook rows land in `.picket/state/`. The row count before the move is not provable after the fact: the state was moved before anyone counted, and the merged ledger now holds 535 rows.
- **T-1.6** `git grep -nF ".tether" -- core bench test CLAUDE.md .gitignore` prints exactly one line: the `ELSEWHERE` entry in `test/markdown-paths.test.mjs` that lists the old `.tether/` paths still cited by `artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md`, CONTRIBUTING.md and `.claude/MEMORY.md` (user ruling; Phase 4 deletes it).
- **T-1.7** `npm test` passes.

## Phase 2: The `picket` command, with `tether` as an alias

**Touch set:**
- `core/bin/picket.mjs`: the CLI, moved from `tether.mjs`
- `core/bin/picket`, `core/bin/picket.cmd`: new launchers
- `core/bin/tether`, `core/bin/tether.cmd`, `core/bin/tether.mjs`: forwarders until Phase 4
- `core/lib/kernel-call.mjs`: both launchers, three scripts
- `core/lib/hooks/guard.bash.mjs`: bare kernel is `picket` or `tether`
- `core/lib/init.mjs`: `picket` allow and ask rules
- `core/lib/check.mjs`, `core/lib/drive.mjs`, `core/lib/migrate.mjs`, `core/lib/next.mjs`, `core/lib/paths.mjs`, `core/lib/preflight.mjs`, `core/lib/hooks/guard.scope.mjs`, `core/lib/hooks/inject.state.mjs`, `core/lib/hooks/route.verdict.mjs`, `core/lib/extension.schema.json`: messages name `picket`
- `core/hooks/README.md`, `core/templates/claude-block.md`, `CLAUDE.md`: verbs say `picket`
- `core/agents/analyst.md`, `core/agents/architect.md`, `core/agents/developer.md`, `core/agents/reviewer.md`: verbs say `picket`
- `core/rules/comments.md`, `core/rules/security-paths.md`, `core/rules/work-items.md`: verbs say `picket`
- `core/skills/branching/steps/10-create.md`, `core/skills/designing/SKILL.md`, `core/skills/designing/steps/10-design.md`, `core/skills/designing/steps/20-crosscheck.md`, `core/skills/designing/steps/40-amend.md`, `core/skills/expediting/SKILL.md`, `core/skills/expediting/steps/30-check.md`, `core/skills/inspecting/SKILL.md`, `core/skills/ordering/SKILL.md`, `core/skills/ordering/steps/10-order.md`, `core/skills/ordering/steps/20-phase.md`, `core/skills/ordering/steps/30-gate.md`, `core/skills/ordering/steps/40-review.md`, `core/skills/researching/SKILL.md`, `core/skills/researching/steps/10-outline.md`, `core/skills/resuming/SKILL.md`, `core/skills/reviewing/SKILL.md`, `core/skills/summarizing/SKILL.md`: verbs and `PICKET_REQUEST_END`
- `.claude/rules/harness-authoring.md`: verb examples say `picket`
- `.claude/settings.json`: `Bash(picket *)` beside `Bash(tether *)`
- `package.json`: name, `bin`, script
- `bench/adapters/plugin.mjs`, `bench/run.mjs`, `bench/test/adapters.test.mjs`: `picket.mjs init`, `Bash(picket *)`
- `test/budgets.test.mjs`, `test/hooks/handlers.test.mjs`, `test/hooks/hooks.test.mjs`, `test/kernel/check.test.mjs`, `test/kernel/cli.test.mjs`, `test/kernel/close.test.mjs`, `test/kernel/drive.test.mjs`, `test/kernel/extensions.test.mjs`, `test/kernel/init.test.mjs`, `test/kernel/migrate.test.mjs`, `test/kernel/names.test.mjs`, `test/kernel/next.test.mjs`, `test/kernel/paths.test.mjs`, `test/kernel/plugin-layout.test.mjs`, `test/kernel/preflight.test.mjs`, `test/kernel/review.test.mjs`, `test/kernel/sources.test.mjs`, `test/kernel/work.test.mjs`, `test/skills/filename.test.mjs`, `test/skills/lane-check.test.mjs`: the CLI path and messages

**Changes:** Per D-003. `git mv core/bin/tether.mjs core/bin/picket.mjs` keeps its history. The new `tether.mjs` is the single line `import "./picket.mjs";`, and the two old launchers call `picket.mjs`. `names.test.mjs`'s old-name checks treat `tether <verb>` in shipped Markdown as a violation, except in the forwarders, the `kernel-call.mjs` and `guard.bash.mjs` alias lines, and `.claude/settings.json`. The prefix `tether:` and the word Tether stay until Phase 3.

**Done when:**
- **T-2.1** In Git Bash and in PowerShell, with `core/bin` on PATH, `picket next 20261010-rename-tether-to-picket --human` and `tether next 20261010-rename-tether-to-picket --human` print the same line with exit 0.
- **T-2.2** `guard.bash` allows `picket next x; ls work` and `tether next x; ls work`, and still denies `picket drive --run "rm -rf src"`.
- **T-2.3** A fresh `init` writes `Bash(picket *)`, `PowerShell(picket *)`, `PowerShell(picket drive *)` and `PowerShell(picket check *)`, and no `tether` rule.
- **T-2.4** `route.verdict` and the CLI's error line start with `picket:`; `node core/bin/picket.mjs admit --human` prints the re-run hint naming `picket admit`.
- **T-2.5** `git grep -nE "\btether (admit|new|list|state|set|close|next|preflight|verify|route|review-summary|cost|find-verdict|drive|comment|packet|pr|source|migrate|check|init|extensions?)\b" -- core CLAUDE.md .claude/rules bench test` prints nothing, apart from the test fixtures that check the alias.
- **T-2.6** `package.json` has `"name": "@picketai/picket"` and `"bin": { "picket": "core/bin/picket.mjs" }`; `npm run picket -- list --human` lists the open items.
- **T-2.7** `npm test` passes.

## Phase 3: The plugin is `picket`, then restart the session

**Touch set:**
- `core/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: names and descriptions
- `core/lib/agent-name.mjs`: strip `picket:` and `tether:`
- `core/lib/init.mjs`: `picket-dev`, cache rule, `# Picket` heading
- `core/lib/config.schema.json`, `core/lib/extension.schema.json`, `core/lib/extensions.mjs`, `core/lib/hooks/inject.state.mjs`, `core/lib/hooks/route.verdict.mjs`, `core/bin/picket.mjs`: the word Picket, `/picket:` skills
- `core/templates/claude-block.md`, `CLAUDE.md`: `# Picket`, `picket:` names
- `core/agents/analyst.md`, `core/agents/architect.md`, `core/agents/reviewer.md`, `core/rules/comments.md`, `core/rules/security-paths.md`: prefixes and name
- `core/skills/*/SKILL.md` for benchmarking, branching, consulting, designing, documenting, expediting, inspecting, ordering, proofreading, researching, resuming, reviewing, summarizing, ticketing, understanding; `core/skills/branching/steps/10-create.md`, `core/skills/consulting/steps/20-ratify.md`, `core/skills/designing/steps/10-design.md`, `core/skills/designing/steps/20-crosscheck.md`, `core/skills/ordering/steps/10-order.md`, `core/skills/ordering/steps/20-phase.md`, `core/skills/ordering/steps/40-review.md`, `core/skills/researching/steps/10-outline.md`, `core/skills/researching/steps/20-deep.md`, `core/skills/reviewing/steps/10-alignment.md`, `core/skills/reviewing/templates/patterns.md`: prefixes and name
- `.claude/settings.json`: `outputStyle` `picket:custom`
- `.claude/rules/harness-authoring.md`: skill examples `picket:`
- `.claude/agent-memory/picket-architect/`, `.claude/agent-memory/picket-reviewer/`: moved with `git mv`, notes edited
- `.claude/MEMORY.md`: glossary and current decisions
- `README.md`, `CONTRIBUTING.md`: the whole text, once
- `bench/test/adapters.test.mjs`, `test/budgets.test.mjs`, `test/hooks/handlers.test.mjs`, `test/hooks/hooks.test.mjs`, `test/kernel/admit.test.mjs`, `test/kernel/extensions.test.mjs`, `test/kernel/init.test.mjs`, `test/kernel/names.test.mjs`, `test/kernel/plugin-layout.test.mjs`, `test/kernel/route.test.mjs`, `test/skills/lane-check.test.mjs`: names and prefixes

**Changes:** Per D-004. `names.test.mjs` now flags an unprefixed or `tether:`-prefixed skill name in shipped Markdown. README.md and CONTRIBUTING.md are rewritten for Picket in one pass, covering the folder, the command and the name; `harness` stays only where CONTRIBUTING.md defines it as the internal word. In `.claude/MEMORY.md`, the **Tether** glossary entry becomes **Picket**, and current decisions say Picket and `.picket/`. Lines marked superseded keep their words. The phase block's `Decisions:` field ends with `restart: commit, then end this session and run claude --plugin-dir core; spawn and continue nothing until then`, so the gate packet shows it (D-001 RISK-001).

**Done when:**
- **T-3.1** `claude plugin validate .` exits 0 and the manifests name `picket` and `picket-dev`.
- **T-3.2** `bareAgentName("picket:developer")` and `bareAgentName("tether:developer")` both return `developer`; `route.verdict` applies a PHASE DONE from either.
- **T-3.3** A fresh `init` writes `Read(~/.claude/plugins/cache/picket-dev/**)` and runs `claude plugin install picket@picket-dev --scope project` (recording runner). A rerun on a `CLAUDE.md` holding the `# Picket` block plus `## Project facts` replaces only the block, and the facts stay byte-identical; `init.mjs` holds no match for the old heading.
- **T-3.4** `git grep -nE "tether:|\bTether\b|tether-dev" -- core CLAUDE.md README.md CONTRIBUTING.md .claude/settings.json .claude/rules bench test` prints only the `agent-name.mjs` window alias and its test, which Phase 4 deletes.
- **T-3.5** `.claude/agent-memory/tether-*` no longer exists, and `git status` shows renames to `picket-*`.
- **T-3.6** `npm test` passes.
- **T-3.7** After the gate is approved and committed, the lead restarts the session with `claude --plugin-dir core`. In the new session, the `picket:resuming` skill loads and `picket next 20261010-rename-tether-to-picket` names Phase 4.
- **T-3.8** At the Phase 3 gate, `tether packet 20261010-rename-tether-to-picket` prints a `decisions` line holding `restart:` and `spawn and continue nothing until then`, read from the saved `phases/3.block.md`; the record names no new code for it, and the ledger shows no Agent spawn or SendMessage between the Phase 3 commit and the restart.

## Phase 4: Close the window

**Touch set:**
- `core/bin/tether`, `core/bin/tether.cmd`, `core/bin/tether.mjs`: deleted
- `core/lib/kernel-call.mjs`: `picket` only; scripts `picket.mjs`, `harness.mjs`
- `core/lib/hooks/guard.bash.mjs`: bare kernel is `picket` only
- `core/lib/agent-name.mjs`: strip `picket:` only
- `.claude/settings.json`: drop `Bash(tether *)`
- `test/names-picket.test.mjs`: records only, no allowlist
- `test/markdown-paths.test.mjs`: drop the old-paths entry, skip records
- `test/hooks/handlers.test.mjs`, `test/kernel/names.test.mjs`, `test/kernel/route.test.mjs`, `test/kernel/plugin-layout.test.mjs`, `test/skills/lane-check.test.mjs`: window-era cases that name the old word, deleted

**Changes:** Per D-001 and D-005 (r2), run in the restarted session only. Delete every alias the window added, and delete the window-era test cases instead of turning them into tests that the old name no longer works, because such tests would name the old word themselves. `names-picket.test.mjs` runs `git ls-files` and reads each text file. It fails on any line holding the old word, case-insensitive, with three exceptions: a file under `work/`, `artifacts/`, `bench/results/` or `spike/`; a line in `.claude/MEMORY.md` that holds `[superseded`; and the test's own file (OQ-002). Nothing else is exempt. In `test/markdown-paths.test.mjs`, delete the `ELSEWHERE` entry for the old `.tether/` paths and add `artifacts/` and superseded `.claude/MEMORY.md` lines to what the scan skips; by now Phase 3 has rewritten CONTRIBUTING.md and the current lines of `.claude/MEMORY.md`.

**Done when:**
- **T-4.1** Drive: `tether` no longer resolves in Git Bash or PowerShell with only `core/bin` on PATH, and `picket next 20261010-rename-tether-to-picket --human` still answers.
- **T-4.2** Drive: the spawned `guard.bash` hook gives `tether next x; ls` no decision and still allows `picket next x; ls`, and a one-off `node` call shows `bareAgentName` no longer strips the old prefix. Neither check is kept as a test.
- **T-4.3** `test/names-picket.test.mjs` passes, and fails when a line naming the old word is added to `core/skills/ordering/SKILL.md` or to a non-superseded line of `.claude/MEMORY.md`.
- **T-4.4** `git grep -il` for the old word, outside the four record folders and the test's own file, lists only `.claude/MEMORY.md`, and every matching line there holds `[superseded`.
- **T-4.5** `node bench/run.mjs --harness plugin --tasks fast-01-pagination --dry` lists the task and spends nothing.
- **T-4.6** `test/markdown-paths.test.mjs` holds no `.tether` literal, skips `artifacts/` and superseded `.claude/MEMORY.md` lines, and still fails on a missing path cited from `core/` or README.md.
- **T-4.7** `npm test` passes.

## Open questions

- **OQ-001** When do `package.json`'s `repository`, `homepage` and `bugs` URLs move from `vladapetre/AISpec` to `picketai/picket`? Owner: user, once the GitHub organization and repository exist. Fallback: they keep pointing at the current repository, which still resolves.
- **OQ-002** The Phase 4 check has to name the word it forbids, so `test/names-picket.test.mjs` is the one shipped file that holds it, skipped by its own path. Is that acceptable, or should the check live outside the repository (for example as a one-off `git grep` in the Phase 4 drive only)? Owner: user, at the Phase 4 gate. Fallback: the self-skipping test ships.

## Revision log

- 2026-10-10: D-001 (r2): no shipped backward support for the old name; Phase 4 deletes everything the two-name window added (user ruling).
- 2026-10-10: D-002 (r2): no migrate step, legacy entry or guard for `.tether/`; this repository moves its folder once with `git mv` inside Phase 1 (user ruling).
- 2026-10-10: D-004 (r2): init no longer matches an old `# Tether` heading; agent memory notes are edited, not only moved (user ruling).
- 2026-10-10: D-005 (r2): only records keep the old name; the Phase 4 test has no allowlist beyond records and superseded MEMORY lines (user ruling).
- 2026-10-10: D-001 (r3): RISK-001 relies on the Phase 3 block's Decisions line shown by the packet (T-3.8); the lead spawns nothing between the Phase 3 commit and restart.
- 2026-10-10: D-005 (r3): one `.tether` ELSEWHERE entry allowed until Phase 4, which then skips records in the path check; T-1.5 reworded, pre-move count unprovable (user ruling).
