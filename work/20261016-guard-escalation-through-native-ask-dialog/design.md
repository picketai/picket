---
kind: design
lane: design
title: Guard escalation through native ask dialog
date: 2026-10-16
audience: developer
sources: [request.md, core/lib/hooks/guard.bash.mjs, core/lib/hooks/guard.scope.mjs, core/lib/hooks/observe.drive.mjs, core/lib/hooks/emit.ledger.mjs, core/hooks/hooks.json, core/lib/kernel-call.mjs, core/lib/cost.mjs, core/lib/close.mjs, core/lib/preflight.mjs, core/lib/paths.mjs, core/lib/unsafe.mjs, core/lib/drive-evidence.mjs, core/bin/picket.mjs, core/skills/inspecting/SKILL.md, core/skills/designing/SKILL.md, core/skills/ordering/SKILL.md, core/skills/researching/SKILL.md, core/skills/expediting/steps/30-check.md, .claude/settings.json, bench/lib/claude.mjs, bench/lib/approver-mcp.mjs, bench/lib/trust.mjs, scripts/test.mjs, test/hooks/handlers.test.mjs, .worktrees/framework/work/20261008-why-permission-prompts-rose-on-the-plugin/research.md, claude --help 2.1.301]
phases:
  - n: 1
    files: [core/lib/hooks/guard.bash.mjs, test/hooks/handlers.test.mjs, bench/probe-ask.mjs, bench/lib/ask-probe-hook.mjs, bench/lib/claude.mjs, bench/test/claude.test.mjs, bench/results/ask-probe.json]
    greps:
      - path: test/hooks/handlers.test.mjs
        pattern: "FOO=1 rm -rf src"
      - path: bench/lib/claude.mjs
        pattern: "--setting-sources"
      - path: bench/results/ask-probe.json
        pattern: "\"hook_permission_mode\""
      - path: bench/results/ask-probe.json
        pattern: "\"claude_version\""
    tests: true
    drive: true
    security: true
  - n: 2
    files: [core/lib/escalation.mjs, core/lib/saved-rules.mjs, core/lib/hooks/guard.bash.mjs, core/lib/hooks/observe.drive.mjs, core/lib/preflight.mjs, test/hooks/handlers.test.mjs, test/kernel/saved-rules.test.mjs, test/kernel/preflight.test.mjs]
    greps:
      - path: core/lib/escalation.mjs
        pattern: "ASKING_MODES"
      - path: core/lib/hooks/guard.bash.mjs
        pattern: "PICKET_ESCALATE"
      - path: core/lib/saved-rules.mjs
        pattern: 'settings\.local\.json'
      - path: core/lib/preflight.mjs
        pattern: "saved_rules"
    tests: true
    drive: true
    security: true
  - n: 3
    files: [core/lib/hooks/observe.drive.mjs, core/lib/escalation.mjs, core/lib/hooks/guard.bash.mjs, core/lib/cost.mjs, core/bin/picket.mjs, core/skills/inspecting/SKILL.md, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/kernel/cost.test.mjs]
    greps:
      - path: test/hooks/handlers.test.mjs
        pattern: "refused_before"
      - path: core/lib/cost.mjs
        pattern: "not_run"
      - path: core/skills/inspecting/SKILL.md
        pattern: "Escalations:"
    tests: true
    drive: true
    security: true
  - n: 4
    files: [core/lib/leave.mjs, core/bin/picket.mjs, core/lib/close.mjs, core/lib/hooks/guard.bash.mjs, core/lib/hooks/guard.scope.mjs, core/skills/designing/SKILL.md, core/skills/ordering/SKILL.md, core/skills/researching/SKILL.md, core/skills/expediting/steps/30-check.md, test/kernel/close.test.mjs, test/kernel/cli.test.mjs, test/hooks/handlers.test.mjs]
    greps:
      - path: core/bin/picket.mjs
        pattern: 'case "leave"'
      - path: core/lib/hooks/guard.scope.mjs
        pattern: 'left.{1,2}jsonl'
      - path: core/skills/designing/SKILL.md
        pattern: "Left for you:"
      - path: core/skills/ordering/SKILL.md
        pattern: "Left for you:"
      - path: core/skills/researching/SKILL.md
        pattern: "Left for you:"
    tests: true
    drive: true
    security: true
  - n: 5
    files: [core/hooks/hooks.json, core/lib/hooks/observe.drive.mjs, test/hooks/hooks.test.mjs]
    greps:
      - path: core/hooks/hooks.json
        pattern: '"PostToolUseFailure"'
      - path: core/lib/hooks/observe.drive.mjs
        pattern: "PostToolUseFailure"
      - path: test/hooks/hooks.test.mjs
        pattern: "PostToolUseFailure"
    tests: true
    drive: true
    security: true
---
# Design: Guard escalation through native ask dialog

## Problem

`guard.bash` denies the destructive class outright (`core/lib/hooks/guard.bash.mjs:1100`), so a push the user asked for is a dead end with no route to the user. The request wants a marker, `PICKET_ESCALATE="<reason>" <command>`, that turns that deny into a native `ask` dialog while deny stays the default, the marker never yields `allow`, no approval carries over, source writes and wrapped picket verbs stay denied, a refused command cannot be escalated twice, and every escalation is logged and visible. Two Claude Code behaviours cannot be read from this repo (a hook `ask` under auto mode, a hook `ask` against a saved allow rule), so they are settled by a real run before any phase rests on them. One finding widens the work: today any leading assignment hides a destructive command from the guard (`FOO=1 git push origin v1` and `FOO=1 rm -rf src` fall through, guard.log `fallthrough:unknown-segments:[unknown]`, verified in a scratch root), and the marker is exactly such an assignment.

## Decisions

### D-001: Marker grammar and the escalatable class

**Decision:** An escalation is a Bash command that is exactly one segment `PICKET_ESCALATE=<reason> <command>`: the marker is the only leading assignment, the reason is a literal of 1 to 200 characters (no newline, no `$`, no backtick), and `<command>` alone classifies `deny` under today's rules. Only such a command may get `ask`. A marker on a command that does not deny changes nothing: the command is judged as it would be without the marker, except that it never gets `allow` (it falls through). A marker in a compound command, beside a second assignment, or with a non-literal reason denies with "escalate one command, alone". The source deny (`guard.bash.mjs:1061`, `:1097`) and the wrapped-picket-verb deny (`:1085`) run before the marker is read and are unchanged, so the marker never reaches them. The escalatable class is whatever `classifySegment` returns `deny` for: `DENY_ROOTS` (rm, sudo, chmod, kill and the rest), `DENY_GIT_SUBCOMMANDS` (push, reset, rebase, checkout, merge, clean), `git branch -d/-m`, `git config` writes, the npm publish family, `dotnet nuget push/delete`. `git commit` is not in it: `checkGit` returns `unknown` for it (`git commit -m x` falls through, verified), `.claude/settings.json` allows `Bash(git commit *)`, and the guard denies a commit only inside a source, where the marker has no effect. Infrastructural decision.
**Instead of:** a kernel verb `picket escalate -- <command>`: the guard denies a destructive command wrapped in a picket verb by rule, and the dialog would show the picket call, not the command the user approves.
**Risks:**
- **RISK-001** The model writes a misleading reason. Mitigation: the dialog shows the full command beside the reason, and the reason is logged (D-004) for picket:inspecting.
- **RISK-002** Quotes inside the reason tokenize unexpectedly. Mitigation: tests cover single quotes, double quotes and escaped quotes; a reason carrying a variable mark or substitution denies.

### D-002: Assignment prefixes never improve a segment's class

**Decision:** `evaluateCommand` splits a segment's leading `NAME=value` tokens from the command they prefix. The command part is classified as today. When it is `deny`, the segment is `deny`; otherwise the segment is `unknown`, whatever the command part says. Segments made only of assignments keep `classifyAssignment`. Kernel calls are untouched: `kernelVerbStart` already skips assignments (`core/lib/kernel-call.mjs:13`). Infrastructural decision.
**Instead of:** classifying the command part on its own merits, so `FOO=1 git status` would allow: an assignment such as `GIT_EXTERNAL_DIFF=` or `NODE_OPTIONS=--require` changes what a safe-looking tool runs; never widening costs only prompts that exist today.
**Risks:**
- **RISK-003** A skill that runs an env-prefixed destructive command now hits a deny. Mitigation: no skill step does (they call `picket` verbs, unaffected); the deny reason names the marker route from phase 2 on.

### D-003: Ask only where the dialog is proven

**Decision:** The guard answers `ask` for a valid escalation only when both hold. (a) The hook input's `permission_mode` is in `ASKING_MODES`, a constant set filled by hand from phase 1's probe record with the modes in which a hook `ask` reached the prompt tool; a missing or unlisted mode denies. (b) No saved allow rule could match the marked command: `core/lib/saved-rules.mjs` reads `permissions.allow` from `~/.claude/settings.json`, `<root>/.claude/settings.json` and `<root>/.claude/settings.local.json` and flags `Bash`, `Bash(*)`, any pattern that starts with a wildcard, and any pattern containing `PICKET_ESCALATE`. Per the permissions docs, an allow rule does not match past an assignment of a variable that is not known-safe (`.worktrees/framework/work/20261008-why-permission-prompts-rose-on-the-plugin/research.md` R-011), so no other rule can pre-empt the marked form. Otherwise the guard denies, and the reason names the mode or the rule and its file, plus the user's own route (`! <command>`, subject to OQ-001's interactive check). Check (b) runs whatever OQ-002 finds, so a "Yes, don't ask again" click never approves a later escalation. Infrastructural decision.
**Instead of:** trusting Claude Code to show the dialog in every mode: `bypassPermissions` skips prompts by name, and auto mode, the user's working mode, is unverified.
**Risks:**
- **RISK-004** Rules from `--allowedTools` or managed settings are invisible to a hook. Mitigation: stated limit; the probe's `ask+rule` cell shows whether a hook `ask` survives a matching allow rule at all.
- **RISK-005** Auto mode proves silent, so escalation never asks in the user's usual mode. Mitigation: the deny then carries the exact `!` command, still better than today's dead end.

### D-004: Escalation rows in the ledger

**Decision:** Every marked command the guard judges appends one row to `.picket/state/ledger.jsonl`: `{ v: 2, ts, session, event: "escalation", outcome: "ask" | "denied", why, key, command, reason, agent, work_id }`. `why` is null for `ask` and one of `shape`, `mode`, `saved_rule`, `refused_before` for `denied`; `key` is D-005's command key; `command` and `reason` pass `maskEnvValues` and are cut to 300 characters; `work_id` is the open item as observe.drive computes it. observe.drive (PostToolUse on Bash) appends the same shape with `outcome: "ran"` for a marked command. `picket cost` counts turns over `stop`, `subagent_stop` and `gate` rows only and returns `escalations: { asked, ran, not_run, denied, recent }`, `recent` being the last five rows; picket:inspecting renders it. Infrastructural decision.
**Instead of:** a separate `escalations.jsonl`: the request names the ledger, and one file keeps the inspecting read and the refusal join together; the price is that cost must filter by event.
**Risks:**
- **RISK-006** Escalation rows inflate the turn count. Mitigation: `summarize` filters by event, tested with mixed rows.
- **RISK-007** Reading the ledger (664 KB here today) slows the hook. Mitigation: only a marked command reads it; the cold-start budget test covers the hook.

### D-005 (r2): "Not run" inference and the second escalation

**Decision:** The command key is the sha256 of the command with the marker assignment removed and whitespace collapsed, so the same command with a new reason has the same key. Before answering `ask`, the guard finds the latest earlier `ask` row with the same session and key; when no `ran` row with that session and key follows it, the guard denies with `why: "refused_before"` and the `!` route. Each `ask` is fresh: an earlier `ran` row never allows anything. The scope is one session; a new session starts clean. An approved command that exits non-zero fires `PostToolUseFailure`, not `PostToolUse` (probe cell `ask+fail` in `bench/results/ask-probe.json`: `post_events: ["PostToolUseFailure"]`). observe.drive is registered for that event on Bash and appends the `ran` row with `why: "failed"`, so `notRunBefore` and the cost counts need no change. For a failure event it writes no drive-log row, so a failed command never counts as drive evidence. The limit, stated in the deny reason and in picket:inspecting as `not run`, never `refused`: a PreToolUse hook never sees the dialog's answer, so refusal is inferred. An interrupt reads as refused, and two identical escalations in one parallel batch deny the second. Both err toward deny.
**Instead of:** joining on `tool_use_id`: exact for parallel batches, but the field is unverified and the key join answers the same for sequential calls. The model reporting the refusal lost outright: it can forge it.
**Risks:**
- **RISK-008** A push the user approved but the remote rejected cannot be escalated again this session. Mitigation: the `PostToolUseFailure` wiring records it as `ran` with `why: "failed"`, so the next escalation asks fresh (phase 5).

### D-006: Housekeeping is recorded, never escalated

**Decision:** A new verb `picket leave <id> --command "<command>" [--why "<text>"]` appends `{ ts, command, why }` to `work/<id>/left.jsonl`, a kernel-owned file of the work item aggregate (added to `KERNEL_OWNED` in `guard.scope.mjs:7`); `leave` joins `KERNEL_OTHER_VERBS`. `picket close` returns `left: [...]`, its human render prints one `left for you: <command>` line each, and the four lanes' closing blocks carry a `Left for you:` line. The destructive deny reason states the rule at the point of need: escalate only when the user asked for this action in this session or the work cannot continue without it; cleanup after the work goes to `picket leave`.
**Instead of:** the guard recording every denied command as left for you: it cannot tell cleanup from an exploratory command the model then replaced, so the list would fill with noise.
**Risks:**
- **RISK-009** The model escalates cleanup anyway. Mitigation: the user sees the reason in the dialog and refuses; D-005 then denies a retry.

### D-007: The saved-rule flag lives in preflight

**Decision:** `picket doctor` does not exist (no `doctor` anywhere under `core/`). Preflight, which every lane runs at entry, gains a `saved_rules` check that warns with each rule and file D-003's predicate matches, through the same `core/lib/saved-rules.mjs` function the guard calls. Infrastructural decision.
**Instead of:** a new `picket doctor` verb: a project-level check list that repeats half of preflight and adds an entry to the guard's verb sets, while preflight already prints warns at every lane entry.
**Risks:**
- **RISK-010** The user expects the name `picket doctor`. Mitigation: OQ-004.

### D-008: Settle Claude Code's behaviour with a probe first

**Decision:** Phase 1 adds `bench/probe-ask.mjs`. Per cell it builds a scratch project outside the repo, trusts it, and runs `claude -p` (haiku, at most 2 turns, at most $0.05) with a probe hook that logs every hook event's input and answers `ask` on a sentinel command, and with the bench approver as `--permission-prompt-tool`, so "the prompt tool was called" stands for "the dialog was shown". Settings sources are `project,local` and MCP is strict, so the user's own plugins and rules stay out. `--interactive` prints the manual steps and `--confirm` records the two facts headless mode cannot show: whether interactive auto mode shows the dialog, and whether a `!` command passes through PreToolUse hooks. The record is `bench/results/ask-probe.json`; phase 2 copies `ASKING_MODES` from it by hand, never reads it at runtime. Infrastructural decision.
**Instead of:** reading Claude Code's docs and source: the binary is compiled and the docs state neither the auto-mode nor the saved-rule precedence; a real run is the only evidence.
**Risks:**
- **RISK-011** Headless prompt-tool routing differs from the interactive dialog. Mitigation: the interactive confirm covers auto mode; manual mode is checked live at the phase 2 gate.
- **RISK-012** The probe spends quota. Mitigation: 8 cells on haiku, each capped at $0.05.

## Scope

**In:**
- the assignment-prefix gap in `guard.bash` (D-002)
- the marker, its `ask`, its denies, and the ledger rows (D-001, D-003, D-004, D-005)
- `picket leave`, the close listing and the lanes' closing blocks (D-006)
- the preflight `saved_rules` check and the probe (D-007, D-008)

**Out:**
- notification hooks while a dialog is open; custom mod buttons (rejected: the model could forge the grant)
- meta roots (`env FOO=1 git push`, `nohup`, `sh -c`) still fall through as today
- rules from `--allowedTools` or managed settings; refusal memory across sessions
- a `picket doctor` verb (OQ-004)

## Phase 1: Close the prefix gap and probe Claude Code

**Touch set:**
- `core/lib/hooks/guard.bash.mjs`: split leading assignments in the segment loop (`:1059`)
- `test/hooks/handlers.test.mjs`: prefix cases next to the `FOO=1 picket drive` case (`:557`)
- `bench/probe-ask.mjs`: new; probe runner and record writer
- `bench/lib/ask-probe-hook.mjs`: new; logs hook input, asks on the sentinel
- `bench/lib/claude.mjs`: `settingSources` option on `runClaude`
- `bench/test/claude.test.mjs`: the new flag [INFERRED test shape]
- `bench/lib/trust.mjs`: read; trust and untrust the scratch project
- `bench/lib/approver-mcp.mjs`: read; reused as the prompt tool
- `bench/results/ask-probe.json`: new; the probe record

**Changes:**
- `evaluateCommand` classifies each segment through D-002: leading `NAME=value` tokens are split off, the rest goes to `classifySegment`, and the segment becomes `deny` when the rest denies and `unknown` otherwise. Pure assignment segments and kernel calls behave as today. No marker handling yet: `PICKET_ESCALATE=... git push` denies like any other prefix.
- `runClaude` accepts `settingSources` (a string) and passes `--setting-sources <value>`.
- `bench/probe-ask.mjs` runs 8 cells, each a fresh scratch directory under the OS temp dir with `.claude/settings.json` wiring `bench/lib/ask-probe-hook.mjs` for `PreToolUse`, `PostToolUse` and `PostToolUseFailure` on Bash:
  - `manual`, `acceptEdits`, `auto`, `bypassPermissions`, `dontAsk`: scenario `ask` (sentinel `echo picket-probe-ok`, no rule)
  - `manual`, `auto`: scenario `ask+rule` (`.claude/settings.local.json` allows `Bash(echo picket-probe-ok)`)
  - `manual`: scenario `ask+fail` (sentinel `ls picket-probe-missing`, which exits non-zero)
- The hook appends `{ event, permission_mode, has_tool_use_id, command }` per call to a log in the cell directory and answers `ask` with a fixed reason when the command contains `picket-probe`. The approver logs each call and allows.
- Record shape: `{ claude_version, ran_at, cells: [{ mode, scenario, hook_permission_mode, prompt_tool_called, command_ran, post_events, has_tool_use_id, error }], interactive: { auto_dialog: "shown" | "silent" | null, bang_hooked: true | false | null } }`. A cell that cannot start records `error` and the run continues.
- `--interactive` builds one scratch project and prints the two manual steps (start `claude --permission-mode auto` there and ask for the sentinel; type `! echo picket-probe-ok` and see whether the hook log gains a line). `--confirm auto=shown|silent bang=hooked|unhooked` writes `interactive` into the existing record.
- Each run untrusts its scratch directories when it ends.

**Done when:**
- **T-1.1** `guardBash` returns `deny` for `FOO=1 git push origin v1`, `FOO=1 rm -rf src` and `PICKET_ESCALATE="x" git push origin v1`.
- **T-1.2** `FOO=1 git status` and `PATH=/x ls` fall through (no decision), never `allow`; `FOO=1 picket drive --run "rm -rf src"` still denies.
- **T-1.3** `node bench/probe-ask.mjs` writes `bench/results/ask-probe.json` with `claude_version` and 8 cells, each with `hook_permission_mode`, `prompt_tool_called`, `command_ran` and `post_events` filled or an `error`.
- **T-1.4** The probe passes `--setting-sources project,local` and `--strict-mcp-config` on every run, and `~/.claude.json` holds no probe directory after it ends.
- **T-1.5** `node bench/probe-ask.mjs --confirm auto=shown bang=unhooked` (with the user's real answers) sets `interactive.auto_dialog` and `interactive.bang_hooked` without touching `cells`.
- **T-1.6** `npm test` passes.

## Phase 2: The marker asks, where the dialog is proven

**Touch set:**
- `core/lib/escalation.mjs`: new; marker parse, command key, ledger row append
- `core/lib/saved-rules.mjs`: new; allow rules that could match a marked command
- `core/lib/hooks/guard.bash.mjs`: marker branch before the destructive deny (`:1100`), `ask` in `outcomes`
- `core/lib/hooks/observe.drive.mjs`: export `openWorkItem` for the guard's `work_id`
- `core/lib/preflight.mjs`: `saved_rules` check after `legacy_paths`
- `test/hooks/handlers.test.mjs`: marker cases
- `test/kernel/saved-rules.test.mjs`: new; rule predicate
- `test/kernel/preflight.test.mjs`: the warn
- `bench/results/ask-probe.json`: read; source of `ASKING_MODES`

**Changes:**
- `core/lib/escalation.mjs` exports `escalationMarker(segment)` returning `{ reason, command } | { invalid: "<why>" } | null`, `commandKey(command)` (D-005), and `recordEscalation(root, row)` that appends D-004's row to the ledger. It exports `ASKING_MODES`, copied by hand from the probe record: every mode whose `ask` cell has `prompt_tool_called: true`, with `auto` only when `interactive.auto_dialog` is `shown`.
- `core/lib/saved-rules.mjs` exports `escalationAllowRules({ root, home })` returning `[{ rule, file }]` for D-003 (b), reading the three settings files and ignoring a missing or unparsable one.
- `guardBash(input, { root, home = os.homedir() })`. In `evaluateCommand`, after the source and wrapped-verb checks and before `classifications.includes("deny")`: when the command is one segment that carries the marker, judge it by D-001 and D-003 in this order: shape, then `deny` class, then mode, then saved rule. Return `ask` or `deny` and record the row. The marker never reaches the `allow` return: a marked command that does not deny falls through.
- The `ask` reason reads `guard.bash: escalation by <agent or main>: "<reason>". Approving runs this one command once; nothing carries over.` Each deny reason names its cause and ends with `run it yourself: ! <command>`.
- The plain destructive deny reason gains one sentence: if the user asked for this action in this session or the work cannot continue without it, run it alone as `PICKET_ESCALATE="<why>" <command>` and the user decides in the dialog.
- `outcomes().decide` passes `ask` through; the trailing `// "allow" | "deny"` comment at `:156` is now stale and is deleted, never reworded.
- Preflight adds `saved_rules`: `ok` with `none`, or `warn` with `<rule> in <file>` for each match.

**Done when:**
- **T-2.1** With `permission_mode` in `ASKING_MODES`, `PICKET_ESCALATE="you asked me to push the release tag" git push origin v1.0.0-alpha.2` gets `permissionDecision: "ask"`, and the reason contains the quoted reason.
- **T-2.2** No marked command gets `allow` in any mode; with `permission_mode` absent or unlisted the push above denies with a reason ending `! git push origin v1.0.0-alpha.2`.
- **T-2.3** These deny with the shape cause: `PICKET_ESCALATE=x git push && ls`, `FOO=1 PICKET_ESCALATE=x git push`, `PICKET_ESCALATE="$HOME" git push`, `PICKET_ESCALATE= git push`. `PICKET_ESCALATE=x ls` falls through.
- **T-2.4** A marked command acting inside a source gets the source deny text, and `PICKET_ESCALATE=x picket drive --run "rm -rf src"` gets the wrapped-verb deny text.
- **T-2.5** With `Bash(*)` or `Bash(PICKET_ESCALATE=*)` in a fixture `.claude/settings.local.json`, the escalation denies naming the rule and the file, and `picket preflight <id>` prints `warn saved_rules` with the same rule.
- **T-2.6** Each judged marked command appends exactly one ledger row with `event: "escalation"`, its `outcome` and `why`; an unmarked command appends none.
- **T-2.7** A test asserts `ASKING_MODES` equals the set derived from `bench/results/ask-probe.json`.
- **T-2.8** Piping a PreToolUse event for the push into `node core/hooks/guard.bash.mjs` prints the `ask` JSON; `npm test` passes.

## Phase 3: A refused command is not asked twice

**Touch set:**
- `core/lib/hooks/observe.drive.mjs`: append the `ran` row for a marked command
- `core/lib/escalation.mjs`: `notRunBefore(rows, session, key)`
- `core/lib/hooks/guard.bash.mjs`: the `refused_before` deny after the saved-rule check
- `core/lib/cost.mjs`: turn filter and `escalations` summary
- `core/bin/picket.mjs`: `cost` human render (`:218`)
- `core/skills/inspecting/SKILL.md`: the `Escalations:` line in step 2 and step 1
- `test/hooks/handlers.test.mjs`: the ask, ran, ask sequence
- `test/hooks/hooks.test.mjs`: observe.drive row through the hook entry
- `test/kernel/cost.test.mjs`: new; mixed rows

**Changes:**
- observe.drive calls `escalationMarker` on the command; for a marked one it appends D-004's row with `outcome: "ran"`, beside its drive-log row.
- `notRunBefore` reads the ledger's escalation rows for the session and key, takes the latest `ask`, and returns true when no `ran` row follows it. The guard calls it last, so a valid escalation is checked for shape, mode and saved rule first. A true result denies with `why: "refused_before"` and a reason saying the earlier ask for this command did not run (refused, interrupted or failed) and naming `! <command>`.
- `summarize` counts turns over `stop`, `subagent_stop` and `gate` rows only, and adds `escalations: { asked, ran, not_run, denied, recent }`, where `not_run` counts `ask` rows with no following `ran` row.
- `picket cost --human` appends ` · escalations <asked> asked, <ran> ran, <not_run> not run, <denied> denied`.
- picket:inspecting renders `Escalations: <counts>` and, when any exist, one line per `recent` row: `<outcome> <command> · "<reason>"`.

**Done when:**
- **T-3.1** After an `ask` row with no `ran` row in the same session, the same command with any reason denies with `why: "refused_before"` and a reason naming `! <command>`.
- **T-3.2** After `ask` then `ran`, the same command gets a fresh `ask`, never `allow`, and a second `ask` row.
- **T-3.3** The same command in another session gets `ask`.
- **T-3.4** Piping a PostToolUse event for a marked command into `node core/hooks/observe.drive.mjs` appends one `ran` row; an unmarked command appends none.
- **T-3.5** For a ledger of 2 `stop` rows and 3 escalation rows, `picket cost` reports 2 turns and the matching `escalations` counts.
- **T-3.6** `picket cost --human` prints the escalations segment, and `core/skills/inspecting/SKILL.md` contains the `Escalations:` render.
- **T-3.7** `npm test` passes.

## Phase 4: Housekeeping is left for the user

**Touch set:**
- `core/lib/leave.mjs`: new; `leave(id, root, { command, why })`, `readLeft(id, root)`
- `core/bin/picket.mjs`: the `leave` verb and the `Verbs:` list (`:327`)
- `core/lib/close.mjs`: `left` in the result
- `core/lib/hooks/guard.bash.mjs`: `leave` in `KERNEL_OTHER_VERBS` (`:422`), the leave sentence in the deny reason
- `core/lib/hooks/guard.scope.mjs`: `left.jsonl` in `KERNEL_OWNED` (`:7`)
- `core/skills/designing/SKILL.md`, `core/skills/ordering/SKILL.md`, `core/skills/researching/SKILL.md`: closing block line
- `core/skills/expediting/steps/30-check.md`: the `c` reply prints the left lines
- `test/kernel/close.test.mjs`, `test/kernel/cli.test.mjs`, `test/hooks/handlers.test.mjs`: verb, close, guard cases

**Changes:**
- `picket leave <id> --command "<command>" [--why "<text>"]` appends `{ ts, command, why }` to `work/<id>/left.jsonl`; it refuses (exit 1) an empty command, one over 300 characters, or an item that is done or abandoned.
- `close` returns `left: readLeft(id, root)`; the human render adds one `left for you: <command>` line per entry, `why` in parentheses when present.
- The three lane closing blocks gain `Left for you: <picket close's left lines; omit when there are none>`; expediting's `c` reply prints them after `committed <sha>`.
- The destructive deny reason adds: cleanup after the work is never escalated; record it with `picket leave <id> --command "<command>"` and it is listed when the item closes.

**Done when:**
- **T-4.1** `picket leave <id> --command "git worktree remove .worktrees/x" --why "cleanup"` appends one row to `work/<id>/left.jsonl`; an empty command and a done item exit 1.
- **T-4.2** `guardScope` denies a Write to `work/<id>/left.jsonl` as kernel-owned.
- **T-4.3** `picket close <id> --human` prints `left for you: git worktree remove .worktrees/x (cleanup)`; with no entries it prints no such line.
- **T-4.4** The destructive deny reason contains both `PICKET_ESCALATE` and `picket leave`.
- **T-4.5** `guardBash` does not deny `picket leave x --command "git push origin v1"`, and the verb-set test passes with `leave` in `KERNEL_OTHER_VERBS`.
- **T-4.6** The three lane SKILL.md closing blocks contain `Left for you:`; `npm test` passes, budgets included.

## Phase 5: A failed escalated command counts as ran

**Touch set:**
- `core/hooks/hooks.json`: `PostToolUseFailure` entry, Bash matcher, `observe.drive.mjs` (beside the `PostToolUse` entry at `:25`)
- `core/lib/hooks/observe.drive.mjs`: branch on `hook_event_name` (`:59` to `:77`)
- `test/hooks/hooks.test.mjs`: failure cases beside the ran-row test (`:657`)
- `core/lib/escalation.mjs`: read; `recordEscalation` already carries `why`, `ranAfter` (`:54`) needs no change

**Changes:**
- `hooks.json` gains `"PostToolUseFailure": [{ "matcher": "Bash", "hooks": [<the same observe.drive.mjs command entry as PostToolUse>] }]`.
- `observeDrive` reads `event.hook_event_name`. For `PostToolUseFailure` it skips the drive-log row and, for a marked command, appends the escalation row with `outcome: "ran"` and `why: "failed"`. For `PostToolUse` it behaves exactly as today.

**Done when:**
- **T-5.1** `core/hooks/hooks.json` registers `observe.drive.mjs` for `PostToolUseFailure` with matcher `Bash`, and a test asserts it.
- **T-5.2** Piping a `PostToolUseFailure` event for a marked command into `node core/hooks/observe.drive.mjs` appends one ledger row with `outcome: "ran"` and `why: "failed"`, and no drive-log row.
- **T-5.3** A `PostToolUseFailure` event for an unmarked command appends neither a ledger row nor a drive-log row.
- **T-5.4** After an `ask` row followed by that failed `ran` row, the same marked command gets a fresh `ask` from `guardBash`, not the `refused_before` deny.
- **T-5.5** `npm test` passes.

## Open questions

- **OQ-001** Does a hook `ask` reach the user in auto mode (headless cell plus the interactive confirm), does the hook input carry `permission_mode`, and does a `!` command pass through PreToolUse hooks? Owner: developer runs the probe in phase 1; the user answers the two interactive steps at the phase 1 gate. Fallback: `auto` stays out of `ASKING_MODES`, so an escalation in auto mode denies with the `!` route; a missing `permission_mode` denies; if `!` is hooked, the deny text says "run it in your own terminal" instead.
- **OQ-002** Does a hook `ask` override a saved allow rule that matches the command? Owner: developer (the `ask+rule` cells). Fallback: none needed for safety, because D-003 (b) denies whenever such a rule exists; the answer goes into the record and the preflight warn wording.
- **OQ-003** Does PostToolUse or PostToolUseFailure fire for a Bash command that exits non-zero? Answered by the `ask+fail` cell: only `PostToolUseFailure` fires. D-005 (r2) and phase 5 wire observe.drive to it.
- **OQ-004** `picket doctor` does not exist. Is the preflight `saved_rules` check enough, or does the user want a standalone verb? Owner: user. Fallback: preflight only (D-007).

## Revision log
- 2026-10-17: D-005 (r2): failed escalated commands record `ran` via PostToolUseFailure; new phase 5; OQ-003 answered by the probe, cumulative review F-1
