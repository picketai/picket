---
paths:
  - "docs/**"
  - "docs-theme/**"
  - "zensical.toml"
---
# Writing the documentation site

Load the internal skill `docwriting` before writing or changing a page: it holds the page kinds, the Zensical page pattern and the check and preview commands.

One page serves one need: a tutorial, a how-to guide, reference or explanation, never a mix. Check every fact against the code before stating it.

`docs/reference/cli.md`, `docs/reference/hooks.md`, `docs/reference/mods.md` and `docs/stylesheets/picketai.css` are generated: change `scripts/docs.mjs` and run `npm run docs`.

A change is done when the strict Zensical build prints `No issues found`.
