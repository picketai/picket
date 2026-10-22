# Manual test checklist: picket style

The unit tests run against a fake host, so they never touch a real registry, dconf, `defaults` or font cache. This checklist covers what only a real machine shows. Run it before a release that changes `picket style apply` or `picket style remove`, once per platform below, and note the platform, the terminal version and the Claude Code version with each result.

## Before every platform

- Use a user account you can reset, or note its current terminal settings by hand first.
- Install Claude Code 2.1.118 or later and the `picket` command, and run `picket init` in a test project.
- Run every command from the terminal under test itself, not through Claude Code's `!` prefix: setup asks questions only on a real terminal.

## Steps on every platform

1. `picket style apply --dry-run` lists the theme, font, terminal and status line changes and writes nothing: `~/.picketai/` does not exist afterwards.
2. `picket style apply` shows the same plan and asks before writing. Answer yes to everything. The summary names what changed, what needs a restart, and any manual steps.
3. Restart the terminal, open Claude Code in the test project, run `/theme` and check that PicketAI is selected. The prompt border is warm grey, Claude's accent colour (logo and spinner) is orange `#F9782B`, and the background stays the terminal's.
4. The status line shows `PICKETAI >_` on line 1 with the folder and branch at the right edge. In a wide window (about 150 columns) it has 2 lines; narrow the window to about 80 columns and it has 3. The folder and branch icons, the icons before `5h`, `7d` and the reset times, and the round caps on the context bar draw as single-width Nerd Font icons, not boxes or question marks, and the right edge does not wrap.
5. Make an unstaged change, then stage it, then create a merge conflict: the branch turns amber, green, then red within about 5 seconds each time.
6. Run `picket style apply` again: it reports nothing to change and asks nothing.
7. `picket style remove --all` asks once, then removes everything. After a terminal restart, the terminal looks as it did before step 2, `/theme` is back on the previous theme, and `~/.claude/settings.json` is byte for byte what it was. In a project where `picket init` set the status line, the project setting still shows it, now with plain icons.
8. Run setup again, then change one setting by hand in a file Picket edited (for example add a key to `~/.claude/settings.json`). `picket style remove`, answer `all` and yes to the font: your hand-made change is still there and every Picket entry is gone.
9. Run setup again, then `picket style remove` and answer `none`: nothing is removed and `~/.picketai/styling-manifest.json` is unchanged. Answer with one number: only that item is removed.
10. Unplug the network and run `picket style apply --only font` on an account without the font: the font change fails with the download link and the folder to copy into, and nothing else breaks.

## Windows 11 with Windows Terminal

- After step 2, `%LOCALAPPDATA%\Microsoft\Windows\Fonts` holds only `JetBrainsMonoNerdFontMono-*.ttf` files from Picket, and `reg query "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts"` lists one `JetBrainsMono Nerd Font Mono ... (TrueType)` value per file.
- Windows Terminal Settings, Color schemes, lists PicketAI. Defaults, Appearance, shows the PicketAI scheme and the font face JetBrainsMono Nerd Font Mono. Every comment in `settings.json` is still there.
- A profile with its own colour scheme keeps it, and the summary names that profile as a manual step.
- Check the Store, Preview and unpackaged installs you have: each `settings.json` gets the scheme.
- After step 7 the font files and registry values are gone, but only when Picket installed them.

## macOS with Terminal.app

- With Homebrew installed, step 2 runs `brew install --cask font-jetbrains-mono-nerd-font`; without it, the font files land in `~/Library/Fonts`.
- In Font Book, the PostScript name of JetBrainsMono Nerd Font Mono Regular is `JetBrainsMonoNFM-Regular`. If it differs, report it, because Terminal.app then falls back to another font.
- Terminal, Settings, Profiles, lists PicketAI with the font JetBrainsMono Nerd Font Mono 13, and it is the default and startup profile when you said yes.
- Note whether this Terminal.app shows the exact hex colours or approximates them (no 24-bit colour), and whether the new default applies before a restart.
- After step 7 the PicketAI profile is gone from the list, and the default and startup profiles are the ones from before.

## Ubuntu GNOME with GNOME Terminal

- Preferences lists a new PicketAI profile with the PicketAI palette, "Use colours from system theme" off, and the font JetBrainsMono Nerd Font Mono 12. Your other profiles are unchanged.
- `fc-list : family` lists JetBrainsMono Nerd Font Mono.
- After step 7, `dconf dump /org/gnome/terminal/legacy/profiles:/` shows no PicketAI profile, and the default profile is the one from before.

## Ubuntu GNOME with Ptyxis

- `~/.local/share/org.gnome.Ptyxis/palettes/picketai.palette` exists, and a new PicketAI profile uses the PicketAI palette.
- The font question says it changes every Ptyxis profile. Answer no once: the font stays the system font. Answer yes: every profile uses JetBrainsMono Nerd Font Mono 12.
- After step 7 the palette file is gone, the profile list and default profile are as before, and the font setting is back to its old value.

## KDE with Konsole

- `~/.local/share/konsole/PicketAI.colorscheme` and `~/.local/share/konsole/PicketAI.profile` exist. Settings, Manage Profiles, lists PicketAI with the PicketAI colour scheme and the font JetBrainsMono Nerd Font Mono 11.
- With yes to the default question, new Konsole windows open with PicketAI. Every other line of `~/.config/konsolerc` is unchanged.
- After step 7 both files are gone and `DefaultProfile` in `~/.config/konsolerc` is back to its old value or removed.
