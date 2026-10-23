# Contributing to Picket

These are the rules for changing this repository. The always-on writing and comment rules are in `src/rules/`, the prompt size budgets in `test/timing/budgets.test.mjs`, and the reasons behind the code conventions in `artifacts/refactor/00-conventions.md`.

Name the product Picket in any text a user reads. "Harness" is the internal word for the mechanism and stays in design talk among the people building it (`.claude/MEMORY.md`, `## Language`).

## Layout

`src/` is everything hand-written, and `npm run build` turns it into `dist/`. Under it, `src/.claude-plugin/` holds the plugin manifest, `src/agents/`, `src/skills/`, `src/rules/` and `src/output-styles/` the instructions, `src/bin/` the `picket` command, `src/lib/` the kernel, `src/mods/` the three mods, `src/templates/` the `CLAUDE.md` block `picket init` writes, and `src/themes/` the Claude Code theme.

Verbs, hooks and mods are each a list plus one folder per entry:

- `src/lib/verbs.mts` lists every verb with its summary; the verb's code is `src/lib/verbs/<verb>/`, and `src/lib/cli/registry.mts` loads it.
- `src/lib/hooks.mts` lists every hook with its events, matcher and summary; the hook is `src/lib/hooks/<kind>/<name>/`.
- `src/lib/mods.mts` lists every mod; the mod is `src/mods/<name>/`.

The rest of `src/lib/` is `src/lib/cli/` for the command line, `src/lib/shared/` for Picket code two verbs or a hook use, and `src/lib/util/` for code with no Picket knowledge. Imports point one way, `cli` to `verbs` to `shared` to `util`, with hooks beside the verbs; `test/repo/conventions.test.mjs` enforces it.

A module's tests sit beside it as `<module>.test.mts` (`src/lib/verbs/leave/index.test.mts`). `test/` holds the tests that run `dist/` or check the repository: `test/cli/` spawns the CLI and the built skill scripts, `test/hooks/` the hook bundles, `test/repo/` checks the repository and the build, and `test/timing/` holds the cold-start budgets. `test/support/` holds the helpers every test imports through `#test/*`.

A skill, agent or rule follows `.claude/rules/harness-authoring.md`. That rule governs this repository only and is never installed: the shipped rules are `prose`, `comments`, `work-items`, `security-paths` and `untrusted`.

## Building and testing

Contributors run Node 24 or newer, the version in `.nvmrc`; users of the published package need Node 22 or newer. `npm install` installs the build tools and builds once.

`npm run build` deletes `dist/` and writes it again from `src/` in under a second. `npm run watch` keeps it current while you edit: it rebuilds a module or a hook when its source changes and copies any other changed file. `npm run typecheck` runs `tsc` over `src/` and `test/support/` and writes nothing. `npm run claude` builds before it starts the session.

`dist/` is generated and ignored by git. Never edit it: the next build deletes the change. Every `.mjs` file in it starts with a banner that says so, and `.claude/settings.json` denies Edit and Write there.

Tests use `node:test` with `node:assert/strict`. `npm test` type-checks, then runs `scripts/test.mjs`, which runs five steps in order and stops at the first that fails:

1. `unit`: the `*.test.mts` files under `src/`, with no build.
2. `build`: `npm run build`.
3. `product`: the tests under `test/` and `bench/test/` that run `dist/` or check the repository.
4. `timing`: the cold-start budgets in `test/timing/`, alone, so no other test loads the machine.
5. `mods`: each mod's `claude plugin validate --strict` and `claude plugin test`, skipped when `claude` is not on `PATH`.

`node scripts/test.mjs unit build` runs only the named steps, and `npm run test:unit` runs the unit tests alone. Run `npm test` before proposing a commit.

The pages `docs/reference/cli.md`, `docs/reference/hooks.md` and `docs/reference/mods.md` are generated from the three lists and each verb's `usage`. `npm run docs` writes them, and so does every build. A change to a summary or a usage changes a page: stage the regenerated page with your change, because `test/repo/docs.test.mjs` compares each page with the copy in the git index and fails with `run npm run docs and stage it` until you do.

A unit test imports its module from `src/` and shared helpers through `#test/*`, which maps to `test/support/` (`import { withProject } from "#test/project.mts"`). It never imports `dist/`. A test never depends on a gitignored file: a fresh clone must pass.

CI runs `.github/workflows/release.yml` in four jobs. `test` runs `npm test` on Node 24 and keeps the built `dist/` for one day. `build-on-22` runs the `test/cli/` and `test/hooks/` tests against that `dist/` on Node 22, the oldest line the package supports. `mods` installs Claude Code and runs `node scripts/test.mjs build mods`; it may fail without blocking anything until a run proves `claude plugin test` works on a runner. `publish` needs `test` and `build-on-22`.

## Installing from a checkout

In this repository, `npm run claude` builds, then runs `scripts/claude.mjs`, which starts `claude --plugin-dir dist` with this checkout's `dist/bin` first on `PATH` and `PICKET_CHECKOUT` set to the checkout. The plugin then loads from the fresh build in `dist/`, and every `picket` command in the session runs this checkout's kernel, not the installed npm package; `command -v picket` shows which one runs. To set up another project, run this there, with the path of this checkout:

```sh
node <path to this checkout>/dist/bin/picket.mjs init
```

It writes the Picket block into `CLAUDE.md`, `.picket/config.json`, the `.picket/state/` line in `.gitignore`, and in `.claude/settings.json` the permission allow and ask rules, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and the `picket statusline` status line (unless one is already set). Then it adds the `picketai` marketplace and installs `picket@picketai`, `picket-status@picketai` and `picket-markdown@picketai`, all with project scope. A second run changes nothing; `--no-install` skips the four `claude` commands.

To undo it, run `picket uninstall` in a terminal from that project's root, the same way:

```sh
node <path to this checkout>/dist/bin/picket.mjs uninstall --dry-run
```

It removes what `init` added, asks per group, and keeps `work/` unless you choose it. The how-to's section on removing Picket describes every flag.

## Code conventions

Code is Node ESM. Everything under `src/` imports only Node built-ins and paths inside `src/`, so the plugin installs with no dependencies (`test/repo/plugin-layout.test.mjs`). The two third-party parsers are vendored: `src/lib/util/vendor/shell-quote-parse.mjs` for shell commands and `src/lib/util/vendor/jsonc-parser.mjs` for JSON with comments. Comments follow `src/rules/comments.md`: write none, and let names, small functions and tests carry the meaning.

The rules below are the conventions of the refactor. Each ends with its id; `artifacts/refactor/00-conventions.md` records why each one holds and which item decided it. The scans in `test/repo/conventions.test.mjs` enforce the mechanical ones over every `.mts` file under `src/`, and `test/repo/type-rules.test.mjs` checks that the type checker rejects the common mistakes.

### Source and build

- Write everything in `src/`; `dist/` is generated whole by `npm run build` and never edited (C-001).
- Write new and converted modules as `.mts` that pass `strict`, and name the source file in an import (`import { configPath } from "./paths.mts"`); the build rewrites it to `.mjs` (C-002).
- Convert a module to `.mts` only after the modules it imports, or together with them (C-003).
- Shipped code under `src/` uses no API newer than Node 22; build, watch and test scripts may use Node 24 (C-004).
- Every built JavaScript file starts with the generated banner, the only comment the build adds (C-005).

### Verbs and the process

- A verb is an `Action<I, O>` built with `action(...)`: async, taking `(input, context)` and returning `done`, `failed` or `refused`; helpers are plain functions taking `root` first (C-006).
- Only entry points (the CLI, hook handlers, skill scripts) read `process.cwd()`, `process.env`, `homedir()`, `projectRoot()` or `new Date()`; they build a `Context` and pass it down (C-007).
- A helper may throw `Refused`, which `action()` turns into a refusal; `UsageError` is only for argument parsing; exit codes are done 0, failed 2, refused 2, usage or crash 1; an action never calls an action (C-008).
- Verbs are one lowercase word and a group verb takes one one-word subverb; a verb that changes something is an action word (`open`), one that only prints may name what it shows (`state`), and a group is a noun followed by an action (`source add`); every verb is in the registry with `usage`, `parse`, `run` and `render` (C-012).

### Types, modules and names

- Each closed word list has one owner that exports its values `as const` and its union type (C-009).
- Work item paths go through `src/lib/shared/work/files.mts` with a branded `WorkId`, files through `src/lib/util/io.mts`, git and other processes through `src/lib/util/git.mts` and `src/lib/util/process.mts` with argument arrays; `runShell` is only for commands the user or the project supplies (C-010).
- Use erasable syntax only, keep a type with the code that owns it, write generic helpers as `function` declarations, name modules as kebab-case nouns, functions verb first, types in PascalCase and closed lists in `UPPER_SNAKE`, and never export a default (C-011).
- Find the plugin root by walking up to the folder that holds the plugin manifest (`src/.claude-plugin/plugin.json` in the source); no code assumes how deep it sits (C-013).
- Keep the folders of `src/lib/` and their direction: `src/lib/util/` imports only `node:` and itself, `src/lib/shared/` only itself and `src/lib/util/`, a verb folder never imports another verb folder, hooks may import a verb's `index.mts`, and only `src/bin/` imports `src/lib/cli/` (C-014).
- Import from the file that defines a symbol; there are no barrel files (C-015).

### Lists, tests and instructions

- List every hook in `src/lib/hooks.mts` with its events and matcher; the hook `<kind>.<name>` is the folder `src/lib/hooks/<kind>/<name>/`, its `index.mts` exports a `HookSpec`, and its outputs come from `output.mts` (C-016).
- Put the test of one module beside it as `<module>.test.mts`, keep tests of `dist/` and of the repository in `test/`, take shared helpers from `#test/*`, and remove temp folders through `t.after` (C-017).
- List every mod in `src/lib/mods.mts`, one folder `src/mods/<name>/` each; mods read Picket data only through the kernel and keep Claude Code mod style (C-018).
- Give every instruction fact one owner: shared steps live in `src/skills/shared/procedures/`, step and checklist files are named `NN-<name>.md`, and no Markdown holds an em or en dash (C-019).

### Foundation modules

- `src/lib/shared/action.mts`: the `Action` and `Outcome` types, `done`, `failed`, `refuse`, `Refused`, and the exit code table.
- `src/lib/shared/context.mts`: the `Context` an entry point builds from the process with `edgeContext(root)`.
- `src/lib/shared/paths.mts`: every project, state and plugin location, and the project root lookup.
- `src/lib/shared/work/files.mts`: the `WorkId` check and every path inside `work/<id>/`.
- `src/lib/util/args.mts`: `parseArgs`, the typed flag getters (`str`, `need`, `list`, `many`, `int`, `seconds`, `flag`, `pairs`) and `UsageError`.
- `src/lib/util/io.mts`: reading text, JSON and JSONL files, and appending a JSONL row.
- `src/lib/util/git.mts`: `gitRead` for answers that may be missing and `gitRun` for commands that must succeed.
- `src/lib/shared/git.mts`: the git helpers built on them, such as `commitOwned` and the bookkeeping paths.
- `src/lib/util/process.mts`: `runShell`, the one way to run a command the user or the project supplies.

## Hooks

The hooks, their events and what each does are in `docs/reference/hooks.md`. The build generates `hooks.json` in `dist/hooks/` from `src/lib/hooks.mts`, and Claude Code loads it with the plugin; nothing is registered by hand.

A hook is a folder `src/lib/hooks/<kind>/<name>/` whose `index.mts` exports `hook`, a `HookSpec` (`src/lib/hooks/hook-spec.mts`): a handler that takes the event and a context and returns an output built with `src/lib/hooks/output.mts`, or `null`. Code one hook uses stays in its folder, code one kind shares sits in the kind folder (`src/lib/hooks/guard/edit-target.mts`), and no hook imports another.

For each listed name the build generates an entry that calls `runHook` (`src/lib/hooks/run-hook.mts`). It checks the Node version, reads stdin, prints the output, records a denial in the ledger, swallows errors and exits 0, so a broken hook never blocks a session; a deny is the only intended stop. A hook must start in under 200 ms cold, which `test/timing/budgets.test.mjs` measures.

Each entry is bundled with everything it imports into one file, `dist/hooks/<kind>.<name>.mjs`, so a hook opens one module, not one per import. To run one by hand, pipe it a payload: `node dist/hooks/<hook>.mjs < payload.json`.

A handler's tests sit beside its modules (`src/lib/hooks/guard/bash/index.test.mts`); `test/hooks/<kind>.<name>.test.mjs` spawns the bundle (`test/hooks/guard.bash.test.mjs`).

The libraries the hooks share: `src/lib/shared/transcript/` reads a transcript (`tail.mts` from its end, `entries.mts` spawn hints, tool statistics and the read-before-edit lookup, `turn.mts` the turn's block, `agent.mts` the agent's name), `src/lib/shared/sources/protection.mts` says what a source protects, `src/lib/shared/shell/powershell.mts` reads a PowerShell command, `src/lib/shared/shell/kernel-call.mts` finds where a `picket` call starts, and `src/lib/util/vendor/shell-quote-parse.mjs` tokenizes Bash for `guard.bash`.

## Markdown

Prose follows `src/rules/prose.md`: no em or en dashes, short paragraphs, plain English.

Every backticked span in a scanned Markdown file that looks like a repository path must exist in a fresh checkout, resolved from the citing file's folder or any folder above it, or, for a file under `src/`, from `src/skills/`, the folder a skill path is relative to. `test/repo/markdown-paths.test.mjs` enforces this. It skips fenced blocks, spans with placeholders such as `<id>` or globs, and Markdown under `work/`, `artifacts/`, `bench/results/` and the examples folder of each skill.

A path that is correct but cannot exist here (created at run time, machine-local, or part of a host project's layout) goes in the `ELSEWHERE` list of that test, inside the group whose `why` fits, or a new group with its own `why`. The same test fails when an `ELSEWHERE` path is no longer cited or starts to exist, so the list stays short.

The docs are checked too: every `picket` command in them names a real verb, every relative link reaches a file, every `/picket:` command names a skill, and every skill and agent has its section in `docs/reference/`.

## Commits

A commit message is `type(scope): summary`, with the summary in the present tense and no full stop. Types in use are `feat`, `fix`, `refactor`, `test`, `docs`, `chore` and `bench`. Scopes name the area touched, for example `kernel`, `hooks`, `guards`, `reviewing`, `sources`, `ux` or `bench`; leave the scope out when no single area fits.

After a work item closes, its state lands in its own commit: `chore(work): close <id>`.

Agents never commit. The developer stages a phase and proposes a message, and the user's approval commits it (`src/rules/work-items.md`).

## Releasing

A release starts on `trunk` with a clean tree. First, in `CHANGELOG.md`, turn the newest heading into the version you release: `## 1.0.0-alpha.4 (not released yet)` becomes `## 1.0.0-alpha.4`. Commit that.

Then run `npm version prerelease --preid alpha`: it bumps the version in `package.json`, copies it into the core plugin manifest `src/.claude-plugin/plugin.json` (through `.github/scripts/release.mjs sync-version`), commits both and tags the commit `v<version>`. The mods carry no manifest in `src/`: the build writes each one into `dist/mods/<name>/` from `package.json` and `src/lib/mods.mts`, so they take the same version. Then run `git push origin trunk --follow-tags`. The tag push starts `.github/workflows/release.yml`, which runs the tests on Linux on Node 24 and the build on Node 22, checks that the tag matches `package.json` and sits on `trunk`, and publishes under the `alpha` dist-tag. npm never accepts the same version twice, so a published version cannot be replaced, only followed by the next one.

The workflow publishes through npm trusted publishing, so it needs a one-time setup on npmjs.com after the first version was published by hand. Open the package settings of `@picketai/picket` and add a trusted publisher for GitHub Actions with organization `picketai`, repository `picket`, workflow file `release.yml` and no environment.

To check a release before tagging, start the `release` workflow by hand from the Actions tab. It runs the same tests on Linux and ends with `npm publish --dry-run`, which publishes nothing. Read the file list it prints: no path may contain `.test.`.

Publish only from the workflow. Its `prepack` script builds `dist/` before the publish packs it. It packs a Linux checkout, where `src/bin/picket` keeps its executable bit and its LF line ends, and the build copies both into `dist/bin/picket`; a pack made on Windows drops the bit.

## Folders outside the product

`work/` holds one dated folder per work item and `artifacts/` holds dated reports and decision records; both are records of their time, so the Markdown path test does not check them.
