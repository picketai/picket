# Contributing to Picket

These are the conventions for changing this repository. Facts that already live elsewhere are linked, not copied: the folder map is in `README.md`, the always-on writing and comment rules are in `core/rules/`, and the prompt size budgets are in `test/budgets.test.mjs`.

Name the product Picket in any text a user reads. "Harness" is the internal word for the mechanism and stays in design talk among the people building it (`.claude/MEMORY.md`, `## Language`).

## Layout

The `## Layout` section of `README.md` maps every top-level folder. New things go here:

- A kernel module goes in `core/lib/`, with its tests in `test/kernel/` as `<module>.test.mjs`.
- A hook goes in `core/hooks/` as `<kind>.<name>.mjs` (for example `guard.comments.mjs`) and is registered in `core/hooks/hooks.json`. Its logic is a handler in `core/lib/hooks/` under the same name, and the file in `core/hooks/` is a shell that passes the handler to `runHook` (`core/lib/hook.mjs`). The handler is tested in `test/hooks/handlers.test.mjs`, the spawned hook in `test/hooks/hooks.test.mjs`.
- A skill, agent or rule follows `.claude/rules/harness-authoring.md`. That rule governs this repository only and is never installed: the shipped rules are `prose`, `comments`, `work-items` and `security-paths`.

## Installing from a local checkout

In this repository, `npm run claude` (`claude --plugin-dir core`) loads the plugin straight from `core/`. To set up another project, run this there, with the path of this checkout:

```sh
node <path to this checkout>/core/bin/picket.mjs init
```

It writes the Picket block into `CLAUDE.md`, `.picket/config.json`, the `.picket/state/` line in `.gitignore` and the permission keys in `.claude/settings.json`, then runs `claude plugin marketplace add` and `claude plugin install picket@picketai` with `--scope project`. A second run changes nothing; `--no-install` skips the two `claude` commands. To undo it, run `claude plugin uninstall picket@picketai --scope project` and `claude plugin marketplace remove picketai --scope project`. A copy stays under `~/.claude/plugins/cache/picketai/`, marked orphaned.

## Code

Code is Node ESM in `.mjs` files. Everything under `core/` imports only Node built-ins and paths inside `core/`, so the plugin installs with no dependencies (`test/kernel/plugin-layout.test.mjs`). The two third-party parsers are vendored: `core/lib/vendor/shell-quote-parse.mjs` for shell commands and `core/lib/vendor/jsonc-parser.mjs` for JSON with comments.

Comments follow `core/rules/comments.md`: write none, and let names, small functions and tests carry the meaning.

## Tests

Tests use `node:test` with `node:assert/strict`. `npm test` runs every file under `test/` and `bench/test/`; run it before proposing a commit. A check over the whole repository, such as the budgets or the Markdown paths, sits at the root of `test/`.

A test never depends on a gitignored file. A fresh clone must pass, so a test that reads a file only your machine has will fail for everyone else.

## Markdown

Prose follows `core/rules/prose.md`: no em or en dashes, short paragraphs, plain English.

Every backticked span in a scanned Markdown file that looks like a repository path must exist in a fresh checkout, resolved from the citing file's folder or any folder above it, or, for a file under `core/`, from `core/skills/`, the folder a skill path is relative to. `test/markdown-paths.test.mjs` enforces this. It skips fenced blocks, spans with placeholders such as `<id>` or globs, and Markdown under `work/`, `artifacts/`, `bench/results/` and the examples folder of each skill.

A path that is correct but cannot exist here (created at run time, machine-local, or part of a host project's layout) goes in the `ELSEWHERE` list of that test, inside the group whose `why` fits, or a new group with its own `why`. The same test fails when an `ELSEWHERE` path is no longer cited or starts to exist, so the list stays short.

## Commits

A commit message is `type(scope): summary`, with the summary in the present tense and no full stop. Types in use are `feat`, `fix`, `test`, `docs`, `chore` and `bench`. Scopes name the area touched, for example `kernel`, `hooks`, `guards`, `reviewing`, `sources`, `ux` or `bench`; leave the scope out when no single area fits.

After a work item closes, its state lands in its own commit: `chore(work): close <id>`.

Agents never commit. The developer stages a phase and proposes a message, and the user's approval commits it (`core/rules/work-items.md`).

## Releasing

A release starts on `trunk` with a clean tree. Run `npm version prerelease --preid alpha`: it bumps the version in `package.json` and in the plugin manifest (through `.github/scripts/release.mjs`), commits both and tags the commit `v<version>`. Then run `git push origin trunk --follow-tags`. The tag push starts `.github/workflows/release.yml`, which runs the tests on Linux, checks that the tag matches `package.json` and sits on `trunk`, and publishes under the `alpha` dist-tag. npm never accepts the same version twice, so a published version cannot be replaced, only followed by the next one.

The workflow publishes through npm trusted publishing, so it needs a one-time setup on npmjs.com after the first version was published by hand. Open the package settings of `@picketai/picket` and add a trusted publisher for GitHub Actions with organization `picketai`, repository `picket`, workflow file `release.yml` and no environment.

To check a release before tagging, start the `release` workflow by hand from the Actions tab. It runs the same tests on Linux and ends with `npm publish --dry-run`, which publishes nothing.

## Folders outside the product

`work/` holds one dated folder per work item and `artifacts/` holds dated reports and decision records; both are records of their time, so the Markdown path test does not check them.
