# Hooks

Registered in `hooks.json`, which Claude Code loads with the plugin. `guard.*` deny or bounce, `lint.*` and `monitor.*` feed text back, `observe.*` and `emit.*` record, `inject.*` add context. Every hook exits 0 on its own failure except where a deny is the point; a hook must start in under 200 ms cold (`test/budgets.test.mjs`).

| Hook | Event | Does |
|---|---|---|
| `inject.state.mjs` | SessionStart | open work items with their next action, plus `.claude/MEMORY.md` |
| `inject.rules.mjs` | SessionStart, SubagentStart | the five rules in `rules/`, joined, for the lead and every agent |
| `inject.extensions.mjs` | SessionStart, SubagentStart | each enabled extension's rules and its additions for the lead or the starting agent's role, in config order, within 10,000 characters; one line per refused extension |
| `guard.scope.mjs` | PreToolUse Write, Edit | denies writes to kernel-owned files (`work/*/state.yaml`, `phases/`, `verdicts.jsonl`, `comments.jsonl`, `waivers.jsonl`, `.picket/state/` except `branching.yaml`); denies an Edit on a file this transcript never read |
| `guard.comments.mjs` | PreToolUse Write, Edit | denies an edit that adds a comment line to a code file (detector in `lib/shared/comments.mjs`, doc comments included), unless `picket comment` recorded the user's approval for that path and text on an open or blocked item |
| `guard.silenced.mjs` | PreToolUse Write, Edit | denies an edit that adds a silenced check: a suppression in a code file, a skipped or focused test in a test file, or a coverage or warning threshold made weaker than before or than `quality` in the config (detector in `lib/shared/silenced.mjs`), unless `picket waive` recorded the user's approval for that path and line on an open or blocked item |
| `guard.bash.mjs` | PreToolUse Bash, PowerShell | the command evaluator kept from the earlier copy-in version: read-only commands allowed, destructive roots denied, compound and redirected commands prompt; a PowerShell command is read by `lib/hooks/powershell-text.mjs` and is only ever denied or passed on, never allowed; `picket waive` and `picket comment` from a spawned agent are denied, since they record the user's approval, also inside `eval`, `sh -c`, `xargs`, `env`, `timeout`, `command`, `exec`, `nice`, `Invoke-Expression`, `pwsh -c` and `cmd /c`; a shell write (`>`, `>>`, `>|`, `tee`, `sed -i`, `Set-Content` or `sc`, `Add-Content` or `ac`, `Out-File`), direct or inside one of those wrappers, from a spawned agent to a code or test file inside the project, outside `.picket/state/`, is denied, so `guard.comments` and `guard.silenced` see every code edit an agent makes; a command marked with `PICKET_ESCALATE` asks in the modes listed in `lib/shared/escalation.mjs` (default, acceptEdits, auto) |
| `lint.schema.mjs` | PostToolUse Write, Edit under `work/` | order and design artifacts: frontmatter, phase headings, decision ids, caps, placeholders, revision protocol against git HEAD |
| `observe.drive.mjs` | PostToolUse Bash, PowerShell | appends drive or inspect rows to `.picket/state/drive-log.jsonl` with the open work item and phase; `picket verify` reads them |
| `monitor.context.mjs` | PostToolUse Read, Grep, Glob, WebFetch, WebSearch | the stall detector: six look-around calls with no action get one line of context |
| `guard.block.mjs` | Stop, SubagentStop | a turn with a contract heading must end with an exact verdict token and stay within 40 lines |
| `route.verdict.mjs` | Stop, SubagentStop | applies the verdict to the work item with the kernel and hands back `picket next` as context |
| `emit.ledger.mjs` | Stop, SubagentStop | one v2 ledger row per turn (`bench/schema/ledger-v2.schema.json`) |
| `notify.user.mjs` | Notification permission_prompt, idle_prompt | an OS notification in a detached process (a Windows toast through powershell.exe, osascript, notify-send); `PICKET_NOTIFY=off` skips it |

Every hook, guards included, is a thin shell: it imports `runHook` from `src/lib/hooks/hook.mjs` and its handler from `src/lib/hooks/<kind>.<name>.mjs`. A handler takes `(event, { root })` and returns the object the hook prints, or `null`; `runHook` reads stdin, prints, swallows errors and exits 0.

Libraries: `src/lib/shared/transcript/transcript.mjs` (tail reads, spawn hints, tool statistics, read-before-edit lookup), `src/lib/shared/transcript/turn-block.mjs` and `src/lib/hooks/drive-evidence.mjs` (kept from the earlier copy-in version for their tested parsers), `src/lib/shared/sources/protection.mts` (what a source protects), `src/lib/hooks/powershell-text.mjs` (the PowerShell reader `guard.bash` uses for the PowerShell tool), and `src/lib/util/vendor/shell-quote-parse.mjs`, the tokenizer `guard.bash` uses for Bash.

At build time each shell is bundled with everything it imports into one file in `dist/hooks/`, so a hook opens one module, not one per import. Standalone, run the bundle: `node dist/hooks/<hook>.mjs < payload.json`. Tests: `test/hooks/hooks.test.mjs` spawns the hooks; `test/hooks/handlers.test.mjs` calls the handlers.

A blocked call or a bounced turn is Picket working. Fix the violation; do not retry variants.
