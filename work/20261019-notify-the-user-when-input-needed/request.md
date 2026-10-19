Notify the user when Picket needs their input.

1. Add a Notification hook to core/hooks/hooks.json (a new notify.user.mjs) with the matcher permission_prompt|idle_prompt. It shows a detached OS notification (a Windows toast through PowerShell on win32) and exits at once, within the 200 ms hook budget. This covers the native ask dialog from the guard escalation and every lane gate where the turn ends waiting for the user.
2. The idle notification fires after 30 seconds, not the default 60. The threshold is the undocumented user-level key messageIdleNotifThresholdMs in ~/.claude.json (default 60000, found in the Claude Code binary), not a project setting. Decide whether picket init writes it or the docs tell the user to set it.
3. Keep PushNotification at gates for the phone path: copy the line from core/skills/ordering/steps/30-gate.md into the designing gate and the researching outline stop so all lanes match.
