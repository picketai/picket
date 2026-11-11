Fix two alpha.5 to alpha.6 upgrade bugs found on a Windows reinstall.
1. picket init fails to install the plugin when Claude Code still holds alpha.5's cached picketai marketplace: "Plugin "picket" not found in marketplace "picketai". Your local copy may be out of date — try `claude plugin marketplace update picketai`". When the install fails, init runs `claude plugin marketplace update picketai` and tries the install once more; it reports the install as failed only when the retry fails too.
2. An earlier install left Picket's status line (`picket statusline`, or another value isPicketStatusLine knows) in the user's ~/.claude/settings.json (or the project's settings.local.json). init --statusline treats it as someone else's and writes nothing, and the old value runs a removed global picket, so the status line is blank. init --statusline writes the project status line over an old Picket status line held in another settings file, and init (with or without the flag) warns naming that file and saying to remove the old entry. uninstall's output names an old Picket status line in the user settings too, since it does not edit user settings.
Unit tests for each.

## Brief
purpose: A project upgraded from alpha.5 gets the plugin installed and the Picket status line working without manual cleanup
in scope: init retries the plugin install after refreshing a stale picketai marketplace; init --statusline writes over and warns about an old Picket status line in user or local settings; uninstall names an old Picket status line in user settings; unit tests
out of scope: editing user settings, other upgrade paths, the DEP0190 shell warning, the global picket shadow warning
