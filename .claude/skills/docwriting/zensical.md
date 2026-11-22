# Zensical page pattern for the Picket site

Source: https://zensical.org/docs/get-started/ and its Markdown source (read 2026-11-22). That page says a lot and stays light; the pattern below is how.

## Page skeleton

```markdown
---
icon: lucide/package-open
---

# Get started

Two sentences: what this page gives the reader, and for whom.

## First section
```

- `icon` is a Lucide icon name and shows beside the page in the sidebar. Every page has one.
- One `#` title. Sections are `##`, with `###` for parts of a section. Go no deeper.
- A long heading gets a short sidebar label: `### Install with npx { data-toc-label="with npx" }`.

## Side content: admonitions

Anything that is not on the main path leaves the paragraph and goes in a box.

```markdown
!!! note "Prerequisites"

    Node 22 or newer and Claude Code.

!!! tip "Try it without installing"

    An optional path.

!!! warning "Alpha"

    A limit or a risk.

??? note "Collapsed until opened"

    Detail most readers skip.
```

Use `note` for prerequisites, `tip` for an optional or faster path, `warning` for a limit or a risk. At most one box in a section; a page of boxes is as heavy as a page of prose. Do not put a table of two or three short rows where a sentence says the same, and do not nest a box inside a tab.

## Variants: content tabs

```markdown
=== "Single repository"

    Steps for this case.

=== "Umbrella repository"

    Steps for that case.
```

Tabs are for cases where the reader needs exactly one branch: an operating system, a shell, a repository layout. When the content is the same in every tab, there is no tab.

## Code

- Fenced blocks carry a language: `sh`, `ps1`, `json`, `toml`, `text` for output.
- One command per purpose; expected output goes in its own `text` block after it.
- The copy button is on (`content.code.copy`).
- Annotations (`# (1)!` in the code and a numbered list under the block) need the theme feature `content.code.annotate`, which `zensical.toml` does not list yet. Add it before the first use.

## Other features

| Feature | Syntax | Use it for |
|---|---|---|
| Footnote | `term[^1]` and `[^1]: text` | a definition that would interrupt the sentence |
| Card grid | `<div class="grid cards" markdown>` around a list | a landing page that offers a few ways in |
| Icon | `:lucide-rocket:` | a tab label or a card title, sparingly |
| Diagram | a fenced `mermaid` block | one flow that prose cannot carry |
| Keys | `++ctrl+k++` | a keyboard shortcut |
| Table | a pipe table | values the reader compares or looks up |

## What renders here

Probed on 2026-11-22 with Zensical 0.1.3 and no `markdown_extensions` section in `zensical.toml`: admonitions, collapsible blocks, content tabs, footnotes, card grids, icon shortcodes, Mermaid diagrams, task lists, keys, highlighted text and `data-toc-label` all come out of the build with the defaults. A Mermaid diagram is drawn by the browser, and that drawing was not checked: look at the first diagram in the preview before publishing it. Adding a `markdown_extensions` section replaces those defaults, so list every extension in use when one is added. Probe again after a Zensical upgrade.

## Layout in use

The theme features in `zensical.toml` give top tabs, a sidebar with sections, a breadcrumb, previous and next links, a back-to-top button and search highlighting. Each top-level `nav` entry is a tab; the pages nested under it are that tab's sidebar. The site is dark only by the user's ruling of 2026-11-21. The header shows no version until the repository has a GitHub release.

## Links

Link to another page by its relative Markdown path (`[Commands](reference/cli.md)`), and to a file outside `docs/` by its GitHub URL. The strict build fails on a link to a page that does not exist.
