---
kind: order
lane: order
title: Docs site layout like Zensical docs
date: 2026-11-21
audience: developer
sources: [request.md, preflight.txt, "user screenshot images/1.png (zensical.org/docs Get started page)", zensical.toml, docs-theme/partials/logo.html, docs/stylesheets/picketai.css, scripts/docs.mjs, test/repo/docs.test.mjs, test/repo/dashes.test.mjs, test/repo/names.test.mjs, src/themes/picketai.json, design/picketai-design-system/project/README.md, work/20261120-docs-site-with-zensical-on-pages/design.md, "zensical 0.1.3 wheel (config.py, bootstrap/zensical.toml, bootstrap/docs/index.md), read 2026-11-21", "zensical-ui 0.0.43 wheel (partials/path.html, path-item.html, tabs.html, nav-item.html, source.html, palette.html, toc.html, languages/en.html, .icons/lucide, bundle source facts), read 2026-11-21", "probe 2026-11-21: zensical 0.1.3 strict build of a scratch copy of docs/ with this record's config and front matter, podman python:3.13-slim", "gh repo view picketai/picket: PUBLIC, latestRelease null, 2026-11-21"]
phases:
  - n: 1
    files: [zensical.toml]
    greps:
      - path: zensical.toml
        pattern: '\{ "Get started" = "index\.md" \}'
      - path: zensical.toml
        pattern: '"Home"'
        absent: true
      - path: zensical.toml
        pattern: '"navigation\.tabs"'
      - path: zensical.toml
        pattern: '"navigation\.path"'
      - path: zensical.toml
        pattern: '"navigation\.footer"'
      - path: zensical.toml
        pattern: '"navigation\.sections"'
      - path: zensical.toml
        pattern: 'repo_url = "https://github\.com/picketai/picket"'
      - path: zensical.toml
        pattern: 'repo_name = "picketai/picket"'
    tests: true
    drive:
      - covers: T-1.6
        command: git diff --quiet 82bb29d9 -- docs-theme docs/stylesheets
        exit_code: 0
  - n: 2
    files: [docs/index.md, docs/how-to.md, docs/reference/agents.md, docs/reference/skills.md, docs/reference/cli.md, docs/reference/hooks.md, docs/reference/mods.md, scripts/docs.mjs, test/repo/docs.test.mjs]
    greps:
      - path: docs/index.md
        pattern: '^icon: lucide/rocket\b'
      - path: docs/how-to.md
        pattern: '^icon: lucide/book-open\b'
      - path: docs/reference/agents.md
        pattern: '^icon: lucide/bot\b'
      - path: docs/reference/skills.md
        pattern: '^icon: lucide/wand-sparkles\b'
      - path: docs/reference/cli.md
        pattern: '^icon: lucide/terminal\b'
      - path: docs/reference/hooks.md
        pattern: '^icon: lucide/webhook\b'
      - path: docs/reference/mods.md
        pattern: '^icon: lucide/puzzle\b'
      - path: scripts/docs.mjs
        pattern: 'lucide/terminal'
      - path: scripts/docs.mjs
        pattern: 'lucide/webhook'
      - path: scripts/docs.mjs
        pattern: 'lucide/puzzle'
    tests: true
    drive:
      - covers: T-2.4
        command: node scripts/docs.mjs && git diff --quiet -- docs/reference
        exit_code: 0
      - covers: T-2.5
        command: "git diff --numstat 82bb29d9 -- docs | awk '$1 != 4 || $2 != 0 { bad = 1 } END { exit (NR == 7 && !bad) ? 0 : 1 }'"
        exit_code: 0
---
# Order: Docs site layout like Zensical docs

## Problem

The user wants the documentation site laid out like Zensical's own docs (their screenshot of zensical.org/docs "Get started"): header with name, scheme switch, search and repository facts; top tabs; a left sidebar with page icons and group titles; a breadcrumb; "On this page" on the right; previous and next links in the footer. The Home entry becomes "Get started". Page content must not change, and the PicketAI colours, fonts and wordmark stay; the next item writes the content. Zensical 0.1.3 with zensical-ui 0.0.43 already renders every part of this layout from theme features and page metadata, which a strict probe build confirmed on a copy of `docs/`.

## Decisions

### D-001: The layout comes from Zensical theme features in zensical.toml, with no new template overrides
**Decision:** `[project.theme] features` gains `navigation.tabs` (the top tab row), `navigation.path` (the breadcrumb) and `navigation.footer` (previous and next links) beside the four it holds; `[project]` gains `repo_url = "https://github.com/picketai/picket"` and `repo_name = "picketai/picket"`, which put the repository link in the header (without `repo_name`, `config.py` names a github.com link "GitHub"). The search box and the right-hand table of contents titled "On this page" are already there: the modern variant is the default (`config.py:810`) and `partials/languages/en.html:61` sets the "toc" label to "On this page". The header keeps the wordmark override and the site name. This gives up what the screenshot shows beyond the request: sticky tabs, the page actions beside the title, tags and footer social links.
**Instead of:** overriding `partials/header.html`, `tabs.html` and `nav-item.html` to copy the screenshot closely: each is an upstream file marked "automatically generated - do not edit", and zensical 0.1.3 pins `zensical-ui==0.0.43`, so every override needs a re-check at each upgrade.
**Risks:**
- **RISK-001** The header's version comes only from `api.github.com/repos/picketai/picket/releases/latest` (the zensical-ui bundle's source facts), and the repository has tags up to `v1.0.0-alpha.6` but no GitHub release, so the version stays blank while stars and forks show. Mitigation: OQ-002.
- **RISK-002** The repository facts are fetched by each visitor's browser from the GitHub API, which limits unauthenticated calls per address. Mitigation: when a call fails, the header shows the name and link only; nothing else on the page depends on it.

### D-002: The three top-level nav entries stay as they are, Home renamed, and each becomes a tab
**Decision:** `nav` changes only `{ "Home" = "index.md" }` to `{ "Get started" = "index.md" }`; "How to install and use Picket" and "Reference" with its five pages keep their order, so the tabs read Get started, How to install and use Picket, Reference. The breadcrumb follows from `partials/path.html`: it renders only when the page's ancestors plus the homepage number more than one, so the five reference pages show "Get started > Reference" (probe) and the two top-level pages show none, as on Zensical's own Home page. `navigation.sections` stays, so a tab that holds a nested section shows its title as a group in the sidebar (probe with a nested "Generated" section under Reference); the current nav has no nested section, so no group title shows yet (OQ-003).
**Instead of:** regrouping the pages into two tabs (a "Get started" section holding the landing page and the how-to, then Reference) to match the screenshot's sidebar: it moves pages beyond the rename the user asked for, and the content item that comes next decides the page structure.

### D-003: Page icons live in each page's front matter, and the generator writes them for generated pages
**Decision:** each page in the nav starts with a front matter block `---`, `icon: lucide/<name>`, `---` and a blank line, the form Zensical's own starter page uses (`bootstrap/docs/index.md`); `partials/nav-item.html:19` renders `page.meta.icon` in the sidebar. The icons, all present in zensical-ui 0.0.43's `.icons/lucide/`: `index.md` rocket, `how-to.md` book-open, `reference/agents.md` bot, `reference/skills.md` wand-sparkles, `reference/cli.md` terminal, `reference/hooks.md` webhook, `reference/mods.md` puzzle. `cli.md`, `hooks.md` and `mods.md` are written by `scripts/docs.mjs`, so `cliPage`, `hooksPage` and `modsPage` emit the block as their first lines; a hand edit would fail the staleness test in `test/repo/docs.test.mjs`.
**Instead of:** an override of `partials/nav-item.html` holding a map from page path to icon: it puts page data in an upstream template (the D-001 objection) and leaves the pages' own metadata empty.
**Risks:**
- **RISK-003** An icon name with no file in `.icons/lucide/` breaks the template include. Mitigation: the seven names were checked against the 0.0.43 wheel and built in the probe; T-2.3's strict build catches a typo.

### D-004 (r2): The site stays dark only, with no light and dark switch
**Decision:** `[[project.theme.palette]]` keeps its single `slate` entry, so no scheme switch renders. The brand defines no light values: "There is no light theme: the brand only defines dark values." (`design/picketai-design-system/project/README.md:100`). The wordmark and selection rules in `docs/stylesheets/picketai.css` are not scoped to a scheme, and `text` #FDEFD4 on white measures 1.14:1 and `accent` #F9782B on white 2.71:1 (computed with the WCAG formula), against the brand's own 7:1 for body text and 4.5:1 for secondary text. The user ruled on 2026-11-21 to keep the site dark only, leave the switch out of the layout and add no light palette. This gives up the switch the screenshot shows.
**Instead of:** adding Zensical's default light scheme as a second palette entry with a toggle: the header wordmark would be near invisible on it, and choosing light colours is a brand decision, not a layout one.

## Scope

**In:**
- `zensical.toml`: the rename, three navigation features, `repo_url` and `repo_name`
- Icon front matter on the seven pages in the nav, the generator that writes three of them, and its tests

**Out:**
- Any change to page text, new pages, or a new nav structure beyond the rename
- The Pages workflow, the PicketAI colours, fonts and wordmark, and the generated stylesheet (unchanged under D-004)
- A light scheme and its switch (D-004, the user's ruling), a GitHub release for the version (OQ-002)
- Page actions, tags, footer social links and sticky tabs from the screenshot

## Phase 1: Tabs, breadcrumb, footer links and repository link

**Touch set:**
- `zensical.toml`: rename, features, repository link
- `docs-theme/partials/logo.html`: read only, wordmark stays
- `docs/stylesheets/picketai.css`: read only, colours stay

**Changes:** In `zensical.toml` `[project]`, add `repo_url = "https://github.com/picketai/picket"` and `repo_name = "picketai/picket"`, and change the first `nav` entry to `{ "Get started" = "index.md" }`; the other entries stay byte for byte. In `[project.theme]`, `features` becomes `navigation.tabs`, `navigation.sections`, `navigation.path`, `navigation.footer`, `navigation.top`, `search.highlight`, `content.code.copy`. Nothing else in the file changes: one palette, fonts, `custom_dir`, `extra_css`, `not_in_nav`. The before-image is the base `82bb29d9`. Build with the command in T-1.3 from the worktree root.

**Done when:**
- **T-1.1** `zensical.toml` names `{ "Get started" = "index.md" }` as the first nav entry and holds no `"Home"`; `git diff 82bb29d9 -- zensical.toml` shows only that line, the `features` line and the two added `repo_` lines.
- **T-1.2** `features` holds `navigation.tabs`, `navigation.path`, `navigation.footer`, `navigation.sections`, `navigation.top`, `search.highlight` and `content.code.copy`, and `[project]` holds `repo_url` and `repo_name` as in Changes.
- **T-1.3** `podman run --rm -v "$PWD":/w:Z -w /w docker.io/library/python:3.13-slim sh -c "pip install -q zensical==0.1.3 && zensical build --strict --clean"` exits 0 and prints `No issues found`.
- **T-1.4** In the built `site/index.html`, the `md-tabs` list holds three `md-tabs__item` entries reading Get started, How to install and use Picket, Reference in that order, the first with `md-tabs__item--active`; the header holds `md-search`, the three `picket-wordmark` spans, and an `md-source` link to `https://github.com/picketai/picket` reading `picketai/picket`; the body carries `data-md-color-scheme="slate"` and no other scheme.
- **T-1.5** In the built `site/reference/cli/index.html`, an `md-path` breadcrumb reads Get started then Reference before the page title, the table of contents is titled `On this page`, and the footer holds links labelled `Previous: Skills` and `Next: Hooks`; `site/index.html` holds `Next: How to install and use Picket`.
- **T-1.6** `git diff --quiet 82bb29d9 -- docs-theme docs/stylesheets` exits 0 (declared check), and the phase changes no file under `docs/`.
- **T-1.7** `TMPDIR=/tmp npm test` exits 0.
- **T-1.8** [DEFERRED: QA, the first Pages deploy after this item lands on trunk] The header on https://picketai.github.io/picket/ shows `picketai/picket` with its star and fork counts, and clicking it opens the GitHub repository.

## Phase 2: Page icons in the sidebar

**Touch set:**
- `docs/index.md`: add rocket icon front matter
- `docs/how-to.md`: add book-open icon front matter
- `docs/reference/agents.md`: add bot icon front matter
- `docs/reference/skills.md`: add wand-sparkles icon front matter
- `scripts/docs.mjs`: generated pages emit their icon
- `docs/reference/cli.md`: regenerated, terminal icon
- `docs/reference/hooks.md`: regenerated, webhook icon
- `docs/reference/mods.md`: regenerated, puzzle icon
- `test/repo/docs.test.mjs`: pins the generated front matter
- `docs/style-checklist.md`: read only, not in nav, no icon

**Changes:** Each of the four hand-written pages gains, before its first line, exactly four lines: `---`, `icon: lucide/<name>` (D-003 table), `---`, and an empty line; no other line changes. In `scripts/docs.mjs`, `cliPage`, `hooksPage` and `modsPage` keep their signatures and return text that starts with the same four lines naming `lucide/terminal`, `lucide/webhook` and `lucide/puzzle`, followed by the page exactly as today (the front matter as the first block given to `page()` yields that). The icon names are data beside the existing page constants. Run `npm run docs` and stage the three regenerated pages. Add one test that calls each of the three page functions and asserts its text starts with the four lines naming its icon, then its `# ` title. The before-image is the base `82bb29d9`.

**Done when:**
- **T-2.1** Each of the seven nav pages starts with `---`, `icon: lucide/<name>` per the D-003 table, `---` and an empty line, followed by the first line it had at `82bb29d9`; `docs/style-checklist.md` is unchanged.
- **T-2.2** A test in `test/repo/docs.test.mjs` asserts that `cliPage`, `hooksPage` and `modsPage` output starts with the front matter naming `lucide/terminal`, `lucide/webhook` and `lucide/puzzle` respectively, followed by `# Command reference`, `# Hooks` and `# Mods`.
- **T-2.3** The T-1.3 build exits 0 with `No issues found`, and the sidebar in the built `site/reference/cli/index.html` holds SVGs with the classes `lucide-rocket`, `lucide-book-open`, `lucide-bot`, `lucide-wand-sparkles`, `lucide-terminal`, `lucide-webhook` and `lucide-puzzle`.
- **T-2.4** `node scripts/docs.mjs` leaves `docs/reference` as staged (declared check).
- **T-2.5** `git diff --numstat 82bb29d9 -- docs` lists exactly seven files, each with 4 added and 0 deleted lines (declared check), so no page text and not the stylesheet changed.
- **T-2.6** `TMPDIR=/tmp npm test` exits 0, the staleness, dash and command-name checks over `docs/` included.

## Open questions

- **OQ-001** Answered 2026-11-21 by the user: dark only, no light and dark switch, no light palette (D-004 r2).
- **OQ-002** The header version reads the latest GitHub release, and `picketai/picket` has tags but no release. Should the release workflow (or a maintainer) publish GitHub releases for the alpha tags? Owner: the repository owner. Fallback: the header shows name, stars and forks without a version.
- **OQ-003** No tab holds a nested section, so the sidebar shows no group title like the screenshot's "Guides". Should the pages be grouped now (for example the landing page and the how-to under a "Get started" section), or when the content item adds pages? Owner: the product owner. Fallback: flat nav as in D-002; groups appear when the nav nests a section.

## Revision log
- 2026-11-21: D-004 (r2): user ruled dark only, no switch, no light palette; OQ-001 answered, phases unchanged
