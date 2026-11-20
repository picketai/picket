## Review: 20261120-docs-site-with-zensical-on-pages · cumulative

Approved: the change meets every sentence of the request and every T-N.x criterion. I confirmed this with a fresh strict Zensical build of HEAD and by looking up the action pins live. The only findings are two Minor style points.

Requirements: PASS (9)
| ID | Requirement | Source | Result | Evidence |
|---|---|---|---|---|
| S-1 | "Add a documentation website built with Zensical and published to GitHub Pages from trunk." | request.md:1 | PASS | zensical.toml:1-24, .github/workflows/docs.yml:3-5,43-45 |
| S-2 | "Add zensical.toml at the repo root (site_name "Picket", site_url https://picketai.github.io/picket/, a short nav)" | request.md:2 | PASS | zensical.toml:2,4,5-9 |
| S-3 | "a landing page docs/index.md" | request.md:2 | PASS | docs/index.md:1-19; the scratch build has site/index.html |
| S-4 | "a workflow .github/workflows/docs.yml that builds with zensical pinned to 0.1.3 and deploys to GitHub Pages on pushes to trunk" | request.md:2 | PASS | .github/workflows/docs.yml:3-5,36,38,39-45 |
| S-5 | "and site/ in .gitignore" | request.md:2 | PASS | .gitignore:3; `git check-ignore -v site/index.html` matches .gitignore:3 |
| S-6 | "Move docs/design/ out of docs/ so the design files are not published" | request.md:3 | PASS | `git diff -M` shows 15 renames to design/ (14 R100, README R058); the built site has no design/ or .dc.html path |
| S-7 | "fix the link from docs/how-to.md to ../CHANGELOG.md, which points outside docs/" | request.md:3 | PASS | docs/how-to.md:374 |
| S-8 | "Style the site with the existing Picket design system (... colours, typography, logo) so the site looks like Picket." | request.md:4 | PASS | scripts/docs.mjs:132-170 generates docs/stylesheets/picketai.css from src/themes/picketai.json, and regenerating it gives the same bytes; zensical.toml:17-19 sets IBM Plex Sans and JetBrains Mono; docs-theme/partials/logo.html:1 draws the wordmark as type, since the brand book has no logo file (OQ-001) |
| S-9 | "No documentation content is written beyond the landing page" | request.md:5 | PASS | apart from the generated stylesheet, docs/index.md is the only new file under docs/ |
Alignment: PASS (T-1.1 to T-1.6, T-2.1 to T-2.7, T-3.1 to T-3.6; T-3.7 deferred to the owner, as the plan marks it)
Decisions: HONOURED
Regression: none
Sources: none
Questions: none
Findings: 0 critical, 0 major, 2 minor
- [Minor] test/repo/docs.test.mjs:8: a second import line from "../../scripts/docs.mjs" sits beside the one on line 6. Merge SITE_STYLESHEET and siteStylesheet into the line 6 import.
- [Minor] scripts/docs.mjs:227: `npm run docs` still prints "docs/reference is current", but referencePages() now also covers docs/stylesheets/picketai.css (scripts/docs.mjs:197). Name both outputs, or print "generated docs are current".
Classes: none
Checked: rebuilt HEAD in a scratch copy with podman python:3.13-slim and zensical==0.1.3 `--strict --clean` ("No issues found"; the body has the slate scheme and custom colours, it links picketai.css and the IBM Plex Sans + JetBrains Mono font URL, the wordmark spans are present, 22 files and none under design/ or ending .dc.html); `git ls-remote` matched all five action SHAs to their tags; siteStylesheet(theme) matches the committed CSS byte for byte; `git grep docs/design` finds nothing; `node --test test/repo/docs.test.mjs` exits 0; the mutation at scripts/docs.mjs:148 was killed; no guard was removed and no comments were added; the workflow grants only `contents: read`, and the job adds `pages: write` and `id-token: write`.

APPROVED
