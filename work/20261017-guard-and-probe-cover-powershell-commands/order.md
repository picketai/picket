---
kind: order
lane: order
title: Guard and probe cover PowerShell commands
date: 2026-10-17
audience: developer
sources: [work/20261017-guard-and-probe-cover-powershell-commands/request.md, C:/Users/vlad.apetre/.claude/debug/d2b63e30-09ac-4528-94b9-818eda598ccc.txt, C:/Users/vlad.apetre/.claude/projects/C--Users-vlad-apetre-AppData-Local-Temp-picket-ask-probe-interactive/*.jsonl, core/hooks/hooks.json, core/lib/hooks/guard.bash.mjs, core/lib/hooks/observe.drive.mjs, core/lib/escalation.mjs, core/lib/saved-rules.mjs, core/lib/kernel-call.mjs, core/lib/drive-evidence.mjs, bench/probe-ask.mjs, bench/lib/ask-probe-hook.mjs, bench/results/ask-probe.json, work/20261016-guard-escalation-through-native-ask-dialog/design.md]
phases:
  - n: 1
    files: [bench/probe-ask.mjs, bench/lib/ask-probe-hook.mjs, bench/results/ask-probe.json, bench/test/probe-ask.test.mjs]
    greps:
      - path: bench/probe-ask.mjs
        pattern: '"Bash\|PowerShell"'
      - path: bench/probe-ask.mjs
        pattern: 'picket-probe-bang'
      - path: bench/lib/ask-probe-hook.mjs
        pattern: 'tool_name'
    tests: true
    drive: true
  - n: 2
    files: [core/hooks/hooks.json, core/lib/powershell-text.mjs, core/lib/hooks/guard.bash.mjs, test/hooks/powershell-text.test.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: core/hooks/hooks.json
        pattern: 'Bash\|PowerShell"[^\n]*guard\.bash\.mjs'
      - path: core/lib/powershell-text.mjs
        pattern: 'export function readPowerShell'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'readPowerShell'
    tests: true
    drive: true
  - n: 3
    files: [core/hooks/hooks.json, core/lib/powershell-text.mjs, core/lib/escalation.mjs, core/lib/saved-rules.mjs, core/lib/hooks/guard.bash.mjs, core/lib/hooks/observe.drive.mjs, test/hooks/powershell-text.test.mjs, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/kernel/saved-rules.test.mjs]
    greps:
      - path: core/hooks/hooks.json
        pattern: 'Bash\|PowerShell"[^\n]*observe\.drive\.mjs'
      - path: core/lib/escalation.mjs
        pattern: '\$env:'
      - path: core/lib/saved-rules.mjs
        pattern: 'PowerShell'
      - path: core/lib/hooks/observe.drive.mjs
        pattern: 'readPowerShell'
    tests: true
    drive: true
---
# Order: Guard and probe cover PowerShell commands

## Problem

`core/hooks/hooks.json` wires `guard.bash.mjs` (PreToolUse) and `observe.drive.mjs` (PostToolUse, PostToolUseFailure) with `"matcher": "Bash"`, so a command Claude runs through the PowerShell tool reaches no Picket hook. The debug log `d2b63e30…txt` shows it at 18:05:05: `classic.PreToolUse settled in 0.4ms`, then `tool_dispatch_start tool=PowerShell`, with Claude Code's own PowerShell parser failing on "The command line is too long", so the host gives no backstop either. The ask probe has the same blind spot: `bench/probe-ask.mjs:44` matches Bash only, all interactive sessions ran `echo picket-probe-ok` as a `PowerShell` tool_use (transcripts confirm `"name":"PowerShell","input":{"command":"echo picket-probe-ok",…}`), so `interactive.auto_dialog: "silent"` and `bang_hooked: false` in `bench/results/ask-probe.json` were recorded with no hook running. D-003 (r2) of `20261016-guard-escalation-through-native-ask-dialog` rests on both. Binding constraints: deny stays the default, `PICKET_ESCALATE` keeps its rules, the hook stays under its 200 ms cold budget, and only the user can record the interactive evidence.

## Decisions

### D-001: One guard hook reads both tools, chosen by tool_name
**Decision:** The guard, PreToolUse entry and both observe.drive entries in `core/hooks/hooks.json` take `"matcher": "Bash|PowerShell"`. `guardBash(input)` reads `input.tool_input.command` for either tool and dispatches on `input.tool_name`: `"PowerShell"` takes the PowerShell reading (D-002), anything else, a missing name included, keeps today's bash reading, so every existing test that calls `guardBash` without `tool_name` is untouched. `observeDrive` dispatches the same way. Every guard log row gains a `tool` field (`"Bash"` when `tool_name` is absent), so `.picket/state/guard.log` shows PowerShell decisions beside Bash ones. The hook keeps its name `guard.bash.mjs`. The PowerShell tool's input carries `command` (verified in the four probe transcripts); that its PreToolUse hooks fire under a `PowerShell` matcher is proven by phase 1's re-run before phase 2 ships.
**Instead of:** a second hook file `guard.powershell.mjs`: it would copy the trace, source protection, saved-rule and escalation code, and every later rule change would need two edits in two processes.
**Risks:**
- **RISK-001** The name `guard.bash` now misdescribes the hook. Mitigation: none in code; renaming touches `migrate`, the hooks README and the legacy log name, a cost larger than the confusion. OQ-003 covers the README table.

### D-002: A PowerShell reader that feeds the existing classifier and never allows
**Decision:** A new pure module `core/lib/powershell-text.mjs` exports `readPowerShell(text)` returning `{ segments: string[][], hiddenExecution, sawWriteRedirect, sawBackground, redirectTargets: (string|null)[] }` or `null` when the text is unreadable (an unterminated quote or here-string). That is the shape `splitIntoSegments` returns plus `hiddenExecution`, so `classifySegment`, `segmentSource`, `sourceAllowed`, `isWorktreeTeardown`, `wrappedCommands` and `leadingAssignments` apply unchanged. Reading rules:
- Statements split at `;`, newline, `&&`, `||`, `|`, and at `{`, `}`, `(`, `)`, `$(`, `@(` outside quotes, so `Get-ChildItem | ForEach-Object { Remove-Item $_ }` yields a segment rooted at `Remove-Item`. `$(` and `@(` also set `hiddenExecution`.
- Quotes: `'…'` is literal with `''` as an embedded quote; `"…"` takes backtick escapes; `@'…'@` and `@"…"@` here-strings are one word; a backtick outside quotes escapes the next character (line continuation included); `#` to end of line and `<# … #>` are dropped.
- A leading `&` (call operator) or `.` (dot source) before a word is dropped; a trailing `&` sets `sawBackground`. A root that is not literal (`& $cmd`, `& { … }`) sets `hiddenExecution` and classifies `unknown`.
- `>`, `>>`, `N>`, `N>>`, `*>`, `*>>` record a redirect target (`$null` discards, like `/dev/null`); `N>&1` is plumbing.
- Roots are canonical: directory and `.exe` stripped, the lowercased name looked up in one alias table, an unmapped name returned lowercased (`GIT` reads `git`). Table: `remove-item ri rm rmdir rd del erase` to `Remove-Item`; `stop-process spps kill` to `Stop-Process`; `clear-content clc` to `Clear-Content`; `clear-item cli` to `Clear-Item`; `remove-itemproperty rp` to `Remove-ItemProperty`; `format-volume`, `clear-disk`, `stop-computer`, `restart-computer` to their cmdlet names; `set-location sl cd chdir push-location pushd` to `cd`; `get-childitem gci ls dir` to `Get-ChildItem`; `get-content gc cat type` to `Get-Content`; `select-string sls` to `Select-String`.

`DENY_ROOTS` gains `Stop-Process`, `Clear-Content`, `Clear-Item`, `Remove-ItemProperty`, `Format-Volume`, `Clear-Disk`, `Stop-Computer`, `Restart-Computer`; `SOURCE_READERS` gains `Get-Content`. A new `evaluatePowerShell(command, ctx)` in `guard.bash.mjs` runs the per-segment source check, classification, `cd` tracking and wrapped-verb check, then the redirect source check, and decides: deny when any segment is `deny` or acts inside a source; otherwise fall through with reason `powershell:[<classes>]`. It never answers `allow`. Extract the per-segment source and wrapped-verb checks out of `evaluateCommand` into one function both readings call. Example: `Remove-Item -Recurse -Force build; git status` reads as `[["Remove-Item","-Recurse","-Force","build"],["git","status"]]` and denies.
**Instead of:** asking a real PowerShell parser (`[System.Management.Automation.Language.Parser]::ParseInput` through `pwsh`): spawning `pwsh` costs far more than the 200 ms hook budget, and the debug log shows Claude Code's own `pwsh` parser failing with "The command line is too long" on this host.
**Risks:**
- **RISK-002** `evaluatePowerShell` repeats the shape of `evaluateCommand`'s loop, so a rule added to one can miss the other. Mitigation: the shared per-segment function above, plus one table test that runs each destructive command under both tool names and expects deny from both.
- **RISK-003** A command built from strings (`& ("Remove"+"-Item") x`) or run through `cmd /c` is not read as destructive. Mitigation: it falls through to Claude Code's own permission flow, which is exactly today's behaviour for every PowerShell command; the guard only ever narrows that.
- **RISK-004** Never allowing means read-only PowerShell commands keep their prompt in `default` mode. Mitigation: none needed; it matches today, and auto-allow can come later on its own evidence.

### D-003: PowerShell escalation uses `$env:PICKET_ESCALATE = "<why>"; <command>`
**Decision:** In the PowerShell tool the marker is a first statement `$env:PICKET_ESCALATE = "<why>"` (`$env:` matched case-insensitively, the name exactly `PICKET_ESCALATE`, a single- or double-quoted literal), then `;`, then exactly one command. `readPowerShell` folds that statement into the next segment as the leading assignment `PICKET_ESCALATE=<why>`, so `escalationMarker`, `readEscalation`, `escalationVerdict`, `ASKING_MODES`, the `refused_before` check and the ledger row work unchanged. A marker statement anywhere else, or followed by more than one command, is not folded and denies on shape. `withoutMarker` strips either form, so `commandKey` gives the guard's `ask` row and observe.drive's `ran` row the same key. The PowerShell deny hint names this form instead of the bash one. The saved-rule check becomes tool-aware: `escalationAllowRules({ root, home, tool = "Bash", command })` keeps today's Bash logic and, for `PowerShell`, flags any `PowerShell` allow rule with no pattern, a pattern starting with `*`, a pattern containing `PICKET_ESCALATE`, or a literal prefix (before the first `*`, or before a legacy `:*`) that case-insensitively starts the escalated command or `$env:PICKET_ESCALATE`. Example: `PowerShell(git *)` blocks an escalated `git push`; the repo's `PowerShell(picket *)` does not. `preflight.mjs` keeps calling it without `tool`.
**Instead of:** accepting the bash text `PICKET_ESCALATE="<why>" git push` in the PowerShell tool: PowerShell cannot run it (`PICKET_ESCALATE=…` is not a command), so an approved dialog would run nothing and record a failure.
**Risks:**
- **RISK-005** Whether Claude Code splits a PowerShell compound into statements before matching allow rules is unverified, so a rule matching only the command part might approve without the dialog. Mitigation: the PowerShell saved-rule check matches the escalated command's own prefix, so it holds whether or not the host splits.

### D-004: The probe proves its own evidence before the record accepts it
**Decision:** The probe hook settings match `Bash|PowerShell` and `logLine` records `tool` from `tool_name`. The interactive steps add a distinct bang sentinel, `! echo picket-probe-bang`. `--confirm` takes only `auto=shown|silent` and reads `<INTERACTIVE_DIR>/hook-log.jsonl`: with no `PreToolUse` line whose command holds `picket-probe-ok`, it exits 1, names the missing sentinel, and leaves the record and the scratch project as they are. Otherwise it writes `interactive: { auto_dialog, bang_hooked, tool }`, where `bang_hooked` is whether a `PreToolUse` line holds `picket-probe-bang` and `tool` is the `tool_name` of the `picket-probe-ok` line. Until then the committed record's block reads `{ "auto_dialog": null, "bang_hooked": null, "tool": null, "invalid": "<date and why>" }`; `cells` stay as recorded, since every headless cell shows `hook_permission_mode` and so did reach the hook. `ASKING_MODES` is not changed here: `test/hooks/handlers.test.mjs:601` keeps `auto` out while `auto_dialog` is not `shown`, and an invalid block is not `shown`.
**Instead of:** keeping both answers as the user's word: that is how a hook that never ran produced "silent" and "unhooked"; reading the hook log turns the bang answer and the tool into facts code checks.

## Scope

**In:**
- The probe's matcher, hook log `tool`, bang sentinel, a confirm that checks the hook log, and an invalid mark on the record.
- A PowerShell reading in the guard that denies destructive commands and source writes, logs every decision with its tool, and never allows.
- PowerShell escalation, saved-rule detection for `PowerShell` rules, and observe.drive for PowerShell drives and escalations.

**Out:**
- Changing `ASKING_MODES` or amending D-003 of `20261016-guard-escalation-through-native-ask-dialog` (OQ-002).
- Auto-allowing read-only PowerShell commands.
- Reading through `cmd /c`, `Invoke-Expression`, `Start-Process`, or roots built from strings (they fall through).
- `picket preflight` reporting `PowerShell` saved rules.
- Re-running the headless probe cells.
- The hooks README table (OQ-003).

## Phase 1: The probe sees PowerShell and the record waits for a re-run

**Touch set:**
- `bench/probe-ask.mjs`: matcher, steps, confirm from log
- `bench/lib/ask-probe-hook.mjs`: log the tool name
- `bench/results/ask-probe.json`: mark the interactive block invalid
- `bench/test/probe-ask.test.mjs`: tests for matcher, log, confirm
- `test/hooks/handlers.test.mjs`: read only; ASKING_MODES test stays green

**Changes:**
- `probeSettings(logPath)`: the one hook entry carries `matcher: "Bash|PowerShell"` for `PreToolUse`, `PostToolUse` and `PostToolUseFailure`.
- `logLine(input)`: adds `tool: input?.tool_name ?? null`. `answer` is unchanged.
- `interactive()`: step 1 asks the session to run `echo picket-probe-ok` and notes shown or silent; step 2 types `! echo picket-probe-bang`; step 3 runs `node bench/probe-ask.mjs --confirm auto=shown|silent`.
- A pure `interactiveAnswers(hookLines, args)` returns `{ auto_dialog, bang_hooked, tool }` per D-004 or throws when no `PreToolUse` line holds `picket-probe-ok`. `parseConfirm` accepts only `auto=` and rejects any other key. `confirm` reads the hook log through `readJsonLines`, writes through `withInteractive`, and untrusts and removes the scratch project only after a successful write.
- `bench/results/ask-probe.json`: replace `interactive` with the invalid block from D-004. The `invalid` text names the date, the Bash-only matcher, and that every interactive session ran the sentinel through PowerShell.

**Done when:**
- **T-1.1** A test asserts `probeSettings(log)` gives `PreToolUse`, `PostToolUse` and `PostToolUseFailure` each one entry with matcher `Bash|PowerShell`.
- **T-1.2** A test asserts `logLine` on a PowerShell `PreToolUse` event returns `tool: "PowerShell"`, and `logLine(null)` returns `tool: null`.
- **T-1.3** A test asserts `interactiveAnswers` returns `{ auto_dialog: "shown", bang_hooked: false, tool: "PowerShell" }` for a log with a PowerShell `PreToolUse` line for `picket-probe-ok` and none for `picket-probe-bang`, returns `bang_hooked: true` when that line exists, and throws naming `picket-probe-ok` for a log without it; `parseConfirm(["bang=hooked"])` throws.
- **T-1.4** A test reads `bench/results/ask-probe.json` and asserts that `interactive` either carries a non-empty `invalid` with `auto_dialog` and `bang_hooked` null, or carries no `invalid` and a `tool` of `Bash` or `PowerShell`; the 8 `cells` are byte-equal to the committed ones.
- **T-1.5** Driven: after `node bench/probe-ask.mjs --interactive`, `<tmp>/picket-ask-probe-interactive/.claude/settings.json` shows matcher `Bash|PowerShell`, and `node bench/probe-ask.mjs --confirm auto=shown` with no hook log exits 1 with a message naming `picket-probe-ok`, the record's sha256 unchanged and the scratch directory still present.
- **T-1.6** `npm test` passes, the `ASKING_MODES` test at `test/hooks/handlers.test.mjs:601` included, with no edit to that file.
- **T-1.7** User, at the phase 1 gate: the user runs `node bench/probe-ask.mjs --interactive`, follows the three steps, and `--confirm` succeeds; then `node -e "const i=require('./bench/results/ask-probe.json').interactive;process.exit(i.tool&&!i.invalid&&i.bang_hooked!==null?0:1)"` exits 0, and the lead stages the record before routing approval. No agent runs this step.

## Phase 2: The guard denies destructive PowerShell commands

**Touch set:**
- `core/hooks/hooks.json`: guard matcher becomes Bash|PowerShell
- `core/lib/powershell-text.mjs`: new reader per D-002
- `core/lib/hooks/guard.bash.mjs`: dispatch, evaluatePowerShell, tables, trace tool
- `core/lib/kernel-call.mjs`: read only; normalizeRoot stays
- `test/hooks/powershell-text.test.mjs`: new reader tests
- `test/hooks/handlers.test.mjs`: guard decisions under PowerShell
- `test/hooks/hooks.test.mjs`: guard registration test

**Changes:**
- `hooks.json`: the PreToolUse entry for `guard.bash.mjs` takes `"matcher": "Bash|PowerShell"`, kept on one line as today. The `Write|Edit` entry is unchanged.
- `core/lib/powershell-text.mjs`: `readPowerShell(text)` and the alias table per D-002. No marker folding yet.
- `guard.bash.mjs`: `guardBash` dispatches on `tool_name` (D-001); `evaluatePowerShell(command, ctx)` per D-002; the shared per-segment function extracted from `evaluateCommand` with no change in Bash decisions; `DENY_ROOTS` and `SOURCE_READERS` additions; `trace(root, rawCommand, outcome, tool)` writes `{ ts, outcome, tool, cwd, command }`.
- The PowerShell deny reason names the destructive sub-command class and the user route `! <command>`, and does not offer the bash marker form.

**Done when:**
- **T-2.1** Reader tests: `Remove-Item -Recurse -Force build; git status` gives `[["Remove-Item","-Recurse","-Force","build"],["git","status"]]`; `echo 'a; rm b'` gives one segment; `& 'git' push` gives `[["git","push"]]`; `RM x`, `del x`, `rd x`, `ri x` each root at `Remove-Item`; `git status && git push` gives two segments; `Get-ChildItem | ForEach-Object { Remove-Item $_ }` has a segment rooted at `Remove-Item`; `echo "x` returns `null`.
- **T-2.2** One table test runs `git push origin trunk`, `git reset --hard`, `rm -rf build` and `git -C sub push` with `tool_name` Bash and PowerShell, and each returns `deny` under both.
- **T-2.3** With `tool_name: "PowerShell"`, each of `Remove-Item -Recurse -Force build`, `del build`, `rd /s build`, `Get-ChildItem; git push`, `& git push`, `Stop-Process -Name node` and `Get-ChildItem | ForEach-Object { Remove-Item $_ }` returns `deny`, and `Remove-Item -Recurse -Force '.worktrees/feat'` returns no decision.
- **T-2.4** With `tool_name: "PowerShell"`, `Get-ChildItem`, `git status` and `picket state x` return no decision while the same commands with `tool_name: "Bash"` still return `allow`; every existing guard test passes unchanged.
- **T-2.5** With a declared source, `Set-Content <source>/a.md x` under PowerShell denies with the source reason, and `Get-Content <source>/a.md` does not deny.
- **T-2.6** A test asserts the PreToolUse entry for `guard.bash.mjs` in `core/hooks/hooks.json` has matcher `Bash|PowerShell`.
- **T-2.7** Driven: piping `{"hook_event_name":"PreToolUse","tool_name":"PowerShell","tool_input":{"command":"Remove-Item -Recurse -Force build"},"cwd":"<repo>"}` into `node core/hooks/guard.bash.mjs` prints `"permissionDecision":"deny"`, and the last row of `.picket/state/guard.log` has `"tool":"PowerShell"` and `"outcome":"deny"`.

## Phase 3: PowerShell escalation and drives reach the ledger

**Touch set:**
- `core/hooks/hooks.json`: observe.drive matchers become Bash|PowerShell
- `core/lib/powershell-text.mjs`: fold the marker statement
- `core/lib/escalation.mjs`: withoutMarker strips the PowerShell form
- `core/lib/saved-rules.mjs`: PowerShell rules per D-003
- `core/lib/hooks/guard.bash.mjs`: escalation judgement for PowerShell
- `core/lib/hooks/observe.drive.mjs`: segments from readPowerShell
- `core/lib/preflight.mjs`: read only; call stays Bash
- `core/lib/drive-evidence.mjs`: read only; already reads PS cmdlets
- `test/hooks/powershell-text.test.mjs`: folding tests
- `test/hooks/handlers.test.mjs`: PowerShell escalation tests
- `test/hooks/hooks.test.mjs`: observe.drive registration and ran rows
- `test/kernel/saved-rules.test.mjs`: PowerShell rule detection

**Changes:**
- `hooks.json`: the PostToolUse and PostToolUseFailure entries for `observe.drive.mjs` take `"matcher": "Bash|PowerShell"`.
- `readPowerShell` folds the marker statement per D-003.
- `escalation.mjs`: `LEADING_MARKER` (or a second pattern beside it) also strips `$env:PICKET_ESCALATE = '<why>';` and its double-quoted form at the start of the text.
- `saved-rules.mjs`: the tool-aware `escalationAllowRules` and an exported `couldMatchPowerShellEscalation(rule, command)` per D-003.
- `guard.bash.mjs`: `evaluatePowerShell` calls `judgeEscalation` at depth 0 when a segment carries the marker, passing the reader's flags and `tool` so the saved-rule check reads `PowerShell` rules; the PowerShell deny hint names `$env:PICKET_ESCALATE = "<why>"; <command>`.
- `observe.drive.mjs`: for `tool_name: "PowerShell"`, `commandSegments` comes from `readPowerShell(command)?.segments ?? []`, so `isKernelCall` and `escalationReason` read PowerShell text. Drive-log rows keep their shape.

**Done when:**
- **T-3.1** A reader test: `$env:PICKET_ESCALATE = "you asked for the tag"; git push origin v1` gives `[["PICKET_ESCALATE=you asked for the tag","git","push","origin","v1"]]`; the same statement after another command, or before two commands, is not folded.
- **T-3.2** A test asserts `commandKey("$env:PICKET_ESCALATE='a'; git push")`, `commandKey('$env:PICKET_ESCALATE="b"; git push')` and `commandKey("git push")` are equal.
- **T-3.3** With `tool_name: "PowerShell"` the marked `git push` returns `ask` in `default` and `acceptEdits`, `deny` with ledger `why: "mode"` in `auto`, and a second identical ask in one session with no `ran` row denies with `why: "refused_before"`.
- **T-3.4** Saved-rule tests: for `tool: "PowerShell"` and command `git push`, `PowerShell`, `PowerShell(*)`, `PowerShell(git *)` and `PowerShell($env:PICKET_ESCALATE*)` are flagged, `PowerShell(picket *)` and `Bash(git *)` are not; every existing Bash case keeps its result.
- **T-3.5** A test asserts both observe.drive entries in `hooks.json` have matcher `Bash|PowerShell`; a PowerShell `PostToolUse` for the marked command appends a `ran` row whose `key` equals the guard's `ask` row key; a `PostToolUseFailure` appends `ran` with `why: "failed"` and no drive-log row; `picket state x` through PowerShell logs `kind: "inspect"`.
- **T-3.6** A PowerShell deny reason contains `$env:PICKET_ESCALATE`, and the Bash deny reason is byte-equal to before.
- **T-3.7** Driven: piping the PowerShell PreToolUse event for the marked `git push` with `permission_mode: "default"` into `node core/hooks/guard.bash.mjs` prints `"permissionDecision":"ask"`, and piping the matching PostToolUse event into `node core/hooks/observe.drive.mjs` appends a `ran` row with the same `key` to `.picket/state/ledger.jsonl`.

## Open questions

- **OQ-001** Does a `!` command pass through PreToolUse hooks on this host, and through which tool? Phase 1's re-run records it as `bang_hooked`. Owner: user, at the phase 1 gate. Fallback: phase 2 starts only on a valid record; if `bang_hooked` is `true`, the guard would deny the user's own `! <command>` route under the new matcher, so the lead raises drift on D-001 before phase 2 instead of shipping it.
- **OQ-002** Should `auto` join `ASKING_MODES`? That is an amendment to D-003 of `20261016-guard-escalation-through-native-ask-dialog`, decided on the re-run's `auto_dialog` and outside this order. Owner: user decides, lead routes the amendment. Fallback: `ASKING_MODES` stays `{default, acceptEdits}`, so an escalation in `auto` denies with `why: "mode"`.
- **OQ-003** `core/hooks/README.md` lists both hooks as Bash only. Doc text is not phase scope. Owner: lead, through `picket:documenting` or a follow-up item. Fallback: the table stays stale until then.

## Revision log
