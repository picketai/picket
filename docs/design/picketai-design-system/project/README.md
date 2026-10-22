# PicketAI

PicketAI is the look of Picket: a warm near-black terminal, fence cream text and one orange that marks what is active. It covers the Claude Code theme, the terminal profiles that `picket style apply` writes, the status line, the status band and the Markdown pane, and every page or mockup made about Picket.

The values come from `src/themes/picketai.json` (the Claude Code theme) and `src/lib/shared/styling/palette.mjs` (the terminal profiles). When those files change, this system changes with them.

## Principles

Dark first. The ground is `bg` #0D0A08, the same colour as the terminal, so the band never looks like a separate window. The Markdown pane and Claude Code's sidebar frame around it both paint `surface` #14110E, one step above the terminal, instead of the default grey; Claude Code's own one-column line on the pane's left is the only divider from the transcript, and the pane draws none. Code inside it sits on `surface-user` #1A1410.

One accent. `accent` #F9782B marks what is active or what you can act on: a command, a path, a link, the selected file, the agent that is working. If everything is orange, nothing is. Labels and elapsed times stay `inactive`. Every icon you can click (? ⧉ ✎) uses `accent-shimmer`, so it reads as a control without competing with the active state.

State has its own colours. `success`, `warning` and `error` only ever mean a state (staged, waiting for you, blocked). They are never decoration and never a second accent.

Follow the theme. Terminal UI asks Claude Code for a theme key, never a hex value, so a user on another theme gets that theme's colours. The table under Terminal roles names the key for each role.

## Voice

Plain English that a B2 reader follows. Lead with the answer or the action. Short paragraphs; a list only for things that are really a list.

No em dashes or en dashes anywhere, headings included. Write "10 to 15" for a range.

The product is **Picket**; the project and brand are **PicketAI**. "Harness" is an internal word and never appears in anything a user reads. Verdict tokens (`APPROVED`, `PHASE DONE`) are written exactly, in capitals.

## Colour roles

| Token | Value | Claude Code theme key | Use |
| --- | --- | --- | --- |
| `bg` | #0D0A08 | inverseText | Terminal, pane and band background |
| `surface` | #14110E | bashMessageBackgroundColor, composerSidebarBackground | The Markdown pane and its sidebar frame, pages |
| `text` | #FDEFD4 | text | Body text, headings in bold |
| `accent` | #F9782B | claude, suggestion, permission | Active and actionable |
| `accent-shimmer` | #FFB27A | claudeShimmer | Clickable icons, highlights, numbers in code |
| `inactive` | #8C8072 | inactive | Markers, footers, folders |
| `inactive-shimmer` | #B8AA96 | inactiveShimmer | Muted text on a highlighted row |
| `border` | #6B6158 | promptBorder | Rules, separators, frames |
| `subtle` | #4A4038 | subtle | Decoration only |
| `row-highlight` | #2E2620 | none | Selected and hovered rows |
| `edge` | #2A221C | none | The pane edge, panel borders |
| `selection` | #5A3A22 | selectionBg | Selected text |
| `success` | #9CC46A | success | Staged, low usage |
| `warning` | #F5C04A | warning | Waiting, your gate, from 70% |
| `error` | #E5484D | error | Blocked, conflicts, from 90% |

`row-highlight` and `edge` have no theme key, so terminal UI does not use them: the Markdown pane highlights rows with `surface-user-hover` (theme key userMessageBackgroundHover) and draws no edge of its own. Pages and mockups may use both.

## Terminal roles

How the status line, the status band and the Markdown pane colour each element.

| Element | Token |
| --- | --- |
| Body text, file names | `text` |
| Headings | `text`, bold |
| Inline code, commands, paths, links | `accent` (links underlined) |
| Selected file | `accent`, bold, on `surface-user-hover` |
| Hovered row | `surface-user-hover`, not bold |
| List numbers, bullets, footer | `inactive` |
| Clickable icons: ? ⧉ ✎ ← ◂ ▸ | `accent-shimmer` |
| Folders | `inactive` |
| Rules, separators, code frame | `border` |
| Pane background and sidebar frame | `surface` |
| Code block | `text` on `surface-user` |
| Active tab | `text`, bold, underlined (a terminal draws the underline in the text colour) |
| Inactive tab | `inactive` |
| Approved phase dot, working agent | `accent` |
| Open phase dot | `border` |
| Waiting agent, your gate | `warning` |
| Blocked | `error`, bold |

## Contrast

Body text needs 7:1 against its background, secondary text 4.5:1, lines and icons 3:1. Measured on `bg`: `text` 17.36, `accent` 7.28, `inactive` 5.12, `border` 3.27 (lines only), `subtle` 1.96 (decoration only). On `row-highlight`: `text` 13.06, `accent` 5.48, `inactive-shimmer` 6.53; `inactive` (3.85) and `error` (3.79) never sit on it.

## Type

Terminals use **JetBrainsMono Nerd Font Mono** 3.5.1, which `picket style apply` installs, with JetBrains Mono as the fallback. Every mockup of a terminal uses the `terminal` style at 13px with a line height of 1.65, so one character is one column.

Pages and artboards use **IBM Plex Sans**: `display` for the one title, `eyebrow` above it in `accent`, `body` in `inactive-shimmer`.

## Wordmark

The wordmark is type, not an image: `PICKET` in `text` bold, `AI` in `accent` bold, then ` >_` in `accent`. In a terminal it sits at the left of the status line's first row. There is no logo file.

## Glyphs

Terminal glyphs come from the Nerd Font, each with a plain Unicode fallback for any other font.

| Meaning | Nerd Font | Fallback |
| --- | --- | --- |
| Branch | U+F418 | ⎇ |
| Folder | U+F07B | none |
| Cache time | U+F0150 | ◷ |
| Lane | none | ▶ |
| Phase approved, open | none | ● ○ |
| Working, needs you | none | ⋯ ◀ |

## Not synced

There is no light theme: the brand only defines dark values. Font files are not copied here; the Nerd Font is downloaded at setup and JetBrains Mono and IBM Plex Sans load from Google Fonts. There are no logo or icon files. There are no components: the mods are terminal UI drawn by Claude Code, and their mockups live on the Picket status line canvas.
