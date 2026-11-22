---
icon: lucide/sliders-horizontal
---

# Customization

Picket is customized in three places: the settings file, extensions that add your own text and checks, and the look of the session. Its core (the verdicts, the gates, the guards and the budgets) cannot be changed.

## Settings

All settings live in `.picket/config.json`. Every key is optional.

``` json
{
  "version": 1,
  "security_paths": ["src/payments/", "infra/iam/"],
  "commands": { "test": "npm test", "lint": "npm run lint" },
  "lanes": { "fast": { "max_files": 3 }, "order": { "max_phases": 3, "max_decisions": 5 } },
  "sources": { "specs": { "env": "PICKET_SOURCE_SPECS" } },
  "extensions": ["house-style"],
  "quality": { "coverage_min": 85, "max_warnings": 0 }
}
```

| Key | What it changes |
|---|---|
| `security_paths` | adds to the built-in list (`src/auth/`, `src/crypto/`, `src/security/`, `Authentication/`, `Authorization/`). A change under any of them always takes the design lane, every such phase takes its own approval, and the reviewer loads the full security checklist. |
| `commands` | overrides detection of your test, lint, build and run commands. Picket detects the usual ones (`npm test`, `dotnet test`, `pytest` and so on); set them here when it guesses wrong. A destructive command is dropped with a warning. |
| `lanes` | changes the caps that decide when work moves to a heavier lane. |
| `sources` | declares read-only repositories outside the project, such as a specification repository. |
| `extensions` | enables and orders your [extensions](#extensions). |
| `quality` | records the bar your checks must hold: `coverage_min` (0 to 100) and `max_warnings` (0 or more). |
| `testing` | decides which finished items the tester checks after the final review: `design` (the default), `all` or `off`. |
| `mods` | switches off the [Markdown pane](#the-markdown-pane) or the [work pane](#the-work-pane). |
| `data_targets` | lists the servers and databases each data service may reach; `picket data run` refuses a connection that is not on its service's list. |

`init` also keeps `picket_version` in this file: the Picket version that last refreshed the project. Leave it to `init`.

??? note "Sources in detail"

    Each source names an environment variable that holds the folder on this machine, so the path stays out of git. Set the variable in the `env` block of `.claude/settings.local.json`:

    ``` json
    { "env": { "PICKET_SOURCE_SPECS": "D:/code/bookshop-specs" } }
    ```

    Agents read a source with `picket source find specs <name>` and `picket source grep specs <regex>`, and nothing ever writes to it.

??? note "The quality bar in detail"

    A hook denies any edit that makes a known threshold weaker, either than its value before the edit or than this bar. Example: with `coverage_min: 85`, writing `lines: 80` in `vitest.config.ts` is denied, and so is changing `--max-warnings 0` to `--max-warnings 5` in `package.json`. The same hook denies a new suppression (`eslint-disable`, `@ts-ignore`, `noqa`) and a new skipped or focused test. When you accept one, reply `w <n>` to the proposal on the block's `Waivers:` line.

??? note "Testing in detail"

    `design` tests design items, `all` tests order and design items, and `off` tests none. An item is tested only when its plan declares a check against an HTTP endpoint and the project has a test environment in `.picket/env/compose.yaml`. The tester runs cases on the item's own stack without reading the change, and the kernel derives its verdict. The closing block's `Tested:` line says what came of it: `APPROVED in round 2 · 5 passed, 1 not covered`, the criteria you accepted as not verified, or why the item was not tested, such as `no environment`. A `Not verified end to end:` line names each real service a mock stood in for.

## Extensions

An extension adds text and checks to Picket without changing its core: rules every agent reads, notes for one role, extra review checklist steps, and preflight checks. Create one with:

``` sh
picket extension add house-style
```

This creates the manifest `.picket/extensions/<name>/extension.json`, here with `house-style` as the name, and enables the extension in the config. List your Markdown files in its `rules`, `agents`, `review_steps` or `preflight` keys. `picket extension list` shows what is loaded.

!!! warning "What an extension cannot do"

    An extension cannot change the verdicts, the gates, the guards or the budgets.

## The look of the session

### The status line

Picket's status line is optional. To add it, run init with the flag:

``` sh
npx @picketai/picket@alpha init --statusline
```

It sets the project `statusLine` to `node "${CLAUDE_PROJECT_DIR}/.picket/state/statusline.mjs"`, unless your project, local or user settings already set one; then it leaves yours and names the file that holds it.

??? note "The status line in detail"

    Init also leaves the status line that `picket style apply` sets in your user settings. An old Picket value in your local or user settings does not stop it: init writes the project value and, with or without the flag, warns `remove the statusLine entry from <file>: it holds an old Picket status line`. Init never edits those two files; remove the entry yourself, because Claude Code reads local settings before project settings. Claude Code sets `CLAUDE_PROJECT_DIR` to the folder the session started in, so the line keeps working after a `cd`, and the value holds no path of your own, so it is safe to commit. The plugin copies `statusline.mjs` into the project's git-ignored `.picket/state/` at the start of every session, so the line can be blank in the very first session after the install and draws from the next refresh.

    If an earlier alpha.6 `init --statusline` wrote `node "$HOME/.claude/plugins/data/picket-picketai/statusline.mjs"` into the project settings, running `init --statusline` again replaces it with the project copy and says so. That old value keeps working, because the plugin still keeps a copy in its data folder too.

    Without `--statusline`, `init` writes no status line, leaves that data folder value in place, and removes the old `picket statusline` value from earlier versions, with a note saying so.

### The Markdown pane

The Markdown pane is on by default. To turn it off, set its switch, `mods.markdown`, to `false` in `.picket/config.json`:

``` json
{ "version": 1, "mods": { "markdown": false } }
```

From the next session, `/picket-markdown` is not offered, reply paths are not turned into links, and the band shows no `M↓`. Remove the key, or set it to `true`, to turn the pane back on.

### The work pane

The work pane is on by default. To turn it off, set its switch, `mods.session`, to `false` in `.picket/config.json`:

``` json
{ "version": 1, "mods": { "session": false } }
```

From the next session, `/picket-session` is not offered, the band shows no `☰ <n>`, and the status mod stops reading the Claude Code session and transcript folders. The rest of the status mod stays: the band with the open work item, its agents, `◀ <n> need you` and `M↓`. The `◀ <n> need you` count stays as plain text, with no pane to open from it. Remove the key, or set it to `true`, to turn the pane back on.

### Response style

Optionally, choose Picket's response style with `/config`, under Output style: `picket:custom`. It keeps replies short, answer first, with no filler.

### Terminal styling

`picket style apply` gives Claude Code and your terminal the PicketAI look. It installs four things: the PicketAI Claude Code theme, the JetBrainsMono Nerd Font Mono font (a pinned release, checked against its SHA-256), a PicketAI colour scheme and font in your terminal (Windows Terminal, Terminal.app, GNOME Terminal, Ptyxis or Konsole; other terminals get the colours to set by hand), and Picket's status line in `~/.claude/settings.json`.

Run it in your own terminal through npx, since `picket` is on the `PATH` of Claude Code's tools only:

``` sh
npx @picketai/picket@alpha style apply
```

| Flag | Effect |
|---|---|
| `--dry-run` | prints the plan and writes nothing |
| `--only theme,font,terminal,statusline` | picks the parts; name one or several |
| `--yes` | answers yes to every question |
| `--json` | prints the report as JSON |

`style apply` shows its plan and asks before it writes anything, and it asks again before it replaces something of yours, such as your own status line or your terminal's default profile. It reads answers only in a real terminal. Through Claude Code's `!` prefix it prints the plan and stops, so run it in a terminal window or pass `--yes`.

To take the look away again, `picket style remove` lists the styling items, asks which to remove (and asks about the font on its own), and keeps everything when you answer nothing. `picket style remove --all` removes every item without asking which; add `--dry-run` to see the plan first.

??? note "How styling changes are recorded and undone"

    Every change is recorded in `~/.picketai/styling-manifest.json`, and every file `style apply` edits is first copied under `~/.picketai/backups/`. Removing an item restores a file Picket edited when you have not touched it since. When you have, it takes out only Picket's keys, so your later edits stay. A font that was installed before `style apply` ran is never removed.

## Notifications

Picket shows an OS notification when Claude Code asks for your permission and when it has waited for your input: a toast on Windows, a notification through `osascript` on macOS, and `notify-send` on Linux. The permission notification comes at once. The idle one comes after Claude Code's idle wait, which is 60 seconds by default.

To make the idle wait 30 seconds, close every Claude Code session first, because a running session rewrites the file, then add this key at the top level of `~/.claude.json`:

``` json
{ "messageIdleNotifThresholdMs": 30000 }
```

The key is not in Claude Code's documented settings, so a later version may ignore it. `picket init` never writes it, because it is your own preference and not the project's.

To turn Picket's notification off, for example when you already have your own Notification hook or your terminal notifies on its own, set `PICKET_NOTIFY=off` in the `env` block of `.claude/settings.local.json`:

``` json
{ "env": { "PICKET_NOTIFY": "off" } }
```
