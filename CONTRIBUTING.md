# Contributing to Tether

These are the conventions for changing this repository. Facts that already live elsewhere are linked, not copied: the folder map is in `README.md`, the always-on writing and comment rules are in `.claude/rules/`, and the prompt size budgets are in `test/budgets.test.mjs`.

Name the product Tether in any text a user reads. "Harness" is the internal word for the mechanism and stays in design talk among the people building it (`.claude/MEMORY.md`, `## Language`).

## Layout

The `## Layout` section of `README.md` maps every top-level folder. New things go here:

- A kernel module goes in `.claude/lib/`, with its tests in `test/kernel/` as `<module>.test.mjs`.
- A hook goes in `.claude/hooks/` as `<kind>.<name>.mjs` (for example `guard.comments.mjs`), is wired in `.claude/settings.json`, and is tested in `test/hooks/hooks.test.mjs`.
- A skill, agent or rule follows `.claude/rules/harness-authoring.md`.

## Code

Code is Node ESM in `.mjs` files. Everything under `.claude/lib/` and `.claude/hooks/` imports only `node:` built-ins, so the product installs with no dependencies. The one third-party parser is vendored at `.claude/hooks/vendor/shell-quote-parse.mjs`.

Comments follow `.claude/rules/comments.md`: write none, and let names, small functions and tests carry the meaning.

## Tests

Tests use `node:test` with `node:assert/strict`. `npm test` runs every file under `test/` and `bench/test/`; run it before proposing a commit. A check over the whole repository, such as the budgets or the Markdown paths, sits at the root of `test/`.

A test never depends on a gitignored file. A fresh clone must pass, so a test that reads a file only your machine has will fail for everyone else.

## Markdown

Prose follows `.claude/rules/prose.md`: no em or en dashes, short paragraphs, plain English.

Every backticked span in a scanned Markdown file that looks like a repository path must exist in a fresh checkout, resolved from the citing file's folder or any folder above it. `test/markdown-paths.test.mjs` enforces this. It skips fenced blocks, spans with placeholders such as `<id>` or globs, and Markdown under `work/`, `spike/`, `tmp/`, `artifacts/reports/`, `bench/results/` and the examples folder of each skill.

A path that is correct but cannot exist here (created at run time, machine-local, or part of a host project's layout) goes in the `ELSEWHERE` list of that test, inside the group whose `why` fits, or a new group with its own `why`. The same test fails when an `ELSEWHERE` path is no longer cited or starts to exist, so the list stays short.

## Commits

A commit message is `type(scope): summary`, with the summary in the present tense and no full stop. Types in use are `feat`, `fix`, `test`, `docs`, `chore` and `bench`. Scopes name the area touched, for example `kernel`, `hooks`, `guards`, `reviewing`, `sources`, `ux` or `bench`; leave the scope out when no single area fits.

After a work item closes, its state lands in its own commit: `chore(work): close <id>`.

Agents never commit. The developer stages a phase and proposes a message, and the user's approval commits it (`.claude/rules/work-items.md`).

## Folders outside the product

`spike/` holds experiments and is deleted before the alpha. `tmp/` is scratch space for notes. `work/` holds one dated folder per work item and `artifacts/reports/` holds dated research reports; both are records of their time, so the Markdown path test does not check them.
