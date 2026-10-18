---
kind: design
lane: design
title: Fix follow-ups from the two items
date: 2026-10-18
audience: developer
sources: [request.md, core/lib/route.mjs, core/lib/gate.mjs, core/lib/packet.mjs, core/lib/next.mjs, core/lib/hooks/guard.block.mjs, core/lib/hooks/guard.bash.mjs, core/lib/kernel-call.mjs, core/lib/admit.mjs, core/lib/mutate.mjs, core/agents/developer.md, core/bin/picket, core/bin/picket.cmd, core/templates/claude-block.md, CLAUDE.md, package.json, test/kernel/admit-labelled.json, bench/tasks/, work/20261018-adopt-comparison-report-improvement-ideas/design.md, work/20261018-debugging-skill-ends-in-a-diagnosis/order.md]
phases:
  - n: 1
    files: [core/agents/developer.md, core/lib/hooks/guard.block.mjs, core/lib/gate.mjs, test/hooks/hooks.test.mjs, test/kernel/gate.test.mjs, test/kernel/route.test.mjs, test/kernel/packet.test.mjs]
    greps:
      - path: core/agents/developer.md
        pattern: '^(?![\s\S]*\(\+<k> more\))'
        flags: i
      - path: core/lib/hooks/guard.block.mjs
        pattern: 'more'
    tests: true
    drive: false
    security: false
  - n: 2
    files: [core/lib/hooks/guard.bash.mjs, core/lib/powershell-text.mjs, core/hooks/README.md, docs/how-to.md, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'Invoke-Expression'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: '\bLANGS\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'Out-File'
      - path: test/hooks/handlers.test.mjs
        pattern: 'bash -c .picket waive'
    tests: true
    drive: false
    security: true
  - n: 3
    files: [core/lib/admit.mjs, test/kernel/admit.test.mjs, test/kernel/admit-labelled.json]
    greps:
      - path: core/lib/admit.mjs
        pattern: 'subcommand'
      - path: test/kernel/admit.test.mjs
        pattern: 'Add a debugging skill'
    tests: true
    drive: false
    security: false
  - n: 4
    files: [scripts/claude.mjs, package.json, CLAUDE.md, CONTRIBUTING.md, README.md, test/claude-launcher.test.mjs]
    greps:
      - path: package.json
        pattern: '"claude": "node scripts/claude.mjs"'
      - path: scripts/claude.mjs
        pattern: 'PICKET_CHECKOUT'
      - path: scripts/claude.mjs
        pattern: 'export function checkoutEnv\b'
      - path: CLAUDE.md
        pattern: 'core/bin'
    tests: true
    drive: true
    security: false
---
# Design: Fix follow-ups from the two items

## Problem

Running the two items of 2026-10-18 surfaced seven gaps (`request.md`). A phase commit can drop a staged file hidden behind the `Files:` line's `(+k more)`. The irreversible gate fires on a marker quoted in backticks. `waive` and `comment`, the verbs only the lead may run, escape the guard inside `eval` and `sh -c`. A shell write to a code or test file skips `guard.comments` and `guard.silenced`. `admit` sends a new skill to the fast lane. Two decisions in closed records are out of date. The lead's `picket` on PATH is the installed 1.0.0-alpha.2, not this checkout. The binding constraints are one copy of each detector (`core/lib/comments.mjs`, `core/lib/silenced.mjs`), the 200 ms hook cold budget, CLAUDE.md at most 2048 bytes (now 2022), no change to what `picket init` writes for installed users, and no new code comments. Nothing here is irreversible or a schema migration; admit's design reasons were text matches.

## Decisions

### D-001: The block's `Files:` line lists every staged path; only the packet shortens it
**Decision:** Infrastructural decision. The developer block's `Files:` line names every path the phase staged, and `core/agents/developer.md` drops `(+<k> more)` from the block shape. `guard.block` rejects a `PHASE DONE` developer block whose `Files:` value holds `+<n> more`, naming the line. The packet keeps shortening the display (`filesLine` in `core/lib/packet.mjs` already fits whole paths to the width and adds `+k more`), so the user sees the same short row while `route` reads the full list through `blockFiles` and commits every path.
**Instead of:** `guard.block` comparing the staged set against the plan and rejecting truncation only when they differ: it puts a git call into a Stop hook and keeps two sources for one fact (the block and the index), while the plain rule "list every path" needs neither.
**Risks:**
- **RISK-001** A phase with 30 files makes a long `Files:` line. Mitigation: it is one line, so `guard.block`'s 40-line budget is unaffected, and the packet shows the short form.

### D-002: An `[IRREVERSIBLE]` marker counts only outside code
**Decision:** Infrastructural decision. `ownGate` in `core/lib/gate.mjs` removes fenced code blocks and inline code spans from the phase section before it looks for `[IRREVERSIBLE]`, so a phase that quotes the marker (phase 9 of the first item described the migration step file that way) takes no irreversible gate. A real marker stays plain text, as the design template asks ("mark `[IRREVERSIBLE]` inline").
**Instead of:** counting the marker only on an `**Irreversible:**` line: records written to the template mark the step inline in prose, so they would lose their gate.
**Risks:**
- **RISK-002** An architect writes the real marker inside backticks and the gate goes silent. Mitigation: the template and step file show it unquoted, and the reviewer's cross-check reads every `[IRREVERSIBLE]` step against the gate.

### D-003: The lead-only rule reaches inside meta-command payloads
**Decision:** Infrastructural decision. For a spawned agent, `guard.bash` reads the payload of a meta command and runs the existing `leadOnlyRefusal` on it. Payloads: the string arguments of `eval`; the `-c` string of `sh`, `bash`, `zsh`, `ksh`, `dash`; the argv tail of `xargs`, `env`, `nohup`, `timeout`, `watch`; and in PowerShell, `Invoke-Expression` or `iex`, `powershell` or `pwsh` with `-Command` or `-c`, and `cmd /c`. The payload goes through the same parse path the guard uses for wrapped commands (`shellText`, `parse`, `splitIntoSegments`), with nesting capped at `MAX_SUBSTITUTION_DEPTH`. A payload that cannot be parsed, or holds an expansion, and mentions `picket` is denied with the `lead_only` reason, as an expansion in the verb position already is. The lead's own commands are unchanged.
**Instead of:** denying every meta command from a spawned agent: `timeout 30 npm test` and `bash -c "npm run build"` are ordinary developer commands, and denying them trades a narrow hole for a broad stall.
**Risks:**
- **RISK-003** A further wrapper (`python -c "os.system('picket waive …')"`) still passes. Mitigation: those roots are already `unknown` and reach the permission prompt; the guard log shows any such row for a later item.

### D-004 (r2): Shell writes to code and test files from spawned agents are denied, so the edit guards stay their only path
**Decision:** Infrastructural decision. `guard.bash` denies, for a spawned agent (`SPAWNED_AGENTS`: analyst, architect, developer, reviewer), as `request.md` item 4 says, a shell write whose target is inside the project, outside `.picket/state/`, and has an extension in `LANGS` from `core/lib/comments.mjs`: a `>` or `>>` redirect (heredocs included), `tee` and `tee -a`, `sed -i`, and PowerShell `Set-Content`, `Add-Content`, `Out-File` and `>`. The reason names the path and says to use the Edit or Write tool, where `guard.comments` and `guard.silenced` run, and carries the existing escalation hint. The lead's commands and the user's approved scripts get the decision they get today, so redirect-based generation (`node gen.mjs > src/generated.ts`) keeps working there. Both detectors keep one copy and gain no second input path; the guard only imports `LANGS` and `extOf`.
**Instead of:** running the comment and silenced checks on the text the shell writes: every write form (append, heredoc, `tee -a`, a `sed` script) needs its own reconstruction of the file's before and after text, a second way into both detectors, and parse time inside the 200 ms budget, for a write the developer contract already forbids ("Bash runs things; it does not read or rewrite files").
**Risks:**
- **RISK-004** The lead in the fast lane can still write a code or test file by shell and skip both edit guards. Mitigation: accepted per the lead's ruling; the lead works in the user's view, and the review summary's silenced list and lint.craft see the result in the diff.
- **RISK-005** `cp`, `mv`, `git apply` or `patch` still bring a file in unchecked. Mitigation: **OQ-001**; the review summary's silenced list and lint.craft still see the result in the diff.

### D-005 (r3): Admission treats a new harness surface as new surface
**Decision:** Infrastructural decision. `NEW_SURFACE` in `core/lib/admit.mjs` gains `skill`, `agent`, `hook`, `verb`, `subcommand`, `rule` and `step file`, and accepts up to three words between the article and the noun, so "Add a debugging skill" and "adds a new `picket statusline` verb" leave the fast lane. These nouns count only after an action verb (`add`, `adds`, `added`, `adding`, `create`, `introduce`), never after a bare "new", so a question about a surface stays research: "how is a new hook registered?" and "How does a new skill get added? Write a report, no code changes." answer `research` today and must keep doing so. One pattern still holds all new-surface wording. A scratch run of this pattern over `test/kernel/admit-labelled.json` and `bench/tasks/` matched nothing. Over `work/*/request.md` the verb-led pattern matched four requests, which ended in `order` or `design` (the `fast` one is the case this fixes).
**Instead of:** a separate `harness_surface` signal: it would decide exactly what `new_surface` decides, so two names for one rule.
**Risks:**
- **RISK-006** "Add an eslint rule that bans console" now admits as order. Mitigation: accepted; a new lint rule is a project convention, which is a recorded decision. A labelled case pins the behaviour. The near miss the other way is a research question that names a surface ("how is a new hook registered?"): a bare "new" before the noun would have moved it out of research, so the verb is required and two labelled research cases pin it. "how do I add a skill?" answers `order` today, because `RESEARCH` has no "how do I", and this change leaves it there.

### D-006: `npm run claude` puts this checkout's `core/bin` first on PATH
**Decision:** Infrastructural decision. `package.json`'s `claude` script becomes `node scripts/claude.mjs`. The script starts `claude --plugin-dir core` with the remaining arguments, inherited stdio and exit code, and `PATH` prefixed with `<repo>/core/bin` (joined with `path.delimiter`). Git Bash then finds `core/bin/picket` (mode 100755, `#!/bin/sh`) and PowerShell finds `core/bin/picket.cmd` ahead of the global npm shim. The premise was checked in this session, which was started by `npm run claude`: the Bash tool's PATH holds the npm run process entries at position 9 (`/d/workspace/github/AISpec/node_modules/.bin`) and the global `AppData/Roaming/npm` at 45, so a prefix set by the launcher reaches the tools first. Installed users are untouched: `scripts/` and package scripts are not in `package.json` `files`, `core/templates/claude-block.md` does not change, and only this repository's `## This repository` paragraph (outside the init block) names the launcher.
**Instead of:** a CLAUDE.md line telling the lead to call `node core/bin/picket.mjs`: every step file, hook message and packet says `picket …`, so the lead would have to rewrite each command by hand. And `npm link` repoints the global `picket` for every project on the machine.
**Risks:**
- **RISK-007** A session started with plain `claude --plugin-dir core` still runs the installed CLI, and `picket --version` prints the same 1.0.0-alpha.2 for both. Mitigation: the launcher sets `PICKET_CHECKOUT=<repo>` and the `## This repository` line says to check `command -v picket`; **OQ-002** asks whether `picket preflight` should warn.

## Scope

**In:**
- Follow-ups 1 to 5 and 7 of `request.md` as four phases, grouped by mechanism: block and record parsing (1, 2), the shell guard (3, 4), admission (5), the repo CLI launcher (7).
- Follow-up 6, made by me in this pass as the record owner, as in-place amendments with one revision-log line each, not as developer phases:
  - `work/20261018-adopt-comparison-report-improvement-ideas/design.md`: D-007 (r2) adds the `baseline red` outcome (the suite fails before any mutant, so no mutant runs), as `core/lib/mutate.mjs:118` does.
  - `work/20261018-debugging-skill-ends-in-a-diagnosis/order.md`: D-003 (r3). A declared research item or "no code changes" request stays `research` before the security check, because research writes no code. Only after security does a diagnosis go to `debugging`, matching `isDiagnosis` and the branch order in `core/lib/admit.mjs`.

**Out:**
- `cp`, `mv`, `git apply` and `patch` into source files (**OQ-001**).
- Any change to `picket init`, `core/templates/claude-block.md` or the shipped package contents.
- A release to npm; the launcher only makes this checkout's CLI win inside this repository.

## Phase 1: Phase commits and gates read the record literally

**Touch set:**
- `core/agents/developer.md`: `Files:` lists every staged path
- `core/lib/hooks/guard.block.mjs`: reject `+k more` in `Files:`
- `core/lib/gate.mjs`: strip code before the marker test
- `test/hooks/hooks.test.mjs`: guard.block cases
- `test/kernel/gate.test.mjs`: marker in and out of code
- `test/kernel/route.test.mjs`: a path listed only in `Files:` is committed
- `test/kernel/packet.test.mjs`: long `Files:` shortened on display

**Changes:** As D-001 and D-002. The block shape line in `developer.md` becomes `Files: <every path you staged, comma-separated>`. `guard.block` adds a problem for a `## Phase <n> of <id>` block ending `PHASE DONE` whose `Files:` value matches `\+\d+ more`: "list every staged path on Files:; the packet shortens it for display". In `gate.mjs`, the phase section loses fenced blocks (lines between a pair of fences) and inline code spans (backtick runs) before the `[IRREVERSIBLE]` test. `phaseSection` and `touchSetPaths` keep reading the raw section, because touch-set paths live in backticks.

**Done when:**
- **T-1.1** `guard.block` blocks a `PHASE DONE` developer block whose `Files:` line ends `(+3 more)` or `, +3 more`, naming the `Files:` line; the same block with every path listed passes.
- **T-1.2** `route` with verdict `approved` commits a staged file that only the block's full `Files:` line names, outside the plan paths.
- **T-1.3** `picket packet` on a block listing 12 paths shows whole paths up to the width followed by `+k more`.
- **T-1.4** `ownGate` returns `irreversible` for a phase with a plain `[IRREVERSIBLE]` and `null` for a phase whose only occurrences sit in inline code or a fenced block; touch-set paths in backticks still read.
- **T-1.5** `core/agents/developer.md` shows no `(+<k> more)` in its block shape and stays within 120 lines.
- **T-1.6** `npm test` passes.

## Phase 2: The shell guard sees inside wrappers and refuses shell writes to code

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: meta payloads, shell-write targets
- `core/lib/powershell-text.mjs`: PowerShell writer cmdlets and payloads [INFERRED]
- `core/hooks/README.md`: guard.bash row
- `docs/how-to.md`: troubleshooting row for the new deny
- `test/hooks/handlers.test.mjs`: guard.bash decisions
- `test/hooks/hooks.test.mjs`: cold start with the new import

**Changes:** As D-003 and D-004. A payload reader returns the command text a meta segment runs (`eval` arguments joined, the word after `-c`, the argv tail after the flags of `xargs`, `env`, `nohup`, `timeout`, `watch`; PowerShell `Invoke-Expression`/`iex` argument, the `-Command`/`-c` string of `powershell`/`pwsh`, the tail of `cmd /c`). For a spawned agent the payload goes through the wrapped-command parse path and `leadOnlyRefusal`; an unreadable payload, or one holding an expansion, that mentions `picket` is a `lead_only` deny. A shell-write check collects targets from `redirectTargets` (Bash) and the PowerShell reader, plus the file arguments of `tee` and `sed -i`, resolves each against the effective cwd, and denies, for a spawned agent only, a target inside the project root, outside `.picket/state/`, whose `extOf` is in `LANGS`: "guard.bash: <path> is code; a shell write skips guard.comments and guard.silenced. Write it with the Edit or Write tool." plus the escalation hint. `LANGS` and `extOf` are imported from `core/lib/comments.mjs`; nothing in either detector changes. Size the change the way earlier guard work was sized: replay the project guard log through a scratch copy with a scratch root and count rows whose decision changes.

**Done when:**
- **T-2.1** For agent `developer`, `eval picket waive <id> --path p --text t`, `bash -c 'picket waive <id> --path p --text t'`, `sh -c "picket comment <id> --path p --text t"`, `timeout 5 picket waive …`, PowerShell `Invoke-Expression 'picket waive …'`, `pwsh -c "picket waive …"` and `cmd /c picket waive …` are denied with the `lead_only` reason.
- **T-2.2** For agent `developer`, `bash -c "$CMD"` mentioning `picket` is denied, while `bash -c 'npm test'` and `timeout 30 npm test` get the decision they got before this phase.
- **T-2.3** For the lead (no agent), the same `eval` and `bash -c` commands get the decision they got before this phase.
- **T-2.4** For agent `developer`, `cat > test/kernel/x.test.mjs <<'EOF'`, `echo x >> src/a.ts`, `printf x | tee -a src/a.py`, `sed -i 's/a/b/' src/a.cs`, PowerShell `Set-Content src/a.ts x` and `"x" | Out-File src/a.ts` are denied with a reason naming the path and the Write tool; for the lead (no agent) the same commands get the decision they got before this phase.
- **T-2.5** For agent `developer`, `echo x > .picket/state/scratch/a.mjs`, `echo x > notes.md`, `> /dev/null`, `2>&1` and a code target outside the project root are not denied by the shell-write check.
- **T-2.6** The block's `Decisions:` line gives the guard-log replay count of rows whose decision changed, from complete (untruncated) rows only.
- **T-2.7** `npm test` passes, the hook cold-start budget included.

## Phase 3: Admission sends a new harness surface out of the fast lane

**Touch set:**
- `core/lib/admit.mjs`: widen `NEW_SURFACE`
- `test/kernel/admit.test.mjs`: surface and near-miss cases
- `test/kernel/admit-labelled.json`: labelled entries

**Changes:** As D-005. The added nouns and the gap of up to three words sit in `NEW_SURFACE` itself; no new signal. Labelled entries: at least four requests that add a skill, agent, hook or verb labelled `order`, at least two near misses labelled `fast` ("Fix the typo in the hook table of `core/hooks/README.md`", "Rename the `--deleted` flag of the waive verb in one file"), and two research questions that name a surface labelled `research` ("how is a new hook registered?", "How does a new skill get added? Write a report, no code changes."). The nouns match only after an action verb, never after a bare "new".

**Done when:**
- **T-3.1** "Add a debugging skill, picket:debugging, to the core." answers `order` with the new-surface reason, and so do "Add a hook that denies shell writes" and "Add a new `picket mutate` verb".
- **T-3.2** The two `fast` near misses above answer `fast`, the two research questions answer `research`, and the diagnosis requests of criterion T-2.1 in `work/20261018-debugging-skill-ends-in-a-diagnosis/order.md` still answer `none`.
- **T-3.3** The labelled set holds the eight new entries and its share stays at or above 0.9.
- **T-3.4** Every bench task keeps its lane (`bench/test/tasks.test.mjs` green).
- **T-3.5** `npm test` passes.

## Phase 4: The repository's sessions run this checkout's CLI

**Touch set:**
- `scripts/claude.mjs`: new launcher
- `package.json`: `claude` script
- `CLAUDE.md`: the `## This repository` paragraph
- `CONTRIBUTING.md`, `README.md`: describe what `npm run claude` does
- `test/claude-launcher.test.mjs`: new, PATH and env

**Changes:** As D-006. `scripts/claude.mjs` exports `checkoutEnv(env, repo)`, which returns a copy of `env` with `PATH` (or `Path` on Windows, whichever key exists) starting with `<repo>/core/bin` and not repeating it, plus `PICKET_CHECKOUT=<repo>`. Run as a script, it spawns `claude --plugin-dir core <args>` with that env, inherited stdio and `shell: process.platform === "win32"`, and exits with the child's code; importing it starts nothing. The `## This repository` paragraph says `npm run claude` puts `core/bin` first on PATH, so `picket` is this checkout's kernel, and that `command -v picket` shows which one runs. CLAUDE.md stays at or under 2048 bytes. The init block and `core/templates/claude-block.md` stay as they are.

**Done when:**
- **T-4.1** `checkoutEnv({ PATH: "/usr/bin" }, "/r")` gives `PATH` `/r/core/bin` + `path.delimiter` + `/usr/bin` and `PICKET_CHECKOUT` `/r`; a second call on its result does not add `core/bin` again; a `Path` key is used when `PATH` is absent.
- **T-4.2** `package.json` runs `node scripts/claude.mjs` for `claude`, its `files` list is unchanged, and `npm pack --dry-run` lists no path under `scripts/`.
- **T-4.3** `picket drive --run "node scripts/claude.mjs --version"` prints the Claude Code version and exits 0.
- **T-4.4** `git diff` shows no change to `core/templates/claude-block.md`, CLAUDE.md is at most 2048 bytes, and the init tests pass.
- **T-4.5** `npm test` passes.

## Open questions

- **OQ-001** Should `cp`, `mv`, `git apply` and `patch` into code files be denied too? Owner: user. Fallback: they stay as they are; the review summary's silenced list and lint.craft see the result in the diff.
- **OQ-002** Should `picket preflight` warn when it runs inside the Picket checkout without `PICKET_CHECKOUT` (a session not started by `npm run claude`)? Owner: user. Fallback: the `## This repository` line and `command -v picket` only.
- **OQ-003** Phase 2 is `security: true`: it changes when `guard.bash` refuses an agent, including the rule that only the lead records the user's approvals, so it takes its own gate inside the run grant. Owner: lead. Fallback: the gate stops at phase 2 as the kernel decides.

## Revision log
- 2026-10-18: D-004 (r2): shell-write deny narrowed to spawned agents, as request item 4 says; lead and approved scripts keep redirect generation; T-2.4, T-2.5 test the agent.
- 2026-10-18: D-005 (r2): harness nouns count only after an action verb, so surface questions stay research; two labelled research cases; T-3.2 cites the debugging order by id.
