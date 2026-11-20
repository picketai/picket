---
kind: design
lane: design
title: Docs site with Zensical on Pages
date: 2026-11-20
audience: developer
sources: [request.md, preflight.txt, docs/design/README.md, docs/design/picketai-design-system/project/README.md, docs/design/picketai-design-system/project/tokens.json, src/themes/picketai.json, src/lib/shared/styling/palette.mts, docs/how-to.md, README.md, CONTRIBUTING.md, .gitignore, .github/workflows/release.yml, scripts/docs.mjs, scripts/build.mjs, test/repo/docs.test.mjs, test/repo/markdown-paths.test.mjs, test/repo/dashes.test.mjs, test/repo/names.test.mjs, test/repo/release.test.mjs, "zensical 0.1.3 wheel from PyPI (main.py, config.py, bootstrap/zensical.toml, bootstrap/.github/workflows/docs.yml), read 2026-11-20", "zensical-ui 0.0.43 wheel (partials/logo.html, partials/header.html, base.html, modern palette and main CSS), read 2026-11-20", "probe 2026-11-20: zensical 0.1.3 strict build of a scratch copy of docs/ with this record's config, in podman python:3.13-slim", "git ls-remote --tags of actions/checkout, setup-python, configure-pages, upload-pages-artifact, deploy-pages, 2026-11-20"]
phases:
  - n: 1
    files: [design/, design/README.md, design/picketai-design-system/project/README.md, docs/how-to.md]
    greps:
      - path: design/README.md
        pattern: '`design/picketai-design-system/project/tokens\.json`'
      - path: design/README.md
        pattern: '\bdocs/design\b'
        absent: true
      - path: docs/how-to.md
        pattern: '\]\(https://github\.com/picketai/picket/blob/trunk/CHANGELOG\.md\)'
      - path: docs/how-to.md
        pattern: '\.\./CHANGELOG\.md'
        absent: true
    tests: true
    drive: false
    security: false
  - n: 2
    files: [zensical.toml, docs/index.md, docs/stylesheets/picketai.css, docs-theme/partials/logo.html, scripts/docs.mjs, test/repo/docs.test.mjs, .gitignore]
    greps:
      - path: zensical.toml
        pattern: 'site_name = "Picket"'
      - path: zensical.toml
        pattern: 'site_url = "https://picketai\.github\.io/picket/"'
      - path: zensical.toml
        pattern: 'custom_dir = "docs-theme"'
      - path: zensical.toml
        pattern: 'scheme = "slate"'
      - path: zensical.toml
        pattern: 'IBM Plex Sans'
      - path: zensical.toml
        pattern: 'stylesheets/picketai\.css'
      - path: docs-theme/partials/logo.html
        pattern: 'PICKET'
      - path: scripts/docs.mjs
        pattern: 'src/themes/picketai\.json'
      - path: scripts/docs.mjs
        pattern: 'docs/stylesheets/picketai\.css'
      - path: docs/stylesheets/picketai.css
        pattern: '--md-default-bg-color'
      - path: docs/stylesheets/picketai.css
        pattern: '--md-typeset-a-color'
      - path: .gitignore
        pattern: '^/?site/'
      - path: docs/index.md
        pattern: '\]\(how-to\.md\)'
    tests: true
    drive:
      - covers: T-2.4
        command: node scripts/docs.mjs && git ls-files --error-unmatch docs/stylesheets/picketai.css && git diff --quiet -- docs/stylesheets/picketai.css
        exit_code: 0
      - covers: T-2.5
        command: git check-ignore -q site/index.html
        exit_code: 0
    security: false
  - n: 3
    files: [.github/workflows/docs.yml]
    greps:
      - path: .github/workflows/docs.yml
        pattern: '\btrunk\b'
      - path: .github/workflows/docs.yml
        pattern: 'zensical==0\.1\.3'
      - path: .github/workflows/docs.yml
        pattern: 'zensical build --strict'
      - path: .github/workflows/docs.yml
        pattern: 'uses:\s*[^\s@]+@(?![0-9a-f]{40}\b)'
        absent: true
      - path: .github/workflows/docs.yml
        pattern: 'pages: write'
      - path: .github/workflows/docs.yml
        pattern: 'id-token: write'
      - path: .github/workflows/docs.yml
        pattern: 'contents:\s*write'
        absent: true
      - path: .github/workflows/docs.yml
        pattern: 'actions/upload-pages-artifact@[0-9a-f]{40}'
      - path: .github/workflows/docs.yml
        pattern: 'actions/deploy-pages@[0-9a-f]{40}'
      - path: .github/workflows/docs.yml
        pattern: 'name: github-pages'
    tests: true
    drive: false
    security: true
---
# Design: Docs site with Zensical on Pages

## Problem

Picket has a how-to and five reference pages under `docs/` but no published site, and the guides that follow need one. The request fixes the tool (Zensical, pinned to 0.1.3), the host (GitHub Pages, deployed from `trunk`), the site name and URL, and asks that the site look like Picket by using the PicketAI design system. Two things in `docs/` block publishing it as it is: `docs/design/` holds private design snapshots that would go public, and `docs/how-to.md:374` links `../CHANGELOG.md`, which lies outside the docs folder; a probe build of a scratch copy with `zensical build --strict` stops on exactly that link ("page does not exist", `RuntimeError: Aborted because --strict flag is set`). The design system's values come from `src/themes/picketai.json` (`docs/design/README.md:18`), and the brand book says there is no light theme and no logo file (`docs/design/picketai-design-system/project/README.md`, sections Wordmark and Not synced).

## Decisions

### D-001: The site's colours are generated from the PicketAI theme file
**Decision:** Infrastructural decision. `npm run docs` (`scripts/docs.mjs`) gains one more generated file, `docs/stylesheets/picketai.css`, written from `src/themes/picketai.json` through a fixed table that maps each Zensical colour variable to a theme key (`--md-default-bg-color` from `inverseText`, the token `bg`, and so on, listed in Phase 2). The theme file stays the one copy of every colour, as `docs/design/README.md:18` asks, and the existing test "the generated pages are what git has" (`test/repo/docs.test.mjs:87`) catches a theme edit whose stylesheet was not regenerated. The maintenance cost: a theme change now also needs `npm run docs` and the stylesheet staged, as the reference pages already do.
**Instead of:** a hand-written stylesheet with the hex values copied in: it is simpler to read, but it is a second copy of every colour that drifts silently when the theme changes.
**Risks:**
- **RISK-001** `npm run build` now writes into `docs/stylesheets/` too, so a build in a worktree with a changed theme leaves a modified CSS file. Mitigation: the same staleness test that covers the reference pages fails with `run npm run docs and stage it`.

### D-002: One dark scheme, Zensical's slate recoloured, no light toggle
**Decision:** Infrastructural decision. `zensical.toml` declares a single `[[project.theme.palette]]` entry with `scheme = "slate"`, `primary = "custom"` and `accent = "custom"`, and the generated stylesheet overrides the slate variables under `[data-md-color-scheme="slate"]`. Slate already sets every derived dark value (code highlighting, tables, admonitions), so the stylesheet only replaces the brand colours. The brand defines dark values only ("There is no light theme"), so there is no toggle.
**Instead of:** Zensical's starter palette of three entries (system, light, dark): the light scheme would need colours the brand does not have.
**Risks:**
- **RISK-002** A reader whose system asks for a light scheme still gets a dark page. Mitigation: that is the brand's choice; a light scheme is a design system change first.

### D-003: The wordmark is type, drawn by a one-file template override
**Decision:** Infrastructural decision. `docs-theme/partials/logo.html` replaces zensical-ui's `partials/logo.html` (set with `custom_dir = "docs-theme"`) and renders the brand book's wordmark as text: `PICKET` in `text` bold, `AI` in `accent` bold, then ` >_` in `accent`, as three spans the generated stylesheet colours. The header's `aria-label` and title stay `site_name` "Picket". The maintenance cost: the override shadows a theme partial, so a Zensical upgrade must check that `partials/logo.html` is still the include the header uses (it is in zensical-ui 0.0.43, which zensical 0.1.3 pins exactly).
**Instead of:** an image logo: the brand book says "There is no logo file", and the only image in reach, the untracked `assets/Pixel Corgi PicketAI Logo.png`, is not part of the design system (OQ-001).

### D-004: Pages take IBM Plex Sans and JetBrains Mono from Google Fonts
**Decision:** Infrastructural decision. `[project.theme.font]` sets `text = "IBM Plex Sans"` and `code = "JetBrains Mono"`, the brand book's page face and the terminal face's fallback; zensical-ui's `base.html` loads both from Google Fonts, as the brand book says they load.
**Instead of:** self-hosting the font files under `docs/`: it avoids a third-party request but adds binary files the brand book chose not to keep.
**Risks:**
- **RISK-003** Each page view requests fonts from Google. Mitigation: none in this item; self-hosting is a later change to `font = false` plus local files.

### D-005: `docs/design/` moves to `design/` at the repository root
**Decision:** Infrastructural decision. `git mv docs/design design` keeps the 15 files and their history; only `design/README.md` changes, its `docs/design/` paths becoming `design/`. `docs/` then holds exactly what the site publishes.
**Instead of:** leaving the folder and adding `exclude_docs = "design/"` to `zensical.toml`: one deleted config line would then publish private snapshots, and the request asks for the move.
**Risks:**
- **RISK-004** `docs/design/` leaves the dash and name scans of `test/repo/dashes.test.mjs` and `test/repo/names.test.mjs`, which read `docs/` only. Mitigation: the snapshots are copies of artifacts, not Picket's own docs, and `test/repo/markdown-paths.test.mjs` still scans the two moved README files.

### D-006: The changelog link points at the file on GitHub
**Decision:** Infrastructural decision. `docs/how-to.md:374` links `https://github.com/picketai/picket/blob/trunk/CHANGELOG.md`. The repository's link check skips web links (`test/repo/docs.test.mjs:165`) and Zensical's strict build no longer fails on it.
**Instead of:** copying or including `CHANGELOG.md` into the site: a second copy, or a build-time include that couples the site to a file outside `docs/`.

### D-007: One Pages job, actions pinned to commits, Zensical pinned to 0.1.3
**Decision:** Infrastructural decision. `.github/workflows/docs.yml` runs on pushes to `trunk`, in one job: configure Pages, check out, set up Python 3.13, `pip install zensical==0.1.3`, `zensical build --strict --clean`, upload `site`, deploy. Every action is pinned to a commit SHA, as `.github/workflows/release.yml` pins `actions/checkout`. The workflow holds `contents: read`; the job adds `pages: write` and `id-token: write`, which the Pages deployment needs. The first deploy publishes the site to the web, where it can be cached and indexed [IRREVERSIBLE]; enabling Pages and that push are the user's (out of scope), and Phase 3 captures the file list a build publishes before then.
**Instead of:** pushing the built site to a `gh-pages` branch: it needs `contents: write` and a branch of build output in the repository.
**Risks:**
- **RISK-005** zensical 0.1.3 pins `zensical-ui==0.0.43` but leaves `markdown`, `pymdown-extensions`, `pygments` and its other dependencies open, so a later run can resolve newer ones. Mitigation: `--strict` stops a build that newly warns; a lock file is a later change.
- **RISK-006** A push before Pages is enabled with the source "GitHub Actions" fails at the configure step. Mitigation: the user enables Pages first, then reruns or pushes.

## Scope

**In:**
- Moving `docs/design/` to `design/` and fixing its README's paths
- The changelog link in `docs/how-to.md`
- `zensical.toml`, `docs/index.md`, the wordmark override, the generated stylesheet and its generator, `site/` in `.gitignore`
- `.github/workflows/docs.yml`

**Out:**
- Documentation content beyond the landing page
- Enabling GitHub Pages in the repository settings and the first push (the user's)
- Changes to the harness (agents, skills, hooks, kernel)
- A light scheme, a logo image, a favicon, self-hosted fonts

## Phase 1: Move the design snapshots out of docs/ and fix the changelog link

**Touch set:**
- `docs/design/`: moves whole to `design/`
- `design/README.md`: paths rewritten after the move
- `design/picketai-design-system/project/README.md`: moves unchanged, still scanned
- `docs/how-to.md`: changelog link at line 374
- `test/repo/markdown-paths.test.mjs`: read only, scans moved READMEs
- `test/repo/docs.test.mjs`: read only, link check rules

**Changes:** Run `git mv docs/design design`. In `design/README.md`, every `docs/design/` path becomes `design/` (lines 14, 16), and the refresh example becomes "refresh design/ from its two artifacts" (line 22); nothing else in the 15 files changes. In `docs/how-to.md:374`, `[changelog](../CHANGELOG.md)` becomes `[changelog](https://github.com/picketai/picket/blob/trunk/CHANGELOG.md)`. The block lists `docs/design/` so the route commits the deletions with the additions.

**Done when:**
- **T-1.1** `git ls-files docs/design` prints nothing and `git ls-files design | wc -l` prints 15.
- **T-1.2** Against the item base `0ef89b05` (the before-image), `git diff -M --name-status 0ef89b05 -- docs/design design` (with `--cached` while staged) shows 15 rename rows: 14 `R100` and one for `design/README.md`, the only file whose content changed.
- **T-1.3** `design/README.md` cites `design/picketai-design-system/project/tokens.json` and holds no `docs/design`.
- **T-1.4** `docs/how-to.md` links `https://github.com/picketai/picket/blob/trunk/CHANGELOG.md` and holds no `../CHANGELOG.md`.
- **T-1.5** `git grep -n "docs/design" -- . ':!work' ':!artifacts' ':!.claude/agent-memory' ':!src/lib/util/yaml-lite-corpus.test.json'` prints nothing (on the base it prints three lines, all in `docs/design/README.md`).
- **T-1.6** `TMPDIR=/tmp npm test` exits 0, `test/repo/markdown-paths.test.mjs` and `test/repo/docs.test.mjs` included.

## Phase 2: The Zensical site in the PicketAI look

**Touch set:**
- `zensical.toml`: new, site, nav and theme
- `docs/index.md`: new landing page
- `docs/stylesheets/picketai.css`: new, generated brand colours
- `docs-theme/partials/logo.html`: new, wordmark as type
- `scripts/docs.mjs`: writes the stylesheet too
- `test/repo/docs.test.mjs`: stylesheet tests beside the staleness test
- `.gitignore`: ignore the built `site/`
- `src/themes/picketai.json`: read only, the colour source
- `design/picketai-design-system/project/README.md`: read only, roles, type, wordmark
- `scripts/build.mjs`: read only, already calls `writeReferencePages`

**Changes:** `zensical.toml` at the root, under `[project]`: `site_name = "Picket"`, `site_url = "https://picketai.github.io/picket/"`, a short `site_description`, `nav` of Home (`index.md`), "How to install and use Picket" (`how-to.md`) and a Reference section with the five `reference/*.md` pages in README order, `not_in_nav = "style-checklist.md"` (a string; a list fails with "'not_in_nav' must be a str"), `extra_css = ["stylesheets/picketai.css"]`. Under `[project.theme]`: `custom_dir = "docs-theme"`, `language = "en"`, `features` at most `navigation.sections`, `navigation.top`, `search.highlight`, `content.code.copy`; `[project.theme.font]` per D-004; one `[[project.theme.palette]]` per D-002. Every key here was built in the probe with `--strict` and no issue.

`docs-theme/partials/logo.html` renders three spans with the classes `picket-wordmark__name` (`PICKET`), `picket-wordmark__ai` (`AI`) and `picket-wordmark__prompt` (` &gt;_`, escaped), inside one `picket-wordmark` span; no comment lines.

`scripts/docs.mjs` exports `SITE_STYLESHEET = "docs/stylesheets/picketai.css"` and `siteStylesheet(theme)`, which takes the parsed theme file (`{ overrides: Record<string, string> }`) and returns the CSS text. It throws an error naming the theme key when `overrides` lacks one the table needs. `referencePages()` gains `{ path: SITE_STYLESHEET, text: siteStylesheet(<parsed src/themes/picketai.json>) }`, so `writeReferencePages`, the build and the staleness test take it with no other change. The first line may be a generated-file banner naming `npm run docs` and the theme file. The table, as data, under `[data-md-color-scheme="slate"]`:

| Property | Theme key | Token |
| --- | --- | --- |
| `--md-default-bg-color` | `inverseText` | bg |
| `--md-default-fg-color`, `--md-typeset-color`, `--md-primary-bg-color`, `--md-code-fg-color` | `text` | text |
| `--md-default-fg-color--light` | `inactiveShimmer` | inactive-shimmer |
| `--md-default-fg-color--lighter` | `inactive` | inactive |
| `--md-default-fg-color--lightest` | `subtle` | subtle |
| `--md-primary-fg-color` | `bashMessageBackgroundColor` | surface |
| `--md-accent-fg-color` | `claudeShimmer` | accent-shimmer |
| `--md-typeset-a-color` | `claude` | accent |
| `--md-code-bg-color` | `userMessageBackground` | surface-user |

Then `::selection` takes `selectionBg` as its background, `.picket-wordmark__name` takes `text` bold, `.picket-wordmark__ai` `claude` bold, `.picket-wordmark__prompt` `claude`. Run `npm run docs` and stage the stylesheet.

`docs/index.md`: a title, two or three sentences on what Picket is (from `README.md:3`), the install line `npx @picketai/picket@alpha init` in a fenced block, and relative links to `how-to.md` and the five reference pages. No en or em dash; any `picket` command named is a real verb. `.gitignore` gains `site/` in its build group; Zensical's `.cache/` ignores itself (it writes `.cache/.gitignore` holding `*`).

**Done when:**
- **T-2.1** `podman run --rm -v "$PWD":/w:Z -w /w docker.io/library/python:3.13-slim sh -c "pip install -q zensical==0.1.3 && zensical build --strict --clean"` exits 0 and prints `No issues found` (about 7 s on this machine).
- **T-2.2** In the built `site/index.html`, the body carries `data-md-color-scheme="slate"` and `data-md-color-primary="custom"`, the head links `stylesheets/picketai.css` and a Google Fonts URL holding `IBM+Plex+Sans` and `JetBrains+Mono`, and the header holds `PICKET`, `AI` and `&gt;_` in the three wordmark spans.
- **T-2.3** A test in `test/repo/docs.test.mjs` named for the rule feeds `siteStylesheet` a theme whose keys hold distinct values and asserts each row of the table: the property is declared with its key's value (`--md-default-bg-color` with the `inverseText` value), and the three wordmark classes and `::selection` take theme keys `text`, `claude`, `claude` and `selectionBg`.
- **T-2.4** `node scripts/docs.mjs` leaves `docs/stylesheets/picketai.css` as git has it (declared check).
- **T-2.5** `git check-ignore -q site/index.html` exits 0, and after T-2.1 `git status --porcelain` lists nothing under `site/` or `.cache/`.
- **T-2.6** A test asserts `siteStylesheet` throws an error naming `claude` when the theme's `overrides` lack that key.
- **T-2.7** `TMPDIR=/tmp npm test` exits 0, with the docs link, dash and command checks now reading `docs/index.md`.

## Phase 3: Publish to GitHub Pages from trunk

**Touch set:**
- `.github/workflows/docs.yml`: new, build and deploy
- `.github/workflows/release.yml`: read only, pin and permissions style
- `zensical.toml`: read only, the build's config

**Changes:** `.github/workflows/docs.yml`, `name: docs`, `on: push: branches: [trunk]`, workflow `permissions: contents: read`, `concurrency: { group: pages, cancel-in-progress: false }`. One job `deploy` on `ubuntu-latest` with `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }` and job `permissions` `contents: read`, `pages: write`, `id-token: write`. Steps in order: configure Pages, checkout, setup Python with `python-version: "3.13"`, `pip install zensical==0.1.3`, `zensical build --strict --clean`, upload with `path: site`, deploy with `id: deployment`. This is the shape of Zensical 0.1.3's own starter workflow (`bootstrap/.github/workflows/docs.yml`), pinned. Pins, read with `git ls-remote --tags` on 2026-11-20 (re-read before writing, and keep a trailing tag comment out: the `comments` rule):

| Action | Tag | Commit |
| --- | --- | --- |
| `actions/checkout` | v5.1.0, as in release.yml | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` |
| `actions/setup-python` | v6.3.0 | `ece7cb06caefa5fff74198d8649806c4678c61a1` |
| `actions/configure-pages` | v6.0.0 | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| `actions/upload-pages-artifact` | v5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| `actions/deploy-pages` | v5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` |

**Irreversible:** the first deploy makes the site public [IRREVERSIBLE]; it runs at the user's first push after enabling Pages, outside this item. The evidence before it is T-3.6's file list.

**Done when:**
- **T-3.1** The workflow runs on `push` to `trunk` only: no `pull_request`, `schedule` or other trigger.
- **T-3.2** It installs `zensical==0.1.3` with pip and builds with `zensical build --strict --clean` on Python 3.13.
- **T-3.3** Every `uses:` names a 40-character commit SHA, and the SHAs match the table above or a later re-read named in the block.
- **T-3.4** The workflow level grants `contents: read` only, the job adds `pages: write` and `id-token: write`, and nothing grants `contents: write`.
- **T-3.5** The job uploads `site` with `actions/upload-pages-artifact` and deploys with `actions/deploy-pages` in the environment `github-pages`.
- **T-3.6** The block lists `find site -type f | sort` after T-2.1's command, and no listed path holds `design/` or ends in `.dc.html`.
- **T-3.7** [DEFERRED: the repository owner, the first push to trunk after Pages is enabled with the source "GitHub Actions"] The `docs` run succeeds and https://picketai.github.io/picket/ serves the landing page with the wordmark, the dark PicketAI colours and IBM Plex Sans.

## Open questions

- **OQ-001** The request lists a logo among the design system's tokens, but the brand book says "There is no logo file" and draws the wordmark as type; the untracked `assets/Pixel Corgi PicketAI Logo.png` is the only image in reach. Should the site use that image as its logo and favicon? Owner: the product owner. Fallback: the type wordmark (D-003) and Zensical's default favicon.
- **OQ-002** `docs/style-checklist.md` is a maintainer's manual test checklist; it is built and published, but left off the nav. Should it stay out of the site entirely? Owner: the product owner. Fallback: published, not in the nav.

## Revision log
