---
kind: design
lane: design
title: Terminal styling setup with theme and font
date: 2026-10-17
audience: developer
sources: [request.md, C:\Users\vlad.apetre\Desktop\TUI\picketai-terminal-styling-prompt.md, core/lib/statusline.mjs (staged), core/bin/picket.mjs, core/lib/init.mjs, core/lib/git.mjs, core/lib/transcript.mjs, core/lib/paths.mjs, core/lib/verify.mjs, core/lib/vendor/shell-quote-parse.mjs, core/lib/hooks/guard.bash.mjs, test/kernel/statusline.test.mjs (staged), test/kernel/cli.test.mjs (staged), test/kernel/git.test.mjs, test/kernel/init.test.mjs, test/kernel/plugin-layout.test.mjs, test/kernel/statusline-input.json, scripts/test.mjs, CONTRIBUTING.md, package.json, work/20261016-session-line-moves-to-the-status-line/design.md, work/20261017-statusline-rows-share-the-brand-style/design.md]
phases:
  - n: 1
    files: [core/lib/statusline.mjs, core/lib/styling/palette.mjs, core/lib/git.mjs, core/bin/picket.mjs, test/kernel/statusline.test.mjs, test/kernel/cli.test.mjs, test/kernel/git.test.mjs]
    greps:
      - path: core/lib/statusline.mjs
        pattern: 'export function renderStatusline\b'
      - path: core/lib/statusline.mjs
        pattern: 'export function lastSkill\b'
      - path: core/lib/statusline.mjs
        pattern: 'export function displayWidth\b'
      - path: core/lib/statusline.mjs
        pattern: 'export function iconsMode\b'
      - path: core/lib/statusline.mjs
        pattern: 'export function liveProbe\b'
      - path: core/lib/statusline.mjs
        pattern: '0\.83'
      - path: core/lib/statusline.mjs
        pattern: 'EDGE_COLUMNS = 2\b'
      - path: core/lib/statusline.mjs
        pattern: '^(?![\s\S]*(│|◆|n/a|export function wrap\b))'
        flags: i
      - path: core/lib/styling/palette.mjs
        pattern: '#F9782B'
        flags: i
      - path: core/lib/git.mjs
        pattern: 'export function workingState\b'
      - path: core/lib/git.mjs
        pattern: '--porcelain=v2'
      - path: test/kernel/git.test.mjs
        pattern: 'workingState'
    tests: true
    drive: true
    security: false
  - n: 2
    files: [core/lib/styling/host.mjs, core/lib/styling/manifest.mjs, core/lib/styling/setup.mjs, core/lib/styling/statusline-setting.mjs, core/lib/init.mjs, core/bin/picket.mjs, core/lib/hooks/guard.bash.mjs, test/kernel/styling/host-fixture.mjs, test/kernel/styling/setup.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: core/bin/picket.mjs
        pattern: 'case "setup-terminal"'
      - path: core/bin/picket.mjs
        pattern: 'Verbs: [\w -]*\bsetup-terminal\b'
      - path: core/bin/picket.mjs
        pattern: 'import\("\.\./lib/styling/setup\.mjs"\)'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'KERNEL_OTHER_VERBS = new Set\(\[[^\]]*"setup-terminal"'
      - path: core/lib/styling/manifest.mjs
        pattern: 'styling-manifest\.json'
      - path: core/lib/init.mjs
        pattern: 'export const STATUS_LINE\b'
    tests: true
    drive: true
    security: false
  - n: 3
    files: [core/themes/picketai.json, core/lib/styling/theme.mjs, core/lib/styling/setup.mjs, test/kernel/styling/theme.test.mjs]
    greps:
      - path: core/themes/picketai.json
        pattern: '"name": "PicketAI"'
      - path: core/lib/styling/theme.mjs
        pattern: 'custom:picketai'
      - path: core/lib/styling/setup.mjs
        pattern: 'theme\.mjs'
    tests: true
    drive: true
    security: false
  - n: 4
    files: [core/lib/styling/nerd-font.json, core/lib/styling/zip.mjs, core/lib/styling/font.mjs, core/lib/styling/setup.mjs, test/kernel/styling/zip.test.mjs, test/kernel/styling/font.test.mjs, test/kernel/styling/host-fixture.mjs]
    greps:
      - path: core/lib/styling/nerd-font.json
        pattern: '"sha256": "[0-9a-f]{64}"'
      - path: core/lib/styling/nerd-font.json
        pattern: 'https://github\.com/ryanoasis/nerd-fonts/releases/download/'
      - path: core/lib/styling/zip.mjs
        pattern: 'inflateRawSync'
      - path: core/lib/styling/font.mjs
        pattern: 'fc-cache'
      - path: core/lib/styling/font.mjs
        pattern: 'font-jetbrains-mono-nerd-font'
      - path: core/lib/styling/setup.mjs
        pattern: 'font\.mjs'
    tests: true
    drive: true
    security: true
  - n: 5
    files: [core/lib/vendor/jsonc-parser.mjs, core/lib/styling/terminal.mjs, core/lib/styling/terminals/windows-terminal.mjs, core/lib/styling/terminals/manual.mjs, core/lib/styling/setup.mjs, test/kernel/styling/terminal.test.mjs, test/kernel/styling/fixtures/wt-comments.json, test/kernel/styling/fixtures/wt-defaults.json, test/kernel/styling/fixtures/wt-profiles-array.json]
    greps:
      - path: core/lib/vendor/jsonc-parser.mjs
        pattern: 'MIT'
      - path: core/lib/styling/terminal.mjs
        pattern: 'WT_SESSION'
      - path: core/lib/styling/terminals/windows-terminal.mjs
        pattern: '8wekyb3d8bbwe'
      - path: core/lib/styling/setup.mjs
        pattern: 'terminal\.mjs'
    tests: true
    drive: true
    security: false
  - n: 6
    files: [core/lib/styling/terminals/konsole.mjs, core/lib/styling/terminals/gnome-terminal.mjs, core/lib/styling/terminals/ptyxis.mjs, core/lib/styling/terminals/ini.mjs, core/lib/styling/terminal.mjs, test/kernel/styling/linux-terminals.test.mjs, test/kernel/styling/host-fixture.mjs]
    greps:
      - path: core/lib/styling/terminals/konsole.mjs
        pattern: '\.colorscheme'
      - path: core/lib/styling/terminals/gnome-terminal.mjs
        pattern: 'use-theme-colors'
      - path: core/lib/styling/terminals/ptyxis.mjs
        pattern: '\.palette'
    tests: true
    drive: false
    security: false
  - n: 7
    files: [core/lib/styling/terminals/terminal-app.mjs, core/lib/styling/terminals/plist.mjs, core/lib/styling/terminal.mjs, test/kernel/styling/terminal-app.test.mjs, test/kernel/styling/host-fixture.mjs]
    greps:
      - path: core/lib/styling/terminals/terminal-app.mjs
        pattern: 'NSKeyedArchiver'
      - path: core/lib/styling/terminals/terminal-app.mjs
        pattern: 'Default Window Settings'
    tests: true
    drive: false
    security: false
  - n: 8
    files: [core/lib/styling/uninstall.mjs, core/lib/styling/setup.mjs, core/bin/picket.mjs, core/lib/hooks/guard.bash.mjs, test/kernel/styling/uninstall.test.mjs, test/kernel/cli.test.mjs]
    greps:
      - path: core/bin/picket.mjs
        pattern: 'case "uninstall"'
      - path: core/bin/picket.mjs
        pattern: 'Verbs: [\w -]*\buninstall\b'
      - path: core/lib/hooks/guard.bash.mjs
        pattern: 'KERNEL_OTHER_VERBS = new Set\(\[[^\]]*"uninstall"'
      - path: core/lib/styling/uninstall.mjs
        pattern: 'claude plugin uninstall picket@picketai'
    tests: true
    drive: true
    security: false
  - n: 9
    files: [core/lib/styling/manifest.mjs, core/lib/styling/setup.mjs, core/lib/styling/uninstall.mjs, core/lib/styling/theme.mjs, core/lib/styling/terminals/gnome-terminal.mjs, test/kernel/styling/setup.test.mjs, test/kernel/styling/theme.test.mjs, test/kernel/styling/uninstall.test.mjs, test/kernel/styling/linux-terminals.test.mjs, docs/how-to.md, CONTRIBUTING.md]
    greps:
      - path: core/lib/styling/manifest.mjs
        pattern: '\bblocks\b'
      - path: core/lib/styling/manifest.mjs
        pattern: '^(?![\s\S]*restore \$\{item\.path\} from \$\{item\.backup\})'
        flags: i
      - path: core/lib/styling/theme.mjs
        pattern: '\bblocks\b'
      - path: core/lib/styling/terminals/gnome-terminal.mjs
        pattern: 'dconf load'
      - path: CONTRIBUTING.md
        pattern: 'core/lib/vendor/jsonc-parser\.mjs'
      - path: docs/how-to.md
        pattern: 'picket setup-terminal'
      - path: docs/how-to.md
        pattern: 'picket uninstall'
    tests: true
    drive: true
    security: false
---
# Design: Terminal styling setup with theme and font

## Problem

The spec at `C:\Users\vlad.apetre\Desktop\TUI\picketai-terminal-styling-prompt.md` asks for one command, `picket setup-terminal`, that installs four things on Windows, macOS and Linux: a Claude Code theme, the JetBrainsMono Nerd Font Mono font, a PicketAI colour scheme and font in the user's terminal, and a new two-group status line layout. It records each in `~/.picketai/styling-manifest.json` and removes them again on `--revert` or uninstall without touching anything the user made. Binding constraints: everything under `core/` imports only Node built-ins and paths inside `core/` (`test/kernel/plugin-layout.test.mjs`, `CONTRIBUTING.md:27`); every write to a user file is confirmed and backed up first; tests never touch the real home folder, registry, dconf or network, so every OS effect goes through an injected host. The status line keeps the contract the open item `20261016-session-line-moves-to-the-status-line` published and greps: `picket statusline` reads stdin JSON, prints text and always exits 0, and `renderStatusline`, `lastSkill`, `0.83` and `EDGE_COLUMNS = 2` stay in `core/lib/statusline.mjs`. The spec supersedes the staged, unapproved phase 1 of `20261017-statusline-rows-share-the-brand-style` (bars, `◆`, greedy wrap); phase 1 here builds on that working tree and replaces it (OQ-003).

## Decisions

### D-001 (r3): Status line rows are a left group and a right group, laid out wide or narrow
**Decision:** Infrastructural decision. A `Piece` is `{ text, color?, bg?, bold? }`, where `color` and `bg` name palette entries (`claude`, `text`, `muted`, `dim`, `success`, `warning`, `error`, `dark`, `barText`, `barEmpty`) whose hex values come from the new `core/lib/styling/palette.mjs`. A `Row` is `{ left: Piece[], right: Piece[] }`. Fields inside a group join with a ` · ` piece in `dim` (#6B6158); groups on the right side join with three plain spaces. `layout(facts, { columns, icons })` builds the rows. Line 1 is the brand on the left and `<folder> · <branch>` on the right. Wide (2 rows) puts `<model> · <effort> · <skill>` left and the 5h, 7d, context, cache and cost groups right. Narrow (3 rows) puts the 5h and 7d groups right of line 2, then the context bar left and cache and cost right on line 3. Wide is chosen only when `columns` is a positive integer and every wide row fits `2 + width(left) + 3 + width(right) <= columns - EDGE_COLUMNS`. Otherwise the layout is narrow at that width, or at 80 when the width is unknown. A row prints as two spaces, the left group, padding, and the right group ending at column `columns - EDGE_COLUMNS`. A row that does not fit gets three spaces between its groups and is clipped by the terminal. A missing fact drops its field or group (no `n/a`, `?` or `...`), and an empty row is dropped. The context group is a text bar ` <used>/<window> <pct>% `: the first `round(pct / 100 × length)` characters have the fill colour as `bg` with `dark` text, the rest `barEmpty` (#2E2620) behind `barText` (#E9C9A0). The fill colour comes from the existing `contextColor` against `0.83 × window`, bold when it is `error`. `<used>` is `context_window.total_input_tokens`, which the status line docs define as the tokens now in the context window from the most recent API response, cache reads and writes included; `<pct>` is `used_percentage`. `compactTokens` gives whole k when the value rounds below 100k, one decimal k below 1M, and one decimal M from there (`46000` reads `46k`, `200000` reads `200.0k`). Widths are display columns from `displayWidth(text)`: 0 for combining marks, ZWJ and variation selectors, 2 for East Asian Wide and Fullwidth ranges and emoji, 1 otherwise, including Nerd Font private-use code points, `⎇` and `◷`. `icons` is `plain` or `nerd` and only swaps pieces as the spec's icon table says. Example: the fixture's wide row 2 needs 113 cells, so 115 columns prints 2 rows and 114 prints 3.
**Instead of:** the staged greedy wrap joined by `│`: the spec removes the bars and the `◆` and pushes the right group to the edge, and a fixed choice of 2 or 3 rows is easier to predict than a wrap.
**Risks:**
- **RISK-001** Claude Code's own row spacing clips a row that ends at `columns - 2`. Mitigation: `EDGE_COLUMNS` keeps 2 cells free, as the open item settled; OQ-002 covers the width source.
- **RISK-002** A font that is not the Mono variant draws a Nerd icon two cells wide, so the right group overflows one cell per icon. Mitigation: `plain` is the default, and only `setup-terminal` switches to `nerd`, after the Mono font is applied (D-008).

### D-002: The status line reads git at most every 5 seconds and the icon mode from the user's Picket folder
**Decision:** Infrastructural decision. `workingState(root)` in `core/lib/git.mjs` runs one `git status --porcelain=v2 --branch --untracked-files=no` and returns `{ branch, state }`, or null outside a repo. `branch` is `branch.head`, or the first 7 characters of `branch.oid` when detached. `state` is `conflict` when any `u` entry exists, else `unstaged` when any entry's Y is not `.`, else `staged` when any entry's X is not `.`, else `clean`. Colours: clean `claude`, unstaged `warning`, staged `success`, conflict `error`. `liveProbe({ cacheDir, now })` wraps `workingState` and `lastSkill` with one JSON cache file per working folder under `os.tmpdir()/picket-statusline/` (named by the first 16 hex characters of the folder's SHA-1). Git state is reused for 5 seconds (the `refreshInterval` that `picket init` writes); the skill is reused while the transcript's byte size is unchanged. `iconsMode(home)` reads `statusline.icons` from `<home>/.picketai/config.json` and returns `nerd` only for that exact string, else `plain`, including for a missing or broken file. `renderStatusline(input, { now, columns, icons = "plain", probe })` takes both as arguments so tests pass stubs; the verb still reads `COLUMNS`. The key `statusline.icons` in `~/.picketai/config.json` is read on users' machines once released [IRREVERSIBLE]; a later rename keeps reading the old key.
**Instead of:** a flag `picket statusline --icons nerd` in the user's `statusLine.command`: `picket init` writes `picket statusline` into project settings, which outrank user settings, so the flag would be hidden in every Picket project.
**Risks:**
- **RISK-003** Node's own start costs about 90 ms on this machine (open item 20261016, D-005), so the spec's "well under 100 ms" cannot hold on Windows whatever the caches do. Mitigation: the caches remove the git spawn and the transcript read from most refreshes, and `setup-terminal` and `uninstall` load their modules by dynamic `import()`, so the statusline path imports nothing new; OQ-009.
- **RISK-004** With `--untracked-files=no`, a tree whose only change is a new file shows clean orange. Mitigation: accepted for speed; `normal` is one argument away.

### D-003: Setup is a set of components behind one interface and an injected host
**Decision:** Infrastructural decision. `core/lib/styling/` holds one module per component (`statusline`, `theme`, `font`, `terminal`), each exporting `{ name, plan(host, manifest), unapply(item, host) }`. `plan` returns `Change[]` with `Change = { id, summary, question?, restart, manual?, apply(host, backup) }`; an empty list means the component is already in place, which is what makes a second run change nothing. `apply` returns the manifest `Item` (D-004). `Host = { platform, home, env, now, exec(command, args), fetch, ask(question, { choices, fallback }), interactive }`. `realHost()` builds it from `process` and `node:` modules; tests build one over a temp home, a scripted `ask`, and a fake `exec` that keeps registry, dconf, gsettings and `defaults` state in a map. `setupTerminal(host, { only, dryRun, yes, revert })` in `setup.mjs` plans the chosen components, prints the plan, asks once unless `yes`, and applies change by change. It writes the manifest after each applied change, reports a failed change and goes on, and returns `Report = { changes: [{ id, summary, result, detail? }], restart: string[], manual: string[] }`. The verb prints `renderReport(report)` text by default, like `packet`, and the report as JSON with `--json`. It exits 2 when any change failed, else 0. `--<component>-only` flags pick components from the registry, so the flag of a component that a later phase adds is a usage error until that phase lands.
**Instead of:** one script per operating system: the revert, idempotency and uninstall rules are the same for every item, and per-OS scripts would copy them four times, while the interface keeps OS detail inside each component.
**Risks:**
- **RISK-005** The fake host drifts from the real `reg`, `dconf`, `gsettings` and `defaults`. Mitigation: tests assert exact argument lists, and every OS effect is in the manual checklist (OQ-008).

### D-004 (r2): Revert restores a backup only when the file is still as Picket left it
**Decision:** Infrastructural decision. `~/.picketai/styling-manifest.json` is `{ version: 1, created, updated, items: Item[] }` with `Item = { id, component, kind: "edited" | "created" | "external", path?, backup?, sha256?, previous?, data?, installedAt }`. Before Picket edits an existing file it copies it to `~/.picketai/backups/<YYYYMMDDTHHMMSSZ>/<component>-<basename>`, and after writing it stores the SHA-256 of the new content. Removal per item: `edited` with a matching hash restores the backup byte for byte; `created` with a matching hash deletes the file; `edited` or `created` with a different hash calls the component's `unapply`, which removes only Picket's entries and puts back the `previous` values, so later user edits survive; `external` (registry, dconf, gsettings, `defaults`, brew) always goes through `unapply`. Picket's entries are keys inside a shared file (`statusLine` and `theme` in `settings.json`, `statusline.icons` in `config.json`, `DefaultProfile` in `konsolerc`), or a whole file only Picket writes (the theme copy, the Konsole colorscheme and profile, the Ptyxis palette, `PicketAI.terminal`). An `unapply` of a changed whole file keeps it with a manual step naming only that file, and no manual step ever asks the user to delete a file that holds user keys. Before any removal, a component may refuse it through an optional `blocks(item, host): string | null`. The theme refuses to delete its copy while user settings still read `custom:picketai`, and the outcome is `kept` with that reason. A second setup over an existing item keeps its first `backup` and `previous`, so revert always reaches the pre-setup state. When the file changed since Picket's last write, the second setup first copies it to `~/.picketai/kept/<stamp>/<id>-<basename>`, a folder Picket never deletes, and the report names the copy. A failed removal's manual step names only paths that exist in the item; a `dconf` item names its dump and the `dconf load` command that restores it. The manifest is rewritten after each item, and it is deleted together with the backup folders it names only when no item is left. A font item carries `data.preexisting`, and a preexisting font is never removed. Manifest version 1 lives on users' machines once released and every later version must read it [IRREVERSIBLE].
**Instead of:** always restoring the backup: it would wipe settings the user changed after setup, which the spec forbids.
**Risks:**
- **RISK-006** A program that rewrites its own settings (Windows Terminal reformats `settings.json` when the user saves in its UI) changes the hash without a real edit, so revert removes entries instead of restoring the exact file. Mitigation: the removal path still leaves a correct file; the exact-restore tests use an untouched file.
- **RISK-007** The manifest is missing or broken. Mitigation: revert and uninstall stop with a message naming `~/.picketai/backups/`; nothing is removed by guess.

### D-005 (r2): Questions are asked only on a terminal, and silence keeps everything
**Decision:** Infrastructural decision. `realHost().interactive` is `process.stdin.isTTY && process.stdout.isTTY`; `ask` then reads with `node:readline/promises`, and otherwise returns its `fallback` without reading. The setup fallback is "no": nothing is written, and the plan ends with "run this in a terminal or pass --yes". A change that replaces user data (a custom `statusLine`, a theme file Picket did not write, the terminal's default scheme or profile) asks its own question after the overall yes, fallback "no". `--yes` answers yes to every setup question. `picket uninstall` is a new verb. It lists the manifest items numbered and takes `all`, `none` or a list such as `1,3` (fallback `none`). Linked items share one number: `theme-file` and `theme-setting` are listed once as `Claude Code theme`, so the theme file is never chosen without the setting that selects it. It asks about a Picket-installed font on its own line (fallback keep) and never offers a preexisting font. It removes the chosen items through D-004, goes on past failures, and prints what was removed, kept and left with manual steps. It ends with the commands that remove the plugin and package (`claude plugin uninstall picket@picketai`, `npm uninstall -g @picketai/picket`) without running them. `picket setup-terminal --revert` is the same removal over every item behind one confirmation, so `uninstall --yes` equals `setup-terminal --revert --yes`. The verb names `setup-terminal` and `uninstall` are a published CLI contract once released [IRREVERSIBLE]; a rename keeps an alias.
**Instead of:** a plugin removal hook: I found no uninstall event for Claude Code plugins that I could verify, and npm 7 and later do not run `uninstall` scripts (OQ-007).
**Risks:**
- **RISK-008** Users run the verb through Claude Code's `!` prefix, which is not a TTY, and only see the plan. Mitigation: the plan's last line says to run it in a terminal or pass `--yes`.

### D-006 (r2): The plugin ships the theme, and setup copies it to the user and selects the copy
**Decision:** Infrastructural decision. The one copy of the theme is `core/themes/picketai.json`, the spec's Part 1 JSON unchanged (every token is documented). The plugin's `themes/` folder is scanned with no manifest key, so `/theme` lists it as `custom:picket:picketai` wherever the plugin is enabled. Because `picket init` enables the plugin with project scope, `theme.mjs` also copies the same file to `<home>/.claude/themes/picketai.json` (slug `picketai`) as a `created` item, or as an `edited` item with a backup and a question when a different file is already there. After the question `Make PicketAI your Claude Code theme?`, it sets `"theme": "custom:picketai"` in `<home>/.claude/settings.json`. That is an `edited` (or `created`) item whose `previous` is the settings key's old value or its absence, so it points at the user copy and works in every project. Removal puts the settings key back (or deletes it, so an older `~/.claude.json` value applies again), but only while it still reads `custom:picketai`. The removal path deletes the copy through D-004. `<home>/.claude.json` is only read, to name the theme in effect in the plan; it is never written. A `no` leaves the key alone, and the report says to run `/theme` and pick PicketAI.
**Instead of:** writing `custom:picket:picketai` into user settings with no copy: the plugin is enabled per project, so in any other project that value names a missing theme.
**Risks:**
- **RISK-009** In a Picket project `/theme` lists PicketAI twice (the plugin's and the user copy). Mitigation: both are the same file; accepted for a theme that works everywhere.
- **RISK-010** A project's own `theme` setting outranks the user setting, so PicketAI does not show there. Mitigation: the report says that a project `theme` setting wins; setup never edits project files.

### D-007: The font is a pinned, hashed release unpacked with Node's own zlib
**Decision:** Infrastructural decision. `core/lib/styling/nerd-font.json` pins `{ version, url, sha256, family: "JetBrainsMono Nerd Font Mono", files: "^JetBrainsMonoNerdFontMono-.*\\.ttf$" }` for `JetBrainsMono.zip` of `ryanoasis/nerd-fonts`. `font.mjs` first detects an existing install and records `preexisting: true` with nothing to remove. Detection on Windows reads the HKCU and HKLM `Fonts` registry keys and both font folders; on macOS it runs `brew list --cask font-jetbrains-mono-nerd-font`, then checks `~/Library/Fonts` and `/Library/Fonts`; on Linux it runs `fc-list : family`, then checks the fonts folder. Otherwise it streams the zip with `fetch` to `~/.picketai/cache/`, hashes it while streaming, and on any mismatch with the pinned SHA-256 deletes the file and fails the change with manual steps. `zip.mjs` reads the central directory and inflates entries with `zlib.inflateRawSync` (stored and deflate only), and only names matching `files` are written. Per-user install: Windows copies to `%LOCALAPPDATA%\Microsoft\Windows\Fonts\` and adds one `REG_SZ` value per file under `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts` with `reg add`. macOS runs `brew install --cask font-jetbrains-mono-nerd-font` when `brew` exists, else copies to `~/Library/Fonts/`. Linux copies to `${XDG_DATA_HOME:-~/.local/share}/fonts/` and runs `fc-cache -f`. Offline or any fetch failure fails this change only, with the release URL and the folder to copy into.
**Instead of:** trusting the release's checksum file fetched next to the zip: a checksum from the same place proves only the transfer, while a hash pinned in the package also proves it is the file that was reviewed; the developer checks the pin against the release's published checksum once (OQ-004).
**Risks:**
- **RISK-011** The zip is tens of megabytes. Mitigation: it is streamed to disk, entries are read by offset, and the cache file is deleted after install.
- **RISK-012** Apps started before registration do not see the font. Mitigation: the summary says to restart the terminal.

### D-008 (r2): Each terminal gets a new PicketAI scheme or profile from its own writer
**Decision:** Infrastructural decision. `detectTerminal(env, platform)` picks one id from the environment of the running command: `WT_SESSION` gives `windows-terminal`, `TERM_PROGRAM=Apple_Terminal` gives `terminal-app`, `KONSOLE_VERSION` gives `konsole`, `PTYXIS_VERSION` gives `ptyxis`, `GNOME_TERMINAL_SCREEN` or `GNOME_TERMINAL_SERVICE` gives `gnome-terminal`, and anything else gives `other`. One writer per id under `core/lib/styling/terminals/` creates a new PicketAI scheme or profile from `palette.mjs` and the family in `nerd-font.json`, and only after its own question points the terminal's default at it; no writer edits an existing profile. A setting that applies to every profile (Ptyxis keeps `use-system-font` and `font-name` app-wide) gets a separate question, with its previous value recorded. `other` prints the palette table, the font name and short steps naming iTerm2, WezTerm, Kitty, Ghostty and Alacritty, and writes nothing. Windows Terminal's `settings.json` is JSON with comments, so its writer edits it through a vendored copy of Microsoft's `jsonc-parser` (`modify` and `applyEdits`, MIT) at `core/lib/vendor/jsonc-parser.mjs`, which leaves comments and formatting outside the edited spans byte for byte. After a terminal change that set the font, with the font present, the terminal component writes `statusline.icons: "nerd"` into `~/.picketai/config.json` as its own item, so revert puts `plain` back.
**Instead of:** a hand-written JSONC span editor: about 150 lines of new parser code nobody has used, against a widely used vendored file whose only cost is a frozen copy updated by hand, the pattern `shell-quote-parse.mjs` already set.
**Risks:**
- **RISK-013** A Windows Terminal profile with its own `colorScheme` or `font.face` ignores `profiles.defaults`. Mitigation: the summary names each such profile as a manual step.

## Scope

**In:**
- the status line rewrite: layout, icons, display width, git state, caches
- `picket setup-terminal` with `--dry-run`, `--theme-only`, `--font-only`, `--terminal-only`, `--statusline-only`, `--yes`, `--revert`, `--json`
- the theme, font, terminal and status line components; manifest, backups and revert
- terminal writers for Windows Terminal, Terminal.app, GNOME Terminal, Ptyxis and Konsole, and manual steps for any other terminal
- `picket uninstall`
- tests per the spec's Testing section, on fixtures and a fake host

**Out:**
- spinner text, background images, anything else the spec excludes
- writing `~/.claude.json` or any project settings file (D-006 (r2))
- editing existing terminal profiles; writers for iTerm2, WezTerm, Kitty, Ghostty and Alacritty
- `status/hooks/band.ts`, `session/hooks/format.ts`, `.claude/bin/statusline.mjs`
- the manual test checklist, `CONTRIBUTING.md`, README and docs text (OQ-008)
- the records of `20261016-session-line-moves-to-the-status-line` and `20261017-statusline-rows-share-the-brand-style` (OQ-003)

## Phase 1: The two-group status line with icons, display width and caches

**Touch set:**
- `core/lib/statusline.mjs`: rows, layout, icons, width, probe
- `core/lib/styling/palette.mjs`: new; brand and ANSI hex
- `core/lib/git.mjs`: add `workingState`
- `core/bin/picket.mjs`: statusline verb passes icons, probe
- `test/kernel/statusline.test.mjs`: rewrite layout and paint tests
- `test/kernel/cli.test.mjs`: statusline verb tests, lines 111 to 147
- `test/kernel/git.test.mjs`: `workingState` states
- `test/kernel/statusline-input.json`: read only; has `display_name`
- `test/kernel/statusline-transcript.jsonl`: read only; skill source
- `core/lib/transcript.mjs`: read only; `readTail`

**Changes:**
- `palette.mjs` exports `BRAND` (orange `#F9782B`, shimmer `#FFB27A`, cream `#FDEFD4`, background `#0D0A08`, muted `#8C8072`, subtle `#4A4038`, border `#6B6158`, selection `#5A3A22`, success `#9CC46A`, error `#E5484D`, warning `#F5C04A`, barEmpty `#2E2620`, barText `#E9C9A0`), `ANSI` (the spec's 8 slots as `[normal, bright]`), `TERMINAL` (foreground, background, cursor, selection) and `rgb(hex): [r, g, b]`.
- `statusline.mjs` keeps `factsOf`, `cacheLeft`, `contextColor`, `levelColor`, `lastSkill`, `paint`, `compactTokens`, `untilReset`, `prettyModel`, `workspaceDir`, `EDGE_COLUMNS`, `renderStatusline`; it adds `layout(facts, { columns, icons }): Row[]`, `displayWidth(text)`, `iconsMode(home)` and `liveProbe({ cacheDir, now, readGit = workingState })` (D-001, D-002).
- `factsOf(input, { now, skill, git })`: model from `model.display_name`, else `prettyModel(model.id)`; `git` is `{ branch, state } | null`; effort `effort.level`, else `default`.
- `paint` writes `[bold, fg, bg]` codes with `38;2;r;g;b` and `48;2;r;g;b` from `palette.mjs`.
- Colours: `PICKET` cream bold, `AI` orange bold, ` >_` orange; folder cream; branch and its icon by state (D-002); model orange bold; effort cream; skill orange, `none` muted; limit labels and icons muted, percent by `levelColor`, reset dim; cache label or icon muted, tokens cream, countdown from `cacheLeft`; cost cream.
- `renderStatusline(input, { now, columns, icons = "plain", probe })`: `probe.git(dir)` and `probe.skill(transcriptPath)`; rows painted and joined with `\n`, no trailing spaces on a row without a right group.
- Removed from `statusline.mjs`: `wrap`, `BAR`, `brandLine`, `modelLine`, `usageLine`, `placeholder`, `bar`, `widthOf` and every `n/a`, `?`, `...`, `│` and `◆`.
- `git.mjs`: `workingState(root)` per D-002, never throws.
- `picket.mjs` statusline case: `renderStatusline(statuslineInput(), { now: Date.now(), columns: Number(process.env.COLUMNS), icons: iconsMode(homedir()), probe: liveProbe({ cacheDir: join(tmpdir(), "picket-statusline"), now: Date.now() }) })`; still exits 0 on any input.
- Test states built from the fixture with `workspace.current_dir` `D:/work/AISpec`: normal (the fixture); busy (5h 74, 7d 71, 120000 tokens at 60%, cache expiring in 3 minutes); hot (5h 93, 7d 91, 150000 tokens at 75%, `prompt_cache.warm` false).

**Done when:**
- **T-1.1** `statusline.test.mjs` shows the normal state at 150 columns, plain icons, git `{ branch: "trunk", state: "clean" }` and skill `picket:ordering` prints 2 rows; escapes stripped, row 1 matches `^  PICKETAI >_ +AISpec · ⎇ trunk$`, row 2 starts `  Opus 5.5 · high · picket:ordering   ` and ends `5h 42% (2h14m)   7d 71% (3d6h)    62k/200.0k 31%    cache 48k ◷ 52m   $4.12`, and both rows are exactly 148 display columns.
- **T-1.2** The same input prints 2 rows at 115 columns and 3 rows at 114 and at 80; at 80, row 2 ends `5h 42% (2h14m)   7d 71% (3d6h)` and row 3 is `   62k/200.0k 31% ` then padding then `cache 48k ◷ 52m   $4.12`; columns `NaN`, `0`, `-5`, `12.5` and `undefined` each print 3 rows of 78 display columns.
- **T-1.3** With `icons: "nerd"` at 150 columns, row 1 ends `\u{F07B} AISpec · \u{F418} trunk`; row 2 contains `\u{F250} 5h 42% \u{F0450} 2h14m`, `\u{F0A33} 7d 71% \u{F0450} 3d6h`, `\u{E0B6} 62k/200.0k 31% \u{E0B4}` and `\u{F01BC} 48k \u{F0150} 52m`, and no `(`; the hot state contains `\u{F0717} cold`. In both icon modes at 150 and 80, and with folder `数据`, every row with a right group is exactly `columns - 2` display columns.
- **T-1.4** `paint` writes `PICKET` with `1;38;2;253;239;212`, `AI` and `Opus 5.5` with `1;38;2;249;120;43`, `high` with `38;2;253;239;212`, `picket:ordering` with `38;2;249;120;43`, the separator ` · ` with `38;2;107;97;88`, and `(2h14m)` with `38;2;107;97;88`; the branch text is `249;120;43`, `245;192;74`, `156;196;106` and `229;72;77` for clean, unstaged, staged and conflict; the limit percent is green at 42, amber at 74 and red at 93.
- **T-1.5** In the normal state the bar's first 5 characters ` 62k/` carry `38;2;13;10;8;48;2;156;196;106` and the rest `38;2;233;201;160;48;2;46;38;32`; busy fills with `48;2;245;192;74` and shows `◷ 3m` in `38;2;245;192;74`; hot fills with `1;38;2;13;10;8;48;2;229;72;77` and shows `cold` with `1;38;2;229;72;77`. `compactTokens` gives `999`, `46k`, `99k`, `99.6k`, `200.0k`, `1.0M` and `1.5M` for 999, 46000, 99400, 99600, 200000, 999960 and 1500000.
- **T-1.6** Input `{}` with a probe returning null for git and skill, columns unknown, prints exactly `  PICKETAI >_` and `  default · none`; input with only `model` and `cost` prints no `5h`, `7d`, `cache` or bar; no state prints `n/a`, `?` or `...`.
- **T-1.7** `git.test.mjs` shows `workingState` returns `clean`, `unstaged`, `staged` and `conflict` in temp repos made with `git init -b main`, 7 hex characters as the branch when detached, and null outside a repo; `liveProbe` with a counting `readGit` calls it once for two calls 4 seconds apart and again at 6 seconds, and calls `lastSkill` once while the transcript size is unchanged.
- **T-1.8** `cli.test.mjs` shows `picket statusline` with the fixture exits 0 with empty stderr: 2 lines at `COLUMNS=150`, 3 lines with `COLUMNS` removed from the env, a line containing `\u{F0450}` when `HOME` and `USERPROFILE` point at a temp home whose `.picketai/config.json` is `{"statusline":{"icons":"nerd"}}`, and first line `  PICKETAI >_` for stdin `not json` and empty stdin. `npm test` passes.

## Phase 2: The setup engine, the manifest and the status line setting

**Touch set:**
- `core/lib/styling/host.mjs`: new; `realHost()`
- `core/lib/styling/manifest.mjs`: new; manifest, backups, removal
- `core/lib/styling/setup.mjs`: new; registry, `setupTerminal`, report
- `core/lib/styling/statusline-setting.mjs`: new; user `statusLine` component
- `core/lib/init.mjs`: export `STATUS_LINE`, line 15
- `core/bin/picket.mjs`: `setup-terminal` case, `Verbs:` list
- `core/lib/hooks/guard.bash.mjs`: verb into `KERNEL_OTHER_VERBS`, line 425
- `test/kernel/styling/host-fixture.mjs`: new; fake host for all phases
- `test/kernel/styling/setup.test.mjs`: new; engine and component tests
- `test/kernel/cli.test.mjs`: `setup-terminal` verb tests
- `test/hooks/handlers.test.mjs`: read only; verb-set test, line 291

**Changes:**
- `host.mjs`: `realHost()` returns the `Host` of D-003; `exec` is `spawnSync` returning `{ status, stdout, stderr }`; `ask` per D-005.
- `manifest.mjs`: `MANIFEST_VERSION = 1`, `manifestPath(home)`, `readManifest(host)`, `writeManifest(host, manifest)`, `backupFile(host, path, component): string`, `sha256File(path)`, and `removeItems(host, manifest, ids, components): Outcome[]` with `Outcome = { id, result: "restored" | "removed" | "kept" | "failed", detail?, manual? }`, applying D-004 in reverse install order and rewriting the manifest after each item.
- `statusline-setting.mjs`: component `statusline` over `<home>/.claude/settings.json` (plain JSON). `statusLine` absent: one change that sets `STATUS_LINE`. Equal to `STATUS_LINE`: no change. Any other value: one change with the question `Replace your status line "<command>" with Picket's?`. `previous` records the old value, or that the key was absent. `unapply` puts the old value back or deletes the key, leaving every other key. Invalid JSON fails the change and leaves the file.
- `setup.mjs`: `COMPONENTS` holds `statusline` for now (later phases put `theme`, `font`, `terminal` before it); `setupTerminal(host, { only, dryRun, yes, revert })` and `renderReport(report)` per D-003; `revert` calls `removeItems` over every item after one question.
- `picket.mjs`: `case "setup-terminal"` loads `setup.mjs` with `await import("../lib/styling/setup.mjs")`, maps `--dry-run`, `--yes`, `--revert`, `--json` and each `--<name>-only` of `COMPONENTS`; any other `--*-only` throws a usage error (exit 1). Text output by default; exit 2 when a change failed.
- `host-fixture.mjs`: `fakeHost({ platform, files?, env?, answers?, interactive?, exec?, fetch? })` over a temp home, with `answers` consumed in order and `exec` recording calls.

**Done when:**
- **T-2.1** `setup.test.mjs` shows `setupTerminal(fakeHost(), { yes: true })` on a temp home without `.claude/settings.json` creates it with `statusLine` deep-equal to `STATUS_LINE`, and writes a manifest with `version` 1 and one `created` item carrying a 64-hex `sha256`; a second run reports no change and leaves the settings and manifest bytes unchanged.
- **T-2.2** With settings `{"model":"x","statusLine":{"type":"command","command":"my-line"}}`, the answers `yes` then `no` leave the file byte-identical and write no manifest; `yes` then `yes` write Picket's `statusLine`, keep `model`, and leave a byte copy of the original at `.picketai/backups/<stamp>/statusline-settings.json`.
- **T-2.3** `--revert` after T-2.2 restores the settings file byte for byte and deletes the manifest and the backup folder; when the test adds `"env":{"A":"1"}` to the settings after setup, revert puts `my-line` back and keeps `env`.
- **T-2.4** `dryRun: true` leaves the temp home's file list unchanged and the report lists the planned change; a host with `interactive: false` and no `yes` writes nothing, and `renderReport` text ends with a line containing `--yes`.
- **T-2.5** Settings that are not valid JSON give a `failed` change with a detail, and the file is unchanged.
- **T-2.6** `cli.test.mjs` shows `picket setup-terminal --dry-run --statusline-only` with `HOME` and `USERPROFILE` at a temp home exits 0, prints the plan, and writes nothing; `--bogus-only` exits 1 with the message on stderr.
- **T-2.7** `setup-terminal` is in the `Verbs:` list and `KERNEL_OTHER_VERBS`, and `npm test` passes, the verb-set test in `test/hooks/handlers.test.mjs` included.

## Phase 3: The PicketAI Claude Code theme

**Touch set:**
- `core/themes/picketai.json`: new; plugin theme, the one copy
- `core/lib/styling/theme.mjs`: new; copy and `theme` setting
- `core/lib/styling/setup.mjs`: register `theme` first
- `test/kernel/styling/theme.test.mjs`: new; theme component tests
- `test/kernel/styling/host-fixture.mjs`: read only; fake host
- `core/.claude-plugin/plugin.json`: read only; no `themes` key needed

**Changes:**
- `core/themes/picketai.json`: the spec's Part 1 JSON as written (34 override tokens).
- `theme.mjs`: component `theme` per D-006 (r2), two changes. The file change targets `<home>/.claude/themes/picketai.json`: absent gives `created`, same bytes give no change, different bytes give the question `Replace <path>?` and `edited` with a backup. The setting change targets `theme` in `<home>/.claude/settings.json`: `custom:picketai` already there gives no change; otherwise the question `Make PicketAI your Claude Code theme?`, then an `edited` (or `created`) item with `previous` holding the old value or its absence. The plan names the theme in effect: the settings value, else `theme` from `<home>/.claude.json`, else `dark`.
- `unapply` of the setting: while the key reads `custom:picketai`, put back `previous` or delete the key, leaving every other key; any other value is kept.
- `setup.mjs`: `COMPONENTS` order becomes `theme`, `statusline`; `--theme-only` maps to it.

**Done when:**
- **T-3.1** `core/themes/picketai.json` parses with `name` `PicketAI`, `base` `dark`, 34 `overrides` keys equal to the spec's, `overrides.claude` `#F9782B`, and every value matching `^#[0-9A-F]{6}$`; `claude plugin validate core` exits 0.
- **T-3.2** `setupTerminal(host, { yes: true, only: ["theme"] })` on a temp home whose `.claude.json` holds `"theme": "dark"` creates `.claude/themes/picketai.json` byte-equal to `core/themes/picketai.json` and `.claude/settings.json` with `theme` `custom:picketai`, records the setting's `previous` as absent, and plans `dark` as the theme in effect; a second run changes nothing.
- **T-3.3** The answer `no` to the setting question copies the file, leaves `.claude/settings.json` byte-identical, and the report's `manual` contains `/theme`; a different `picketai.json` already in place stays byte-identical on `no`, and on `yes` it is backed up, replaced, and restored byte for byte by `--revert`.
- **T-3.4** `--revert` deletes an unchanged copied file, keeps an edited one with a `manual` step, and removes the `theme` key it added; with `previous` `"dark-ansi"` it puts `dark-ansi` back; after the test sets `theme` to `light`, revert keeps `light`.
- **T-3.5** After the test adds `"env":{"A":"1"}` to `.claude/settings.json`, revert removes only `theme` and keeps `env`; setup of `theme` and `statusline` on a home with a settings file, then `--revert --yes`, returns that file byte for byte; `.claude.json` keeps its bytes throughout.
- **T-3.6** `npm test` passes, and `picket setup-terminal --theme-only --dry-run` with a temp `HOME` and `USERPROFILE` exits 0 and names `picketai.json` and `custom:picketai` in its plan.

## Phase 4: JetBrainsMono Nerd Font Mono, pinned and verified

**Touch set:**
- `core/lib/styling/nerd-font.json`: new; pinned release and hash
- `core/lib/styling/zip.mjs`: new; central directory reader
- `core/lib/styling/font.mjs`: new; detect, download, install, remove
- `core/lib/styling/setup.mjs`: register `font` after `theme`
- `test/kernel/styling/zip.test.mjs`: new; reader tests
- `test/kernel/styling/font.test.mjs`: new; per-OS install tests
- `test/kernel/styling/host-fixture.mjs`: fake `reg`, `brew`, `fc-list`, `fetch`

**Changes:**
- `nerd-font.json`: `{ version, url, sha256, family, files }` per D-007 and OQ-004.
- `zip.mjs`: `readEntries(path): Entry[]` with `{ name, method, compressedSize, size, offset }` and `extractEntry(path, entry): Buffer`; zip64 and encrypted entries throw.
- `font.mjs`: `fontComponent(pin = readPin())` so tests pass their own pin; `detectFont(host): { present, where }`; the plan per D-007. A present font gives one change that only records the item with `preexisting: true`. A missing font gives one change that downloads, verifies, installs and records `{ kind: "external", data: { preexisting: false, via: "files" | "brew", files, registry } }`. The Windows value name is the family plus the file's style in words plus ` (TrueType)`, for example `JetBrainsMono Nerd Font Mono Bold (TrueType)` for `JetBrainsMonoNerdFontMono-Bold.ttf`.
- `unapply`: a preexisting font is `kept`; `brew` runs `brew uninstall --cask font-jetbrains-mono-nerd-font`; otherwise files are deleted one by one, then `reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts" /v <name> /f` runs per value on Windows and `fc-cache -f` on Linux; a file that cannot be deleted stays in the item with a `manual` step.
- Dry run and a second run fetch nothing. The cached zip is deleted after install and after a failed check.

**Done when:**
- **T-4.1** `zip.test.mjs` shows a zip built in the test (one stored and one deflated entry, made with `zlib.deflateRawSync`) reads back byte-equal entries, and an entry with the encryption flag throws.
- **T-4.2** `font.test.mjs` with a fake `fetch` serving a test zip whose hash is in the test pin: on `win32` only `JetBrainsMonoNerdFontMono-*.ttf` entries land in `<LOCALAPPDATA>/Microsoft/Windows/Fonts/`, each with one `reg add "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts" /v <name> /t REG_SZ /d <path> /f`; on `linux` they land in `$XDG_DATA_HOME/fonts/` followed by `fc-cache -f`; on `darwin` with `brew` the only install call is `brew install --cask font-jetbrains-mono-nerd-font`, and without it the files land in `~/Library/Fonts/`.
- **T-4.3** A served zip with one changed byte fails the change with a detail containing `sha256`, writes no font file and leaves no zip in `.picketai/cache/`; a `fetch` that rejects fails the change with the release URL and the target folder in `manual`, while the theme change in the same run still applies.
- **T-4.4** With the font present (fake `reg query` listing `JetBrainsMono Nerd Font Mono Regular (TrueType)`, `fc-list` printing the family, `brew list --cask font-jetbrains-mono-nerd-font` exiting 0), setup fetches nothing and records `preexisting: true`, and `--revert --yes` keeps the font.
- **T-4.5** `--revert --yes` of a Picket-installed font deletes its files and makes the per-OS removal calls named in Changes; a file the fake host refuses to delete gives a `failed` outcome with `manual`, and the other files are gone.
- **T-4.6** A second run and `--font-only --dry-run` call `fetch` zero times.
- **T-4.7** `nerd-font.json` holds a 64-hex `sha256` and a `url` under `https://github.com/ryanoasis/nerd-fonts/releases/download/`, and `npm test` passes.

## Phase 5: Terminal detection, Windows Terminal, manual steps and the icon switch

**Touch set:**
- `core/lib/vendor/jsonc-parser.mjs`: new; vendored, MIT header kept
- `core/lib/styling/terminal.mjs`: new; detection, component, icons item
- `core/lib/styling/terminals/windows-terminal.mjs`: new; `settings.json` writer
- `core/lib/styling/terminals/manual.mjs`: new; palette and steps text
- `core/lib/styling/setup.mjs`: register `terminal` after `font`
- `test/kernel/styling/terminal.test.mjs`: new; detection and writer tests
- `test/kernel/styling/fixtures/wt-comments.json`: new; comments, two schemes, trailing comma
- `test/kernel/styling/fixtures/wt-defaults.json`: new; defaults `colorScheme` `Campbell`
- `test/kernel/styling/fixtures/wt-profiles-array.json`: new; legacy array profiles
- `core/lib/vendor/shell-quote-parse.mjs`: read only; vendoring header pattern

**Changes:**
- `jsonc-parser.mjs`: Microsoft `jsonc-parser` (`parse`, `modify`, `applyEdits` and what they import) as one ESM file under its MIT header with the version, like `shell-quote-parse.mjs`.
- `terminal.mjs`: `detectTerminal(env, platform)` per D-008; component `terminal` delegating to `WRITERS[id]`, where a writer is `{ id, name, plan(host, manifest), unapply(item, host) }`; `other` maps to `manual.mjs`.
- `windows-terminal.mjs`: candidates under `%LOCALAPPDATA%`: `Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`, `Packages\Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe\LocalState\settings.json`, `Microsoft\Windows Terminal\settings.json`; each existing file is one `edited` item. The writer adds or replaces the `schemes` entry `PicketAI` (`name`, `foreground`, `background`, `cursorColor`, `selectionBackground`, `black` to `white` and `brightBlack` to `brightWhite` from `palette.mjs`). After the question `Make PicketAI the default for all Windows Terminal profiles?` it sets `profiles.defaults.colorScheme` and `profiles.defaults.font.face`, with `previous` holding the old values or their absence. `profiles` as an array, or no file found, gives a `manual` step and no write. Profiles in `profiles.list` that set their own `colorScheme` or `font.face` are named in `manual`. `unapply` removes the scheme and puts back or deletes the two defaults keys.
- `manual.mjs`: text with the 8 by 2 ANSI table, foreground, background, cursor, selection, the font family, and one line each for iTerm2, WezTerm, Kitty, Ghostty and Alacritty.
- Icons item: after a writer applied the font and `detectFont(host).present` is true, a change sets `statusline.icons` to `nerd` in `<home>/.picketai/config.json` (`created`, or `edited` with `previous`).

**Done when:**
- **T-5.1** `detectTerminal` returns `windows-terminal` for `WT_SESSION`, `terminal-app` for `TERM_PROGRAM=Apple_Terminal`, `konsole` for `KONSOLE_VERSION`, `gnome-terminal` for `GNOME_TERMINAL_SCREEN`, and `other` for `TERM_PROGRAM=iTerm.app`, `TERM_PROGRAM=WezTerm`, `KITTY_WINDOW_ID` and an empty env.
- **T-5.2** After setup with yes answers, `wt-comments.json` keeps every comment line byte for byte, parses with the vendored `parse`, has 3 schemes with PicketAI's `background` `#0D0A08`, and `profiles.defaults` holds `colorScheme` `PicketAI` and `font.face` `JetBrainsMono Nerd Font Mono`; a `no` to the default question adds the scheme only.
- **T-5.3** A second run changes nothing; `--revert` of an untouched file restores it byte for byte; after the test adds a profile, revert of `wt-defaults.json` removes the PicketAI scheme, puts `colorScheme` back to `Campbell`, and keeps the added profile.
- **T-5.4** A host with no settings file, and `wt-profiles-array.json`, each give a `manual` step and no write; a `profiles.list` entry with its own `colorScheme` is named in `manual`.
- **T-5.5** An env with no known terminal writes nothing, and the report text contains `#F9782B`, `#0D0A08`, `JetBrainsMono Nerd Font Mono` and `WezTerm`.
- **T-5.6** After a Windows Terminal change with the font present, `iconsMode(home)` returns `nerd`, and after `--revert` it returns `plain`; with no font present it stays `plain`.
- **T-5.7** `jsonc-parser.mjs` opens with the MIT licence naming Microsoft and the version, and `npm test` passes, `test/kernel/plugin-layout.test.mjs` included.

## Phase 6: Konsole, GNOME Terminal and Ptyxis

**Touch set:**
- `core/lib/styling/terminals/konsole.mjs`: new; colorscheme, profile, default
- `core/lib/styling/terminals/gnome-terminal.mjs`: new; dconf profile writer
- `core/lib/styling/terminals/ptyxis.mjs`: new; palette file and profile
- `core/lib/styling/terminals/ini.mjs`: new; one-key edit keeping lines
- `core/lib/styling/terminal.mjs`: register writers, Ptyxis marker
- `test/kernel/styling/linux-terminals.test.mjs`: new; three writers
- `test/kernel/styling/host-fixture.mjs`: fake `dconf` state

**Changes:**
- `konsole.mjs`: `created` items `${XDG_DATA_HOME:-~/.local/share}/konsole/PicketAI.colorscheme` (`[Background]`, `[BackgroundIntense]`, `[Foreground]`, `[ForegroundIntense]`, `[Color0]` to `[Color7]`, `[Color0Intense]` to `[Color7Intense]` as `Color=r,g,b`; `[General]` `Description=PicketAI`, `Opacity=1`) and `PicketAI.profile` (`[Appearance]` `ColorScheme=PicketAI`, `Font=JetBrainsMono Nerd Font Mono,11,-1,5,50,0,0,0,0,0`; `[General]` `Name=PicketAI`). After a question, `${XDG_CONFIG_HOME:-~/.config}/konsolerc` gets `[Desktop Entry]` `DefaultProfile=PicketAI.profile` through `ini.mjs`, as an `edited` item with `previous`.
- `ini.mjs`: `setKey(text, section, key, value)` and `removeKey(text, section, key)`, which change one line, add the section when missing, and keep every other byte.
- `gnome-terminal.mjs`: reads `/org/gnome/terminal/legacy/profiles:/list` and `/default` with `dconf read`, saves `dconf dump /org/gnome/terminal/legacy/profiles:/` as the item's backup, and writes a new profile `:<uuid>/` (`crypto.randomUUID()`): `visible-name`, `use-theme-colors false`, `foreground-color`, `background-color`, `palette` (16 values), `cursor-colors-set true`, `cursor-background-color`, `highlight-colors-set true`, `highlight-background-color`, `use-system-font false`, `font 'JetBrainsMono Nerd Font Mono 12'`. It appends the uuid to `list` and, after a question, sets `default`. `unapply` runs `dconf reset -f` on the profile path, removes only its uuid from `list`, and puts `default` back.
- `ptyxis.mjs` (formats per OQ-005, resolved): `created` `${XDG_DATA_HOME:-~/.local/share}/org.gnome.Ptyxis/palettes/picketai.palette` (`[Palette]` `Name=PicketAI`; `[Dark]` `Foreground`, `Background`, `CursorBackground`, `CursorForeground`, `Color0` to `Color15`); a new profile under `/org/gnome/Ptyxis/Profiles/<uuid>/` with `label 'PicketAI'` and `palette 'picketai'`, appended to `/org/gnome/Ptyxis/profile-uuids`. After the default question, `default-profile-uuid` is set with `previous`. After a separate question, `Use JetBrainsMono Nerd Font Mono in every Ptyxis profile?`, the app-wide `/org/gnome/Ptyxis/use-system-font false` and `font-name 'JetBrainsMono Nerd Font Mono 12'` are set as their own item with `previous` (D-008 (r2)).
- `terminal.mjs`: `PTYXIS_VERSION` gives `ptyxis`, checked before the GNOME Terminal variables.
- No `dconf` on the host gives a `manual` step and no write.

**Done when:**
- **T-6.1** Konsole setup in a temp XDG layout writes `PicketAI.colorscheme` with `Color=13,10,8` under `[Background]` and `Color=229,72,77` under `[Color1]`, and `PicketAI.profile` with `ColorScheme=PicketAI` and a line starting `Font=JetBrainsMono Nerd Font Mono,`; with yes to the default, `konsolerc` gains `DefaultProfile=PicketAI.profile` and keeps every other line byte for byte.
- **T-6.2** Konsole `--revert` deletes both files and restores `konsolerc` byte for byte; after the test adds a line to `konsolerc`, revert puts back only the previous `DefaultProfile` (or removes it) and keeps the added line.
- **T-6.3** GNOME setup against fake dconf with `list` `['abc']` and `default` `'abc'` writes every key in Changes, makes `list` `['abc', '<uuid>']`, sets `default` to `'<uuid>'` only after a yes, and writes a `palette` of 16 values starting `'#0D0A08'` and ending `'#FFFFFF'`.
- **T-6.4** GNOME `--revert` resets the profile path, returns `list` to `['abc']` and `default` to `'abc'`, and keeps a profile uuid the test added after setup.
- **T-6.5** Ptyxis setup writes the palette file with `Name=PicketAI`, `Background=#0D0A08` and `Color0` to `Color15`, and a profile with `palette 'picketai'`; `use-system-font` and `font-name` change only after a yes to the font question, and a `no` leaves both at their fake dconf values; `--revert` deletes the file and puts back `profile-uuids`, `default-profile-uuid`, `use-system-font` and `font-name`.
- **T-6.6** A second run changes nothing for each of the three, a host without `dconf` writes nothing and reports `manual`, and `npm test` passes.

## Phase 7: macOS Terminal.app

**Touch set:**
- `core/lib/styling/terminals/terminal-app.mjs`: new; profile, import, default
- `core/lib/styling/terminals/plist.mjs`: new; XML plist writer
- `core/lib/styling/terminal.mjs`: register the writer
- `test/kernel/styling/terminal-app.test.mjs`: new; writer tests
- `test/kernel/styling/host-fixture.mjs`: fake `osascript`, `defaults`, `open`

**Changes:**
- `terminal-app.mjs`: one `osascript -l JavaScript -e <script>` call prints JSON mapping each key to base64. The script archives `NSColor.colorWithSRGBRedGreenBlueAlpha` for each colour and `NSFont.fontWithNameSize` for the font (PostScript name per OQ-006, size 13), each with `NSKeyedArchiver.archivedDataWithRootObjectRequiringSecureCodingError(object, false, null)`. The keys are `BackgroundColor`, `TextColor`, `TextBoldColor`, `CursorColor`, `SelectionColor`, `ANSIBlackColor` to `ANSIWhiteColor`, `ANSIBrightBlackColor` to `ANSIBrightWhiteColor`, and `Font`.
- `plist.mjs`: `xmlPlist(dict)` for strings, numbers and `{ data: base64 }` values.
- The profile is written to `<home>/.picketai/terminal/PicketAI.terminal` (`created`) with `name` `PicketAI` and `type` `Window Settings`, then imported with `open <file>`. `defaults read com.apple.Terminal "Default Window Settings"` and `"Startup Window Settings"` fill `previous`. After a question, `defaults write com.apple.Terminal "Default Window Settings" -string PicketAI` and the same for `Startup Window Settings`.
- The report asks for a Terminal restart and notes that Terminal.app versions without 24-bit colour approximate the hex values.
- `unapply`: writes back both previous values (or runs `defaults delete` on a key that was absent), removes the `PicketAI` entry of `Window Settings` with one JXA script over the `NSUserDefaults` persistent domain `com.apple.Terminal`, and deletes the `.terminal` file.

**Done when:**
- **T-7.1** `xmlPlist` output for the profile has root keys `name` `PicketAI` and `type` `Window Settings` and 22 `<data>` values, each equal to the base64 the fake `osascript` returned for its key.
- **T-7.2** On a `darwin` host with `TERM_PROGRAM=Apple_Terminal` and yes answers, setup calls `osascript` once, writes the file, runs `open` on it, records `previous` `Basic` for both keys, and runs both `defaults write` calls with `PicketAI`.
- **T-7.3** A `no` to the default question writes and imports the profile and runs no `defaults write`.
- **T-7.4** `--revert` writes `Basic` back to both keys (or runs `defaults delete` when `previous` was absent), runs the removal script naming `PicketAI`, and deletes the file.
- **T-7.5** The report holds a Terminal restart entry and a `manual` note containing `24-bit`; a second run changes nothing.
- **T-7.6** `npm test` passes.

## Phase 8: `picket uninstall` asks before removing anything

**Touch set:**
- `core/lib/styling/uninstall.mjs`: new; listing, answers, removal report
- `core/lib/styling/setup.mjs`: share the removal summary with `--revert`
- `core/lib/styling/manifest.mjs`: read only; `removeItems`
- `core/bin/picket.mjs`: `uninstall` case, `Verbs:` list
- `core/lib/hooks/guard.bash.mjs`: verb into `KERNEL_OTHER_VERBS`
- `test/kernel/styling/uninstall.test.mjs`: new; the spec's uninstall cases
- `test/kernel/cli.test.mjs`: non-interactive uninstall

**Changes:**
- `uninstall(host, { yes }): Report` per D-005. The listing numbers each removable item by component and path, the font excluded. The answer is `all`, `none`, empty (keep) or numbers such as `1,3`; anything else is asked once more and then means keep. A Picket-installed font gets its own question, `Remove JetBrainsMono Nerd Font Mono? Other apps may use it.`, with fallback keep; a preexisting font is never listed.
- The report lists removed, kept, and failed items with `manual` steps, says whether a terminal restart is needed, and ends with `claude plugin uninstall picket@picketai` and `npm uninstall -g @picketai/picket` as commands to run by hand. No manifest gives "nothing to remove" and exit 0.
- `picket.mjs`: `case "uninstall"` loads `uninstall.mjs` by dynamic `import()`, maps `--yes` and `--json`, prints text by default, and exits 2 when any chosen removal failed.

**Done when:**
- **T-8.1** After setup of theme, status line, Windows Terminal and a Picket-installed font on a fake `win32` host, the answers `all` and `yes` remove every item, return `.claude/settings.json` and the Windows Terminal settings to their pre-setup bytes, and delete the manifest and backups.
- **T-8.2** The answer `1,3` removes only items 1 and 3, and the manifest keeps the others with their backups; the font answer `no` keeps the font item.
- **T-8.3** The answer `none`, an empty answer, and an `interactive: false` host without `yes` each remove nothing, leave the manifest byte-equal, and report that everything was kept.
- **T-8.4** After the test adds `"env":{"A":"1"}` to `.claude/settings.json`, uninstall of the status line puts the previous `statusLine` back and keeps `env`.
- **T-8.5** A preexisting font is never asked about or removed, even with `yes`; a Picket-installed font is removed with `yes`.
- **T-8.6** A fake `reg delete` that fails leaves the font item in the manifest with a `manual` step while the other chosen items are removed, and the CLI exits 2.
- **T-8.7** `cli.test.mjs` shows `picket uninstall` with non-TTY stdin and a temp home holding a manifest exits 0, removes nothing and prints `claude plugin uninstall picket@picketai`; `uninstall` is in `Verbs:` and `KERNEL_OTHER_VERBS`; `npm test` passes.

## Phase 9: Review fixes

**Touch set:**
- `core/lib/styling/manifest.mjs`: changed `created` goes through `unapply`, `blocks`, manual text
- `core/lib/styling/setup.mjs`: keep a copy before re-apply
- `core/lib/styling/uninstall.mjs`: one entry for both theme items
- `core/lib/styling/theme.mjs`: `blocks` for the theme copy
- `core/lib/styling/terminals/gnome-terminal.mjs`: failure manual with `dconf load`
- `test/kernel/styling/setup.test.mjs`: changed created files, re-apply copy
- `test/kernel/styling/theme.test.mjs`: blocked theme copy
- `test/kernel/styling/uninstall.test.mjs`: linked theme entry
- `test/kernel/styling/linux-terminals.test.mjs`: `konsolerc` and dconf failure cases
- `docs/how-to.md`: terminal styling section, removal line
- `CONTRIBUTING.md`: line 27, both vendored parsers
- `core/lib/styling/statusline-setting.mjs`: read only; `unapply` already keys-only
- `core/lib/styling/terminal.mjs`: read only; icons `unapply` already keys-only
- `core/lib/styling/terminals/konsole.mjs`: read only; `konsolerc` `unapply` already keys-only
- `docs/setup-terminal-checklist.md`: read only; the manual checklist (OQ-008)

**Changes:**
- `manifest.mjs` per D-004 (r2): `removeCreated` deletes on a matching hash and otherwise calls `component.unapply(item, host)`; `removeItem` first calls `component.blocks?.(item, host)`, and a reason gives `{ result: "kept", detail }` with the item left in the manifest. The failure fallback names `item.path` only when it is set: with only `backup` it reads `the state before setup is saved in <backup>`; with neither, `check <id> by hand`. An `err.manual` from the component still wins.
- `theme.mjs`: `blocks(item, host)` returns, for `theme-file`, a reason naming `/theme` and the previous theme while `<home>/.claude/settings.json` reads `custom:picketai`, else null.
- `gnome-terminal.mjs`: an `unapply` failure throws with `manual` `dconf load /org/gnome/terminal/legacy/profiles:/ < <backup>`.
- `setup.mjs` `applyEntry`: when an existing item's file exists with a hash other than `existing.sha256`, copy it to `<home>/.picketai/kept/<stamp>/<id>-<basename>` before `apply`; the change line's detail and the report's `manual` name the copy. Picket never deletes `kept/`.
- `uninstall.mjs` per D-005 (r2): the listing shows `theme-file` and `theme-setting` as one entry `Claude Code theme` with both paths; choosing it selects whichever of the two ids are in the manifest.
- `docs/how-to.md`: a `## Terminal styling` section before `## Updating`. It says what `picket setup-terminal` installs and lists its flags. It notes that setup asks before writing and needs a real terminal or `--yes`, and that the manifest is `~/.picketai/styling-manifest.json` with backups beside it. It covers `--revert`, and points to `docs/setup-terminal-checklist.md` for contributors. `## Removing Picket from a project` gains a first step: run `picket uninstall` to remove the styling.
- `CONTRIBUTING.md:27`: names both vendored parsers, `core/lib/vendor/shell-quote-parse.mjs` and `core/lib/vendor/jsonc-parser.mjs`.

**Done when:**
- **T-9.1** After setup creates `.claude/settings.json` (status line and theme setting), `.picketai/config.json` (icons) and `konsolerc`, and the test adds a user key to each, `--revert --yes` leaves each file with the user key and without Picket's key, every outcome is `removed`, and no `manual` names any of the three paths.
- **T-9.2** `theme.test.mjs`: removing `theme-file` alone through `removeItems` while settings read `custom:picketai` gives `kept` with a detail containing `/theme`, the copy stays, and the item stays in the manifest; after `theme-setting` is removed, the copy is deleted.
- **T-9.3** `uninstall.test.mjs`: after a full setup, the listing has one numbered line containing `Claude Code theme` and no separate `theme-file` or `theme-setting` line; choosing that number removes both items, and settings no longer read `custom:picketai`.
- **T-9.4** A second setup over a theme copy the test edited asks `Replace <path>?`; on `yes` the edited bytes are at `.picketai/kept/<stamp>/theme-file-picketai.json`, the report names that path, and the file is still there after `--revert --yes`.
- **T-9.5** A fake `dconf reset` that fails gives a `manual` containing `dconf load` and the dump path, and no `manual` or `detail` produced anywhere in `test/kernel/styling/` contains `undefined`.
- **T-9.6** [withdrawn] S-7 needs no change: the docs define `total_input_tokens` as the tokens now in the window (D-001 (r3)).
- **T-9.7** `CONTRIBUTING.md` names `core/lib/vendor/jsonc-parser.mjs`; `docs/how-to.md` names `picket setup-terminal`, `--revert`, `~/.picketai/styling-manifest.json` and `picket uninstall`; `npm test` passes, `test/markdown-paths.test.mjs` included.
- **T-9.8** Driven with `HOME` and `USERPROFILE` at a temp home: `picket setup-terminal --yes --theme-only --statusline-only`, a hand edit adding a key to `.claude/settings.json`, then `picket uninstall --yes`, leaves that key and no `statusLine` or `theme`, exit 0.

## Open questions

- **OQ-001** [resolved 2026-10-17] Themes are `~/.claude/themes/<slug>.json` or a plugin's `themes/` folder (2.1.118); every spec token is documented; settings key `theme` takes `custom:<slug>`. Applied in D-006 (r2).
- **OQ-002** [resolved 2026-10-17] Claude Code sets `COLUMNS` and `LINES` for the status line command, and stdin has no width field; the fallback as written holds.
- **OQ-003** Phase 1 replaces the staged, unapproved phase 1 of `20261017-statusline-rows-share-the-brand-style`, and the phase 1 grep `38;2;215;119;87` of `20261016-session-line-moves-to-the-status-line` already fails. Owner: lead. Fallback: phase 1 edits the staged files in place; the lead abandons the superseded item before routing phase 1 and notes the change at the 20261016 cumulative review.
- **OQ-004** Which `ryanoasis/nerd-fonts` release to pin and its SHA-256, checked against the checksum the release publishes. Owner: developer, in phase 4, stated in the phase report. Fallback: the latest release at implementation time, with the hash of the downloaded file and a note in the report when the release publishes no checksum.
- **OQ-005** [resolved 2026-10-17] Ptyxis reads `<data dir>/org.gnome.Ptyxis/palettes/<id>.palette`, sets `PTYXIS_VERSION`, and keeps font keys app-wide; Konsole under Qt 6 reads the ten-field `Font=` string. Applied in D-008 (r2) and phase 6.
- **OQ-006** Terminal.app: the PostScript name of the Mono font (`JetBrainsMonoNFM-Regular` assumed) and whether a running Terminal picks up `defaults write` before a restart. Owner: user, on a Mac, in the phase 7 live check. Fallback: the assumed name; the report asks for a Terminal restart.
- **OQ-007** [resolved 2026-10-17] Claude Code has no plugin install, disable or uninstall hook event; D-005 stands with `picket uninstall` as the only entry point.
- **OQ-008** [resolved 2026-10-17] The checklist is `docs/setup-terminal-checklist.md`, with the OQ-006 PostScript name check under macOS. The README documents no verbs, so the user text goes to `docs/how-to.md`; that and `CONTRIBUTING.md:27` are phase 9.
- **OQ-009** [open] The spec's "well under 100 ms" runtime is below Node's own start on Windows (about 90 ms here). Owner: user. Fallback: the D-002 caches and lazy imports, accepting the Node floor.

## Revision log
- 2026-10-17: D-006 (r2): plugin ships `core/themes/picketai.json`; setup copies it and sets user `theme` to `custom:picketai`; docs confirm plugin themes and the key.
- 2026-10-17: D-008 (r2): Ptyxis marker is `PTYXIS_VERSION`; app-wide Ptyxis font keys get their own question; OQ-005 answered from Ptyxis source.
- 2026-10-17: D-004 (r2): changed created files go through `unapply`; `blocks` guards removal; re-apply keeps a copy; review S-13 and two minors; fixed in phase 9.
- 2026-10-17: D-005 (r2): uninstall lists both theme items as one entry; review S-14 found the file removable alone; fixed in phase 9.
- 2026-10-17: D-001 (r2): context used comes from `current_usage`, never `total_input_tokens`; review S-7; right under either docs reading; fixed in phase 9.
- 2026-10-17: D-001 (r3): back to `total_input_tokens`; the docs define it as the tokens now in the window; S-7 dropped from phase 9.
