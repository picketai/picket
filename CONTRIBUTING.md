# Contributing to Picket

These are the conventions for changing this repository. Facts that already live elsewhere are linked, not copied: the folder map is in `README.md`, the always-on writing and comment rules are in `src/rules/`, and the prompt size budgets are in `test/budgets.test.mjs`.

Name the product Picket in any text a user reads. "Harness" is the internal word for the mechanism and stays in design talk among the people building it (`.claude/MEMORY.md`, `## Language`).

## Layout

The `## Layout` section of `README.md` maps every top-level folder. New things go here:

- A kernel module goes in `src/lib/`, in the folder its role names: `src/lib/cli/` for the command line, `src/lib/verbs/<verb>/` for one verb's code, `src/lib/shared/` for Picket code two verbs or a hook use, `src/lib/util/` for code with no Picket knowledge, `src/lib/hooks/` for the hooks. Imports point one way, `cli` to `verbs` to `shared` to `util`, with hooks beside the verbs; the direction scan in `test/kernel/conventions.test.mjs` enforces it. Its tests go in `test/kernel/` as `<module>.test.mjs`.
- A hook is a folder `src/lib/hooks/<kind>/<name>/` (for example `src/lib/hooks/guard/comments/`) whose `index.mts` exports `hook`, listed with its events and a one-line summary in `src/lib/hooks.mts`. The build generates each hook's entry and `hooks.json` in `dist/hooks/` from that list; nothing is registered by hand. A hook imports its own folder, its kind folder, `hook-spec.mts` and `output.mts`, never another hook. Its handler is tested in `test/hooks/handlers.test.mjs`, the spawned hook in `test/hooks/hooks.test.mjs`.
- A skill, agent or rule follows `.claude/rules/harness-authoring.md`. That rule governs this repository only and is never installed: the shipped rules are `prose`, `comments`, `work-items`, `security-paths` and `untrusted`.

## Installing from a local checkout

In this repository, `npm run claude` builds, then runs `scripts/claude.mjs`, which starts `claude --plugin-dir dist` with this checkout's `dist/bin` first on `PATH` and `PICKET_CHECKOUT` set to the checkout. The plugin then loads from the fresh build in `dist/`, and every `picket` command in the session runs this checkout's kernel, not the installed npm package; `command -v picket` shows which one runs. To set up another project, run this there, with the path of this checkout:

```sh
node <path to this checkout>/dist/bin/picket.mjs init
```

It writes the Picket block into `CLAUDE.md`, `.picket/config.json`, the `.picket/state/` line in `.gitignore`, and in `.claude/settings.json` the permission allow and ask rules, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and the `picket statusline` status line (unless one is already set). Then it runs `claude plugin marketplace add` and `claude plugin install` for `picket@picketai`, `picket-status@picketai` and `picket-markdown@picketai`, all with `--scope project`. A second run changes nothing; `--no-install` skips the four `claude` commands. To undo it, run `claude plugin uninstall` for `picket-markdown@picketai`, `picket-status@picketai` and `picket@picketai` with `--scope project`, then `claude plugin marketplace remove picketai --scope project`. A copy stays under `~/.claude/plugins/cache/picketai/`, marked orphaned.

## Building

Contributors run Node 24 or newer, the version in `.nvmrc`; users of the published package need Node 22 or newer. `npm install` installs the build tools and builds once.

`src/` is the source. `npm run build` deletes `dist/` and writes it again from `src/` in under a second, and `npm run watch` keeps it current while you edit: it rebuilds an `.mts` module or a hook when its source changes and copies any other changed file. `npm run typecheck` runs `tsc` over `src/` and writes nothing. `npm test` builds and type-checks before it runs the tests, and `npm run claude` builds before it starts the session.

`dist/` is generated and ignored by git. Never edit it: the next build deletes the change. Every `.mjs` file in it starts with a banner that says so, and `.claude/settings.json` denies Edit and Write there.

## Code

Code is Node ESM. A module moved from the old layout stays `.mjs` until its refactor item converts it; a new module is `.mts`, built to `.mjs` by esbuild. The one exception is `src/lib/util/node-floor.mjs`: the hook runtime, itself still `.mjs`, imports it, so it can only use a name that exists in both `src/` and `dist/`. Everything under `src/` imports only Node built-ins and paths inside `src/`, so the plugin installs with no dependencies (`test/kernel/plugin-layout.test.mjs`). The two third-party parsers are vendored: `src/lib/util/vendor/shell-quote-parse.mjs` for shell commands and `src/lib/util/vendor/jsonc-parser.mjs` for JSON with comments.

Comments follow `src/rules/comments.md`: write none, and let names, small functions and tests carry the meaning.

## Code conventions

New and converted code follows the conventions C-006 to C-013 in `artifacts/refactor/00-conventions.md`: verbs are actions with three outcomes, only entry points read the process, closed word lists are types, and work item paths, files, git and commands each go through one module. The scans in `test/kernel/conventions.test.mjs` enforce the mechanical rules over every `.mts` file under `src/`, and `test/kernel/type-rules.test.mjs` checks that the type checker rejects the common mistakes.

The foundation modules:

- `src/lib/shared/action.mts`: the `Action` and `Outcome` types, `done`, `failed`, `refuse`, `Refused`, and the exit code table.
- `src/lib/shared/context.mts`: the `Context` an entry point builds from the process with `edgeContext(root)`.
- `src/lib/shared/paths.mts`: every project, state and plugin location, and the project root lookup.
- `src/lib/shared/work/files.mts`: the `WorkId` check and every path inside `work/<id>/`.
- `src/lib/util/args.mts`: `parseArgs`, the typed flag getters (`str`, `need`, `list`, `many`, `int`, `seconds`, `flag`, `pairs`) and `UsageError`.
- `src/lib/util/io.mts`: reading text, JSON and JSONL files, and appending a JSONL row.
- `src/lib/util/git.mts`: `gitRead` for answers that may be missing and `gitRun` for commands that must succeed.
- `src/lib/shared/git.mts`: the git helpers built on them, such as `commitOwned` and the bookkeeping paths.
- `src/lib/util/process.mts`: `runShell`, the one way to run a command the user or the project supplies.

The CLI lives in `src/lib/cli/`: `src/lib/cli/main.mts` parses the flags, runs the verb and prints its outcome; `src/lib/cli/registry.mts` loads each verb from its folder under `src/lib/verbs/`, whose names `src/lib/verbs.mts` lists.

## Tests

Tests use `node:test` with `node:assert/strict`. `npm test` runs every file under `test/` and `bench/test/`; run it before proposing a commit. A check over the whole repository, such as the budgets or the Markdown paths, sits at the root of `test/`.

The three mods have their own suites, which need the `claude` command: `npm run test:status`, `npm run test:session` and `npm run test:markdown` validate the plugin and run its tests.

A test never depends on a gitignored file. A fresh clone must pass, so a test that reads a file only your machine has will fail for everyone else.

## Markdown

Prose follows `src/rules/prose.md`: no em or en dashes, short paragraphs, plain English.

Every backticked span in a scanned Markdown file that looks like a repository path must exist in a fresh checkout, resolved from the citing file's folder or any folder above it, or, for a file under `src/`, from `src/skills/`, the folder a skill path is relative to. `test/markdown-paths.test.mjs` enforces this. It skips fenced blocks, spans with placeholders such as `<id>` or globs, and Markdown under `work/`, `artifacts/`, `bench/results/` and the examples folder of each skill.

A path that is correct but cannot exist here (created at run time, machine-local, or part of a host project's layout) goes in the `ELSEWHERE` list of that test, inside the group whose `why` fits, or a new group with its own `why`. The same test fails when an `ELSEWHERE` path is no longer cited or starts to exist, so the list stays short.

## Commits

A commit message is `type(scope): summary`, with the summary in the present tense and no full stop. Types in use are `feat`, `fix`, `refactor`, `test`, `docs`, `chore` and `bench`. Scopes name the area touched, for example `kernel`, `hooks`, `guards`, `reviewing`, `sources`, `ux` or `bench`; leave the scope out when no single area fits.

After a work item closes, its state lands in its own commit: `chore(work): close <id>`.

Agents never commit. The developer stages a phase and proposes a message, and the user's approval commits it (`src/rules/work-items.md`).

## Releasing

A release starts on `trunk` with a clean tree. Run `npm version prerelease --preid alpha`: it bumps the version in `package.json`, copies it into the four plugin manifests (`src/`, `status/`, `session/` and `markdown/`, through `.github/scripts/release.mjs sync-version`), commits them and tags the commit `v<version>`. Then run `git push origin trunk --follow-tags`. The tag push starts `.github/workflows/release.yml`, which runs the tests on Linux, checks that the tag matches `package.json` and sits on `trunk`, and publishes under the `alpha` dist-tag. npm never accepts the same version twice, so a published version cannot be replaced, only followed by the next one.

The workflow publishes through npm trusted publishing, so it needs a one-time setup on npmjs.com after the first version was published by hand. Open the package settings of `@picketai/picket` and add a trusted publisher for GitHub Actions with organization `picketai`, repository `picket`, workflow file `release.yml` and no environment.

To check a release before tagging, start the `release` workflow by hand from the Actions tab. It runs the same tests on Linux and ends with `npm publish --dry-run`, which publishes nothing. Read the file list it prints: no path may contain `.test.`.

Publish only from the workflow. Its `prepack` script builds `dist/` before the publish packs it. It packs a Linux checkout, where `src/bin/picket` keeps its executable bit and its LF line ends, and the build copies both into `dist/bin/picket`; a pack made on Windows drops the bit.

## Folders outside the product

`work/` holds one dated folder per work item and `artifacts/` holds dated reports and decision records; both are records of their time, so the Markdown path test does not check them.
