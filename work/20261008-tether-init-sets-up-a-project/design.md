---
kind: design
lane: design
title: tether init sets up a project
date: 2026-10-08
audience: developer
sources: request.md; work/20261008-why-permission-prompts-rose-on-the-plugin/research.md (R-001 to R-020); .claude/MEMORY.md Decisions; artifacts/strategy/decisions/00001-tether-ships-claude-code-plugin.md; work/20261006-package-core-as-the-plugin-design/design.md (D-006, OQ-002, OQ-003); CONTRIBUTING.md; CLAUDE.md; .claude/settings.json; .claude-plugin/marketplace.json; core/.claude-plugin/plugin.json; core/bin/tether, core/bin/tether.mjs; core/lib/paths.mjs; core/lib/kernel-call.mjs; core/lib/hooks/guard.bash.mjs; core/lib/drive.mjs; core/lib/config.schema.json; core/hooks/hooks.json; bench/adapters/plugin.mjs; bench/.runs/events/gate-13-api-key-auth-r1-muy8wys9.jsonl and fast-05-page-size-default-r1-muy8*.jsonl; a PowerShell precedence probe whose commands and output D-004 quotes
phases:
  - n: 1
    files:
      - core/lib/init.mjs
      - core/templates/claude-block.md
      - core/bin/tether.mjs
      - CLAUDE.md
      - test/kernel/init.test.mjs
      - test/kernel/names.test.mjs
    greps:
      - path: core/bin/tether.mjs
        pattern: case "init"
      - path: core/templates/claude-block.md
        pattern: ^# Tether$
    tests: true
    drive: true
    security: false
  - n: 2
    files:
      - core/lib/init.mjs
      - test/kernel/init.test.mjs
    greps:
      - path: core/lib/init.mjs
        pattern: PowerShell\(tether \*\)
      - path: core/lib/init.mjs
        pattern: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
    tests: true
    drive: true
    security: true
  - n: 3
    files:
      - core/bin/tether.cmd
      - core/templates/claude-block.md
      - CLAUDE.md
      - core/skills/ordering/steps/10-order.md
      - core/skills/designing/steps/10-design.md
      - core/agents/developer.md
      - core/skills/expediting/steps/30-check.md
      - test/kernel/plugin-layout.test.mjs
      - test/markdown-paths.test.mjs
    greps:
      - path: core/bin/tether.cmd
        pattern: tether\.mjs
      - path: core/skills/ordering/steps/10-order.md
        pattern: --request -
      - path: core/skills/designing/steps/10-design.md
        pattern: --request -
      - path: core/agents/developer.md
        pattern: \.tether/state/scratch/
    tests: true
    drive: true
    security: false
  - n: 4
    files:
      - core/lib/init.mjs
      - core/bin/tether.mjs
      - test/kernel/init.test.mjs
      - CONTRIBUTING.md
    greps:
      - path: core/lib/init.mjs
        pattern: plugin marketplace add
      - path: CONTRIBUTING.md
        pattern: tether\.mjs init
    tests: true
    drive: true
    security: false
  - n: 5
    files:
      - core/lib/hooks/guard.bash.mjs
      - test/hooks/handlers.test.mjs
      - test/hooks/hooks.test.mjs
    greps:
      - path: core/lib/hooks/guard.bash.mjs
        pattern: "\"kernel\""
    tests: true
    drive: true
    security: true
  - n: 6
    files:
      - core/bin/tether.mjs
      - core/lib/drive.mjs
      - core/lib/hooks/observe.drive.mjs
      - core/agents/developer.md
      - core/skills/expediting/steps/30-check.md
      - test/kernel/drive.test.mjs
      - test/hooks/hooks.test.mjs
    greps:
      - path: core/agents/developer.md
        pattern: --env
    tests: true
    drive: true
    security: true
  - n: 7
    files:
      - bench/adapters/plugin.mjs
      - bench/test/adapters.test.mjs
      - core/lib/init.mjs
      - test/kernel/init.test.mjs
    greps:
      - path: bench/adapters/plugin.mjs
        pattern: init
      - path: core/lib/init.mjs
        pattern: plugins/cache/
      - path: bench/adapters/plugin.mjs
        pattern: Read\(//
    tests: true
    drive: true
    security: true
---
# Design: tether init sets up a project

## Problem

A project gets Tether today through two `claude plugin` commands and hand edits, and nothing writes the parts a plugin cannot carry: the CLAUDE.md block, settings and permission keys, `.tether/config.json`, the `.gitignore` line and the marketplace keys (SDR-00001 D-001, `.claude/MEMORY.md` "init writes only what a plugin cannot"). The permission report shows prompts per task rising from 0.23 to 3.57 on the plugin (R-001), driven by compound commands with one unmatched piece (R-002, R-008, R-011, R-012), PowerShell calls with no rule (R-005) and scratch writes outside the working directory (R-014, R-018). Two premises of that report were checked again here and one is corrected: bare `tether` already resolves in the Bash tool (the gate-13 transcript runs `/d/.../core/bin/tether` from a bare `tether`), so R-019 holds only for PowerShell, where `Get-Command tether` finds the extensionless shell script and `tether admit` prints nothing (fast-05 transcript). Binding constraints: nothing writes under the plugin root (SDR D-005), the marketplace name `tether-dev` is provisional (packaging D-006), and `guard.bash` is the permission guard, so a phase that changes what it allows takes its own gate.

## Decisions

### D-001: `tether init` is a kernel verb that never guesses its root
**Decision:** Infrastructural decision. A new verb `tether init`, backed by `core/lib/init.mjs`, run once from the project as `node <checkout>/core/bin/tether.mjs init` (before the plugin is installed, `tether` is not on PATH). Its root is `--root` when given, else `git rev-parse --show-toplevel` from the cwd, else the cwd; it never uses `projectRoot()`'s walk-up, because a fresh project has no `.tether/` and the walk-up stops at the first parent holding `.claude/`, which is the user's home folder, so init would write `~/CLAUDE.md` and `~/.claude/settings.json`. It refuses with exit 2 and writes nothing when the root equals `os.homedir()`. Every artifact is merged, never overwritten, so a second run changes nothing. It prints one line per artifact, `created`, `updated` or `unchanged`, and exits 0 when all succeeded, 2 when one step failed (the others still run).
**Instead of:** `projectRoot()` as every other verb uses: right for a project that already has `.tether/`, wrong for the one case init exists for.
**Risks:**
- **RISK-001** A user runs init in a subfolder of a monorepo and wants the subfolder. Mitigation: `--root <path>`, named in the printed report's first line (`root: <path>`).

### D-002: the CLAUDE.md block is one shipped template, bounded by headings
**Decision:** Infrastructural decision. The block lives once, in `core/templates/claude-block.md`: a `# Tether` heading, then `## Every request` and `## Rules`, with nothing that only fits this repository (no `--plugin-dir`, no `harness-authoring`). Init writes it into `<root>/CLAUDE.md`: a missing file gets the block plus an empty `## Project facts` section; an existing file with a `# Tether` heading has the span from that heading up to the first heading that is not one of the template's own (`# Tether`, `## Every request`, `## Rules`) replaced; a file without one gets the block appended after one blank line. `## Project facts` and everything else are kept byte for byte. This repository's `CLAUDE.md` holds the template verbatim, followed by its own lines, so the block the bench and users get is the one this repository runs; the repository file stays within the 2048-byte budget.
**Instead of:** begin and end comment markers around the block: markup comments are banned by the comments rule, and headings are already a stable boundary.
**Risks:**
- **RISK-002** A user adds a `## Every request` line of their own inside the block; the next init replaces it. Mitigation: the template's last line says the block is rewritten by `tether init` and project lines belong under `## Project facts`.

### D-003 (r3): init writes four settings keys into the project's `.claude/settings.json`
**Decision:** Infrastructural decision that changes what runs without a prompt. Init merges into `<root>/.claude/settings.json` (created if missing, other keys untouched): `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` (the lanes continue agents with `SendMessage`, and this repository's settings already carry it); `permissions.allow` gains `Bash(tether *)` and `PowerShell(tether *)` (R-004, R-005), and `Read(~/.claude/plugins/cache/tether-dev/**)`, a home-relative read rule for the installed plugin, built from the marketplace name so it moves with OQ-001. The Phase 7 run showed why: 21 of its 31 prompts were Read or Grep calls on the plugin's own skill and agent files outside the project. Both premises were checked. The docs (code.claude.com/docs/en/permissions, "Read and Edit") list `~/path` as a pattern anchored at the home folder, normalised to POSIX form on Windows, and say Read rules apply, best effort, to Grep and Glob. A project-scope install writes the plugin to `~/.claude/plugins/cache/tether-dev/tether/1.0.0-alpha.0/`: that folder holds `templates/`, which Phase 1 of this record added, and its files are dated 2026-10-08 19:53, after the Phase 4 commit. The rule names no machine-specific path. `permissions.ask` gains `PowerShell(tether drive *)` and `PowerShell(tether check *)`, because `guard.bash` only sees the Bash tool, so a wrapped `--run`, `--start` or `--only` command through PowerShell keeps only the kernel's `core/lib/unsafe.mjs` layer, and an ask rule wins over the allow. Arrays are unioned in place: existing entries keep their order, missing ones are appended, nothing is removed. When `permissions.deny` already names a rule init would allow, init leaves it and prints a warning. No `additionalDirectories` entry is written (D-004).
**Instead of:** writing into `.claude/settings.local.json`: per-machine and gitignored, so another developer who clones the project gets the plugin but none of the rules it needs.
**Risks:**
- **RISK-003** `PowerShell(tether *)` lets a PowerShell `tether route <id> --verdict approved` run without a prompt. Mitigation: `Bash(tether *)` already allows the same today; route checks the agent owner, and the lane gates do not change.
- **RISK-009** The docs call applying Read rules to Grep and Glob "best effort", so some Grep calls on the plugin may still prompt. Mitigation: T-7.3 counts every Read, Grep and Glob prompt on a plugin file, and the phase stalls with them if any remain.
- **RISK-010** The rule also opens every other version under `tether-dev/` in the cache for reading, including orphaned ones. Mitigation: these are copies of the same open plugin and hold no project data; the rule allows reads only, never edits.

### D-004 (r2): `tether` resolves in both shells; free text and scratch stay inside the project
**Decision:** Infrastructural decision. The plugin's `bin/` is already on PATH, so the fix is a `core/bin/tether.cmd` next to the shell script (`@node "%~dp0tether.mjs" %*`). A probe (2026-10-08, PowerShell 7, no log kept; the commands below reproduce it) put two files in one folder, `tprobe` holding `#!/bin/sh` and `echo sh`, and `tprobe.cmd` holding `@echo cmd %*`, then ran `$env:PATH = "$d;$env:PATH"; (Get-Command tprobe).Source; tprobe 'a "b" $c'`. The output was `...\tether-prec-probe\tprobe.cmd`, then `cmd "a "b" $c"`: PowerShell picks the `.cmd`, and the inner double quotes reach `cmd` unescaped, so a program behind it would split the text wrongly. Free text therefore never travels as an argument through PowerShell and `cmd`. The skills already pass requests on stdin through a quoted heredoc (`--request -`), and the steps that still say "a scratchpad file" (`ordering/steps/10-order.md`, `designing/steps/10-design.md`) are changed to that. Drive scripts, the one remaining scratch file, go to `.tether/state/scratch/`, inside the working directory and already ignored. This removes the out-of-project writes behind R-014, so init writes no `additionalDirectories`.
**Instead of:** `additionalDirectories` with the OS temp folder, as the request suggested: the path is machine-specific, so it cannot go in committed settings, and it would open the whole temp folder to writes where one ignored folder in the project is enough.
**Risks:**
- **RISK-004** `%*` in `tether.cmd` mangles `^`, `&` and `%` in arguments. Mitigation: free text goes on stdin; the CLAUDE.md block tells agents to run `tether` from the Bash tool, and `guard.bash` covers only that tool anyway.

### D-005 (r2): the marketplace keys come from the `claude` CLI, not from init's own JSON
**Decision:** Infrastructural decision. Init finds the marketplace root (the parent of the plugin root, when it holds `.claude-plugin/marketplace.json`) and runs, with the project root as cwd, `claude plugin marketplace add <marketplace root> --scope project` and then `claude plugin install tether@tether-dev --scope project`, the two commands CONTRIBUTING.md documents today. It skips the first when the project settings' `extraKnownMarketplaces` already has `tether-dev`, and the second when `enabledPlugins` already has `tether@tether-dev`. `--no-install` skips both, for this repository and the bench, which load the plugin with `--plugin-dir`. When `claude` is not on PATH, the step reports `failed` and prints the two commands.
**Instead of:** writing `extraKnownMarketplaces` and `enabledPlugins` directly: the JSON shape of a local directory source is not verified anywhere in this repository (packaging phase 6 recorded only the key names), and the CLI also installs and caches the plugin, which the keys alone do not.
**Risks:**
- **RISK-005** The committed marketplace source is a local absolute path, useless to another developer's clone. Mitigation: OQ-001; the alpha moves the marketplace to a git URL.

### D-006 (r2): guard.bash allows a compound whose pieces are read-only or bare kernel calls
**Decision:** Infrastructural decision that changes what `guard.bash` allows. `classifySegment` gains a third allowed class, `kernel`: the segment's first token is exactly `tether` (no path, no `.exe`, no leading `NAME=value`) and `wrappedCommands(seg)` is empty. The final rule becomes "every segment is `safe` or `kernel`" with the same earlier exits (hidden execution, write redirect, background). `kernel` pieces count toward that allow only inside a compound of two or more pieces: a lone `tether next <id>` gets no decision from the hook, as today, and is left to the project's `Bash(tether *)` rule, so a project that dropped that rule still gets its prompt. Example: `tether next <id>; cat work/<id>/order.md | head -40` is allowed; `API_KEY=k tether drive --hit "GET /h"`, `node core/bin/tether.mjs next <id>` and `tether drive --run "npm start"; ls` still fall through to the rules. A user's `ask` or `deny` rule still wins over the hook's allow.
**Instead of:** allowing a compound when every piece matches the project's allow rules (the request's framing): the hook would re-implement Claude Code's matcher across five settings scopes and drift from it, and allowing past an unknown assignment re-opens `NODE_OPTIONS=--require ./x.js tether` and `PATH=. tether`, which Claude Code refuses on purpose (R-011).
**Risks:**
- **RISK-006** A future verb flag that runs a command but is missing from `WRAPPING_FLAGS` rides the allow. Mitigation: the allow covers only what `Bash(tether *)` already allows standalone, and Phase 5 adds a test that every flag `core/lib/drive.mjs` and `core/lib/check.mjs` execute (`--run`, `--start`, `--only`) is in `WRAPPING_FLAGS`.

### D-007: `tether drive --env NAME=VALUE`, logged by name only
**Decision:** Infrastructural decision that touches secret handling. `drive()` already takes `env`; the CLI gains a repeatable `--env NAME=VALUE` so an agent never writes `API_KEY=… tether drive` (R-011). The drive log row records `env: ["API_KEY"]`, never the value, and `observe.drive` replaces each `--env NAME=VALUE` in the command it logs with `--env NAME=***`.
**Instead of:** teaching agents to `export` the variable first: a separate `export` piece is one more unmatched subcommand, and the value still lands in the logged command.
**Risks:**
- **RISK-007** A real secret passed with `--env` shows in the transcript. Mitigation: the drive guidance says to drive with test values only, as the security-paths rule already requires for logs and artifacts.

### D-008 (r2): the bench installs through `tether init --no-install`
**Decision:** Infrastructural decision. `bench/adapters/plugin.mjs` `install()` stops copying this repository's `CLAUDE.md` and `.claude/settings.json` and runs `node <harness>/core/bin/tether.mjs init --no-install --root <repo>` instead, so the bench measures the files a user gets. Bench runs load the plugin from this checkout's `core/` through `--plugin-dir`, not from the cache, so D-003's cache rule does not reach them. The adapter therefore adds a read rule for that folder to the `--allowedTools` it already passes on the command line: `Read(//<core, POSIX form>/**)`, for example `Read(//d/workspace/github/AISpec/.worktrees/framework/core/**)`. It does not use `--add-dir`, because an added working directory also accepts edits under `acceptEdits` (the bench's mode) and loads that folder's configuration; a run must never edit the harness it measures. The machine-specific path lives only on the command line, never in settings. The first measurement run (Phase 7, three tasks) is followed by one rerun of `gate-13-api-key-auth` after the read rules land.
**Instead of:** keeping the copy: it measures this repository's settings (with `Bash(npm run *)`, `Bash(git commit *)` and the rest), not the project init writes, so the prompt rate it reports would not be the product's.
**Risks:**
- **RISK-008** The bench's cost baseline moves because `CLAUDE.md` changes. Mitigation: the measurement compares prompts per task first; cost is reported, not gated.

## Scope

**In:** the `init` verb (CLAUDE.md block, `.tether/config.json`, `.gitignore`, settings keys, marketplace through the `claude` CLI); `core/bin/tether.cmd`; stdin and scratch guidance in the skills; the `guard.bash` kernel class; `tether drive --env`; the bench install through init and one measurement run.
**Out:** `outputStyle` and other user preferences; a `Bash(grep *)` rule (R-013; `grep` is already `safe` in `guard.bash`, so D-006 covers it in compounds); the SubagentStart size check of SDR RISK-001; moving the marketplace off a local path (OQ-001); editing `.claude/MEMORY.md` (OQ-003); outline checks 13 (plugin and project hook order, a deny between them) and 14 (version pinning), handed to this record by OQ-003 of `work/20261006-package-core-as-the-plugin-design/design.md`. Check 13 still has nothing to test: init writes no `hooks` key (D-003's keys are `env` and `permissions`; `ask` and `allow` rules are not hooks), so an initialised project has only the plugin's hooks. Check 14 waits on OQ-001: D-005 installs `tether@tether-dev` unpinned from a local checkout, and a pin needs the git marketplace OQ-001 settles.

## Phase 1: init writes the CLAUDE.md block, config and ignore line

**Touch set:**
- `core/lib/init.mjs`: root, block, config, ignore
- `core/templates/claude-block.md`: the shipped block, one copy
- `core/bin/tether.mjs`: `init` case, verb list
- `CLAUDE.md`: holds the template verbatim
- `test/kernel/init.test.mjs`: temp repos, rerun, merge
- `test/kernel/names.test.mjs`: add `init` to CLI_VERBS

**Changes:** `init(root, opts)` returns `{ root, steps: [{ name, path, result: "created"|"updated"|"unchanged"|"failed", detail }] }`; the CLI resolves the root per D-001 and prints JSON, or one line per step with `--human`. Steps in this phase: `claude-md` (D-002), `config` (`.tether/config.json` = `{ "version": 1 }` when missing, never rewritten when present), `gitignore` (append `.tether/state/` when no line equals it). Write the template from today's `CLAUDE.md`, dropping the repository-only text, and rebuild this repository's `CLAUDE.md` as template plus its own start line, `harness-authoring` line and `## Project facts`.

**Done when:**
- **T-1.1** In a temp git repo with no `CLAUDE.md`, `.claude/` or `.tether/`, `node core/bin/tether.mjs init` exits 0 and creates `CLAUDE.md` (template plus `## Project facts`), `.tether/config.json` equal to `{ "version": 1 }` and a `.gitignore` holding `.tether/state/`, each reported `created`.
- **T-1.2** A second run reports every step `unchanged` and leaves all three files byte-identical.
- **T-1.3** With a `CLAUDE.md` holding a heading `# My app`, an older `# Tether` block with an extra line under `## Every request`, and `## Project facts` with one fact, init replaces only the block; `# My app` and the fact are byte-identical.
- **T-1.4** An existing `.tether/config.json` with a `sources` entry and a `.gitignore` already holding `.tether/state/` are left unchanged.
- **T-1.5** Run from `<repo>/src`, init writes at the git top level; in a non-git folder it writes in the cwd; with `HOME` and `USERPROFILE` set to the cwd it exits 2 and writes nothing.
- **T-1.6** This repository's `CLAUDE.md` contains `core/templates/claude-block.md` verbatim, the template contains neither `--plugin-dir` nor `harness-authoring`, and `test/budgets.test.mjs` passes.
- **T-1.7** `npm test` passes.

## Phase 2: init writes the settings and permission keys

**Touch set:**
- `core/lib/init.mjs`: `settings` step, union merge
- `test/kernel/init.test.mjs`: merge, deny warning, rerun

**Changes:** A `settings` step per D-003 merges into `<root>/.claude/settings.json`, creating `.claude/` and the file when missing and writing two-space JSON with a trailing newline. It sets `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `"1"`, appends `Bash(tether *)` and `PowerShell(tether *)` to `permissions.allow` and `PowerShell(tether drive *)` and `PowerShell(tether check *)` to `permissions.ask` when absent, and leaves every other key and entry untouched. A rule init would allow that already sits in `permissions.deny` is reported in the step's `detail` as a warning and not added to `allow`. A settings file that is not valid JSON fails the step (`failed`, exit 2) and is not rewritten.

**Done when:**
- **T-2.1** In a temp repo with no `.claude/`, init creates `.claude/settings.json` holding exactly the `env` key, the two `allow` rules and the two `ask` rules.
- **T-2.2** With a settings file holding `outputStyle`, `permissions.allow: ["Read", "Bash(npm test*)"]` and `env.FOO: "1"`, init keeps all three in value and order and appends the missing entries after them.
- **T-2.3** A second run reports `settings: unchanged` and the file is byte-identical.
- **T-2.4** With `permissions.deny: ["PowerShell(tether *)"]`, init does not add that rule to `allow`, and the `--human` line for `settings` carries a warning naming it.
- **T-2.5** A settings file holding `{ not json` makes init exit 2 with `settings: failed`, the file unchanged, and the other steps still reported.
- **T-2.6** `npm test` passes.

## Phase 3: tether resolves in PowerShell; free text on stdin, scratch in the project

**Touch set:**
- `core/bin/tether.cmd`: PowerShell and cmd launcher
- `core/templates/claude-block.md`: run tether from Bash
- `CLAUDE.md`: re-synced with the template
- `core/skills/ordering/steps/10-order.md`: request on stdin
- `core/skills/designing/steps/10-design.md`: request on stdin
- `core/agents/developer.md`: drive scripts in project scratch
- `core/skills/expediting/steps/30-check.md`: drive scripts in project scratch
- `test/kernel/plugin-layout.test.mjs`: launcher pair exists
- `test/markdown-paths.test.mjs`: scratch path is run-time

**Changes:** Add `core/bin/tether.cmd` per D-004. One line in the template's `## Every request` says to run `tether` from the Bash tool and to pass free text on stdin through a quoted heredoc with `--request -`; `CLAUDE.md` gets the same line through the template. In `10-order.md` and `10-design.md`, the "scratchpad file passed as `--request <file>`" sentence becomes stdin through a quoted heredoc with `--request -`, and the Jira story file goes to `.tether/state/scratch/`. In `developer.md` step 3 and `30-check.md`, the drive script folder becomes `.tether/state/scratch/` instead of the OS temp folder. `plugin-layout.test.mjs` asserts both launchers exist; `.tether/state/scratch/` joins the run-time group of `ELSEWHERE` in `test/markdown-paths.test.mjs`.

**Done when:**
- **T-3.1** In PowerShell with `core/bin` first on PATH, `(Get-Command tether).Source` ends in `tether.cmd`, and `tether next <open id> --human` prints the next action with exit 0.
- **T-3.2** In Git Bash with the same PATH, `command -v tether` ends in `core/bin/tether`, and the same call prints the same line.
- **T-3.3** In PowerShell, piping a here-string that holds a backtick, a double quote and `$HOME` into `tether admit --request - --human` prints `lane: order (`.
- **T-3.4** `grep -rnE "scratchpad file|OS temp folder|TEMP/" core/skills core/agents` prints nothing.
- **T-3.5** The template's `## Every request` names the Bash tool and `--request -`; this repository's `CLAUDE.md` still contains the template verbatim and stays within 2048 bytes.
- **T-3.6** `npm test` passes, including `test/kernel/plugin-layout.test.mjs` and `test/markdown-paths.test.mjs`.

## Phase 4: init installs the plugin through the claude CLI

**Touch set:**
- `core/lib/init.mjs`: `marketplace` and `plugin` steps
- `core/bin/tether.mjs`: `--no-install` flag
- `test/kernel/init.test.mjs`: injected command runner
- `CONTRIBUTING.md`: one command replaces two

**Changes:** Two steps per D-005. `init(root, { install = true, exec })` takes the command runner as a parameter so tests record calls instead of running `claude`; the CLI passes a runner built on `execFileSync` with `cwd: root`, and on Windows with `shell: true`, because `claude` is a `.cmd` there and Node refuses to run a `.cmd` without a shell; the arguments are fixed strings and one quoted path. Each step is `unchanged` when the settings already carry its key, `created` after the command succeeds, and `failed` with the command's last stderr line otherwise; when no `.claude-plugin/marketplace.json` sits beside the plugin root's parent, both report `failed: no marketplace beside the plugin`. `--no-install` reports both as `skipped`. CONTRIBUTING.md "Installing from a local checkout" becomes `node <checkout>/core/bin/tether.mjs init`, keeping the undo commands.

**Done when:**
- **T-4.1** With a recording runner, a fresh repo runs exactly `claude plugin marketplace add <checkout> --scope project`, then `claude plugin install tether@tether-dev --scope project`, both with `cwd` equal to the root.
- **T-4.2** With settings already holding `extraKnownMarketplaces.tether-dev` and `enabledPlugins["tether@tether-dev"]`, the runner records no call and both steps report `unchanged`.
- **T-4.3** A runner that throws makes its step `failed` and the exit 2, with the other steps still reported; `--no-install` records no call and reports both `skipped`.
- **T-4.4** Drive, in a temp project outside the repository: `node <checkout>/core/bin/tether.mjs init` exits 0, `claude plugin list` shows `tether` from `tether-dev` with project scope, and `.claude/settings.json` holds the D-003 keys plus `extraKnownMarketplaces` and `enabledPlugins`. Afterwards the phase runs the two undo commands and lists leftover cache folders in the block without deleting them. No model call is made, so no quota is spent.
- **T-4.5** `npm test` passes.

## Phase 5: guard.bash allows read-only and bare kernel pieces together

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: `kernel` class, final rule
- `test/hooks/handlers.test.mjs`: decisions per command form
- `test/hooks/hooks.test.mjs`: spawned hook, one compound

**Changes:** Per D-006, `classifySegment` returns `"kernel"` for a segment whose first token is exactly `tether` and whose `wrappedCommands` is empty; the final allow becomes "every classification is `safe` or `kernel`", with its reason naming both. Nothing else in `guardBash` moves: hidden execution, write redirects and backgrounding still fall through first, and the wrapped-command deny runs as today. A new test reads the flags `core/lib/drive.mjs` and `core/lib/check.mjs` execute (`--run`, `--start`, `--only`) and asserts each is in `WRAPPING_FLAGS`.

**Done when:**
- **T-5.1** `tether next x; cat work/x/order.md | head -40` and `cd sub && tether state x 2>&1` get `allow`.
- **T-5.2** `API_KEY=k tether drive --hit "GET /h"`, `node core/bin/tether.mjs next x; ls`, `/usr/local/bin/tether next x; ls` and `tether drive --run "npm start"; ls` get no decision.
- **T-5.3** `tether next x > out.txt` and `tether admit --text "$(whoami)"` get no decision; `tether drive --run "rm -rf src"` still gets `deny`.
- **T-5.4** The existing cases in `test/hooks/hooks.test.mjs` and `test/hooks/handlers.test.mjs` keep their decisions.
- **T-5.5** Drive: the spawned hook, fed a PreToolUse event for `tether next <id>; ls work` on stdin, prints `permissionDecision` `allow` and appends an allow line to `.tether/state/guard.log`.
- **T-5.6** `npm test` passes, including the `WRAPPING_FLAGS` test.

## Phase 6: tether drive takes --env and logs names only

**Touch set:**
- `core/bin/tether.mjs`: repeatable `--env NAME=VALUE`
- `core/lib/drive.mjs`: log env names, not values
- `core/lib/hooks/observe.drive.mjs`: mask `--env` values
- `core/agents/developer.md`: drive with `--env`, test values
- `core/skills/expediting/steps/30-check.md`: same, fast lane
- `test/kernel/drive.test.mjs`: env reaches the run
- `test/hooks/hooks.test.mjs`: masked command row

**Changes:** Per D-007. The CLI parses each `--env` as `NAME=VALUE`, with `NAME` matching `^[A-Za-z_][A-Za-z0-9_]*$` (usage error, exit 1, otherwise), into the `env` object `drive()` already accepts. Each drive log row gains `env: [names]`. `observe.drive` rewrites `--env NAME=VALUE`, quoted or not, to `--env NAME=***` before it truncates the logged command. One sentence in `developer.md` step 3 and in `30-check.md`: set variables with `--env NAME=VALUE`, test values only, never as `NAME=value tether ...`.

**Done when:**
- **T-6.1** `tether drive --run "node .tether/state/scratch/env-probe.mjs" --env PROBE=secret-probe-42`, where the script exits 0 only when `PROBE` equals that value, reports `ok: true`.
- **T-6.2** After T-6.1, `.tether/state/drive-log.jsonl` holds `"env":["PROBE"]` and no `secret-probe-42`; the observe.drive row for the same Bash command holds `--env PROBE=***` and no `secret-probe-42`.
- **T-6.3** `--env 1BAD=x` and `--env NOEQUALS` exit 1 with a usage message.
- **T-6.4** `developer.md` and `30-check.md` name `--env NAME=VALUE` and say test values only.
- **T-6.5** `npm test` passes.

## Phase 7: the bench installs through init, and one run measures prompts

**Touch set:**
- `bench/adapters/plugin.mjs`: install runs `init --no-install`
- `bench/test/adapters.test.mjs`: install holds init's files
- `bench/results/plugin-init.json`: the first measurement record
- `bench/results/plugin-init-gate13.json`: the rerun record
- `core/lib/init.mjs`: plugin cache read rule
- `test/kernel/init.test.mjs`: the rule, merged once

**Changes:** Per D-008, `install(repo, harnessRoot)` keeps the manifest check, copies `.tether/config.json` as today (for sources), creates `work/`, and runs `node <harnessRoot>/core/bin/tether.mjs init --no-install --root <repo>` instead of copying `CLAUDE.md` and `.claude/settings.json`; a non-zero exit throws with the step lines. The adapter test asserts the installed `CLAUDE.md` contains the template and the settings hold the D-003 keys and no `hooks`. The first measured run (done, `bench/results/plugin-init.json`, $15.75) showed the plugin-read prompts. Per D-003 (r3), the `settings` step also appends `Read(~/.claude/plugins/cache/tether-dev/**)` to `permissions.allow`, with the marketplace name taken from the constant the marketplace step uses. Per D-008 (r2), the adapter's `allowedTools` gains `Read(//<harnessRoot>/core/**)` in POSIX form (on Windows `D:\x\y` becomes `//d/x/y`), computed at install time from the harness root. `init.test.mjs` and `adapters.test.mjs` expect the new rule wherever they list the settings keys. Then one rerun, dry-run first: `node bench/run.mjs --harness plugin --tasks gate-13-api-key-auth --runs 1 --budget-usd 8 --out bench/results/plugin-init-gate13.json`. Expected spend: about $4 (gate-13 cost $4.05 in the first run), capped at $8 per `claude -p` call; the gate quotes this before the rerun starts.

**Done when:**
- **T-7.1** `node --test bench/test/adapters.test.mjs` passes with the new install assertions.
- **T-7.2** The dry run lists the three tasks and spends nothing; the phase block quotes the real run's total cost.
- **T-7.3** In the rerun of `gate-13-api-key-auth` (`bench/results/plugin-init-gate13.json`), no `prompt_log` entry is a Read, Grep or Glob of a plugin file (under the checkout's `core/` or the plugin cache). The remaining groups (`for` loops, project tools without a rule, `$(...)` substitution) are listed in the block as known and not counted against the phase.
- **T-7.6** A fresh `init` writes `Read(~/.claude/plugins/cache/tether-dev/**)` once, and a rerun leaves it once; the installed bench repo's settings hold it, and the adapter's `allowedTools` holds the `Read(//.../core/**)` rule for the harness root.
- **T-7.4** pass@1 on the three tasks is not lower than in `plugin-core.json`.
- **T-7.5** `npm test` passes.

## Open questions

- **OQ-001** [STRATEGIC] Where the marketplace lives for installs beyond this machine: a git URL, its final name, and when `tether-dev` becomes permanent (SDR RISK-003). Owner: owner, through consulting at the alpha. Fallback: init registers the local checkout, and committed settings name an absolute path only this machine resolves.
- **OQ-002** Whether Claude Code puts a plugin's `bin/` on PATH for the PowerShell tool as it does for Bash. Owner: developer, Phase 3 drive. Fallback: T-3.1 runs with `core/bin` put on PATH by hand; if a real session's PowerShell does not see it, the template line "run `tether` from the Bash tool" carries the fix, and `PowerShell(tether *)` stays for when it does.
- **OQ-003** `.claude/MEMORY.md` says "Local install takes two commands until `tether init`" and needs a new line once Phase 4 lands. Owner: lead, after the Phase 4 gate. Fallback: the decision line stays stale while CONTRIBUTING.md is right.

## Revision log

- 2026-10-08: Scope (r2): checks 13 and 14 from the packaging OQ-003 deferred with reasons; init writes no hooks, and pinning waits on OQ-001.
- 2026-10-08: D-003 (r2): "teammate" became "another developer"; wording only, the decision is unchanged.
- 2026-10-08: D-004 (r2): the PowerShell probe's exact commands and output are inlined so the claim can be checked; the decision is unchanged.
- 2026-10-08: D-005 (r2): RISK-005 says "another developer's clone" instead of "a teammate's clone"; wording only.
- 2026-10-08: D-006 (r2): bare kernel pieces count toward an allow only in a compound of two or more; a lone tether call stays with the project rule (user ruling, phase 5 gate).
- 2026-10-08: D-003 (r3): init also allows Read(~/.claude/plugins/cache/tether-dev/**); 21 of 31 phase 7 prompts were reads of plugin files (user ruling).
- 2026-10-08: D-008 (r2): bench passes a read-only Read(//<checkout>/core/**) in --allowedTools, not --add-dir, which accepts edits; one gate-13 rerun follows (user ruling).
