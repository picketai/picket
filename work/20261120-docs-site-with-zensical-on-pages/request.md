Add a documentation website built with Zensical and published to GitHub Pages from trunk.
Add zensical.toml at the repo root (site_name "Picket", site_url https://picketai.github.io/picket/, a short nav), a landing page docs/index.md, a workflow .github/workflows/docs.yml that builds with zensical pinned to 0.1.3 and deploys to GitHub Pages on pushes to trunk, and site/ in .gitignore.
Move docs/design/ out of docs/ so the design files are not published, and fix the link from docs/how-to.md to ../CHANGELOG.md, which points outside docs/.
Style the site with the existing Picket design system (the tokens in docs/design/picketai-design-system: colours, typography, logo) so the site looks like Picket.
No documentation content is written beyond the landing page; this is the base layer.

## Brief
purpose: Give Picket a published documentation site, styled with the Picket design system, as the base layer for the guides that follow
in scope: zensical.toml, docs/index.md, the Pages workflow on trunk with zensical pinned to 0.1.3, site/ in .gitignore, moving docs/design out of docs/, the CHANGELOG link in docs/how-to.md, site styling from the Picket design system tokens
out of scope: New documentation content beyond the landing page; enabling GitHub Pages in the repository settings and the first push, which the user confirms; changes to the harness
