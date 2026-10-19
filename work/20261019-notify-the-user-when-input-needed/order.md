---
kind: order
lane: order
title: Notify the user when input needed
date: 2026-10-19
audience: developer
sources: [request.md, core/hooks/hooks.json, core/hooks/README.md, core/hooks/monitor.context.mjs, core/lib/hook.mjs, core/lib/hooks/monitor.context.mjs, core/lib/hooks/guard.bash.mjs, core/lib/drive.mjs, core/lib/init.mjs, core/lib/styling/setup.mjs, core/lib/styling/statusline-setting.mjs, core/skills/ordering/steps/30-gate.md, core/skills/designing/SKILL.md, core/skills/researching/SKILL.md, core/skills/researching/steps/10-outline.md, core/skills/researching/steps/20-deep.md, test/budgets.test.mjs, test/hooks/hooks.test.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/init.test.mjs, docs/how-to.md, docs/setup-terminal-checklist.md, README.md, Claude Code 2.1.303 binary (Notification hook input schema)]
phases:
  - n: 1
    files: [core/hooks/notify.user.mjs, core/lib/hooks/notify.user.mjs, core/hooks/hooks.json, core/hooks/README.md, README.md, test/hooks/handlers.test.mjs, test/hooks/hooks.test.mjs, test/kernel/plugin-layout.test.mjs]
    greps:
      - path: core/hooks/hooks.json
        pattern: '"Notification"'
      - path: core/hooks/hooks.json
        pattern: '"matcher": "permission_prompt\|idle_prompt"'
      - path: core/hooks/notify.user.mjs
        pattern: 'notifyUser'
      - path: core/lib/hooks/notify.user.mjs
        pattern: 'export function notifyUser\b'
      - path: core/lib/hooks/notify.user.mjs
        pattern: 'export function notificationCommand\b'
      - path: core/lib/hooks/notify.user.mjs
        pattern: 'EncodedCommand'
      - path: core/lib/hooks/notify.user.mjs
        pattern: 'stdio: "ignore"'
      - path: core/lib/hooks/notify.user.mjs
        pattern: 'cmd\.exe'
      - path: core/hooks/README.md
        pattern: 'notify\.user\.mjs'
      - path: test/kernel/plugin-layout.test.mjs
        pattern: '"Notification"'
      - path: README.md
        pattern: 'fourteen hooks'
    tests: true
    drive: true
  - n: 2
    files: [docs/how-to.md, core/skills/researching/SKILL.md]
    greps:
      - path: docs/how-to.md
        pattern: '^## Notifications\b'
      - path: docs/how-to.md
        pattern: '"messageIdleNotifThresholdMs": 30000'
      - path: docs/how-to.md
        pattern: 'PICKET_NOTIFY'
      - path: core/skills/researching/SKILL.md
        pattern: 'send a push notification when the tool exists'
      - path: core/lib/init.mjs
        pattern: '^(?![\s\S]*messageIdleNotifThresholdMs)'
        flags: i
    tests: true
    drive: false
---
# Order: Notify the user when input needed

## Problem

A lane gate ends the turn and waits for the user, and the guard's `PICKET_ESCALATE` path opens Claude Code's native ask dialog. Today nothing tells a user who has switched windows: `core/hooks/hooks.json` wires seven events and no `Notification`. Claude Code 2.1.303 fires a `Notification` hook with the input `{ hook_event_name: "Notification", message, title?, notification_type }` and matches the hook's `matcher` against `notification_type` (checked in the binary's hook input schema and its matcher switch). Every hook must start cold in under 200 ms (`test/budgets.test.mjs:20`), so the OS notification has to run in a process the hook does not wait for.

## Decisions

### D-001 (r2): One Notification hook that starts a detached, argv-only notifier
**Decision:** Add `core/hooks/notify.user.mjs`, a thin shell like `core/hooks/monitor.context.mjs` that runs the handler `notifyUser` from `core/lib/hooks/notify.user.mjs` through `runHook`. It is registered under a new `Notification` event with the matcher `permission_prompt|idle_prompt`. The handler builds the notification with a pure, exported `notificationCommand(platform, { title, body })` that returns `{ command, args, env }` or `null`, starts it with `spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true, env })`, swallows the child's `error` event, calls `unref()`, and returns `null`, so the hook prints nothing and `runHook` exits at once. On win32 the command is `cmd.exe` with the args `["/d", "/c", "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", <constant script>]`: Windows PowerShell 5.1, never `pwsh`, because the WinRT toast classes load only there, and launched through `cmd.exe` because a `powershell.exe` spawned detached exits 0 without running its script (phase 1 drive; attached with `unref` dies with the hook, and `conhost --headless` and `start /min` showed no toast). Every `cmd.exe` argument is a constant with no `%`, `^`, `&`, `|`, `<`, `>` or quote (the encoded script is base64), so nothing reaches cmd's parser but fixed text. The title and body travel in the child's environment as `PICKET_NOTIFY_TITLE` and `PICKET_NOTIFY_BODY`, and the script puts them into the toast XML with `CreateTextNode`, so no payload text is ever spliced into a script. On darwin it is `osascript` with a constant `on run argv` script and the two texts as arguments; on linux, `notify-send --app-name=Picket <title> <body>`; any other platform gets `null`. `PICKET_NOTIFY=off` in the environment skips the spawn.
**Instead of:** a Stop hook that sleeps 30 seconds and then notifies: it fires on every turn end, including turns the user is watching, and it needs a long-lived process plus cancellation when the user answers, which `idle_prompt` already gives for free.
**Risks:**
- **RISK-001** A child that inherits the hook's stdout keeps the pipe open, so Claude Code waits for PowerShell (about a second) before it reads the hook's output. Mitigation: `stdio: "ignore"` is a grep criterion, and the drive times the real hook with its stdout piped, which is the condition Claude Code creates.
- **RISK-002** Windows drops a toast from an unregistered app id without an error. Mitigation: the script shows the toast under Windows PowerShell's registered app id `{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe`, and the drive reads the toast back from `ToastNotificationManager.History`.
- **RISK-003** A user who already has a Notification hook, or a terminal that notifies on its own (iTerm2), gets two notifications. Mitigation: `PICKET_NOTIFY=off`, documented in phase 2.

### D-002: The idle threshold is documented, never written by init
**Decision:** `picket init` stays project-only and does not touch `~/.claude.json`. Phase 2 adds a `## Notifications` section to `docs/how-to.md` that tells the user to add `"messageIdleNotifThresholdMs": 30000` at the top level of `~/.claude.json` with every Claude Code session closed. `init` writes files that the team commits and shares (`docs/how-to.md:65`), and today it only ever reads the user's home settings (the status line check, `test/kernel/init.test.mjs` T-3.4 asserts the home file is unchanged). The idle wait is a personal preference in Claude Code's own state file, which every running session rewrites, under a key that Claude Code does not document and may rename.
**Instead of:** `init` sets the key: it would put a per-user, undocumented preference in a per-project command, and `init` usually runs from a Bash call inside a live session whose own save of `~/.claude.json` can overwrite the key or race the write.
**Risks:**
- **RISK-004** A user skips the step and waits 60 seconds for the idle notification. Mitigation: the permission prompt still notifies at once; the 60-second default is named in the section, so the cost of skipping it is clear.

### D-003: The push notification line goes to the research packet only
**Decision:** The designing lane already reaches its user gate through `ordering/steps/30-gate.md` (`core/skills/designing/SKILL.md:35`, "The phase loop and the user gate are the order lane's, reused unchanged"), so it already carries the line "send a push notification when the tool exists" from `30-gate.md:3`. Only the research lane's stop lacks it: the `## The packet` section of `core/skills/researching/SKILL.md` gets the same words. Both research stops (outline ready, `10-outline.md`, and report ready, `20-deep.md`) render that packet, so one sentence covers both.
**Instead of:** a new designing gate step file that copies the line: it would fork the shared gate procedure for one sentence it already has.

## Scope

**In:**
- The Notification hook, its handler, registration, tests, and its row in `core/hooks/README.md` and the hook count in `README.md`.
- The `## Notifications` section in `docs/how-to.md` and one sentence in `core/skills/researching/SKILL.md`.

**Out:**
- Writing `~/.claude.json` from `init` or `setup-terminal` (D-002).
- Other notification types (`elicitation_dialog`, `agent_needs_input`, `auth_success` and the rest).
- Focus Assist or Do Not Disturb, which suppress toasts by the user's choice.
- Push notifications at stops that are not lane gates (`resolve_sources`, `resolve_block`).

## Phase 1: The Notification hook

**Touch set:**
- `core/hooks/notify.user.mjs`: new thin hook shell
- `core/hooks/monitor.context.mjs`: the shell to copy
- `core/lib/hooks/notify.user.mjs`: new handler and command builder
- `core/lib/hook.mjs`: runHook passes only root
- `core/lib/hooks/guard.bash.mjs`: injected-default handler signature, line 1198
- `core/hooks/hooks.json`: register the Notification event
- `core/hooks/README.md`: one table row
- `README.md`: hook count on line 36
- `test/hooks/handlers.test.mjs`: handler and command tests
- `test/hooks/hooks.test.mjs`: spawned hook test, `run` helper
- `test/kernel/plugin-layout.test.mjs`: event list on line 78
- `test/budgets.test.mjs`: cold start runs every shell

**Changes:** Per D-001. `notifyUser(event, { spawn = <detached spawn>, platform = process.platform, env = process.env } = {})` follows the injected-default style of `guardBash(input, { root, home = homedir() })`; `runHook` passes `{ root }`, so the defaults apply in production. It returns `null` and spawns nothing when `notification_type` is not `permission_prompt` or `idle_prompt` (a second check behind the matcher), when `env.PICKET_NOTIFY` is `off`, or when `notificationCommand` returns `null`. The title is `Picket: <basename of event.cwd>` (just `Picket` without a cwd); the body is `event.message` trimmed and cut to 200 characters, or `Claude Code is waiting for you` when empty. `hooks.json` gains `"Notification": [{ "matcher": "permission_prompt|idle_prompt", "hooks": [<node notify.user.mjs>] }]` in the same shape as the other entries. The plugin-layout test's event list grows to eight. `README.md:36` says "fourteen hooks" and adds "notifier" to its list. The README table row reads: `notify.user.mjs` | Notification permission_prompt, idle_prompt | an OS notification in a detached process (a Windows toast through powershell.exe, osascript, notify-send); `PICKET_NOTIFY=off` skips it. Tests never show a real notification: handler tests inject a recording `spawn`, and the one spawned-hook test sets `PICKET_NOTIFY=off` or uses a non-matching type.

Drive on this machine with `picket drive --run`: pipe `{"hook_event_name":"Notification","notification_type":"permission_prompt","message":"Claude needs your permission to use Bash","cwd":"<repo root>"}` into `node core/hooks/notify.user.mjs` with stdout piped, print the wall time, then run a `powershell.exe` command that lists `[Windows.UI.Notifications.ToastNotificationManager]::History.GetHistory('<PowerShell app id>')` and shows the new toast's text. If the history call returns nothing, say so on the block, and the user confirms the toast at the gate.

**Done when:**
- **T-1.1** `hooks.json` registers a `Notification` entry with the matcher `permission_prompt|idle_prompt` running `notify.user.mjs`, and `npm test` passes, including the plugin-layout test that now lists eight events and the registration test that matches shells on disk.
- **T-1.2** A handler test with a recording `spawn` shows one call for each of `permission_prompt` and `idle_prompt` with options `detached: true`, `stdio: "ignore"`, `windowsHide: true`, and the handler returns `null`.
- **T-1.3** Handler tests show no spawn for `notification_type: "auth_success"`, for `PICKET_NOTIFY=off`, and for platform `aix`.
- **T-1.4** `notificationCommand("win32", { title: "Picket: shop", body: "a\"b'$(x)" })` returns `cmd.exe` whose args start `/d`, `/c`, `powershell.exe` and hold no `%`, and whose `-EncodedCommand` value decodes to a script that is identical to the decoded script for any other title and body, and the two texts appear only in the returned `env` as `PICKET_NOTIFY_TITLE` and `PICKET_NOTIFY_BODY`.
- **T-1.5** `notificationCommand("darwin", …)` and `notificationCommand("linux", …)` return `osascript` and `notify-send` with the title and body as separate trailing arguments, never inside a `-e` script string.
- **T-1.6** The budget test still passes, and the drive shows the hook exiting with empty stdout in under 200 ms with its stdout piped.
- **T-1.7** The drive shows a toast whose text holds `Picket: AISpec` and `Claude needs your permission to use Bash` in the toast history, or the block says the history read came back empty.

## Phase 2: The idle threshold doc and the research packet

**Touch set:**
- `docs/how-to.md`: new Notifications section after Terminal styling
- `core/skills/researching/SKILL.md`: one sentence under The packet
- `core/skills/ordering/steps/30-gate.md`: the line to copy, read only
- `core/lib/init.mjs`: stays free of the key, read only

**Changes:** Per D-002 and D-003. `docs/how-to.md` gets `## Notifications` between `## Terminal styling` and `## Updating`, in that file's plain style: Picket shows an OS notification when Claude Code asks for permission and when it has waited for your input; the idle wait is 60 seconds by default; to make it 30, close every Claude Code session and add `"messageIdleNotifThresholdMs": 30000` at the top level of `~/.claude.json` (a JSON example block), because a running session rewrites that file; the key is not in Claude Code's documented settings, so a later version may ignore it; `PICKET_NOTIFY=off` in the `env` block of `.claude/settings.local.json` turns Picket's notification off, for example when you already have your own Notification hook. In `core/skills/researching/SKILL.md`, the `## The packet` paragraph adds "Print it, send a push notification when the tool exists, and end the turn." without changing the packet example. `core/lib/init.mjs` is not edited.

**Done when:**
- **T-2.1** `docs/how-to.md` has a `## Notifications` heading between `## Terminal styling` and `## Updating`, with a JSON block holding `"messageIdleNotifThresholdMs": 30000` and the 60-second default named in prose.
- **T-2.2** The section names `PICKET_NOTIFY=off` and the `env` block of `.claude/settings.local.json` as the opt-out.
- **T-2.3** `core/skills/researching/SKILL.md` contains "send a push notification when the tool exists" under `## The packet`, and the budget test still holds the skill under 150 lines.
- **T-2.4** `core/lib/init.mjs` and `test/kernel/init.test.mjs` do not contain `messageIdleNotifThresholdMs`, and `npm test` passes.

## Open questions

none

## Revision log

- 2026-10-19: D-001 (r2): win32 launches powershell.exe through `cmd.exe /d /c` with constant args; a detached powershell.exe exits without running its script on Windows (phase 1 drive).
